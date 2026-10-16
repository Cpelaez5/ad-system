// despachar-notificacion — decide los canales (push y correo) de cada notificación.
// Doc: docs/mvp/diseno/centro-de-notificaciones.md. UN SOLO ARCHIVO, sin imports relativos (deploy por MCP).
// verify_jwt = false: la autorización se hace aquí dentro.
//   - Sistema: header x-cron-secret (RPC verificar_cron_secret) o Bearer service_role.
//       { ids: uuid[] }                 -> lo llama el trigger de notificaciones (push ya; correo ya, salvo soporte_*).
//       { modo: 'correos_pendientes' }  -> lo llama pg_cron cada minuto: correos de soporte agrupados.
//   - Persona: { modo: 'prueba' } con su JWT (Bearer, validado con auth.getUser). Solo escribe a SU correo.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLICA = 'BPUf9bsuv2BEYlVs3eWSz9xr_inZIjgmMrkShbWLQqFdjsiHnQzoDKiTl6Oxt7smJ2LcG6P9ZU4MvNvra-Y1FbQ';
const APP_URL_DEFECTO = 'https://adsystemapp.com';
const ESPERA_CORREO_SOPORTE_MS = 2 * 60 * 1000;
const VIGENCIA_CORREO_SOPORTE_MS = 24 * 60 * 60 * 1000;

// <<PURE — esta zona se prueba en tests/functions/despacharNotificacion.test.js (se transpila con esbuild).
// Solo funciones puras: sin Deno, sin red, sin variables de fuera salvo las que se declaran aquí.

function escaparHtml(texto: unknown): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Texto del usuario a HTML seguro, conservando los saltos de línea. */
function textoAHtml(texto: unknown): string {
  return escaparHtml(texto).replace(/\r?\n/g, '<br>');
}

/** Preferencia efectiva: la fila de la persona o, si no hay, el valor por defecto del catálogo. */
function resolverPreferencia(pref: { correo?: boolean | null; push?: boolean | null } | null | undefined, tipoDef: { correo_def?: boolean; push_def?: boolean } | null | undefined): { correo: boolean; push: boolean } {
  return {
    correo: typeof pref?.correo === 'boolean' ? pref.correo : (tipoDef?.correo_def ?? true),
    push: typeof pref?.push === 'boolean' ? pref.push : (tipoDef?.push_def ?? true),
  };
}

function esSoporte(tipo: string): boolean {
  return typeof tipo === 'string' && tipo.startsWith('soporte_');
}

/** Solo rutas internas ('/algo'), nunca '//otro.com' ni esquemas. Devuelve URL absoluta o la raíz. */
function urlAbsoluta(base: string, url: unknown): string {
  const b = String(base || '').replace(/\/+$/, '');
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return b + '/';
  return b + url;
}

function etiquetaBoton(tipo: string): string {
  switch (tipo) {
    case 'soporte_respuesta': return 'Ver respuesta';
    case 'soporte_estado': return 'Ver consulta';
    case 'soporte_nueva':
    case 'soporte_mensaje_cliente': return 'Responder';
    default: return 'Ver en AD System';
  }
}

