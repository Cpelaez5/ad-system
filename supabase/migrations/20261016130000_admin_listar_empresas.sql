-- Super admin → Empresas: lista de negocios con plan, estado, actividad y uso.
-- Una sola RPC (sin embeds: un 2º camino users<->clients rompe el login) y solo para super_admin.
create or replace function public.admin_listar_empresas()
returns table (
  id uuid,
  nombre text,
  rif text,
  rubro text,
  correo text,
  telefono text,
  creada_en timestamptz,
  plan_nombre text,
  suscripcion_estado text,
  proximo_cobro date,
  prueba_hasta timestamptz,
  facturas_pendientes integer,
  deuda_vencida_desde date,
  ultimo_movimiento timestamptz,
  registros_mes integer,
  usuarios integer,
  ultimo_ingreso timestamptz,
  creditos_ia_mes numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.get_current_user_role() is distinct from 'super_admin' then
    raise exception using errcode = '42501', message = 'Solo el super admin puede ver la lista de empresas.';
  end if;

  return query
  with suscripcion as (
    select distinct on (cs.client_id) cs.client_id, cs.status, cs.next_billing_date, sp.name as plan_nombre
      from public.client_subscriptions cs
      left join public.subscription_plans sp on sp.id = cs.plan_id
     order by cs.client_id, cs.created_at desc
  ),
  facturas as (
    select si.client_id,
           count(*) filter (where si.status in ('pending', 'overdue'))::integer as pendientes,
           min(si.due_date) filter (where si.status in ('pending', 'overdue') and si.due_date < current_date) as vencida_desde
      from public.system_invoices si
     group by si.client_id
  ),
  movimientos as (
    select i.client_id,
           max(i.created_at) as ultimo,
           count(*) filter (where i.created_at >= date_trunc('month', now()))::integer as mes
      from public.invoices i
     where i.deleted_at is null
     group by i.client_id
  ),
  personas as (
    select u.client_id,
           count(*)::integer as cantidad,
           max(u.last_login) as ultimo_ingreso,
           max(u.trial_end) as prueba_hasta,
           max(pl.name) as plan_usuario
      from public.users u
      left join public.plans pl on pl.id = u.plan_id
     where u.client_id is not null
     group by u.client_id
  ),
  ia as (
    select l.client_id, coalesce(sum(l.creditos), 0) as creditos
      from public.ai_usage_logs l
     where l.created_at >= date_trunc('month', now()) and l.client_id is not null
     group by l.client_id
  )
  select c.id, c.company_name, c.rif, c.rubro, c.email, c.phone, c.created_at::timestamptz,
         coalesce(s.plan_nombre, p.plan_usuario)::text, s.status::text, s.next_billing_date::date,
         p.prueba_hasta::timestamptz,
         coalesce(f.pendientes, 0), f.vencida_desde::date,
         m.ultimo::timestamptz, coalesce(m.mes, 0),
         coalesce(p.cantidad, 0), p.ultimo_ingreso::timestamptz,
         coalesce(a.creditos, 0)::numeric
    from public.clients c
    left join suscripcion s on s.client_id = c.id
    left join facturas f on f.client_id = c.id
    left join movimientos m on m.client_id = c.id
    left join personas p on p.client_id = c.id
    left join ia a on a.client_id = c.id
   order by coalesce(m.ultimo, c.created_at) desc nulls last;
end;
$$;
revoke all on function public.admin_listar_empresas() from public, anon;
grant execute on function public.admin_listar_empresas() to authenticated;
