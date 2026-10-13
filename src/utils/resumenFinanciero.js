/**
 * Cálculos puros para la pantalla "¿Cómo voy?" del cliente
 * (src/views/cliente/Dashboard.vue): agrupar por mes, top categorías de
 * gasto, top clientes y comparación en lenguaje llano contra el período
 * anterior. Ninguna función aquí llama a un servicio ni lee `Date.now()`
 * sin que se le pase como parámetro — reciben los datos ya cargados
 * (facturas de `invoiceService.getInvoices`) y, cuando hace falta "hoy",
 * una `fechaReferencia` con valor por defecto para que los tests puedan
 * fijarla.
 *
 * Fechas siempre en hora local vía `parseFechaLocal` (src/utils/fechas.js)
 * — nunca `new Date('YYYY-MM-DD')` directo, que en Venezuela (UTC-4)
 * corre la fecha un día.
 */
import { parseFechaLocal } from './fechas'

export const SIN_CATEGORIA = 'Sin categoría'
export const SIN_NOMBRE_CLIENTE = 'Cliente sin nombre'

/**
 * Convierte un monto a USD con una tasa BCV ya conocida (VES se divide por
 * la tasa del dólar, EUR se pasa primero a VES con la tasa del euro y luego
 * a USD). Si no hay tasa disponible (o es 0), el monto se devuelve tal cual
 * para no partir por cero — uso de bajo nivel para quien ya tiene un número
 * de tasa en la mano; `obtenerMontoUsd`/`sumarMontosUsd` (abajo) son los que
 * debe usar una factura real, porque aplican la regla completa del
 * hallazgo #5 (tasa guardada en la factura primero, nunca sumar Bs como USD).
 * @param {number} monto
 * @param {string} moneda 'USD' | 'VES' | 'EUR'
 * @param {{dollar?: number, euro?: number}} tasaBcv
 */
export function convertirAUsd(monto, moneda, tasaBcv = {}) {
  const valor = Number(monto) || 0
  const dollar = Number(tasaBcv?.dollar) || 0
  const euro = Number(tasaBcv?.euro) || 0

  if (moneda === 'VES') {
    return dollar > 0 ? valor / dollar : valor
  }
  if (moneda === 'EUR') {
    return euro > 0 && dollar > 0 ? (valor * euro) / dollar : valor
  }
  return valor
}

/** Tasa Bs/USD a usar para una factura: primero la que ella misma guardó al emitirse. */
function tasaDolarFactura(factura, tasaBcv) {
  return Number(factura?.financial?.exchangeRate) || Number(tasaBcv?.dollar) || 0
}

/** Tasa Bs/EUR a usar para una factura: primero la que ella misma guardó al emitirse. */
function tasaEuroFactura(factura, tasaBcv) {
  return Number(factura?.financial?.exchangeRateEur) || Number(tasaBcv?.euro) || 0
}

/**
 * Monto en USD de una factura (`financial.totalSales` + `financial.currency`).
 *
 * Regla de conversión (revisión del shell/dashboard, hallazgo #5 Importante):
 * 1. primero la tasa que la propia factura guardó al emitirse
 *    (`financial.exchangeRate` / `financial.exchangeRateEur`, la tasa del
 *    día en que se registró);
 * 2. si falta, la tasa BCV actual (`tasaBcv`, cargada por el dashboard);
 * 3. si tampoco hay ninguna, la factura se **excluye** (`excluida: true`) —
 *    nunca se suman bolívares como si fueran dólares (antes, sin tasa,
 *    `convertirAUsd` devolvía el monto en Bs tal cual y se sumaba a USD).
 * @returns {{valor: number, excluida: boolean}}
 */
export function obtenerMontoUsd(factura, tasaBcv) {
  const monto = Number(factura?.financial?.totalSales) || 0
  const moneda = factura?.financial?.currency || 'VES'

  if (moneda === 'USD') {
    return { valor: monto, excluida: false }
  }

  if (moneda === 'VES') {
    const tasa = tasaDolarFactura(factura, tasaBcv)
    if (tasa <= 0) return { valor: 0, excluida: true }
    return { valor: monto / tasa, excluida: false }
  }

  if (moneda === 'EUR') {
    const tasaEur = tasaEuroFactura(factura, tasaBcv)
    const tasaUsd = tasaDolarFactura(factura, tasaBcv)
    if (tasaEur <= 0 || tasaUsd <= 0) return { valor: 0, excluida: true }
    return { valor: (monto * tasaEur) / tasaUsd, excluida: false }
  }

  // Moneda desconocida: no hay regla de conversión; se deja tal cual (no se excluye).
  return { valor: monto, excluida: false }
}

