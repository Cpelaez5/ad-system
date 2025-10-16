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

  // Obtener todas las facturas de la organización actual
  async getInvoices() {
    try {
      console.log('🔄 Obteniendo facturas desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: invoices, error } = await queryWithTenant('invoices', '*')
      
      if (error) {
        console.warn('⚠️ Error al obtener facturas desde Supabase, usando fallback:', error.message)
        return await this.getInvoicesFallback()
      }
      
      console.log('🔍 Datos brutos de facturas:', invoices)
      console.log('🔍 Número de facturas brutas:', invoices?.length || 0)
      
      // Verificar que invoices no sea null o undefined
      if (!invoices || !Array.isArray(invoices)) {
        console.warn('⚠️ Facturas no es un array válido:', invoices)
        return await this.getInvoicesFallback()
      }
      
      // Transformar datos para compatibilidad con el frontend
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        controlNumber: invoice.control_number,
        documentType: invoice.document_type,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer,
        client: invoice.client_info,
        financial: invoice.financial,
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
        clientInfo: invoice.clients // Información del cliente relacionado
      }))
      
      console.log('🔍 Facturas transformadas:', transformedInvoices)
      console.log('✅ Facturas obtenidas desde Supabase:', transformedInvoices.length)
      return transformedInvoices
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener facturas:', error)
      return await this.getInvoicesFallback()
    }
  }

  // Fallback para obtener facturas
  async getInvoicesFallback() {
    try {
      console.log('🔄 Obteniendo facturas desde fallback...')
      
      // Facturas mínimas para fallback
      const fallbackInvoices = [
        {
          id: 'fallback-invoice-1',
          invoiceNumber: 'F-2024-001',
          controlNumber: '00-0000001',
          documentType: 'FACTURA',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'BORRADOR',
          issuer: {
            companyName: 'Empresa Demo',
            rif: 'J-12345678-9'
          },
          client: {
            companyName: 'Cliente Demo',
            rif: 'J-98765432-1'
          },
          financial: {
            totalSales: 100000.00,
            currency: 'VES',
            exchangeRate: 1
          },
          items: [
            {
              description: 'Servicio Demo',
              quantity: 1,
              unitPrice: 100000.00,
              total: 100000.00
            }
          ],
          attachments: [],
          notes: 'Factura de demostración',
          createdBy: 'fallback-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      console.log('✅ Facturas obtenidas desde fallback:', fallbackInvoices.length)
      return fallbackInvoices
    } catch (error) {
      console.error('❌ Error en fallback de facturas:', error)
      return []
    }
  }

  // Obtener factura por ID
  async getInvoiceById(id) {
    try {
      console.log('🔄 Obteniendo factura por ID desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: invoice, error } = await queryWithTenant('invoices', '*, clients(*)', { id })
      
      if (error || !invoice || invoice.length === 0) {
        console.error('❌ Factura no encontrada en Supabase')
        return null
      }
      
      const invoiceData = invoice[0]
      const transformedInvoice = {
        id: invoiceData.id,
        invoiceNumber: invoiceData.invoice_number,
        controlNumber: invoiceData.control_number,
        documentType: invoiceData.document_type,
        issueDate: invoiceData.issue_date,
        dueDate: invoiceData.due_date,
        status: invoiceData.status,
        issuer: invoiceData.issuer,
        client: invoiceData.client_info,
        financial: invoiceData.financial,
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes,
        createdBy: invoiceData.created_by,
        createdAt: invoiceData.created_at,
        updatedAt: invoiceData.updated_at,
        clientInfo: invoiceData.clients
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
      
      // Preparar datos para Supabase
      const invoiceRecord = {
        client_id: invoiceData.clientId,
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber,
        document_type: invoiceData.documentType || 'FACTURA',
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        status: invoiceData.status || 'BORRADOR',
        issuer: invoiceData.issuer || {},
        client_info: invoiceData.client || {},
        financial: invoiceData.financial || {},
        items: invoiceData.items || [],
        attachments: invoiceData.attachments || [],
        notes: invoiceData.notes,
        created_by: invoiceData.createdBy
      }
      
      const { data: newInvoice, error } = await insertWithTenant('invoices', invoiceRecord)
      
      if (error) {
        console.error('❌ Error al crear factura en Supabase:', error.message)
        return { success: false, message: 'Error al crear factura' }
      }
      
      console.log('✅ Factura creada exitosamente en Supabase')
      return {
        id: newInvoice[0].id,
        invoiceNumber: newInvoice[0].invoice_number,
        controlNumber: newInvoice[0].control_number,
        documentType: newInvoice[0].document_type,
        issueDate: newInvoice[0].issue_date,
        dueDate: newInvoice[0].due_date,
        status: newInvoice[0].status,
        issuer: newInvoice[0].issuer,
        client: newInvoice[0].client_info,
        financial: newInvoice[0].financial,
        items: newInvoice[0].items || [],
        attachments: newInvoice[0].attachments || [],
        notes: newInvoice[0].notes,
        createdBy: newInvoice[0].created_by,
        createdAt: newInvoice[0].created_at,
        updatedAt: newInvoice[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al crear factura:', error)
      return { success: false, message: 'Error al crear factura' }
    }
  }

  // Actualizar factura
  async updateInvoice(id, invoiceData) {
    try {
      console.log('🔄 Actualizando factura en Supabase...')
      
      // Preparar datos para actualización
      const updateData = {
        client_id: invoiceData.clientId,
        invoice_number: invoiceData.invoiceNumber,
        control_number: invoiceData.controlNumber,
        document_type: invoiceData.documentType,
        issue_date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        status: invoiceData.status,
        issuer: invoiceData.issuer,
        client_info: invoiceData.client,
        financial: invoiceData.financial,
        items: invoiceData.items,
        attachments: invoiceData.attachments,
        notes: invoiceData.notes
      }
      
      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      const { data: updatedInvoice, error } = await updateWithTenant('invoices', id, updateData)
      
      if (error) {
        console.error('❌ Error al actualizar factura en Supabase:', error.message)
        return { success: false, message: 'Error al actualizar factura' }
      }
      
      console.log('✅ Factura actualizada en Supabase')
      return {
        id: updatedInvoice[0].id,
        invoiceNumber: updatedInvoice[0].invoice_number,
        controlNumber: updatedInvoice[0].control_number,
        documentType: updatedInvoice[0].document_type,
        issueDate: updatedInvoice[0].issue_date,
        dueDate: updatedInvoice[0].due_date,
        status: updatedInvoice[0].status,
        issuer: updatedInvoice[0].issuer,
        client: updatedInvoice[0].client_info,
        financial: updatedInvoice[0].financial,
        items: updatedInvoice[0].items || [],
        attachments: updatedInvoice[0].attachments || [],
        notes: updatedInvoice[0].notes,
        createdBy: updatedInvoice[0].created_by,
        createdAt: updatedInvoice[0].created_at,
        updatedAt: updatedInvoice[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar factura:', error)
      return { success: false, message: 'Error al actualizar factura' }
    }
  }

  // Eliminar factura (soft delete)
  async deleteInvoice(id) {
    try {
      console.log('🔄 Eliminando factura en Supabase (soft delete)...')
      
      // Soft delete: marcar como anulada
      const { data: deletedInvoice, error } = await updateWithTenant('invoices', id, { status: 'ANULADA' })
      
      if (error) {
        console.error('❌ Error al eliminar factura en Supabase:', error.message)
        return { success: false, message: 'Error al eliminar factura' }
      }
      
      console.log('✅ Factura eliminada (soft delete) en Supabase')
      return {
        id: deletedInvoice[0].id,
        invoiceNumber: deletedInvoice[0].invoice_number,
        controlNumber: deletedInvoice[0].control_number,
        documentType: deletedInvoice[0].document_type,
        issueDate: deletedInvoice[0].issue_date,
        dueDate: deletedInvoice[0].due_date,
        status: 'ANULADA',
        issuer: deletedInvoice[0].issuer,
        client: deletedInvoice[0].client_info,
        financial: deletedInvoice[0].financial,
        items: deletedInvoice[0].items || [],
        attachments: deletedInvoice[0].attachments || [],
        notes: deletedInvoice[0].notes,
        createdBy: deletedInvoice[0].created_by,
        createdAt: deletedInvoice[0].created_at,
        updatedAt: deletedInvoice[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar factura:', error)
      return { success: false, message: 'Error al eliminar factura' }
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
      const { data: invoices, error } = await queryWithTenant('invoices')
      
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
  async searchInvoices(searchTerm) {
    try {
      console.log('🔄 Buscando facturas en Supabase...')
      
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return []
      }
      
      // Buscar en múltiples campos
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*, clients(*)')
        .eq('organization_id', organizationId)
        .or(`invoice_number.ilike.%${searchTerm}%,control_number.ilike.%${searchTerm}%,client_info->>companyName.ilike.%${searchTerm}%`)
      
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
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        issuer: invoice.issuer,
        client: invoice.client_info,
        financial: invoice.financial,
        items: invoice.items || [],
        attachments: invoice.attachments || [],
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
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