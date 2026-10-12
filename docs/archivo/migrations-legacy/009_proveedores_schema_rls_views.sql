-- migrations/009_proveedores_schema_rls_views.sql
-- Descripción: Ampliación de campos de contacto para proveedores, índice parcial único,
--              triggers de sanitización, políticas RLS y vista agregada de resumen en O(1).
-- Autor: AD System
-- Fecha: 2026-08-19

-- ════════════════════════════════════════════════════════════════════════
-- 1. Campos de contacto, auditoría y soft delete en tabla proveedores
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS telefono TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS contacto_nombre TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ════════════════════════════════════════════════════════════════════════
-- 2. Índices de rendimiento e índice parcial único anti-colisiones
-- ════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_org_rif_active 
  ON proveedores (organization_id, UPPER(TRIM(rif))) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_proveedores_org_id ON proveedores (organization_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_org_tipo ON proveedores (organization_id, tipo_persona);
CREATE INDEX IF NOT EXISTS idx_proveedores_org_active ON proveedores (organization_id, is_active) WHERE deleted_at IS NULL;

-- ════════════════════════════════════════════════════════════════════════
-- 3. Trigger de normalización y timestamp automático
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION normalize_proveedor_data()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rif := UPPER(TRIM(NEW.rif));
  NEW.nombre := TRIM(NEW.nombre);
  IF NEW.email IS NOT NULL THEN
    NEW.email := LOWER(TRIM(NEW.email));
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_proveedor ON proveedores;
CREATE TRIGGER trg_normalize_proveedor
  BEFORE INSERT OR UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION normalize_proveedor_data();

-- ════════════════════════════════════════════════════════════════════════
-- 4. Políticas RLS (Row Level Security)
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_tenant_isolation" ON proveedores;
CREATE POLICY "proveedores_tenant_isolation" ON proveedores
  FOR ALL
  TO authenticated
  USING (organization_id = get_current_organization_id())
  WITH CHECK (organization_id = get_current_organization_id());

-- ════════════════════════════════════════════════════════════════════════
-- 5. Vista de agregación de alto rendimiento en O(1)
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vista_proveedores_resumen AS
SELECT 
  p.id,
  p.organization_id,
  p.nombre,
  p.rif,
  p.tipo_persona,
  p.telefono,
  p.email,
  p.direccion,
  p.contacto_nombre,
  p.iva_retention_rate,
  p.islr_concept_id,
  p.municipal_rate,
  p.licencia_actividad_economica,
  p.municipio_id,
  p.is_active,
  p.created_at,
  p.updated_at,
  p.deleted_at,
  -- Catálogos relacionados
  c.codigo AS islr_codigo,
  c.nombre AS islr_nombre,
  c.porcentaje_retencion AS islr_porcentaje,
  c.sustraendo_ut AS islr_sustraendo_ut,
  c.aplica_persona AS islr_aplica_persona,
  m.nombre AS municipio_nombre,
  -- Métricas contables agregadas
  COALESCE(COUNT(DISTINCT i.id) FILTER (WHERE i.deleted_at IS NULL), 0) AS total_facturas,
  COALESCE(SUM((i.financial->>'totalSales')::numeric) FILTER (WHERE i.deleted_at IS NULL), 0) AS total_compras,
  COALESCE(SUM(r.monto_retenido) FILTER (WHERE r.deleted_at IS NULL), 0) AS total_retenido,
  MAX(i.issue_date) FILTER (WHERE i.deleted_at IS NULL) AS ultima_compra_fecha
FROM proveedores p
LEFT JOIN conceptos_islr c ON p.islr_concept_id = c.id
LEFT JOIN municipios m ON p.municipio_id = m.id
LEFT JOIN invoices i ON i.organization_id = p.organization_id 
                    AND (i.issuer->>'rif' = p.rif OR (i.issuer->>'id')::text = p.id::text)
                    AND i.flow = 'COMPRA'
LEFT JOIN retenciones r ON r.proveedor_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, c.codigo, c.nombre, c.porcentaje_retencion, c.sustraendo_ut, c.aplica_persona, m.nombre;
