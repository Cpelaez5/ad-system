-- =====================================================================
-- Fase 0 · Seguridad: roles, campos privilegiados, invitaciones y RPCs
-- Ver docs/mvp/manuales/01-agente-seguridad-bd.md (S3 y S5)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. handle_new_user: el rol y la organización NUNCA salen del metadata
--    que envía el navegador. Fuentes válidas, en orden:
--      a) raw_app_meta_data (solo lo puede escribir service_role)
--      b) una invitación válida (token + email + pendiente + no vencida)
--      c) registro abierto: 'admin' sin organización (no ve ningún dato
--         hasta que el super admin le asigne una firma)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      text := 'admin';
  v_org       uuid := NULL;
  v_client    uuid := NULL;
  v_token     uuid := NULL;
  v_inv       public.invitations%ROWTYPE;
  v_username  text;
BEGIN
  IF NEW.raw_app_meta_data ? 'role' THEN
    v_role   := NEW.raw_app_meta_data->>'role';
    v_org    := NULLIF(NEW.raw_app_meta_data->>'organization_id', '')::uuid;
    v_client := NULLIF(NEW.raw_app_meta_data->>'client_id', '')::uuid;
  ELSE
    BEGIN
      v_token := NULLIF(NEW.raw_user_meta_data->>'invitation_token', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_token := NULL;
    END;

    IF v_token IS NOT NULL THEN
      SELECT * INTO v_inv
        FROM public.invitations
       WHERE token = v_token
         AND lower(email) = lower(NEW.email)
         AND COALESCE(status, 'pending') = 'pending'
         AND (expires_at IS NULL OR expires_at > now())
         AND role IN ('admin', 'contador', 'cliente')
         AND (role <> 'cliente' OR client_id IS NOT NULL)
       FOR UPDATE;

      IF FOUND THEN
        v_role   := v_inv.role;
        v_org    := v_inv.organization_id;
        v_client := v_inv.client_id;
        UPDATE public.invitations SET status = 'accepted' WHERE id = v_inv.id;
      END IF;
    END IF;
  END IF;

  v_username := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1));
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.users (id, email, username, first_name, last_name, role, organization_id, client_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_role,
    v_org,
    v_client
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. Invitaciones: fuera el SELECT público; lectura solo por token exacto
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Invitations are viewable by token" ON public.invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token uuid)
RETURNS TABLE (
  id uuid, email text, role text, organization_id uuid, client_id uuid,
  status text, expires_at timestamptz, token uuid, organization_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.email, i.role, i.organization_id, i.client_id,
         i.status, i.expires_at, i.token, o.name
    FROM public.invitations i
    LEFT JOIN public.organizations o ON o.id = i.organization_id
   WHERE i.token = p_token;
$$;

-- ---------------------------------------------------------------------
-- 3. Campos privilegiados: nadie se sube el rol, cambia de organización,
--    se alarga la prueba ni marca facturas como pagadas desde el navegador.
--    auth.uid() IS NULL = service_role / SQL directo -> permitido.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_campos_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rol text;
  v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  SELECT role, organization_id INTO v_rol, v_org FROM public.users WHERE id = auth.uid();
  IF v_rol = 'super_admin' THEN RETURN NEW; END IF;

  IF (NEW.role, NEW.organization_id, NEW.client_id)
     IS DISTINCT FROM (OLD.role, OLD.organization_id, OLD.client_id) THEN
    IF NOT (
      v_rol = 'admin'
      AND NEW.id <> auth.uid()
      AND OLD.organization_id = v_org
      AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
      AND NEW.role IN ('admin', 'contador', 'cliente')
      AND (NEW.client_id IS NULL OR EXISTS (
            SELECT 1 FROM public.clients c WHERE c.id = NEW.client_id AND c.organization_id = v_org))
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501',
        MESSAGE = 'No tienes permiso para cambiar el rol, la organización o la empresa de este usuario.';
    END IF;
  END IF;

  IF (NEW.trial_start, NEW.trial_end, NEW.plan_id, NEW.storage_limit_bytes)
     IS DISTINCT FROM (OLD.trial_start, OLD.trial_end, OLD.plan_id, OLD.storage_limit_bytes) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo el administrador del sistema puede cambiar el plan o el período de prueba.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_campos_users ON public.users;
CREATE TRIGGER trg_proteger_campos_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_users();

CREATE OR REPLACE FUNCTION public.proteger_campos_clients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() = 'super_admin' THEN RETURN NEW; END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No se puede mover una empresa a otra organización.';
  END IF;

  IF public.get_current_user_role() = 'cliente'
     AND (NEW.status, NEW.balance) IS DISTINCT FROM (OLD.status, OLD.balance) THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'No tienes permiso para cambiar el estado o el saldo de la empresa.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_campos_clients ON public.clients;
CREATE TRIGGER trg_proteger_campos_clients
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_clients();

-- El cliente solo puede reportar un pago: referencia, método y estado 'pending'.
CREATE OR REPLACE FUNCTION public.proteger_campos_system_invoices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_current_user_role() = 'super_admin' THEN RETURN NEW; END IF;

  IF (NEW.client_id, NEW.subscription_id, NEW.invoice_number, NEW.amount, NEW.currency,
      NEW.period_start, NEW.period_end, NEW.due_date, NEW.paid_at)
     IS DISTINCT FROM
     (OLD.client_id, OLD.subscription_id, OLD.invoice_number, OLD.amount, OLD.currency,
      OLD.period_start, OLD.period_end, OLD.due_date, OLD.paid_at)
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '42501',
      MESSAGE = 'Solo puedes reportar el pago de tu factura; la validación la hace el administrador.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_campos_system_invoices ON public.system_invoices;
CREATE TRIGGER trg_proteger_campos_system_invoices
  BEFORE UPDATE ON public.system_invoices
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_system_invoices();

-- ---------------------------------------------------------------------
-- 4. Factura de suscripción: solo el propio cliente o el super admin
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_pending_subscription_invoice_v3(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_amount decimal;
  v_notes text;
  v_result public.system_invoices;
BEGIN
  v_client_id := (payload->>'client_id')::uuid;
  v_amount := (payload->>'amount')::decimal;
  v_notes := payload->>'notes';

  IF v_client_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'client_id y amount (> 0) son obligatorios';
  END IF;

  IF NOT (public.get_current_user_role() = 'super_admin'
          OR v_client_id = public.get_current_user_client_id()) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'No autorizado para crear esta factura.';
  END IF;

  INSERT INTO public.system_invoices (
    client_id, invoice_number, amount, status, period_start, period_end, due_date, notes
  ) VALUES (
    v_client_id,
    'INV-SUB-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
    v_amount,
    'pending',
    current_date,
    current_date + interval '1 month' - interval '1 day',
    current_date + interval '5 days',
    v_notes
  ) RETURNING * INTO v_result;

  RETURN jsonb_build_object('success', true, 'data', to_jsonb(v_result));
END;
$$;

-- ---------------------------------------------------------------------
-- 5. RPCs de lectura y correlativos: pasan a SECURITY INVOKER para que
--    apliquen las políticas RLS de quien llama (antes cualquiera podía
--    pasar el org_id de otra firma y leer sus datos).
-- ---------------------------------------------------------------------
ALTER FUNCTION public.get_invoice_stats(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_client_stats(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_low_stock_products(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_next_product_sku(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_top_selling_products(uuid, uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.sugerir_correlativo_retencion(uuid, uuid, text, date) SECURITY INVOKER;
ALTER FUNCTION public.generar_correlativo_retencion(uuid, uuid, text, date) SECURITY INVOKER;
ALTER FUNCTION public.validar_comprobante_unico(uuid, text, text, uuid) SECURITY INVOKER;

-- ---------------------------------------------------------------------
-- 6. search_path fijo (advisor function_search_path_mutable)
-- ---------------------------------------------------------------------
ALTER FUNCTION public.ensure_default_organization() SET search_path = public;
ALTER FUNCTION public.get_client_stats(uuid) SET search_path = public;
ALTER FUNCTION public.get_current_organization_id() SET search_path = public;
ALTER FUNCTION public.get_current_user_client_id() SET search_path = public;
ALTER FUNCTION public.get_current_user_role() SET search_path = public;
ALTER FUNCTION public.get_invoice_stats(uuid) SET search_path = public;
ALTER FUNCTION public.get_low_stock_products(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.get_next_product_sku(uuid) SET search_path = public;
ALTER FUNCTION public.get_top_selling_products(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.set_timestamp() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_user_preferences_timestamp() SET search_path = public;

-- ---------------------------------------------------------------------
-- 7. Privilegios de ejecución
--    - anon: solo los helpers de RLS (devuelven NULL sin sesión) y la
--      lectura de invitación por token.
--    - Funciones de trigger: nadie las llama directamente.
--    - v2 (sin uso en el código): cerrada.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.create_pending_subscription_invoice_v3(jsonb),
  public.delete_user_cascade(uuid),
  public.generar_correlativo_retencion(uuid, uuid, text, date),
  public.sugerir_correlativo_retencion(uuid, uuid, text, date),
  public.validar_comprobante_unico(uuid, text, text, uuid),
  public.get_client_stats(uuid),
  public.get_invoice_stats(uuid),
  public.get_low_stock_products(uuid, uuid),
  public.get_next_product_sku(uuid),
  public.get_top_selling_products(uuid, uuid, integer),
  public.registrar_compra_con_retenciones(uuid, uuid, jsonb, boolean, boolean, boolean, uuid, text, text, text, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.create_pending_subscription_invoice_v3(jsonb),
  public.delete_user_cascade(uuid),
  public.generar_correlativo_retencion(uuid, uuid, text, date),
  public.sugerir_correlativo_retencion(uuid, uuid, text, date),
  public.validar_comprobante_unico(uuid, text, text, uuid),
  public.get_client_stats(uuid),
  public.get_invoice_stats(uuid),
  public.get_low_stock_products(uuid, uuid),
  public.get_next_product_sku(uuid),
  public.get_top_selling_products(uuid, uuid, integer),
  public.registrar_compra_con_retenciones(uuid, uuid, jsonb, boolean, boolean, boolean, uuid, text, text, text, uuid)
TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION
  public.create_pending_subscription_invoice_v2(jsonb),
  public.ensure_default_organization(),
  public.handle_new_user(),
  public.proteger_campos_users(),
  public.proteger_campos_clients(),
  public.proteger_campos_system_invoices(),
  public.set_timestamp(),
  public.update_updated_at_column(),
  public.update_user_preferences_timestamp()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated, service_role;
