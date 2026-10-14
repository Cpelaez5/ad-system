/**
 * monedas.js — lógica pura de monedas y tasas de cambio (una sola para todo el sistema).
 * Especificación: docs/mvp/diseno/tasas-de-cambio.md.
 *
 * Convenciones:
 * - `tasas` = bolívares por UNA unidad de cada moneda: { USD, EUR, CNY, TRY, RUB }. VES siempre vale 1.
 * - Una factura se convierte con SU tasa guardada (la del día en que se registró); si no la
 *   tiene, con la tasa vigente del negocio y el resultado se marca como aproximado.
 * - Si no hay ninguna tasa, el monto NO se inventa: `convertir` devuelve null y
 *   `montoFacturaEn` devuelve sinTasa = true (la pantalla dice "N facturas sin tasa").
 */

/** Monedas que maneja el sistema (las del BCV). */
export const MONEDAS = Object.freeze({
  VES: { codigo: 'VES', simbolo: 'Bs', nombre: 'Bolívar' },
  USD: { codigo: 'USD', simbolo: '$', nombre: 'Dólar' },
  EUR: { codigo: 'EUR', simbolo: '€', nombre: 'Euro' },
  CNY: { codigo: 'CNY', simbolo: '¥', nombre: 'Yuan' },
  TRY: { codigo: 'TRY', simbolo: '₺', nombre: 'Lira turca' },
  RUB: { codigo: 'RUB', simbolo: '₽', nombre: 'Rublo' },
})

/** Códigos en orden de presentación. */
export const CODIGOS_MONEDA = Object.freeze(['VES', 'USD', 'EUR', 'CNY', 'TRY', 'RUB'])
/** Monedas con tasa (todas menos el bolívar). */
export const CODIGOS_CON_TASA = Object.freeze(['USD', 'EUR', 'CNY', 'TRY', 'RUB'])
/** Las que el formulario de registro muestra a la vista. */
export const MONEDAS_VISTA = Object.freeze(['VES', 'USD', 'EUR'])
/** Las que van bajo "Otra moneda". */
export const MONEDAS_OTRAS = Object.freeze(['CNY', 'TRY', 'RUB'])

export function esMonedaValida(codigo) {
  return Object.prototype.hasOwnProperty.call(MONEDAS, codigo)
}

export function simboloDe(codigo) {
  return MONEDAS[codigo]?.simbolo || codigo || 'Bs'
}

export function nombreDe(codigo) {
  return MONEDAS[codigo]?.nombre || codigo || ''
}

