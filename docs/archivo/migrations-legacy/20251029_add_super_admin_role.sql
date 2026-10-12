-- ================================================
-- Migration: Add super_admin role and relax RLS for it
-- Date: 2025-10-29
-- ================================================

-- 1) Extend users.role to include 'super_admin'
DO $$ BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('super_admin','admin','contador','auditor','facturador','operador','consultor','cliente')
  );
END $$;

-- 2) Update policies to allow super_admin to see all organizations' data

-- organizations
DROP POLICY IF EXISTS organizations_select_own ON organizations;
CREATE POLICY organizations_select_own ON organizations
  FOR SELECT USING (
    id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS organizations_update_own ON organizations;
CREATE POLICY organizations_update_own ON organizations
  FOR UPDATE USING (
    id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- users
DROP POLICY IF EXISTS users_select_own_org ON users;
CREATE POLICY users_select_own_org ON users
  FOR SELECT USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS users_insert_own_org ON users;
CREATE POLICY users_insert_own_org ON users
  FOR INSERT WITH CHECK (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS users_update_own_org ON users;
CREATE POLICY users_update_own_org ON users
  FOR UPDATE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- clients
DROP POLICY IF EXISTS clients_select_own_org ON clients;
CREATE POLICY clients_select_own_org ON clients
  FOR SELECT USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS clients_insert_own_org ON clients;
CREATE POLICY clients_insert_own_org ON clients
  FOR INSERT WITH CHECK (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS clients_update_own_org ON clients;
CREATE POLICY clients_update_own_org ON clients
  FOR UPDATE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS clients_delete_own_org ON clients;
CREATE POLICY clients_delete_own_org ON clients
  FOR DELETE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- invoices
DROP POLICY IF EXISTS invoices_select_own_org ON invoices;
CREATE POLICY invoices_select_own_org ON invoices
  FOR SELECT USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS invoices_insert_own_org ON invoices;
CREATE POLICY invoices_insert_own_org ON invoices
  FOR INSERT WITH CHECK (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS invoices_update_own_org ON invoices;
CREATE POLICY invoices_update_own_org ON invoices
  FOR UPDATE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS invoices_delete_own_org ON invoices;
CREATE POLICY invoices_delete_own_org ON invoices
  FOR DELETE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- audit_logs
DROP POLICY IF EXISTS audit_logs_select_own_org ON audit_logs;
CREATE POLICY audit_logs_select_own_org ON audit_logs
  FOR SELECT USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS audit_logs_insert_own_org ON audit_logs;
CREATE POLICY audit_logs_insert_own_org ON audit_logs
  FOR INSERT WITH CHECK (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- documents
DROP POLICY IF EXISTS documents_select_own_org ON documents;
CREATE POLICY documents_select_own_org ON documents
  FOR SELECT USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS documents_insert_own_org ON documents;
CREATE POLICY documents_insert_own_org ON documents
  FOR INSERT WITH CHECK (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS documents_update_own_org ON documents;
CREATE POLICY documents_update_own_org ON documents
  FOR UPDATE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS documents_delete_own_org ON documents;
CREATE POLICY documents_delete_own_org ON documents
  FOR DELETE USING (
    organization_id = get_current_organization_id() OR (
      (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    )
  );



