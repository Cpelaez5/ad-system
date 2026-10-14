/**
 * catalogoService.js
 *
 * Catálogo global de AD System (proveedores y productos compartidos entre
 * negocios). Solo LEE: los aportes entran solos por triggers de la BD al
 * guardar proveedores o productos.
 *
 * Nunca lanza: si algo falla devuelve null o [] y deja el error en el logger.
 */

import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'
import { codigoBarrasValido, limpiarCodigoBarras } from '@/utils/codigoBarras'
import { subirBlob, reducirImagen } from '@/services/productoFotoService'

export const BUCKET_CATALOGO = 'catalogo'

/** RIF "letra + 9 dígitos". Devuelve el RIF limpio (sin guiones) o null. */
export function rifParaCatalogo(rif) {
  const limpio = String(rif ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^RIF/, '')
  return /^[JGCVEP]\d{9}$/.test(limpio) ? limpio : null
}

/** Proveedor del catálogo por RIF, o null. */
export async function buscarProveedorPorRif(rif) {
  const limpio = rifParaCatalogo(rif)
  if (!limpio) return null
  try {
    const { data, error } = await supabase.rpc('buscar_catalogo_proveedor', { p_rif: limpio })
    if (error) throw error
    return Array.isArray(data) ? (data[0] || null) : (data || null)
  } catch (err) {
    logger.warn('[catalogoService]', 'No se pudo consultar el proveedor en el catálogo', err?.message)
    return null
  }
}

/** Productos del catálogo por código de barras válido (exacto) o por texto (3+ letras, parecido). */
export async function buscarProducto(textoOCodigo, limite = 5) {
  const texto = String(textoOCodigo ?? '').trim()
  const esCodigo = codigoBarrasValido(texto)
  if (!esCodigo && texto.length < 3) return []
  try {
    const { data, error } = await supabase.rpc('buscar_catalogo_producto', {
      p_texto: esCodigo ? limpiarCodigoBarras(texto) : texto,
      p_limite: limite
    })
    if (error) throw error
    return Array.isArray(data) ? data : []
  } catch (err) {
    logger.warn('[catalogoService]', 'No se pudo consultar el producto en el catálogo', err?.message)
    return []
  }
}

/** Varios productos por sus códigos (un select `in` por lote de 200). */
export async function buscarProductosPorCodigos(codigos = []) {
  const validos = [...new Set((codigos || []).map(limpiarCodigoBarras).filter(codigoBarrasValido))]
  if (!validos.length) return []
  const resultado = []
  try {
    for (let i = 0; i < validos.length; i += 200) {
      const { data, error } = await supabase
        .from('catalogo_productos')
        .select('*')
        .in('codigo_barras', validos.slice(i, i + 200))
      if (error) throw error
      resultado.push(...(data || []))
    }
    return resultado
  } catch (err) {
    logger.warn('[catalogoService]', 'No se pudieron consultar los códigos en el catálogo', err?.message)
    return resultado
  }
}

/** URL pública de una foto del catálogo, o null. */
export function urlFotoCatalogo(path) {
  if (!path) return null
  try {
    const { data } = supabase.storage.from(BUCKET_CATALOGO).getPublicUrl(path)
    return data?.publicUrl || null
  } catch (err) {
    logger.warn('[catalogoService]', 'No se pudo armar la URL de la foto del catálogo', err?.message)
    return null
  }
}

/** Descarga la foto pública del catálogo y la sube como foto privada del negocio. Devuelve el foto_path o null. */
export async function copiarFotoCatalogoAlNegocio(path) {
  const url = urlFotoCatalogo(path)
  if (!url) return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await reducirImagen(await resp.blob())
    const { path: privado, error } = await subirBlob(blob)
    if (error || !privado) throw new Error(error || 'sin_ruta')
    return privado
  } catch (err) {
    logger.warn('[catalogoService]', 'No se pudo copiar la foto del catálogo al negocio', err?.message)
    return null
  }
}
