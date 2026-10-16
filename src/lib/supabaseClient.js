/**
 * Cliente de Supabase para el Sistema de Contabilidad
 * 
 * Este archivo configura la conexión con Supabase y exporta el cliente
 * para ser usado en toda la aplicación.
 * 
 * Características:
 * - Configuración automática desde variables de entorno
 * - Cliente singleton para optimizar conexiones
 * - Configuración de autenticación automática
 * - Manejo de errores centralizado
 */

import { createClient } from '@supabase/supabase-js'

// Obtener las credenciales de Supabase desde las variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug: Mostrar el estado de las variables de entorno esperadas.
// IMPORTANTE: nunca loguear `import.meta.env` completo. Vite reemplaza esa
// referencia por un objeto literal con TODAS las variables VITE_* definidas
// en .env (incluyendo cualquier secreto que alguien agregue por error), y
// ese objeto queda horneado en el bundle público y se imprime en la consola
// del navegador en cada carga.
console.log('🔍 Variables de entorno de Supabase:', {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'Cargada' : 'No cargada'
})

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de entorno de Supabase no encontradas. El sistema funcionará en modo fallback.')
  console.warn('📝 Para habilitar Supabase, crea un archivo .env con:')
  console.warn('   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co')
  console.warn('   VITE_SUPABASE_ANON_KEY=tu-clave-anonima')
  console.warn('🔧 Variables actuales:', { supabaseUrl, supabaseAnonKey })
} else {
  console.log('✅ Variables de entorno de Supabase cargadas correctamente')
  console.log('🔗 URL:', supabaseUrl)
  console.log('🔑 Key:', supabaseAnonKey ? 'Cargada' : 'No cargada')
}

// Crear el cliente de Supabase con configuración optimizada
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // Configuración de autenticación
      autoRefreshToken: true,        // Renovar tokens automáticamente
      persistSession: true,          // Mantener sesión en localStorage
      detectSessionInUrl: true,      // Detectar sesión en URL (para redirects)
      flowType: 'pkce'              // Usar PKCE para mayor seguridad
    },
    // Configuración de la base de datos
    db: {
      schema: 'public'              // Usar el schema público
    },
    // Configuración global
    global: {
      headers: {
        'X-Client-Info': 'sistema-contabilidad-vue'  // Identificar la aplicación
      }
    }
  })

// Tiempo real con la sesión del usuario. Con la sesión guardada (INITIAL_SESSION) el
// cliente no le pasaba el token al socket: los canales entraban como anónimos y las
// reglas RLS filtraban TODOS los eventos (p. ej. el punto rojo del chat no aparecía).
// setAuth también actualiza los canales ya unidos.
supabase.auth.onAuthStateChange((_evento, session) => {
  if (session?.access_token) supabase.realtime.setAuth(session.access_token)
})

/**
 * Abre un canal de tiempo real CON la sesión del usuario ya puesta en el socket.
 * Si el canal se une antes de tener el token, el servidor registra la suscripción como
 * anónima y las reglas RLS filtran todos los eventos para siempre (enviar el token
 * después no la corrige). `configurar(canal)` agrega los .on(...); devuelve cancelar().
 */
export function canalConSesion(nombre, configurar) {
  let canal = null
  let cancelado = false
  ;(async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (token) await supabase.realtime.setAuth(token)
    } catch { /* sin sesión: el canal queda anónimo, como antes */ }
    if (cancelado) return
    canal = configurar(supabase.channel(nombre)).subscribe()
  })()
  return () => {
    cancelado = true
    if (canal) supabase.removeChannel(canal)
  }
}

// Función helper para verificar la conexión con Supabase
export async function testSupabaseConnection() {
  try {
    console.log('🔄 Probando conexión con Supabase...')

    // Hacer una query simple para verificar la conexión
    const { data, error } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)

    if (error) {
      console.warn('⚠️ Supabase conectado pero sin tablas creadas:', error.message)
      return { connected: true, tablesCreated: false }
    }

    console.log('✅ Conexión con Supabase exitosa')
    return { connected: true, tablesCreated: true }
  } catch (error) {
    console.error('❌ Error de conexión con Supabase:', error)
    return { connected: false, tablesCreated: false }
  }
}

// Función helper para obtener la sesión actual
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Error al obtener sesión:', error)
      return null
    }

    return session
  } catch (error) {
    console.error('❌ Error inesperado al obtener sesión:', error)
    return null
  }
}

// Función helper para obtener el usuario actual
export async function getCurrentUser() {
  try {
    const session = await getCurrentSession()

    if (!session?.user) {
      return null
    }

    // Obtener datos completos del usuario desde la tabla users
    const { data: userData, error } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('❌ Error al obtener datos del usuario:', error)
      return null
    }

    return userData
  } catch (error) {
    console.error('❌ Error inesperado al obtener usuario:', error)
    return null
  }
}

// Función para verificar si Supabase está configurado correctamente
export function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key')
}

// Exportar por defecto para compatibilidad
export default supabase

// Solo en desarrollo: acceso desde la consola para depurar sesión y tiempo real.
if (import.meta.env.DEV && typeof window !== 'undefined') window.__supabase = supabase
