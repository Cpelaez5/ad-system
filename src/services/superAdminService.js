/**
 * superAdminService.js — consultas y escrituras del panel de Operación del
 * super admin (catálogo global, uso de IA y tasas globales). Las políticas RLS
 * ya limitan todo al rol `super_admin`; aquí solo se arman las consultas.
 *
 * Privacidad: NUNCA lee `catalogo_aportes` (el super admin ve solo el número de
 * confirmaciones) ni correos o nombres de usuarios en el uso de IA.
 *
 * Devuelve { data, error } (error = mensaje en español o null); no lanza.
 */
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'
import {
  FILTROS_CATALOGO, filtroBusqueda, validarProveedor, validarProducto,
  fusionarSemilla, extensionFoto, rutaFotoCatalogo, errorFoto,
} from '@/utils/catalogoAdmin.js'
import { MAX_FILAS_IA, inicioPeriodo } from '@/utils/usoIa.js'
import { DIAS_HABILES_TABLA, ultimosDiasHabiles } from '@/utils/tasasAdmin.js'
import { enLotes } from '@/utils/importacionProductos.js'

const TABLAS = { proveedores: 'catalogo_proveedores', productos: 'catalogo_productos' }
const BUCKET = 'catalogo'
const LIMITE_LISTA = 200

const mensaje = (err, porDefecto) => {
  const texto = String(err?.message || '')
  if (/duplicate key|unique/i.test(texto)) return 'Ya existe un registro con ese RIF o código de barras.'
  if (/row-level security|permission denied/i.test(texto)) return 'Tu cuenta no tiene permiso para hacer esto.'
  return porDefecto
}

// ── Catálogo ────────────────────────────────────────────────────────────────

/** Cuántos proveedores y productos faltan por verificar. */
export async function contarPorVerificar() {
  try {
    const contar = async (tabla) => {
      const { count, error } = await supabase.from(tabla).select('id', { count: 'exact', head: true }).eq('verificado', false)
      if (error) throw error
      return count || 0
    }
    const [proveedores, productos] = await Promise.all([contar(TABLAS.proveedores), contar(TABLAS.productos)])
    return { data: { proveedores, productos }, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'contarPorVerificar', err?.message)
    return { data: { proveedores: 0, productos: 0 }, error: 'No pudimos contar lo que falta por verificar.' }
  }
}

/** Lista el catálogo: `tipo` = 'proveedores' | 'productos'. Máximo 200 filas, con el total real. */
export async function listarCatalogo(tipo, { filtro = FILTROS_CATALOGO.POR_VERIFICAR, texto = '' } = {}) {
  try {
    let q = supabase.from(TABLAS[tipo]).select('*', { count: 'exact' })
    if (filtro === FILTROS_CATALOGO.POR_VERIFICAR) q = q.eq('verificado', false)
    if (filtro === FILTROS_CATALOGO.VERIFICADOS) q = q.eq('verificado', true)
    const or = filtroBusqueda(tipo, texto)
    if (or) q = q.or(or)
    q = filtro === FILTROS_CATALOGO.POR_VERIFICAR
      ? q.order('confirmaciones', { ascending: false }).order('created_at', { ascending: false })
      : q.order(tipo === 'proveedores' ? 'razon_social' : 'nombre', { ascending: true })
    const { data, error, count } = await q.limit(LIMITE_LISTA)
    if (error) throw error
    return { data: data || [], total: count ?? (data || []).length, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'listarCatalogo', err?.message)
    return { data: [], total: 0, error: 'No pudimos cargar el catálogo.' }
  }
}

async function actualizar(tipo, id, cambios) {
  try {
    const { data, error } = await supabase.from(TABLAS[tipo]).update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'actualizar', err?.message)
    return { data: null, error: mensaje(err, 'No pudimos guardar el cambio.') }
  }
}

/** Marca o quita la verificación. */
export const verificar = (tipo, id, verificado = true) => actualizar(tipo, id, { verificado })

/** Edita solo los campos permitidos (el RIF y el código de barras no se cambian aquí). */
export async function editar(tipo, id, form) {
  if (tipo === 'proveedores') {
    const v = validarProveedor(form)
    if (!v.ok) return { data: null, error: Object.values(v.errores)[0] }
    const { rif_normalizado: _r, rif: _f, tipo_persona: _t, ...campos } = v.valor
    return actualizar(tipo, id, campos)
  }
  const v = validarProducto(form)
  if (!v.ok) return { data: null, error: Object.values(v.errores)[0] }
  const { codigo_barras: _c, ...campos } = v.valor
  return actualizar(tipo, id, campos)
}

/** Carga manual: fuente 'equipo', ya verificado (lo cargó el equipo). */
export async function crear(tipo, form) {
  const v = tipo === 'proveedores' ? validarProveedor(form) : validarProducto(form)
  if (!v.ok) return { data: null, error: Object.values(v.errores)[0] }
  try {
    const { data, error } = await supabase.from(TABLAS[tipo]).insert({ ...v.valor, fuente: 'equipo', verificado: true }).select().single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'crear', err?.message)
    return { data: null, error: mensaje(err, 'No pudimos agregarlo al catálogo.') }
  }
}

export async function eliminar(tipo, item) {
  try {
    const { error } = await supabase.from(TABLAS[tipo]).delete().eq('id', item.id)
    if (error) throw error
    if (tipo === 'productos' && item.foto_path) {
      await supabase.storage.from(BUCKET).remove([item.foto_path]).catch(() => {})
    }
    return { data: true, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'eliminar', err?.message)
    return { data: null, error: mensaje(err, 'No pudimos eliminarlo.') }
  }
}

