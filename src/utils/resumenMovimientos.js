import { parseFechaLocal } from '@/utils/fechas.js'

/**
 * Cálculos de "Mis movimientos" (resumen del mes y siguiente paso).
 * Todo en dólares: una factura en bolívares se divide entre la tasa BCV; si
 * no hay tasa, las facturas en bolívares se dejan fuera (no se inventa un
 * monto). Las ANULADAS y los BORRADORES no cuentan como dinero real.
 */

export function aUSD(monto, moneda, tasa) {
  const n = Number(monto) || 0
  if (!n) return 0
  if (moneda === 'USD') return n
  if (moneda === 'VES' || !moneda) return tasa > 0 ? n / tasa : 0
  return 0 // EUR: sin tasa disponible todavía
}

function cuenta(inv) {
  return inv.status !== 'ANULADA' && inv.status !== 'BORRADOR'
}

export function retencionDe(inv) {
  const r = inv.retenciones || {}
  const f = inv.financial || {}
  return (Number(r.iva ?? f.ivaRetention) || 0)
    + (Number(r.islr ?? f.islrRetention) || 0)
    + (Number(r.municipal ?? f.municipalRetention) || 0)
}

export function tieneRetencion(inv) {
  return retencionDe(inv) > 0
}

function esDelMes(inv, ahora) {
  const d = parseFechaLocal(inv.issueDate)
  return !!d && d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth()
}

/** { vendi, gaste, retenciones } del mes de `ahora`, en USD. */
export function resumenDelMes(invoices, tasa, ahora = new Date()) {
  const r = { vendi: 0, gaste: 0, retenciones: 0 }
  for (const inv of invoices || []) {
    if (!cuenta(inv) || !esDelMes(inv, ahora)) continue
    const moneda = inv.financial?.currency || 'VES'
    if (inv.flow === 'VENTA') {
      r.vendi += aUSD(inv.financial?.totalSales, moneda, tasa)
    } else if (inv.flow === 'COMPRA') {
      r.gaste += aUSD(inv.financial?.totalSales, moneda, tasa)
      r.retenciones += aUSD(retencionDe(inv), moneda, tasa)
    }
  }
  return r
}

/** Ventas a crédito o vencidas que todavía no se cobran, en USD. */
export function porCobrar(invoices, tasa) {
  let monto = 0
  let cantidad = 0
  for (const inv of invoices || []) {
    if (inv.flow !== 'VENTA' || (inv.status !== 'CRÉDITO' && inv.status !== 'VENCIDA')) continue
    cantidad++
    monto += aUSD(inv.financial?.totalSales, inv.financial?.currency || 'VES', tasa)
  }
  return { monto, cantidad }
}

/**
 * Siguiente paso, por prioridad: borradores > por cobrar > retenciones.
 * Devuelve { tipo: 'borradores'|'cobrar'|'retenciones'|'listo', cantidad, monto? }.
 */
export function siguientePasoMovimientos(invoices, tasa) {
  const lista = invoices || []
  const borradores = lista.filter((i) => i.status === 'BORRADOR').length
  if (borradores) return { tipo: 'borradores', cantidad: borradores }
  const cobrar = porCobrar(lista, tasa)
  if (cobrar.cantidad && cobrar.monto > 0) return { tipo: 'cobrar', ...cobrar }
  const conRetencion = lista.filter((i) => i.flow === 'COMPRA' && cuenta(i) && tieneRetencion(i)).length
  if (conRetencion) return { tipo: 'retenciones', cantidad: conRetencion }
  return { tipo: 'listo', cantidad: 0 }
}