/**
 * Suma en USD de un array de facturas + cuántas se excluyeron por no tener
 * ninguna tasa disponible (ni guardada en la factura ni BCV actual). El
 * llamador decide qué hacer con `excluidas` (mostrar un `AvisoAmable`).
 * @returns {{total: number, excluidas: number}}
 */
export function sumarMontosUsd(facturas, tasaBcv) {
  let total = 0
  let excluidas = 0
  ;(facturas || []).forEach((factura) => {
    const { valor, excluida } = obtenerMontoUsd(factura, tasaBcv)
    if (excluida) {
      excluidas += 1
      return
    }
    total += valor
  })
  return { total, excluidas }
}

/** Fecha local de una factura (`issueDate` o, si falta, `createdAt`). */
export function obtenerFechaFactura(factura) {
  return parseFechaLocal(factura?.issueDate || factura?.createdAt)
}

/** Filtra facturas cuya fecha cae dentro de [inicio, fin] (ambos inclusive). */
export function filtrarPorRango(facturas, inicio, fin) {
  if (!inicio || !fin) return []
  return (facturas || []).filter((factura) => {
    const fecha = obtenerFechaFactura(factura)
    return fecha !== null && fecha >= inicio && fecha <= fin
  })
}

function finDelDia(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999)
}

/**
 * Fin del día `dia` dentro del mes (`anioMes`, `mesMes`) ya resuelto —
 * acotado al último día real de ese mes (ej. 31 de marzo -> 28/29 de
 * febrero). Usado por `obtenerRangoPeriodo` para comparar el MISMO TRAMO
 * del período anterior (hallazgo #4 Importante, ver abajo).
 */
function finMismoTramo(anioMes, mesMes, dia) {
  const primerDiaMes = new Date(anioMes, mesMes, 1)
  const ultimoDiaMes = new Date(primerDiaMes.getFullYear(), primerDiaMes.getMonth() + 1, 0).getDate()
  return finDelDia(new Date(primerDiaMes.getFullYear(), primerDiaMes.getMonth(), Math.min(dia, ultimoDiaMes)))
}

/**
 * Rango de fechas del período elegido + su período anterior equivalente
 * (para la comparación en lenguaje llano). `fechaReferencia` es "hoy" —
 * se puede fijar en los tests para que el resultado sea determinístico.
 *
 * Corrección (revisión del shell/dashboard, hallazgo #4 Importante): "Este
 * mes" y "Este año" comparan contra el MISMO TRAMO del período anterior (del
 * 1 al día de hoy vs. del 1 al mismo día del mes/año pasado, acotado al
 * último día de ese mes si no existe) — nunca contra el período anterior
 * COMPLETO, que exagera la caída en cualquier día antes de fin de mes/año.
 * "Mes pasado" sigue comparando mes completo vs. mes completo anterior
 * (ambos ya cerrados, no hay tramo que acotar).
 * @param {'este_mes'|'mes_pasado'|'este_anio'} periodo
 * @param {Date} fechaReferencia
 */
export function obtenerRangoPeriodo(periodo, fechaReferencia = new Date()) {
  const anio = fechaReferencia.getFullYear()
  const mes = fechaReferencia.getMonth()
  const dia = fechaReferencia.getDate()

  if (periodo === 'mes_pasado') {
    return {
      inicio: new Date(anio, mes - 1, 1),
      fin: finDelDia(new Date(anio, mes, 0)),
      inicioAnterior: new Date(anio, mes - 2, 1),
      finAnterior: finDelDia(new Date(anio, mes - 1, 0)),
    }
  }

  if (periodo === 'este_anio') {
    return {
      inicio: new Date(anio, 0, 1),
      fin: finDelDia(fechaReferencia),
      inicioAnterior: new Date(anio - 1, 0, 1),
      finAnterior: finMismoTramo(anio - 1, mes, dia),
    }
  }

  // 'este_mes' (y por defecto)
  return {
    inicio: new Date(anio, mes, 1),
    fin: finDelDia(fechaReferencia),
    inicioAnterior: new Date(anio, mes - 1, 1),
    finAnterior: finMismoTramo(anio, mes - 1, dia),
  }
}

/**
 * Cómo nombrar el período anterior en el texto de comparación
 * ("12% más que a esta altura del mes pasado"). "Este mes"/"Este año"
 * aclaran "a esta altura de" porque comparan contra el mismo tramo, no
 * contra el período completo (ver `obtenerRangoPeriodo`, hallazgo #4).
 */
export function etiquetaPeriodoAnterior(periodo) {
  if (periodo === 'mes_pasado') return 'el mes anterior'
  if (periodo === 'este_anio') return 'a esta altura del año pasado'
  return 'a esta altura del mes pasado'
}

