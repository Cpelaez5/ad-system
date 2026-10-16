-- Notificaciones push (Web Push). Doc: docs/mvp/diseno/notificaciones-push.md
-- Sin FK nuevas entre users/organizations/clients: user_id referencia SOLO auth.users.
-- Requiere en Vault: 'project_url', 'cron_secret' (ya existen) y 'vapid_privada' (la clave privada VAPID).

create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);
create index if not exists push_suscripciones_user_idx on public.push_suscripciones (user_id);

alter table public.push_suscripciones enable row level security;

drop policy if exists push_suscripciones_select_own on public.push_suscripciones;
create policy push_suscripciones_select_own on public.push_suscripciones for select to authenticated
  using (user_id = auth.uid());
drop policy if exists push_suscripciones_insert_own on public.push_suscripciones;
create policy push_suscripciones_insert_own on public.push_suscripciones for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists push_suscripciones_update_own on public.push_suscripciones;
create policy push_suscripciones_update_own on public.push_suscripciones for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_suscripciones_delete_own on public.push_suscripciones;
create policy push_suscripciones_delete_own on public.push_suscripciones for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.push_suscripciones to authenticated;

-- Clave privada VAPID desde Vault. Solo service_role (la lee la Edge Function enviar-push).
create or replace function public.obtener_vapid_privada()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_privada' limit 1;
$$;
revoke execute on function public.obtener_vapid_privada() from public, anon, authenticated;
grant execute on function public.obtener_vapid_privada() to service_role;

-- Llama a la Edge Function enviar-push (mismo mecanismo que los cron: Vault + x-cron-secret).
create or replace function public.push_enviar(p_user_ids uuid[], p_titulo text, p_cuerpo text, p_url text, p_tag text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_ids is null or array_length(p_user_ids, 1) is null then return; end if;
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('user_ids', to_jsonb(p_user_ids), 'titulo', p_titulo, 'cuerpo', p_cuerpo, 'url', p_url, 'tag', p_tag),
    timeout_milliseconds := 10000
  );
end;
$$;
revoke all on function public.push_enviar(uuid[], text, text, text, text) from public, anon, authenticated;

-- Mensajes de soporte: el equipo responde -> avisa al dueño; el cliente escribe en un ticket -> avisa a los super admin.
-- Nunca bloquea el insert del mensaje.
create or replace function public.soporte_push_mensaje()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
  v_admins uuid[];
begin
  begin
    select c.id, c.user_id, c.mode, c.ticket_numero into v_conv
      from public.support_conversations c where c.id = new.conversation_id;
    if v_conv.id is null then return new; end if;

    if new.role = 'agent' and not coalesce(new.interno, false) then
      if v_conv.user_id is not null then
        perform public.push_enviar(
          array[v_conv.user_id],
          'Te respondió el equipo de AD System',
          left(coalesce(nullif(new.content, ''), 'Te enviaron una imagen'), 120),
          '/cliente/inicio?soporte=' || v_conv.id::text,
          'soporte-' || v_conv.id::text
        );
      end if;
    elsif new.role = 'user' and (v_conv.mode = 'human' or v_conv.ticket_numero is not null) then
      select coalesce(array_agg(u.id), '{}') into v_admins from public.users u where u.role = 'super_admin';
      perform public.push_enviar(
        v_admins,
        'Un negocio escribió al equipo',
        left(coalesce(nullif(new.content, ''), 'Te enviaron una imagen'), 120),
        '/admin/soporte?c=' || v_conv.id::text,
        'soporte-equipo-' || v_conv.id::text
      );
    end if;
  exception when others then
    raise warning 'soporte_push_mensaje: %', sqlerrm;
  end;
  return new;
end;
$$;
revoke all on function public.soporte_push_mensaje() from public, anon, authenticated;

drop trigger if exists support_messages_push on public.support_messages;
create trigger support_messages_push after insert on public.support_messages
  for each row execute function public.soporte_push_mensaje();
