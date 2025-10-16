// Servicio para manejo de clientes con Supabase Multi-Tenant
// Integra Supabase con sistema de organizaciones
import { supabase } from '@/lib/supabaseClient'
import { 
  getCurrentOrganizationId, 
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant,
  handleTenantError
} from '@/utils/tenantHelpers'

class ClientService {
  constructor() {
    this.storageKey = 'sistema_contabilidad_clients';
  }

  // Obtener todos los clientes de la organización actual
  async getClients() {
    try {
      console.log('🔄 Obteniendo clientes desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: clients, error } = await queryWithTenant('clients')
      
      if (error) {
        console.warn('⚠️ Error al obtener clientes desde Supabase, usando fallback:', error.message)
        return await this.getClientsFallback()
      }
      
      // Transformar datos para compatibilidad con el frontend
      const transformedClients = clients.map(client => ({
        id: client.id,
        companyName: client.company_name,
        rif: client.rif,
        taxpayerType: client.taxpayer_type,
        address: client.address,
        phone: client.phone,
        email: client.email,
        contactPerson: client.contact_person,
        website: client.website,
        status: client.status,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      }))
      
      console.log('✅ Clientes obtenidos desde Supabase:', transformedClients.length)
      return transformedClients
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener clientes:', error)
      return await this.getClientsFallback()
    }
  }

  // Fallback para obtener clientes
  async getClientsFallback() {
    try {
      console.log('🔄 Obteniendo clientes desde fallback...')
      
      // Clientes mínimos para fallback
      const fallbackClients = [
        {
          id: 'fallback-client-1',
          companyName: 'Cliente Demo 1',
          rif: 'J-12345678-9',
          taxpayerType: 'JURIDICA',
          address: 'Dirección Demo',
          phone: '+58 212 555-0001',
          email: 'demo1@cliente.com',
          contactPerson: 'Contacto Demo',
          website: 'www.demo1.com',
          status: 'ACTIVO',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      
      console.log('✅ Clientes obtenidos desde fallback:', fallbackClients.length)
      return fallbackClients
    } catch (error) {
      console.error('❌ Error en fallback de clientes:', error)
      return []
    }
  }

  // Obtener cliente por ID
  async getClientById(id) {
    try {
      console.log('🔄 Obteniendo cliente por ID desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: client, error } = await queryWithTenant('clients', '*', { id })
      
      if (error || !client || client.length === 0) {
        console.error('❌ Cliente no encontrado en Supabase')
        return null
      }
      
      const clientData = client[0]
      const transformedClient = {
        id: clientData.id,
        companyName: clientData.company_name,
        rif: clientData.rif,
        taxpayerType: clientData.taxpayer_type,
        address: clientData.address,
        phone: clientData.phone,
        email: clientData.email,
        contactPerson: clientData.contact_person,
        website: clientData.website,
        status: clientData.status,
        createdAt: clientData.created_at,
        updatedAt: clientData.updated_at
      }
      
      console.log('✅ Cliente obtenido desde Supabase:', transformedClient.companyName)
      return transformedClient
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener cliente:', error)
      return null
    }
  }

  // Crear nuevo cliente
  async createClient(clientData) {
    try {
      console.log('🔄 Creando cliente en Supabase...')
      
      // Preparar datos para Supabase
      const clientRecord = {
        company_name: clientData.companyName,
        rif: clientData.rif,
        taxpayer_type: clientData.taxpayerType || 'JURIDICA',
        address: clientData.address,
        phone: clientData.phone,
        email: clientData.email,
        contact_person: clientData.contactPerson,
        website: clientData.website,
        status: clientData.status || 'ACTIVO'
      }
      
      const { data: newClient, error } = await insertWithTenant('clients', clientRecord)
      
      if (error) {
        console.error('❌ Error al crear cliente en Supabase:', error.message)
        return { success: false, message: 'Error al crear cliente' }
      }
      
      console.log('✅ Cliente creado exitosamente en Supabase')
      return {
        id: newClient[0].id,
        companyName: newClient[0].company_name,
        rif: newClient[0].rif,
        taxpayerType: newClient[0].taxpayer_type,
        address: newClient[0].address,
        phone: newClient[0].phone,
        email: newClient[0].email,
        contactPerson: newClient[0].contact_person,
        website: newClient[0].website,
        status: newClient[0].status,
        createdAt: newClient[0].created_at,
        updatedAt: newClient[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al crear cliente:', error)
      return { success: false, message: 'Error al crear cliente' }
    }
  }

  // Actualizar cliente
  async updateClient(id, clientData) {
    try {
      console.log('🔄 Actualizando cliente en Supabase...')
      
      // Preparar datos para actualización
      const updateData = {
        company_name: clientData.companyName,
        rif: clientData.rif,
        taxpayer_type: clientData.taxpayerType,
        address: clientData.address,
        phone: clientData.phone,
        email: clientData.email,
        contact_person: clientData.contactPerson,
        website: clientData.website,
        status: clientData.status
      }
      
      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      const { data: updatedClient, error } = await updateWithTenant('clients', id, updateData)
      
      if (error) {
        console.error('❌ Error al actualizar cliente en Supabase:', error.message)
        return { success: false, message: 'Error al actualizar cliente' }
      }
      
      console.log('✅ Cliente actualizado en Supabase')
      return {
        id: updatedClient[0].id,
        companyName: updatedClient[0].company_name,
        rif: updatedClient[0].rif,
        taxpayerType: updatedClient[0].taxpayer_type,
        address: updatedClient[0].address,
        phone: updatedClient[0].phone,
        email: updatedClient[0].email,
        contactPerson: updatedClient[0].contact_person,
        website: updatedClient[0].website,
        status: updatedClient[0].status,
        createdAt: updatedClient[0].created_at,
        updatedAt: updatedClient[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar cliente:', error)
      return { success: false, message: 'Error al actualizar cliente' }
    }
  }

  // Eliminar cliente (soft delete)
  async deleteClient(id) {
    try {
      console.log('🔄 Eliminando cliente en Supabase (soft delete)...')
      
      // Soft delete: marcar como inactivo
      const { data: deletedClient, error } = await updateWithTenant('clients', id, { status: 'INACTIVO' })
      
      if (error) {
        console.error('❌ Error al eliminar cliente en Supabase:', error.message)
        return { success: false, message: 'Error al eliminar cliente' }
      }
      
      console.log('✅ Cliente eliminado (soft delete) en Supabase')
      return {
        id: deletedClient[0].id,
        companyName: deletedClient[0].company_name,
        rif: deletedClient[0].rif,
        taxpayerType: deletedClient[0].taxpayer_type,
        address: deletedClient[0].address,
        phone: deletedClient[0].phone,
        email: deletedClient[0].email,
        contactPerson: deletedClient[0].contact_person,
        website: deletedClient[0].website,
        status: 'INACTIVO',
        createdAt: deletedClient[0].created_at,
        updatedAt: deletedClient[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar cliente:', error)
      return { success: false, message: 'Error al eliminar cliente' }
    }
  }

  // Obtener estadísticas de clientes
  async getClientStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de clientes desde Supabase...')
      
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return { total: 0, byStatus: {}, byType: {} }
      }
      
      // Intentar usar función RPC optimizada
      try {
        const { data: stats, error } = await supabase.rpc('get_client_stats', {
          org_id: organizationId
        })
        
        if (!error && stats) {
          console.log('✅ Estadísticas obtenidas desde función RPC')
          return {
            total: stats.total || 0,
            byStatus: stats.by_status || {},
            byType: stats.by_type || {}
          }
        }
      } catch (rpcError) {
        console.warn('⚠️ Error en función RPC, calculando manualmente:', rpcError.message)
      }
      
      // Fallback: calcular manualmente
      const { data: clients, error } = await queryWithTenant('clients')
      
      if (error) {
        console.error('❌ Error al obtener clientes para estadísticas:', error.message)
        return { total: 0, byStatus: {}, byType: {} }
      }
      
      // Calcular estadísticas
      const stats = {
        total: clients.length,
        byStatus: {},
        byType: {}
      }
      
      clients.forEach(client => {
        // Por estado
        stats.byStatus[client.status] = (stats.byStatus[client.status] || 0) + 1
        
        // Por tipo de contribuyente
        stats.byType[client.taxpayer_type] = (stats.byType[client.taxpayer_type] || 0) + 1
      })
      
      console.log('✅ Estadísticas calculadas manualmente')
      return stats
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener estadísticas:', error)
      return { total: 0, byStatus: {}, byType: {} }
    }
  }

  // Buscar clientes
  async searchClients(searchTerm) {
    try {
      console.log('🔄 Buscando clientes en Supabase...')
      
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return []
      }
      
      // Buscar en múltiples campos
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`company_name.ilike.%${searchTerm}%,rif.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      
      if (error) {
        console.error('❌ Error al buscar clientes:', error.message)
        return []
      }
      
      // Transformar datos
      const transformedClients = clients.map(client => ({
        id: client.id,
        companyName: client.company_name,
        rif: client.rif,
        taxpayerType: client.taxpayer_type,
        address: client.address,
        phone: client.phone,
        email: client.email,
        contactPerson: client.contact_person,
        website: client.website,
        status: client.status,
        createdAt: client.created_at,
        updatedAt: client.updated_at
      }))
      
      console.log('✅ Clientes encontrados:', transformedClients.length)
      return transformedClients
      
    } catch (error) {
      console.error('❌ Error inesperado al buscar clientes:', error)
      return []
    }
  }

  // Validar RIF único
  async validateUniqueRif(rif, excludeId = null) {
    try {
      console.log('🔄 Validando RIF único en Supabase...')
      
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.error('❌ No hay organization_id disponible')
        return false
      }
      
      let query = supabase
        .from('clients')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('rif', rif)
      
      if (excludeId) {
        query = query.neq('id', excludeId)
      }
      
      const { data: existingClient, error } = await query
      
      if (error) {
        console.error('❌ Error al validar RIF:', error.message)
        return false
      }
      
      const isValid = !existingClient || existingClient.length === 0
      console.log('✅ RIF válido:', isValid)
      return isValid
      
    } catch (error) {
      console.error('❌ Error inesperado al validar RIF:', error)
      return false
    }
  }
}

// Crear instancia única del servicio
const clientService = new ClientService()

export default clientService