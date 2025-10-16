// Servicio para manejo de clientes con Supabase Multi-Tenant
// Integra Supabase con sistema de organizaciones y fallback a localStorage
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
    this.initializeStorage();
  }

  // Inicializar datos de ejemplo en localStorage
  initializeStorage() {
    const existingData = localStorage.getItem(this.storageKey);
    const existingClients = existingData ? JSON.parse(existingData) : [];
    
    // Si no hay datos o hay muy pocos (menos de 5), cargar datos de ejemplo
    if (!existingData || existingClients.length < 5) {
      const sampleClients = [
        {
          id: 1,
          companyName: 'CONSTRUCTORA DEL CARIBE S.A.',
          rif: 'J-30123456-7',
          taxpayerType: 'JURIDICA',
          address: 'Zona Industrial de Valencia, Edificio Principal, Valencia',
          phone: '+58 241 555-0200',
          email: 'compras@constructoracaribe.com',
          contactPerson: 'María González',
          website: 'www.constructoracaribe.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 2,
          companyName: 'DISTRIBUIDORA NACIONAL DE ALIMENTOS C.A.',
          rif: 'J-40123456-9',
          taxpayerType: 'JURIDICA',
          address: 'Carretera Panamericana, Km 15, Maracay',
          phone: '+58 243 555-0300',
          email: 'administracion@dinalimentos.com',
          contactPerson: 'Carlos Rodríguez',
          website: 'www.dinalimentos.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 3,
          companyName: 'CLÍNICA ESPECIALIZADA DEL ESTE C.A.',
          rif: 'J-30123456-8',
          taxpayerType: 'JURIDICA',
          address: 'Av. Libertador, Edificio Médico Los Palos Grandes, Caracas',
          phone: '+58 212 555-0400',
          email: 'administracion@clinicaeste.com',
          contactPerson: 'Dra. Ana Martínez',
          website: 'www.clinicaeste.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 4,
          companyName: 'HOTEL PLAYA DORADA C.A.',
          rif: 'J-40123456-0',
          taxpayerType: 'JURIDICA',
          address: 'Playa El Agua, Isla de Margarita, Nueva Esparta',
          phone: '+58 295 555-0500',
          email: 'gerencia@hotelplayadorada.com',
          contactPerson: 'Roberto Silva',
          website: 'www.hotelplayadorada.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 5,
          companyName: 'TRANSPORTE RÁPIDO DEL CENTRO C.A.',
          rif: 'J-30123456-9',
          taxpayerType: 'JURIDICA',
          address: 'Terminal de Pasajeros, Maracay, Aragua',
          phone: '+58 243 555-0600',
          email: 'administracion@transrapido.com',
          contactPerson: 'Luis Herrera',
          website: 'www.transrapido.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 6,
          companyName: 'COLEGIO SANTA MARÍA C.A.',
          rif: 'J-30123456-0',
          taxpayerType: 'JURIDICA',
          address: 'Av. Universidad, Edificio Educativo, Caracas',
          phone: '+58 212 555-0700',
          email: 'administracion@colegiosantamaria.edu.ve',
          contactPerson: 'Prof. Carmen López',
          website: 'www.colegiosantamaria.edu.ve',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 7,
          companyName: 'RESTAURANTE EL BUEN SABOR C.A.',
          rif: 'J-40123456-1',
          taxpayerType: 'JURIDICA',
          address: 'Calle Real de Sabana Grande, Caracas',
          phone: '+58 212 555-0800',
          email: 'gerencia@buensabor.com',
          contactPerson: 'José Mendoza',
          website: 'www.buensabor.com',
          status: 'INACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-02-15T00:00:00Z'
        },
        {
          id: 8,
          companyName: 'FARMACIA SALUD TOTAL C.A.',
          rif: 'J-30123456-1',
          taxpayerType: 'JURIDICA',
          address: 'Av. Bolívar, Centro Comercial, Valencia',
          phone: '+58 241 555-0900',
          email: 'administracion@saludtotal.com',
          contactPerson: 'Dra. Patricia Ruiz',
          website: 'www.saludtotal.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 9,
          companyName: 'SUPERMERCADO EL AHORRO C.A.',
          rif: 'J-40123456-2',
          taxpayerType: 'JURIDICA',
          address: 'Av. Principal, Centro Comercial, Barquisimeto',
          phone: '+58 251 555-1000',
          email: 'gerencia@elahorro.com',
          contactPerson: 'Ana García',
          website: 'www.elahorro.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 10,
          companyName: 'TALLER MECÁNICO EL ESPECIALISTA C.A.',
          rif: 'J-30123456-2',
          taxpayerType: 'JURIDICA',
          address: 'Zona Industrial, Edificio Taller, Maracaibo',
          phone: '+58 261 555-1100',
          email: 'administracion@elespecialista.com',
          contactPerson: 'Miguel Torres',
          website: 'www.elespecialista.com',
          status: 'ACTIVO',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      
      localStorage.setItem(this.storageKey, JSON.stringify(sampleClients));
    }
  }

  // Obtener todos los clientes de la organización actual
  async getClients(filters = {}) {
    try {
      console.log('🔄 Obteniendo clientes desde Supabase...')
      
      // Intentar obtener desde Supabase
      let query = queryWithTenant('clients')
      
      // Aplicar filtros de búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        query = query.or(`company_name.ilike.%${searchLower}%,rif.ilike.%${searchLower}%,contact_person.ilike.%${searchLower}%`)
      }
      
      // Aplicar filtro de estado
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      // Aplicar paginación
      const page = parseInt(filters.page) || 1
      const limit = parseInt(filters.limit) || 10
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      query = query.range(from, to).order('created_at', { ascending: false })
      
      const { data: clients, error, count } = await query
      
      if (error) {
        console.warn('⚠️ Error al obtener clientes desde Supabase, usando fallback:', error.message)
        return await this.getClientsFallback(filters)
      }
      
      // Transformar datos para compatibilidad
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
      return {
        success: true,
        data: transformedClients,
        pagination: {
          page,
          limit,
          total: count || transformedClients.length,
          totalPages: Math.ceil((count || transformedClients.length) / limit)
        }
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener clientes:', error)
      return await this.getClientsFallback(filters)
    }
  },

  // Fallback para obtener clientes desde localStorage
  async getClientsFallback(filters = {}) {
    try {
      console.log('🔄 Obteniendo clientes desde localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}` // Separar por organización
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      let filteredClients = [...clients]
      
      // Aplicar filtros
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredClients = filteredClients.filter(client =>
          client.companyName.toLowerCase().includes(searchLower) ||
          client.rif.toLowerCase().includes(searchLower) ||
          client.contactPerson.toLowerCase().includes(searchLower)
        )
      }
      
      if (filters.status) {
        filteredClients = filteredClients.filter(client => client.status === filters.status)
      }
      
      // Paginación
      const page = parseInt(filters.page) || 1
      const limit = parseInt(filters.limit) || 10
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedClients = filteredClients.slice(startIndex, endIndex)
      
      console.log('✅ Clientes obtenidos desde localStorage:', paginatedClients.length)
      return {
        success: true,
        data: paginatedClients,
        pagination: {
          page,
          limit,
          total: filteredClients.length,
          totalPages: Math.ceil(filteredClients.length / limit)
        }
      }
    } catch (error) {
      console.error('❌ Error en fallback de clientes:', error)
      throw error
    }
  }

  // Obtener cliente por ID
  async getClientById(id) {
    try {
      console.log('🔄 Obteniendo cliente por ID desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: clients, error } = await queryWithTenant('clients', '*', { id })
      
      if (error || !clients || clients.length === 0) {
        console.warn('⚠️ Cliente no encontrado en Supabase, usando fallback')
        return await this.getClientByIdFallback(id)
      }
      
      const client = clients[0]
      const transformedClient = {
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
      }
      
      console.log('✅ Cliente obtenido desde Supabase:', transformedClient.companyName)
      return {
        success: true,
        data: transformedClient
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener cliente:', error)
      return await this.getClientByIdFallback(id)
    }
  },

  // Fallback para obtener cliente por ID desde localStorage
  async getClientByIdFallback(id) {
    try {
      console.log('🔄 Obteniendo cliente por ID desde localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}`
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const client = clients.find(c => c.id === parseInt(id))
      
      if (!client) {
        throw new Error('Cliente no encontrado')
      }
      
      console.log('✅ Cliente obtenido desde localStorage:', client.companyName)
      return {
        success: true,
        data: client
      }
    } catch (error) {
      console.error('❌ Error en fallback de cliente por ID:', error)
      throw error
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
        status: 'ACTIVO'
      }
      
      const { data: newClient, error } = await insertWithTenant('clients', clientRecord)
      
      if (error) {
        console.warn('⚠️ Error al crear cliente en Supabase, usando fallback:', error.message)
        return await this.createClientFallback(clientData)
      }
      
      const transformedClient = {
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
      
      console.log('✅ Cliente creado en Supabase:', transformedClient.companyName)
      return {
        success: true,
        message: 'Cliente creado exitosamente',
        data: transformedClient
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al crear cliente:', error)
      return await this.createClientFallback(clientData)
    }
  },

  // Fallback para crear cliente en localStorage
  async createClientFallback(clientData) {
    try {
      console.log('🔄 Creando cliente en localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}`
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      const newClient = {
        id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
        ...clientData,
        status: 'ACTIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      clients.push(newClient)
      localStorage.setItem(storageKey, JSON.stringify(clients))
      
      console.log('✅ Cliente creado en localStorage:', newClient.companyName)
      return {
        success: true,
        message: 'Cliente creado exitosamente',
        data: newClient
      }
    } catch (error) {
      console.error('❌ Error en fallback de creación de cliente:', error)
      throw error
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
        console.warn('⚠️ Error al actualizar cliente en Supabase, usando fallback:', error.message)
        return await this.updateClientFallback(id, clientData)
      }
      
      const transformedClient = {
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
      
      console.log('✅ Cliente actualizado en Supabase:', transformedClient.companyName)
      return {
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: transformedClient
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar cliente:', error)
      return await this.updateClientFallback(id, clientData)
    }
  },

  // Fallback para actualizar cliente en localStorage
  async updateClientFallback(id, clientData) {
    try {
      console.log('🔄 Actualizando cliente en localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}`
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const clientIndex = clients.findIndex(c => c.id === parseInt(id))
      
      if (clientIndex === -1) {
        throw new Error('Cliente no encontrado')
      }
      
      const updatedClient = {
        ...clients[clientIndex],
        ...clientData,
        id: clients[clientIndex].id,
        updatedAt: new Date().toISOString()
      }
      
      clients[clientIndex] = updatedClient
      localStorage.setItem(storageKey, JSON.stringify(clients))
      
      console.log('✅ Cliente actualizado en localStorage:', updatedClient.companyName)
      return {
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: updatedClient
      }
    } catch (error) {
      console.error('❌ Error en fallback de actualización de cliente:', error)
      throw error
    }
  }

  // Eliminar cliente
  async deleteClient(id) {
    try {
      console.log('🔄 Eliminando cliente en Supabase...')
      
      const { data: deletedClient, error } = await deleteWithTenant('clients', id)
      
      if (error) {
        console.warn('⚠️ Error al eliminar cliente en Supabase, usando fallback:', error.message)
        return await this.deleteClientFallback(id)
      }
      
      const transformedClient = {
        id: deletedClient[0].id,
        companyName: deletedClient[0].company_name,
        rif: deletedClient[0].rif,
        taxpayerType: deletedClient[0].taxpayer_type,
        address: deletedClient[0].address,
        phone: deletedClient[0].phone,
        email: deletedClient[0].email,
        contactPerson: deletedClient[0].contact_person,
        website: deletedClient[0].website,
        status: deletedClient[0].status,
        createdAt: deletedClient[0].created_at,
        updatedAt: deletedClient[0].updated_at
      }
      
      console.log('✅ Cliente eliminado en Supabase:', transformedClient.companyName)
      return {
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: transformedClient
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar cliente:', error)
      return await this.deleteClientFallback(id)
    }
  },

  // Fallback para eliminar cliente en localStorage
  async deleteClientFallback(id) {
    try {
      console.log('🔄 Eliminando cliente en localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}`
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const clientIndex = clients.findIndex(c => c.id === parseInt(id))
      
      if (clientIndex === -1) {
        throw new Error('Cliente no encontrado')
      }
      
      const deletedClient = clients.splice(clientIndex, 1)[0]
      localStorage.setItem(storageKey, JSON.stringify(clients))
      
      console.log('✅ Cliente eliminado en localStorage:', deletedClient.companyName)
      return {
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: deletedClient
      }
    } catch (error) {
      console.error('❌ Error en fallback de eliminación de cliente:', error)
      throw error
    }
  }

  // Obtener estadísticas de clientes
  async getClientStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de clientes desde Supabase...')
      
      // Intentar obtener desde Supabase usando función SQL
      const orgId = getCurrentOrganizationId()
      if (orgId) {
        const { data: stats, error } = await supabase.rpc('get_client_stats', { org_id: orgId })
        
        if (!error && stats) {
          console.log('✅ Estadísticas obtenidas desde Supabase')
          return {
            success: true,
            data: stats
          }
        }
      }
      
      // Fallback: calcular estadísticas manualmente
      const { data: clients, error } = await queryWithTenant('clients')
      
      if (error) {
        console.warn('⚠️ Error al obtener estadísticas desde Supabase, usando fallback:', error.message)
        return await this.getClientStatsFallback()
      }
      
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
      
      console.log('✅ Estadísticas calculadas desde Supabase')
      return {
        success: true,
        data: stats
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener estadísticas:', error)
      return await this.getClientStatsFallback()
    }
  },

  // Fallback para obtener estadísticas desde localStorage
  async getClientStatsFallback() {
    try {
      console.log('🔄 Obteniendo estadísticas desde localStorage...')
      
      const orgId = getCurrentOrganizationId()
      const storageKey = `${this.storageKey}_${orgId}`
      const clients = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      const stats = {
        total: clients.length,
        byStatus: {},
        byType: {}
      }
      
      clients.forEach(client => {
        // Por estado
        stats.byStatus[client.status] = (stats.byStatus[client.status] || 0) + 1
        
        // Por tipo de contribuyente
        stats.byType[client.taxpayerType] = (stats.byType[client.taxpayerType] || 0) + 1
      })
      
      console.log('✅ Estadísticas obtenidas desde localStorage')
      return {
        success: true,
        data: stats
      }
    } catch (error) {
      console.error('❌ Error en fallback de estadísticas:', error)
      throw error
    }
  }
}

export const clientService = new ClientService();
