/**
 * facturacionSistema.js — lógica pura de la pantalla Facturación del sistema
 * (super admin): filtros, conteos y textos de estado. Sin red ni Vue.
 */
import { formatMoney } from '@/utils/formatMoney'
import { formatFechaLocal } from '@/utils/fechas'

export const ESTADOS_FACTURA = {
  pending: { texto: 'Pendiente', color: 'warning', icono: 'mdi-clock-outline' },
  paid: { texto: 'Pagada', color: 'success', icono: 'mdi-check-circle-outline' },
  overdue: { texto: 'Vencida', color: 'error', icono: 'mdi-alert-circle-outline' },
  canceled: { texto: 'Anulada', color: 'secondary', icono: 'mdi-close-circle-outline' },
}

export const ESTADOS_REPORTE = {
  pending_review: { texto: 'Por revisar', color: 'warning', icono: 'mdi-clipboard-clock-outline' },
  approved: { texto: 'Aprobado', color: 'success', icono: 'mdi-check-circle-outline' },
  rejected: { texto: 'Rechazado', color: 'error', icono: 'mdi-close-circle-outline' },
}

export const TIPOS_METODO = {
  mobile_payment: { texto: 'Pago Móvil', icono: 'mdi-cellphone' },
  bank_transfer: { texto: 'Transferencia bancaria', icono: 'mdi-bank' },
  zelle: { texto: 'Zelle', icono: 'mdi-lightning-bolt' },
  binance: { texto: 'Binance', icono: 'mdi-bitcoin' },
}

export const estadoFactura = (s) => ESTADOS_FACTURA[s] || { texto: s || '—', color: 'secondary', icono: 'mdi-help-circle-outline' }
export const estadoReporte = (s) => ESTADOS_REPORTE[s] || { texto: s || '—', color: 'secondary', icono: 'mdi-help-circle-outline' }
export const tipoMetodo = (t) => TIPOS_METODO[t] || { texto: t || '—', icono: 'mdi-credit-card-outline' }

export const esImagen = (url) => Boolean(url) && /\.(jpg|jpeg|png|gif|webp)$/i.test(url)

export const formatBs = (val) => {
  if (!val) return '0,00'
  return parseFloat(val).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const fechaCorta = (d) => formatFechaLocal(d, { day: '2-digit', month: 'short', year: 'numeric' }) || '—'

export const fechaHora = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Facturas filtradas por texto (número, empresa o RIF) y por estado ('all' = todas). */
export function filtrarFacturas(facturas = [], { texto = '', estado = 'all' } = {}) {
  const q = String(texto || '').trim().toLowerCase()
  return facturas.filter((f) => {
    if (estado !== 'all' && f.status !== estado) return false
    if (!q) return true
    return Boolean(
      f.invoice_number?.toLowerCase().includes(q) ||
      f.client?.company_name?.toLowerCase().includes(q) ||
      f.client?.rif?.toLowerCase().includes(q),
    )
  })
}

export function filtrarReportes(reportes = [], estado = 'all') {
  return estado === 'all' ? reportes : reportes.filter((r) => r.status === estado)
}

/** { all, <estado>: n } para los chips de filtro. */
export function contarPorEstado(items = []) {
  const r = { all: items.length }
  for (const i of items) r[i.status] = (r[i.status] || 0) + 1
  return r
}

/** Balance a partir de las cifras del servicio, listo para `CifrasEnLinea`. */
export function cifrasBalance(balance = {}, formato = (n) => formatMoney(n)) {
  const v = (k) => Number(balance[k]) || 0
  return [
    { clave: 'facturado', valor: formato(v('totalFacturado')), texto: 'facturado' },
    { clave: 'pagado', valor: formato(v('totalPagado')), texto: 'cobrado' },
    { clave: 'pendiente', valor: formato(v('totalPendiente')), texto: 'por cobrar', alerta: v('totalPendiente') > 0 },
    { clave: 'vencido', valor: formato(v('totalVencido')), texto: 'vencido', alerta: v('totalVencido') > 0 },
  ]
}

/** Siguiente paso de Facturación: pagos por aprobar → facturas vencidas → null. */
export function siguientePasoFacturacion({ pagosPorRevisar = 0, facturasVencidas = 0 } = {}) {
  if (pagosPorRevisar > 0) {
    return {
      clave: 'pagos',
      titulo: pagosPorRevisar === 1 ? '1 pago por aprobar' : `${pagosPorRevisar} pagos por aprobar`,
      detalle: 'Revisa el comprobante y confirma o rechaza el pago.',
      boton: 'Revisar pagos',
    }
  }
  if (facturasVencidas > 0) {
    return {
      clave: 'vencidas',
      titulo: facturasVencidas === 1 ? '1 factura vencida' : `${facturasVencidas} facturas vencidas`,
      detalle: 'Estos negocios no han pagado a tiempo.',
      boton: 'Ver facturas vencidas',
    }
  }
  return null
}

/** Pre-llenado del formulario de aprobación de una suscripción (plan por nombre en las notas, vencimiento = fin del periodo). */
export function prellenarSuscripcion(reporte, planes = []) {
  const notas = reporte?.invoice?.notes
  if (!notas || !notas.toLowerCase().includes('suscripción a plan')) return { plan_id: null, trial_end: '' }
  const plan = planes.find((p) => notas.includes(p.name))
  const fin = reporte.invoice.period_end ? new Date(reporte.invoice.period_end).toISOString().slice(0, 16) : ''
  return { plan_id: plan ? plan.id : null, trial_end: fin }
}
