// Lógica pura (sin I/O) del job de avisos de vencimiento por correo.
// Se importa tal cual desde la Edge Function (Deno soporta ESM relativo) y
// desde los tests de Vitest (tests/functions/avisosVencimiento.spec.js),
// así la regla de fechas/agrupación se prueba sin mockear Supabase/Deno.

export const ZONA_CARACAS = 'America/Caracas'

// Umbrales de aviso (días antes del vencimiento). -1 representa "venció ayer"
// (un solo aviso de vencido, no uno por cada día que pasa).
export const DIAS_AVISO_FISCAL = [30, 7, 1]
export const DIAS_VENCIDO_FISCAL = -1
export const DIAS_AVISO_FACTURA = [3, 0]

/**
 * Fecha de hoy en zona America/Caracas, como 'YYYY-MM-DD'.
 * @param {Date} [referencia] fecha base (por defecto, ahora). Se inyecta en tests.
 */
export function hoyEnCaracas(referencia = new Date()) {
  // Intl.DateTimeFormat con timeZone resuelve el offset de Caracas (UTC-4, sin DST)
  // sin depender de la zona del servidor donde corra la Edge Function.
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CARACAS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(referencia)

  const obtener = (tipo) => partes.find((p) => p.type === tipo)?.value
  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`
}

/**
 * Diferencia en días naturales entre dos fechas 'YYYY-MM-DD' (fecha - hoy).
 * Positivo = en el futuro, negativo = ya pasó. No usa Date con hora para
 * evitar el desfase de huso horario (ver fiscalService.js).
 */
export function diferenciaEnDias(fechaISO, hoyISO) {
  if (!fechaISO || !hoyISO) return null
  const fecha = new Date(`${fechaISO}T00:00:00Z`)
  const hoy = new Date(`${hoyISO}T00:00:00Z`)
  if (Number.isNaN(fecha.getTime()) || Number.isNaN(hoy.getTime())) return null
  const MS_POR_DIA = 1000 * 60 * 60 * 24
  return Math.round((fecha.getTime() - hoy.getTime()) / MS_POR_DIA)
}

/**
 * ¿Este documento fiscal debe avisarse hoy? Devuelve el `dias_antes` a usar
 * para idempotencia (30, 7, 1 o -1 = venció ayer) o null si no aplica.
 * Solo documentos VIGENTES (ver fiscalService.js: status VIGENTE/TRAMITE/VENCIDO/NO_APLICA).
 */
export function clasificarDocumentoFiscal(doc, hoyISO) {
  if (!doc || doc.status !== 'VIGENTE' || !doc.expiration_date) return null
  const diff = diferenciaEnDias(doc.expiration_date, hoyISO)
  if (diff === null) return null
  if (DIAS_AVISO_FISCAL.includes(diff)) return diff
  if (diff === DIAS_VENCIDO_FISCAL) return DIAS_VENCIDO_FISCAL
  return null
}

/**
 * ¿Esta factura del sistema (suscripción/plan) debe avisarse hoy? Devuelve
 * `dias_antes` (3 o 0) o null. Solo facturas pendientes (ver system_invoices:
 * status pending/paid/overdue/canceled).
 */
export function clasificarFactura(invoice, hoyISO) {
  if (!invoice || invoice.status !== 'pending' || !invoice.due_date) return null
  const diff = diferenciaEnDias(invoice.due_date, hoyISO)
  if (diff === null) return null
  if (DIAS_AVISO_FACTURA.includes(diff)) return diff
  return null
}

/**
 * Agrupa una lista de ítems de aviso (ya clasificados, con client_id) por
 * cliente, para enviar un solo correo por cliente por día con todos sus ítems.
 * @param {Array<{client_id: string}>} items
 * @returns {Map<string, Array>}
 */
export function agruparPorCliente(items) {
  const grupos = new Map()
  for (const item of items) {
    if (!item?.client_id) continue
    if (!grupos.has(item.client_id)) grupos.set(item.client_id, [])
    grupos.get(item.client_id).push(item)
  }
  return grupos
}

/** Texto corto y en tuteo para "cuánto falta" según dias_antes. */
export function textoVencimiento(diasAntes) {
  if (diasAntes === DIAS_VENCIDO_FISCAL) return 'venció ayer'
  if (diasAntes === 0) return 'vence hoy'
  if (diasAntes === 1) return 'vence en 1 día'
  return `vence en ${diasAntes} días`
}

/** Mensaje corto en tuteo para un documento fiscal (p.ej. RIF, patente). */
export function mensajeDocumentoFiscal(nombreCliente, item) {
  const nombreDoc = item.nombre || item.doc_type || 'tu documento'
  const accion = item.dias_antes === DIAS_VENCIDO_FISCAL
    ? 'Renuévalo lo antes posible para evitar multas.'
    : 'Renovarlo a tiempo evita multas.'
  return `Hola ${nombreCliente}, ${nombreDoc} ${textoVencimiento(item.dias_antes)}. ${accion}`
}

/** Mensaje corto en tuteo para una factura de suscripción/plan. */
export function mensajeFactura(nombreCliente, item) {
  const ref = item.invoice_number ? ` (${item.invoice_number})` : ''
  return `Hola ${nombreCliente}, tu factura de suscripción${ref} ${textoVencimiento(item.dias_antes)}.`
}

/** Asunto del correo según la cantidad de ítems del cliente ese día. */
export function construirAsunto(items) {
  if (items.length === 1) return 'Aviso de vencimiento — AD System'
  return `Tienes ${items.length} avisos de vencimiento — AD System`
}

export default {
  hoyEnCaracas,
  diferenciaEnDias,
  clasificarDocumentoFiscal,
  clasificarFactura,
  agruparPorCliente,
  textoVencimiento,
  mensajeDocumentoFiscal,
  mensajeFactura,
  construirAsunto,
  DIAS_AVISO_FISCAL,
  DIAS_VENCIDO_FISCAL,
  DIAS_AVISO_FACTURA
}
