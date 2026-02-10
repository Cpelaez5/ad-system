-- migrations/20260210_fix_fiscal_docs_rls_null_handling.sql
-- Descripción: Corregir políticas RLS para manejar client_id NULL correctamente
-- Problema: En PostgreSQL, NULL = NULL evalúa a NULL (no TRUE), causando que 
--           documentos con client_id NULL sean invisibles para usuarios con client_id NULL
-- Solución: Usar IS NOT DISTINCT FROM en lugar de = para comparar client_id
-- Autor: AI Assistant
-- Fecha: 2026-02-10

-- 1. Eliminar políticas anteriores
DROP POLICY IF EXISTS "fiscal_docs_select_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_insert_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_update_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_delete_policy" ON fiscal_docs;

-- 2. Asegurar RLS habilitado
ALTER TABLE fiscal_docs ENABLE ROW LEVEL SECURITY;

-- 3. Política de LECTURA (SELECT)
-- Admin/Contador/SuperAdmin: Ven todo de su organización
-- Cliente: Ve documentos de su organización donde client_id coincida (incluyendo NULL)
CREATE POLICY "fiscal_docs_select_policy" ON fiscal_docs
  FOR SELECT USING (
    -- Verificar que pertenece a la misma organización
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND
    (
      -- Caso 1: Admin/Contador/SuperAdmin ven todo de la organización
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      OR
      -- Caso 2: Cliente ve sus propios documentos
      -- IS NOT DISTINCT FROM maneja NULL = NULL correctamente (evalúa a TRUE)
      (
        (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
        AND
        client_id IS NOT DISTINCT FROM (SELECT client_id FROM users WHERE id = auth.uid())
      )
    )
  );

-- 4. Política de INSERCIÓN (INSERT)
CREATE POLICY "fiscal_docs_insert_policy" ON fiscal_docs
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      OR
      (
        (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
        AND
        client_id IS NOT DISTINCT FROM (SELECT client_id FROM users WHERE id = auth.uid())
      )
    )
  );

-- 5. Política de ACTUALIZACIÓN (UPDATE)
CREATE POLICY "fiscal_docs_update_policy" ON fiscal_docs
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      OR
      (
        (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
        AND
        client_id IS NOT DISTINCT FROM (SELECT client_id FROM users WHERE id = auth.uid())
      )
    )
  );

-- 6. Política de ELIMINACIÓN (DELETE)
CREATE POLICY "fiscal_docs_delete_policy" ON fiscal_docs
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND
    (
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      OR
      (
        (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
        AND
        client_id IS NOT DISTINCT FROM (SELECT client_id FROM users WHERE id = auth.uid())
      )
    )
  );
