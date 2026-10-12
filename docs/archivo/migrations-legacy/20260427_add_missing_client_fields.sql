-- Migración para añadir campos de datos fiscales e información adicional faltantes en producción
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS activity_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_name TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_tax_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_special_taxpayer BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS retains_islr BOOLEAN DEFAULT false;

-- Notificar a PostgREST para reconstruir la caché de esquema
NOTIFY pgrst, 'reload schema';
