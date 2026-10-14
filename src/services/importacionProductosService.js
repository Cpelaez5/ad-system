/**
 * Importación de productos desde Excel/CSV: lectura del archivo, carga por
 * lotes, ajuste de existencias, historial y "deshacer".
 * La lógica pura (columnas, validación, plan) vive en utils/importacionProductos.js.
 */
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'
import inventoryService from '@/services/inventoryService'
import { MAX_BYTES, MAX_FILAS, enLotes, puedeDeshacer } from '@/utils/importacionProductos.js'

const TAMANO_LOTE = 50

/** Lee un .xlsx, .xls o .csv y devuelve la primera hoja con datos como matriz de celdas. */
export async function leerArchivo(archivo) {
  if (!archivo) throw new Error('Elige un archivo')
  if (!/\.(xlsx|xls|csv)$/i.test(archivo.name || '')) {
    throw new Error('Ese archivo no es de Excel. Sube uno .xlsx, .xls o .csv')
  }
  if (archivo.size > MAX_BYTES) throw new Error('El archivo pesa más de 5 MB. Divídelo en partes más pequeñas')
  const XLSX = await import('xlsx')
  let libro
  try {
    const buffer = await archivo.arrayBuffer()
    libro = XLSX.read(buffer, { type: 'array', cellDates: true })
  } catch {
    throw new Error('No pudimos abrir el archivo. Revisa que no esté dañado o protegido con clave')
  }
  // Primera hoja que tenga datos (la plantilla trae "Productos" primero).
  for (const nombre of libro.SheetNames) {
    const matriz = XLSX.utils.sheet_to_json(libro.Sheets[nombre], { header: 1, raw: true, defval: '', blankrows: false })
    if (matriz.length > 1) {
      if (matriz.length - 1 > MAX_FILAS + 15) throw new Error(`El archivo tiene más de ${MAX_FILAS} filas. Divídelo en partes`)
      return { hoja: nombre, matriz }
    }
  }
  throw new Error('El archivo está vacío: no encontramos filas con productos')
}

/** Rubro guardado del negocio (clients.rubro) o null. */
export async function obtenerRubro() {
  try {
    const clientId = getCurrentClientId()
    if (!clientId) return null
    const { data } = await supabase.from('clients').select('rubro').eq('id', clientId).maybeSingle()
    return data?.rubro || null
  } catch {
    return null
  }
}

/** Productos vigentes de la empresa, para decidir crear o actualizar. */
export async function cargarExistentes() {
  const clientId = getCurrentClientId()
  const orgId = getCurrentOrganizationId()
  const todos = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('id, name, code, codigo_barras, tipo, stock, atributos')
      .eq('organization_id', orgId)
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .range(desde, desde + 999)
    if (error) throw error
    todos.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return todos
}

/**
 * Importa las filas del plan (nuevas y a actualizar) por lotes de 50.
 * Las existencias solo se aplican a los nuevos (movimiento INITIAL).
 * @returns {{ creados:number, actualizados:number, fallidas:number, idsCreados:string[], importacionId?:string }}
 */
