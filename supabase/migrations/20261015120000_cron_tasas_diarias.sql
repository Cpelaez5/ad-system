-- Tasas globales: de lunes a viernes, 10:00 y 18:00 (Caracas = UTC-4 → 14:00 y 22:00 UTC),
-- la función tasas-diarias guarda en exchange_rates las tasas del día de USD, EUR, CNY, TRY
-- y RUB. El upsert por (date, currency) deja la última lectura del día. Mismo mecanismo que
-- avisos-vencimiento: URL y secreto desde Vault ('project_url', 'cron_secret').
select cron.unschedule('tasas-diarias') where exists (select 1 from cron.job where jobname = 'tasas-diarias');
select cron.schedule(
  'tasas-diarias',
  '0 14,22 * * 1-5',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/tasas-diarias',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
