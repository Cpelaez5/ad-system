-- La FK organizations.owner_user_id → users(id) (migración 20261013150000) creaba una SEGUNDA
-- relación users↔organizations y PostgREST rechazaba por ambiguo el embed
-- `users.select('*, organizations(*)')` del login: "Tu cuenta tiene un rol no reconocido".
-- Regla: no agregar otra FK entre users y organizations/clients sin revisar los embeds del código.
alter table public.organizations drop constraint if exists organizations_owner_user_id_fkey;
notify pgrst, 'reload schema';
