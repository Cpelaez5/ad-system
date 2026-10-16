// Lógica pura de las notificaciones push (sin tocar el navegador): fácil de probar.

/** Clave pública VAPID (es pública por diseño; la privada vive en Vault). */
export const VAPID_PUBLICA_POR_DEFECTO =
  'BPUf9bsuv2BEYlVs3eWSz9xr_inZIjgmMrkShbWLQqFdjsiHnQzoDKiTl6Oxt7smJ2LcG6P9ZU4MvNvra-Y1FbQ'

export const CLAVE_PREGUNTA = 'ad_push_pregunta'
export const DIAS_SIN_INSISTIR = 7
const MS_DIA = 24 * 60 * 60 * 1000

/** Convierte la clave VAPID (base64 url-safe) al formato que pide pushManager.subscribe. */
export function urlBase64ToUint8Array(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(b64)
  const salida = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) salida[i] = crudo.charCodeAt(i)
  return salida
}

/** ¿Es iPhone/iPad? (iPadOS nuevo se presenta como Mac con pantalla táctil). */
export function esIOS(userAgent = '', maxTouchPoints = 0) {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

/**
 * ¿Se puede preguntar ahora? Solo si el navegador lo soporta, el permiso sigue sin decidir
 * y la persona no dijo "Ahora no" en los últimos 7 días.
 * @param {{ soportado: boolean, permiso: string, ultimoDescarte?: number|null, ahora?: number }} p
 */
export function debePreguntar({ soportado, permiso, ultimoDescarte = null, ahora = Date.now() }) {
  if (!soportado || permiso !== 'default') return false
  if (ultimoDescarte && ahora - ultimoDescarte < DIAS_SIN_INSISTIR * MS_DIA) return false
  return true
}

/**
 * Situación del dispositivo para mostrarla en Configuración.
 * 'ios_sin_instalar' = iPhone en Safari normal: ahí el push solo funciona con la app en la pantalla de inicio.
 */
export function situacionPush({ soportado, permiso, suscrito, ios, instalada }) {
  if (ios && !instalada && !soportado) return 'ios_sin_instalar'
  if (!soportado) return 'no_soportado'
  if (permiso === 'denied') return 'bloqueado'
  if (permiso === 'granted' && suscrito) return 'activo'
  return 'inactivo'
}

/** Datos de la suscripción del navegador -> fila de la tabla push_suscripciones. */
export function filaDeSuscripcion(suscripcion, userAgent = '') {
  const j = typeof suscripcion?.toJSON === 'function' ? suscripcion.toJSON() : suscripcion
  const p256dh = j?.keys?.p256dh
  const auth = j?.keys?.auth
  if (!j?.endpoint || !p256dh || !auth) return null
  return { endpoint: j.endpoint, p256dh, auth, user_agent: String(userAgent).slice(0, 250), last_used_at: new Date().toISOString() }
}

/** Mensaje que el servidor manda al service worker. */
export function construirPayload({ titulo, cuerpo = '', url = '/', tag = 'ad-system' }) {
  return JSON.stringify({
    titulo: String(titulo || 'AD System').slice(0, 120),
    cuerpo: String(cuerpo).slice(0, 240),
    url: typeof url === 'string' && url.startsWith('/') ? url : '/',
    tag: String(tag).slice(0, 64),
  })
}
