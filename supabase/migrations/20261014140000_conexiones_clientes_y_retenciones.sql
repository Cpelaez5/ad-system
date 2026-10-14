-- Conexiones entre módulos (auditoría docs/mvp/auditoria/conexiones-modulos-2026-10-14.md):
--  1. Mis clientes: tabla clientes_negocio (a quién le vende cada negocio).
--  2. Vínculo directo factura ↔ cliente y factura ↔ proveedor (sin FK, ver regla abajo).
--  3. Retenciones sincronizadas con la factura: papelera o anulación ⇒ comprobante anulado.
-- REGLA (incidente del 2026-10-13): las columnas nuevas de invoices NO llevan FK. Una FK
-- haría que invoices pareciera tabla puente entre clients y clientes_negocio/proveedores,
-- y los embeds de PostgREST se volverían ambiguos.

-- ── 1. Clientes del negocio ────────────────────────────────────────────────
create table if not exists public.clientes_negocio (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  tipo_persona text not null default 'natural' check (tipo_persona in ('natural', 'juridica')),
  nombre text not null,
  rif text,
  telefono text,
  correo text,
  direccion text,
  es_contribuyente_especial boolean not null default false,
  notas text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clientes_negocio_client_idx on public.clientes_negocio (client_id) where deleted_at is null;
create unique index if not exists clientes_negocio_client_rif_unico
  on public.clientes_negocio (client_id, public.rif_normalizado(rif))
  where deleted_at is null and public.rif_normalizado(rif) ~ '^[VEJPGC][0-9]{9}$';

alter table public.clientes_negocio enable row level security;
drop policy if exists clientes_negocio_tenant on public.clientes_negocio;
create policy clientes_negocio_tenant on public.clientes_negocio for all to authenticated
  using (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  )
  with check (
    organization_id = public.get_current_organization_id()
    and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id())
  );

-- ── 2. Vínculos directos en la factura (sin FK) ─────────────────────────────
alter table public.invoices
  add column if not exists cliente_negocio_id uuid,
  add column if not exists proveedor_id uuid;
create index if not exists invoices_cliente_negocio_idx on public.invoices (cliente_negocio_id) where cliente_negocio_id is not null;
create index if not exists invoices_proveedor_idx on public.invoices (proveedor_id) where proveedor_id is not null;
comment on column public.invoices.cliente_negocio_id is 'Venta: clientes_negocio.id (sin FK a propósito). client_info se mantiene para PDF y libros.';
comment on column public.invoices.proveedor_id is 'Compra: proveedores.id (sin FK a propósito). issuer se mantiene para PDF y libros.';

-- Backfill de proveedores: por issuer.id si existe en el mismo negocio; si no, por RIF normalizado.
update public.invoices i
   set proveedor_id = p.id
  from public.proveedores p
 where i.flow = 'COMPRA' and i.proveedor_id is null and p.deleted_at is null
   and p.client_id = i.client_id
   and (p.id::text = i.issuer ->> 'id'
        or (public.rif_normalizado(p.rif) ~ '^[VEJPGC][0-9]{9}$'
            and public.rif_normalizado(p.rif) = public.rif_normalizado(i.issuer ->> 'rif')));

-- Backfill de clientes: uno por (negocio, RIF válido) y, sin RIF, por (negocio, nombre normalizado).
insert into public.clientes_negocio (client_id, organization_id, tipo_persona, nombre, rif, telefono, correo, direccion)
select distinct on (i.client_id, clave)
       i.client_id, i.organization_id,
       case when left(public.rif_normalizado(i.client_info ->> 'rif'), 1) in ('J', 'G', 'C') then 'juridica' else 'natural' end,
       left(trim(i.client_info ->> 'companyName'), 160),
       nullif(trim(i.client_info ->> 'rif'), ''),
       nullif(trim(i.client_info ->> 'phone'), ''),
       nullif(trim(i.client_info ->> 'email'), ''),
       nullif(left(trim(i.client_info ->> 'address'), 300), '')
  from public.invoices i,
       lateral (select case when public.rif_normalizado(i.client_info ->> 'rif') ~ '^[VEJPGC][0-9]{9}$'
                            then 'rif:' || public.rif_normalizado(i.client_info ->> 'rif')
                            else 'nom:' || lower(trim(i.client_info ->> 'companyName')) end as clave) k
 where i.flow = 'VENTA' and i.client_id is not null
   and coalesce(trim(i.client_info ->> 'companyName'), '') <> ''
   and lower(trim(i.client_info ->> 'companyName')) not in ('consumidor final', 'cliente final', 'contado')
 order by i.client_id, clave, i.issue_date desc nulls last, i.created_at desc
on conflict do nothing;

update public.invoices i
   set cliente_negocio_id = c.id
  from public.clientes_negocio c
 where i.flow = 'VENTA' and i.cliente_negocio_id is null and c.client_id = i.client_id and c.deleted_at is null
   and (
     (public.rif_normalizado(c.rif) ~ '^[VEJPGC][0-9]{9}$' and public.rif_normalizado(c.rif) = public.rif_normalizado(i.client_info ->> 'rif'))
     or (not (public.rif_normalizado(i.client_info ->> 'rif') ~ '^[VEJPGC][0-9]{9}$')
         and not (public.rif_normalizado(c.rif) ~ '^[VEJPGC][0-9]{9}$')
         and lower(trim(c.nombre)) = lower(trim(i.client_info ->> 'companyName')))
   );

-- ── 3. Retenciones sincronizadas con su factura ─────────────────────────────
-- Un comprobante emitido NO se reutiliza (regla SENIAT): al anular o mandar a la papelera
-- la factura, sus retenciones quedan anuladas con motivo; al restaurar desde la papelera,
-- vuelven. El correlativo no se libera.
create or replace function public.sincronizar_retenciones_factura()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_anulada_antes boolean := upper(coalesce(old.status, '')) = 'ANULADA';
  v_anulada_ahora boolean := upper(coalesce(new.status, '')) = 'ANULADA';
begin
  if (new.deleted_at is not null and old.deleted_at is null) then
    update public.retenciones set deleted_at = now(), corregido_en = now(), corregido_motivo = 'Factura enviada a la papelera'
     where invoice_id = new.id and deleted_at is null;
  elsif (v_anulada_ahora and not v_anulada_antes) then
    update public.retenciones set deleted_at = now(), corregido_en = now(), corregido_motivo = 'Factura anulada'
     where invoice_id = new.id and deleted_at is null;
  elsif (new.deleted_at is null and old.deleted_at is not null and not v_anulada_ahora) then
    update public.retenciones set deleted_at = null, corregido_en = now(), corregido_motivo = 'Factura restaurada de la papelera'
     where invoice_id = new.id and corregido_motivo = 'Factura enviada a la papelera';
  end if;
  return new;
end;
$$;
revoke all on function public.sincronizar_retenciones_factura() from public, anon, authenticated;

drop trigger if exists invoices_sincroniza_retenciones on public.invoices;
create trigger invoices_sincroniza_retenciones
  after update of deleted_at, status on public.invoices
  for each row execute function public.sincronizar_retenciones_factura();

-- Retenciones que ya quedaron huérfanas (facturas en papelera o anuladas).
update public.retenciones r
   set deleted_at = now(), corregido_en = now(),
       corregido_motivo = case when i.deleted_at is not null then 'Factura enviada a la papelera' else 'Factura anulada' end
  from public.invoices i
 where i.id = r.invoice_id and r.deleted_at is null
   and (i.deleted_at is not null or upper(i.status) = 'ANULADA');
