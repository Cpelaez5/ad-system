-- Corrección de la política RLS para ai_provider_profiles
-- El rol correcto es 'super_admin' y se consulta a través de la tabla users (o jwt dependiendo de la config).
-- En este sistema, típicamente se verifica con (SELECT role FROM users WHERE id = auth.uid())

DROP POLICY IF EXISTS "superadmin_only" ON ai_provider_profiles;

CREATE POLICY "superadmin_only" ON ai_provider_profiles
  FOR ALL
  TO authenticated
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');
