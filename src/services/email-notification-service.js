/**
 * email-notification-service.js
 * Servicio para enviar notificaciones por correo al registrar documentos en facturación.
 *
 * Principio S.O.L.I.D.:
 * - Single Responsibility: Solo maneja el envío de notificaciones por email.
 * - Open/Closed: Se puede extender para nuevos tipos de notificación sin modificar el core.
 * - Dependency Inversion: Depende de la abstracción de supabase.functions.invoke, no del proveedor de email.
 */
import { supabase } from '@/lib/supabaseClient'
import userSettingsService from '@/services/user-settings-service.js'

class EmailNotificationService {
  constructor() {
    this.functionName = 'send-invoice-email'
  }

  /**
   * Verifica si el flujo del documento tiene notificaciones habilitadas.
   * @param {string} flow - 'VENTA', 'COMPRA', 'GASTO'
   * @param {object} settings - Configuraciones del usuario
   * @returns {boolean}
   */
  isFlowEnabled(flow, settings) {
    if (flow === 'VENTA')  return settings.notifyOnVenta  !== false
    if (flow === 'COMPRA') return settings.notifyOnCompra !== false
    if (flow === 'GASTO')  return settings.notifyOnGasto  === true
    return true // flujo desconocido: enviar por defecto
  }

  /**
   * Construye el payload base del correo.
   * @param {string} toEmail - Destinatario
   * @param {string} clientName - Nombre del cliente
   * @param {object} invoiceData - Datos del documento
   */
  buildPayload(toEmail, clientName, invoiceData) {
    return {
      to: toEmail,
      clientName,
      documentType: invoiceData.documentType || 'FACTURA',
      invoiceNumber: invoiceData.invoiceNumber || '',
      controlNumber: invoiceData.controlNumber || '',
      flow: invoiceData.flow || 'VENTA',
      issueDate: invoiceData.issueDate || new Date().toISOString(),
      dueDate: invoiceData.dueDate || null,
      status: invoiceData.status || 'EMITIDA',
      currency: invoiceData.financial?.currency || 'VES',
      totalAmount: invoiceData.financial?.totalSales || invoiceData.financial?.total || 0,
      subtotal: invoiceData.financial?.subtotal || 0,
      taxAmount: invoiceData.financial?.taxAmount || 0,
      items: (invoiceData.items || []).map(item => ({
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        total: item.total || (item.quantity * item.unitPrice) || 0
      })),
      // Adjuntos: la Edge Function descargará el archivo desde la URL
      attachments: (invoiceData.attachments || []).map(att => ({
        name: att.name || att.fileName || 'adjunto',
        url: att.url || ''
      })).filter(att => att.url),
      // Datos del emisor (empresa del cliente)
      issuer: {
        name: invoiceData.issuer?.name || '',
        rif: invoiceData.issuer?.rif || '',
        address: invoiceData.issuer?.address || ''
      }
    }
  }

  /**
   * Invoca la Edge Function para enviar un correo.
   * @param {object} payload - Payload completo del correo
   */
  async sendEmail(payload) {
    const { data, error } = await supabase.functions.invoke(this.functionName, {
      body: payload
    })
    if (error) {
      console.warn('⚠️ [Email] Error al invocar Edge Function:', error.message)
      return { success: false, message: error.message }
    }
    return { success: true, data }
  }

  /**
   * Envía notificación por correo al cliente después de registrar un documento.
   * Respeta las preferencias del usuario: flujos activos y correos adicionales.
   * Este método es fire-and-forget: no bloquea la UI si falla.
   *
   * @param {Object} invoiceData - Datos de la factura recién creada
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async notifyInvoiceCreated(invoiceData) {
    try {
      // Leer configuraciones del usuario
      const settings = userSettingsService.getSettings()
      const flow = invoiceData.flow || 'VENTA'

      // Verificar si este flujo tiene notificaciones habilitadas
      if (!this.isFlowEnabled(flow, settings)) {
        console.log(`📧 [Email] Notificación omitida: flujo ${flow} desactivado en configuración`)
        return { success: true, message: 'Notificación desactivada para este flujo' }
      }

      // Obtener email del usuario autenticado (el cliente)
      const { data: authData } = await supabase.auth.getUser()
      const userEmail = authData?.user?.email

      if (!userEmail) {
        console.warn('⚠️ [Email] No se encontró email del usuario para enviar notificación')
        return { success: false, message: 'Email del usuario no disponible' }
      }

      // Obtener nombre del usuario desde localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      const clientName = currentUser?.client?.company_name
        || `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim()
        || userEmail

      // Construir lista de destinatarios: usuario principal + correos adicionales configurados
      const allRecipients = [
        userEmail,
        ...settings.notificationEmails.filter(e => e && e !== userEmail)
      ]

      console.log(`📧 [Email] Enviando a ${allRecipients.length} destinatario(s):`, allRecipients)

      // Enviar a todos los destinatarios simultáneamente
      const results = await Promise.allSettled(
        allRecipients.map(email =>
          this.sendEmail(this.buildPayload(email, clientName, invoiceData))
        )
      )

      const failed = results.filter(r => r.status === 'rejected' || r.value?.success === false)
      if (failed.length > 0) {
        console.warn(`⚠️ [Email] ${failed.length} correo(s) no se enviaron correctamente`)
      }

      const sent = results.length - failed.length
      console.log(`✅ [Email] ${sent}/${results.length} correo(s) enviados exitosamente`)
      return { success: true, message: `${sent} correo(s) enviados` }

    } catch (error) {
      // Error silencioso: no debe afectar la experiencia del usuario
      console.warn('⚠️ [Email] Error inesperado al enviar notificación:', error)
      return { success: false, message: error.message || 'Error inesperado' }
    }
  }
}

// Exportar instancia única (Singleton)
const emailNotificationService = new EmailNotificationService()
export default emailNotificationService
