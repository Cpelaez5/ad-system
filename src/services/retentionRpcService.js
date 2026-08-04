import { supabase } from '@/lib/supabaseClient'

const ERROR_MESSAGES = {
  'P0001': 'Error de validación del sistema.',
  'PGRST204': 'No se pudo registrar la compra.',
  '23505': 'El número de factura o comprobante ya existe para este periodo.',
  'DEFAULT': 'Ha ocurrido un error inesperado al registrar la compra con retenciones.'
}

class RetentionRpcService {
  /**
   * Llama al RPC registrar_compra_con_retenciones
   * @param {Object} payload 
   * @param {string} payload.p_client_id UUID
   * @param {string} payload.p_proveedor_id UUID
   * @param {Object} payload.p_factura JSONB
   * @param {boolean} payload.p_aplicar_iva
   * @param {boolean} payload.p_aplicar_islr
   * @param {boolean} payload.p_aplicar_municipal
   * @param {string} payload.p_islr_concept_id UUID
   * @returns {Promise<Object>} Resultado JSON de la operación
   */
  async registrarCompra(payload) {
    try {
      const { data, error } = await supabase.rpc('registrar_compra_con_retenciones', payload)

      if (error) {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in registrarCompra:', error)
      const friendlyMessage = this._mapErrorToMessage(error)
      throw new Error(friendlyMessage)
    }
  }

  _mapErrorToMessage(error) {
    // Si el error trae el mensaje de la base de datos (RAISE EXCEPTION), priorizarlo
    // Supabase devuelve el RAISE EXCEPTION en error.message a menudo, 
    // pero si es muy técnico, usamos los genéricos.
    if (error.message && error.message.includes('Sesión sin organización asociada')) return error.message
    if (error.message && error.message.includes('No autorizado')) return error.message
    if (error.message && error.message.includes('No hay configuración fiscal')) return error.message
    if (error.message && error.message.includes('no encontrado')) return error.message
    if (error.message && error.message.includes('Factura incompleta')) return error.message
    if (error.message && error.message.includes('Concepto ISLR')) return error.message

    // Códigos de error de Postgres / PostgREST
    const code = error.code || 'DEFAULT'
    return ERROR_MESSAGES[code] || ERROR_MESSAGES['DEFAULT']
  }
}

export default new RetentionRpcService()
