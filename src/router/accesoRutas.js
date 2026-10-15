// Lógica pura (sin Vue, sin Supabase) para decidir quién entra a qué ruta.
// El guard del router la usa y los tests la cubren.

export const ROLES_VALIDOS = ['super_admin', 'admin', 'contador', 'cliente']

/** Pantalla de inicio de cada rol. Sin rol válido devuelve el inicio de sesión. */
export function homeDeRol(role) {
  switch (role) {
    case 'cliente': return '/cliente/inicio'
    case 'super_admin': return '/admin/inicio'
    case 'admin':
    case 'contador': return '/dashboard'
    default: return '/login'
  }
}

/**
 * Valida un destino de "?redirect=". Solo acepta rutas internas ("/algo"):
 * rechaza "//otro.com", "/\otro.com", "https://...", vacíos y bucles hacia el login.
 * @returns {string|null} la ruta segura o null
 */
export function rutaSegura(redirect) {
  const valor = Array.isArray(redirect) ? redirect[0] : redirect
  if (typeof valor !== 'string' || valor.length === 0 || valor.length > 2000) return null
  if (!valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(valor)) return null
  const ruta = valor.split(/[?#]/)[0]
  if (['/login', '/signup', '/sin-permiso'].includes(ruta)) return null
  return valor
}

/**
 * Decide qué pasa al entrar a una ruta.
 * @param {{ meta?: object, fullPath?: string }} to
 * @param {{ role?: string } | null} user  null = sin sesión
 * @returns {{ accion: 'permitir' } | { accion: 'login', redirect: string } | { accion: 'prohibido' }}
 */
export function resolverAcceso(to, user) {
  const meta = to?.meta || {}
  if (!meta.requiresAuth) return { accion: 'permitir' }
  if (!user || !ROLES_VALIDOS.includes(user.role)) {
    return { accion: 'login', redirect: to?.fullPath || '/' }
  }
  if (Array.isArray(meta.roles) && !meta.roles.includes(user.role)) return { accion: 'prohibido' }
  return { accion: 'permitir' }
}
