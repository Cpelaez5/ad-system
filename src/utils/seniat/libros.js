/**
 * libros.js — qué registros entran al libro de compras / ventas de un mes. Función pura.
 * Mismo criterio que Facturación: solo facturas fiscales; las compras se agrupan por
 * `fecha_fiscal` (si existe, con respaldo en la fecha de emisión) y las ventas por la de emisión.
 * (C1 2026-10-13, docs/mvp/backlog-contadora-2026-10-12.md punto 1.)
 */
import { periodoDeFecha } from './periodos.js'

/** Fecha que ubica el registro en un mes del libro. */
export function fechaDeLibro(inv) {
  return inv.flow === 'COMPRA' && inv.fecha_fiscal ? inv.fecha_fiscal : inv.issueDate
}

/**
 * @param {Array} invoices facturas con el formato de invoiceService
 * @param {'COMPRA'|'VENTA'} flow
 * @param {string} periodo AAAAMM
 */
export function registrosDelLibro(invoices = [], flow, periodo) {
  return invoices.filter((inv) =>
    inv.flow === flow
    && inv.documentType === 'FACTURA'
    && periodoDeFecha(fechaDeLibro(inv)) === periodo)
}
