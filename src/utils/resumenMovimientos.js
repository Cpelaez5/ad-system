import { parseFechaLocal } from '@/utils/fechas.js'
import { montoFacturaEn } from '@/utils/monedas.js'

/**
 * Cálculos de "Mis movimientos" (resumen del mes y siguiente paso).
 * Todo en dólares, con `montoFacturaEn` (src/utils/monedas.js): cada factura se
 * convierte con SU tasa guardada y, si no la tiene, con la tasa vigente (`tasas`:
 * un número = tasa del dólar, o un objeto { USD, EUR, ... }). Si no hay ninguna
 * tasa, la factura se deja fuera (no se inventa un monto) y se cuenta en `sinTasa`.
 * Las ANULADAS y los BORRADORES no cuentan como dinero real.
 */

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

/** { vendi, gaste, retenciones, sinTasa } del mes de `ahora`, en USD. */
export function resumenDelMes(invoices, tasas, ahora = new Date()) {
  const r = { vendi: 0, gaste: 0, retenciones: 0, sinTasa: 0 }
  for (const inv of invoices || []) {
    if (!cuenta(inv) || !esDelMes(inv, ahora)) continue
    if (inv.flow !== 'VENTA' && inv.flow !== 'COMPRA') continue
    const total = montoFacturaEn(inv, 'USD', tasas)
    if (total.sinTasa) {
      r.sinTasa++
      continue
    }
    if (inv.flow === 'VENTA') {
      r.vendi += total.monto
    } else {
      r.gaste += total.monto
      r.retenciones += montoFacturaEn(inv, 'USD', tasas, { monto: retencionDe(inv) }).monto
    }
  }
  return r
}

/** Ventas a crédito o vencidas que todavía no se cobran, en USD. */
export function porCobrar(invoices, tasas) {
  let monto = 0
  let cantidad = 0
  let sinTasa = 0
  for (const inv of invoices || []) {
    if (inv.flow !== 'VENTA' || (inv.status !== 'CRÉDITO' && inv.status !== 'VENCIDA')) continue
    cantidad++
    const r = montoFacturaEn(inv, 'USD', tasas)
    if (r.sinTasa) sinTasa++
    else monto += r.monto
  }
  return { monto, cantidad, sinTasa }
}

/**
 * Siguiente paso, por prioridad: borradores > por cobrar > retenciones.
 * Devuelve { tipo: 'borradores'|'cobrar'|'retenciones'|'listo', cantidad, monto? }.
 */
export function siguientePasoMovimientos(invoices, tasas) {
  const lista = invoices || []
  const borradores = lista.filter((i) => i.status === 'BORRADOR').length
  if (borradores) return { tipo: 'borradores', cantidad: borradores }
  const cobrar = porCobrar(lista, tasas)
  if (cobrar.cantidad && cobrar.monto > 0) return { tipo: 'cobrar', ...cobrar }
  const conRetencion = lista.filter((i) => i.flow === 'COMPRA' && cuenta(i) && tieneRetencion(i)).length
  if (conRetencion) return { tipo: 'retenciones', cantidad: conRetencion }
  return { tipo: 'listo', cantidad: 0 }
}
