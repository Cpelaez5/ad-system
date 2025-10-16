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

// Validar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de entorno de Supabase no encontradas. El sistema funcionará en modo fallback.')
  console.warn('📝 Para habilitar Supabase, crea un archivo .env.local con:')
  console.warn('   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co')
  console.warn('   VITE_SUPABASE_ANON_KEY=tu-clave-anonima')
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
