/**
 * useSonidoMensaje — campanita suave y corta (dos notas, ~180 ms) para avisar que
 * llegó un mensaje. Se sintetiza con Web Audio: no hay archivo de sonido.
 * - No suena más de una vez cada 1,5 s.
 * - El navegador bloquea el audio hasta que la persona toca la pantalla: se
 *   desbloquea con el primer toque o tecla.
 * - Se puede silenciar; la preferencia queda en localStorage ('ad_sonido_mensajes').
 */
import { ref } from 'vue'

export const CLAVE_SONIDO = 'ad_sonido_mensajes'
export const INTERVALO_MIN_MS = 1500
export const VOLUMEN = 0.15

/** Pura: ¿ya pasó el intervalo mínimo desde el último sonido? */
export function puedeSonar(ultimo, ahora, intervalo = INTERVALO_MIN_MS) {
  return !ultimo || ahora - ultimo >= intervalo
}

function leerSilenciado() {
  try {
    return localStorage.getItem(CLAVE_SONIDO) === 'off'
  } catch {
    return false
  }
}

const silenciado = ref(leerSilenciado())
let contexto = null
let ultimoSonido = 0
let escuchando = false

function crearContexto() {
  if (contexto) return contexto
  try {
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (Ctx) contexto = new Ctx()
  } catch {
    contexto = null
  }
  return contexto
}

function desbloquear() {
  const ctx = crearContexto()
  if (ctx && ctx.state === 'suspended') ctx.resume?.().catch?.(() => {})
}

const EVENTOS_GESTO = ['pointerdown', 'keydown', 'touchstart']

function escucharPrimerGesto() {
  if (escuchando || typeof window === 'undefined') return
  escuchando = true
  const alGesto = () => {
    desbloquear()
    EVENTOS_GESTO.forEach((e) => window.removeEventListener(e, alGesto))
  }
  EVENTOS_GESTO.forEach((e) => window.addEventListener(e, alGesto, { passive: true }))
}

function nota(ctx, frecuencia, inicio, duracion) {
  const osc = ctx.createOscillator()
  const ganancia = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frecuencia, inicio)
  ganancia.gain.setValueAtTime(0.0001, inicio)
  ganancia.gain.linearRampToValueAtTime(VOLUMEN, inicio + 0.012)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
  osc.connect(ganancia).connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracion + 0.02)
}

export function useSonidoMensaje() {
  escucharPrimerGesto()

  function reproducir() {
    if (silenciado.value) return false
    const ahora = Date.now()
    if (!puedeSonar(ultimoSonido, ahora)) return false
    const ctx = crearContexto()
    // Sin gesto previo el contexto sigue suspendido: no suena (y no molesta).
    if (!ctx || ctx.state !== 'running') return false
    ultimoSonido = ahora
    try {
      const t = ctx.currentTime
      nota(ctx, 880, t, 0.09)
      nota(ctx, 1318.5, t + 0.08, 0.1)
      return true
    } catch {
      return false
    }
  }

  function alternar() {
    silenciado.value = !silenciado.value
    try {
      localStorage.setItem(CLAVE_SONIDO, silenciado.value ? 'off' : 'on')
    } catch {
      /* sin almacenamiento: vale solo para esta visita */
    }
    // Al activarlo, una muestra para que sepa cómo suena (el toque cuenta como gesto).
    if (!silenciado.value) {
      desbloquear()
      ultimoSonido = 0
      setTimeout(reproducir, 60)
    }
  }

  return { silenciado, reproducir, alternar }
}
