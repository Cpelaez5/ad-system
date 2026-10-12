-- =====================================================================
-- Fase 0 · Storage: aislamiento por firma y por cliente (S4, paso 1)
-- Buckets documents e invoices. Rutas existentes:
--   documents: {org}/{categoria}/{archivo}  |  seals-signatures/{org}/{cliente}/{archivo}
--   invoices:  {org}/{archivo}
-- El paso 2 (buckets privados + URLs firmadas) va con el cambio de frontend.
-- =====================================================================

-- ¿El objeto pertenece a la organización del usuario? (para subir)
CREATE OR REPLACE FUNCTION public.objeto_en_mi_organizacion(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts text[] := storage.foldername(p_name);
  v_rol   text;
  v_org   uuid;
BEGIN
  SELECT role, organization_id INTO v_rol, v_org FROM public.users WHERE id = auth.uid();
  IF v_rol IS NULL THEN RETURN false; END IF;
  IF v_rol = 'super_admin' THEN RETURN true; END IF;
  IF v_parts[1] = 'seals-signatures' THEN v_parts := v_parts[2:]; END IF;
  RETURN v_org IS NOT NULL AND v_parts[1] = v_org::text;
END;
$$;

-- ¿El usuario puede ver/modificar este objeto?
--   super_admin: todo · admin/contador: su firma · cliente: su carpeta o lo subido por usuarios de su empresa
CREATE OR REPLACE FUNCTION public.puede_acceder_objeto(p_name text, p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parts  text[] := storage.foldername(p_name);
  v_rol    text;
  v_org    uuid;
  v_client uuid;
BEGIN
  SELECT role, organization_id, client_id INTO v_rol, v_org, v_client FROM public.users WHERE id = auth.uid();
  IF v_rol IS NULL THEN RETURN false; END IF;
  IF v_rol = 'super_admin' THEN RETURN true; END IF;
  IF v_parts[1] = 'seals-signatures' THEN v_parts := v_parts[2:]; END IF;
  IF v_org IS NULL OR v_parts[1] IS DISTINCT FROM v_org::text THEN RETURN false; END IF;
  IF v_rol IN ('admin', 'contador') THEN RETURN true; END IF;

  RETURN v_rol = 'cliente' AND v_client IS NOT NULL AND (
    v_parts[2] = v_client::text
    OR p_owner = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_owner AND u.client_id = v_client)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.objeto_en_mi_organizacion(text), public.puede_acceder_objeto(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.objeto_en_mi_organizacion(text), public.puede_acceder_objeto(text, uuid) TO authenticated, service_role;

-- documents (antes: CRUD para {public}, incluso anónimos)
DROP POLICY IF EXISTS documents_select_policy ON storage.objects;
DROP POLICY IF EXISTS documents_insert_policy ON storage.objects;
DROP POLICY IF EXISTS documents_update_policy ON storage.objects;
DROP POLICY IF EXISTS documents_delete_policy ON storage.objects;

CREATE POLICY documents_select_tenant ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.puede_acceder_objeto(name, owner));
CREATE POLICY documents_insert_tenant ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.objeto_en_mi_organizacion(name));
CREATE POLICY documents_update_tenant ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.puede_acceder_objeto(name, owner))
  WITH CHECK (bucket_id = 'documents' AND public.objeto_en_mi_organizacion(name));
CREATE POLICY documents_delete_tenant ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.puede_acceder_objeto(name, owner));

-- invoices (antes: CRUD para cualquier autenticado sin filtro de firma)
DROP POLICY IF EXISTS "invoices-policy aj13hi_0" ON storage.objects;
DROP POLICY IF EXISTS "invoices-policy aj13hi_1" ON storage.objects;
DROP POLICY IF EXISTS "invoices-policy aj13hi_2" ON storage.objects;
DROP POLICY IF EXISTS "invoices-policy aj13hi_3" ON storage.objects;

CREATE POLICY invoices_select_tenant ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND public.puede_acceder_objeto(name, owner));
CREATE POLICY invoices_insert_tenant ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invoices' AND public.objeto_en_mi_organizacion(name));
CREATE POLICY invoices_update_tenant ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND public.puede_acceder_objeto(name, owner))
  WITH CHECK (bucket_id = 'invoices' AND public.objeto_en_mi_organizacion(name));
CREATE POLICY invoices_delete_tenant ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invoices' AND public.puede_acceder_objeto(name, owner));

-- payment-proofs: subir/actualizar solo en la carpeta del propio cliente (o super admin)
DROP POLICY IF EXISTS payment_proofs_upload ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_update ON storage.objects;

CREATE POLICY payment_proofs_upload_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs' AND (
      (storage.foldername(name))[1] = public.get_current_user_client_id()::text
      OR public.get_current_user_role() = 'super_admin'
    )
  );
CREATE POLICY payment_proofs_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND (
      (storage.foldername(name))[1] = public.get_current_user_client_id()::text
      OR public.get_current_user_role() = 'super_admin'
    )
  )
  WITH CHECK (
    bucket_id = 'payment-proofs' AND (
      (storage.foldername(name))[1] = public.get_current_user_client_id()::text
      OR public.get_current_user_role() = 'super_admin'
    )
  );
