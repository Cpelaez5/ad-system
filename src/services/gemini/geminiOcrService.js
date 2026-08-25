import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_B  = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Sube un archivo a Storage y llama a la Edge Function de OCR.
 * Soporta tanto PDF como Imágenes (requerido para múltiples proveedores).
 * La limpieza del archivo temporal es responsabilidad de la Edge Function.
 *
 * @param {File}     file          - Archivo a procesar (PDF, JPG, PNG)
 * @param {Object}   options       - Opciones adicionales
 * @param {string}   options.comprobanteId - ID del comprobante contable (opcional)
 * @param {Object}   options.userContext   - Contexto del usuario (opcional)
 * @param {string}   options.flowType      - Tipo de flujo (opcional)
 * @param {Function} options.onProgress    - Callback con mensaje de progreso ('Subiendo...' | 'Analizando...' | null)
 * @returns {Object} Datos extraídos del comprobante
 * @throws  {Object} { code, message, suggestManualEntry }
 */
export async function procesarComprobanteOCR(
  file, 
  {
    comprobanteId = null,
    userContext = null,
    flowType = null,
    onProgress = null
  } = {}
) {

  // --- 1. Validación cliente ---
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    throw { 
      code: 'INVALID_TYPE', 
      message: 'Solo se aceptan archivos PDF, JPG y PNG.', 
      suggestManualEntry: false 
    };
  }

  if (file.size > MAX_FILE_SIZE_B) {
    throw { 
      code: 'FILE_TOO_LARGE',
      message: `El archivo debe pesar menos de ${MAX_FILE_SIZE_MB}MB.`,
      suggestManualEntry: false 
    };
  }

  // --- 1.5 Compresión de Imagen (Prioridad 2 - Optimización) ---
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    onProgress?.('Optimizando imagen...');
    try {
      const options = {
        maxSizeMB: 1, // Reducir a 1MB máximo (Gemini lee perfectamente 1MB)
        maxWidthOrHeight: 1920, // Resolución más que suficiente para texto
        useWebWorker: true
      };
      fileToUpload = await imageCompression(file, options);
      console.log(`[OCR] Imagen comprimida de ${(file.size / 1024 / 1024).toFixed(2)} MB a ${(fileToUpload.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.warn('[OCR] Error al comprimir imagen, subiendo original:', error);
    }
  }

  // --- 2. Subir a Storage ---
  onProgress?.('Subiendo documento...');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión para usar el OCR.', suggestManualEntry: true };
  }

  // Path incluye user_id para que RLS de Storage aplique correctamente
  const filePath = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from('temp_ocr')
    .upload(filePath, fileToUpload, { upsert: false });

  if (uploadError) {
    throw { code: 'UPLOAD_ERROR', message: uploadError.message, suggestManualEntry: false };
  }

  // A partir de aquí, el archivo es responsabilidad de la Edge Function.

  // --- 3. Llamar a la Edge Function ---
  onProgress?.('Analizando con IA...');

  const { data: { session } } = await supabase.auth.getSession();

  let response;
  try {
    response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ocr`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          file_path: filePath, 
          comprobante_id: comprobanteId,
          userContext: userContext,
          flowType: flowType
        }),
      }
    );
  } catch (networkError) {
    throw { code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor.', suggestManualEntry: true };
  }

  const result = await response.json();
  onProgress?.(null);

  if (!result.ok) {
    const { code, message } = result.error;

    // Traducción y mejora de mensajes
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
        friendlyMessage = 'La Inteligencia Artificial tardó demasiado en analizar el documento. Intenta de nuevo.';
        break;
      case 'PREVIEW_RATE_LIMIT':
        friendlyMessage = 'Has superado el límite de peticiones rápidas de tu proveedor. Espera un minuto e intenta de nuevo.';
        break;
      case 'PARSE_ERROR':
        friendlyMessage = 'La Inteligencia Artificial no pudo estructurar los datos correctamente. Sube un documento más legible.';
        break;
      case 'NO_ACTIVE_PROFILE':
        friendlyMessage = 'No hay ningún Perfil de Proveedor IA activo en el sistema. Configura uno primero.';
        break;
      case 'OCR_IN_PROGRESS':
        friendlyMessage = 'Ya hay una extracción en curso para tu usuario. Por favor, espera a que termine.';
        break;
      case 'FILE_TOO_LARGE':
        friendlyMessage = `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE_MB}MB).`;
        break;
    }

    // Casos donde sugerir ingreso manual como alternativa
    const fallbackCodes = [
      'TIMEOUT', 'QUOTA_EXCEEDED', 'PREVIEW_RATE_LIMIT', 
      'GEMINI_ERROR', 'PROVIDER_ERROR', 'PARSE_ERROR', 'UNSUPPORTED_FORMAT', 'INVALID_KEY'
    ];
    
    throw {
      code,
      message: friendlyMessage,
      suggestManualEntry: fallbackCodes.includes(code),
    };
  }

  return result.data;
}
