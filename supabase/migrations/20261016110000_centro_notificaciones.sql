-- Centro de notificaciones (docs/mvp/diseno/centro-de-notificaciones.md).
-- REGLA DURA: NINGUNA llave foránea en estas tablas (un 2º camino users<->clients/organizations
-- rompe los embeds de PostgREST que usa el login). user_id es un uuid suelto.
-- Requiere en Vault: 'project_url' y 'cron_secret' (ya existen). pg_net y pg_cron ya están activos.

-- ─── Catálogo de eventos ────────────────────────────────────────────────────
create table if not exists public.notificacion_tipos (
  tipo text primary key,
  nombre text not null,
  descripcion text not null default '',
  para_rol text not null check (para_rol in ('cliente', 'super_admin', 'todos')),
  correo_def boolean not null default true,
  push_def boolean not null default true,
  activo boolean not null default false,
  orden integer not null default 0
);

insert into public.notificacion_tipos (tipo, nombre, descripcion, para_rol, correo_def, push_def, activo, orden) values
  ('soporte_respuesta', 'El equipo respondió tu consulta', 'Cuando el equipo de AD System te responde, con capturas incluidas.', 'cliente', true, true, true, 10),
  ('soporte_estado', 'Cambió el estado de tu consulta', 'Cuando tu consulta se resuelve o te están esperando.', 'cliente', true, true, true, 20),
  ('soporte_nueva', 'Un negocio abrió una consulta', 'Una consulta nueva para el equipo.', 'super_admin', true, true, true, 30),
  ('soporte_mensaje_cliente', 'Un negocio escribió en una consulta', 'El cliente respondió en una consulta abierta.', 'super_admin', true, true, true, 40),
  ('papel_por_vencer', 'Papeles por vencer', 'Un papel vence en 30, 7 o 1 días, o ya venció.', 'cliente', true, true, true, 50),
  ('pago_plan', 'Pagos de tu plan', 'Factura del plan por vencer, o pago aprobado o rechazado.', 'cliente', true, true, false, 60),
  ('pago_reportado', 'Un negocio reportó un pago', 'Hay un pago por revisar.', 'super_admin', true, true, false, 70),
  ('tasa_recordatorio', 'Recordatorio de tu tasa', 'De lunes a viernes, si no actualizaste la tasa.', 'cliente', false, true, false, 80),
  ('seniat_pendiente', 'SENIAT: algo por declarar', 'Hay una quincena o un mes listo para declarar.', 'cliente', true, true, false, 90),
  ('uso_ia', 'Uso de tu asistente', 'Usaste el 80 % o el 100 % del asistente del mes.', 'cliente', false, false, false, 100)
on conflict (tipo) do nothing;

alter table public.notificacion_tipos enable row level security;
drop policy if exists notificacion_tipos_select on public.notificacion_tipos;
create policy notificacion_tipos_select on public.notificacion_tipos for select to authenticated using (true);
drop policy if exists notificacion_tipos_update_superadmin on public.notificacion_tipos;
create policy notificacion_tipos_update_superadmin on public.notificacion_tipos for update to authenticated
  using (public.get_current_user_role() = 'super_admin') with check (public.get_current_user_role() = 'super_admin');
revoke all on public.notificacion_tipos from anon;
grant select on public.notificacion_tipos to authenticated;
grant update (nombre, descripcion, correo_def, push_def, activo, orden) on public.notificacion_tipos to authenticated;

-- ─── Bandeja ────────────────────────────────────────────────────────────────
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tipo text not null,
  titulo text not null,
  cuerpo text not null default '',
  url text,
  datos jsonb not null default '{}'::jsonb,
  agrupar text,
  leida_en timestamptz,
  push_enviado_en timestamptz,
  correo_enviado_en timestamptz,
  correo_omitido text,
  created_at timestamptz not null default now(),
  constraint notificaciones_url_interna check (url is null or (url like '/%' and url not like '//%'))
);
create index if not exists notificaciones_user_fecha_idx on public.notificaciones (user_id, created_at desc);
create index if not exists notificaciones_user_noleidas_idx on public.notificaciones (user_id) where leida_en is null;
create index if not exists notificaciones_agrupar_idx on public.notificaciones (user_id, agrupar) where agrupar is not null;
create index if not exists notificaciones_correo_pendiente_idx on public.notificaciones (created_at)
  where correo_enviado_en is null and correo_omitido is null and tipo like 'soporte\_%';

alter table public.notificaciones enable row level security;
drop policy if exists notificaciones_select_own on public.notificaciones;
create policy notificaciones_select_own on public.notificaciones for select to authenticated using (user_id = auth.uid());
drop policy if exists notificaciones_update_own on public.notificaciones;
create policy notificaciones_update_own on public.notificaciones for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notificaciones_delete_own on public.notificaciones;
create policy notificaciones_delete_own on public.notificaciones for delete to authenticated using (user_id = auth.uid());
-- Sin insert directo: solo notificar(). Lo único editable por la persona es marcar como leída.
revoke all on public.notificaciones from anon, authenticated;
grant select, delete on public.notificaciones to authenticated;
grant update (leida_en) on public.notificaciones to authenticated;

