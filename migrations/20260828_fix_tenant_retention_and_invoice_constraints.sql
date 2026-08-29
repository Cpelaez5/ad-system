-- ==============================================================================
-- CORRECCIÓN DEFINITIVA DE CONSTRAINTS Y CORRELATIVOS POR CLIENTE / EMPRESA
-- ==============================================================================
-- Problema resuelto:
-- 1. uq_retenciones_comprobante_activo no incluía client_id, causando que los
--    comprobantes (#1, #2, etc.) de una empresa chocaran con los de otra en la misma org.
-- 2. uq_invoices_compra no incluía client_id, causando que dos empresas no pudieran
--    recibir la misma factura de un mismo proveedor.
-- 3. sugerir_correlativo_retencion sugería números desactualizados si existían
--    registros en retenciones mayores a correlativos_retenciones.
-- 4. validar_comprobante_unico ahora valida la unicidad por cliente (empresa).
-- ==============================================================================

-- 1. Corregir UNIQUE constraint en tabla retenciones
DROP INDEX IF EXISTS public.uq_retenciones_comprobante_activo CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_retenciones_comprobante_activo
  ON public.retenciones (organization_id, client_id, tipo, numero_comprobante)
  WHERE deleted_at IS NULL;


-- 2. Corregir UNIQUE constraint en tabla invoices para COMPRAS
DROP INDEX IF EXISTS public.uq_invoices_compra CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_compra 
  ON public.invoices USING btree (organization_id, client_id, (issuer->>'id'), invoice_number) 
  WHERE flow = 'COMPRA';


-- 3. Actualizar función sugerir_correlativo_retencion para evitar cualquier colisión
CREATE OR REPLACE FUNCTION public.sugerir_correlativo_retencion(
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
  v_year TEXT;
  v_ultimo_correlativo INTEGER := 0;
  v_ultimo_retencion INTEGER := 0;
  v_siguiente INTEGER := 1;
  v_sugerido TEXT;
  v_prefix TEXT;
BEGIN
  v_periodo := to_char(p_fecha, 'YYYYMM');
  v_year := to_char(p_fecha, 'YYYY');

  -- A. Consultar correlativos_retenciones
  SELECT COALESCE(ultimo_numero, 0)
    INTO v_ultimo_correlativo
    FROM correlativos_retenciones
   WHERE organization_id = p_org_id
     AND client_id = p_client_id
     AND tipo = p_tipo
     AND periodo = v_periodo;

  -- B. Consultar el máximo número existente en la tabla retenciones para este cliente y período
  IF p_tipo = 'IVA' THEN
    -- Formato IVA: YYYYMM + 8 dígitos (ej: 20260800000001)
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^' || v_periodo || '[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 7)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_retencion
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'IVA'
      AND numero_comprobante LIKE (v_periodo || '%')
      AND deleted_at IS NULL;

  ELSIF p_tipo = 'ISLR' THEN
    -- Formato ISLR: ISLR-YYYY-00000001
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^ISLR-' || v_year || '-[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 11)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_retencion
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'ISLR'
      AND numero_comprobante LIKE ('ISLR-' || v_year || '-%')
      AND deleted_at IS NULL;

  ELSE
    -- Formato MUNICIPAL: MUN-YYYY-00000001 o MUN-YYYYMM-00000001
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^MUN-' || v_year || '-[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 10)::INTEGER
        WHEN numero_comprobante ~ ('^MUN-[0-9]{4}-[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 10)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_retencion
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'MUNICIPAL'
      AND deleted_at IS NULL;
  END IF;

  -- Tomar el mayor entre ambas fuentes + 1
  v_siguiente := GREATEST(COALESCE(v_ultimo_correlativo, 0), COALESCE(v_ultimo_retencion, 0)) + 1;

  -- Formatear el comprobante
  IF p_tipo = 'IVA' THEN
    v_sugerido := v_periodo || to_char(v_siguiente, 'fm00000000');
  ELSIF p_tipo = 'ISLR' THEN
    v_sugerido := 'ISLR-' || v_year || '-' || to_char(v_siguiente, 'fm00000000');
  ELSE
    v_sugerido := 'MUN-' || v_year || '-' || to_char(v_siguiente, 'fm00000000');
  END IF;

  RETURN v_sugerido;
END;
$$;


-- 4. Actualizar función generar_correlativo_retencion para sincronizar siempre
CREATE OR REPLACE FUNCTION public.generar_correlativo_retencion(
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
  v_year TEXT;
  v_nuevo_numero INTEGER;
  v_ultimo_existente INTEGER := 0;
  v_comprobante TEXT;
BEGIN
  v_periodo := to_char(p_fecha, 'YYYYMM');
  v_year := to_char(p_fecha, 'YYYY');

  -- Obtener el mayor número ya registrado en retenciones
  IF p_tipo = 'IVA' THEN
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^' || v_periodo || '[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 7)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_existente
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'IVA'
      AND numero_comprobante LIKE (v_periodo || '%')
      AND deleted_at IS NULL;
  ELSIF p_tipo = 'ISLR' THEN
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^ISLR-' || v_year || '-[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 11)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_existente
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'ISLR'
      AND deleted_at IS NULL;
  ELSE
    SELECT COALESCE(MAX(
      CASE 
        WHEN numero_comprobante ~ ('^MUN-' || v_year || '-[0-9]{8}$') 
        THEN SUBSTRING(numero_comprobante FROM 10)::INTEGER
        ELSE 0 
      END
    ), 0)
    INTO v_ultimo_existente
    FROM retenciones
    WHERE organization_id = p_org_id
      AND client_id = p_client_id
      AND tipo = 'MUNICIPAL'
      AND deleted_at IS NULL;
  END IF;

  -- Insertar o actualizar en correlativos_retenciones garantizando que sea mayor que el existente
  INSERT INTO correlativos_retenciones (organization_id, client_id, tipo, periodo, ultimo_numero)
  VALUES (p_org_id, p_client_id, p_tipo, v_periodo, GREATEST(1, v_ultimo_existente + 1))
  ON CONFLICT (organization_id, client_id, tipo, periodo)
  DO UPDATE SET ultimo_numero = GREATEST(correlativos_retenciones.ultimo_numero + 1, v_ultimo_existente + 1)
  RETURNING ultimo_numero INTO v_nuevo_numero;

  IF p_tipo = 'IVA' THEN
    v_comprobante := v_periodo || to_char(v_nuevo_numero, 'fm00000000');
  ELSIF p_tipo = 'ISLR' THEN
    v_comprobante := 'ISLR-' || v_year || '-' || to_char(v_nuevo_numero, 'fm00000000');
  ELSE
    v_comprobante := 'MUN-' || v_year || '-' || to_char(v_nuevo_numero, 'fm00000000');
  END IF;

  RETURN v_comprobante;
END;
$$;


-- 5. Actualizar validar_comprobante_unico
CREATE OR REPLACE FUNCTION public.validar_comprobante_unico(
  p_org_id UUID,
  p_tipo TEXT,
  p_numero TEXT,
  p_client_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM retenciones
     WHERE organization_id = p_org_id
       AND (p_client_id IS NULL OR client_id = p_client_id)
       AND tipo = p_tipo
       AND numero_comprobante = p_numero
       AND deleted_at IS NULL
  );
END;
$$;