/** Correo simple y accesible: colores explícitos (sirve en modo oscuro de los clientes de correo). */
function construirCorreoHtml(p: { titulo: string; lineas: string[]; extra?: string; urlBoton: string; boton: string; nombreEvento: string; urlPreferencias: string }): string {
  const GRANATE = '#8E1818';
  const parrafos = (p.lineas || [])
    .map((l) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2A2A2E;">${textoAHtml(l)}</p>`)
    .join('');
  const extra = p.extra ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#555555;">${textoAHtml(p.extra)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"></head>
<body style="margin:0;padding:0;background-color:#F4F4F5;font-family:Montserrat,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5;padding:20px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:20px 24px;border-bottom:4px solid ${GRANATE};">
    <span style="font-size:22px;font-weight:800;color:#2A2A2E;letter-spacing:0.5px;">AD <span style="color:${GRANATE};">System</span></span>
  </td></tr>
  <tr><td style="padding:24px 24px 8px;">
    <h1 style="margin:0 0 16px;font-size:20px;line-height:1.35;color:#2A2A2E;">${escaparHtml(p.titulo)}</h1>
    ${parrafos}${extra}
  </td></tr>
  <tr><td style="padding:8px 24px 28px;" align="center">
    <a href="${escaparHtml(p.urlBoton)}" style="display:inline-block;background-color:${GRANATE};color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:700;">${escaparHtml(p.boton)}</a>
  </td></tr>
  <tr><td style="padding:16px 24px;background-color:#F4F4F5;border-top:1px solid #E4E4E7;">
    <p style="margin:0;font-size:12px;line-height:1.5;color:#52525B;">Recibes este correo porque tienes activados los avisos de <strong>${escaparHtml(p.nombreEvento)}</strong>. Cámbialo en <a href="${escaparHtml(p.urlPreferencias)}" style="color:${GRANATE};">Configuración → Avisos</a>.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

/** Agrupa filas por (user_id, agrupar); sin agrupar, cada fila va sola. Respeta el orden de llegada. */
function agruparPendientes<T extends { id: string; user_id: string; agrupar?: string | null; created_at: string }>(filas: T[]): T[][] {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const clave = f.agrupar ? `${f.user_id}|${f.agrupar}` : `${f.user_id}|solo|${f.id}`;
    const lista = mapa.get(clave);
    if (lista) lista.push(f); else mapa.set(clave, [f]);
  }
  const grupos = Array.from(mapa.values());
  for (const g of grupos) g.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return grupos;
}

/** ¿Ya pasó la espera desde la notificación más antigua del grupo? */
function grupoListo(grupo: { created_at: string }[], ahoraMs: number, esperaMs: number): boolean {
  if (!grupo.length) return false;
  const masAntigua = Math.min(...grupo.map((g) => new Date(g.created_at).getTime()));
  return ahoraMs - masAntigua >= esperaMs;
}

/** Asunto y líneas de un grupo: uno solo -> su título y cuerpo; varios -> título del primero con el conteo. */
function resumenGrupo(grupo: { titulo: string; cuerpo: string; datos?: { adjuntos?: number } | null }[]): { asunto: string; titulo: string; lineas: string[]; extra: string } {
  const primero = grupo[0];
  const n = grupo.length;
  const adjuntos = grupo.reduce((s, g) => s + (Number(g.datos?.adjuntos) || 0), 0);
  const extra = adjuntos > 0 ? (adjuntos === 1 ? 'Incluye 1 captura: la ves dentro de AD System.' : `Incluye ${adjuntos} capturas: las ves dentro de AD System.`) : '';
  if (n === 1) return { asunto: primero.titulo, titulo: primero.titulo, lineas: [primero.cuerpo].filter(Boolean), extra };
  const titulo = `${primero.titulo} (${n} mensajes nuevos)`;
  return { asunto: titulo, titulo, lineas: grupo.map((g) => g.cuerpo).filter(Boolean), extra };
}

/** Decide si un grupo de soporte NO debe mandarse por correo (y por qué). null = sí se manda. */
function motivoOmitir(p: { pref: { correo: boolean }; todasLeidas: boolean; clienteYaLoVio: boolean; tieneCorreo: boolean }): string | null {
  if (!p.pref.correo) return 'preferencia';
  if (p.todasLeidas || p.clienteYaLoVio) return 'leida';
  if (!p.tieneCorreo) return 'sin_correo';
  return null;
}
// PURE>>

const json = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

const ultimaPrueba = new Map<string, number>(); // freno simple por usuario (por instancia)

type Fila = {
  id: string; user_id: string; tipo: string; titulo: string; cuerpo: string; url: string | null;
  datos: Record<string, unknown> | null; agrupar: string | null; leida_en: string | null; created_at: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: { code: 'METODO', message: 'Solo POST.' } });
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_ROLE_KEY);
  const APP_URL = (Deno.env.get('APP_URL') || APP_URL_DEFECTO).replace(/\/+$/, '');
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'AD System <onboarding@resend.dev>';

  const body = await req.json().catch(() => ({}));
  const auth = req.headers.get('authorization') ?? '';

  // ─── Autorización ───
  const esServiceRole = SERVICE_ROLE_KEY.length > 0 && auth === `Bearer ${SERVICE_ROLE_KEY}`;
  const secreto = req.headers.get('x-cron-secret') ?? '';
  const CRON_SECRET = Deno.env.get('CRON_SECRET');
  let esCron = !!CRON_SECRET && secreto === CRON_SECRET;
  if (!esCron && !CRON_SECRET && secreto) {
    const { data } = await supabase.rpc('verificar_cron_secret', { p_secret: secreto });
    esCron = data === true;
  }
  const esSistema = esServiceRole || esCron;

  async function enviarCorreo(para: string, asunto: string, html: string): Promise<{ ok: boolean; permanente: boolean }> {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: [para], subject: asunto, html }),
      });
      if (r.ok) return { ok: true, permanente: false };
      console.error('despachar-notificacion: Resend', r.status);
      return { ok: false, permanente: r.status >= 400 && r.status < 500 && r.status !== 429 };
    } catch (e) {
      console.error('despachar-notificacion: Resend red', (e as Error)?.message);
      return { ok: false, permanente: false };
    }
  }

  async function correoDe(userId: string): Promise<string | null> {
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      return data?.user?.email ?? null;
    } catch {
      return null;
    }
  }

  async function cargarCatalogoYPrefs(userIds: string[], tipos: string[]) {
    const [{ data: tipoRows }, { data: prefRows }] = await Promise.all([
      supabase.from('notificacion_tipos').select('tipo, nombre, correo_def, push_def').in('tipo', tipos),
      supabase.from('preferencias_notificacion').select('user_id, tipo, correo, push').in('user_id', userIds).in('tipo', tipos),
    ]);
    const catalogo = new Map((tipoRows ?? []).map((t) => [t.tipo as string, t]));
    const prefs = new Map((prefRows ?? []).map((p) => [`${p.user_id}|${p.tipo}`, p]));
    const pref = (userId: string, tipo: string) => resolverPreferencia(prefs.get(`${userId}|${tipo}`), catalogo.get(tipo));
    return { catalogo, pref };
  }

  // ─── Modo prueba: la persona con su JWT; solo a su propio correo ───
  if (body?.modo === 'prueba') {
    if (esSistema || !auth.startsWith('Bearer ')) return json(401, { error: { code: 'NO_AUTORIZADO', message: 'Inicia sesión para probar.' } });
    const { data: u, error: errU } = await supabase.auth.getUser(auth.slice(7));
    const usuario = u?.user;
    if (errU || !usuario?.id || !usuario.email) return json(401, { error: { code: 'NO_AUTORIZADO', message: 'Sesión no válida.' } });
    const ahora = Date.now();
    if (ahora - (ultimaPrueba.get(usuario.id) ?? 0) < 30_000) return json(429, { error: { code: 'DEMASIADO_PRONTO', message: 'Espera unos segundos antes de pedir otro correo de prueba.' } });
    ultimaPrueba.set(usuario.id, ahora);
    if (!RESEND_API_KEY) return json(200, { enviado: false, motivo: 'sin_configuracion' });
    const html = construirCorreoHtml({
      titulo: 'Prueba de avisos por correo',
      lineas: ['Si ves este mensaje, los avisos de AD System te llegan bien a este correo.'],
      urlBoton: urlAbsoluta(APP_URL, '/settings?seccion=avisos'),
      boton: 'Ver mis avisos',
      nombreEvento: 'prueba de correo',
      urlPreferencias: urlAbsoluta(APP_URL, '/settings?seccion=avisos'),
    });
    const r = await enviarCorreo(usuario.email, 'Prueba de avisos de AD System', html);
    return json(r.ok ? 200 : 502, { enviado: r.ok, motivo: r.ok ? null : 'error_de_envio' });
  }

  if (!esSistema) return json(401, { error: { code: 'NO_AUTORIZADO', message: 'Solo el sistema.' } });

  try {
    // ─── Correos de soporte pendientes (cron cada minuto) ───
    if (body?.modo === 'correos_pendientes') {
      const ahora = Date.now();
      const desde = new Date(ahora - VIGENCIA_CORREO_SOPORTE_MS).toISOString();
      // Lo que lleva más de un día sin salir ya no tiene sentido enviarlo.
      await supabase.from('notificaciones').update({ correo_omitido: 'expirada' })
        .like('tipo', 'soporte\\_%').is('correo_enviado_en', null).is('correo_omitido', null).lt('created_at', desde);

      const { data: filas, error } = await supabase.from('notificaciones')
        .select('id, user_id, tipo, titulo, cuerpo, url, datos, agrupar, leida_en, created_at')
        .like('tipo', 'soporte\\_%').is('correo_enviado_en', null).is('correo_omitido', null)
        .gte('created_at', desde).order('created_at', { ascending: true }).limit(500);
      if (error) throw error;
      const pendientes = (filas ?? []) as Fila[];
      if (!pendientes.length) return json(200, { grupos: 0, enviados: 0 });

      const grupos = agruparPendientes(pendientes).filter((g) => grupoListo(g, ahora, ESPERA_CORREO_SOPORTE_MS));
      if (!grupos.length) return json(200, { grupos: 0, enviados: 0 });

      const { catalogo, pref } = await cargarCatalogoYPrefs(
        [...new Set(grupos.map((g) => g[0].user_id))], [...new Set(grupos.map((g) => g[0].tipo))]);

      // No leídos del cliente por conversación (para los avisos dirigidos al cliente).
      const convIds = [...new Set(grupos.map((g) => (g[0].agrupar ?? '').replace('soporte:', '')).filter((x) => /^[0-9a-f-]{36}$/.test(x)))];
      const noLeidos = new Map<string, number>();
      if (convIds.length) {
        const { data: convs } = await supabase.from('support_conversations').select('id, no_leidos_cliente').in('id', convIds);
        for (const c of convs ?? []) noLeidos.set(c.id as string, Number(c.no_leidos_cliente) || 0);
      }

      let enviados = 0;
      for (const grupo of grupos) {
        const ids = grupo.map((g) => g.id);
        // Reclamo atómico: si otra ejecución ya tomó estas filas, no se envía dos veces.
        const { data: reclamadas } = await supabase.from('notificaciones').update({ correo_omitido: 'enviando' })
          .in('id', ids).is('correo_omitido', null).is('correo_enviado_en', null).select('id');
        const propias = new Set((reclamadas ?? []).map((r) => r.id as string));
        const mios = grupo.filter((g) => propias.has(g.id));
        if (!mios.length) continue;
        const soltar = async (valor: string | null, enviado = false) => {
          await supabase.from('notificaciones').update(enviado ? { correo_enviado_en: new Date().toISOString(), correo_omitido: null } : { correo_omitido: valor })
            .in('id', mios.map((m) => m.id));
        };

        const tipo = mios[0].tipo;
        const sinLeer = mios.filter((m) => !m.leida_en);
        const convId = (mios[0].agrupar ?? '').replace('soporte:', '');
        const paraCliente = tipo === 'soporte_respuesta' || tipo === 'soporte_estado';
        const clienteYaLoVio = paraCliente && noLeidos.has(convId) && noLeidos.get(convId) === 0;
        const email = await correoDe(mios[0].user_id);
        const motivo = motivoOmitir({
          pref: pref(mios[0].user_id, tipo), todasLeidas: sinLeer.length === 0, clienteYaLoVio, tieneCorreo: !!email,
        });
        if (motivo) { await soltar(motivo); continue; }
        if (!RESEND_API_KEY) { await soltar('sin_configuracion'); continue; }

        const resumen = resumenGrupo(sinLeer);
        const html = construirCorreoHtml({
          titulo: resumen.titulo, lineas: resumen.lineas, extra: resumen.extra,
          urlBoton: urlAbsoluta(APP_URL, sinLeer[sinLeer.length - 1].url), boton: etiquetaBoton(tipo),
          nombreEvento: catalogo.get(tipo)?.nombre ?? 'soporte',
          urlPreferencias: urlAbsoluta(APP_URL, '/settings?seccion=avisos'),
        });
        const r = await enviarCorreo(email as string, resumen.asunto, html);
        if (r.ok) {
          // Las que ya estaban leídas dentro del grupo quedan marcadas como leídas, no como enviadas por separado.
          await soltar(null, true);
          enviados++;
        } else {
          await soltar(r.permanente ? 'error' : null); // error pasajero: se reintenta en el próximo minuto
        }
      }
      return json(200, { grupos: grupos.length, enviados });
    }

    // ─── Notificaciones recién creadas: push ya; correo ya (salvo soporte_*, que va agrupado) ───
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 500) : [];
    if (!ids.length) return json(200, { procesadas: 0 });

    const { data: filas, error } = await supabase.from('notificaciones')
      .select('id, user_id, tipo, titulo, cuerpo, url, datos, agrupar, leida_en, created_at').in('id', ids);
    if (error) throw error;
    const nots = (filas ?? []) as Fila[];
    if (!nots.length) return json(200, { procesadas: 0 });

    const { catalogo, pref } = await cargarCatalogoYPrefs(
      [...new Set(nots.map((n) => n.user_id))], [...new Set(nots.map((n) => n.tipo))]);

    // Push
    let pushEnviados = 0;
    const paraPush = nots.filter((n) => !n.leida_en && pref(n.user_id, n.tipo).push);
    if (paraPush.length) {
      const { data: priv } = await supabase.rpc('obtener_vapid_privada');
      if (priv) {
        webpush.setVapidDetails('mailto:soporte@adsystemapp.com', VAPID_PUBLICA, priv as string);
        const { data: subs } = await supabase.from('push_suscripciones').select('id, user_id, endpoint, p256dh, auth')
          .in('user_id', [...new Set(paraPush.map((n) => n.user_id))]);
        const muertas: string[] = [];
        const vivas: string[] = [];
        const conPush = new Set<string>();
        await Promise.all(paraPush.flatMap((n) => (subs ?? []).filter((s) => s.user_id === n.user_id).map(async (s) => {
          const payload = JSON.stringify({
            titulo: n.titulo.slice(0, 120), cuerpo: n.cuerpo.slice(0, 240),
            url: n.url && n.url.startsWith('/') && !n.url.startsWith('//') ? n.url : '/',
            tag: (n.agrupar || n.tipo).slice(0, 64),
          });
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'high' });
            pushEnviados++; vivas.push(s.id); conPush.add(n.id);
          } catch (e) {
            const code = (e as { statusCode?: number })?.statusCode;
            if (code === 404 || code === 410) muertas.push(s.id);
            else console.error('despachar-notificacion: push', code, (e as Error)?.message);
          }
        })));
        if (muertas.length) await supabase.from('push_suscripciones').delete().in('id', muertas);
        if (vivas.length) await supabase.from('push_suscripciones').update({ last_used_at: new Date().toISOString() }).in('id', vivas);
        if (conPush.size) await supabase.from('notificaciones').update({ push_enviado_en: new Date().toISOString() }).in('id', [...conPush]);
      } else {
        console.error('despachar-notificacion: falta vapid_privada en Vault');
      }
    }

    // Correo inmediato para lo que no es soporte
    let correosEnviados = 0;
    for (const n of nots.filter((x) => !esSoporte(x.tipo))) {
      const marcar = (campos: Record<string, unknown>) => supabase.from('notificaciones').update(campos).eq('id', n.id);
      if (n.datos?.correo_externo === true) { await marcar({ correo_omitido: 'externo' }); continue; } // ya lo envía otra función
      if (!pref(n.user_id, n.tipo).correo) { await marcar({ correo_omitido: 'preferencia' }); continue; }
      if (!RESEND_API_KEY) { await marcar({ correo_omitido: 'sin_configuracion' }); continue; }
      const email = await correoDe(n.user_id);
      if (!email) { await marcar({ correo_omitido: 'sin_correo' }); continue; }
      const html = construirCorreoHtml({
        titulo: n.titulo, lineas: [n.cuerpo].filter(Boolean), urlBoton: urlAbsoluta(APP_URL, n.url), boton: etiquetaBoton(n.tipo),
        nombreEvento: catalogo.get(n.tipo)?.nombre ?? 'este aviso', urlPreferencias: urlAbsoluta(APP_URL, '/settings?seccion=avisos'),
      });
      const r = await enviarCorreo(email, n.titulo, html);
      if (r.ok) { await marcar({ correo_enviado_en: new Date().toISOString() }); correosEnviados++; }
      else await marcar({ correo_omitido: 'error' });
    }
    return json(200, { procesadas: nots.length, push: pushEnviados, correos: correosEnviados });
  } catch (e) {
    console.error('despachar-notificacion', e);
    return json(500, { error: { code: 'ERROR', message: (e as Error)?.message ?? 'Error' } });
  }
});