function positivo(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Normaliza lo que haya a `{ USD, EUR, CNY, TRY, RUB }` (solo las válidas):
 * - un número → es la tasa del dólar (compatibilidad con código viejo);
 * - la forma de bcvService (`dollar`, `euro`, `yuan`, `lira`, `rublo`);
 * - la forma de `tasas_manuales` (`{ USD: { tasa, fecha } }`);
 * - ya normalizada.
 */
export function normalizarTasas(entrada) {
  const salida = {}
  if (entrada == null) return salida
  if (typeof entrada === 'number' || typeof entrada === 'string') {
    const usd = positivo(entrada)
    if (usd) salida.USD = usd
    return salida
  }
  if (typeof entrada !== 'object') return salida
  const alias = { USD: 'dollar', EUR: 'euro', CNY: 'yuan', TRY: 'lira', RUB: 'rublo' }
  for (const cod of CODIGOS_CON_TASA) {
    let v = entrada[cod]
    if (v && typeof v === 'object') v = v.tasa
    if (v == null) v = entrada[alias[cod]]
    const n = positivo(v)
    if (n) salida[cod] = n
  }
  return salida
}

/**
 * Tasas guardadas en una factura: `financial.tasas` primero; si falta una moneda,
 * `exchangeRate` (USD) y `exchangeRateEur` (EUR). `exchangeRate` = 1 es el valor de
 * relleno del formulario (no una tasa real), así que se ignora.
 */
export function tasasDeFactura(inv) {
  const f = inv?.financial || {}
  const tasas = normalizarTasas(f.tasas)
  if (!tasas.USD) {
    const usd = positivo(f.exchangeRate)
    if (usd && usd > 1) tasas.USD = usd
  }
  if (!tasas.EUR) {
    const eur = positivo(f.exchangeRateEur)
    if (eur && eur > 1) tasas.EUR = eur
  }
  return tasas
}

function bsPorUnidad(moneda, tasas) {
  if (!moneda || moneda === 'VES') return 1
  return positivo(tasas?.[moneda])
}

/**
 * Convierte `monto` de la moneda `de` a la moneda `a`. VES = 1.
 * Devuelve null si falta una tasa necesaria (nunca 0). Un monto de 0 devuelve 0.
 */
export function convertir(monto, de, a, tasas) {
  const n = Number(monto)
  if (!Number.isFinite(n)) return null
  const origen = de || 'VES'
  const destino = a || 'VES'
  if (origen === destino) return n
  if (n === 0) return 0
  const t = normalizarTasas(tasas)
  const rOrigen = bsPorUnidad(origen, t)
  const rDestino = bsPorUnidad(destino, t)
  if (!rOrigen || !rDestino) return null
  return (n * rOrigen) / rDestino
}

/** Moneda de una factura (sin moneda = bolívares). */
export function monedaDeFactura(inv) {
  return inv?.financial?.currency || 'VES'
}

/**
 * Monto de una factura (por defecto `financial.totalSales`; se puede pasar otro con
 * `opciones.monto`, p. ej. una retención) en `monedaDestino`.
 * Usa primero las tasas de la factura y después las vigentes.
 * @returns {{ monto: number, aproximado: boolean, sinTasa: boolean }}
 */
export function montoFacturaEn(inv, monedaDestino, tasasVigentes, opciones = {}) {
  const bruto = opciones.monto !== undefined ? opciones.monto : inv?.financial?.totalSales
  const n = Number(bruto) || 0
  const origen = monedaDeFactura(inv)
  const destino = monedaDestino || 'VES'
  if (!n || origen === destino) return { monto: n, aproximado: false, sinTasa: false }

  const propias = tasasDeFactura(inv)
  const vigentes = normalizarTasas(tasasVigentes)
  let aproximado = false
  const combinadas = {}
  for (const moneda of [origen, destino]) {
    if (moneda === 'VES') continue
    if (propias[moneda]) combinadas[moneda] = propias[moneda]
    else if (vigentes[moneda]) {
      combinadas[moneda] = vigentes[moneda]
      aproximado = true
    }
  }
  const monto = convertir(n, origen, destino, combinadas)
  if (monto === null) return { monto: 0, aproximado: false, sinTasa: true }
  return { monto, aproximado, sinTasa: false }
}

/**
 * Suma `facturas` en `monedaDestino`. `obtener(inv)` opcional devuelve el monto a sumar
 * (por defecto el total). Las facturas sin tasa quedan fuera y se cuentan.
 * @returns {{ total: number, aproximadas: number, sinTasa: number }}
 */
export function sumarFacturasEn(facturas, monedaDestino, tasasVigentes, obtener) {
  let total = 0
  let aproximadas = 0
  let sinTasa = 0
  for (const inv of facturas || []) {
    const opciones = obtener ? { monto: obtener(inv) } : {}
    const r = montoFacturaEn(inv, monedaDestino, tasasVigentes, opciones)
    if (r.sinTasa) sinTasa++
    else {
      total += r.monto
      if (r.aproximado) aproximadas++
    }
  }
  return { total, aproximadas, sinTasa }
}

/**
 * Lee una tasa escrita a mano: "877,9", "877.9", "1.234,56" → número.
 * Devuelve null si no es un número mayor que cero.
 */
export function parsearTasa(texto) {
  if (typeof texto === 'number') return texto > 0 && Number.isFinite(texto) ? texto : null
  let t = String(texto ?? '').trim().replace(/\s/g, '').replace(/^(Bs\.?|VES)/i, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return positivo(t)
}

/** "1 factura sin tasa" / "3 facturas sin tasa" (o '' si no hay). */
export function textoSinTasa(cantidad) {
  const n = Number(cantidad) || 0
  if (n <= 0) return ''
  return n === 1 ? '1 factura sin tasa' : `${n} facturas sin tasa`
}
