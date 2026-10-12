-- =====================================================================
-- Avisos de vencimiento por correo (adelantado de Fase 5 a Fase 3,
-- ver docs/mvp/PLAN-MVP.md). Job diario (pg_cron + pg_net) que llama a la
-- Edge Function `avisos-vencimiento`, la cual revisa `fiscal_docs` y
-- `system_invoices` y envía un correo por cliente con Resend.
--
-- *** PASOS MANUALES (hace el orquestador, fuera de esta migración) ***
-- 1. Desplegar la Edge Function `avisos-vencimiento` y configurarle los
--    secrets: RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET (un valor
--    aleatorio largo, ej. `openssl rand -hex 32`) y, opcional, APP_URL
--    (por defecto https://adsystemapp.com).
-- 2. Cargar en Supabase Vault (Project Settings → Vault, o
--    `select vault.create_secret('<valor>', '<name>')`) dos secretos:
--      - name = 'cron_secret'  → el MISMO valor que CRON_SECRET de la función
--      - name = 'project_url'  → la URL del proyecto, ej.
--        'https://ybeippdhlvjzfgpbcoqy.supabase.co'
-- 3. Aplicar esta migración (el orquestador, con la función ya desplegada
--    y los secretos del Vault ya creados; si el cron corre antes de que
--    existan los secretos, las llamadas de pg_net simplemente fallarán
--    sin romper nada, se pueden revisar en `net._http_response`).
--
-- Requiere las extensiones pg_cron y pg_net (disponibles en Supabase).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ---------------------------------------------------------------------
-- 1. Tabla de idempotencia: un aviso no se reenvía para el mismo
--    cliente + tipo (fiscal/factura) + referencia + umbral de días.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.avisos_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('fiscal', 'factura')),
  referencia_id UUID NOT NULL,
  dias_antes INTEGER NOT NULL,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS avisos_enviados_unico
  ON public.avisos_enviados (client_id, tipo, referencia_id, dias_antes);

CREATE INDEX IF NOT EXISTS avisos_enviados_client_id_idx
  ON public.avisos_enviados (client_id);

-- RLS habilitado y SIN policies para anon/authenticated: solo la Edge
-- Function (con service_role, que siempre pasa por alto RLS) escribe y
-- lee esta tabla. Nadie desde el navegador debe poder leer ni escribir.
ALTER TABLE public.avisos_enviados ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Job diario a las 8:00 am hora Caracas (UTC-4 todo el año, sin DST)
--    = 12:00 UTC. Llama a la Edge Function vía pg_net con el secret del
--    cron leído de Vault, nunca hardcodeado en la migración.
-- ---------------------------------------------------------------------
SELECT cron.schedule(
  'avisos-vencimiento-diario',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/avisos-vencimiento',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
