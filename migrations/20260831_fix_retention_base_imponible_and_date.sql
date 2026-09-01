-- ==============================================================================
-- Migración: 20260831_fix_retention_base_imponible_and_date.sql
-- Propósito:
--   1. Agregar columnas de auditoría y fecha_comprobante a la tabla retenciones.
--   2. Realizar backfill histórico de fecha_comprobante preservando fechas originales
--      antes de asignar DEFAULT CURRENT_DATE para nuevos registros.
--   3. Corregir de forma idempotente la base_imponible histórica de retenciones de IVA
--      guardando el valor anterior en base_imponible_original sin tocar correlativos fiscales.
--   4. Actualizar registrar_compra_con_retenciones para insertar v_subtotal como base_imponible
--      en IVA y soportar fecha_comprobante (retentionDate).
-- ==============================================================================

-- 1. Agregar columnas a retenciones (sin DEFAULT inicial en fecha_comprobante)
ALTER TABLE public.retenciones ADD COLUMN IF NOT EXISTS fecha_comprobante DATE;
ALTER TABLE public.retenciones ADD COLUMN IF NOT EXISTS base_imponible_original NUMERIC(15,2);
ALTER TABLE public.retenciones ADD COLUMN IF NOT EXISTS corregido_en TIMESTAMPTZ;
ALTER TABLE public.retenciones ADD COLUMN IF NOT EXISTS corregido_motivo TEXT;

-- 2. Backfill histórico de fecha_comprobante:
-- IMPORTANTE: Se asigna COALESCE(factura_fecha, created_at::DATE) antes de poner el DEFAULT
-- para evitar que los registros históricos queden fechados erróneamente con la fecha
-- de ejecución de esta migración.
UPDATE public.retenciones 
   SET fecha_comprobante = COALESCE(factura_fecha, created_at::DATE)
 WHERE fecha_comprobante IS NULL;

-- Asignar DEFAULT CURRENT_DATE para registros futuros
ALTER TABLE public.retenciones ALTER COLUMN fecha_comprobante SET DEFAULT CURRENT_DATE;

-- 3. Corrección histórica idempotente para IVA:
-- IMPORTANTE: NO se tocan los correlativos históricos (numero_comprobante) ya que son
-- documentos fiscales inmutables emitidos.
-- NOTA / ADVERTENCIA: Si taxableSales en el financial de la factura no está presente o es 0,
-- el cálculo de fallback ROUND(r.monto_iva / 0.16, 2) ASUME la alícuota general vigente del 16% de IVA en Venezuela.
UPDATE public.retenciones r
   SET base_imponible_original = r.base_imponible,
       base_imponible = COALESCE(
         NULLIF((i.financial->>'taxableSales')::NUMERIC, 0),
         ROUND(r.monto_iva / 0.16, 2)
       ),
       corregido_en = NOW(),
       corregido_motivo = 'Corrección de bug en asignación de base_imponible (antes guardaba monto_iva)'
  FROM public.invoices i
 WHERE r.invoice_id = i.id
   AND r.tipo = 'IVA'
   AND r.corregido_en IS NULL
   AND r.base_imponible = r.monto_iva
   AND r.monto_iva > 0;

