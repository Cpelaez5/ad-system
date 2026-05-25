/**
 * user-settings-service.js
 * Servicio de configuración de preferencias del usuario.
 * Persiste en localStorage y emite eventos para sincronizar otros componentes.
 *
 * Responsabilidad única (S): solo gestiona preferencias — no hace llamadas API.
 */

const STORAGE_KEY = 'ad_system_user_settings'

/** Valores por defecto del sistema */
const DEFAULT_SETTINGS = {
  // ── Tasas de cambio en el header ─────────────────────────────────────────
  showUsdRate: true,
  showEurRate: true,

  // ── Notificaciones por email ──────────────────────────────────────────────
  notificationEmails: [],   // correos adicionales (además del propio usuario)
  notifyOnVenta:   true,
  notifyOnCompra:  true,
  notifyOnGasto:   false,
}

/**
 * Obtiene las configuraciones actuales del usuario.
 * Fusiona con defaults para garantizar compatibilidad con versiones futuras.
 */
function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error leyendo configuración:', e)
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Guarda las configuraciones y notifica a todos los componentes suscritos.
 * @param {object} settings - Objeto completo de configuraciones
 */
function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    // Notificar cambios a todos los componentes que escuchen este evento
    window.dispatchEvent(new CustomEvent('ad-settings-changed', { detail: settings }))
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error guardando configuración:', e)
  }
}

/**
 * Restaura todas las configuraciones a los valores por defecto.
 */
function resetSettings() {
  saveSettings({ ...DEFAULT_SETTINGS })
}

export default {
  getSettings,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
}
