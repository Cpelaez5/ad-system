// Servicio para manejo de facturas con Supabase Multi-Tenant y fallback a localStorage
import { supabase } from '@/lib/supabaseClient'
import { 
  getCurrentOrganizationId, 
  setCurrentOrganizationId, 
  clearCurrentOrganizationId,
  queryWithTenant, 
  insertWithTenant, 
  updateWithTenant, 
  deleteWithTenant, 
  handleTenantError 
} from '@/utils/tenantHelpers'

class InvoiceService {
  constructor() {
    this.storageKey = 'sistema_contabilidad_invoices';
    this.initializeStorage();
  }

  // Inicializar datos de ejemplo en localStorage con multi-tenancy
  initializeStorage() {
    const organizationId = getCurrentOrganizationId()
    const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
    const existingData = localStorage.getItem(storageKey);
    const existingInvoices = existingData ? JSON.parse(existingData) : [];
    
    // Si no hay datos o hay muy pocos (menos de 5), cargar datos de ejemplo
    if (!existingData || existingInvoices.length < 5) {
      const sampleInvoices = [
        {
          id: 1,
          invoiceNumber: 'F-2024-001',
          controlNumber: '00-0008966',
          documentType: 'FACTURA',
          issueDate: '2024-01-15',
          dueDate: '2024-02-15',
          status: 'PAGADA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'CONSTRUCTORA DEL CARIBE S.A.',
            rif: 'J-30123456-7',
            taxpayerType: 'JURIDICA',
            address: 'Zona Industrial de Valencia, Edificio Principal, Valencia',
            phone: '+58 241 555-0200',
            email: 'compras@constructoracaribe.com',
            contactPerson: 'María González'
          },
          
          financial: {
            totalSales: 125000.00,
            nonTaxableSales: 0,
            taxableSales: 107758.62,
            taxDebit: 17241.38,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Servicios de Consultoría Tecnológica',
              quantity: 40,
              unitPrice: 2500.00,
              total: 100000.00
            },
            {
              description: 'Licencias de Software Empresarial',
              quantity: 5,
              unitPrice: 5000.00,
              total: 25000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-01-15T09:00:00Z',
          updatedAt: '2024-01-15T09:00:00Z',
          notes: 'Proyecto de digitalización empresarial - Fase 1'
        },
        {
          id: 2,
          invoiceNumber: 'F-2024-002',
          controlNumber: '00-0008967',
          documentType: 'FACTURA',
          issueDate: '2024-01-20',
          dueDate: '2024-02-20',
          status: 'EMITIDA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'DISTRIBUIDORA NACIONAL DE ALIMENTOS C.A.',
            rif: 'J-40123456-9',
            taxpayerType: 'JURIDICA',
            address: 'Carretera Panamericana, Km 15, Maracay',
            phone: '+58 243 555-0300',
            email: 'administracion@dinalimentos.com',
            contactPerson: 'Carlos Rodríguez'
          },
          
          financial: {
            totalSales: 87500.00,
            nonTaxableSales: 0,
            taxableSales: 75431.03,
            taxDebit: 12068.97,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Gestión de Inventarios',
              quantity: 1,
              unitPrice: 50000.00,
              total: 50000.00
            },
            {
              description: 'Capacitación del Personal',
              quantity: 20,
              unitPrice: 1500.00,
              total: 30000.00
            },
            {
              description: 'Mantenimiento Anual',
              quantity: 1,
              unitPrice: 7500.00,
              total: 7500.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-01-20T10:30:00Z',
          updatedAt: '2024-01-20T10:30:00Z',
          notes: 'Implementación de sistema ERP para gestión de inventarios'
        },
        {
          id: 3,
          invoiceNumber: 'F-2024-003',
          controlNumber: '00-0008968',
          documentType: 'FACTURA',
          issueDate: '2024-01-25',
          dueDate: '2024-02-25',
          status: 'ENVIADA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'CLÍNICA ESPECIALIZADA DEL ESTE C.A.',
            rif: 'J-30123456-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Libertador, Edificio Médico Los Palos Grandes, Caracas',
            phone: '+58 212 555-0400',
            email: 'administracion@clinicaeste.com',
            contactPerson: 'Dra. Ana Martínez'
          },
          
          financial: {
            totalSales: 156000.00,
            nonTaxableSales: 0,
            taxableSales: 134482.76,
            taxDebit: 21517.24,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Historia Clínica Digital',
              quantity: 1,
              unitPrice: 80000.00,
              total: 80000.00
            },
            {
              description: 'Módulo de Citas Médicas',
              quantity: 1,
              unitPrice: 25000.00,
              total: 25000.00
            },
            {
              description: 'Sistema de Facturación Médica',
              quantity: 1,
              unitPrice: 30000.00,
              total: 30000.00
            },
            {
              description: 'Capacitación Médica',
              quantity: 15,
              unitPrice: 1400.00,
              total: 21000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-01-25T14:15:00Z',
          updatedAt: '2024-01-25T14:15:00Z',
          notes: 'Digitalización completa del sistema médico - Proyecto integral'
        },
        {
          id: 4,
          invoiceNumber: 'F-2024-004',
          controlNumber: '00-0008969',
          documentType: 'FACTURA',
          issueDate: '2024-02-01',
          dueDate: '2024-03-01',
          status: 'BORRADOR',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'HOTEL PLAYA DORADA C.A.',
            rif: 'J-40123456-0',
            taxpayerType: 'JURIDICA',
            address: 'Playa El Agua, Isla de Margarita, Nueva Esparta',
            phone: '+58 295 555-0500',
            email: 'gerencia@hotelplayadorada.com',
            contactPerson: 'Roberto Silva'
          },
          
          financial: {
            totalSales: 95000.00,
            nonTaxableSales: 0,
            taxableSales: 81982.76,
            taxDebit: 13017.24,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Reservas Online',
              quantity: 1,
              unitPrice: 45000.00,
              total: 45000.00
            },
            {
              description: 'Módulo de Gestión de Habitaciones',
              quantity: 1,
              unitPrice: 25000.00,
              total: 25000.00
            },
            {
              description: 'Sistema de Facturación Hotelera',
              quantity: 1,
              unitPrice: 20000.00,
              total: 20000.00
            },
            {
              description: 'Capacitación del Personal',
              quantity: 10,
              unitPrice: 500.00,
              total: 5000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-02-01T11:00:00Z',
          updatedAt: '2024-02-01T11:00:00Z',
          notes: 'Sistema integral de gestión hotelera - En desarrollo'
        },
        {
          id: 5,
          invoiceNumber: 'F-2024-005',
          controlNumber: '00-0008970',
          documentType: 'FACTURA',
          issueDate: '2024-02-05',
          dueDate: '2024-03-05',
          status: 'VENCIDA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'TRANSPORTE RÁPIDO DEL CENTRO C.A.',
            rif: 'J-30123456-9',
            taxpayerType: 'JURIDICA',
            address: 'Terminal de Pasajeros, Maracay, Aragua',
            phone: '+58 243 555-0600',
            email: 'administracion@transrapido.com',
            contactPerson: 'Luis Herrera'
          },
          
          financial: {
            totalSales: 68000.00,
            nonTaxableSales: 0,
            taxableSales: 58620.69,
            taxDebit: 9379.31,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Control de Flota',
              quantity: 1,
              unitPrice: 35000.00,
              total: 35000.00
            },
            {
              description: 'Módulo de Ventas de Boletos',
              quantity: 1,
              unitPrice: 20000.00,
              total: 20000.00
            },
            {
              description: 'Sistema de Monitoreo GPS',
              quantity: 1,
              unitPrice: 13000.00,
              total: 13000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-02-05T16:45:00Z',
          updatedAt: '2024-02-05T16:45:00Z',
          notes: 'Sistema de gestión para empresa de transporte - Vencida por falta de pago'
        },
        {
          id: 6,
          invoiceNumber: 'F-2024-006',
          controlNumber: '00-0008971',
          documentType: 'FACTURA',
          issueDate: '2024-02-10',
          dueDate: '2024-03-10',
          status: 'PAGADA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'COLEGIO SANTA MARÍA C.A.',
            rif: 'J-30123456-0',
            taxpayerType: 'JURIDICA',
            address: 'Av. Universidad, Edificio Educativo, Caracas',
            phone: '+58 212 555-0700',
            email: 'administracion@colegiosantamaria.edu.ve',
            contactPerson: 'Prof. Carmen López'
          },
          
          financial: {
            totalSales: 75000.00,
            nonTaxableSales: 0,
            taxableSales: 64655.17,
            taxDebit: 10344.83,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Gestión Académica',
              quantity: 1,
              unitPrice: 40000.00,
              total: 40000.00
            },
            {
              description: 'Módulo de Notas y Calificaciones',
              quantity: 1,
              unitPrice: 15000.00,
              total: 15000.00
            },
            {
              description: 'Sistema de Comunicación Padres',
              quantity: 1,
              unitPrice: 10000.00,
              total: 10000.00
            },
            {
              description: 'Capacitación Docente',
              quantity: 25,
              unitPrice: 400.00,
              total: 10000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-02-10T13:20:00Z',
          updatedAt: '2024-02-10T13:20:00Z',
          notes: 'Digitalización del sistema educativo - Proyecto completado exitosamente'
        },
        {
          id: 7,
          invoiceNumber: 'F-2024-007',
          controlNumber: '00-0008972',
          documentType: 'FACTURA',
          issueDate: '2024-02-15',
          dueDate: '2024-03-15',
          status: 'ANULADA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'RESTAURANTE EL BUEN SABOR C.A.',
            rif: 'J-40123456-1',
            taxpayerType: 'JURIDICA',
            address: 'Calle Real de Sabana Grande, Caracas',
            phone: '+58 212 555-0800',
            email: 'gerencia@buensabor.com',
            contactPerson: 'José Mendoza'
          },
          
          financial: {
            totalSales: 0,
            nonTaxableSales: 0,
            taxableSales: 0,
            taxDebit: 0,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-02-15T09:30:00Z',
          updatedAt: '2024-02-15T09:30:00Z',
          notes: 'Factura anulada por cancelación del proyecto - Cliente decidió no continuar'
        },
        {
          id: 8,
          invoiceNumber: 'F-2024-008',
          controlNumber: '00-0008973',
          documentType: 'FACTURA',
          issueDate: '2024-02-20',
          dueDate: '2024-03-20',
          status: 'EMITIDA',
          
          issuer: {
            companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
            rif: 'J-41234567-8',
            taxpayerType: 'JURIDICA',
            address: 'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
            phone: '+58 212 555-0100',
            email: 'ventas@tav.com.ve',
            website: 'www.tav.com.ve'
          },
          
          client: {
            companyName: 'FARMACIA SALUD TOTAL C.A.',
            rif: 'J-30123456-1',
            taxpayerType: 'JURIDICA',
            address: 'Av. Bolívar, Centro Comercial, Valencia',
            phone: '+58 241 555-0900',
            email: 'administracion@saludtotal.com',
            contactPerson: 'Dra. Patricia Ruiz'
          },
          
          financial: {
            totalSales: 45000.00,
            nonTaxableSales: 0,
            taxableSales: 38793.10,
            taxDebit: 6206.90,
            ivaRetention: 0,
            islrRetention: 0,
            municipalRetention: 0,
            igtf: 0,
            currency: 'VES',
            exchangeRate: 1
          },
          
          items: [
            {
              description: 'Sistema de Gestión de Inventario Farmacéutico',
              quantity: 1,
              unitPrice: 30000.00,
              total: 30000.00
            },
            {
              description: 'Módulo de Control de Vencimientos',
              quantity: 1,
              unitPrice: 10000.00,
              total: 10000.00
            },
            {
              description: 'Capacitación del Personal',
              quantity: 5,
              unitPrice: 1000.00,
              total: 5000.00
            }
          ],
          attachments: [],
          
          createdBy: 'admin',
          createdAt: '2024-02-20T15:10:00Z',
          updatedAt: '2024-02-20T15:10:00Z',
          notes: 'Sistema de gestión farmacéutica - Control de inventarios y vencimientos'
        }
      ];
      
      localStorage.setItem(storageKey, JSON.stringify(sampleInvoices));
    }
  }

