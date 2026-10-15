-- Capturas de pantalla adjuntas en el chat de soporte (cliente y equipo).
-- Bucket privado 'soporte-adjuntos'; ruta de cada objeto: <conversation_id>/<uuid>.<ext>.
-- Sin FK nuevas entre users/organizations/clients.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('soporte-adjuntos', 'soporte-adjuntos', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- Lista de adjuntos del mensaje: [{ path, nombre, mime, tamano, ancho, alto }]
alter table public.support_messages
  add column if not exists adjuntos jsonb not null default '[]'::jsonb;

-- El dueño de la conversación sube y ve sus capturas; el super admin ve y sube todas.
drop policy if exists soporte_adjuntos_insert_own on storage.objects;
create policy soporte_adjuntos_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'soporte-adjuntos'
    and exists (
      select 1 from public.support_conversations sc
       where sc.id::text = (storage.foldername(name))[1]
         and sc.user_id = auth.uid()
    )
  );

drop policy if exists soporte_adjuntos_select_own on storage.objects;
create policy soporte_adjuntos_select_own on storage.objects for select to authenticated
  using (
    bucket_id = 'soporte-adjuntos'
    and exists (
      select 1 from public.support_conversations sc
       where sc.id::text = (storage.foldername(name))[1]
         and sc.user_id = auth.uid()
    )
  );

drop policy if exists soporte_adjuntos_insert_superadmin on storage.objects;
create policy soporte_adjuntos_insert_superadmin on storage.objects for insert to authenticated
  with check (bucket_id = 'soporte-adjuntos' and public.get_current_user_role() = 'super_admin');

drop policy if exists soporte_adjuntos_select_superadmin on storage.objects;
create policy soporte_adjuntos_select_superadmin on storage.objects for select to authenticated
  using (bucket_id = 'soporte-adjuntos' and public.get_current_user_role() = 'super_admin');