-- 4. Actualizar RPC registrar_compra_con_retenciones
CREATE OR REPLACE FUNCTION public.registrar_compra_con_retenciones(
  p_client_id uuid,
  p_proveedor_id uuid,
  p_factura jsonb,
  p_aplicar_iva boolean DEFAULT NULL::boolean,
  p_aplicar_islr boolean DEFAULT NULL::boolean,
  p_aplicar_municipal boolean DEFAULT NULL::boolean,
  p_islr_concept_id uuid DEFAULT NULL::uuid,
  p_comprobante_iva text DEFAULT NULL::text,
  p_comprobante_islr text DEFAULT NULL::text,
  p_comprobante_municipal text DEFAULT NULL::text,
  p_concepto_municipal_id uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_cliente RECORD;
  v_proveedor RECORD;
  v_concepto RECORD;
  v_concepto_mun RECORD;
  v_config_global RECORD;

  v_subtotal DECIMAL(15,2);
  v_monto_iva_factura DECIMAL(15,2);
  v_total DECIMAL(15,2);
  v_fecha DATE;
  v_fecha_retencion DATE;
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
  
  v_mun_porcentaje DECIMAL(5,2) := 0;
  v_mun_codigo TEXT := NULL;
  v_mun_descripcion TEXT := NULL;
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

  -- Fecha de emisión del comprobante de retención (desacoplada de la fecha de factura)
  v_fecha_retencion := COALESCE(
    NULLIF(p_factura->'financial'->>'retentionDate', '')::DATE,
    NULLIF(p_factura->>'retentionDate', '')::DATE,
    CURRENT_DATE
  );

  -- ── 4. Qué retenciones aplican ──────────────────────────────────────
  v_aplicar_iva := COALESCE(
    p_aplicar_iva,
    v_cliente.es_contribuyente_especial AND v_proveedor.iva_retention_rate > 0
  );
  v_islr_concept_id := COALESCE(p_islr_concept_id, v_proveedor.islr_concept_id);
  v_aplicar_islr := COALESCE(p_aplicar_islr, v_islr_concept_id IS NOT NULL);

  -- Simplificado: Se aplica retención municipal si el usuario lo solicita explícitamente (o si el default era true y coinciden)
  IF v_cliente.es_agente_retencion_municipal THEN
    IF v_proveedor.municipio_id IS NULL
       OR v_proveedor.municipio_id IS DISTINCT FROM v_cliente.municipio_id THEN
      v_municipal_fuera_municipio := true;
      v_aplicar_municipal := COALESCE(p_aplicar_municipal, false);
    ELSE
      v_aplicar_municipal := COALESCE(p_aplicar_municipal, v_proveedor.municipal_rate > 0);
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
    
    v_comprobante_iva := COALESCE(
      NULLIF(TRIM(p_comprobante_iva), ''),
      generar_correlativo_retencion(v_org_id, p_client_id, 'IVA', v_fecha_retencion)
    );

    INSERT INTO retenciones (
      organization_id, client_id, invoice_id, tipo, numero_comprobante,
      proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
      factura_numero, factura_control, factura_fecha, fecha_comprobante,
      base_imponible, monto_iva, porcentaje_retencion, monto_retenido,
      created_by
    ) VALUES (
      v_org_id, p_client_id, v_invoice_id, 'IVA', v_comprobante_iva,
      p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
      p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha, v_fecha_retencion,
      v_subtotal, v_monto_iva_factura, v_iva_porcentaje, v_iva_monto,
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

      v_comprobante_islr := COALESCE(
        NULLIF(TRIM(p_comprobante_islr), ''),
        generar_correlativo_retencion(v_org_id, p_client_id, 'ISLR', v_fecha_retencion)
      );

      INSERT INTO retenciones (
        organization_id, client_id, invoice_id, tipo, numero_comprobante,
        proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
        factura_numero, factura_control, factura_fecha, fecha_comprobante,
        base_imponible, porcentaje_retencion, monto_retenido,
        concepto_islr_id, concepto_islr_nombre, sustraendo_ut, valor_ut,
        created_by
      ) VALUES (
        v_org_id, p_client_id, v_invoice_id, 'ISLR', v_comprobante_islr,
        p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
        p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha, v_fecha_retencion,
        v_islr_base, v_islr_porcentaje, v_islr_monto,
        v_islr_concept_id, v_concepto.nombre, v_islr_sustraendo, v_config_global.valor_unidad_tributaria,
        auth.uid()
      );
    END IF;
  END IF;

  -- ── 8. Municipal ─────────────────────────────────────────────────────
  IF v_aplicar_municipal THEN
    
    -- Determinar el porcentaje a usar
    IF p_concepto_municipal_id IS NOT NULL THEN
      SELECT codigo, descripcion, porcentaje INTO v_concepto_mun FROM conceptos_municipales WHERE id = p_concepto_municipal_id;
      v_mun_porcentaje := v_concepto_mun.porcentaje;
      v_mun_codigo := v_concepto_mun.codigo;
      v_mun_descripcion := v_concepto_mun.descripcion;
    ELSE
      v_mun_porcentaje := COALESCE(v_proveedor.municipal_rate, 0);
    END IF;

    v_municipal_monto := ROUND(v_subtotal * v_mun_porcentaje / 100, 2);
    
    v_comprobante_municipal := COALESCE(
      NULLIF(TRIM(p_comprobante_municipal), ''),
      generar_correlativo_retencion(v_org_id, p_client_id, 'MUNICIPAL', v_fecha_retencion)
    );

    INSERT INTO retenciones (
      organization_id, client_id, invoice_id, tipo, numero_comprobante,
      proveedor_id, proveedor_nombre, proveedor_rif, proveedor_tipo_persona,
      factura_numero, factura_control, factura_fecha, fecha_comprobante,
      base_imponible, porcentaje_retencion, monto_retenido,
      municipio_id, licencia_actividad,
      created_by
    ) VALUES (
      v_org_id, p_client_id, v_invoice_id, 'MUNICIPAL', v_comprobante_municipal,
      p_proveedor_id, v_proveedor.nombre, v_proveedor.rif, v_proveedor.tipo_persona,
      p_factura->>'invoiceNumber', p_factura->>'controlNumber', v_fecha, v_fecha_retencion,
      v_subtotal, v_mun_porcentaje, v_municipal_monto,
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
      jsonb_build_object('monto', v_municipal_monto, 'porcentaje', v_mun_porcentaje, 'comprobante', v_comprobante_municipal, 'codigo', v_mun_codigo, 'descripcion', v_mun_descripcion)
      ELSE NULL::jsonb END,
    'municipal_fuera_de_municipio', v_municipal_fuera_municipio,
    'total_retenido', v_iva_monto + v_islr_monto + v_municipal_monto,
    'neto_a_pagar', v_total - (v_iva_monto + v_islr_monto + v_municipal_monto)
  );
END;
$function$;
