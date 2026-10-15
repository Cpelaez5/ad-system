-- Uso de IA por negocio (docs/mvp/diseno/uso-ia-por-cliente.md), fase 1: medir y mostrar.
-- El cliente nunca ve "tokens" ni "créditos": la app muestra un porcentaje y acciones
-- en palabras ("Leíste 12 facturas con foto"). Los créditos son la unidad interna.
-- Sin FK nuevas (regla de embeds).

alter table public.ai_usage_logs
  add column if not exists client_id uuid,
  add column if not exists accion text,
  add column if not exists creditos numeric(8, 2) not null default 0;
create index if not exists ai_usage_logs_client_mes_idx on public.ai_usage_logs (client_id, created_at) where client_id is not null;

-- Tarifas por acción (las edita el super admin).
create table if not exists public.ia_tarifas (
  accion text primary key,
  creditos numeric(8, 2) not null check (creditos >= 0),
  descripcion text not null
);
alter table public.ia_tarifas enable row level security;
drop policy if exists ia_tarifas_leer on public.ia_tarifas;
create policy ia_tarifas_leer on public.ia_tarifas for select to authenticated using (true);
drop policy if exists ia_tarifas_admin on public.ia_tarifas;
create policy ia_tarifas_admin on public.ia_tarifas for all to authenticated
  using (public.get_current_user_role() = 'super_admin') with check (public.get_current_user_role() = 'super_admin');
insert into public.ia_tarifas (accion, creditos, descripcion) values
  ('ocr', 1, 'Leer una factura con foto'),
  ('identificar', 1, 'Reconocer un producto con foto'),
  ('estante', 2, 'Foto del estante'),
  ('mejorar', 3, 'Mejorar una foto'),
  ('documento', 1, 'Llenar un formulario con un documento'),
  ('chat', 0.2, 'Pregunta al asistente')
on conflict (accion) do nothing;

-- Tope mensual por plan y extras por negocio.
alter table public.subscription_plans add column if not exists creditos_ia_mes integer not null default 100;
alter table public.plans add column if not exists creditos_ia_mes integer not null default 30;
alter table public.clients add column if not exists creditos_ia_extra integer not null default 0;

-- Al guardar cada uso: negocio, acción (si la función no la dice, se deduce) y créditos.
create or replace function public.ia_uso_antes_de_insertar()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.client_id is null and new.user_id is not null then
    select u.client_id into new.client_id from public.users u where u.id = new.user_id;
  end if;
  if new.accion is null then
    new.accion := case
      when new.model ilike '%image%' then 'mejorar'
      when new.comprobante_id is not null or new.moneda_detectada is not null then 'ocr'
      else 'chat' end;
  end if;
  new.creditos := case when new.status = 'success'
    then coalesce((select t.creditos from public.ia_tarifas t where t.accion = new.accion), 1) else 0 end;
  return new;
end;
$$;
revoke all on function public.ia_uso_antes_de_insertar() from public, anon, authenticated;
drop trigger if exists ai_usage_logs_antes on public.ai_usage_logs;
create trigger ai_usage_logs_antes before insert on public.ai_usage_logs
  for each row execute function public.ia_uso_antes_de_insertar();

-- Completar los registros existentes.
update public.ai_usage_logs l set client_id = u.client_id
  from public.users u where l.client_id is null and u.id = l.user_id;
update public.ai_usage_logs set accion = case
    when model ilike '%image%' then 'mejorar'
    when comprobante_id is not null or moneda_detectada is not null then 'ocr'
    else 'chat' end
  where accion is null;
update public.ai_usage_logs l set creditos = case when l.status = 'success'
    then coalesce((select t.creditos from public.ia_tarifas t where t.accion = l.accion), 1) else 0 end;

-- Uso del mes (calendario de Caracas). El cliente solo consulta el suyo; el staff de su
-- organización y el super admin, el del negocio que indiquen.
create or replace function public.uso_ia_mes(p_client_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  v_rol text := public.get_current_user_role();
  v_client uuid;
  v_inicio timestamptz := date_trunc('month', now() at time zone 'America/Caracas') at time zone 'America/Caracas';
  v_plan text;
  v_limite numeric;
  v_usados numeric;
  v_por_accion jsonb;
begin
  if v_rol = 'cliente' then
    v_client := public.get_current_user_client_id();
  elsif v_rol in ('admin', 'contador', 'super_admin') then
    v_client := p_client_id;
    if v_rol <> 'super_admin' and not exists (
      select 1 from public.clients c where c.id = v_client and c.organization_id = public.get_current_organization_id()) then
      return null;
    end if;
  end if;
  if v_client is null then return null; end if;

  select u.plan_id into v_plan from public.users u
   where u.client_id = v_client and u.role = 'cliente' order by u.created_at limit 1;
  v_limite := coalesce(
    (select s.creditos_ia_mes from public.subscription_plans s where s.id::text = v_plan),
    (select p.creditos_ia_mes from public.plans p where p.id::text = v_plan),
    30) + coalesce((select c.creditos_ia_extra from public.clients c where c.id = v_client), 0);

  select coalesce(sum(l.creditos), 0) into v_usados from public.ai_usage_logs l
   where l.client_id = v_client and l.created_at >= v_inicio and l.status = 'success';
  select coalesce(jsonb_object_agg(accion, n), '{}'::jsonb) into v_por_accion from (
    select l.accion, count(*) n from public.ai_usage_logs l
     where l.client_id = v_client and l.created_at >= v_inicio and l.status = 'success' group by l.accion) x;

  return jsonb_build_object(
    'usados', v_usados,
    'limite', v_limite,
    'porcentaje', case when v_limite > 0 then least(100, round(v_usados * 100 / v_limite)) else 0 end,
    'por_accion', v_por_accion,
    'renueva', (date_trunc('month', now() at time zone 'America/Caracas') + interval '1 month')::date
  );
end;
$$;
revoke all on function public.uso_ia_mes(uuid) from public, anon;
grant execute on function public.uso_ia_mes(uuid) to authenticated;

-- Topes iniciales PROVISIONALES por plan (los decide el dueño; editables por el super admin).
update public.subscription_plans set creditos_ia_mes = case name
  when 'AD Solo Pro' then 100
  when 'AD Visionary' then 200
  when 'AD Business Momentum' then 300
  when 'AD Enterprise Hub' then 600
  when 'AD Corporate Nexus' then 1000
  else creditos_ia_mes end;
update public.plans set creditos_ia_mes = 30 where id::text = 'free_trial';
