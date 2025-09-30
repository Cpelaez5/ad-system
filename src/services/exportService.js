// Servicio para exportación de datos a Excel y CSV

class ExportService {
  constructor() {
    this.dateFormat = 'DD/MM/YYYY';
  }

  // Formatear fecha para exportación
  formatDateForExport(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES');
  }

  // Formatear moneda para exportación
  formatCurrencyForExport(amount, currency = 'VES') {
    if (!amount) return '0,00';
    
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    }
    
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Exportar factura individual a CSV
  exportInvoiceToCSV(invoice) {
    const csvData = [
      ['DETALLE DE FACTURA'],
      [''],
      ['INFORMACIÓN GENERAL'],
      ['Número de Factura', invoice.invoiceNumber || ''],
      ['Número de Control', invoice.controlNumber || ''],
      ['Tipo de Documento', invoice.documentType || ''],
      ['Fecha de Emisión', this.formatDateForExport(invoice.issueDate)],
      ['Fecha de Vencimiento', this.formatDateForExport(invoice.dueDate)],
      ['Estado', invoice.status || ''],
      [''],
      ['DATOS DEL EMISOR'],
      ['Nombre/Razón Social', invoice.issuer?.companyName || ''],
      ['RIF', invoice.issuer?.rif || ''],
      ['Tipo de Contribuyente', invoice.issuer?.taxpayerType || ''],
      ['Teléfono', invoice.issuer?.phone || ''],
      ['Email', invoice.issuer?.email || ''],
      ['Dirección', invoice.issuer?.address || ''],
      [''],
      ['DATOS DEL CLIENTE'],
      ['Nombre/Razón Social', invoice.client?.companyName || ''],
      ['RIF', invoice.client?.rif || ''],
      ['Tipo de Contribuyente', invoice.client?.taxpayerType || ''],
      ['Teléfono', invoice.client?.phone || ''],
      ['Email', invoice.client?.email || ''],
      ['Dirección', invoice.client?.address || ''],
      [''],
      ['DETALLES FINANCIEROS'],
      ['Ventas Totales', this.formatCurrencyForExport(invoice.financial?.totalSales)],
      ['Ventas No Gravadas', this.formatCurrencyForExport(invoice.financial?.nonTaxableSales)],
      ['Ventas Gravadas', this.formatCurrencyForExport(invoice.financial?.taxableSales)],
      ['Débito Fiscal', this.formatCurrencyForExport(invoice.financial?.taxDebit)],
      ['Retención IVA', this.formatCurrencyForExport(invoice.financial?.ivaRetention)],
      ['Retención ISLR', this.formatCurrencyForExport(invoice.financial?.islrRetention)],
      ['Retención Municipal', this.formatCurrencyForExport(invoice.financial?.municipalRetention)],
      ['IGTF', this.formatCurrencyForExport(invoice.financial?.igtf)],
      ['Moneda', invoice.financial?.currency || 'VES'],
      ['Tasa de Cambio', invoice.financial?.exchangeRate || '1'],
      [''],
      ['ITEMS DE LA FACTURA']
    ];

    // Agregar items si existen
    if (invoice.items && invoice.items.length > 0) {
      csvData.push(['Descripción', 'Cantidad', 'Precio Unitario', 'Total']);
      invoice.items.forEach((item, index) => {
        csvData.push([
          item.description || '',
          item.quantity || 0,
          this.formatCurrencyForExport(item.unitPrice),
          this.formatCurrencyForExport(item.total)
        ]);
      });
    } else {
      csvData.push(['Sin items detallados']);
    }

    // Agregar notas si existen
    if (invoice.notes) {
      csvData.push(['']);
      csvData.push(['NOTAS']);
      csvData.push([invoice.notes]);
    }

    // Agregar metadatos
    csvData.push(['']);
    csvData.push(['METADATOS']);
    csvData.push(['Creado por', invoice.createdBy || '']);
    csvData.push(['Fecha de Creación', this.formatDateForExport(invoice.createdAt)]);
    csvData.push(['Última Actualización', this.formatDateForExport(invoice.updatedAt)]);

    return this.convertToCSV(csvData);
  }

