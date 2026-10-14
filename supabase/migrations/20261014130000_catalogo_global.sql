-- Catálogo GLOBAL de proveedores y productos, compartido por todos los negocios
-- (docs/mvp/diseno/catalogo-global.md). Solo datos públicos o de producto: nunca
-- precios, costos, existencias, contactos ni QUIÉN compra a quién.
-- Sin FK de ningún tipo (regla del incidente de embeds del 2026-10-13).

create extension if not exists pg_trgm with schema extensions;

-- ── Utilidades ─────────────────────────────────────────────────────────────
create or replace function public.rif_normalizado(p text)
returns text language sql immutable parallel safe
as $$ select upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')) $$;

-- GTIN (EAN-8, UPC-A, EAN-13, GTIN-14) con dígito verificador.
create or replace function public.codigo_barras_valido(p text)
returns boolean language plpgsql immutable parallel safe
as $$
declare
  d text := regexp_replace(coalesce(p, ''), '\s', '', 'g');
  n int; s int := 0; i int;
begin
  if d !~ '^[0-9]+$' then return false; end if;
  n := length(d);
  if n not in (8, 12, 13, 14) then return false; end if;
  for i in 1..n - 1 loop
    s := s + substr(d, n - i, 1)::int * case when i % 2 = 1 then 3 else 1 end;
  end loop;
  return (10 - s % 10) % 10 = substr(d, n, 1)::int;
end;
$$;

