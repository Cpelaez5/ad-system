-- migrations/20260209_fix_fiscal_docs_rls.sql
-- Descripción: Corrección de políticas RLS para garantizar aislamiento de datos por cliente
-- Autor: AI Assistant
-- Fecha: 2026-02-09

-- 1. Eliminar políticas anteriores (menos restrictivas)
DROP POLICY IF EXISTS "fiscal_docs_select_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_insert_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_update_policy" ON fiscal_docs;
DROP POLICY IF EXISTS "fiscal_docs_delete_policy" ON fiscal_docs;

-- 2. Habilitar RLS (por si acaso no estaba)
ALTER TABLE fiscal_docs ENABLE ROW LEVEL SECURITY;

-- 3. Funciones auxiliares para verificar roles (opcional pero más limpio, aquí usaremos lógica directa)

-- 4. Nueva Política de LECTURA (SELECT)
-- Admin/Contador: Ven todo de su organización
-- Cliente: Ve solo lo que coincida con su organization_id Y su client_id
CREATE POLICY "fiscal_docs_select_policy" ON fiscal_docs
  FOR SELECT USING (
    (
      -- Caso 1: Admin/Contador/SuperAdmin de la organización
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    OR
    (
      -- Caso 2: Cliente específico
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- 5. Nueva Política de INSERCIÓN (INSERT)
-- Admin/Contador: Pueden crear para cualquier cliente de su org
-- Cliente: Puede crear SOLO para sí mismo
CREATE POLICY "fiscal_docs_insert_policy" ON fiscal_docs
  FOR INSERT WITH CHECK (
    (
      -- Caso 1: Admin/Contador
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    OR
    (
      -- Caso 2: Cliente
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- 6. Nueva Política de ACTUALIZACIÓN (UPDATE)
-- Igual que SELECT
CREATE POLICY "fiscal_docs_update_policy" ON fiscal_docs
  FOR UPDATE USING (
    (
      -- Caso 1: Admin/Contador
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    OR
    (
      -- Caso 2: Cliente
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );

-- 7. Nueva Política de ELIMINACIÓN (DELETE)
-- Igual que SELECT
CREATE POLICY "fiscal_docs_delete_policy" ON fiscal_docs
  FOR DELETE USING (
    (
      -- Caso 1: Admin/Contador
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
    OR
    (
      -- Caso 2: Cliente
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente'
      AND
      organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
      AND
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  );
