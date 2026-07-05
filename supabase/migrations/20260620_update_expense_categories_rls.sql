-- Modificar politicas RLS para restringir categorias por cliente
DROP POLICY IF EXISTS "expense_categories_select" ON expense_categories;
CREATE POLICY "expense_categories_select" ON expense_categories
FOR SELECT USING (
  organization_id = get_current_organization_id()
  AND (
    get_current_user_client_id() IS NULL 
    OR client_id IS NULL 
    OR client_id = get_current_user_client_id()
  )
);

DROP POLICY IF EXISTS "expense_categories_insert" ON expense_categories;
CREATE POLICY "expense_categories_insert" ON expense_categories
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
  AND (
    get_current_user_client_id() IS NULL 
    OR client_id = get_current_user_client_id()
  )
);

DROP POLICY IF EXISTS "expense_categories_update" ON expense_categories;
CREATE POLICY "expense_categories_update" ON expense_categories
FOR UPDATE USING (
  organization_id = get_current_organization_id()
  AND (
    get_current_user_client_id() IS NULL 
    OR client_id = get_current_user_client_id()
  )
) WITH CHECK (
  organization_id = get_current_organization_id()
  AND (
    get_current_user_client_id() IS NULL 
    OR client_id = get_current_user_client_id()
  )
);

DROP POLICY IF EXISTS "expense_categories_delete" ON expense_categories;
CREATE POLICY "expense_categories_delete" ON expense_categories
FOR DELETE USING (
  organization_id = get_current_organization_id()
  AND (
    get_current_user_client_id() IS NULL 
    OR client_id = get_current_user_client_id()
  )
);
