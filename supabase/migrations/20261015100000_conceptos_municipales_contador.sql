-- El contador también administra los códigos de retención municipal de su despacho
-- (antes solo admin/super_admin; ver auditoria/retenciones-municipales-2026-10-15.md).
drop policy if exists conceptos_municipales_insert on public.conceptos_municipales;
create policy conceptos_municipales_insert on public.conceptos_municipales for insert to authenticated
  with check (public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id() and public.get_current_user_role() in ('admin', 'contador')));
drop policy if exists conceptos_municipales_update on public.conceptos_municipales;
create policy conceptos_municipales_update on public.conceptos_municipales for update to authenticated
  using (public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id() and public.get_current_user_role() in ('admin', 'contador')));
drop policy if exists conceptos_municipales_delete on public.conceptos_municipales;
create policy conceptos_municipales_delete on public.conceptos_municipales for delete to authenticated
  using (public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id() and public.get_current_user_role() in ('admin', 'contador')));
