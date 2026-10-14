-- Tasa de cambio vigente por negocio: automática (servicio externo basado en el BCV)
-- o manual (la escribe el cliente y NUNCA se actualiza sola).
-- Ver docs/mvp/diseno/tasas-de-cambio.md. Aditivo, sin FK.
alter table public.clients
  add column if not exists tasa_modo text not null default 'automatica',
  add column if not exists tasas_manuales jsonb not null default '{}'::jsonb,
  add column if not exists tasa_aviso_aceptado_en timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clients_tasa_modo_check') then
    alter table public.clients add constraint clients_tasa_modo_check check (tasa_modo in ('automatica', 'manual'));
  end if;
end $$;

comment on column public.clients.tasa_modo is 'automatica (servicio basado en el BCV) | manual (la define el cliente y la cambia él).';
comment on column public.clients.tasas_manuales is '{ "USD": { "tasa": 877.9, "fecha": "2026-10-14" }, "EUR": {...}, ... } en Bs por unidad.';
