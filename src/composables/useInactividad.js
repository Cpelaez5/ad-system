import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Bloqueo de sesión por inactividad (ver docs/mvp/diseno/sesion-inactividad.md).
 *
 * Dos capas:
 *  - `crearControlInactividad(opciones)`: lógica pura, sin Vue (se prueba con tiempo simulado).
 *  - `useInactividad(opciones)`: envoltorio para componentes (estado reactivo + ciclo de vida).
 *
 * Estados: 'activo' -> 'aviso' (últimos `avisoMs`) -> 'bloqueado'.
 * Sincronía entre pestañas: `localStorage` (ad_ultima_actividad, ad_sesion_bloqueada)
 * y `BroadcastChannel` cuando existe. Una pestaña activa mantiene vivas a las otras; si una
 * se bloquea, se bloquean todas; al desbloquear una, se desbloquean todas.
 */

export const CLAVE_ULTIMA_ACTIVIDAD = 'ad_ultima_actividad'
export const CLAVE_BLOQUEADA = 'ad_sesion_bloqueada'
const NOMBRE_CANAL = 'ad_inactividad'

export const UMBRAL_POR_DEFECTO_MS = 20 * 60 * 1000
export const AVISO_POR_DEFECTO_MS = 60 * 1000
const THROTTLE_MS = 1000
const TICK_MS = 1000

const EVENTOS_ACTIVIDAD = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll', 'wheel']

/** En desarrollo, `?inactividad=10` fija el umbral en 10 s para probar a mano. */
export function umbralDesdeUrl(search, esDev) {
  if (!esDev) return null
  try {
    const v = Number(new URLSearchParams(search || '').get('inactividad'))
    return Number.isFinite(v) && v > 0 ? v * 1000 : null
  } catch {
    return null
  }
}

function almacenSeguro(almacen) {
  return {
    get(k) { try { return almacen?.getItem(k) } catch { return null } },
    set(k, v) { try { almacen?.setItem(k, String(v)) } catch { /* modo privado */ } },
    del(k) { try { almacen?.removeItem(k) } catch { /* modo privado */ } },
  }
}

