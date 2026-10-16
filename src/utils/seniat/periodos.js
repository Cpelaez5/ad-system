/**
 * periodos.js — períodos fiscales del SENIAT (mes AAAAMM y quincenas). Función pura.
 * Los meses van de 1 a 12 (no 0-11) para no confundirse con Date.
 */

const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const dos = (n) => String(n).padStart(2, '0')

/** (2026, 10) → '202610'. */
export function aaaamm(anio, mes) {
  return `${anio}${dos(mes)}`
}

/** '202610' → { anio: 2026, mes: 10 }; null si no es un AAAAMM válido. */
export function parsePeriodo(periodo) {
  const m = String(periodo || '').match(/^(\d{4})(0[1-9]|1[0-2])$/)
  return m ? { anio: Number(m[1]), mes: Number(m[2]) } : null
}

/** Último día del mes (1..12). */
export function ultimoDiaDelMes(anio, mes) {
  return new Date(anio, mes, 0).getDate()
}

/**
 * Mes que corresponde declarar "hoy": antes del día 16 se muestra el mes anterior
 * (quedan la 2da quincena y el ISLR); desde el 16, el mes en curso.
 * @param {Date} [hoy]
 * @returns {string} AAAAMM
 */
export function periodoPorDefecto(hoy = new Date()) {
  let anio = hoy.getFullYear()
  let mes = hoy.getMonth() + 1
  if (hoy.getDate() < 16) {
    mes -= 1
    if (mes === 0) { mes = 12; anio -= 1 }
  }
  return aaaamm(anio, mes)
}

/** Mes anterior o siguiente (delta = -1 / +1). */
export function moverPeriodo(periodo, delta) {
  const p = parsePeriodo(periodo)
  if (!p) return null
  const total = p.anio * 12 + (p.mes - 1) + delta
  return aaaamm(Math.floor(total / 12), (total % 12) + 1)
}

/** Los `cantidad` meses más recientes empezando por el período por defecto, del más nuevo al más viejo. */
export function periodosRecientes(hoy = new Date(), cantidad = 6) {
  const lista = []
  let actual = periodoPorDefecto(hoy)
  for (let i = 0; i < cantidad; i += 1) {
    lista.push(actual)
    actual = moverPeriodo(actual, -1)
  }
  return lista
}

/** '202610' → 'Octubre 2026' (o 'Octubre' si se pide corto). */
export function nombrePeriodo(periodo, { corto = false } = {}) {
  const p = parsePeriodo(periodo)
  if (!p) return ''
  const mes = NOMBRES_MES[p.mes - 1]
  return corto ? mes : `${mes} ${p.anio}`
}

/** Rango del mes completo: { desde: '2026-10-01', hasta: '2026-10-31' }. */
export function rangoPeriodo(periodo) {
  const p = parsePeriodo(periodo)
  if (!p) return null
  return { desde: `${p.anio}-${dos(p.mes)}-01`, hasta: `${p.anio}-${dos(p.mes)}-${dos(ultimoDiaDelMes(p.anio, p.mes))}` }
}

/** Rango de la quincena 1 (días 1 al 15) o 2 (16 a fin de mes). */
export function rangoQuincena(periodo, quincena) {
  const p = parsePeriodo(periodo)
  if (!p || ![1, 2].includes(Number(quincena))) return null
  const base = `${p.anio}-${dos(p.mes)}`
  return Number(quincena) === 1
    ? { desde: `${base}-01`, hasta: `${base}-15` }
    : { desde: `${base}-16`, hasta: `${base}-${dos(ultimoDiaDelMes(p.anio, p.mes))}` }
}

/** Texto de la quincena: '1ra quincena · 1 al 15'. */
export function textoQuincena(periodo, quincena) {
  const r = rangoQuincena(periodo, quincena)
  if (!r) return ''
  const ini = Number(r.desde.slice(8))
  const fin = Number(r.hasta.slice(8))
  return `${Number(quincena) === 1 ? '1ra' : '2da'} quincena · ${ini} al ${fin}`
}

/** Toma 'AAAA-MM-DD' de una fecha o timestamp ISO. '' si no hay. */
export function soloFecha(valor) {
  const m = String(valor || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

/** AAAAMM de una fecha 'AAAA-MM-DD' (o timestamp). '' si no hay. */
export function periodoDeFecha(valor) {
  const f = soloFecha(valor)
  return f ? f.slice(0, 4) + f.slice(5, 7) : ''
}

/** 1 si el día es 1..15; 2 si es 16..31; null si no hay fecha. */
export function quincenaDeFecha(valor) {
  const f = soloFecha(valor)
  if (!f) return null
  return Number(f.slice(8)) <= 15 ? 1 : 2
}

/** ¿La fecha cae dentro del período (y de la quincena, si se indica)? */
export function fechaEnPeriodo(valor, periodo, quincena = null) {
  if (periodoDeFecha(valor) !== periodo) return false
  return quincena ? quincenaDeFecha(valor) === Number(quincena) : true
}
