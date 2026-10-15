/**
 * Fechas en hora local de Venezuela.
 *
 * `new Date('2026-10-13')` interpreta la fecha como medianoche UTC, que en
 * Caracas (UTC-4) es el 12 a las 8 pm: al mostrarla sale el día anterior.
 * Y `new Date().toISOString().split('T')[0]` da la fecha UTC, que después de
 * las 8 pm de Caracas ya es mañana. Estas utilidades evitan ambos errores.
 */

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

/** Fecha de hoy en hora local como 'YYYY-MM-DD'. */
export function hoyISO(referencia = new Date()) {
  const y = referencia.getFullYear()
  const m = String(referencia.getMonth() + 1).padStart(2, '0')
  const d = String(referencia.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Convierte 'YYYY-MM-DD' (o un ISO con hora, o un Date) en un Date local.
 * Las fechas sin hora quedan a medianoche LOCAL, no UTC.
 */
export function parseFechaLocal(valor) {
  if (!valor) return null
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor
  const texto = String(valor).trim()
  const soloFecha = texto.match(SOLO_FECHA) || texto.match(/^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?(?:Z|[+-]00:?00)?$/)
  if (soloFecha) {
    const [, y, m, d] = soloFecha
    return new Date(Number(y), Number(m) - 1, Number(d))
  }
  const fecha = new Date(texto)
  return isNaN(fecha.getTime()) ? null : fecha
}

/** 'DD/MM/AAAA' en hora local. Devuelve '' si no hay fecha válida. */
export function formatFechaCorta(valor) {
  const fecha = parseFechaLocal(valor)
  if (!fecha) return ''
  const d = String(fecha.getDate()).padStart(2, '0')
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${fecha.getFullYear()}`
}

/** toLocaleDateString sobre la fecha local (mismas opciones que Intl). */
export function formatFechaLocal(valor, opciones = { day: '2-digit', month: '2-digit', year: 'numeric' }, locale = 'es-VE') {
  const fecha = parseFechaLocal(valor)
  return fecha ? fecha.toLocaleDateString(locale, opciones) : ''
}

/** Hora de un instante ISO en Caracas, para personas: "3:42 p. m.". '' si no se entiende. */
export function horaCaracas(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' }).format(d)
}
