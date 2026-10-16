// enviar-push — manda una notificación Web Push a todos los dispositivos de una lista de usuarios.
// Lo invoca el trigger de support_messages (y futuros avisos) vía pg_net con el header x-cron-secret.
// Cuerpo: { user_ids: uuid[], titulo, cuerpo, url, tag }. Borra las suscripciones muertas (404/410).
// Autorización igual que tasas-diarias: x-cron-secret (RPC verificar_cron_secret) o service_role. verify_jwt = false.
// La clave privada VAPID sale de Vault ('vapid_privada') por la RPC obtener_vapid_privada (solo service_role).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLICA = 'BPUf9bsuv2BEYlVs3eWSz9xr_inZIjgmMrkShbWLQqFdjsiHnQzoDKiTl6Oxt7smJ2LcG6P9ZU4MvNvra-Y1FbQ';
const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_ROLE_KEY);

  const esServiceRole = SERVICE_ROLE_KEY.length > 0 && (req.headers.get('authorization') ?? '') === `Bearer ${SERVICE_ROLE_KEY}`;
  const secreto = req.headers.get('x-cron-secret') ?? '';
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  let esCron = !!CRON_SECRET && secreto === CRON_SECRET;
  if (!esCron && !CRON_SECRET && secreto) {
    const { data } = await supabase.rpc('verificar_cron_secret', { p_secret: secreto });
    esCron = data === true;
  }
  if (!esServiceRole && !esCron) return json(401, { error: { code: 'NO_AUTORIZADO', message: 'Solo el sistema.' } });

  try {
    const body = await req.json().catch(() => ({}));
    const userIds: string[] = Array.isArray(body?.user_ids) ? body.user_ids.filter((x: unknown) => typeof x === 'string') : [];
    if (userIds.length === 0) return json(200, { enviados: 0, eliminados: 0, motivo: 'sin destinatarios' });
    const payload = JSON.stringify({
      titulo: String(body?.titulo ?? 'AD System').slice(0, 120),
      cuerpo: String(body?.cuerpo ?? '').slice(0, 240),
      url: typeof body?.url === 'string' && body.url.startsWith('/') ? body.url : '/',
      tag: typeof body?.tag === 'string' ? body.tag.slice(0, 64) : 'ad-system',
    });

    const { data: priv, error: errPriv } = await supabase.rpc('obtener_vapid_privada');
    if (errPriv || !priv) return json(500, { error: { code: 'SIN_CLAVE_VAPID', message: 'Falta el secreto vapid_privada en Vault.' } });
    webpush.setVapidDetails('mailto:soporte@adsystemapp.com', VAPID_PUBLICA, priv as string);

    const { data: subs, error } = await supabase
      .from('push_suscripciones')
      .select('id, endpoint, p256dh, auth')
      .in('user_id', userIds);
    if (error) throw error;

    let enviados = 0;
    const muertas: string[] = [];
    const vivas: string[] = [];
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: 'high' },
        );
        enviados++;
        vivas.push(s.id);
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) muertas.push(s.id);
        else console.error('enviar-push: fallo', code, (e as Error)?.message);
      }
    }));

    if (muertas.length) await supabase.from('push_suscripciones').delete().in('id', muertas);
    if (vivas.length) await supabase.from('push_suscripciones').update({ last_used_at: new Date().toISOString() }).in('id', vivas);
    return json(200, { enviados, eliminados: muertas.length });
  } catch (e) {
    console.error('enviar-push', e);
    return json(500, { error: { code: 'ERROR', message: (e as Error)?.message ?? 'Error' } });
  }
});
