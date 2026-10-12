/**
 * seal-service.js
 * Servicio para gestión y almacenamiento seguro de Sello y Firma Digital de empresas.
 *
 * Principios S.O.L.I.D. y Ciberseguridad Multi-Tenant:
 * - Aislamiento Estricto por Cliente: Cada cliente tiene sus propios sellos y firmas digitales privados.
 * - Zero Leakage: No se comparten activos ni caché entre diferentes clientes u organizaciones.
 * - Rutas de Almacenamiento Jerárquicas en Supabase Storage.
 */

import { supabase } from '@/lib/supabaseClient'
import preferencesService from '@/services/preferencesService.js'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'
import { obtenerUrlFirmada } from '@/services/storageUrlService.js'

class SealService {
  /**
   * Resuelve el contexto seguro de organización, cliente y usuario.
   * @private
   */
  async _resolveContext(explicitClientId = null) {
    const organizationId = getCurrentOrganizationId() || 'global'
    let clientId = explicitClientId || getCurrentClientId()
    let userId = null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
        if (!clientId) {
          const { data: userProfile } = await supabase
            .from('users')
            .select('id, role, organization_id, client_id')
            .eq('id', user.id)
            .single()

          if (userProfile?.role === 'cliente' && userProfile?.client_id) {
            clientId = userProfile.client_id
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [SealService] Error resolviendo contexto seguro:', err)
    }

    return { organizationId, clientId, userId }
  }

  /**
   * Genera una clave de almacenamiento local aislada por cliente / usuario.
   * @private
   */
  _getStorageKey(clientId, userId) {
    if (clientId) return `ad_system_seal_config_client_${clientId}`
    if (userId) return `ad_system_seal_config_user_${userId}`
    return 'ad_system_seal_config_default'
  }

  /**
   * Genera una clave de preferencia remota aislada por cliente / usuario.
   * @private
   */
  _getPreferenceKey(clientId, userId) {
    if (clientId) return `company_seal_signature_client_${clientId}`
    if (userId) return `company_seal_signature_user_${userId}`
    return 'company_seal_signature_default'
  }

  /**
   * Resuelve un valor almacenado (ruta de Storage, URL pública/firmada antigua o
   * DataURL) a una URL lista para usar en <img>/fetch/html2canvas.
   * - DataURL: se devuelve tal cual (no es un recurso de Storage).
   * - Ruta o URL de Storage: se firma con obtenerUrlFirmada (bucket 'documents').
   * - Si no se puede firmar (p.ej. valor no reconocido), se devuelve el valor original
   *   como último recurso para no romper la UI mientras el bucket siga siendo público.
   * @private
   */
  async _resolveAssetUrl(value) {
    if (!value || typeof value !== 'string') return value || null
    if (value.startsWith('data:')) return value

    const signed = await obtenerUrlFirmada('documents', value)
    return signed || value
  }

  /**
   * Convierte una configuración "cruda" (con rutas/valores almacenados) en una
   * configuración lista para mostrar, con sealUrl/signatureUrl/combinedUrl resueltos.
   * @private
   */
  async _toDisplayConfig(rawConfig) {
    if (!rawConfig) return rawConfig

    const [sealUrl, signatureUrl, combinedUrl] = await Promise.all([
      this._resolveAssetUrl(rawConfig.sealUrl),
      this._resolveAssetUrl(rawConfig.signatureUrl),
      this._resolveAssetUrl(rawConfig.combinedUrl)
    ])

    return { ...rawConfig, sealUrl, signatureUrl, combinedUrl }
  }

  /**
   * Obtiene la configuración "cruda" (rutas de Storage o DataURL, sin resolver)
   * desde la caché local privada y/o las preferencias remotas.
   * @private
   */
  async _getRawConfig(storageKey, preferenceKey) {
    // Limpieza de clave global heredada vulnerable si existiese
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ad_system_company_seal_config')
    }

    // 1. Intentar lectura de caché local privada
    let cached = null
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        cached = JSON.parse(stored)
      }
    } catch (e) {
      console.warn('⚠️ [SealService] Error leyendo cache local aislada:', e)
    }

    // 2. Refrescar desde Supabase preferences con clave privada de cliente
    try {
      const remotePref = await preferencesService.getPreference(preferenceKey)
      if (remotePref && typeof remotePref === 'object') {
        const merged = {
          sealUrl: remotePref.sealUrl || null,
          signatureUrl: remotePref.signatureUrl || null,
          combinedUrl: remotePref.combinedUrl || null,
          activeMode: remotePref.activeMode || 'auto'
        }
        localStorage.setItem(storageKey, JSON.stringify(merged))
        return merged
      }
    } catch (e) {
      console.warn('⚠️ [SealService] Error obteniendo preferencias remotas:', e)
    }

    // 3. Retornar configuración vacía si el cliente no tiene sello propio (NUNCA heredar de otros)
    return cached || {
      sealUrl: null,
      signatureUrl: null,
      combinedUrl: null,
      activeMode: 'auto'
    }
  }

  /**
   * Obtiene la configuración de sellos y firmas del cliente específico, con las
   * URLs ya resueltas (firmadas) y listas para usar en <img>/descargas/PDFs.
   * @param {string} [explicitClientId] - UUID opcional del cliente
   * @returns {Promise<{ sealUrl: string|null, signatureUrl: string|null, combinedUrl: string|null, activeMode: string }>}
   */
  async getSealConfig(explicitClientId = null) {
    const { clientId, userId } = await this._resolveContext(explicitClientId)
    const storageKey = this._getStorageKey(clientId, userId)
    const preferenceKey = this._getPreferenceKey(clientId, userId)

    const rawConfig = await this._getRawConfig(storageKey, preferenceKey)
    return await this._toDisplayConfig(rawConfig)
  }

  /**
   * Convierte un archivo a DataURL (base64).
   * @param {File} file 
   * @returns {Promise<string>}
   */
  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
      reader.readAsDataURL(file)
    })
  }

  /**
   * Sube un archivo de sello o firma con ruta aislada por cliente y actualiza su configuración privada.
   * @param {File} file - Archivo seleccionado
   * @param {'seal'|'signature'|'combined'} type - Tipo de activo
   * @param {string} [explicitClientId] - UUID del cliente
   * @returns {Promise<{ success: boolean, url?: string, config?: object, message?: string }>}
   */
  async uploadSealAsset(file, type = 'seal', explicitClientId = null) {
    try {
      if (!file) throw new Error('No se proporcionó ningún archivo.')

      const { organizationId, clientId, userId } = await this._resolveContext(explicitClientId)
      const storageKey = this._getStorageKey(clientId, userId)
      const preferenceKey = this._getPreferenceKey(clientId, userId)

      // Validar tipo de archivo
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'application/pdf']
      if (!validTypes.includes(file.type) && !file.name.match(/\.(png|jpe?g|webp|svg|pdf)$/i)) {
        throw new Error('Formato no compatible. Por favor sube una imagen PNG, JPG, WebP o SVG.')
      }

      // Convertir a DataURL como respaldo inmediato
      const dataUrl = await this.fileToDataUrl(file)

      // Subir a Supabase Storage en ruta privada del cliente.
      // Guardamos la RUTA (no una URL pública) para que siga funcionando cuando
      // el bucket 'documents' pase a privado; si la subida falla, se conserva el
      // DataURL como respaldo (se usa directamente, sin pasar por Storage).
      let storedValue = dataUrl
      let uploadedPath = null
      try {
        const ext = file.name.split('.').pop() || 'png'
        const clientFolder = clientId ? `clients/${clientId}` : `users/${userId || 'default'}`
        const filePath = `seals-signatures/${organizationId}/${clientFolder}/${type}_${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, { upsert: true })

        if (!uploadError && uploadData) {
          storedValue = filePath
          uploadedPath = filePath
        }
      } catch (storageErr) {
        console.info('ℹ️ [SealService] Almacenando como DataURL aislado:', storageErr.message)
      }

      // Actualizar la configuración privada del cliente (valores crudos: rutas o DataURL)
      const rawConfig = await this._getRawConfig(storageKey, preferenceKey)
      const updatedConfig = { ...rawConfig }

      if (type === 'seal') updatedConfig.sealUrl = storedValue
      else if (type === 'signature') updatedConfig.signatureUrl = storedValue
      else if (type === 'combined') updatedConfig.combinedUrl = storedValue

      // Guardar en localStorage privado del cliente
      localStorage.setItem(storageKey, JSON.stringify(updatedConfig))

      // Guardar en Supabase user_preferences con clave única del cliente
      await preferencesService.setPreference(preferenceKey, updatedConfig)

      // URL lista para mostrar de inmediato (firmada si se subió a Storage, o el DataURL)
      const displayUrl = uploadedPath
        ? (await obtenerUrlFirmada('documents', uploadedPath)) || storedValue
        : storedValue

      // Configuración resuelta para componentes reactivos (sellos/firmas listos para <img>)
      const displayConfig = await this._toDisplayConfig(updatedConfig)

      // Disparar evento para componentes reactivos
      window.dispatchEvent(new CustomEvent('ad-seal-config-changed', {
        detail: { clientId, config: displayConfig }
      }))

      return {
        success: true,
        url: displayUrl,
        config: displayConfig,
        message: 'Activo digital guardado exitosamente de forma privada'
      }
    } catch (error) {
      console.error('❌ [SealService] Error en uploadSealAsset:', error)
      return {
        success: false,
        message: error.message || 'Error al procesar el archivo'
      }
    }
  }

  /**
   * Elimina un tipo específico de activo del cliente.
   * @param {'seal'|'signature'|'combined'} type 
   * @param {string} [explicitClientId]
   * @returns {Promise<{ success: boolean, config: object }>}
   */
  async removeSealAsset(type, explicitClientId = null) {
    try {
      const { clientId, userId } = await this._resolveContext(explicitClientId)
      const storageKey = this._getStorageKey(clientId, userId)
      const preferenceKey = this._getPreferenceKey(clientId, userId)

      const rawConfig = await this._getRawConfig(storageKey, preferenceKey)
      const updatedConfig = { ...rawConfig }

      if (type === 'seal') updatedConfig.sealUrl = null
      else if (type === 'signature') updatedConfig.signatureUrl = null
      else if (type === 'combined') updatedConfig.combinedUrl = null

      localStorage.setItem(storageKey, JSON.stringify(updatedConfig))
      await preferencesService.setPreference(preferenceKey, updatedConfig)

      const displayConfig = await this._toDisplayConfig(updatedConfig)

      window.dispatchEvent(new CustomEvent('ad-seal-config-changed', {
        detail: { clientId, config: displayConfig }
      }))

      return { success: true, config: displayConfig }
    } catch (error) {
      console.error('❌ [SealService] Error en removeSealAsset:', error)
      return { success: false, message: error.message }
    }
  }

  /**
   * Limpia toda la caché de sellos al cerrar sesión.
   */
  clearLocalCache() {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('ad_system_seal_config')) {
          localStorage.removeItem(key)
        }
      })
    }
  }
}

export default new SealService()
