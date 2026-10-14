-- Fotos de productos (Mi mercancía): foto que sube el cliente y foto "de estudio"
-- generada con IA (Nano Banana). Se guardan en un bucket PRIVADO con la ruta
-- {organization_id}/{client_id}/{archivo} y se muestran con URLs firmadas.

alter table public.inventory_products
  add column if not exists foto_path text,
  add column if not exists foto_original_path text;

comment on column public.inventory_products.foto_path is 'Foto que se muestra (bucket productos). Puede ser la mejorada con IA.';
comment on column public.inventory_products.foto_original_path is 'Foto original que subió el cliente (bucket productos).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura / borrado / actualización: mismas reglas que documents (organización y,
-- para el rol cliente, solo su propia carpeta de empresa).
drop policy if exists productos_select_tenant on storage.objects;
create policy productos_select_tenant on storage.objects for select to authenticated
  using (bucket_id = 'productos' and public.puede_acceder_objeto(name, owner));

drop policy if exists productos_delete_tenant on storage.objects;
create policy productos_delete_tenant on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.puede_acceder_objeto(name, owner));

-- Subida: dentro de su organización y, si es cliente, SOLO en la carpeta de su empresa
-- (más estricto que documents, donde la subida solo exige la organización).
drop policy if exists productos_insert_tenant on storage.objects;
create policy productos_insert_tenant on storage.objects for insert to authenticated
  with check (
    bucket_id = 'productos'
    and public.objeto_en_mi_organizacion(name)
    and (
      public.get_current_user_role() <> 'cliente'
      or (storage.foldername(name))[2] = public.get_current_user_client_id()::text
    )
  );

drop policy if exists productos_update_tenant on storage.objects;
create policy productos_update_tenant on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.puede_acceder_objeto(name, owner))
  with check (
    bucket_id = 'productos'
    and public.objeto_en_mi_organizacion(name)
    and (
      public.get_current_user_role() <> 'cliente'
      or (storage.foldername(name))[2] = public.get_current_user_client_id()::text
    )
  );
