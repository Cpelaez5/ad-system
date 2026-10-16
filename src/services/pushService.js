// Avisos push en este dispositivo: pedir permiso, suscribir, guardar y quitar.
import { supabase } from '@/lib/supabaseClient'
import {
  VAPID_PUBLICA_POR_DEFECTO, CLAVE_PREGUNTA, urlBase64ToUint8Array, esIOS,
  debePreguntar, situacionPush, filaDeSuscripcion,
} from '@/utils/push.js'

const VAPID_PUBLICA = import.meta.env?.VITE_VAPID_PUBLIC_KEY || VAPID_PUBLICA_POR_DEFECTO

export function pushSoportado() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

function estaInstalada() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
  } catch { return false }
}

async function suscripcionActual() {
  if (!pushSoportado()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    return reg ? await reg.pushManager.getSubscription() : null
  } catch { return null }
}

/** { situacion, permiso, soportado } — situacion: activo | inactivo | bloqueado | ios_sin_instalar | no_soportado */
export async function estadoPush() {
  const soportado = pushSoportado()
  const permiso = soportado ? Notification.permission : 'default'
  const suscrito = soportado && permiso === 'granted' ? !!(await suscripcionActual()) : false
  const ios = esIOS(navigator.userAgent, navigator.maxTouchPoints)
  return { soportado, permiso, situacion: situacionPush({ soportado, permiso, suscrito, ios, instalada: estaInstalada() }) }
}

async function guardar(suscripcion) {
  const fila = filaDeSuscripcion(suscripcion, navigator.userAgent)
  if (!fila) throw new Error('Suscripción incompleta')
  const { error } = await supabase.from('push_suscripciones').upsert(fila, { onConflict: 'endpoint' })
  if (error) throw error
}

async function suscribir() {
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLICA) })
  }
  await guardar(sub)
  return sub
}

/** Pide permiso (si falta), suscribe y guarda. Devuelve { ok, permiso }. */
export async function activarPush() {
  if (!pushSoportado()) return { ok: false, permiso: 'default' }
  let permiso = Notification.permission
  if (permiso === 'default') permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return { ok: false, permiso }
  try {
    await suscribir()
    return { ok: true, permiso }
  } catch (e) {
    return { ok: false, permiso, error: e?.message || 'No se pudo activar' }
  }
}

/** Si ya hay permiso pero falta la suscripción o el guardado (p. ej. tras cerrar sesión), lo arregla sin preguntar. */
export async function sincronizarSilencioso() {
  try {
    if (pushSoportado() && Notification.permission === 'granted') await suscribir()
  } catch { /* silencioso */ }
}

/** Quita este dispositivo: borra la fila y cancela la suscripción del navegador. */
export async function desactivarPush() {
  const sub = await suscripcionActual()
  if (!sub) return { ok: true }
  try {
    await supabase.from('push_suscripciones').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message }
  }
}

// ---- Pregunta amable ----
export function debePreguntarAhora() {
  let ultimoDescarte = null
  try { ultimoDescarte = Number(localStorage.getItem(CLAVE_PREGUNTA)) || null } catch { /* sin storage */ }
  return debePreguntar({ soportado: pushSoportado(), permiso: pushSoportado() ? Notification.permission : 'default', ultimoDescarte })
}
export function recordarDescarte() {
  try { localStorage.setItem(CLAVE_PREGUNTA, String(Date.now())) } catch { /* sin storage */ }
}

/** El service worker avisa si el navegador cambió la suscripción: se guarda con la sesión actual. */
export function escucharResuscripcion() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('message', (ev) => {
    if (ev.data?.tipo === 'push-resuscrita') guardar(ev.data.suscripcion).catch(() => {})
  })
}
