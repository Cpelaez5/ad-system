// Servicio para manejo de facturas con Supabase Multi-Tenant
import { supabase } from '@/lib/supabaseClient'
import {
  getCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant,
  handleTenantError
} from '@/utils/tenantHelpers'

class InvoiceService {
  constructor() {
    this.storageKey = 'sistema_contabilidad_invoices';
  }

  async getCurrentUserProfile() {
    try {
      const { data: authRes } = await supabase.auth.getUser()
      const userId = authRes?.user?.id
      if (!userId) return null
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, role, organization_id, client_id')
        .eq('id', userId)
        .single()
      if (error) return null
      return profile
    } catch (_) {
      return null
    }
  }

  // Obtener facturas de la organización actual, opcionalmente filtradas por flujo y cliente
  // organizationOnly: si es true, solo devuelve facturas de la organización (client_id IS NULL)
  async getInvoices({ flow = 'VENTA', clientId, organizationOnly = false } = {}) {
    try {
      console.log('🔄 Obteniendo facturas desde Supabase...', { flow, clientId, organizationOnly })

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.warn('⚠️ No hay organization_id disponible')
        return []
      }

      // Obtener facturas con información del cliente relacionado
      // Construir la consulta paso a paso para evitar ambigüedad
      let query = supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('flow', flow)

      // Aplicar filtros de client_id ANTES del order para evitar ambigüedad
      if (organizationOnly) {
        // Filtrar solo facturas de la organización (sin client_id)
        query = query.is('client_id', null)
      } else if (clientId) {
        // Filtrar por cliente específico
        query = query.eq('client_id', clientId)
      }

      // Aplicar orden al final
      query = query.order('created_at', { ascending: false })

      const { data: invoices, error } = await query

      if (error) {
        console.warn('⚠️ Error al obtener facturas desde Supabase:', error.message)
        return []
      }

      console.log('🔍 Datos brutos de facturas:', invoices)
      console.log('🔍 Número de facturas brutas:', invoices?.length || 0)

      // Verificar que invoices no sea null o undefined
      if (!invoices || !Array.isArray(invoices)) {
        console.warn('⚠️ Facturas no es un array válido:', invoices)
        return []
      }

      // Transformar datos para compatibilidad con el frontend
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients // Información del cliente relacionado
      }))

      console.log('🔍 Facturas transformadas:', transformedInvoices)
      console.log('✅ Facturas obtenidas desde Supabase:', transformedInvoices.length)
      return transformedInvoices

    } catch (error) {
      console.error('❌ Error inesperado al obtener facturas:', error)
      return []
    }
  }

  // Obtener factura por ID
  async getInvoiceById(id) {
    try {
      console.log('🔄 Obteniendo factura por ID desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return null
      }

      // Intentar obtener desde Supabase
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (error || !invoice) {
        console.error('❌ Factura no encontrada en Supabase:', error?.message)
        return null
      }

      const transformedInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients
      }

      console.log('✅ Factura obtenida desde Supabase:', transformedInvoice.invoiceNumber)
      return transformedInvoice

    } catch (error) {
      console.error('❌ Error inesperado al obtener factura:', error)
      return null
    }
  }

  // Crear nueva factura
  async createInvoice(invoiceData) {
    try {
      console.log('🔄 Creando factura en Supabase...')
      console.log('📥 Datos recibidos:', invoiceData)

      const organizationId = getCurrentOrganizationId()
      console.log('🏢 Organization ID:', organizationId)

      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // Determinar cliente según el rol; si es cliente, forzar su client_id
      // Si clientId es explícitamente null (organización), mantenerlo null
      const userProfile = await this.getCurrentUserProfile()
      const effectiveClientId = invoiceData.clientId === null
        ? null  // Factura de la organización (sin client_id)
        : (userProfile?.role === 'cliente' ? (userProfile?.client_id || null) : (invoiceData.clientId || null))
      const effectiveFlow = invoiceData.flow || 'VENTA'

      // Preparar datos para Supabase
      const invoiceRecord = {
        organization_id: organizationId,
        client_id: effectiveClientId,
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber || null,
        document_type: invoiceData.documentType || 'FACTURA',
        flow: effectiveFlow,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate || null,
        status: invoiceData.status || 'BORRADOR',
        issuer: invoiceData.issuer || {},
        client_info: invoiceData.client || {},
        financial: invoiceData.financial || {},
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes || null,
        created_by: invoiceData.createdBy || userProfile?.id || null
      }

      console.log('📝 Datos a insertar:', invoiceRecord)

      const { data: newInvoice, error } = await supabase
        .from('invoices')
        .insert(invoiceRecord)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al crear factura en Supabase:', error)
        console.error('❌ Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return { success: false, message: `Error al crear factura: ${error.message}` }
      }

      console.log('✅ Factura creada exitosamente en Supabase:', newInvoice.id)
      console.log('📄 Factura creada:', newInvoice)

      // Transformar respuesta para el frontend
      const transformedInvoice = {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoice_number,
        controlNumber: newInvoice.control_number,
        documentType: newInvoice.document_type,
        flow: newInvoice.flow || 'VENTA',
        issueDate: newInvoice.issue_date,
        dueDate: newInvoice.due_date,
        status: newInvoice.status,
        issuer: newInvoice.issuer || {},
        client: newInvoice.client_info || {},
        financial: newInvoice.financial || {},
        items: newInvoice.items || [],
        attachments: newInvoice.attachments || [],
        notes: newInvoice.notes,
        createdBy: newInvoice.created_by,
        createdAt: newInvoice.created_at,
        updatedAt: newInvoice.updated_at,
        clientId: newInvoice.client_id
      }

      console.log('🔄 Factura transformada:', transformedInvoice)

      return {
        success: true,
        data: transformedInvoice,
        message: 'Factura creada exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al crear factura:', error)
      return { success: false, message: 'Error inesperado al crear factura' }
    }
  }

  // Actualizar factura
  async updateInvoice(id, invoiceData) {
    try {
      console.log('🔄 Actualizando factura en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // Preparar datos para actualización
      // Si el usuario es cliente, no permitir cambiar el client_id
      const userProfile = await this.getCurrentUserProfile()
      const updateData = {
        client_id: userProfile?.role === 'cliente' ? undefined : (invoiceData.clientId || null),
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber || null,
        document_type: invoiceData.documentType,
        flow: invoiceData.flow || 'VENTA',
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate || null,
        status: invoiceData.status,
        issuer: invoiceData.issuer || {},
        client_info: invoiceData.client || {},
        financial: invoiceData.financial || {},
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes || null
      }

      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })

      console.log('📝 Datos a actualizar:', updateData)

      const { data: updatedInvoice, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al actualizar factura en Supabase:', error.message)
        return { success: false, message: `Error al actualizar factura: ${error.message}` }
      }

      console.log('✅ Factura actualizada en Supabase:', updatedInvoice.id)

      // Transformar respuesta para el frontend
      const transformedInvoice = {
        id: updatedInvoice.id,
        invoiceNumber: updatedInvoice.invoice_number,
        controlNumber: updatedInvoice.control_number,
        documentType: updatedInvoice.document_type,
        flow: updatedInvoice.flow || 'VENTA',
        issueDate: updatedInvoice.issue_date,
        dueDate: updatedInvoice.due_date,
        status: updatedInvoice.status,
        issuer: updatedInvoice.issuer || {},
        client: updatedInvoice.client_info || {},
        financial: updatedInvoice.financial || {},
        items: updatedInvoice.items || [],
        attachments: updatedInvoice.attachments || [],
        notes: updatedInvoice.notes,
        createdBy: updatedInvoice.created_by,
        createdAt: updatedInvoice.created_at,
        updatedAt: updatedInvoice.updated_at,
        clientId: updatedInvoice.client_id
      }

      return {
        success: true,
        data: transformedInvoice,
        message: 'Factura actualizada exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al actualizar factura:', error)
      return { success: false, message: 'Error inesperado al actualizar factura' }
    }
  }

  // Eliminar factura (soft delete)
  async deleteInvoice(id) {
    try {
      console.log('🔄 Eliminando factura en Supabase (soft delete)...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { success: false, message: 'No hay organización disponible' }
      }

      // Soft delete: marcar como anulada
      const { data: deletedInvoice, error } = await supabase
        .from('invoices')
        .update({ status: 'ANULADA' })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('❌ Error al eliminar factura en Supabase:', error.message)
        return { success: false, message: `Error al eliminar factura: ${error.message}` }
      }

      console.log('✅ Factura eliminada (soft delete) en Supabase:', deletedInvoice.id)

      // Transformar respuesta para el frontend
      const transformedInvoice = {
        id: deletedInvoice.id,
        invoiceNumber: deletedInvoice.invoice_number,
        controlNumber: deletedInvoice.control_number,
        documentType: deletedInvoice.document_type,
        issueDate: deletedInvoice.issue_date,
        dueDate: deletedInvoice.due_date,
        status: 'ANULADA',
        issuer: deletedInvoice.issuer || {},
        client: deletedInvoice.client_info || {},
        financial: deletedInvoice.financial || {},
        items: deletedInvoice.items || [],
        attachments: deletedInvoice.attachments || [],
        notes: deletedInvoice.notes,
        createdBy: deletedInvoice.created_by,
        createdAt: deletedInvoice.created_at,
        updatedAt: deletedInvoice.updated_at,
        clientId: deletedInvoice.client_id
      }

      return {
        success: true,
        data: transformedInvoice,
        message: 'Factura eliminada exitosamente'
      }

    } catch (error) {
      console.error('❌ Error inesperado al eliminar factura:', error)
      return { success: false, message: 'Error inesperado al eliminar factura' }
    }
  }

  // Obtener estadísticas de facturas
  async getInvoiceStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de facturas desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
      }

      // Intentar usar función RPC optimizada
      try {
        const { data: stats, error } = await supabase.rpc('get_invoice_stats', {
          org_id: organizationId
        })

        if (!error && stats) {
          console.log('✅ Estadísticas obtenidas desde función RPC')
          return {
            total: stats.total || 0,
            byStatus: stats.by_status || {},
            totalAmount: stats.total_amount || 0,
            paidAmount: stats.paid_amount || 0
          }
        }
      } catch (rpcError) {
        console.warn('⚠️ Error en función RPC, calculando manualmente:', rpcError.message)
      }

      // Fallback: calcular manualmente
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, financial')
        .eq('organization_id', organizationId)

      if (error) {
        console.error('❌ Error al obtener facturas para estadísticas:', error.message)
        return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
      }

      // Calcular estadísticas
      const stats = {
        total: invoices.length,
        byStatus: {},
        totalAmount: 0,
        paidAmount: 0
      }

      invoices.forEach(invoice => {
        // Por estado
        stats.byStatus[invoice.status] = (stats.byStatus[invoice.status] || 0) + 1

        // Montos
        const totalSales = parseFloat(invoice.financial?.totalSales || 0)
        stats.totalAmount += totalSales

        if (invoice.status === 'PAGADA') {
          stats.paidAmount += totalSales
        }
      })

      console.log('✅ Estadísticas calculadas manualmente')
      return stats

    } catch (error) {
      console.error('❌ Error inesperado al obtener estadísticas:', error)
      return { total: 0, byStatus: {}, totalAmount: 0, paidAmount: 0 }
    }
  }

  // Buscar facturas
  async searchInvoices(searchTerm, { flow = 'VENTA', clientId } = {}) {
    try {
      console.log('🔄 Buscando facturas en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return []
      }

      // Buscar en múltiples campos
      let query = supabase
        .from('invoices')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_number,
          control_number,
          document_type,
          flow,
          issue_date,
          due_date,
          status,
          issuer,
          client_info,
          financial,
          items,
          attachments,
          notes,
          created_by,
          created_at,
          updated_at,
          clients!invoices_client_id_fkey (
            id,
            company_name,
            rif,
            address,
            phone,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('flow', flow)
        .or(`invoice_number.ilike.%${searchTerm}%,control_number.ilike.%${searchTerm}%,client_info->>companyName.ilike.%${searchTerm}%`)

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data: invoices, error } = await query

      if (error) {
        console.error('❌ Error al buscar facturas:', error.message)
        return []
      }

      // Transformar datos
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        flow: invoice.flow || 'VENTA',
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer || {},
        client: invoice.client_info || {},
        financial: invoice.financial || {},
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientId: invoice.client_id,
        clientInfo: invoice.clients
      }))

      console.log('✅ Facturas encontradas:', transformedInvoices.length)
      return transformedInvoices

    } catch (error) {
      console.error('❌ Error inesperado al buscar facturas:', error)
      return []
    }
  }

  // Validar número de factura único
  async validateUniqueInvoiceNumber(invoiceNumber, excludeId = null) {
    try {
      console.log('🔄 Validando número de factura único en Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return false
      }

      let query = supabase
        .from('invoices')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('invoice_number', invoiceNumber)

      if (excludeId) {
        query = query.neq('id', excludeId)
      }

      const { data: existingInvoice, error } = await query

      if (error) {
        console.error('❌ Error al validar número de factura:', error.message)
        return false
      }

      const isValid = !existingInvoice || existingInvoice.length === 0
      console.log('✅ Número de factura válido:', isValid)
      return isValid

    } catch (error) {
      console.error('❌ Error inesperado al validar número de factura:', error)
      return false
    }
  }

  // Obtener siguiente número de factura
  async getNextInvoiceNumber() {
    try {
      console.log('🔄 Obteniendo siguiente número de factura desde Supabase...')

      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return 'F-2024-001'
      }

      // Obtener el último número de factura
      const { data: lastInvoice, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error al obtener último número de factura:', error.message)
        return 'F-2024-001'
      }

      if (!lastInvoice || lastInvoice.length === 0) {
        return 'F-2024-001'
      }

      // Extraer número y incrementar
      const lastNumber = lastInvoice[0].invoice_number
      const match = lastNumber.match(/F-(\d{4})-(\d+)/)

      if (match) {
        const year = match[1]
        const number = parseInt(match[2]) + 1
        return `F-${year}-${number.toString().padStart(3, '0')}`
      }

      return 'F-2024-001'

    } catch (error) {
      console.error('❌ Error inesperado al obtener siguiente número:', error)
      return 'F-2024-001'
    }
  }

  // Extraer datos de archivo (simulado - para futuro OCR)
  async extractDataFromFile(file) {
    try {
      console.log('🔄 Extrayendo datos de archivo (simulado)...')

      // Simular procesamiento de archivo
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Retornar datos simulados
      return {
        success: true,
        data: {
          invoiceNumber: 'F-2024-XXX',
          controlNumber: '00-XXXXXXX',
          issueDate: new Date().toISOString().split('T')[0],
          totalAmount: 0,
          items: []
        }
      }

    } catch (error) {
      console.error('❌ Error al extraer datos del archivo:', error)
      return { success: false, message: 'Error al procesar archivo' }
    }
  }

  // Subir archivo adjunto (simulado - para futuro Supabase Storage)
  async uploadAttachment(file) {
    try {
      console.log('🔄 Subiendo archivo adjunto (simulado)...')

      // Simular subida de archivo
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Retornar URL simulada
      return {
        success: true,
        url: `https://storage.supabase.co/attachments/${file.name}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }

    } catch (error) {
      console.error('❌ Error al subir archivo:', error)
      return { success: false, message: 'Error al subir archivo' }
    }
  }
}

// Crear instancia única del servicio
const invoiceService = new InvoiceService()

export default invoiceService