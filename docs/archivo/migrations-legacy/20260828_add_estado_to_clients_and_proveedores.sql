-- Migración para añadir columna estado a clients y proveedores
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.proveedores ADD COLUMN IF NOT EXISTS estado text;