  // Obtener todas las facturas de la organización actual
  async getInvoices(filters = {}) {
    try {
      console.log('🔄 Obteniendo facturas desde Supabase...')

      // Intentar obtener desde Supabase
      let query = queryWithTenant('invoices')

      // Aplicar filtros de búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        query = query.or(`invoice_number.ilike.%${searchLower}%,client_info->>company_name.ilike.%${searchLower}%,issuer->>company_name.ilike.%${searchLower}%`)
      }

      // Aplicar filtro de estado
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Aplicar filtros de fecha
      if (filters.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('issue_date', filters.dateTo)
      }

      // Aplicar paginación
      const page = parseInt(filters.page) || 1
      const limit = parseInt(filters.limit) || 10
      const from = (page - 1) * limit
      const to = from + limit - 1

      query = query.range(from, to).order('created_at', { ascending: false })

      const { data: invoices, error, count } = await query

      if (error) {
        console.warn('⚠️ Error al obtener facturas desde Supabase, usando fallback:', error.message)
        return await this.getInvoicesFallback(filters)
      }

      // Transformar datos para compatibilidad
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
        items: invoice.items,
        attachments: invoice.attachments,
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }))

      console.log('✅ Facturas obtenidas desde Supabase:', transformedInvoices.length)
      return {
        success: true,
        data: transformedInvoices,
        pagination: {
          page,
          limit,
          total: count || transformedInvoices.length,
          totalPages: Math.ceil((count || transformedInvoices.length) / limit)
        }
      }

    } catch (error) {
      console.error('❌ Error inesperado al obtener facturas:', error)
      return await this.getInvoicesFallback(filters)
    }
  }

  // Fallback a localStorage para obtener facturas
  async getInvoicesFallback(filters = {}) {
    try {
      console.log('🔄 Obteniendo facturas desde localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      let invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      // Si no hay facturas, forzar la inicialización
      if (invoices.length === 0) {
        console.log('⚠️ No hay facturas en localStorage, forzando inicialización...')
        this.initializeStorage()
        invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
        console.log('✅ Facturas inicializadas:', invoices.length)
      }
      
      let filteredInvoices = [...invoices]
      
      // Aplicar filtros
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredInvoices = filteredInvoices.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.client.companyName.toLowerCase().includes(searchLower) ||
          invoice.issuer.companyName.toLowerCase().includes(searchLower)
        )
      }
      
      if (filters.status) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === filters.status)
      }
      
      if (filters.dateFrom) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.issueDate >= filters.dateFrom)
      }
      
      if (filters.dateTo) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.issueDate <= filters.dateTo)
      }
      
      // Paginación
      const page = parseInt(filters.page) || 1
      const limit = parseInt(filters.limit) || 10
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex)
      
      return {
        success: true,
        data: paginatedInvoices,
        pagination: {
          page,
          limit,
          total: filteredInvoices.length,
          totalPages: Math.ceil(filteredInvoices.length / limit)
        }
      }
    } catch (error) {
      console.error('❌ Error en fallback de facturas:', error)
      throw error
    }
  }

  // Obtener factura por ID de la organización actual
  async getInvoiceById(id) {
    try {
      console.log('🔄 Obteniendo factura por ID desde Supabase...')

      // Intentar obtener desde Supabase
      const { data: invoice, error } = await queryWithTenant('invoices')
        .eq('id', id)
        .single()

      if (error) {
        console.warn('⚠️ Error al obtener factura desde Supabase, usando fallback:', error.message)
        return await this.getInvoiceByIdFallback(id)
      }

      if (!invoice) {
        throw new Error('Factura no encontrada')
      }

      // Transformar datos para compatibilidad
      const transformedInvoice = {
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
        items: invoice.items,
        attachments: invoice.attachments,
        notes: invoice.notes,
        createdBy: invoice.created_by,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at
      }

      console.log('✅ Factura obtenida desde Supabase:', transformedInvoice.invoiceNumber)
      return {
        success: true,
        data: transformedInvoice
      }

    } catch (error) {
      console.error('❌ Error inesperado al obtener factura:', error)
      return await this.getInvoiceByIdFallback(id)
    }
  }

  // Fallback a localStorage para obtener factura por ID
  async getInvoiceByIdFallback(id) {
    try {
      console.log('🔄 Obteniendo factura por ID desde localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      const invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const invoice = invoices.find(inv => inv.id === parseInt(id))
      
      if (!invoice) {
        throw new Error('Factura no encontrada')
      }
      
      return {
        success: true,
        data: invoice
      }
    } catch (error) {
      console.error('❌ Error en fallback de factura por ID:', error)
      throw error
    }
  }

  // Crear nueva factura en la organización actual
  async createInvoice(invoiceData) {
    try {
      console.log('🔄 Creando factura en Supabase...')

      // Transformar datos para Supabase
      const supabaseData = {
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
        notes: invoiceData.notes,
        created_by: invoiceData.createdBy || 'current_user'
      }

      // Intentar crear en Supabase
      const { data: newInvoice, error } = await insertWithTenant('invoices', supabaseData)

      if (error) {
        console.warn('⚠️ Error al crear factura en Supabase, usando fallback:', error.message)
        return await this.createInvoiceFallback(invoiceData)
      }

      // Transformar respuesta para compatibilidad
      const transformedInvoice = {
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
        items: newInvoice[0].items,
        attachments: newInvoice[0].attachments,
        notes: newInvoice[0].notes,
        createdBy: newInvoice[0].created_by,
        createdAt: newInvoice[0].created_at,
        updatedAt: newInvoice[0].updated_at
      }

      console.log('✅ Factura creada en Supabase:', transformedInvoice.invoiceNumber)
      return {
        success: true,
        message: 'Factura creada exitosamente',
        data: transformedInvoice
      }

    } catch (error) {
      console.error('❌ Error inesperado al crear factura:', error)
      return await this.createInvoiceFallback(invoiceData)
    }
  }

  // Fallback a localStorage para crear factura
  async createInvoiceFallback(invoiceData) {
    try {
      console.log('🔄 Creando factura en localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      const invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      const newInvoice = {
        id: invoices.length > 0 ? Math.max(...invoices.map(inv => inv.id)) + 1 : 1,
        ...invoiceData,
        createdBy: 'current_user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      invoices.push(newInvoice)
      localStorage.setItem(storageKey, JSON.stringify(invoices))
      
      return {
        success: true,
        message: 'Factura creada exitosamente',
        data: newInvoice
      }
    } catch (error) {
      console.error('❌ Error en fallback de crear factura:', error)
      throw error
    }
  }

  // Actualizar factura en la organización actual
  async updateInvoice(id, invoiceData) {
    try {
      console.log('🔄 Actualizando factura en Supabase...')

      // Transformar datos para Supabase
      const supabaseData = {
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

      // Intentar actualizar en Supabase
      const { data: updatedInvoice, error } = await updateWithTenant('invoices', id, supabaseData)

      if (error) {
        console.warn('⚠️ Error al actualizar factura en Supabase, usando fallback:', error.message)
        return await this.updateInvoiceFallback(id, invoiceData)
      }

      if (!updatedInvoice || updatedInvoice.length === 0) {
        throw new Error('Factura no encontrada')
      }

      // Transformar respuesta para compatibilidad
      const transformedInvoice = {
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
        items: updatedInvoice[0].items,
        attachments: updatedInvoice[0].attachments,
        notes: updatedInvoice[0].notes,
        createdBy: updatedInvoice[0].created_by,
        createdAt: updatedInvoice[0].created_at,
        updatedAt: updatedInvoice[0].updated_at
      }

      console.log('✅ Factura actualizada en Supabase:', transformedInvoice.invoiceNumber)
      return {
        success: true,
        message: 'Factura actualizada exitosamente',
        data: transformedInvoice
      }

    } catch (error) {
      console.error('❌ Error inesperado al actualizar factura:', error)
      return await this.updateInvoiceFallback(id, invoiceData)
    }
  }

  // Fallback a localStorage para actualizar factura
  async updateInvoiceFallback(id, invoiceData) {
    try {
      console.log('🔄 Actualizando factura en localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      const invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const invoiceIndex = invoices.findIndex(inv => inv.id === parseInt(id))
      
      if (invoiceIndex === -1) {
        throw new Error('Factura no encontrada')
      }
      
      const updatedInvoice = {
        ...invoices[invoiceIndex],
        ...invoiceData,
        id: invoices[invoiceIndex].id,
        updatedAt: new Date().toISOString()
      }
      
      invoices[invoiceIndex] = updatedInvoice
      localStorage.setItem(storageKey, JSON.stringify(invoices))
      
      return {
        success: true,
        message: 'Factura actualizada exitosamente',
        data: updatedInvoice
      }
    } catch (error) {
      console.error('❌ Error en fallback de actualizar factura:', error)
      throw error
    }
  }

  // Eliminar factura de la organización actual
  async deleteInvoice(id) {
    try {
      console.log('🔄 Eliminando factura en Supabase...')

      // Intentar eliminar en Supabase
      const { data: deletedInvoice, error } = await deleteWithTenant('invoices', id)

      if (error) {
        console.warn('⚠️ Error al eliminar factura en Supabase, usando fallback:', error.message)
        return await this.deleteInvoiceFallback(id)
      }

      if (!deletedInvoice || deletedInvoice.length === 0) {
        throw new Error('Factura no encontrada')
      }

      // Transformar respuesta para compatibilidad
      const transformedInvoice = {
        id: deletedInvoice[0].id,
        invoiceNumber: deletedInvoice[0].invoice_number,
        controlNumber: deletedInvoice[0].control_number,
        documentType: deletedInvoice[0].document_type,
        issueDate: deletedInvoice[0].issue_date,
        dueDate: deletedInvoice[0].due_date,
        status: deletedInvoice[0].status,
        issuer: deletedInvoice[0].issuer,
        client: deletedInvoice[0].client_info,
        financial: deletedInvoice[0].financial,
        items: deletedInvoice[0].items,
        attachments: deletedInvoice[0].attachments,
        notes: deletedInvoice[0].notes,
        createdBy: deletedInvoice[0].created_by,
        createdAt: deletedInvoice[0].created_at,
        updatedAt: deletedInvoice[0].updated_at
      }

      console.log('✅ Factura eliminada en Supabase:', transformedInvoice.invoiceNumber)
      return {
        success: true,
        message: 'Factura eliminada exitosamente',
        data: transformedInvoice
      }

    } catch (error) {
      console.error('❌ Error inesperado al eliminar factura:', error)
      return await this.deleteInvoiceFallback(id)
    }
  }

  // Fallback a localStorage para eliminar factura
  async deleteInvoiceFallback(id) {
    try {
      console.log('🔄 Eliminando factura en localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      const invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const invoiceIndex = invoices.findIndex(inv => inv.id === parseInt(id))
      
      if (invoiceIndex === -1) {
        throw new Error('Factura no encontrada')
      }
      
      const deletedInvoice = invoices.splice(invoiceIndex, 1)[0]
      localStorage.setItem(storageKey, JSON.stringify(invoices))
      
      return {
        success: true,
        message: 'Factura eliminada exitosamente',
        data: deletedInvoice
      }
    } catch (error) {
      console.error('❌ Error en fallback de eliminar factura:', error)
      throw error
    }
  }

  // Extraer datos de imagen/PDF (simulado)
  async extractDataFromFile(file) {
    try {
      console.log('🔄 Extrayendo datos de archivo (simulado)...');
      
      // Simular extracción de datos (MVP sin backend)
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockExtractedData = {
            success: true,
            message: 'Datos extraídos exitosamente',
            data: {
              issuer: {
                companyName: 'CORPORACIÓN FERRE 19, C.A.',
                rif: 'J-41258166-0',
                address: 'Calle Este I CC Empresarial Forum Nivel PB Local 08, Sector La Morita Turmero Aragua',
                phone: '0243-2694481',
                email: 'ventas@run.com.ve'
              },
              client: {
                companyName: 'ILUMECCA 19, C.A',
                rif: 'J-41259116-9',
                address: 'CALLE VENTUARI CC TIRADO NIVEL 1 LOCAL 8 SECTOR UNARE CIUDAD',
                phone: '0424-966.49.69',
                email: ''
              },
              invoice: {
                invoiceNumber: '7432',
                controlNumber: '00-0008966',
                documentType: 'FORMA LIBRE',
                issueDate: '2025-08-01',
                dueDate: '2025-08-31'
              },
              financial: {
                totalSales: 17710.16,
                nonTaxableSales: 0,
                taxableSales: 15267.38,
                taxDebit: 2442.78,
                ivaRetention: 0,
                islrRetention: 0,
                municipalRetention: 0,
                igtf: 0,
                currency: 'VES',
                exchangeRate: 1
              },
              items: [
                {
                  code: 'BFCOT',
                  description: 'BASE PARA FOTOCELDA/CABLE',
                  quantity: 6.00,
                  unitPrice: 583.20,
                  total: 3499.22
                },
                {
                  code: 'ENCH01',
                  description: 'ENCHUFE VINIL-METAL C-TIERRA',
                  quantity: 18.00,
                  unitPrice: 132.95,
                  total: 2393.01
                }
              ],
              confidence: 0.85
            }
          };
          resolve(mockExtractedData);
        }, 2000); // Simular tiempo de procesamiento
      });
    } catch (error) {
      console.error('Error al extraer datos del archivo:', error);
      throw error;
    }
  }

  // Subir archivo adjunto
  async uploadAttachment(invoiceId, file) {
    try {
      console.log('🔄 Subiendo archivo adjunto (simulado)...');
      
      // Simular subida de archivo (MVP sin backend)
      return new Promise((resolve) => {
        setTimeout(() => {
          const attachment = {
            id: Date.now(),
            filename: file.name,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'current_user'
          };
          
          resolve({
            success: true,
            message: 'Archivo subido exitosamente',
            data: attachment
          });
        }, 1000);
      });
    } catch (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }
  }

  // Obtener estadísticas de facturas de la organización actual
  async getInvoiceStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de facturas desde Supabase...')

      // Intentar usar función RPC de Supabase para estadísticas optimizadas
      const organizationId = getCurrentOrganizationId()
      if (organizationId) {
        try {
          const { data: stats, error } = await supabase
            .rpc('get_invoice_stats', { org_id: organizationId })

          if (!error && stats) {
            console.log('✅ Estadísticas obtenidas desde Supabase RPC')
            return {
              success: true,
              data: stats
            }
          }
        } catch (rpcError) {
          console.warn('⚠️ Error en RPC de estadísticas, calculando manualmente:', rpcError.message)
        }
      }

      // Fallback: calcular estadísticas manualmente desde Supabase
      const { data: invoices, error } = await queryWithTenant('invoices')

      if (error) {
        console.warn('⚠️ Error al obtener facturas para estadísticas, usando fallback:', error.message)
        return await this.getInvoiceStatsFallback()
      }

      const stats = this.calculateInvoiceStats(invoices)

      console.log('✅ Estadísticas calculadas desde Supabase:', stats.total)
      return {
        success: true,
        data: stats
      }

    } catch (error) {
      console.error('❌ Error inesperado al obtener estadísticas:', error)
      return await this.getInvoiceStatsFallback()
    }
  }

  // Calcular estadísticas de facturas
  calculateInvoiceStats(invoices) {
    const stats = {
      total: invoices.length,
      byStatus: {
        BORRADOR: 0,
        EMITIDA: 0,
        ENVIADA: 0,
        PAGADA: 0,
        VENCIDA: 0,
        ANULADA: 0
      },
      byMonth: {},
      totalAmount: 0,
      paidAmount: 0
    }

    invoices.forEach(invoice => {
      // Por estado
      if (stats.byStatus.hasOwnProperty(invoice.status)) {
        stats.byStatus[invoice.status] += 1
      }
      
      // Por mes
      const month = invoice.issue_date.substring(0, 7) // YYYY-MM
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1
      
      // Monto total (todas las facturas)
      const totalSales = invoice.financial?.totalSales || 0
      stats.totalAmount += totalSales
      
      // Monto pagado (solo facturas pagadas)
      if (invoice.status === 'PAGADA') {
        stats.paidAmount += totalSales
      }
    })

    return stats
  }

  // Fallback a localStorage para estadísticas
  async getInvoiceStatsFallback() {
    try {
      console.log('🔄 Obteniendo estadísticas desde localStorage (fallback)...')
      
      const organizationId = getCurrentOrganizationId()
      const storageKey = organizationId ? `${this.storageKey}_${organizationId}` : this.storageKey
      let invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      // Si no hay facturas, forzar la inicialización
      if (invoices.length === 0) {
        console.log('⚠️ No hay facturas para estadísticas, forzando inicialización...')
        this.initializeStorage()
        invoices = JSON.parse(localStorage.getItem(storageKey) || '[]')
        console.log('✅ Facturas inicializadas para estadísticas:', invoices.length)
      }
      
      const stats = {
        total: invoices.length,
        byStatus: {
          BORRADOR: 0,
          EMITIDA: 0,
          ENVIADA: 0,
          PAGADA: 0,
          VENCIDA: 0,
          ANULADA: 0
        },
        byMonth: {},
        totalAmount: 0,
        paidAmount: 0
      }
      
      invoices.forEach(invoice => {
        // Por estado
        if (stats.byStatus.hasOwnProperty(invoice.status)) {
          stats.byStatus[invoice.status] += 1
        }
        
        // Por mes
        const month = invoice.issueDate.substring(0, 7) // YYYY-MM
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1
        
        // Monto total (todas las facturas)
        stats.totalAmount += invoice.financial.totalSales || 0
        
        // Monto pagado (solo facturas pagadas)
        if (invoice.status === 'PAGADA') {
          stats.paidAmount += invoice.financial.totalSales || 0
        }
      })
      
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

export const invoiceService = new InvoiceService();
