-- ==============================================================================
-- Migración: Agregar campo invited_at a la tabla users
-- ==============================================================================
-- Fecha: 2026-09-29
-- Descripción:
--   Agrega la columna `invited_at` (TIMESTAMPTZ) a la tabla `public.users` para
--   registrar cuándo se envió la invitación de activación por correo electrónico.
--   Permite diferenciar con exactitud usuarios con invitaciones pendientes
--   frente a usuarios desactivados manualmente por un administrador.
-- ==============================================================================

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.invited_at IS 'Fecha y hora en la que se envió o reenvió la invitación al usuario por correo electrónico';