export async function importarPlan(filas, { archivo = null, rubro = null, totalArchivo = filas.length, onProgreso = () => {} } = {}) {
  const clientId = getCurrentClientId()
  const orgId = getCurrentOrganizationId()
  if (!clientId || !orgId) throw new Error('No encontramos tu empresa. Cierra sesión y vuelve a entrar')

  const importables = filas.filter((f) => f.estado === 'nuevo' || f.estado === 'actualizar')
  const lotes = enLotes(importables, TAMANO_LOTE)
  const idsCreados = []
  let creados = 0
  let actualizados = 0
  let fallidas = 0
  let hechas = 0

  for (const lote of lotes) {
    const nuevas = lote.filter((f) => f.estado === 'nuevo')
    const viejas = lote.filter((f) => f.estado === 'actualizar')

    if (nuevas.length) {
      const registros = nuevas.map((f) => {
        const stock = f.existencias > 0 ? f.existencias : 0
        return { ...f.datos, client_id: clientId, organization_id: orgId, stock }
      })
      const { data, error } = await supabase.from('inventory_products').insert(registros).select('id, cost_price, stock')
      if (error) {
        fallidas += nuevas.length
      } else {
        creados += data.length
        idsCreados.push(...data.map((d) => d.id))
        const movimientos = data
          .filter((d) => Number(d.stock) > 0)
          .map((d) => ({
            organization_id: orgId,
            client_id: clientId,
            product_id: d.id,
            movement_type: 'INITIAL',
            quantity: Number(d.stock),
            cost_price: Number(d.cost_price) || 0,
            description: 'Existencias iniciales (importación)',
          }))
        if (movimientos.length) {
          const { error: errMov } = await supabase.from('inventory_movements').insert(movimientos)
          if (errMov) console.warn('Movimientos INITIAL de la importación no se guardaron:', errMov.message)
        }
      }
    }

    if (viejas.length) {
      const resultados = await Promise.all(viejas.map(async (f) => {
        const cambios = { ...f.datos, updated_at: new Date().toISOString() }
        // No cambiar el tipo si el archivo no lo trae, y sumar atributos a los que ya tenía.
        if (!f.crudo?.tipo) delete cambios.tipo
        if (cambios.atributos) cambios.atributos = { ...(f.existente.atributos || {}), ...cambios.atributos }
        const { error } = await supabase
          .from('inventory_products')
          .update(cambios)
          .eq('id', f.existente.id)
          .eq('organization_id', orgId)
        return !error
      }))
      actualizados += resultados.filter(Boolean).length
      fallidas += resultados.filter((ok) => !ok).length
    }

    hechas += lote.length
    onProgreso({ hechas, total: importables.length })
  }

  const conError = Math.max(totalArchivo - creados - actualizados, 0)
  let importacionId
  try {
    const { data: usuario } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('importaciones_productos')
      .insert({
        client_id: clientId,
        organization_id: orgId,
        origen: 'archivo',
        archivo,
        rubro,
        total: totalArchivo,
        creados,
        actualizados,
        con_error: conError,
        ids_creados: idsCreados,
        creado_por: usuario?.user?.id,
      })
      .select('id')
      .single()
    importacionId = data?.id
  } catch (e) {
    console.warn('No se pudo registrar el historial de la importación:', e)
  }

  return { creados, actualizados, fallidas, idsCreados, importacionId }
}

/**
 * "Ajustar existencias": para los productos que ya existían, deja el stock
 * del archivo con un movimiento ADJUSTMENT (motivo "Importación").
 * @param {{ existente:{id:string}, ajuste:{delta:number} }[]} filas
 */
export async function ajustarExistencias(filas, { onProgreso = () => {} } = {}) {
  let hechos = 0
  let fallidos = 0
  for (const f of filas) {
    const delta = f.ajuste.delta
    const res = await inventoryService.registerMovement({
      product_id: f.existente.id,
      movement_type: 'ADJUSTMENT',
      quantity: Math.abs(delta),
      is_negative: delta < 0,
      cost_price: 0,
      description: 'Importación',
    })
    if (res?.success) hechos++
    else fallidos++
    onProgreso({ hechas: hechos + fallidos, total: filas.length })
  }
  return { hechos, fallidos }
}

/** Últimas importaciones de la empresa. */
export async function listarImportaciones(limite = 8) {
  const { data, error } = await supabase
    .from('importaciones_productos')
    .select('id, origen, archivo, total, creados, actualizados, con_error, ids_creados, deshecha_en, created_at')
    .eq('client_id', getCurrentClientId())
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error) throw error
  return data || []
}

/**
 * Deshace una importación (24 h): manda a la papelera los productos creados
 * que aún no tienen ventas. Devuelve cuántos se quitaron y cuántos se conservaron.
 */
export async function deshacerImportacion(importacion, ahora = new Date()) {
  if (!puedeDeshacer(importacion, ahora)) throw new Error('Ya pasaron 24 horas o esta importación no se puede deshacer')
  const orgId = getCurrentOrganizationId()
  const ids = importacion.ids_creados

  const conVentas = new Set()
  for (const lote of enLotes(ids, 200)) {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('product_id')
      .in('product_id', lote)
      .eq('movement_type', 'OUT_SALE')
    if (error) throw error
    ;(data || []).forEach((m) => conVentas.add(m.product_id))
  }
  const quitar = ids.filter((id) => !conVentas.has(id))

  for (const lote of enLotes(quitar, 200)) {
    const { error } = await supabase
      .from('inventory_products')
      .update({ status: 'INACTIVE', deleted_at: new Date().toISOString() })
      .in('id', lote)
      .eq('organization_id', orgId)
    if (error) throw error
  }

  const { error } = await supabase
    .from('importaciones_productos')
    .update({ deshecha_en: new Date().toISOString() })
    .eq('id', importacion.id)
  if (error) throw error

  return { quitados: quitar.length, conservados: conVentas.size }
}

export default { leerArchivo, obtenerRubro, cargarExistentes, importarPlan, ajustarExistencias, listarImportaciones, deshacerImportacion }
