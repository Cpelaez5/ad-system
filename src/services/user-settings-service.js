/**
 * user-settings-service.js
 * Servicio de configuración de preferencias del usuario.
 *
 * Persistencia HÍBRIDA:
 *  1. Supabase (user_preferences) — fuente de verdad, sincroniza entre dispositivos.
 *  2. localStorage — cache rápida para lecturas síncronas (UI, theme, header).
 *
 * Al guardar: escribe ambos simultáneamente.
 * Al cargar: lee localStorage inmediatamente, luego refresca desde Supabase.
 *
 * Responsabilidad única (S): solo gestiona preferencias de usuario.
 * Dependency Inversion (D): depende de la abstracción de preferencesService.
 */

import preferencesService from '@/services/preferencesService.js'

const STORAGE_KEY = 'ad_system_user_settings'
const PREFERENCE_KEY = 'user_settings'

/**
 * Valores por defecto del sistema.
 *
 * notifyPrimaryEmail: controla si el correo principal recibe notificaciones.
 *   - Por defecto: true (activo).
 *   - El usuario puede desactivarlo si lo considera innecesario.
 *
 * notificationEmails: array de objetos con configuración individual por correo adicional.
 * Estructura de cada objeto:
 * {
 *   email: string,
 *   notifyOnVenta:  boolean,
 *   notifyOnCompra: boolean,
 *   notifyOnGasto:  boolean,
 * }
 */
const DEFAULT_SETTINGS = {
  // ── Apariencia ──────────────────────────────────────────────────────────
  forceDarkMode: false,

  // ── Tasas de cambio en el header ─────────────────────────────────────────
  showUsdRate: true,
  showEurRate: true,

  // ── Correo principal ────────────────────────────────────────────────────
  notifyPrimaryEmail: true,

  // ── Correos adicionales con configuración individual por flujo ────────────
  notificationEmails: [],
  // Ejemplo de entrada:
  // { email: 'contador@firma.com', notifyOnVenta: true, notifyOnCompra: true, notifyOnGasto: true }
}

/**
 * Obtiene las configuraciones desde localStorage (lectura síncrona).
 * Fusiona con defaults para garantizar que siempre existan todas las claves.
 */
function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error leyendo cache local:', e)
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Guarda las configuraciones en localStorage Y Supabase simultáneamente.
 * Emite evento CustomEvent para sincronizar componentes reactivos (AppNavigation, App.vue).
 *
 * @param {object} settings - Objeto completo de configuraciones
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function saveSettings(settings) {
  // 1. Guardar en localStorage inmediatamente (sin latencia, UI reactiva)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('ad-settings-changed', { detail: settings }))
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error guardando en localStorage:', e)
  }

  // 2. Guardar en Supabase (persistencia entre dispositivos)
  try {
    const result = await preferencesService.setPreference(PREFERENCE_KEY, settings)
    if (result.success) {
      console.log('☁️ [UserSettings] Configuración sincronizada con Supabase')
    } else {
      console.warn('⚠️ [UserSettings] No se pudo sincronizar con Supabase:', result.message)
    }
    return result
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error sincronizando con Supabase:', e)
    return { success: false, message: e.message }
  }
}

/**
 * Carga las configuraciones desde Supabase y actualiza el cache local.
 * Debe llamarse al montar la app o al abrir Settings para obtener datos frescos.
 *
 * @returns {Promise<object>} Configuraciones actualizadas (o cache local si falla)
 */
async function loadFromSupabase() {
  try {
    const remote = await preferencesService.getPreference(PREFERENCE_KEY)
    if (remote) {
      // Fusionar con defaults para garantizar claves nuevas
      const merged = { ...DEFAULT_SETTINGS, ...remote }
      // Actualizar cache local
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      window.dispatchEvent(new CustomEvent('ad-settings-changed', { detail: merged }))
      console.log('☁️ [UserSettings] Configuración cargada desde Supabase')
      return merged
    }

    // No existe en Supabase: usar cache local (o defaults)
    return getSettings()
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error cargando desde Supabase, usando cache local:', e)
    return getSettings()
  }
}

/** Restaura todas las configuraciones a los valores por defecto */
async function resetSettings() {
  return saveSettings({ ...DEFAULT_SETTINGS })
}

/**
 * Limpia la caché local (localStorage) sin afectar Supabase.
 * Útil para cuando el usuario cierra sesión.
 */
function clearLocalCache() {
  localStorage.removeItem(STORAGE_KEY)
  // Opcional: emitir evento con defaults para que la UI regrese a modo light inmediatamente
  window.dispatchEvent(new CustomEvent('ad-settings-changed', { detail: DEFAULT_SETTINGS }))
}

export default {
  getSettings,
  saveSettings,
  loadFromSupabase,
  resetSettings,
  clearLocalCache,
  DEFAULT_SETTINGS,
}