-- ─── Preferencias por evento ────────────────────────────────────────────────
create table if not exists public.preferencias_notificacion (
  user_id uuid not null,
  tipo text not null,
  correo boolean not null default true,
  push boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, tipo)
);
alter table public.preferencias_notificacion enable row level security;
drop policy if exists preferencias_notificacion_own on public.preferencias_notificacion;
create policy preferencias_notificacion_own on public.preferencias_notificacion for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.preferencias_notificacion from anon;
grant select, insert, update, delete on public.preferencias_notificacion to authenticated;

-- Tiempo real de la campanita (respeta la RLS).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notificaciones') then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

-- ─── notificar(): el ÚNICO lugar donde se crean avisos ──────────────────────
create or replace function public.notificar(
  p_user_ids uuid[], p_tipo text, p_titulo text, p_cuerpo text, p_url text,
  p_datos jsonb default '{}'::jsonb, p_agrupar text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return 0; end if;
  insert into public.notificaciones (user_id, tipo, titulo, cuerpo, url, datos, agrupar)
  select distinct u, p_tipo, left(p_titulo, 200), left(coalesce(p_cuerpo, ''), 500),
         case when p_url like '/%' and p_url not like '//%' then p_url else null end,
         coalesce(p_datos, '{}'::jsonb), p_agrupar
    from unnest(p_user_ids) as u
   where u is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.notificar(uuid[], text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.notificar(uuid[], text, text, text, text, jsonb, text) to service_role;

-- ─── Despacho: AFTER INSERT -> pg_net -> Edge Function ──────────────────────
-- A nivel de SENTENCIA con tabla de transición: notificar() a varios super admins inserta N filas
-- en una sola sentencia y sale UNA sola llamada HTTP con todos los ids (en vez de N). Nunca bloquea el insert.
create or replace function public.notificaciones_despachar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_ids uuid[];
begin
  begin
    select array_agg(id) into v_ids from filas_nuevas;
    if v_ids is null then return null; end if;
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/despachar-notificacion',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
      ),
      body := jsonb_build_object('ids', to_jsonb(v_ids)),
      timeout_milliseconds := 10000
    );
  exception when others then
    raise warning 'notificaciones_despachar: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function public.notificaciones_despachar() from public, anon, authenticated;

drop trigger if exists notificaciones_despacho on public.notificaciones;
create trigger notificaciones_despacho after insert on public.notificaciones
  referencing new table as filas_nuevas
  for each statement execute function public.notificaciones_despachar();