export function crearControlInactividad({
  umbralMs = UMBRAL_POR_DEFECTO_MS,
  avisoMs = AVISO_POR_DEFECTO_MS,
  ahora = () => Date.now(),
  almacen = typeof localStorage !== 'undefined' ? localStorage : null,
  crearCanal = () => (typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(NOMBRE_CANAL) : null),
  identidad = '', // correo del usuario: un bloqueo de otra cuenta no se hereda
  onEstado = () => {},
  onTick = () => {},
} = {}) {
  const store = almacenSeguro(almacen)
  // El aviso nunca dura más de la mitad del umbral (umbrales cortos de prueba).
  const aviso = Math.min(avisoMs, Math.floor(umbralMs / 2))
  let estado = 'activo'
  let ultimaLocal = ahora()
  let ultimaEscritura = 0
  let temporizador = null
  let canal = null
  let corriendo = false

  function ultimaCompartida() {
    const n = Number(store.get(CLAVE_ULTIMA_ACTIVIDAD))
    return Math.max(ultimaLocal, Number.isFinite(n) ? n : 0)
  }

  function fijar(nuevo) {
    if (nuevo === estado) return
    estado = nuevo
    onEstado(estado)
  }

  function avisarOtras(tipo) {
    try { canal?.postMessage({ tipo }) } catch { /* canal cerrado */ }
  }

  function evaluar() {
    if (!corriendo) return
    if (store.get(CLAVE_BLOQUEADA)) { fijar('bloqueado'); return }
    if (estado === 'bloqueado') fijar('activo') // otra pestaña desbloqueó
    const inactivo = ahora() - ultimaCompartida()
    onTick(Math.max(0, umbralMs - inactivo))
    if (inactivo >= umbralMs) {
      store.set(CLAVE_BLOQUEADA, identidad || '1')
      avisarOtras('bloqueado')
      fijar('bloqueado')
    } else if (inactivo >= umbralMs - aviso) {
      fijar('aviso')
    } else {
      fijar('activo')
    }
  }

  /** Marca actividad. Con throttle de 1 s; se ignora mientras está bloqueado. */
  function marcarActividad(forzar = false) {
    if (!corriendo || estado === 'bloqueado') return
    const t = ahora()
    ultimaLocal = t
    if (forzar || t - ultimaEscritura >= THROTTLE_MS) {
      ultimaEscritura = t
      store.set(CLAVE_ULTIMA_ACTIVIDAD, t)
      avisarOtras('actividad')
    }
    if (estado === 'aviso') fijar('activo')
  }

  /** Tras verificar la contraseña. Desbloquea todas las pestañas. */
  function desbloquear() {
    const t = ahora()
    ultimaLocal = t
    ultimaEscritura = t
    store.del(CLAVE_BLOQUEADA)
    store.set(CLAVE_ULTIMA_ACTIVIDAD, t)
    avisarOtras('desbloqueado')
    fijar('activo')
  }

  /** Bloqueo manual (también lo usan las pruebas). */
  function bloquear() {
    store.set(CLAVE_BLOQUEADA, identidad || '1')
    avisarOtras('bloqueado')
    fijar('bloqueado')
  }

  function alCambiarAlmacen(e) {
    if (!e || e.key === null || e.key === CLAVE_BLOQUEADA || e.key === CLAVE_ULTIMA_ACTIVIDAD) evaluar()
  }
  function alVolverAVer() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      // Si la pestaña estuvo oculta más del umbral, evaluar() bloquea ANTES de contar el
      // regreso como actividad; si no, el regreso es actividad.
      evaluar()
      if (estado !== 'bloqueado') marcarActividad(true)
    }
  }
  const alActividad = () => marcarActividad()

  function iniciar() {
    if (corriendo) return
    corriendo = true
    const marca = store.get(CLAVE_BLOQUEADA)
    // Un bloqueo de otra cuenta no se hereda.
    if (marca && identidad && marca !== identidad && marca !== '1') store.del(CLAVE_BLOQUEADA)
    if (!store.get(CLAVE_BLOQUEADA)) {
      ultimaLocal = ahora()
      ultimaEscritura = ultimaLocal
      store.set(CLAVE_ULTIMA_ACTIVIDAD, ultimaLocal)
    }
    try {
      canal = crearCanal()
      if (canal) canal.onmessage = () => evaluar()
    } catch { canal = null }
    if (typeof window !== 'undefined') {
      EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, alActividad, { passive: true, capture: true }))
      window.addEventListener('storage', alCambiarAlmacen)
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', alVolverAVer)
    temporizador = setInterval(evaluar, TICK_MS)
    evaluar()
  }

  function detener({ limpiar = false } = {}) {
    corriendo = false
    if (temporizador) clearInterval(temporizador)
    temporizador = null
    if (typeof window !== 'undefined') {
      EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, alActividad, { capture: true }))
      window.removeEventListener('storage', alCambiarAlmacen)
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', alVolverAVer)
    try { canal?.close() } catch { /* ya cerrado */ }
    canal = null
    if (limpiar) {
      store.del(CLAVE_BLOQUEADA)
      store.del(CLAVE_ULTIMA_ACTIVIDAD)
    }
  }

  return {
    iniciar, detener, marcarActividad, desbloquear, bloquear, evaluar,
    get estado() { return estado },
  }
}

// ── Actividad desde tareas largas (subidas, espera de la IA) ──────────────────────────
// Un único control activo por pestaña; `marcarActividad()` es seguro de llamar siempre
// (no hace nada si no hay sesión montada).
let controlActivo = null
export function marcarActividad() {
  controlActivo?.marcarActividad(true)
}

export function useInactividad({ umbralMs, avisoMs, identidad } = {}) {
  const estado = ref('activo')
  const restanteSeg = ref(0)
  const esDev = !!import.meta.env?.DEV
  const desdeUrl = umbralDesdeUrl(typeof location !== 'undefined' ? location.search : '', esDev)
  const control = crearControlInactividad({
    umbralMs: desdeUrl ?? umbralMs ?? UMBRAL_POR_DEFECTO_MS,
    avisoMs,
    identidad,
    onEstado: (e) => { estado.value = e },
    onTick: (ms) => { restanteSeg.value = Math.ceil(ms / 1000) },
  })
  onMounted(() => { controlActivo = control; control.iniciar() })
  onBeforeUnmount(() => {
    if (controlActivo === control) controlActivo = null
    control.detener()
  })
  return {
    estado,
    restanteSeg,
    marcarActividad: () => control.marcarActividad(true),
    desbloquear: () => control.desbloquear(),
    /** Cierre de sesión: olvida el bloqueo para que la próxima cuenta empiece limpia. */
    limpiar: () => control.detener({ limpiar: true }),
  }
}
