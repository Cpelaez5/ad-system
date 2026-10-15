-- Historial de las tasas que el negocio define a mano (una por moneda y por día).
-- Las automáticas ya quedan en exchange_rates; cada factura además guarda las suyas.
-- Una sola FK (clients), regla del incidente de embeds del 2026-10-13.
create table if not exists public.tasas_historial (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  organization_id uuid not null,
  moneda text not null check (moneda in ('USD', 'EUR', 'CNY', 'TRY', 'RUB')),
  tasa numeric(18, 6) not null check (tasa > 0),
  fecha date not null,
  fuente text not null default 'manual' check (fuente in ('manual')),
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, moneda, fecha)
);
create index if not exists tasas_historial_client_fecha_idx on public.tasas_historial (client_id, fecha desc);
alter table public.tasas_historial enable row level security;

drop policy if exists tasas_historial_tenant on public.tasas_historial;
create policy tasas_historial_tenant on public.tasas_historial for all to authenticated
  using (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  )
  with check (
    organization_id = public.get_current_organization_id()
    and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id())
  );

-- Semilla: las tasas manuales que ya existan quedan como primer registro del historial.
insert into public.tasas_historial (client_id, organization_id, moneda, tasa, fecha)
select c.id, c.organization_id, m.key, (m.value ->> 'tasa')::numeric, coalesce((m.value ->> 'fecha')::date, current_date)
  from public.clients c, jsonb_each(coalesce(c.tasas_manuales, '{}'::jsonb)) m
 where m.key in ('USD', 'EUR', 'CNY', 'TRY', 'RUB')
   and (m.value ->> 'tasa') ~ '^[0-9]+(\.[0-9]+)?$' and (m.value ->> 'tasa')::numeric > 0
   and c.organization_id is not null
on conflict do nothing;
