// tasas-diarias — guarda en la tabla GLOBAL `exchange_rates` las tasas del día de todas las
// monedas que trae el servicio externo (USD, EUR, CNY, TRY, RUB). La invoca pg_cron de
// lunes a viernes (migración 20261015120000_cron_tasas_diarias). Antes la tabla solo se
// llenaba cuando alguien abría la app y quedaban días hábiles sin tasa.
//
// Protegida igual que avisos-vencimiento: header `x-cron-secret` (CRON_SECRET o Vault
// 'cron_secret' vía RPC verificar_cron_secret) o service_role. verify_jwt = false.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PROXY_URL = 'https://bcv-api-proxy-r8fs.onrender.com/api/bcv/rates';
const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

/** Fecha de hoy en Caracas (YYYY-MM-DD). */
function hoyCaracas(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(new Date());
}

async function traerTasas(intentos = 3) {
  let ultimoError = '';
  for (let i = 0; i < intentos; i++) {
    try {
      // El proxy vive en Render y puede tardar en "despertar": tiempo generoso.
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 45_000);
      const r = await fetch(PROXY_URL, { signal: controller.signal }).finally(() => clearTimeout(t));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const cuerpo = await r.json();
      const d = cuerpo?.data;
      if (!cuerpo?.success || typeof d?.usd?.tasa !== 'number') throw new Error('Respuesta sin tasa USD');
      return {
        USD: d.usd?.tasa, EUR: d.euro?.tasa, CNY: d.yuan?.tasa, TRY: d.lira?.tasa, RUB: d.rublo?.tasa,
        fechaValor: cuerpo.fecha_valor ?? null,
      };
    } catch (e) {
      ultimoError = (e as Error)?.message ?? String(e);
      await new Promise((ok) => setTimeout(ok, 5_000 * (i + 1)));
    }
  }
  throw new Error(`No se pudieron traer las tasas: ${ultimoError}`);
}

Deno.serve(async (req) => {
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_ROLE_KEY);

  // Autorización: solo el cron (secret) o service_role.
  const esServiceRole = SERVICE_ROLE_KEY.length > 0 && (req.headers.get('authorization') ?? '') === `Bearer ${SERVICE_ROLE_KEY}`;
  const secreto = req.headers.get('x-cron-secret') ?? '';
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  let esCron = !!CRON_SECRET && secreto === CRON_SECRET;
  if (!esCron && !CRON_SECRET && secreto) {
    const { data } = await supabase.rpc('verificar_cron_secret', { p_secret: secreto });
    esCron = data === true;
  }
  if (!esServiceRole && !esCron) return json(401, { error: { code: 'NO_AUTORIZADO', message: 'Solo el job programado.' } });

  try {
    const tasas = await traerTasas();
    const fecha = hoyCaracas();
    const filas = (['USD', 'EUR', 'CNY', 'TRY', 'RUB'] as const)
      .filter((m) => typeof tasas[m] === 'number' && tasas[m]! > 0)
      .map((m) => ({ date: fecha, currency: m, rate: tasas[m], source: 'PROXY-API-CRON' }));
    const { error } = await supabase.from('exchange_rates').upsert(filas, { onConflict: 'date,currency' });
    if (error) throw new Error(error.message);
    return json(200, { fecha, guardadas: filas.map((f) => f.currency), fecha_valor: tasas.fechaValor });
  } catch (e) {
    return json(502, { error: { code: 'TASAS', message: (e as Error).message } });
  }
});