-- ── Tablas ─────────────────────────────────────────────────────────────────
create table if not exists public.catalogo_proveedores (
  id uuid primary key default gen_random_uuid(),
  rif_normalizado text not null unique check (rif_normalizado ~ '^[JGC][0-9]{9}$'),
  rif text not null,
  razon_social text not null,
  nombre_comercial text,
  tipo_persona text not null default 'juridica' check (tipo_persona in ('juridica', 'gobierno')),
  domicilio_fiscal text,
  es_contribuyente_especial boolean,
  actividad text,
  confirmaciones integer not null default 0,
  verificado boolean not null default false,
  fuente text not null default 'aporte' check (fuente in ('aporte', 'equipo', 'importado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalogo_proveedores_nombre_trgm
  on public.catalogo_proveedores using gin (lower(razon_social) extensions.gin_trgm_ops);

create table if not exists public.catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  codigo_barras text not null unique check (public.codigo_barras_valido(codigo_barras)),
  nombre text not null,
  marca text,
  categoria text,
  presentacion text,
  unidad text,
  atributos jsonb not null default '{}'::jsonb,
  foto_path text,                       -- bucket público `catalogo` (solo fotos de estudio)
  confirmaciones integer not null default 0,
  verificado boolean not null default false,
  fuente text not null default 'aporte' check (fuente in ('aporte', 'equipo', 'importado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists catalogo_productos_nombre_trgm
  on public.catalogo_productos using gin (lower(nombre) extensions.gin_trgm_ops);

-- Confirmaciones de negocios DISTINTOS. Privada: solo el super admin la lee.
create table if not exists public.catalogo_aportes (
  catalogo text not null check (catalogo in ('proveedor', 'producto')),
  clave text not null,
  client_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (catalogo, clave, client_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.catalogo_proveedores enable row level security;
alter table public.catalogo_productos enable row level security;
alter table public.catalogo_aportes enable row level security;

drop policy if exists catalogo_proveedores_leer on public.catalogo_proveedores;
create policy catalogo_proveedores_leer on public.catalogo_proveedores for select to authenticated using (true);
drop policy if exists catalogo_proveedores_admin on public.catalogo_proveedores;
create policy catalogo_proveedores_admin on public.catalogo_proveedores for all to authenticated
  using (public.get_current_user_role() = 'super_admin') with check (public.get_current_user_role() = 'super_admin');

drop policy if exists catalogo_productos_leer on public.catalogo_productos;
create policy catalogo_productos_leer on public.catalogo_productos for select to authenticated using (true);
drop policy if exists catalogo_productos_admin on public.catalogo_productos;
create policy catalogo_productos_admin on public.catalogo_productos for all to authenticated
  using (public.get_current_user_role() = 'super_admin') with check (public.get_current_user_role() = 'super_admin');

drop policy if exists catalogo_aportes_admin on public.catalogo_aportes;
create policy catalogo_aportes_admin on public.catalogo_aportes for select to authenticated
  using (public.get_current_user_role() = 'super_admin');

-- ── Aportes automáticos (copian SOLO campos permitidos; nunca bloquean el guardado) ──
create or replace function public.aportar_catalogo_proveedor()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_rif text; v_nuevo boolean;
begin
  begin
    v_rif := public.rif_normalizado(new.rif);
    if new.deleted_at is not null or new.client_id is null
       or v_rif !~ '^[JGC][0-9]{9}$' or coalesce(trim(new.nombre), '') = '' then
      return new;
    end if;
    insert into public.catalogo_aportes (catalogo, clave, client_id)
    values ('proveedor', v_rif, new.client_id) on conflict do nothing;
    v_nuevo := found;
    insert into public.catalogo_proveedores (rif_normalizado, rif, razon_social, tipo_persona, domicilio_fiscal, confirmaciones)
    values (v_rif, left(v_rif, 1) || '-' || substr(v_rif, 2, 8) || '-' || right(v_rif, 1), left(trim(new.nombre), 160),
            case when left(v_rif, 1) = 'G' then 'gobierno' else 'juridica' end,
            nullif(left(trim(coalesce(new.direccion, '')), 300), ''), 1)
    on conflict (rif_normalizado) do update
      set confirmaciones = public.catalogo_proveedores.confirmaciones + case when v_nuevo then 1 else 0 end,
          domicilio_fiscal = coalesce(public.catalogo_proveedores.domicilio_fiscal, excluded.domicilio_fiscal),
          updated_at = now();
  exception when others then
    null; -- el catálogo es un extra: jamás impide guardar el proveedor del negocio
  end;
  return new;
end;
$$;

drop trigger if exists proveedores_aporta_catalogo on public.proveedores;
create trigger proveedores_aporta_catalogo
  after insert or update of nombre, rif, direccion, deleted_at on public.proveedores
  for each row execute function public.aportar_catalogo_proveedor();

create or replace function public.aportar_catalogo_producto()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_cod text; v_nuevo boolean;
begin
  begin
    v_cod := regexp_replace(coalesce(new.codigo_barras, ''), '\s', '', 'g');
    if new.deleted_at is not null or new.client_id is null or new.tipo <> 'producto'
       or not public.codigo_barras_valido(v_cod) or coalesce(trim(new.name), '') = '' then
      return new;
    end if;
    insert into public.catalogo_aportes (catalogo, clave, client_id)
    values ('producto', v_cod, new.client_id) on conflict do nothing;
    v_nuevo := found;
    insert into public.catalogo_productos (codigo_barras, nombre, marca, categoria, presentacion, unidad, confirmaciones)
    values (v_cod, left(trim(new.name), 160), nullif(trim(coalesce(new.marca, '')), ''),
            nullif(trim(coalesce(new.categoria, '')), ''),
            nullif(trim(coalesce(new.atributos ->> 'presentacion', '')), ''), new.unit, 1)
    on conflict (codigo_barras) do update
      set confirmaciones = public.catalogo_productos.confirmaciones + case when v_nuevo then 1 else 0 end,
          marca = coalesce(public.catalogo_productos.marca, excluded.marca),
          categoria = coalesce(public.catalogo_productos.categoria, excluded.categoria),
          presentacion = coalesce(public.catalogo_productos.presentacion, excluded.presentacion),
          updated_at = now();
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists productos_aporta_catalogo on public.inventory_products;
create trigger productos_aporta_catalogo
  after insert or update of name, codigo_barras, marca, categoria, deleted_at on public.inventory_products
  for each row execute function public.aportar_catalogo_producto();

revoke all on function public.aportar_catalogo_proveedor() from public, anon, authenticated;
revoke all on function public.aportar_catalogo_producto() from public, anon, authenticated;

-- ── Búsqueda ───────────────────────────────────────────────────────────────
create or replace function public.buscar_catalogo_producto(p_texto text, p_limite int default 5)
returns setof public.catalogo_productos
language sql stable security invoker set search_path = public, extensions
as $$
  select * from public.catalogo_productos
   where public.codigo_barras_valido(p_texto) and codigo_barras = regexp_replace(p_texto, '\s', '', 'g')
  union all
  (select * from public.catalogo_productos
    where not public.codigo_barras_valido(p_texto)
      and length(trim(coalesce(p_texto, ''))) >= 3
      and lower(nombre) % lower(trim(p_texto))
    order by similarity(lower(nombre), lower(trim(p_texto))) desc, confirmaciones desc
    limit least(greatest(p_limite, 1), 10));
$$;

create or replace function public.buscar_catalogo_proveedor(p_rif text)
returns setof public.catalogo_proveedores
language sql stable security invoker set search_path = public
as $$ select * from public.catalogo_proveedores where rif_normalizado = public.rif_normalizado(p_rif) $$;

grant execute on function public.buscar_catalogo_producto(text, int) to authenticated;
grant execute on function public.buscar_catalogo_proveedor(text) to authenticated;
grant execute on function public.rif_normalizado(text) to authenticated;
grant execute on function public.codigo_barras_valido(text) to authenticated;

-- ── Fotos de estudio del catálogo: bucket público de lectura; escribe el super admin ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogo', 'catalogo', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists catalogo_fotos_admin on storage.objects;
create policy catalogo_fotos_admin on storage.objects for all to authenticated
  using (bucket_id = 'catalogo' and public.get_current_user_role() = 'super_admin')
  with check (bucket_id = 'catalogo' and public.get_current_user_role() = 'super_admin');

-- ── Semilla desde los datos actuales (mismas reglas que los triggers) ───────
insert into public.catalogo_aportes (catalogo, clave, client_id)
select distinct 'proveedor', public.rif_normalizado(p.rif), p.client_id
  from public.proveedores p
 where p.deleted_at is null and p.client_id is not null
   and public.rif_normalizado(p.rif) ~ '^[JGC][0-9]{9}$' and coalesce(trim(p.nombre), '') <> ''
on conflict do nothing;

insert into public.catalogo_proveedores (rif_normalizado, rif, razon_social, tipo_persona, domicilio_fiscal, confirmaciones)
select r, left(r, 1) || '-' || substr(r, 2, 8) || '-' || right(r, 1),
       (array_agg(left(trim(p.nombre), 160) order by p.created_at))[1],
       case when left(r, 1) = 'G' then 'gobierno' else 'juridica' end,
       (array_agg(nullif(left(trim(coalesce(p.direccion, '')), 300), '') order by p.created_at) filter (where coalesce(trim(p.direccion), '') <> ''))[1],
       count(distinct p.client_id)
  from public.proveedores p, lateral (select public.rif_normalizado(p.rif) as r) x
 where p.deleted_at is null and p.client_id is not null
   and r ~ '^[JGC][0-9]{9}$' and coalesce(trim(p.nombre), '') <> ''
 group by r
on conflict (rif_normalizado) do nothing;

-- Linter de Supabase (function_search_path_mutable).
alter function public.rif_normalizado(text) set search_path = public;
alter function public.codigo_barras_valido(text) set search_path = public;
