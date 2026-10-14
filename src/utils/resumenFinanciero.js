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
import { formatMoney } from './formatMoney'

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
 * true si la factura tiene una tasa utilizable para convertir SU moneda a
 * USD (ella misma primero, la BCV actual después) — mismo criterio para
 * cualquier monto de la factura (total, IVA, retención...), porque todos
 * viven en la misma moneda con la misma tasa guardada.
 */
function facturaConvertible(factura, tasaBcv) {
  const moneda = factura?.financial?.currency || 'VES'
  if (moneda === 'VES') return tasaDolarFactura(factura, tasaBcv) > 0
  if (moneda === 'EUR') return tasaEuroFactura(factura, tasaBcv) > 0 && tasaDolarFactura(factura, tasaBcv) > 0
  return true // USD o moneda desconocida: no hay regla de conversión, no se excluye.
}

/** Convierte `monto` (ya en la moneda de `factura`) a USD con su tasa. Asume `facturaConvertible(factura, tasaBcv)`. */
function convertirMontoFactura(factura, tasaBcv, monto) {
  const moneda = factura?.financial?.currency || 'VES'
  if (moneda === 'VES') {
    const tasa = tasaDolarFactura(factura, tasaBcv)
    return tasa > 0 ? monto / tasa : monto
  }
  if (moneda === 'EUR') {
    const tasaEur = tasaEuroFactura(factura, tasaBcv)
    const tasaUsd = tasaDolarFactura(factura, tasaBcv)
    return tasaEur > 0 && tasaUsd > 0 ? (monto * tasaEur) / tasaUsd : monto
  }
  return monto
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
  if (!facturaConvertible(factura, tasaBcv)) return { valor: 0, excluida: true }
  return { valor: convertirMontoFactura(factura, tasaBcv, monto), excluida: false }
}

/**
 * IVA (débito fiscal si es venta, crédito fiscal si es compra) de una
 * factura en USD — `financial.taxDebit`, el mismo campo que usan los
 * formularios de factura (SimpleInvoiceForm) para ambos flujos. Misma
 * regla de tasa que `obtenerMontoUsd`.
 * @returns {{valor: number, excluida: boolean}}
 */
export function obtenerIvaFacturaUsd(factura, tasaBcv) {
  const monto = Number(factura?.financial?.taxDebit) || 0
  if (!facturaConvertible(factura, tasaBcv)) return { valor: 0, excluida: true }
  return { valor: convertirMontoFactura(factura, tasaBcv, monto), excluida: false }
}

/**
 * Retención de IVA que le hicieron al emitir una factura (`retenciones.iva`,
 * ver `invoiceService.getInvoices`) en USD. Para una venta, es lo que el
 * cliente retuvo al pagar — se descuenta del IVA que toca declarar
 * (SimpleInvoiceForm: "...para que se deduzcan de tu total a pagar de
 * impuestos"). Misma regla de tasa que `obtenerMontoUsd`.
 * @returns {{valor: number, excluida: boolean}}
 */
export function obtenerRetencionIvaUsd(factura, tasaBcv) {
  const monto = Number(factura?.retenciones?.iva) || 0
  if (!facturaConvertible(factura, tasaBcv)) return { valor: 0, excluida: true }
  return { valor: convertirMontoFactura(factura, tasaBcv, monto), excluida: false }
}

/** Suma un array de facturas con una función `obtenerValor(factura) -> {valor, excluida}`. */
function sumarConExclusion(facturas, obtenerValor) {
  let total = 0
  let excluidas = 0
  ;(facturas || []).forEach((factura) => {
    const { valor, excluida } = obtenerValor(factura)
    if (excluida) {
      excluidas += 1
      return
    }
    total += valor
  })
  return { total, excluidas }
}

/**
 * Suma en USD de un array de facturas + cuántas se excluyeron por no tener
 * ninguna tasa disponible (ni guardada en la factura ni BCV actual). El
 * llamador decide qué hacer con `excluidas` (mostrar un `AvisoAmable`).
 * @returns {{total: number, excluidas: number}}
 */
export function sumarMontosUsd(facturas, tasaBcv) {
  return sumarConExclusion(facturas, (factura) => obtenerMontoUsd(factura, tasaBcv))
}

/**
 * IVA estimado del período (diferenciador D1 — "Lo que vas a declarar" en
 * "¿Cómo voy?"): débito fiscal de tus ventas − crédito fiscal de tus
 * compras − retenciones de IVA que te hicieron tus clientes al pagarte.
 *
 * Es un ESTIMADO, no la declaración real: usa solo lo que la pantalla ya
 * carga (ventas/compras del período + sus campos `financial.taxDebit` y
 * `retenciones.iva`), sin filtrar por estado (borrador/anulada) ni separar
 * ajustes — igual que "Vendí"/"Gasté" en esta misma pantalla. El débito y
 * la retención salen de las MISMAS facturas (`ventasPeriodo`) con el mismo
 * criterio de exclusión por tasa, así que `excluidas` no las cuenta dos
 * veces.
 * @returns {{debito: number, credito: number, retencion: number, neto: number, excluidas: number}}
 */
