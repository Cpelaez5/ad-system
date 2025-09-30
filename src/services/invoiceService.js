// Servicio para manejo de facturas con localStorage (MVP sin base de datos)
import api from './api.js';

class InvoiceService {
  constructor() {
    this.storageKey = 'sistema_contabilidad_invoices';
    this.initializeStorage();
  }

  // Inicializar datos de ejemplo en localStorage
  initializeStorage() {
    const existingData = localStorage.getItem(this.storageKey);
    if (!existingData) {
      const sampleInvoices = [
        {
          id: 1,
          invoiceNumber: 'F-00126',
          controlNumber: '00-0008966',
          documentType: 'FACTURA',
          issueDate: '2023-12-04',
          dueDate: '2023-12-04',
          status: 'ANULADA',
          
          issuer: {
            companyName: 'LA CASA DEL ACEITE RB C.A.',
            rif: 'J404710183',
            taxpayerType: 'Ordinario',
            address: 'Dirección del emisor',
            phone: '000-000-0000',
            email: 'info@empresa.com'
          },
          
          client: {
            companyName: 'ANULADA',
            rif: '',
            address: '',
            phone: '',
            email: ''
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
          createdAt: '2023-12-04T10:00:00Z',
          updatedAt: '2023-12-04T10:00:00Z',
          notes: 'Factura anulada'
        },
        {
          id: 2,
          invoiceNumber: 'F-00127',
          controlNumber: '00-0008967',
          documentType: 'FACTURA',
          issueDate: '2023-12-04',
          dueDate: '2023-12-04',
          status: 'EMITIDA',
          
          issuer: {
            companyName: 'LA CASA DEL ACEITE RB C.A.',
            rif: 'J404710183',
            taxpayerType: 'Ordinario',
            address: 'Dirección del emisor',
            phone: '000-000-0000',
            email: 'info@empresa.com'
          },
          
          client: {
            companyName: 'SERVICIOS OJEDA ,C.A.',
            rif: 'J-07016766-1',
            address: 'Dirección del cliente',
            phone: '000-000-0000',
            email: 'cliente@empresa.com'
          },
          
          financial: {
            totalSales: 17540.94,
            nonTaxableSales: 0,
            taxableSales: 15121.50,
            taxDebit: 2419.44,
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
          createdAt: '2023-12-04T10:00:00Z',
          updatedAt: '2023-12-04T10:00:00Z',
          notes: 'Factura de servicios'
        },
        {
          id: 3,
          invoiceNumber: 'F-00128',
          controlNumber: '00-0008968',
          documentType: 'FACTURA',
          issueDate: '2023-12-26',
          dueDate: '2023-12-26',
          status: 'EMITIDA',
          
          issuer: {
            companyName: 'LA CASA DEL ACEITE RB C.A.',
            rif: 'J404710183',
            taxpayerType: 'Ordinario',
            address: 'Dirección del emisor',
            phone: '000-000-0000',
            email: 'info@empresa.com'
          },
          
          client: {
            companyName: 'ALVARO SALAZAR',
            rif: 'V-14.904.858',
            address: 'Dirección del cliente',
            phone: '000-000-0000',
            email: 'cliente@empresa.com'
          },
          
          financial: {
            totalSales: 4476.32,
            nonTaxableSales: 0,
            taxableSales: 3858.90,
            taxDebit: 617.42,
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
          createdAt: '2023-12-26T10:00:00Z',
          updatedAt: '2023-12-26T10:00:00Z',
          notes: 'Factura individual'
        }
      ];
      
      localStorage.setItem(this.storageKey, JSON.stringify(sampleInvoices));
    }
  }

  // Obtener todas las facturas
  async getInvoices(filters = {}) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const response = await api.get('/invoices', { params: filters });
        return response.data;
      }
      
      // Fallback a localStorage
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      let filteredInvoices = [...invoices];
      
      // Aplicar filtros
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredInvoices = filteredInvoices.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.client.companyName.toLowerCase().includes(searchLower) ||
          invoice.issuer.companyName.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.status) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.status === filters.status);
      }
      
      if (filters.dateFrom) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.issueDate >= filters.dateFrom);
      }
      
      if (filters.dateTo) {
        filteredInvoices = filteredInvoices.filter(invoice => invoice.issueDate <= filters.dateTo);
      }
      
      // Paginación
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
      
      return {
        success: true,
        data: paginatedInvoices,
        pagination: {
          page,
          limit,
          total: filteredInvoices.length,
          totalPages: Math.ceil(filteredInvoices.length / limit)
        }
      };
    } catch (error) {
      console.error('Error al obtener facturas:', error);
      throw error;
    }
  }

  // Obtener factura por ID
  async getInvoiceById(id) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const response = await api.get(`/invoices/${id}`);
        return response.data;
      }
      
      // Fallback a localStorage
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const invoice = invoices.find(inv => inv.id === parseInt(id));
      
      if (!invoice) {
        throw new Error('Factura no encontrada');
      }
      
      return {
        success: true,
        data: invoice
      };
    } catch (error) {
      console.error('Error al obtener factura:', error);
      throw error;
    }
  }

  // Crear nueva factura
  async createInvoice(invoiceData) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const response = await api.post('/invoices', invoiceData);
        return response.data;
      }
      
      // Fallback a localStorage
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      const newInvoice = {
        id: invoices.length > 0 ? Math.max(...invoices.map(inv => inv.id)) + 1 : 1,
        ...invoiceData,
        createdBy: 'current_user', // En un sistema real esto vendría del contexto de autenticación
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      invoices.push(newInvoice);
      localStorage.setItem(this.storageKey, JSON.stringify(invoices));
      
      return {
        success: true,
        message: 'Factura creada exitosamente',
        data: newInvoice
      };
    } catch (error) {
      console.error('Error al crear factura:', error);
      throw error;
    }
  }

  // Actualizar factura
  async updateInvoice(id, invoiceData) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const response = await api.put(`/invoices/${id}`, invoiceData);
        return response.data;
      }
      
      // Fallback a localStorage
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const invoiceIndex = invoices.findIndex(inv => inv.id === parseInt(id));
      
      if (invoiceIndex === -1) {
        throw new Error('Factura no encontrada');
      }
      
      const updatedInvoice = {
        ...invoices[invoiceIndex],
        ...invoiceData,
        id: invoices[invoiceIndex].id, // Mantener el ID original
        updatedAt: new Date().toISOString()
      };
      
      invoices[invoiceIndex] = updatedInvoice;
      localStorage.setItem(this.storageKey, JSON.stringify(invoices));
      
      return {
        success: true,
        message: 'Factura actualizada exitosamente',
        data: updatedInvoice
      };
    } catch (error) {
      console.error('Error al actualizar factura:', error);
      throw error;
    }
  }

  // Eliminar factura
  async deleteInvoice(id) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const response = await api.delete(`/invoices/${id}`);
        return response.data;
      }
      
      // Fallback a localStorage
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const invoiceIndex = invoices.findIndex(inv => inv.id === parseInt(id));
      
      if (invoiceIndex === -1) {
        throw new Error('Factura no encontrada');
      }
      
      const deletedInvoice = invoices.splice(invoiceIndex, 1)[0];
      localStorage.setItem(this.storageKey, JSON.stringify(invoices));
      
      return {
        success: true,
        message: 'Factura eliminada exitosamente',
        data: deletedInvoice
      };
    } catch (error) {
      console.error('Error al eliminar factura:', error);
      throw error;
    }
  }

  // Extraer datos de imagen/PDF (simulado)
  async extractDataFromFile(file) {
    try {
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post('/invoices/extract-data', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        return response.data;
      }
      
      // Fallback: simular extracción de datos
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
      // Si hay API disponible, usar el backend
      if (api.defaults.baseURL) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post(`/invoices/${invoiceId}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        return response.data;
      }
      
      // Fallback: simular subida de archivo
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

  // Obtener estadísticas de facturas
  async getInvoiceStats() {
    try {
      const invoices = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      
      const stats = {
        total: invoices.length,
        byStatus: {},
        byMonth: {},
        totalAmount: 0
      };
      
      invoices.forEach(invoice => {
        // Por estado
        stats.byStatus[invoice.status] = (stats.byStatus[invoice.status] || 0) + 1;
        
        // Por mes
        const month = invoice.issueDate.substring(0, 7); // YYYY-MM
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
        
        // Monto total
        stats.totalAmount += invoice.financial.totalSales || 0;
      });
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

export const invoiceService = new InvoiceService();
