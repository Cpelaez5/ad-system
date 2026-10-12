-- migrations/010_proveedores_client_isolation.sql
-- Descripción: Aislamiento estricto de proveedores por cliente (client_id).
--              Garantiza que cada cliente tenga su propio directorio privado de proveedores.
-- Autor: AD System
-- Fecha: 2026-08-19

-- 1. Agregar columna client_id si no existe
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- 2. Índice de rendimiento para consultas multi-tenant por cliente
CREATE INDEX IF NOT EXISTS idx_proveedores_org_client 
  ON proveedores (organization_id, client_id);

CREATE INDEX IF NOT EXISTS idx_proveedores_client_rif 
  ON proveedores (client_id, rif) 
  WHERE deleted_at IS NULL;

-- 3. Retrocompatibilidad: Asignar client_id a proveedores existentes desde facturas o retenciones
UPDATE proveedores p
SET client_id = sub.client_id
FROM (
  SELECT DISTINCT proveedor_id, client_id 
  FROM retenciones 
  WHERE proveedor_id IS NOT NULL AND client_id IS NOT NULL
) sub
WHERE p.id = sub.proveedor_id AND p.client_id IS NULL;

-- 4. Actualizar políticas RLS de aislamiento estricto
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_tenant_isolation" ON proveedores;
DROP POLICY IF EXISTS "proveedores_client_strict_isolation" ON proveedores;

CREATE POLICY "proveedores_client_strict_isolation" ON proveedores
  FOR ALL
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      -- Contadores y administradores ven los proveedores de todos los clientes de su organización
      (SELECT role FROM users WHERE id = auth.uid()) IN ('contador', 'admin', 'super_admin')
      OR
      -- Los clientes solo pueden ver/gestionar sus propios proveedores privados
      (client_id = (SELECT client_id FROM users WHERE id = auth.uid()))
      OR
      -- Fallback para registros globales no asociados
      (client_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) IN ('contador', 'admin', 'super_admin'))
    )
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('contador', 'admin', 'super_admin')
      OR
      (client_id = (SELECT client_id FROM users WHERE id = auth.uid()))
    )
  );

COMMENT ON COLUMN proveedores.client_id IS 'ID de la empresa cliente a la que pertenece exclusivamente este proveedor.';