-- ─── Marcar como leídas (solo las de quien llama) ───────────────────────────
-- Sin parámetros: todas. p_ids: esas. p_agrupar: las de esa consulta/grupo ('soporte:<id>').
create or replace function public.marcar_notificaciones_leidas(p_ids uuid[] default null, p_agrupar text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_n integer;
begin
  if auth.uid() is null then return 0; end if;
  update public.notificaciones
     set leida_en = now()
   where user_id = auth.uid()
     and leida_en is null
     and (p_ids is null or id = any (p_ids))
     and (p_agrupar is null or agrupar = p_agrupar);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.marcar_notificaciones_leidas(uuid[], text) from public, anon;
grant execute on function public.marcar_notificaciones_leidas(uuid[], text) to authenticated, service_role;

-- ─── Soporte: reemplaza el push directo por notificar() ─────────────────────
-- Estas funciones nunca bloquean el insert/update original (bloque con exception).
drop trigger if exists support_messages_push on public.support_messages;
drop function if exists public.soporte_push_mensaje();

create or replace function public.soporte_numero_ticket(p_n bigint)
returns text language sql immutable as $$
  select case when p_n is null then '' else 'AD-' || lpad(p_n::text, 4, '0') end;
$$;

create or replace function public.soporte_notificar_mensaje()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
  v_admins uuid[];
  v_negocio text;
  v_ticket text;
  v_cuerpo text;
  v_adjuntos integer := 0;
  v_es_primero boolean;
  v_tema text;
begin
  begin
    select c.id, c.user_id, c.mode, c.ticket_numero, c.categoria into v_conv
      from public.support_conversations c where c.id = new.conversation_id;
    if v_conv.id is null then return new; end if;
    v_ticket := public.soporte_numero_ticket(v_conv.ticket_numero);
    if jsonb_typeof(new.adjuntos) = 'array' then v_adjuntos := jsonb_array_length(new.adjuntos); end if;
    v_cuerpo := left(coalesce(nullif(btrim(new.content), ''),
                 case when v_adjuntos > 0 then 'Te enviaron una imagen' else 'Mensaje nuevo' end), 300);

    if new.role = 'agent' and not coalesce(new.interno, false) then
      if v_conv.user_id is not null then
        perform public.notificar(
          array[v_conv.user_id], 'soporte_respuesta',
          'Te respondió el equipo de AD System' || case when v_ticket <> '' then ' · Consulta #' || v_ticket else '' end,
          v_cuerpo,
          '/cliente/inicio?soporte=' || v_conv.id::text,
          jsonb_build_object('conversation_id', v_conv.id, 'ticket', v_ticket, 'adjuntos', v_adjuntos),
          'soporte:' || v_conv.id::text);
      end if;

    elsif new.role = 'user' and not coalesce(new.interno, false)
          and (v_conv.mode = 'human' or v_conv.ticket_numero is not null) then
      select coalesce(array_agg(u.id), '{}') into v_admins from public.users u where u.role = 'super_admin';
      -- ¿Es el primer mensaje del cliente en el ticket (la consulta recién nació)?
      select not exists (
        select 1 from public.support_messages m
         where m.conversation_id = new.conversation_id and m.role = 'user' and m.id <> new.id
           and m.metadata->>'tipo' = 'ticket'
      ) into v_es_primero;
      select coalesce(cl.company_name, '') into v_negocio
        from public.users u left join public.clients cl on cl.id = u.client_id
       where u.id = v_conv.user_id;
      v_tema := case v_conv.categoria when 'pagos' then 'Pagos y mi plan' when 'error' then 'Algo no funciona'
                  when 'fiscal' then 'Duda fiscal o contable' when 'otra' then 'Otra' else null end;
      if v_es_primero then
        perform public.notificar(
          v_admins, 'soporte_nueva',
          'Nueva consulta #' || v_ticket || coalesce(' · ' || v_tema, '') || coalesce(' · ' || nullif(v_negocio, ''), ''),
          v_cuerpo,
          '/admin/soporte?c=' || v_conv.id::text,
          jsonb_build_object('conversation_id', v_conv.id, 'ticket', v_ticket, 'negocio', v_negocio, 'adjuntos', v_adjuntos),
          'soporte:' || v_conv.id::text);
      else
        perform public.notificar(
          v_admins, 'soporte_mensaje_cliente',
          'Nuevo mensaje en la consulta #' || v_ticket || coalesce(' · ' || nullif(v_negocio, ''), ''),
          v_cuerpo,
          '/admin/soporte?c=' || v_conv.id::text,
          jsonb_build_object('conversation_id', v_conv.id, 'ticket', v_ticket, 'negocio', v_negocio, 'adjuntos', v_adjuntos),
          'soporte:' || v_conv.id::text);
      end if;
    end if;
  exception when others then
    raise warning 'soporte_notificar_mensaje: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.soporte_notificar_mensaje() from public, anon, authenticated;

-- Se llama "support_messages_push" (mismo nombre que el anterior): dispara DESPUÉS de support_messages_despues
-- (orden alfabético), así el ticket ya tiene número y estado.
create trigger support_messages_push after insert on public.support_messages
  for each row execute function public.soporte_notificar_mensaje();

-- Cambio de estado de la consulta -> avisa al dueño (resuelto / esperando_cliente).
create or replace function public.soporte_notificar_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_ticket text;
begin
  begin
    if new.user_id is null or new.estado_ticket is not distinct from old.estado_ticket then return new; end if;
    if new.estado_ticket not in ('resuelto', 'esperando_cliente') then return new; end if;
    -- Si el cambio lo causó una respuesta del equipo (sube no_leidos_cliente), ya sale "soporte_respuesta".
    if new.estado_ticket = 'esperando_cliente' and new.no_leidos_cliente > old.no_leidos_cliente then return new; end if;
    -- Si la persona misma la marcó resuelta, no se le avisa de lo que acaba de hacer.
    if new.estado_ticket = 'resuelto' and auth.uid() is not null and auth.uid() = new.user_id then return new; end if;
    v_ticket := public.soporte_numero_ticket(new.ticket_numero);
    perform public.notificar(
      array[new.user_id], 'soporte_estado',
      case new.estado_ticket
        when 'resuelto' then 'Tu consulta #' || v_ticket || ' quedó resuelta'
        else 'Te esperamos en la consulta #' || v_ticket end,
      case new.estado_ticket
        when 'resuelto' then 'Si todavía necesitas ayuda, escríbenos de nuevo en la misma consulta.'
        else 'El equipo necesita tu respuesta para seguir ayudándote.' end,
      '/cliente/inicio?soporte=' || new.id::text,
      jsonb_build_object('conversation_id', new.id, 'ticket', v_ticket, 'estado', new.estado_ticket),
      'soporte:' || new.id::text);
  exception when others then
    raise warning 'soporte_notificar_estado: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.soporte_notificar_estado() from public, anon, authenticated;

drop trigger if exists support_conversations_estado_aviso on public.support_conversations;
create trigger support_conversations_estado_aviso after update of estado_ticket on public.support_conversations
  for each row execute function public.soporte_notificar_estado();

-- ─── Cron ───────────────────────────────────────────────────────────────────
-- Cada minuto: correos de soporte pendientes (agrupados, con 2 minutos de espera).
select cron.schedule(
  'notificaciones-correos-pendientes',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/despachar-notificacion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"modo":"correos_pendientes"}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Domingos 07:00 UTC: borra las leídas de más de 90 días.
select cron.schedule(
  'notificaciones-limpieza-semanal',
  '0 7 * * 0',
  $$ delete from public.notificaciones where leida_en is not null and leida_en < now() - interval '90 days'; $$
);
