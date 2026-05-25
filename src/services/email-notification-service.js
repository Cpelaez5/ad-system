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

class EmailNotificationService {
  constructor() {
    this.functionName = 'send-invoice-email'
  }

  /**
   * Envía notificación por correo al cliente después de registrar un documento.
   * Este método es fire-and-forget: no bloquea la UI si falla.
   *
   * @param {Object} invoiceData - Datos de la factura recién creada (formato transformado del frontend)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async notifyInvoiceCreated(invoiceData) {
    try {
      // Obtener email del usuario autenticado (el cliente que creó el documento)
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

      // Preparar datos del correo
      const emailPayload = {
        to: userEmail,
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
        // Adjuntos: enviar solo name + url (la Edge Function descargará el archivo)
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

      console.log('📧 [Email] Enviando notificación de factura:', emailPayload.invoiceNumber)

      // Invocar Edge Function
      const { data, error } = await supabase.functions.invoke(this.functionName, {
        body: emailPayload
      })

      if (error) {
        console.warn('⚠️ [Email] Error al invocar Edge Function:', error.message)
        return { success: false, message: error.message }
      }

      console.log('✅ [Email] Notificación enviada exitosamente:', data)
      return { success: true, message: 'Correo enviado exitosamente' }

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
