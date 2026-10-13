/**
 * registroService.js
 * Servicio reutilizable para guardar un registro de facturación (factura/recibo
 * de venta, compra o gasto) emitido por SimpleInvoiceForm.
 *
 * Extraído de src/views/cliente/Facturacion.vue (handleInvoiceSubmit) para que
 * la lógica de persistencia (decidir update vs. create, RPC de retenciones,
 * notificación por email) viva en un solo lugar reutilizable, sin tocar la
 * parte de UI (refs del formulario, cierre de diálogo, recarga de lista), que
 * sigue siendo responsabilidad de la vista.
 *
 * Principio: nunca lanza. Captura cualquier error y devuelve
 * { success: false, message } en lenguaje llano para mostrar en el snackbar.
 */
import invoiceService from '@/services/invoiceService.js'
import retentionRpcService from '@/services/retentionRpcService.js'
import emailNotificationService from '@/services/email-notification-service.js'
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'

/**
 * Determina si el formulario corresponde a un egreso (compra o gasto) que debe
 * registrarse mediante el RPC seguro de retenciones.
 * @param {Object} formData
 * @returns {boolean}
 */
function esCompraConRpc(formData) {
  const hasRetentions = (formData.financial?.ivaRetention > 0) ||
    (formData.financial?.islrRetention > 0) ||
    (formData.financial?.municipalRetention > 0)

  return formData.flow === 'COMPRA' && (
    formData.expense_type === 'COMPRA' ||
    formData.expense_type === 'GASTO' ||
    hasRetentions
  )
}

/**
 * Construye el payload que espera el RPC registrar_compra_con_retenciones.
 * @param {Object} formData
 * @returns {Object}
 */
function construirPayloadRpc(formData) {
  const rpcPayload = {
    p_client_id: formData.client?.id || formData.client_id,
    p_proveedor_id: formData.issuer?.id || formData.proveedor_id,
    p_aplicar_iva: formData.financial?.ivaRetention > 0,
    p_aplicar_islr: formData.financial?.islrRetention > 0,
    p_aplicar_municipal: formData.financial?.municipalRetention > 0,
    p_comprobante_iva: formData.financial?.ivaRetentionNumber || null,
    p_comprobante_islr: formData.financial?.islrRetentionNumber || null,
    p_comprobante_municipal: formData.financial?.municipalRetentionNumber || null,
    p_factura: formData
  }

  if (formData.islr_concept_id) {
    rpcPayload.p_islr_concept_id = formData.islr_concept_id
  }
  if (formData.concepto_municipal_id) {
    rpcPayload.p_concepto_municipal_id = formData.concepto_municipal_id
  }

  return rpcPayload
}

/**
 * Guarda un registro (factura/recibo) de venta, compra o gasto.
 *
 * Decide automáticamente:
 * - update si formData.id existe.
 * - registro de compra/gasto vía RPC seguro de retenciones si corresponde.
 * - creación normal en los demás casos.
 *
 * Al crear (no al editar) dispara en background la notificación por email;
 * un fallo de email nunca afecta el resultado del guardado.
 *
 * @param {Object} formData - Datos emitidos por SimpleInvoiceForm.
 * @returns {Promise<{ success: boolean, data?: Object, message: string, isUpdate?: boolean, isCompra?: boolean }>}
 *   Nunca lanza: cualquier error se captura y se devuelve como success: false
 *   con un mensaje en lenguaje llano.
 */
export async function guardarRegistro(formData) {
  try {
    const isUpdate = Boolean(formData?.id)
    let savedResult

    if (isUpdate) {
      savedResult = await invoiceService.updateInvoice(formData.id, formData)
    } else if (esCompraConRpc(formData)) {
      const rpcPayload = construirPayloadRpc(formData)
      const rpcData = await retentionRpcService.registrarCompra(rpcPayload)
      // El RPC no recibe la fecha fiscal: si el usuario la fijó, se guarda aparte
      // (si no, el trigger de la BD la calcula con la regla de retención de IVA)
      if (rpcData?.invoice_id && formData.fecha_fiscal) {
        const { error: errFecha } = await supabase
          .from('invoices')
          .update({ fecha_fiscal: formData.fecha_fiscal })
          .eq('id', rpcData.invoice_id)
        if (errFecha) logger.warn('[registroService]', 'No se pudo fijar la fecha fiscal manual', errFecha.message)
      }
      // Simular la respuesta de invoiceService para mantener compatibilidad
      savedResult = { success: true, data: { id: rpcData.invoice_id, ...formData } }
    } else {
      savedResult = await invoiceService.createInvoice(formData)
    }

    if (!savedResult || !savedResult.success) {
      return {
        success: false,
        message: savedResult?.message || 'Error desconocido al guardar factura en base de datos'
      }
    }

    // Enviar notificación por email en background (solo al crear, no al editar).
    // Un fallo de email nunca debe afectar el resultado del guardado.
    if (savedResult?.data && !isUpdate) {
      emailNotificationService.notifyInvoiceCreated(savedResult.data)
        .catch(err => console.warn('⚠️ Email no enviado:', err))
    }

    return {
      success: true,
      data: savedResult.data,
      message: 'Registro guardado correctamente.',
      isUpdate,
      isCompra: formData.flow === 'COMPRA'
    }
  } catch (err) {
    console.error('❌ [registroService] Error al guardar registro:', err)
    return {
      success: false,
      message: err?.message || 'Ocurrió un error al guardar. Por favor intenta de nuevo.'
    }
  }
}

export default { guardarRegistro }