const NOMBRES_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Agrupa ventas y compras (ya cargadas, sin filtrar por período) en los
 * últimos `cantidadMeses` meses terminando en el mes de `fechaReferencia`.
 * @returns {{labels: string[], vendi: number[], gaste: number[]}}
 */
export function agruparPorMes(ventas, compras, tasaBcv, cantidadMeses = 6, fechaReferencia = new Date()) {
  const labels = []
  const vendi = []
  const gaste = []

  for (let i = cantidadMeses - 1; i >= 0; i--) {
    const fecha = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - i, 1)
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)

    labels.push(NOMBRES_MES[fecha.getMonth()])
    vendi.push(sumarMontosUsd(filtrarPorRango(ventas, inicioMes, finMes), tasaBcv).total)
    gaste.push(sumarMontosUsd(filtrarPorRango(compras, inicioMes, finMes), tasaBcv).total)
  }

  return { labels, vendi, gaste }
}

function topPorNombre(facturas, tasaBcv, limite, obtenerNombre) {
  const totales = new Map()
  ;(facturas || []).forEach((factura) => {
    const { valor, excluida } = obtenerMontoUsd(factura, tasaBcv)
    if (excluida) return
    const nombre = obtenerNombre(factura)
    totales.set(nombre, (totales.get(nombre) || 0) + valor)
  })

  const total = Array.from(totales.values()).reduce((a, b) => a + b, 0)

  return Array.from(totales.entries())
    .map(([nombre, monto]) => ({ nombre, monto, porcentaje: total > 0 ? (monto / total) * 100 : 0 }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limite)
}

/** Top `limite` categorías de gasto (expense_categories), por monto USD descendente. */
export function topCategorias(compras, tasaBcv, limite = 5) {
  return topPorNombre(compras, tasaBcv, limite, (factura) => factura?.expenseCategory?.name || SIN_CATEGORIA)
}

/** Top `limite` clientes (comprador de la venta), por monto USD descendente. */
export function topClientes(ventas, tasaBcv, limite = 5) {
  return topPorNombre(
    ventas,
    tasaBcv,
    limite,
    (factura) => factura?.client?.companyName?.trim() || SIN_NOMBRE_CLIENTE
  )
}

/**
 * Umbral (en puntos porcentuales) bajo el cual una variación se lee como
 * "igual" en vez de un falso "X% más/menos" (ruido de redondeo, no una
 * variación real). Centralizado para que el texto (`textoComparacion`) y el
 * ícono (`TarjetaKPI.vue`) usen siempre el mismo corte (hallazgo #11 Menor:
 * antes 0.5 vivía duplicado en ambos archivos y podían desalinearse).
 */
export const UMBRAL_SIN_CAMBIO = 0.5

/**
 * Variación porcentual entre el valor actual y el anterior.
 * - `null` cuando no hay base de comparación (ambos en 0): "0% más" sería
 *   una mentira matemática, así que la tarjeta no debe mostrar nada.
 * - `'nuevo'` cuando el anterior fue 0 pero el actual no (hallazgo #10
 *   Menor): el crecimiento desde cero no es "100%", es indefinido — antes
 *   se devolvía 100/-100 y el texto decía "100% más que el mes pasado",
 *   matemáticamente falso.
 * @returns {number|null|'nuevo'}
 */
export function calcularVariacion(actual, anterior) {
  const a = Number(actual) || 0
  const b = Number(anterior) || 0
  if (a === 0 && b === 0) return null
  if (b === 0) return 'nuevo'
  return ((a - b) / Math.abs(b)) * 100
}

/**
 * Texto en lenguaje llano de la comparación ("12% más que el mes
 * pasado"). Diferencias menores a `UMBRAL_SIN_CAMBIO` se leen como "igual"
 * en vez de "0% más". `'nuevo'` (ver `calcularVariacion`) tiene su propio
 * texto, sin inventar un porcentaje.
 */
export function textoComparacion(porcentaje, etiquetaAnterior = 'el período anterior') {
  if (porcentaje === null || porcentaje === undefined) return ''
  if (porcentaje === 'nuevo') return `No hubo nada ${etiquetaAnterior} para comparar`
  if (!Number.isFinite(porcentaje)) return ''
  const redondeado = Math.round(Math.abs(porcentaje))
  if (porcentaje > UMBRAL_SIN_CAMBIO) return `${redondeado}% más que ${etiquetaAnterior}`
  if (porcentaje < -UMBRAL_SIN_CAMBIO) return `${redondeado}% menos que ${etiquetaAnterior}`
  return `Igual que ${etiquetaAnterior}`
}
