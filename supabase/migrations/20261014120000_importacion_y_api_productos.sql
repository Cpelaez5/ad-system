-- Importación de productos (Excel/CSV) con historial y "deshacer", y llaves de API
-- por empresa para cargar productos desde otros sistemas (función api-productos).
-- REGLA (incidente 2026-10-13): estas tablas tienen UNA sola FK, a clients. Si además
-- apuntaran a users u organizations, PostgREST las vería como tabla puente y el embed
-- users.select('*, organizations(*)' / clients(*)) del login quedaría ambiguo.

-- ── Historial de importaciones ─────────────────────────────────────────────
create table if not exists public.importaciones_productos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,            -- sin FK a propósito (ver regla arriba)
  origen text not null default 'archivo' check (origen in ('archivo', 'api')),
  archivo text,
  rubro text,
  total integer not null default 0,
  creados integer not null default 0,
  actualizados integer not null default 0,
  con_error integer not null default 0,
  ids_creados uuid[] not null default '{}',
  creado_por uuid,                          -- sin FK a propósito
  deshecha_en timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists importaciones_productos_client_idx on public.importaciones_productos (client_id, created_at desc);
alter table public.importaciones_productos enable row level security;

drop policy if exists importaciones_select on public.importaciones_productos;
create policy importaciones_select on public.importaciones_productos for select to authenticated
  using (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  );

drop policy if exists importaciones_insert on public.importaciones_productos;
create policy importaciones_insert on public.importaciones_productos for insert to authenticated
  with check (
    organization_id = public.get_current_organization_id()
    and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id())
    and creado_por = auth.uid()
  );

-- Solo se actualiza para marcarla como deshecha.
drop policy if exists importaciones_update on public.importaciones_productos;
create policy importaciones_update on public.importaciones_productos for update to authenticated
  using (
    organization_id = public.get_current_organization_id()
    and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id())
  )
  with check (
    organization_id = public.get_current_organization_id()
    and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id())
  );

-- ── Llaves de API por empresa ──────────────────────────────────────────────
-- La llave completa se muestra UNA vez al crearla; aquí solo queda su hash SHA-256.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,            -- sin FK a propósito
  nombre text not null,
  prefijo text not null,                    -- "ads_xxxxxxxx" para reconocerla en la lista
  hash text not null unique,
  creado_por uuid,                          -- sin FK a propósito
  ultimo_uso timestamptz,
  revocada_en timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_client_idx on public.api_keys (client_id);
alter table public.api_keys enable row level security;

-- Lectura: la empresa ve sus llaves (sin el hash: se expone una vista sin esa columna).
drop policy if exists api_keys_select on public.api_keys;
create policy api_keys_select on public.api_keys for select to authenticated
  using (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  );
-- Sin políticas de insert/update/delete: solo por las funciones de abajo.
-- El hash nunca sale a la app: permiso de lectura solo en las columnas seguras.
revoke all on public.api_keys from authenticated, anon;
grant select (id, client_id, organization_id, nombre, prefijo, ultimo_uso, revocada_en, created_at)
  on public.api_keys to authenticated;

-- Crear llave: devuelve la llave completa una sola vez.
create or replace function public.crear_api_key(p_nombre text)
returns table (id uuid, llave text, prefijo text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_rol text; v_org uuid; v_client uuid; v_llave text; v_id uuid;
begin
  select u.role, u.organization_id, u.client_id into v_rol, v_org, v_client from public.users u where u.id = auth.uid();
  if v_rol is distinct from 'cliente' or v_client is null then
    raise exception 'Solo la empresa puede crear sus llaves de API';
  end if;
  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'Ponle un nombre a la llave (por ejemplo, el sistema que la usará)';
  end if;
  if (select count(*) from public.api_keys k where k.client_id = v_client and k.revocada_en is null) >= 5 then
    raise exception 'Máximo 5 llaves activas: revoca una que no uses';
  end if;
  v_llave := 'ads_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.api_keys (client_id, organization_id, nombre, prefijo, hash, creado_por)
  values (v_client, v_org, left(trim(p_nombre), 60), left(v_llave, 12), encode(extensions.digest(v_llave, 'sha256'), 'hex'), auth.uid())
  returning api_keys.id into v_id;
  return query select v_id, v_llave, left(v_llave, 12);
end;
$$;

create or replace function public.revocar_api_key(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_client uuid;
begin
  select u.client_id into v_client from public.users u where u.id = auth.uid() and u.role = 'cliente';
  update public.api_keys set revocada_en = now()
   where id = p_id and client_id = v_client and revocada_en is null;
  if not found then raise exception 'No encontramos esa llave'; end if;
end;
$$;

revoke all on function public.crear_api_key(text) from public, anon;
revoke all on function public.revocar_api_key(uuid) from public, anon;
grant execute on function public.crear_api_key(text) to authenticated;
grant execute on function public.revocar_api_key(uuid) to authenticated;
