/**
 * Cliente compartido para la Edge Function `ai-chat`.
 *
 * Centraliza la invocación vía `supabase.functions.invoke` y la normalización
 * de errores (tanto errores HTTP de la función como errores de red) a la
 * forma { code, message } usada en todo el frontend. Lo usan los servicios
 * de chat y OCR que antes llamaban directamente a DeepSeek/NVIDIA desde el
 * navegador.
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Invoca `ai-chat` para generar texto, opcionalmente con imágenes (visión).
 *
 * @param {Object} params
 * @param {string} params.prompt - Instrucción/pregunta principal (requerido)
 * @param {Array<{mimeType: string, base64: string}>} [params.images] - Imágenes para proveedores con visión
 * @param {string} [params.system] - System prompt opcional
 * @param {'json'} [params.responseFormat] - Si se espera JSON estricto
 * @returns {Promise<string>} Texto generado por el proveedor activo
 * @throws {{ code: string, message: string }}
 */
export async function callAiGenerate({ prompt, images, system, responseFormat } = {}) {
  if (!prompt || !prompt.trim()) {
    throw { code: 'INVALID_INPUT', message: 'El mensaje no puede estar vacío.' }
  }

  const body = { prompt }
  if (images && images.length) body.images = images
  if (system) body.system = system
  if (responseFormat) body.responseFormat = responseFormat

  const { data, error } = await supabase.functions.invoke('ai-chat', { body })

  if (error) {
    // supabase.functions.invoke no propaga el body JSON del error en `data`
    // cuando la función responde con un status != 2xx: hay que leerlo de
    // error.context (el Response crudo), si está disponible.
    let errBody = null
    try {
      if (error.context && typeof error.context.json === 'function') {
        errBody = await error.context.json()
      }
    } catch (_) {
      errBody = null
    }

    const code = errBody?.error?.code || 'NETWORK_ERROR'
    const message = errBody?.error?.message || error.message || 'No se pudo conectar con el servicio de IA.'
    throw { code, message }
  }

  if (!data?.ok) {
    throw {
      code: data?.error?.code || 'UNKNOWN',
      message: data?.error?.message || 'Error desconocido del servicio de IA.'
    }
  }

  return data.data.text
}
