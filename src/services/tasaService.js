/**
 * tasaService.js — tasa de cambio VIGENTE del negocio: automática (BCV vía bcvService)
 * o definida por el cliente (manual). Especificación: docs/mvp/diseno/tasas-de-cambio.md.
 *
 * - Preferencia en `clients`: tasa_modo, tasas_manuales (jsonb { USD: { tasa, fecha } }),
 *   tasa_aviso_aceptado_en. El cliente puede actualizar su propia fila (como `rubro`).
 * - Automática: usa bcvService. Si falla, se usa la última tasa conocida y `fallo` = true.
 * - Manual: usa SOLO las tasas del cliente. NUNCA llama al servicio para reemplazarlas.
 * - `desactualizada` = la tasa tiene más de 1 día.
 * - Staff (admin/contador) que mira a un cliente pasa `{ clientId }`; sin contexto,
 *   la preferencia es automática.
 */
import { supabase } from '@/lib/supabaseClient'
import { getCurrentClientId } from '@/utils/tenantHelpers'
import bcvService from '@/services/bcvService.js'
import { hoyISO, parseFechaLocal } from '@/utils/fechas.js'
import { CODIGOS_CON_TASA, normalizarTasas } from '@/utils/monedas.js'

export const EVENTO_TASA_CAMBIO = 'ad-tasa-changed'

const PREFERENCIA_POR_DEFECTO = Object.freeze({ modo: 'automatica', tasas: {}, avisoAceptadoEn: null })

let ultimaAutomatica = null // última respuesta buena del servicio (para `fallo`)

/** Días enteros entre una fecha 'YYYY-MM-DD' y hoy (0 si no se entiende). */
export function diasDeAntiguedad(fecha, ahora = new Date()) {
  const f = parseFechaLocal(fecha)
  if (!f) return 0
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  return Math.max(0, Math.round((hoy - f) / 86400000))
}

/** Limpia `tasas_manuales` de la BD a `{ USD: { tasa, fecha } }` (solo válidas). */
function limpiarManuales(raw) {
  const salida = {}
  if (!raw || typeof raw !== 'object') return salida
  for (const cod of CODIGOS_CON_TASA) {
    const v = raw[cod]
    const tasa = Number(v && typeof v === 'object' ? v.tasa : v)
    if (!Number.isFinite(tasa) || tasa <= 0) continue
    const fecha = v && typeof v === 'object' && v.fecha ? String(v.fecha).slice(0, 10) : null
    salida[cod] = { tasa, fecha }
  }
  return salida
}

/**
 * Preferencia del negocio. Nunca lanza: ante cualquier problema devuelve automática.
 * @param {{ clientId?: string }} [opciones] clientId explícito (staff viendo a un cliente)
 * @returns {Promise<{ modo: 'automatica'|'manual', tasas: Object, avisoAceptadoEn: string|null }>}
 */
export async function preferencia({ clientId } = {}) {
  try {
    const id = clientId || getCurrentClientId()
    if (!id) return { ...PREFERENCIA_POR_DEFECTO }
    const { data, error } = await supabase
      .from('clients')
      .select('tasa_modo, tasas_manuales, tasa_aviso_aceptado_en')
      .eq('id', id)
      .maybeSingle()
    if (error || !data) return { ...PREFERENCIA_POR_DEFECTO }
    return {
      modo: data.tasa_modo === 'manual' ? 'manual' : 'automatica',
      tasas: limpiarManuales(data.tasas_manuales),
      avisoAceptadoEn: data.tasa_aviso_aceptado_en || null
    }
  } catch {
    return { ...PREFERENCIA_POR_DEFECTO }
  }
}

/**
 * Guarda la preferencia. `tasas` = { USD: { tasa, fecha? } | número }. Si no trae
 * fecha, se usa hoy. `avisoAceptado: true` guarda la fecha de aceptación del aviso.
 * Devuelve { ok } o { ok: false, error }.
 */
