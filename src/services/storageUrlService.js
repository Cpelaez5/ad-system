/**
 * storageUrlService.js
 *
 * Utilidades para resolver rutas de Supabase Storage y obtener URLs firmadas,
 * en preparación para el paso de los buckets `documents` e `invoices` a privados.
 *
 * - extraerRutaStorage: normaliza un valor guardado en BD (ruta relativa, URL pública
 *   antigua o URL firmada antigua) a la ruta relativa real dentro del bucket.
 * - obtenerUrlFirmada: genera (y cachea en memoria) una URL firmada corta para mostrar
 *   o descargar el archivo, sin importar si el bucket es público o privado.
 *
 * Principios:
 * - Nunca lanza: ante cualquier fallo devuelve null para no romper la UI.
 * - Cachea en memoria por (bucket, ruta) hasta poco antes de que expire la firma,
 *   para evitar llamadas repetidas a Supabase en renders/recargas seguidas.
 */

import { supabase } from '@/lib/supabaseClient'

// Caché en memoria: clave `${bucket}::${ruta}` -> { url, expiresAt }
const signedUrlCache = new Map()

// Margen de seguridad antes de la expiración real para refrescar la URL (segundos)
const EXPIRY_SAFETY_MARGIN_SECONDS = 30

/**
 * Extrae la ruta relativa dentro de un bucket a partir de:
 * - Una ruta ya relativa (ej: "org123/FISCAL/archivo.pdf") -> se devuelve igual.
 * - Una URL pública antigua: ".../storage/v1/object/public/<bucket>/<ruta>"
 * - Una URL firmada antigua: ".../storage/v1/object/sign/<bucket>/<ruta>?token=..."
 *
 * @param {string} bucket - Nombre del bucket esperado (ej: 'documents', 'invoices')
 * @param {string} valor - Ruta o URL guardada en BD / localStorage
 * @returns {string|null} Ruta relativa decodificada, o null si no se reconoce el valor
 */
export function extraerRutaStorage(bucket, valor) {
  if (!bucket || !valor || typeof valor !== 'string') return null

  const trimmed = valor.trim()
  if (!trimmed) return null

  // Los DataURL (base64) no son rutas de Storage
  if (trimmed.startsWith('data:')) return null

  // URL pública o firmada de Supabase Storage
  // Formatos:
  //   .../storage/v1/object/public/<bucket>/<ruta>
  //   .../storage/v1/object/sign/<bucket>/<ruta>?token=...
  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/i)
  if (match) {
    const [, bucketInUrl, encodedPath] = match
    if (bucketInUrl !== bucket) return null
    try {
      const decoded = decodeURIComponent(encodedPath)
      return decoded || null
    } catch (e) {
      // Si falla el decode, devolver tal cual (mejor que null)
      return encodedPath || null
    }
  }

  // Si es cualquier otra URL http(s) que no reconocemos, no es una ruta válida
  if (/^https?:\/\//i.test(trimmed)) {
    return null
  }

  // Asumimos que es una ruta relativa directa dentro del bucket
  // (puede venir con o sin codificar; intentamos decodificar por seguridad)
  try {
    return decodeURIComponent(trimmed)
  } catch (e) {
    return trimmed
  }
}

function getCacheKey(bucket, ruta) {
  return `${bucket}::${ruta}`
}

/**
 * Obtiene una URL firmada para un archivo de Storage, aceptando tanto rutas relativas
 * como URLs públicas/firmadas antiguas. Cachea en memoria hasta poco antes de expirar.
 *
 * @param {string} bucket - Nombre del bucket ('documents', 'invoices', etc.)
 * @param {string} valor - Ruta o URL guardada
 * @param {number} [segundos=3600] - Duración de la URL firmada en segundos
 * @returns {Promise<string|null>} URL firmada, o null si no se pudo generar
 */
export async function obtenerUrlFirmada(bucket, valor, segundos = 3600) {
  try {
    const ruta = extraerRutaStorage(bucket, valor)
    if (!ruta) return null

    const cacheKey = getCacheKey(bucket, ruta)
    const cached = signedUrlCache.get(cacheKey)
    const now = Date.now()

    if (cached && cached.expiresAt - now > EXPIRY_SAFETY_MARGIN_SECONDS * 1000) {
      return cached.url
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(ruta, segundos)

    if (error || !data?.signedUrl) {
      console.warn(`⚠️ [storageUrlService] No se pudo firmar la URL (${bucket}/${ruta}):`, error?.message)
      return null
    }

    signedUrlCache.set(cacheKey, {
      url: data.signedUrl,
      expiresAt: now + segundos * 1000
    })

    return data.signedUrl
  } catch (error) {
    console.warn('⚠️ [storageUrlService] Error inesperado generando URL firmada:', error?.message)
    return null
  }
}

export default {
  extraerRutaStorage,
  obtenerUrlFirmada
}
