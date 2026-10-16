-- "SENIAT del mes" (docs/mvp/diseno/seniat-del-mes.md).
--  1. declaraciones_seniat: qué se descargó / declaró por período (IVA por quincena, ISLR y libros por mes).
--  2. conceptos_islr.codigo_seniat: código OFICIAL del SENIAT para el XML de ISLR.

-- ── 1. Declaraciones ─────────────────────────────────────────────────────────
-- REGLA (incidente del 2026-10-13, ver 20261014140000_conexiones_clientes_y_retenciones.sql):
-- esta tabla NO lleva NINGUNA llave foránea. Una FK a clients y otra a users haría que
-- declaraciones_seniat pareciera una ruta más entre users y clients, y los embeds de
-- PostgREST del login (users → clients / organizations) se volverían ambiguos.
-- client_id, organization_id y actualizado_por son uuid "sueltos"; la integridad la dan la RLS.
create table if not exists public.declaraciones_seniat (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  organization_id uuid not null,
  tipo text not null check (tipo in ('IVA', 'ISLR', 'LIBRO_COMPRAS', 'LIBRO_VENTAS')),
  periodo text not null check (periodo ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
  quincena smallint check (quincena in (1, 2)),
  estado text not null default 'descargada' check (estado in ('descargada', 'declarada')),
  descargada_en timestamptz,
  declarada_en timestamptz,
  numero_planilla text,
  lineas integer not null default 0,
  monto_total numeric(18, 2) not null default 0,
  actualizado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- IVA va por quincena; el resto es mensual (sin quincena).
  constraint declaraciones_seniat_quincena_ck check ((tipo = 'IVA') = (quincena is not null))
);

-- Única por (negocio, tipo, período, quincena); quincena null cuenta como un solo valor.
create unique index if not exists declaraciones_seniat_unica
  on public.declaraciones_seniat (client_id, tipo, periodo, coalesce(quincena, 0));
create index if not exists declaraciones_seniat_org_idx on public.declaraciones_seniat (organization_id, periodo);

create or replace function public.declaraciones_seniat_toca()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null then new.actualizado_por := auth.uid(); end if;
  return new;
end;
$$;
drop trigger if exists declaraciones_seniat_toca on public.declaraciones_seniat;
create trigger declaraciones_seniat_toca before insert or update on public.declaraciones_seniat
  for each row execute function public.declaraciones_seniat_toca();

alter table public.declaraciones_seniat enable row level security;
-- El cliente gestiona las suyas; admin y contador las de su organización; super_admin todas.
drop policy if exists declaraciones_seniat_tenant on public.declaraciones_seniat;
create policy declaraciones_seniat_tenant on public.declaraciones_seniat for all to authenticated
  using (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  )
  with check (
    public.get_current_user_role() = 'super_admin'
    or (organization_id = public.get_current_organization_id()
        and (public.get_current_user_role() in ('admin', 'contador') or client_id = public.get_current_user_client_id()))
  );

-- ── 2. Código oficial del SENIAT para cada concepto de ISLR ─────────────────
-- conceptos_islr.codigo es una numeración INTERNA (y los catálogos sembrados antes se
-- contradicen entre sí: p. ej. '011' es "Arrendamiento" en una carga y "Comisiones" en otra),
-- así que NO sirve como código del XML. codigo_seniat es el que se escribe en <CodigoConcepto>.
grant select, insert, update on public.declaraciones_seniat to authenticated;
comment on table public.declaraciones_seniat is 'SENIAT del mes: estado por obligación y período. SIN FK a propósito (una FK a clients y otra a users crearía otra ruta users<->clients y rompe los embeds del login).';

alter table public.conceptos_islr add column if not exists codigo_seniat text;
comment on column public.conceptos_islr.codigo_seniat is
  'Código oficial del SENIAT para el XML de retenciones de ISLR (<CodigoConcepto>). NULL = sin verificar: la revisión de "SENIAT del mes" lo marca como problema del equipo.';

-- POR VERIFICAR por la contadora.
-- Intento de investigación (2026-10-16): la tabla oficial de códigos del XML no se pudo confirmar
-- en una fuente primaria; solo se encontró la tabla de porcentajes del Decreto 1.808, art. 9
-- (https://www.forvismazars.com/ve/es/insights/forvis-mazars-insights/tabla-de-retenciones-islr-ut-9-00-bs-may-2023)
-- cuya numeración de conceptos no es necesariamente la del XML, y un manual de software contable
-- (https://store.galac.com/wp-content/uploads/2021/01/Modulos-e-informes_RET.pdf) que solo dice que genera el XML.
-- Como no hay una coincidencia inequívoca, NINGÚN concepto se llena aquí: todos quedan en NULL
-- y el super_admin los carga desde "Verificar/editar códigos SENIAT de conceptos ISLR"
-- (docs/mvp/super-admin-pendientes.md). Plantilla para cuando la contadora confirme la tabla:
--   update public.conceptos_islr set codigo_seniat = '<codigo>' where nombre = '<nombre exacto>';