  // Exportar tabla completa a CSV
  exportTableToCSV(invoices, currencyDisplay = 'VES') {
    const headers = [
      'Número de Factura',
      'Número de Control',
      'Tipo de Documento',
      'Fecha de Emisión',
      'Fecha de Vencimiento',
      'Estado',
      'Emisor - Nombre',
      'Emisor - RIF',
      'Cliente - Nombre',
      'Cliente - RIF',
      'Ventas Totales',
      'Ventas No Gravadas',
      'Ventas Gravadas',
      'Débito Fiscal',
      'Retención IVA',
      'Retención ISLR',
      'Retención Municipal',
      'IGTF',
      'Moneda',
      'Tasa de Cambio',
      'Cantidad de Items',
      'Notas',
      'Creado por',
      'Fecha de Creación',
      'Última Actualización'
    ];

    const csvData = [headers];

    invoices.forEach(invoice => {
      const row = [
        invoice.invoiceNumber || '',
        invoice.controlNumber || '',
        invoice.documentType || '',
        this.formatDateForExport(invoice.issueDate),
        this.formatDateForExport(invoice.dueDate),
        invoice.status || '',
        invoice.issuer?.companyName || '',
        invoice.issuer?.rif || '',
        invoice.client?.companyName || '',
        invoice.client?.rif || '',
        this.formatCurrencyForExport(invoice.financial?.totalSales, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.nonTaxableSales, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.taxableSales, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.taxDebit, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.ivaRetention, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.islrRetention, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.municipalRetention, currencyDisplay),
        this.formatCurrencyForExport(invoice.financial?.igtf, currencyDisplay),
        invoice.financial?.currency || 'VES',
        invoice.financial?.exchangeRate || '1',
        invoice.items ? invoice.items.length : 0,
        invoice.notes || '',
        invoice.createdBy || '',
        this.formatDateForExport(invoice.createdAt),
        this.formatDateForExport(invoice.updatedAt)
      ];
      csvData.push(row);
    });

    return this.convertToCSV(csvData);
  }

  // Convertir datos a formato CSV
  convertToCSV(data) {
    return data.map(row => 
      row.map(cell => {
        // Escapar comillas y envolver en comillas si contiene comas, saltos de línea o comillas
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');
  }

  // Descargar archivo CSV
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // Exportar factura individual
  exportInvoice(invoice, format = 'csv') {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `factura_${invoice.invoiceNumber || 'sin_numero'}_${timestamp}.csv`;
      
      if (format === 'csv') {
        const csvContent = this.exportInvoiceToCSV(invoice);
        this.downloadCSV(csvContent, filename);
        return {
          success: true,
          message: `Factura exportada como ${filename}`,
          filename
        };
      }
      
      return {
        success: false,
        message: 'Formato no soportado'
      };
    } catch (error) {
      console.error('Error al exportar factura:', error);
      return {
        success: false,
        message: 'Error al exportar la factura'
      };
    }
  }

  // Exportar tabla completa
  exportTable(invoices, currencyDisplay = 'VES', format = 'csv') {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `facturas_completas_${currencyDisplay}_${timestamp}.csv`;
      
      if (format === 'csv') {
        const csvContent = this.exportTableToCSV(invoices, currencyDisplay);
        this.downloadCSV(csvContent, filename);
        return {
          success: true,
          message: `Tabla exportada como ${filename}`,
          filename,
          recordCount: invoices.length
        };
      }
      
      return {
        success: false,
        message: 'Formato no soportado'
      };
    } catch (error) {
      console.error('Error al exportar tabla:', error);
      return {
        success: false,
        message: 'Error al exportar la tabla'
      };
    }
  }

  // Generar resumen de exportación
  generateExportSummary(invoices, currencyDisplay = 'VES') {
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.financial?.totalSales || 0), 0);
    const byStatus = invoices.reduce((acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalInvoices,
      totalAmount: this.formatCurrencyForExport(totalAmount, currencyDisplay),
      byStatus,
      currency: currencyDisplay,
      exportDate: new Date().toLocaleString('es-ES')
    };
  }
}

export const exportService = new ExportService();
