-- Soporte con tickets en el mismo chat (docs/mvp/diseno/soporte-y-tickets.md).
-- Reutiliza support_conversations / support_messages. Sin FK nuevas.

create sequence if not exists public.support_ticket_seq start 1;

alter table public.support_conversations
  add column if not exists ticket_numero bigint,
  add column if not exists categoria text check (categoria in ('pagos', 'error', 'fiscal', 'otra')),
  add column if not exists prioridad text not null default 'normal' check (prioridad in ('baja', 'normal', 'alta')),
  add column if not exists asignado_a uuid,
  add column if not exists estado_ticket text check (estado_ticket in ('nuevo', 'en_curso', 'esperando_cliente', 'resuelto')),
  add column if not exists ultimo_mensaje_en timestamptz,
  add column if not exists no_leidos_cliente integer not null default 0,
  add column if not exists no_leidos_equipo integer not null default 0,
  add column if not exists resuelto_en timestamptz,
  add column if not exists calificacion smallint check (calificacion in (-1, 1));
create unique index if not exists support_conversations_ticket_numero_key on public.support_conversations (ticket_numero) where ticket_numero is not null;
create index if not exists support_conversations_estado_idx on public.support_conversations (estado_ticket, ultimo_mensaje_en) where mode = 'human';

alter table public.support_messages add column if not exists interno boolean not null default false;

-- Al pasar a "humano" la conversación recibe número de ticket y estado "nuevo".
-- El cliente no puede cambiarse asignación ni prioridad (solo el super admin).
create or replace function public.soporte_antes_de_actualizar()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_es_admin boolean := public.get_current_user_role() = 'super_admin';
begin
  if new.mode = 'human' and new.ticket_numero is null then
    new.ticket_numero := nextval('public.support_ticket_seq');
    new.estado_ticket := coalesce(new.estado_ticket, 'nuevo');
    new.status := 'waiting_agent';
  end if;
  if tg_op = 'UPDATE' then
    if not v_es_admin and auth.uid() is not null then
      new.asignado_a := old.asignado_a;
      new.prioridad := old.prioridad;
      new.no_leidos_equipo := old.no_leidos_equipo;
    end if;
    if new.estado_ticket = 'resuelto' and old.estado_ticket is distinct from 'resuelto' then
      new.resuelto_en := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists support_conversations_antes on public.support_conversations;
create trigger support_conversations_antes before insert or update on public.support_conversations
  for each row execute function public.soporte_antes_de_actualizar();

-- Cada mensaje actualiza la fecha del último mensaje y los no leídos del otro lado.
create or replace function public.soporte_despues_de_mensaje()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.support_conversations c
     set ultimo_mensaje_en = new.created_at,
         no_leidos_equipo = case when new.role = 'user' and c.mode = 'human' then c.no_leidos_equipo + 1 else c.no_leidos_equipo end,
         no_leidos_cliente = case when new.role = 'agent' and not new.interno then c.no_leidos_cliente + 1 else c.no_leidos_cliente end,
         estado_ticket = case
           when c.mode <> 'human' then c.estado_ticket
           when new.role = 'agent' and not new.interno and c.estado_ticket in ('nuevo', 'en_curso') then 'esperando_cliente'
           when new.role = 'user' and c.estado_ticket in ('esperando_cliente', 'resuelto') then 'en_curso'
           else c.estado_ticket end
   where c.id = new.conversation_id;
  return new;
end;
$$;
drop trigger if exists support_messages_despues on public.support_messages;
create trigger support_messages_despues after insert on public.support_messages
  for each row execute function public.soporte_despues_de_mensaje();
revoke all on function public.soporte_antes_de_actualizar() from public, anon, authenticated;
revoke all on function public.soporte_despues_de_mensaje() from public, anon, authenticated;

-- SEGURIDAD: el cliente solo escribe como 'user' o 'assistant' (el chat guarda la respuesta
-- de la IA desde el navegador), nunca como 'agent'/'system' ni notas internas; y nunca lee notas internas.
drop policy if exists support_messages_insert_own on public.support_messages;
create policy support_messages_insert_own on public.support_messages for insert to authenticated
  with check (
    role in ('user', 'assistant') and not interno
    and exists (select 1 from public.support_conversations sc where sc.id = support_messages.conversation_id and sc.user_id = auth.uid())
  );
drop policy if exists support_messages_select_own on public.support_messages;
create policy support_messages_select_own on public.support_messages for select to authenticated
  using (
    not interno
    and exists (select 1 from public.support_conversations sc where sc.id = support_messages.conversation_id and sc.user_id = auth.uid())
  );

-- El equipo (super admin) actualiza estado, asignación y prioridad.
drop policy if exists support_conversations_update_superadmin on public.support_conversations;
create policy support_conversations_update_superadmin on public.support_conversations for update to authenticated
  using (public.get_current_user_role() = 'super_admin')
  with check (public.get_current_user_role() = 'super_admin');

-- Tiempo real para el chat y la bandeja (respeta la RLS).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_messages') then
    alter publication supabase_realtime add table public.support_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'support_conversations') then
    alter publication supabase_realtime add table public.support_conversations;
  end if;
end $$;
