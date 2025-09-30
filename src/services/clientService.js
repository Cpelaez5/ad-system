// Servicio para manejo de clientes con localStorage (MVP sin base de datos)
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

  // Obtener todos los clientes
  async getClients(filters = {}) {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      let filteredClients = [...clients];
      
      // Aplicar filtros
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredClients = filteredClients.filter(client =>
          client.companyName.toLowerCase().includes(searchLower) ||
          client.rif.toLowerCase().includes(searchLower) ||
          client.contactPerson.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.status) {
        filteredClients = filteredClients.filter(client => client.status === filters.status);
      }
      
      // Paginación
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedClients = filteredClients.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: paginatedClients,
        pagination: {
          page,
          limit,
          total: filteredClients.length,
          totalPages: Math.ceil(filteredClients.length / limit)
        }
      };
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      throw error;
    }
  }

  // Obtener cliente por ID
  async getClientById(id) {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const client = clients.find(c => c.id === parseInt(id));
      
      if (!client) {
        throw new Error('Cliente no encontrado');
      }
      
      return {
        success: true,
        data: client
      };
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      throw error;
    }
  }

  // Crear nuevo cliente
  async createClient(clientData) {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      const newClient = {
        id: clients.length > 0 ? Math.max(...clients.map(c => c.id)) + 1 : 1,
        ...clientData,
        status: 'ACTIVO',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      clients.push(newClient);
      localStorage.setItem(this.storageKey, JSON.stringify(clients));
      
      return {
        success: true,
        message: 'Cliente creado exitosamente',
        data: newClient
      };
    } catch (error) {
      console.error('Error al crear cliente:', error);
      throw error;
    }
  }

  // Actualizar cliente
  async updateClient(id, clientData) {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const clientIndex = clients.findIndex(c => c.id === parseInt(id));
      
      if (clientIndex === -1) {
        throw new Error('Cliente no encontrado');
      }
      
      const updatedClient = {
        ...clients[clientIndex],
        ...clientData,
        id: clients[clientIndex].id,
        updatedAt: new Date().toISOString()
      };
      
      clients[clientIndex] = updatedClient;
      localStorage.setItem(this.storageKey, JSON.stringify(clients));
      
      return {
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: updatedClient
      };
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      throw error;
    }
  }

  // Eliminar cliente
  async deleteClient(id) {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const clientIndex = clients.findIndex(c => c.id === parseInt(id));
      
      if (clientIndex === -1) {
        throw new Error('Cliente no encontrado');
      }
      
      const deletedClient = clients.splice(clientIndex, 1)[0];
      localStorage.setItem(this.storageKey, JSON.stringify(clients));
      
      return {
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: deletedClient
      };
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      throw error;
    }
  }

  // Obtener estadísticas de clientes
  async getClientStats() {
    try {
      const clients = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      const stats = {
        total: clients.length,
        byStatus: {},
        byType: {}
      };
      
      clients.forEach(client => {
        // Por estado
        stats.byStatus[client.status] = (stats.byStatus[client.status] || 0) + 1;
        
        // Por tipo de contribuyente
        stats.byType[client.taxpayerType] = (stats.byType[client.taxpayerType] || 0) + 1;
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de clientes:', error);
      throw error;
    }
  }
}

export const clientService = new ClientService();
