-- Retenciones municipales por MUNICIPIO (auditoria/retenciones-municipales-2026-10-15.md):
-- - municipio_id: a qué alcaldía pertenece el código (null = código general del despacho).
-- - organization_id null = catálogo COMÚN de AD System (lo mantiene el super admin y lo leen todos).
-- - ordenanza / vigente_desde: de dónde sale la alícuota.
-- Sin FK nuevas (regla de embeds); municipio_id se valida en la app contra `municipios`.
alter table public.conceptos_municipales
  add column if not exists municipio_id uuid,
  add column if not exists ordenanza text,
  add column if not exists vigente_desde date;
alter table public.conceptos_municipales alter column organization_id drop not null;
create index if not exists conceptos_municipales_municipio_idx on public.conceptos_municipales (municipio_id) where status = 'ACTIVO';

drop policy if exists conceptos_municipales_select on public.conceptos_municipales;
create policy conceptos_municipales_select on public.conceptos_municipales for select to authenticated
  using (organization_id is null
    or public.get_current_user_role() = 'super_admin'
    or organization_id = public.get_current_organization_id());

drop policy if exists conceptos_municipales_insert on public.conceptos_municipales;
create policy conceptos_municipales_insert on public.conceptos_municipales for insert to authenticated
  with check (public.get_current_user_role() = 'super_admin'
    or (organization_id is not null and organization_id = public.get_current_organization_id()
        and public.get_current_user_role() in ('admin', 'contador')));
drop policy if exists conceptos_municipales_update on public.conceptos_municipales;
create policy conceptos_municipales_update on public.conceptos_municipales for update to authenticated
  using (public.get_current_user_role() = 'super_admin'
    or (organization_id is not null and organization_id = public.get_current_organization_id()
        and public.get_current_user_role() in ('admin', 'contador')));
drop policy if exists conceptos_municipales_delete on public.conceptos_municipales;
create policy conceptos_municipales_delete on public.conceptos_municipales for delete to authenticated
  using (public.get_current_user_role() = 'super_admin'
    or (organization_id is not null and organization_id = public.get_current_organization_id()
        and public.get_current_user_role() in ('admin', 'contador')));

comment on column public.conceptos_municipales.organization_id is 'null = catálogo común de AD System (super admin); si no, código propio del despacho.';
comment on column public.conceptos_municipales.municipio_id is 'Alcaldía a la que aplica (municipios.id). null = código general.';
