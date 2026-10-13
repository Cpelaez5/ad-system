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
 * Convierte un monto a USD usando la tasa BCV del día, con la misma regla
 * que ya usaba el dashboard anterior: VES se divide por la tasa del dólar,
 * EUR se pasa primero a VES con la tasa del euro y luego a USD. Si no hay
 * tasa disponible (o es 0), el monto se devuelve tal cual para no partir
 * por cero.
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

/** Monto en USD de una factura (`financial.totalSales` + `financial.currency`). */
export function obtenerMontoUsd(factura, tasaBcv) {
  const monto = Number(factura?.financial?.totalSales) || 0
  const moneda = factura?.financial?.currency || 'VES'
  return convertirAUsd(monto, moneda, tasaBcv)
}

/** Suma en USD de un array de facturas. */
export function sumarMontosUsd(facturas, tasaBcv) {
  return (facturas || []).reduce((suma, factura) => suma + obtenerMontoUsd(factura, tasaBcv), 0)
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
 * Rango de fechas del período elegido + su período anterior equivalente
 * (para la comparación en lenguaje llano). `fechaReferencia` es "hoy" —
 * se puede fijar en los tests para que el resultado sea determinístico.
 * @param {'este_mes'|'mes_pasado'|'este_anio'} periodo
 * @param {Date} fechaReferencia
 */
export function obtenerRangoPeriodo(periodo, fechaReferencia = new Date()) {
  const anio = fechaReferencia.getFullYear()
  const mes = fechaReferencia.getMonth()

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
      finAnterior: new Date(anio - 1, 11, 31, 23, 59, 59, 999),
    }
  }

  // 'este_mes' (y por defecto)
  return {
    inicio: new Date(anio, mes, 1),
    fin: finDelDia(fechaReferencia),
    inicioAnterior: new Date(anio, mes - 1, 1),
    finAnterior: finDelDia(new Date(anio, mes, 0)),
  }
}

/** Cómo nombrar el período anterior en el texto de comparación. */
export function etiquetaPeriodoAnterior(periodo) {
  if (periodo === 'mes_pasado') return 'el mes anterior'
  if (periodo === 'este_anio') return 'el año pasado'
  return 'el mes pasado'
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
    vendi.push(sumarMontosUsd(filtrarPorRango(ventas, inicioMes, finMes), tasaBcv))
    gaste.push(sumarMontosUsd(filtrarPorRango(compras, inicioMes, finMes), tasaBcv))
  }

  return { labels, vendi, gaste }
}

function topPorNombre(facturas, tasaBcv, limite, obtenerNombre) {
  const totales = new Map()
  ;(facturas || []).forEach((factura) => {
    const nombre = obtenerNombre(factura)
    const monto = obtenerMontoUsd(factura, tasaBcv)
    totales.set(nombre, (totales.get(nombre) || 0) + monto)
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
 * Variación porcentual entre el valor actual y el anterior.
 * `null` cuando no hay base de comparación (ambos en 0): "0% más" sería
 * una mentira matemática, así que la tarjeta no debe mostrar nada.
 */
export function calcularVariacion(actual, anterior) {
  const a = Number(actual) || 0
  const b = Number(anterior) || 0
  if (a === 0 && b === 0) return null
  if (b === 0) return a > 0 ? 100 : -100
  return ((a - b) / Math.abs(b)) * 100
}

/**
 * Texto en lenguaje llano de la comparación ("12% más que el mes
 * pasado"). Diferencias menores a 0.5% se leen como "igual" en vez de
 * "0% más" (ruido de redondeo, no una variación real).
 */
export function textoComparacion(porcentaje, etiquetaAnterior = 'el período anterior') {
  if (porcentaje === null || porcentaje === undefined || !Number.isFinite(porcentaje)) return ''
  const redondeado = Math.round(Math.abs(porcentaje))
  if (porcentaje > 0.5) return `${redondeado}% más que ${etiquetaAnterior}`
  if (porcentaje < -0.5) return `${redondeado}% menos que ${etiquetaAnterior}`
  return `Igual que ${etiquetaAnterior}`
}