export function desglosarIvaEstimado(ventasPeriodo, comprasPeriodo, tasaBcv) {
  const debito = sumarConExclusion(ventasPeriodo, (factura) => obtenerIvaFacturaUsd(factura, tasaBcv))
  const credito = sumarConExclusion(comprasPeriodo, (factura) => obtenerIvaFacturaUsd(factura, tasaBcv))
  const retencion = sumarConExclusion(ventasPeriodo, (factura) => obtenerRetencionIvaUsd(factura, tasaBcv))
  return {
    debito: debito.total,
    credito: credito.total,
    retencion: retencion.total,
    neto: debito.total - credito.total - retencion.total,
    excluidas: debito.excluidas + credito.excluidas,
  }
}

/** Solo el neto (`{valor, excluidas}`) de `desglosarIvaEstimado` — para quien no necesita el desglose. */
export function calcularIvaEstimado(ventasPeriodo, comprasPeriodo, tasaBcv) {
  const { neto, excluidas } = desglosarIvaEstimado(ventasPeriodo, comprasPeriodo, tasaBcv)
  return { valor: neto, excluidas }
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
 * Incluye `neto` (vendí − gasté, "Me queda") mes a mes para la línea del
 * gráfico combinado de "¿Cómo voy?".
 * @returns {{labels: string[], vendi: number[], gaste: number[], neto: number[]}}
 */
export function agruparPorMes(ventas, compras, tasaBcv, cantidadMeses = 6, fechaReferencia = new Date()) {
  const labels = []
  const vendi = []
  const gaste = []
  const neto = []

  for (let i = cantidadMeses - 1; i >= 0; i--) {
    const fecha = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() - i, 1)
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)

    const totalVendi = sumarMontosUsd(filtrarPorRango(ventas, inicioMes, finMes), tasaBcv).total
    const totalGaste = sumarMontosUsd(filtrarPorRango(compras, inicioMes, finMes), tasaBcv).total

    labels.push(NOMBRES_MES[fecha.getMonth()])
    vendi.push(totalVendi)
    gaste.push(totalGaste)
    neto.push(totalVendi - totalGaste)
  }

  return { labels, vendi, gaste, neto }
}

/** El mayor valor de un array paralelo a `labels` (ej. el mes con más ventas). `null` si todo es 0 o está vacío. */
export function mejorMes(labels, valores) {
  if (!Array.isArray(labels) || !Array.isArray(valores) || labels.length === 0) return null
  let indiceMax = 0
  for (let i = 1; i < valores.length; i++) {
    if ((valores[i] || 0) > (valores[indiceMax] || 0)) indiceMax = i
  }
  if (!valores[indiceMax]) return null
  return { label: labels[indiceMax], valor: valores[indiceMax] }
}

const DIAS_SEMANA_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
/** Lunes a domingo (orden de calendario venezolano, no el `getDay()` de JS que empieza en domingo). */
const ORDEN_LUNES_A_DOMINGO = [1, 2, 3, 4, 5, 6, 0]

/**
 * Ventas día a día del período elegido, para ver en qué días vende más.
 * Períodos cortos (≤31 días: "Este mes"/"Mes pasado") se agrupan por día de
 * calendario; períodos largos ("Este año") se agrupan por día de la semana
 * (si no, serían ~365 barras ilegibles) — `porDiaSemana` le dice al llamador
 * cuál es.
 * @returns {{labels: string[], valores: number[], porDiaSemana: boolean}}
 */
export function agruparVentasPorDia(ventasPeriodo, rango, tasaBcv) {
  const UN_DIA_MS = 24 * 60 * 60 * 1000
  // Normaliza a medianoche antes de restar: `fin` suele venir como fin de día
  // (23:59:59.999), que sumaría casi un día extra si se resta tal cual.
  const totalDias = rango?.inicio && rango?.fin
    ? Math.round(
        (new Date(rango.fin.getFullYear(), rango.fin.getMonth(), rango.fin.getDate()) -
          new Date(rango.inicio.getFullYear(), rango.inicio.getMonth(), rango.inicio.getDate())) / UN_DIA_MS
      ) + 1
    : 0

  if (totalDias > 0 && totalDias <= 31) {
    const labels = []
    const valores = []
    for (let d = 0; d < totalDias; d++) {
      const fecha = new Date(rango.inicio.getFullYear(), rango.inicio.getMonth(), rango.inicio.getDate() + d)
      const finDia = finDelDia(fecha)
      labels.push(String(fecha.getDate()))
      valores.push(sumarMontosUsd(filtrarPorRango(ventasPeriodo, fecha, finDia), tasaBcv).total)
    }
    return { labels, valores, porDiaSemana: false }
  }

  const porDia = totalesPorDiaSemana(ventasPeriodo, tasaBcv)
  return {
    labels: ORDEN_LUNES_A_DOMINGO.map((i) => DIAS_SEMANA_CORTOS[i]),
    valores: ORDEN_LUNES_A_DOMINGO.map((i) => porDia[i]),
    porDiaSemana: true,
  }
}

