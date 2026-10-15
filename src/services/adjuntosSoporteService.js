/**
 * adjuntosSoporteService — capturas de pantalla del chat de soporte.
 * Bucket privado 'soporte-adjuntos' (ver supabase/migrations/20261015170000_soporte_adjuntos.sql).
 * Comprime en el navegador, sube y entrega enlaces firmados de 1 hora (en caché por ruta).
 * Devuelve { data, error } (error en español); no lanza.
 */
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'
import { BUCKET, CALIDAD, LADO_MAXIMO, construirRuta, dimensionesReducidas, necesitaComprimir } from '@/utils/adjuntosSoporte.js'

const VIGENCIA_SEGUNDOS = 3600
// Se renueva un poco antes de que venza para no entregar un enlace a punto de caducar.
const MARGEN_MS = 5 * 60 * 1000
const cache = new Map() // ruta -> { url, vence }

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen ilegible')) }
    img.src = url
  })
}

const aBlob = (canvas, mime, calidad) => new Promise((resolve) => canvas.toBlob(resolve, mime, calidad))

/**
 * Lee las medidas y, si la captura es muy grande, la reduce (máx. 1920 px, webp/jpeg ~0,85).
 * Si algo falla se sube el original (ya validado a 5 MB como máximo).
 * @returns {Promise<{blob: Blob, mime: string, ancho: number, alto: number}>}
 */
export async function prepararImagen(archivo) {
  try {
    const img = await cargarImagen(archivo)
    const original = { ancho: img.naturalWidth, alto: img.naturalHeight }
    if (!necesitaComprimir({ size: archivo.size, ...original })) {
      return { blob: archivo, mime: archivo.type, ...original }
    }
    const { ancho, alto } = dimensionesReducidas(original.ancho, original.alto, LADO_MAXIMO)
    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    canvas.getContext('2d').drawImage(img, 0, 0, ancho, alto)
    let mime = 'image/webp'
    let blob = await aBlob(canvas, mime, CALIDAD)
    if (!blob || blob.type !== mime) { // Safari antiguo no codifica webp
      mime = 'image/jpeg'
      blob = await aBlob(canvas, mime, CALIDAD)
    }
    if (!blob || blob.size >= archivo.size) return { blob: archivo, mime: archivo.type, ...original }
    return { blob, mime, ancho, alto }
  } catch {
    return { blob: archivo, mime: archivo.type, ancho: 0, alto: 0 }
  }
}

/**
 * Sube las capturas de una conversación y devuelve la lista para guardar en `adjuntos`:
 * [{ path, nombre, mime, tamano, ancho, alto }].
 */
export async function subirAdjuntos(conversationId, archivos) {
  const subidos = []
  try {
    for (const archivo of archivos) {
      const { blob, mime, ancho, alto } = await prepararImagen(archivo)
      const path = construirRuta(conversationId, crypto.randomUUID(), mime)
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false })
      if (error) throw error
      subidos.push({ path, nombre: archivo.name || 'captura', mime, tamano: blob.size, ancho, alto })
    }
    return { data: subidos, error: null }
  } catch (e) {
    logger.error?.('No se pudieron subir las capturas', e)
    // Las que ya subieron quedarían huérfanas: se intenta limpiarlas.
    if (subidos.length) supabase.storage.from(BUCKET).remove(subidos.map((s) => s.path)).catch(() => {})
    return { data: null, error: 'No pudimos subir las imágenes. Revisa tu conexión e intenta de nuevo.' }
  }
}

/** Enlace firmado (1 hora) de una captura, en caché por ruta. */
export async function urlDeAdjunto(path) {
  const guardado = cache.get(path)
  if (guardado && guardado.vence - Date.now() > MARGEN_MS) return guardado.url
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, VIGENCIA_SEGUNDOS)
    if (error) throw error
    cache.set(path, { url: data.signedUrl, vence: Date.now() + VIGENCIA_SEGUNDOS * 1000 })
    return data.signedUrl
  } catch (e) {
    logger.error?.('No se pudo abrir la captura', e)
    return null
  }
}
