-- Multiinquilino con contadores, paso 1 (ver docs/mvp/estrategia/flujo-multiinquilino-contadores.md §6).
-- Aditivo: no mueve ninguna empresa existente.
--
-- Problema que cierra: el registro público (register-client) metía a las empresas sin contador
-- en un despacho real con staff, que así podía ver empresas que nunca lo eligieron.
-- Ahora existe una organización de sistema "AD System Directo" sin staff de despachos.

alter table public.organizations
  add column if not exists tipo text not null default 'despacho',
  add column if not exists owner_user_id uuid references public.users(id) on delete set null,
  add column if not exists codigo_socio text,
  add column if not exists marca jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organizations_tipo_check') then
    alter table public.organizations
      add constraint organizations_tipo_check check (tipo in ('despacho', 'directo'));
  end if;
end $$;

create unique index if not exists organizations_codigo_socio_key
  on public.organizations (codigo_socio) where codigo_socio is not null;

-- Solo puede haber UNA organización 'directo'
create unique index if not exists organizations_unica_directo
  on public.organizations (tipo) where tipo = 'directo';

insert into public.organizations (id, name, rif, email, tipo, is_active)
values ('00000000-0000-4000-8000-0000000000d1', 'AD System Directo', 'J-00000000-1', 'soporte@adsystemapp.com', 'directo', true)
on conflict (id) do nothing;

-- El staff de un despacho (admin/contador) nunca puede pertenecer a la organización Directo.
create or replace function public.impedir_staff_en_directo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role in ('admin', 'contador') and new.organization_id is not null and exists (
    select 1 from public.organizations o where o.id = new.organization_id and o.tipo = 'directo'
  ) then
    raise exception 'El staff de un despacho no puede pertenecer a la organización Directo';
  end if;
  return new;
end;
$$;

revoke all on function public.impedir_staff_en_directo() from public, anon, authenticated;

drop trigger if exists trg_impedir_staff_en_directo on public.users;
create trigger trg_impedir_staff_en_directo
  before insert or update of role, organization_id on public.users
  for each row execute function public.impedir_staff_en_directo();
