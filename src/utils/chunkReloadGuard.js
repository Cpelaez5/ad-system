// Ayuda a recuperarse de errores de carga de "chunks" (módulos JS divididos por Vite)
// que ocurren cuando el navegador tiene abierta una pestaña vieja justo después de un
// deploy en Netlify: el index.html en memoria referencia archivos hasheados que ya no
// existen en el servidor. La solución es recargar la página UNA sola vez.
//
// Funciones puras / aisladas a propósito para poder testearlas sin montar el router.

const RELOAD_FLAG_KEY = 'ad_chunk_reload_pending'

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module'
]

/**
 * Determina si un error de navegación corresponde a un fallo de carga de chunk.
 * @param {Error|string|null|undefined} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
  if (!error) return false
  const message = typeof error === 'string' ? error : (error.message || '')
  if (!message) return false
  return CHUNK_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
}

/**
 * @param {Storage} [storage] inyectable para tests
 */
export function hasPendingChunkReload(storage = getDefaultStorage()) {
  try {
    return storage?.getItem(RELOAD_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Marca que ya se intentó una recarga por error de chunk, para no entrar en bucle.
 * @param {Storage} [storage]
 */
export function markChunkReloadPending(storage = getDefaultStorage()) {
  try {
    storage?.setItem(RELOAD_FLAG_KEY, '1')
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena, etc.) - seguimos sin marca.
  }
}

/**
 * Limpia la marca. Se debe llamar cuando una navegación termina bien.
 * @param {Storage} [storage]
 */
export function clearChunkReloadFlag(storage = getDefaultStorage()) {
  try {
    storage?.removeItem(RELOAD_FLAG_KEY)
  } catch {
    // no-op
  }
}

function getDefaultStorage() {
  return typeof sessionStorage !== 'undefined' ? sessionStorage : null
}
