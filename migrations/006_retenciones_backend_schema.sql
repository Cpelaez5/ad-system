-- Schema for Retenciones Fiscales (Fase 1 reconstructed)

CREATE TABLE IF NOT EXISTS municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuracion_fiscal_global (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor_unidad_tributaria DECIMAL(15,2) NOT NULL DEFAULT 9.00,
  alicuota_iva DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure there is at least one row
INSERT INTO configuracion_fiscal_global (valor_unidad_tributaria, alicuota_iva)
SELECT 9.00, 16.00 WHERE NOT EXISTS (SELECT 1 FROM configuracion_fiscal_global);

CREATE TABLE IF NOT EXISTS conceptos_islr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  porcentaje_base DECIMAL(5,2) NOT NULL,
  porcentaje_retencion DECIMAL(5,2) NOT NULL,
  sustraendo_ut DECIMAL(10,2) NOT NULL DEFAULT 0,
  monto_minimo_ut DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common ISLR concepts
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut)
SELECT 'Honorarios Profesionales (Natural Residentes)', 100, 3, 83.33, 0 WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE nombre = 'Honorarios Profesionales (Natural Residentes)');
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut)
SELECT 'Servicios Generales (Jurídico)', 100, 2, 0, 0 WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE nombre = 'Servicios Generales (Jurídico)');

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS es_contribuyente_especial BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_agente_retencion_municipal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS municipio_id UUID REFERENCES municipios(id);

CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  nombre TEXT NOT NULL,
  rif TEXT NOT NULL,
  tipo_persona TEXT NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA')),
  iva_retention_rate DECIMAL(5,2) DEFAULT 0,
  islr_concept_id UUID REFERENCES conceptos_islr(id),
  municipal_rate DECIMAL(5,2) DEFAULT 0,
  licencia_actividad_economica TEXT,
  municipio_id UUID REFERENCES municipios(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('IVA', 'ISLR', 'MUNICIPAL')),
  numero_comprobante TEXT NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  proveedor_nombre TEXT NOT NULL,
  proveedor_rif TEXT NOT NULL,
  proveedor_tipo_persona TEXT NOT NULL,
  factura_numero TEXT,
  factura_control TEXT,
  factura_fecha DATE,
  base_imponible DECIMAL(15,2) NOT NULL,
  monto_iva DECIMAL(15,2),
  porcentaje_retencion DECIMAL(5,2) NOT NULL,
  monto_retenido DECIMAL(15,2) NOT NULL,
  concepto_islr_id UUID REFERENCES conceptos_islr(id),
  concepto_islr_nombre TEXT,
  sustraendo_ut DECIMAL(10,2),
  valor_ut DECIMAL(15,2),
  municipio_id UUID REFERENCES municipios(id),
  licencia_actividad TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS iva_retention DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS islr_retention DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS municipal_retention DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS neto_a_pagar DECIMAL(15,2);

CREATE TABLE IF NOT EXISTS correlativos_retenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('IVA', 'ISLR', 'MUNICIPAL')),
  periodo TEXT NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  UNIQUE (organization_id, client_id, tipo, periodo)
);

CREATE OR REPLACE FUNCTION generar_correlativo_retencion(
  p_org_id UUID,
  p_client_id UUID,
  p_tipo TEXT,
  p_fecha DATE
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_periodo TEXT;
  v_nuevo_numero INTEGER;
  v_comprobante TEXT;
BEGIN
  v_periodo := to_char(p_fecha, 'YYYYMM');
  
  INSERT INTO correlativos_retenciones (organization_id, client_id, tipo, periodo, ultimo_numero)
  VALUES (p_org_id, p_client_id, p_tipo, v_periodo, 1)
  ON CONFLICT (organization_id, client_id, tipo, periodo)
  DO UPDATE SET ultimo_numero = correlativos_retenciones.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_nuevo_numero;
  
  IF p_tipo = 'IVA' THEN
    v_comprobante := v_periodo || to_char(v_nuevo_numero, 'fm00000000');
  ELSIF p_tipo = 'ISLR' THEN
    v_comprobante := 'ISLR-' || to_char(p_fecha, 'YYYY') || '-' || to_char(v_nuevo_numero, 'fm00000000');
  ELSE
    v_comprobante := 'MUN-' || to_char(p_fecha, 'YYYY') || '-' || to_char(v_nuevo_numero, 'fm00000000');
  END IF;
  
  RETURN v_comprobante;
END;
$$;