/** Sube la foto de estudio a `catalogo/productos/<codigo>.<ext>` y guarda `foto_path`. */
export async function subirFotoEstudio(producto, archivo) {
  const falla = errorFoto(archivo)
  if (falla) return { data: null, error: falla }
  const ruta = rutaFotoCatalogo(producto.codigo_barras, extensionFoto(archivo))
  if (!ruta) return { data: null, error: 'Este producto no tiene un código de barras válido.' }
  try {
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { upsert: true, contentType: archivo.type || undefined, cacheControl: '3600' })
    if (error) throw error
    // Si antes tenía una foto con otra extensión, se limpia.
    if (producto.foto_path && producto.foto_path !== ruta) {
      await supabase.storage.from(BUCKET).remove([producto.foto_path]).catch(() => {})
    }
    return await actualizar('productos', producto.id, { foto_path: ruta })
  } catch (err) {
    logger.warn('[superAdminService]', 'subirFotoEstudio', err?.message)
    return { data: null, error: mensaje(err, 'No pudimos subir la foto.') }
  }
}

/** URL pública de la foto (con marca de versión para ver el reemplazo al instante). */
export function urlFoto(item) {
  if (!item?.foto_path) return null
  try {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(item.foto_path)
    const url = data?.publicUrl
    return url ? `${url}?v=${encodeURIComponent(item.updated_at || '')}` : null
  } catch {
    return null
  }
}

/** Semilla: upsert por código de barras con fuente 'importado' (conserva los datos que ya había). */
export async function importarSemilla(filas = [], alAvanzar = () => {}) {
  let hechas = 0
  try {
    for (const lote of enLotes(filas, 100)) {
      const { data: existentes, error: errLectura } = await supabase
        .from(TABLAS.productos).select('codigo_barras,nombre,marca,categoria,presentacion,unidad')
        .in('codigo_barras', lote.map((f) => f.codigo_barras))
      if (errLectura) throw errLectura
      const porCodigo = new Map((existentes || []).map((e) => [e.codigo_barras, e]))
      const paraGuardar = lote.map((f) => fusionarSemilla(f, porCodigo.get(f.codigo_barras)))
      const { error } = await supabase.from(TABLAS.productos).upsert(paraGuardar, { onConflict: 'codigo_barras' })
      if (error) throw error
      hechas += lote.length
      alAvanzar(hechas)
    }
    return { data: { guardadas: hechas }, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'importarSemilla', err?.message)
    return { data: { guardadas: hechas }, error: mensaje(err, `Se guardaron ${hechas} filas y luego falló la carga. Puedes volver a subir el archivo: no se duplica nada.`) }
  }
}

// ── Uso de IA ───────────────────────────────────────────────────────────────

const COLUMNAS_IA = 'user_id,model,status,error_code,error_message,tokens_prompt,tokens_completion,costo_estimado,created_at'
const PAGINA = 1000

/** Filas de `ai_usage_logs` del período (solo las columnas necesarias; hasta 10.000). */
export async function filasUsoIa(dias, hoy = new Date()) {
  const desde = inicioPeriodo(dias, hoy)
  const filas = []
  try {
    for (let i = 0; i < MAX_FILAS_IA; i += PAGINA) {
      const { data, error } = await supabase
        .from('ai_usage_logs').select(COLUMNAS_IA).gte('created_at', desde)
        .order('created_at', { ascending: false }).range(i, i + PAGINA - 1)
      if (error) throw error
      filas.push(...(data || []))
      if (!data || data.length < PAGINA) break
    }
    return { data: filas, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'filasUsoIa', err?.message)
    return { data: filas, error: 'No pudimos cargar el uso de IA.' }
  }
}

/** Errores de IA de los últimos 7 días (para la portada). */
export async function contarErroresIa7Dias(hoy = new Date()) {
  try {
    const { count, error } = await supabase
      .from('ai_usage_logs').select('id', { count: 'exact', head: true })
      .gte('created_at', inicioPeriodo(7, hoy)).or('status.is.null,status.neq.success')
    if (error) throw error
    return { data: count || 0, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'contarErroresIa7Dias', err?.message)
    return { data: 0, error: 'No pudimos contar los errores de IA.' }
  }
}

// ── Tasas ───────────────────────────────────────────────────────────────────

/** Filas de `exchange_rates` desde el primero de los últimos 60 días hábiles. */
export async function filasTasas(hoy = new Date()) {
  const dias = ultimosDiasHabiles(DIAS_HABILES_TABLA, hoy)
  try {
    const { data, error } = await supabase
      .from('exchange_rates').select('date,currency,rate,source')
      .gte('date', dias[dias.length - 1]).order('date', { ascending: false }).limit(1000)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'filasTasas', err?.message)
    return { data: [], error: 'No pudimos cargar las tasas.' }
  }
}

/** Corrige o agrega una tasa (upsert por fecha y moneda). `valor` viene de `validarTasaManual`. */
export async function guardarTasaManual(valor) {
  try {
    const { error } = await supabase.from('exchange_rates').upsert(valor, { onConflict: 'date,currency' })
    if (error) throw error
    return { data: true, error: null }
  } catch (err) {
    logger.warn('[superAdminService]', 'guardarTasaManual', err?.message)
    return { data: null, error: mensaje(err, 'No pudimos guardar la tasa.') }
  }
}
