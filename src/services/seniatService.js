/**
 * seniatService.js — datos de "SENIAT del mes".
 *
 * Reglas:
 * - Cada tabla se consulta por separado y se une en JS (nada de embeds nuevos entre tablas
 *   con FK: incidente del 2026-10-13). Único embed: retenciones → conceptos_islr, que ya usa
 *   retention-pdf-service.
 * - `declaraciones_seniat` no tiene FK ni índice único simple (usa coalesce(quincena, 0)), así
 *   que se guarda con "buscar y luego insertar o actualizar", no con upsert.
 */
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'
import userService from '@/services/userService.js'
import invoiceService from '@/services/invoiceService.js'
import { rangoPeriodo, nombrePeriodo } from '@/utils/seniat/periodos.js'
import { registrosDelLibro } from '@/utils/seniat/libros.js'
import { rifSeniat } from '@/utils/seniat/comunes.js'

const COLUMNAS_RETENCION = 'id, invoice_id, tipo, numero_comprobante, fecha_comprobante, porcentaje_retencion, base_imponible, monto_retenido, monto_iva, sustraendo_ut, valor_ut, proveedor_id, proveedor_nombre, proveedor_rif, factura_numero, factura_control, factura_fecha, concepto_islr_id, concepto_islr_nombre'

/** { clientId, organizationId } del negocio actual. */
export async function resolverNegocio() {
  let clientId = getCurrentClientId()
  let organizationId = getCurrentOrganizationId()
  if (!clientId || !organizationId) {
    const user = await userService.getCurrentUser()
    clientId = clientId || user?.client_id || null
    organizationId = organizationId || user?.organization_id || null
  }
  return { clientId, organizationId }
}

