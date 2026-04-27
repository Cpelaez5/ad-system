// Servicio para manejar preferencias de usuario con Supabase
// Incluye la persistencia del layout del dashboard (Swapy)
// y cualquier otra preferencia futura (tema, filtros, etc.)

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

const preferencesService = {

  /**
   * Obtiene una preferencia específica del usuario autenticado.
   * @param {string} key - Clave de la preferencia (ej: 'dashboard_layout')
   * @returns {Object|null} El valor de la preferencia, o null si no existe
   */
  async getPreference(key) {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return null

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) return null

      const { data, error } = await supabase
        .from('user_preferences')
        .select('preference_value')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('preference_key', key)
        .single()

      if (error) {
        // Error "No rows" no es un error real, simplemente no existe aún
        if (error.code === 'PGRST116') return null
        console.warn('⚠️ Error obteniendo preferencia:', error.message)
        return null
      }

      return data?.preference_value || null
    } catch (error) {
      console.error('❌ Error en getPreference:', error)
      return null
    }
  },

  /**
   * Guarda (upsert) una preferencia del usuario autenticado.
   * Si ya existe, la actualiza. Si no existe, la crea.
   * @param {string} key - Clave de la preferencia
   * @param {Object} value - Valor JSON de la preferencia
   * @returns {{ success: boolean, message?: string }}
   */
  async setPreference(key, value) {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return { success: false, message: 'Usuario no autenticado' }

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) return { success: false, message: 'Sin organización activa' }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          organization_id: organizationId,
          preference_key: key,
          preference_value: value
        }, {
          // Usa la constraint UNIQUE para decidir si INSERT o UPDATE
          onConflict: 'user_id, organization_id, preference_key'
        })

      if (error) {
        console.error('❌ Error guardando preferencia:', error)
        return { success: false, message: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Error en setPreference:', error)
      return { success: false, message: error.message }
    }
  },

  /**
   * Elimina una preferencia del usuario autenticado.
   * @param {string} key - Clave de la preferencia a eliminar
   * @returns {{ success: boolean }}
   */
  async deletePreference(key) {
    try {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return { success: false }

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) return { success: false }

      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .eq('preference_key', key)

      if (error) {
        console.error('❌ Error eliminando preferencia:', error)
        return { success: false }
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Error en deletePreference:', error)
      return { success: false }
    }
  },

  // ═══════════════════════════════════════════
  // MÉTODOS DE CONVENIENCIA PARA DASHBOARD
  // ═══════════════════════════════════════════

  /** Clave de preferencia para el layout del dashboard */
  DASHBOARD_LAYOUT_KEY: 'dashboard_layout',

  /**
   * Obtiene el layout guardado del dashboard.
   * @returns {Object|null} El layout como objeto { slot: item, ... }
   */
  async getDashboardLayout() {
    return this.getPreference(this.DASHBOARD_LAYOUT_KEY)
  },

  /**
   * Guarda el layout del dashboard.
   * @param {Object} layout - Objeto del layout Swapy
   * @returns {{ success: boolean }}
   */
  async saveDashboardLayout(layout) {
    return this.setPreference(this.DASHBOARD_LAYOUT_KEY, layout)
  }
}

export default preferencesService