/** Suma de ventas en USD por día de la semana (`Date.getDay()`: 0 = domingo ... 6 = sábado). */
function totalesPorDiaSemana(ventas, tasaBcv) {
  const totales = new Array(7).fill(0)
  ;(ventas || []).forEach((factura) => {
    const fecha = obtenerFechaFactura(factura)
    if (!fecha) return
    const { valor, excluida } = obtenerMontoUsd(factura, tasaBcv)
    if (excluida) return
    totales[fecha.getDay()] += valor
  })
  return totales
}

const DIAS_SEMANA_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
/** domingo/sábado necesitan la "s" del plural; el resto ya termina en "s" ("los lunes", "los martes"...). */
const DIAS_SEMANA_PLURAL_IRREGULAR = new Set(['domingo', 'sábado'])

/**
 * Día de la semana en que más se vendió (para la frase de lectura "Vendes
 * más los viernes"), siempre por día de semana sin importar cómo se agrupe
 * el gráfico. `null` si no hay ventas en el período.
 * @returns {{dia: string, diaPlural: string, monto: number}|null}
 */
export function diaConMasVentas(ventasPeriodo, tasaBcv) {
  const totales = totalesPorDiaSemana(ventasPeriodo, tasaBcv)
  let indiceMax = 0
  for (let i = 1; i < 7; i++) {
    if (totales[i] > totales[indiceMax]) indiceMax = i
  }
  if (!totales[indiceMax]) return null
  const dia = DIAS_SEMANA_LARGOS[indiceMax]
  return {
    dia,
    diaPlural: DIAS_SEMANA_PLURAL_IRREGULAR.has(dia) ? `${dia}s` : dia,
    monto: totales[indiceMax],
  }
}

/**
 * Proporción de ventas por moneda de la factura (USD/VES/EUR...), cada
 * monto ya convertido a USD para que las barras sean comparables. Solo
 * incluye monedas con algo vendido; ordenado descendente.
 * @returns {Array<{moneda: string, valor: number}>}
 */
export function proporcionMonedaUsd(ventasPeriodo, tasaBcv) {
  const totales = new Map()
  ;(ventasPeriodo || []).forEach((factura) => {
    const { valor, excluida } = obtenerMontoUsd(factura, tasaBcv)
    if (excluida) return
    const moneda = factura?.financial?.currency || 'VES'
    totales.set(moneda, (totales.get(moneda) || 0) + valor)
  })
  return Array.from(totales.entries())
    .map(([moneda, valor]) => ({ moneda, valor }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor)
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

export const SIN_NOMBRE_PROVEEDOR = 'Proveedor sin nombre'

/**
 * Top `limite` proveedores (quien emite la compra: `issuer`, no `client` —
 * en una factura de COMPRA el proveedor es quien emitió el documento, igual
 * que SimpleInvoiceForm.counterpartName), por monto USD descendente.
 */
export function topProveedores(compras, tasaBcv, limite = 5) {
  return topPorNombre(
    compras,
    tasaBcv,
    limite,
    (factura) => factura?.issuer?.companyName?.trim() || SIN_NOMBRE_PROVEEDOR
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

const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * Frase de resultado del período para la cabecera de "¿Cómo voy?"
 * ("En octubre te quedan $X: vendiste $Y y gastaste $Z."). Usa los mismos
 * totales en USD que las cifras en línea (Vendí/Gasté) — no vuelve a
 * convertir nada.
 */
export function fraseResultado(periodo, totalVendi, totalGaste, fechaReferencia = new Date()) {
  const meQueda = (Number(totalVendi) || 0) - (Number(totalGaste) || 0)
  const monto = (v) => formatMoney(v, 'USD')

  if (periodo === 'mes_pasado') {
    const mes = MESES_LARGOS[(fechaReferencia.getMonth() - 1 + 12) % 12]
    return `En ${mes} te quedaron ${monto(meQueda)}: vendiste ${monto(totalVendi)} y gastaste ${monto(totalGaste)}.`
  }
  if (periodo === 'este_anio') {
    return `En ${fechaReferencia.getFullYear()} te quedan ${monto(meQueda)}: vendiste ${monto(totalVendi)} y gastaste ${monto(totalGaste)}.`
  }
  const mes = MESES_LARGOS[fechaReferencia.getMonth()]
  return `En ${mes} te quedan ${monto(meQueda)}: vendiste ${monto(totalVendi)} y gastaste ${monto(totalGaste)}.`
}