/** Datos del negocio como agente de retención. */
export async function cargarCliente(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, rif, es_contribuyente_especial')
    .eq('id', clientId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

/** Une una fila de `retenciones` con su factura y su concepto, en la forma de utils/seniat/comunes.js. */
export function aplanarRetencion(fila, factura, codigoSeniat) {
  const fin = factura?.financial || {}
  const total = fin.total ?? fin.totalSales ?? fin.totalAmount ?? 0
  const exento = fin.nonTaxableSales ?? fin.exemptSales ?? 0
  return {
    ...fila,
    tipo: String(fila.tipo || '').toUpperCase(),
    document_type: factura?.document_type || 'FACTURA',
    total,
    exento,
    doc_afectado: fin.documentoAfectado || null,
    codigo_seniat: codigoSeniat || null,
  }
}

/**
 * Retenciones de IVA e ISLR del negocio con fecha de comprobante dentro del mes.
 * @returns {Promise<Array>} forma plana (comunes.js)
 */
export async function cargarRetenciones({ clientId, periodo }) {
  const rango = rangoPeriodo(periodo)
  if (!clientId || !rango) return []

  const consulta = (columnas) => supabase
    .from('retenciones')
    .select(columnas)
    .eq('client_id', clientId)
    .in('tipo', ['IVA', 'ISLR'])
    .is('deleted_at', null)
    .gte('fecha_comprobante', rango.desde)
    .lte('fecha_comprobante', rango.hasta)
    .order('fecha_comprobante', { ascending: true })

  // Con el código oficial; si la columna aún no existe (migración sin aplicar), sin él.
  let { data, error } = await consulta(`${COLUMNAS_RETENCION}, concepto_islr:concepto_islr_id ( id, nombre, codigo_seniat )`)
  if (error) {
    ;({ data, error } = await consulta(`${COLUMNAS_RETENCION}, concepto_islr:concepto_islr_id ( id, nombre )`))
  }
  if (error) throw error
  const filas = data || []
  if (!filas.length) return []

  const ids = [...new Set(filas.map((f) => f.invoice_id).filter(Boolean))]
  const facturas = {}
  if (ids.length) {
    const { data: invs, error: errInv } = await supabase.from('invoices').select('id, document_type, financial').in('id', ids)
    if (errInv) throw errInv
    for (const i of invs || []) facturas[i.id] = i
  }

  return filas.map((f) => {
    const { concepto_islr: concepto, ...fila } = f
    return aplanarRetencion(
      { ...fila, concepto_islr_nombre: fila.concepto_islr_nombre || concepto?.nombre || null },
      facturas[f.invoice_id],
      concepto?.codigo_seniat,
    )
  })
}

/** Filas de `declaraciones_seniat` del mes. */
export async function cargarDeclaraciones({ clientId, periodo }) {
  if (!clientId) return []
  const { data, error } = await supabase
    .from('declaraciones_seniat')
    .select('*')
    .eq('client_id', clientId)
    .eq('periodo', periodo)
  if (error) {
    // Migración sin aplicar o sin permiso: la pantalla sigue funcionando, sin historial.
    console.warn('No se pudo leer declaraciones_seniat:', error.message)
    return []
  }
  return data || []
}

/**
 * Guarda que se descargó o se declaró una tarjeta.
 * @param {{clientId:string, organizationId:string, tipo:string, periodo:string, quincena:number|null,
 *   estado:'descargada'|'declarada', lineas:number, montoTotal:number, numeroPlanilla?:string}} p
 */
export async function guardarDeclaracion({ clientId, organizationId, tipo, periodo, quincena = null, estado, lineas, montoTotal, numeroPlanilla = null }) {
  let consulta = supabase.from('declaraciones_seniat').select('*').eq('client_id', clientId).eq('tipo', tipo).eq('periodo', periodo)
  consulta = quincena ? consulta.eq('quincena', quincena) : consulta.is('quincena', null)
  const { data: previa, error: errBuscar } = await consulta.maybeSingle()
  if (errBuscar) throw errBuscar

  const ahora = new Date().toISOString()
  const campos = {
    estado,
    lineas,
    monto_total: montoTotal,
    descargada_en: previa?.descargada_en || ahora,
    declarada_en: estado === 'declarada' ? ahora : null,
    numero_planilla: estado === 'declarada' ? (numeroPlanilla || previa?.numero_planilla || null) : null,
  }
  if (previa) {
    const { data, error } = await supabase.from('declaraciones_seniat').update(campos).eq('id', previa.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('declaraciones_seniat')
    .insert({ client_id: clientId, organization_id: organizationId, tipo, periodo, quincena, ...campos })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Todo lo que necesita la pantalla (y el Inicio) para un mes. */
export async function cargarMes(periodo) {
  const { clientId, organizationId } = await resolverNegocio()
  if (!clientId) return { clientId: null, organizationId, cliente: null, retenciones: [], declaraciones: [] }
  const [cliente, retenciones, declaraciones] = await Promise.all([
    cargarCliente(clientId),
    cargarRetenciones({ clientId, periodo }),
    cargarDeclaraciones({ clientId, periodo }),
  ])
  return { clientId, organizationId, cliente, retenciones, declaraciones }
}

/** Facturas (compras y ventas) del negocio, formato invoiceService, para los libros. */
export async function cargarFacturasParaLibros(clientId) {
  const [ventas, compras] = await Promise.all([
    invoiceService.getInvoices({ flow: 'VENTA', clientId }),
    invoiceService.getInvoices({ flow: 'COMPRA', clientId }),
  ])
  return [...(ventas || []), ...(compras || [])]
}

/** Total de un registro en la moneda del libro (Bs), para el resumen de la tarjeta. */
export function totalRegistro(inv) {
  const f = inv.financial || {}
  return Number(f.totalSales ?? f.total ?? 0) || 0
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Descarga el libro de compras o de ventas del mes (Excel), con el mismo exportService
 * y el mismo nombre de archivo que "Mis movimientos".
 * @returns {Promise<number>} cuántos registros se exportaron
 */
export async function exportarLibro({ facturas, flow, periodo, cliente }) {
  const registros = registrosDelLibro(facturas, flow, periodo)
  if (!registros.length) return 0
  const mes = MESES_CORTOS[Number(periodo.slice(4)) - 1]
  const sufijo = `${mes}_${periodo.slice(0, 4)}`
  const filename = `Libro_${flow === 'VENTA' ? 'Ventas' : 'Compras'}_${sufijo}.xlsx`
  const companyInfo = {
    name: cliente?.company_name || 'Mi Empresa',
    rif: cliente?.rif || 'J-00000000-0',
    period: sufijo,
  }
  // Import perezoso: exceljs pesa mucho y el Inicio importa este servicio.
  const { default: exportService } = await import('@/services/exportService.js')
  await exportService.exportTable(registros, 'VES', filename, 'SENIAT', companyInfo)
  return registros.length
}

/** Mensaje listo para pegar cuando no se puede compartir el archivo. */
export function mensajeParaContador({ tipo, periodo, quincena, cliente, nombreArchivo }) {
  const que = tipo === 'IVA' ? `retenciones de IVA (${quincena === 1 ? '1ra' : '2da'} quincena)` : 'retenciones de ISLR'
  const quien = cliente?.company_name || 'mi negocio'
  const rif = rifSeniat(cliente?.rif) || ''
  return `Hola, te envío el archivo de ${que} de ${nombrePeriodo(periodo)} de ${quien}${rif ? ` (${rif})` : ''}. Es el archivo ${nombreArchivo}, listo para subir al portal del SENIAT.`
}
