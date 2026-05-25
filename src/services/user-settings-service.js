/**
 * user-settings-service.js
 * Servicio de configuración de preferencias del usuario.
 * Persiste en localStorage y emite eventos para sincronizar otros componentes.
 *
 * Responsabilidad única (S): solo gestiona preferencias — no hace llamadas API.
 */

const STORAGE_KEY = 'ad_system_user_settings'

/**
 * Valores por defecto del sistema.
 *
 * notificationEmails: array de objetos con configuración individual por correo adicional.
 * Estructura de cada objeto:
 * {
 *   email: string,
 *   notifyOnVenta:  boolean,
 *   notifyOnCompra: boolean,
 *   notifyOnGasto:  boolean,
 * }
 *
 * NOTA: El correo principal del usuario SIEMPRE recibe notificaciones.
 * Los toggles aquí solo aplican a correos adicionales.
 */
const DEFAULT_SETTINGS = {
  // ── Tasas de cambio en el header ─────────────────────────────────────────
  showUsdRate: true,
  showEurRate: true,

  // ── Correos adicionales con configuración individual por flujo ────────────
  notificationEmails: [],
  // Ejemplo de entrada:
  // { email: 'contador@firma.com', notifyOnVenta: true, notifyOnCompra: true, notifyOnGasto: true }
}

/** Obtiene las configuraciones actuales, fusionando con defaults */
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
    window.dispatchEvent(new CustomEvent('ad-settings-changed', { detail: settings }))
  } catch (e) {
    console.warn('⚠️ [UserSettings] Error guardando configuración:', e)
  }
}

/** Restaura todas las configuraciones a los valores por defecto */
function resetSettings() {
  saveSettings({ ...DEFAULT_SETTINGS })
}

export default {
  getSettings,
  saveSettings,
  resetSettings,
  DEFAULT_SETTINGS,
}
