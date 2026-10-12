-- ════════════════════════════════════════════════════════════════════════
-- 012: IDs Correlativos de Retenciones — Únicos y Editables
-- ════════════════════════════════════════════════════════════════════════
-- Requisitos:
--   1. Correlativos auto-sugeridos (secuenciales por org+tipo+período).
--   2. Editables por el usuario antes de guardar.
--   3. NUNCA duplicados (UNIQUE constraint a nivel BD).
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────
-- 1. UNIQUE parcial en retenciones.numero_comprobante
--    Solo aplica a registros no eliminados (deleted_at IS NULL).
--    Esto permite reutilizar números de comprobantes anulados.
-- ────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_retenciones_comprobante_activo
  ON retenciones (organization_id, tipo, numero_comprobante)
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────────────────────────────────
-- 2. sugerir_correlativo_retencion()
--    Función de LECTURA que sugiere el próximo número disponible
--    sin reservarlo. El frontend la llama para pre-llenar el campo.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sugerir_correlativo_retencion(
  p_org_id UUID,
  p_client_id UUID,
  p_tipo TEXT,
  p_fecha DATE
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo TEXT;
  v_ultimo INTEGER;
  v_sugerido TEXT;
BEGIN
  v_periodo := to_char(p_fecha, 'YYYYMM');

  -- Obtener el último número usado para este org+client+tipo+periodo
  SELECT COALESCE(ultimo_numero, 0)
    INTO v_ultimo
    FROM correlativos_retenciones
   WHERE organization_id = p_org_id
     AND client_id = p_client_id
     AND tipo = p_tipo
     AND periodo = v_periodo;

  -- Si no existe registro, empezar desde 0
  IF NOT FOUND THEN
    v_ultimo := 0;
  END IF;

  -- Formatear el siguiente número sugerido
  IF p_tipo = 'IVA' THEN
    v_sugerido := v_periodo || to_char(v_ultimo + 1, 'fm00000000');
  ELSIF p_tipo = 'ISLR' THEN
    v_sugerido := 'ISLR-' || to_char(p_fecha, 'YYYY') || '-' || to_char(v_ultimo + 1, 'fm00000000');
  ELSE
    v_sugerido := 'MUN-' || to_char(p_fecha, 'YYYY') || '-' || to_char(v_ultimo + 1, 'fm00000000');
  END IF;

  RETURN v_sugerido;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 3. validar_comprobante_unico()
--    Función que verifica si un numero_comprobante ya existe para
--    esa organización y tipo. El frontend la llama en tiempo real.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION validar_comprobante_unico(
  p_org_id UUID,
  p_tipo TEXT,
  p_numero TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM retenciones
     WHERE organization_id = p_org_id
       AND tipo = p_tipo
       AND numero_comprobante = p_numero
       AND deleted_at IS NULL
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 4. Actualizar registrar_compra_con_retenciones() para aceptar
--    números de comprobante manuales opcionales desde el frontend.
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_compra_con_retenciones(
  p_client_id UUID,
  p_proveedor_id UUID,
  p_factura JSONB,
  p_aplicar_iva BOOLEAN DEFAULT NULL,
  p_aplicar_islr BOOLEAN DEFAULT NULL,
  p_aplicar_municipal BOOLEAN DEFAULT NULL,
  p_islr_concept_id UUID DEFAULT NULL,
  -- Nuevos parámetros opcionales para números manuales
  p_comprobante_iva TEXT DEFAULT NULL,
  p_comprobante_islr TEXT DEFAULT NULL,
  p_comprobante_municipal TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_cliente RECORD;
  v_proveedor RECORD;
  v_concepto RECORD;
  v_config_global RECORD;

  v_subtotal DECIMAL(15,2);
  v_monto_iva_factura DECIMAL(15,2);
  v_total DECIMAL(15,2);
  v_fecha DATE;
  v_invoice_id UUID;

  v_aplicar_iva BOOLEAN;
  v_aplicar_islr BOOLEAN;
  v_aplicar_municipal BOOLEAN;
  v_islr_concept_id UUID;

  v_iva_monto DECIMAL(15,2) := 0;
  v_iva_porcentaje DECIMAL(5,2) := 0;
  v_comprobante_iva TEXT;

  v_islr_monto DECIMAL(15,2) := 0;
  v_islr_base DECIMAL(15,2) := 0;
  v_islr_porcentaje DECIMAL(5,2) := 0;
  v_islr_sustraendo DECIMAL(10,2) := 0;
  v_islr_bajo_minimo BOOLEAN := false;
  v_comprobante_islr TEXT;

  v_municipal_monto DECIMAL(15,2) := 0;
  v_municipal_fuera_municipio BOOLEAN := false;
  v_comprobante_municipal TEXT;
BEGIN
  -- ── 0. Autorización de tenant ──────────────────────────────────────
  v_org_id := get_current_organization_id();
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin organización asociada';
  END IF;
  IF (SELECT role FROM users WHERE id = auth.uid()) NOT IN ('admin','contador')
     AND p_client_id IS DISTINCT FROM (SELECT client_id FROM users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para registrar compras de este cliente';
  END IF;

  -- ── 1. Config fiscal global (UT, alícuota IVA) ──
  SELECT valor_unidad_tributaria, alicuota_iva
    INTO v_config_global
    FROM configuracion_fiscal_global
   ORDER BY updated_at DESC
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay configuración fiscal global cargada (UT / alícuota IVA)';
  END IF;

  -- ── 2. Config fiscal del cliente y del proveedor (fuente de verdad) ──
  SELECT es_contribuyente_especial, es_agente_retencion_municipal, municipio_id
    INTO v_cliente
    FROM clients
   WHERE id = p_client_id AND organization_id = v_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente % no encontrado en esta organización', p_client_id;
  END IF;

  SELECT nombre, rif, tipo_persona, iva_retention_rate, islr_concept_id,
         municipal_rate, licencia_actividad_economica, municipio_id
    INTO v_proveedor
    FROM proveedores
   WHERE id = p_proveedor_id AND organization_id = v_org_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proveedor % no encontrado en esta organización', p_proveedor_id;
  END IF;

  -- ── 3. Datos de la factura ──────────────────────────────────────────
  v_subtotal          := COALESCE((p_factura->'financial'->>'taxableSales')::DECIMAL, 0);
  v_monto_iva_factura := COALESCE((p_factura->'financial'->>'taxDebit')::DECIMAL, 0);
  v_total             := COALESCE((p_factura->'financial'->>'totalSales')::DECIMAL, 0);
  v_fecha             := (p_factura->>'issueDate')::DATE;

  IF v_fecha IS NULL THEN
    RAISE EXCEPTION 'Factura incompleta: fecha (issueDate) es obligatoria';
  END IF;

  -- ── 4. Qué retenciones aplican ──────────────────────────────────────
  v_aplicar_iva := COALESCE(
    p_aplicar_iva,
    v_cliente.es_contribuyente_especial AND v_proveedor.iva_retention_rate > 0
  );
  v_islr_concept_id := COALESCE(p_islr_concept_id, v_proveedor.islr_concept_id);
  v_aplicar_islr := COALESCE(p_aplicar_islr, v_islr_concept_id IS NOT NULL);

  IF v_cliente.es_agente_retencion_municipal AND v_proveedor.municipal_rate > 0 THEN
    IF v_proveedor.municipio_id IS NULL
       OR v_proveedor.municipio_id IS DISTINCT FROM v_cliente.municipio_id THEN
      v_municipal_fuera_municipio := true;
      v_aplicar_municipal := COALESCE(p_aplicar_municipal, false);
    ELSE
      v_aplicar_municipal := COALESCE(p_aplicar_municipal, true);
    END IF;
  ELSE
    v_aplicar_municipal := COALESCE(p_aplicar_municipal, false);
  END IF;

  -- ── 5. Insertar la factura de compra ────────────────────────────────
  INSERT INTO invoices (
    organization_id, client_id, flow, expense_type, document_category, expense_category_id,
    issuer, client_info,
    invoice_number, control_number, issue_date, due_date, document_type, status,
    financial, items, attachments, notes,
    created_by
  ) VALUES (
    v_org_id, p_client_id, 'COMPRA', p_factura->>'expense_type', p_factura->>'document_category', 
    NULLIF(p_factura->>'expense_category_id', '')::uuid,
    p_factura->'issuer', p_factura->'client',
    p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha, 
    NULLIF(p_factura->>'dueDate', '')::DATE, COALESCE(p_factura->>'documentType', 'FACTURA'), COALESCE(p_factura->>'status', 'BORRADOR'),
    COALESCE(p_factura->'financial', '{}'::jsonb), COALESCE(p_factura->'items', '[]'::jsonb), 
    COALESCE(p_factura->'attachments', '[]'::jsonb), p_factura->>'notes',
    auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  -- ── 6. IVA ───────────────────────────────────────────────────────────
  IF v_aplicar_iva THEN
    v_iva_porcentaje := v_proveedor.iva_retention_rate;
    v_iva_monto := ROUND(v_monto_iva_factura * v_iva_porcentaje / 100, 2);
    
    -- Usar número manual si fue proporcionado, si no auto-generar
    v_comprobante_iva := COALESCE(
      NULLIF(TRIM(p_comprobante_iva), ''),
      generar_correlativo_retencion(v_org_id, p_client_id, 'IVA', v_fecha)
    );

    INSERT INTO retenciones (
      organization_id, client_id, invoice_id, tipo, numero_comprobante,
      proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
      factura_numero, factura_control, factura_fecha,
      base_imponible, monto_iva, porcentaje_retencion, monto_retenido,
      created_by
    ) VALUES (
      v_org_id, p_client_id, v_invoice_id, 'IVA', v_comprobante_iva,
      p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
      p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha,
      v_monto_iva_factura, v_monto_iva_factura, v_iva_porcentaje, v_iva_monto,
      auth.uid()
    );
  END IF;

  -- ── 7. ISLR (con chequeo de monto mínimo en UT) ─────────────────────
  IF v_aplicar_islr THEN
    SELECT nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut
      INTO v_concepto
      FROM conceptos_islr
     WHERE id = v_islr_concept_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Concepto ISLR % no existe o está inactivo', v_islr_concept_id;
    END IF;

    v_islr_base := v_subtotal;

    IF v_concepto.monto_minimo_ut > 0
       AND v_islr_base < (v_concepto.monto_minimo_ut * v_config_global.valor_unidad_tributaria) THEN
      v_islr_bajo_minimo := true;
      v_aplicar_islr := false;
    ELSE
      v_islr_porcentaje := v_concepto.porcentaje_retencion;
      v_islr_monto := ROUND(v_islr_base * (v_concepto.porcentaje_base / 100) * (v_islr_porcentaje / 100), 2);

      IF v_proveedor.tipo_persona = 'NATURAL' AND v_concepto.sustraendo_ut > 0 THEN
        v_islr_sustraendo := v_concepto.sustraendo_ut;
        v_islr_monto := GREATEST(
          0,
          v_islr_monto - ROUND(v_islr_sustraendo * v_config_global.valor_unidad_tributaria, 2)
        );
      END IF;

      -- Usar número manual si fue proporcionado, si no auto-generar
      v_comprobante_islr := COALESCE(
        NULLIF(TRIM(p_comprobante_islr), ''),
        generar_correlativo_retencion(v_org_id, p_client_id, 'ISLR', v_fecha)
      );

      INSERT INTO retenciones (
        organization_id, client_id, invoice_id, tipo, numero_comprobante,
        proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
        factura_numero, factura_control, factura_fecha,
        base_imponible, porcentaje_retencion, monto_retenido,
        concepto_islr_id, concepto_islr_nombre, sustraendo_ut, valor_ut,
        created_by
      ) VALUES (
        v_org_id, p_client_id, v_invoice_id, 'ISLR', v_comprobante_islr,
        p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
        p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha,
        v_islr_base, v_islr_porcentaje, v_islr_monto,
        v_islr_concept_id, v_concepto.nombre, v_islr_sustraendo, v_config_global.valor_unidad_tributaria,
        auth.uid()
      );
    END IF;
  END IF;

  -- ── 8. Municipal ─────────────────────────────────────────────────────
  IF v_aplicar_municipal THEN
    v_municipal_monto := ROUND(v_subtotal * v_proveedor.municipal_rate / 100, 2);
    
    -- Usar número manual si fue proporcionado, si no auto-generar
    v_comprobante_municipal := COALESCE(
      NULLIF(TRIM(p_comprobante_municipal), ''),
      generar_correlativo_retencion(v_org_id, p_client_id, 'MUNICIPAL', v_fecha)
    );

    INSERT INTO retenciones (
      organization_id, client_id, invoice_id, tipo, numero_comprobante,
      proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
      factura_numero, factura_control, factura_fecha,
      base_imponible, porcentaje_retencion, monto_retenido,
      municipio_id, licencia_actividad,
      created_by
    ) VALUES (
      v_org_id, p_client_id, v_invoice_id, 'MUNICIPAL', v_comprobante_municipal,
      p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
      p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha,
      v_subtotal, v_proveedor.municipal_rate, v_municipal_monto,
      v_proveedor.municipio_id, v_proveedor.licencia_actividad_economica,
      auth.uid()
    );
  END IF;

  -- ── 9. Totales en la factura ─────────────────────────────────────────
  UPDATE invoices SET
    iva_retention       = v_iva_monto,
    islr_retention      = v_islr_monto,
    municipal_retention = v_municipal_monto,
    neto_a_pagar         = v_total - (v_iva_monto + v_islr_monto + v_municipal_monto),
    updated_at           = NOW()
  WHERE id = v_invoice_id;

  -- ── 10. Resultado para el frontend ───────────────────────────────────
  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'iva', CASE WHEN v_aplicar_iva THEN
      jsonb_build_object('monto', v_iva_monto, 'porcentaje', v_iva_porcentaje, 'comprobante', v_comprobante_iva)
      ELSE NULL::jsonb END,
    'islr', CASE WHEN v_aplicar_islr THEN
      jsonb_build_object('monto', v_islr_monto, 'porcentaje', v_islr_porcentaje, 'base', v_islr_base, 'comprobante', v_comprobante_islr)
      ELSE NULL::jsonb END,
    'islr_bajo_minimo', v_islr_bajo_minimo,
    'municipal', CASE WHEN v_aplicar_municipal THEN
      jsonb_build_object('monto', v_municipal_monto, 'porcentaje', v_proveedor.municipal_rate, 'comprobante', v_comprobante_municipal)
      ELSE NULL::jsonb END,
    'municipal_fuera_de_municipio', v_municipal_fuera_municipio,
    'total_retenido', v_iva_monto + v_islr_monto + v_municipal_monto,
    'neto_a_pagar', v_total - (v_iva_monto + v_islr_monto + v_municipal_monto)
  );
END;
$$;