export async function guardarPreferencia({ modo, tasas = {}, avisoAceptado = false, clientId } = {}) {
  if (modo !== 'automatica' && modo !== 'manual') return { ok: false, error: 'Modo no válido' }
  const hoy = hoyISO()
  const manuales = {}
  for (const cod of CODIGOS_CON_TASA) {
    const v = tasas?.[cod]
    if (v === undefined || v === null || v === '') continue
    const tasa = Number(v && typeof v === 'object' ? v.tasa : v)
    if (!Number.isFinite(tasa) || tasa <= 0) {
      return { ok: false, error: 'Revisa las tasas: deben ser números mayores que cero.' }
    }
    const fecha = v && typeof v === 'object' && v.fecha ? String(v.fecha).slice(0, 10) : hoy
    manuales[cod] = { tasa, fecha }
  }
  if (modo === 'manual' && Object.keys(manuales).length === 0) {
    return { ok: false, error: 'Escribe al menos una tasa para usar tus propias tasas.' }
  }
  try {
    const id = clientId || getCurrentClientId()
    if (!id) return { ok: false, error: 'No pudimos identificar tu negocio.' }
    const cambios = { tasa_modo: modo, tasas_manuales: manuales }
    if (avisoAceptado) cambios.tasa_aviso_aceptado_en = new Date().toISOString()
    const { error } = await supabase.from('clients').update(cambios).eq('id', id)
    if (error) return { ok: false, error: 'No pudimos guardar la tasa. Intenta de nuevo.' }
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO_TASA_CAMBIO))
    return { ok: true }
  } catch {
    return { ok: false, error: 'No pudimos guardar la tasa. Intenta de nuevo.' }
  }
}

/**
 * Tasas vigentes del negocio.
 * @returns {Promise<{ tasas: {USD?,EUR?,CNY?,TRY?,RUB?}, modo, fecha: string|null,
 *   fuente: string, desactualizada: boolean, fallo: boolean }>}
 */
export async function tasasVigentes({ clientId, ahora = new Date() } = {}) {
  const pref = await preferencia({ clientId })

  if (pref.modo === 'manual') {
    const tasas = normalizarTasas(pref.tasas)
    const fechas = Object.values(pref.tasas).map((v) => v.fecha).filter(Boolean).sort()
    const masVieja = fechas[0] || null
    return {
      tasas,
      modo: 'manual',
      fecha: masVieja,
      fuente: 'MANUAL',
      desactualizada: masVieja ? diasDeAntiguedad(masVieja, ahora) > 1 : true,
      fallo: false
    }
  }

  let respuesta = null
  try {
    respuesta = await bcvService.getCurrentRate()
  } catch {
    respuesta = null
  }
  if (respuesta?.success && respuesta.data) {
    const tasas = normalizarTasas(respuesta.data)
    const fecha = respuesta.data.date || hoyISO(ahora)
    const deRespaldo = respuesta.data.source === 'DB-Fallback'
    if (!deRespaldo) ultimaAutomatica = { tasas, fecha, fuente: respuesta.data.source || 'BCV' }
    return {
      tasas,
      modo: 'automatica',
      fecha,
      fuente: respuesta.data.source || 'BCV',
      desactualizada: diasDeAntiguedad(fecha, ahora) > 1,
      fallo: deRespaldo
    }
  }
  // El servicio no respondió: última tasa conocida (si la hay) y aviso.
  if (ultimaAutomatica) {
    return {
      tasas: { ...ultimaAutomatica.tasas },
      modo: 'automatica',
      fecha: ultimaAutomatica.fecha,
      fuente: ultimaAutomatica.fuente,
      desactualizada: diasDeAntiguedad(ultimaAutomatica.fecha, ahora) > 1,
      fallo: true
    }
  }
  return { tasas: {}, modo: 'automatica', fecha: null, fuente: 'NINGUNA', desactualizada: true, fallo: true }
}

/**
 * Monedas distintas de VES que el negocio ya usó en sus facturas (para ofrecerle
 * su tasa en "Tasa de cambio"). Nunca lanza: ante cualquier problema devuelve [].
 */
export async function monedasUsadas({ clientId } = {}) {
  try {
    const id = clientId || getCurrentClientId()
    if (!id) return []
    const { data, error } = await supabase
      .from('invoices')
      .select('moneda:financial->>currency')
      .eq('client_id', id)
      .is('deleted_at', null)
      .limit(1000)
    if (error || !Array.isArray(data)) return []
    const usadas = new Set(data.map((f) => f?.moneda).filter((m) => CODIGOS_CON_TASA.includes(m)))
    return CODIGOS_CON_TASA.filter((c) => usadas.has(c))
  } catch {
    return []
  }
}

/** Solo para tests: olvida la última tasa conocida. */
export function _reiniciar() {
  ultimaAutomatica = null
}

export default { preferencia, guardarPreferencia, tasasVigentes, monedasUsadas, diasDeAntiguedad }
