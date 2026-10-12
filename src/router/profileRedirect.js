// Lógica aislada (y testeable) para decidir a dónde va la ruta '/profile'.
// No depende del router ni de Supabase: solo lee el usuario ya cacheado en
// localStorage por userService, que en este punto ya pasó el guard de auth.

/**
 * @param {Storage} [storage] inyectable para tests
 * @returns {{ path: string }}
 */
export function resolveProfileRedirect(storage = getDefaultStorage()) {
  try {
    const raw = storage?.getItem('currentUser')
    const stored = raw ? JSON.parse(raw) : null
    if (stored && stored.role === 'cliente') {
      return { path: '/cliente/mi-area' }
    }
  } catch {
    // Si el valor guardado no es JSON válido, usamos el destino por defecto.
  }
  return { path: '/settings' }
}

function getDefaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null
}
