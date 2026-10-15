/**
 * tasasAdmin.js — cálculo PURO de la tabla de tasas globales y de sus huecos
 * (días de lunes a viernes sin tasa) para el panel del super admin.
 */
import { CODIGOS_CON_TASA, parsearTasaEscrita } from '@/utils/monedas.js'
import { hoyISO, parseFechaLocal } from '@/utils/fechas.js'

export const DIAS_HABILES_TABLA = 60
export const FUENTE_MANUAL = 'MANUAL-SUPERADMIN'
export const TEXTO_HORARIO = 'Las tasas se guardan solas de lunes a viernes a las 10:00 y 18:00 (Caracas)'

/** true si la fecha 'YYYY-MM-DD' cae de lunes a viernes. */
export function esDiaHabil(fechaISO) {
  const d = parseFechaLocal(fechaISO)
  if (!d) return false
  const dia = d.getDay()
  return dia >= 1 && dia <= 5
}

/** Los últimos `cantidad` días hábiles terminando en `hoy` (si es hábil), del más reciente al más antiguo. */
export function ultimosDiasHabiles(cantidad = DIAS_HABILES_TABLA, hoy = new Date()) {
  const lista = []
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  while (lista.length < cantidad) {
    if (d.getDay() >= 1 && d.getDay() <= 5) lista.push(hoyISO(d))
    d.setDate(d.getDate() - 1)
  }
  return lista
}

/**
 * Tabla por día hábil: { fecha, tasas: { USD: {tasa, fuente} }, faltan: [monedas], vacio, hueco }.
 * `hueco` = día hábil ANTERIOR a hoy sin ninguna tasa (hoy aún puede estar por llegar).
 */
export function construirTablaTasas(filas = [], { cantidad = DIAS_HABILES_TABLA, hoy = new Date(), monedas = CODIGOS_CON_TASA } = {}) {
  const dias = ultimosDiasHabiles(cantidad, hoy)
  const hoyStr = hoyISO(hoy)
  const porFecha = new Map()
  for (const f of filas) {
    const fecha = String(f.date || '').slice(0, 10)
    if (!porFecha.has(fecha)) porFecha.set(fecha, {})
    porFecha.get(fecha)[f.currency] = { tasa: Number(f.rate), fuente: f.source || '' }
  }
  return dias.map((fecha) => {
    const tasas = porFecha.get(fecha) || {}
    const faltan = monedas.filter((m) => !tasas[m])
    const vacio = Object.keys(tasas).length === 0
    return { fecha, tasas, faltan, vacio, hueco: vacio && fecha < hoyStr }
  })
}

/** Fechas (ascendente) de los días hábiles pasados sin ninguna tasa. */
export function huecosDeTasas(tabla = []) {
  return tabla.filter((f) => f.hueco).map((f) => f.fecha).sort()
}

/** "Faltan 3 días" / "Falta 1 día" / "No falta ningún día". */
export function textoFaltan(n) {
  if (!n) return 'No falta ningún día'
  return n === 1 ? 'Falta 1 día' : `Faltan ${n} días`
}

/** Valida el formulario "Corregir o agregar tasa". Devuelve { ok, errores, valor }. */
export function validarTasaManual({ fecha, moneda, tasaTexto } = {}, hoy = new Date()) {
  const errores = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) || !parseFechaLocal(fecha)) errores.fecha = 'Elige una fecha.'
  else if (fecha > hoyISO(hoy)) errores.fecha = 'La fecha no puede ser futura.'
  if (!CODIGOS_CON_TASA.includes(moneda)) errores.moneda = 'Elige la moneda.'
  const tasa = parsearTasaEscrita(tasaTexto)
  if (!tasa) errores.tasa = 'Escribe la tasa en bolívares, por ejemplo 104,25.'
  const ok = Object.keys(errores).length === 0
  return { ok, errores, valor: ok ? { date: fecha, currency: moneda, rate: tasa, source: FUENTE_MANUAL } : null }
}
