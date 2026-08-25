import { supabase } from '@/lib/supabaseClient';

/**
 * Llama a la Edge Function de ai-chat para generar texto libre.
 *
 * @param {string} prompt El texto o pregunta del usuario
 * @returns {Object} Respuesta generada por la IA
 * @throws  {Object} { code, message, suggestManualEntry }
 */
export async function procesarChatIA(prompt) {
  if (!prompt || !prompt.trim()) {
    throw { code: 'INVALID_INPUT', message: 'El mensaje no puede estar vacío.' };
  }

  const { data: { session } } = await supabase.auth.getSession();

  let response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt }),
      }
    );
  } catch (networkError) {
    throw { code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.' };
  }

  const result = await response.json();

  if (!result.ok) {
    const { code, message } = result.error;
    
    // Traducción de mensajes de error de forma similar al OCR
    let friendlyMessage = message;
    switch (code) {
      case 'QUOTA_EXCEEDED':
        friendlyMessage = 'La cuota de tu proveedor de Inteligencia Artificial se agotó (revisa tu facturación o límites).';
        break;
      case 'INVALID_KEY':
        friendlyMessage = 'La Llave API (API Key) es inválida o ha expirado. Por favor, actualízala en la configuración del Perfil.';
        break;
      case 'PROVIDER_ERROR':
        friendlyMessage = `El proveedor de IA rechazó la solicitud: ${message}`;
        break;
      case 'TIMEOUT':
        friendlyMessage = 'La Inteligencia Artificial tardó demasiado en responder. Intenta de nuevo.';
        break;
      case 'PREVIEW_RATE_LIMIT':
        friendlyMessage = 'Has superado el límite de peticiones rápidas de tu proveedor. Espera un minuto e intenta de nuevo.';
        break;
      case 'NO_ACTIVE_PROFILE':
        friendlyMessage = 'No hay ningún Perfil de Proveedor IA activo en el sistema. Configura uno primero.';
        break;
    }

    throw { code, message: friendlyMessage };
  }

  return result.data;
}
