-- =====================================================================
-- GymTrack · Storage para avatares
-- Ejecutar despues de crear el bucket (o dejar que lo cree esta consulta).
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lectura publica (el avatar se muestra en el ranking)
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Cada usuario solo escribe dentro de su propia carpeta: <user_id>/archivo
drop policy if exists "avatars owner write" on storage.objects;
create policy "avatars owner write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
