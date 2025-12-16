// Servicio para exportación de datos a Excel y CSV
import * as XLSX from 'xlsx';

class ExportService {
  constructor() {
    this.dateFormat = 'DD/MM/YYYY';
  }

  // Formatear fecha para exportación
  formatDateForExport(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Formatear moneda para exportación (solo número, sin símbolo)
  formatCurrencyForExport(amount, currency = 'VES') {
    if (!amount && amount !== 0) return 0;
    return Number(amount).toFixed(2);
  }

  // Obtener período del mes actual
  getPeriod() {
    const now = new Date();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${months[now.getMonth()]}-${now.getFullYear().toString().slice(-2)}`;
  }

  // Exportar Libro de Compras (formato SENIAT)
  exportLibroCompras(invoices, userRif = '') {
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Encabezado
    XLSX.utils.sheet_add_aoa(ws, [
      ['Libro de Compras'],
      [`Según Artículo 75, del Reglamento de la Ley del IVA (G.O 5.363 de 12 de Julio de 1999)`],
      [`RAZÓN SOCIAL O NOMBRE DE MATERIAL ELÉCTRICO Y HERRAMIENTAS RML`],
      [''],
      [`Período`, this.getPeriod(), '', '', '', '', '', '', '', '', '', '', '', 'R.I.F.', userRif],
      ['PERIODO ACTUAL'],
      ['']
    ], { origin: 'A1' });

    // Headers de columnas
    const headers = [
      'Fecha',
      'Tipo',
      'Número Documento',
      'Nombre / Apellido o Razón Social',
      'RIF',
      'Total Compras más IVA',
      'Monto Exento o Exonerado',
      'Base Imponible',
      '(%)',
      'Crédito Fiscal',
      '(%)',
      'Crédito Fiscal'
    ];

    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A8' });

    // Datos de facturas
    let currentRow = 9;
    let totals = {
      totalCompras: 0,
      montoExento: 0,
      baseImponible: 0,
      creditoFiscal: 0
    };

    invoices.forEach(inv => {
      const totalCompras = inv.financial?.totalSales || 0;
      const montoExento = inv.financial?.nonTaxableSales || 0;
      const baseImponible = inv.financial?.taxableSales || 0;
      const creditoFiscal = inv.financial?.taxDebit || 0;
      const alicuota = baseImponible > 0 ? ((creditoFiscal / baseImponible) * 100).toFixed(0) : 0;

      const row = [
        this.formatDateForExport(inv.issueDate),
        inv.documentType || 'FAC',
        inv.invoiceNumber || '',
        inv.issuer?.companyName || '',
        inv.issuer?.rif || '',
        Number(totalCompras).toFixed(2),
        Number(montoExento).toFixed(2),
        Number(baseImponible).toFixed(2),
        alicuota,
        Number(creditoFiscal).toFixed(2),
        '', // % retención
        '' // Crédito fiscal retenido
      ];

      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRow}` });

      totals.totalCompras += totalCompras;
      totals.montoExento += montoExento;
      totals.baseImponible += baseImponible;
      totals.creditoFiscal += creditoFiscal;

      currentRow++;
    });

    // Fila de totales
    XLSX.utils.sheet_add_aoa(ws, [
      [
        'Total',
        '',
        '',
        '',
        '',
        Number(totals.totalCompras).toFixed(2),
        Number(totals.montoExento).toFixed(2),
        Number(totals.baseImponible).toFixed(2),
        '',
        Number(totals.creditoFiscal).toFixed(2),
        '',
        ''
      ]
    ], { origin: `A${currentRow}` });

    currentRow += 2;

    // Sección de resumen
    XLSX.utils.sheet_add_aoa(ws, [
      ['', 'Totales', '', 'Base Imponible', '', 'Crédito Fiscal', '', 'Retención de IVA'],
      ['Compras no gravadas y/o sin derecho a crédito fiscal', '', '', '0.00', '', '', '', ''],
      ['Compras importación gravadas solo alícuota general', '', '', '', '', '', '', ''],
      ['Importaciones gravadas por alícuota general más alícuota adicional', '', '', '', '', '', '', ''],
      ['Importaciones gravadas por alícuota reducida', '', '', '', '', '', '', ''],
      ['Compras internas gravadas por alícuota general', '', '', '-', '', '-', '', ''],
      ['Compras internas gravadas por alícuota general más alícuota adicional', '', '', '', '', '', '', ''],
      ['Compras internas gravadas por alícuota reducida', '', '', '', '', '', '', ''],
      ['Total compras y créditos fiscales del período', '', '', '-', '', '-', '', '']
    ], { origin: `A${currentRow}` });

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 6 },  // Tipo
      { wch: 15 }, // Número
      { wch: 35 }, // Nombre
      { wch: 12 }, // RIF
      { wch: 18 }, // Total Compras
      { wch: 18 }, // Monto Exento
      { wch: 15 }, // Base Imponible
      { wch: 6 },  // %
      { wch: 15 }, // Crédito Fiscal
      { wch: 6 },  // %
      { wch: 15 }  // Crédito Fiscal
    ];

    return ws;
  }

  // Exportar Libro de Ventas (formato SENIAT)
  exportLibroVentas(invoices, userRif = '') {
    const ws = XLSX.utils.aoa_to_sheet([]);

    // Encabezado
    XLSX.utils.sheet_add_aoa(ws, [
      ['Libro de Ventas'],
      [`Según Artículo 75, del Reglamento de la Ley del IVA (G.O 5.363 de 12 de Julio de 1999)`],
      [`RAZÓN SOCIAL O NOMBRE DE MATERIAL ELÉCTRICO Y HERRAMIENTAS RML`],
      [''],
      [`Período`, this.getPeriod(), '', '', '', '', '', '', '', '', '', '', '', 'R.I.F.', userRif],
      ['PERIODO ACTUAL'],
      ['']
    ], { origin: 'A1' });

    // Headers de columnas
    const headers = [
      'Fecha',
      'Tipo',
      'Número Documento',
      'Nombre / Apellido o Razón Social',
      'RIF',
      'Total Ventas más IVA',
      'Ventas Exentas o Exoneradas',
      'Base Imponible',
      '(%)',
      'Débito Fiscal',
      'IVA Retenido',
      'N° Comprobante'
    ];

    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A8' });

    // Datos de facturas
    let currentRow = 9;
    let totals = {
      totalVentas: 0,
      ventasExentas: 0,
      baseImponible: 0,
      debitoFiscal: 0,
      ivaRetenido: 0
    };

    invoices.forEach(inv => {
      const totalVentas = inv.financial?.totalSales || 0;
      const ventasExentas = inv.financial?.nonTaxableSales || 0;
      const baseImponible = inv.financial?.taxableSales || 0;
      const debitoFiscal = inv.financial?.taxDebit || 0;
      const ivaRetenido = inv.financial?.ivaRetention || 0;
      const alicuota = baseImponible > 0 ? ((debitoFiscal / baseImponible) * 100).toFixed(0) : 0;

      const row = [
        this.formatDateForExport(inv.issueDate),
        inv.documentType || 'FAC',
        inv.invoiceNumber || '',
        inv.client?.companyName || '',
        inv.client?.rif || '',
        Number(totalVentas).toFixed(2),
        Number(ventasExentas).toFixed(2),
        Number(baseImponible).toFixed(2),
        alicuota,
        Number(debitoFiscal).toFixed(2),
        Number(ivaRetenido).toFixed(2),
        inv.controlNumber || ''
      ];

      XLSX.utils.sheet_add_aoa(ws, [row], { origin: `A${currentRow}` });

      totals.totalVentas += totalVentas;
      totals.ventasExentas += ventasExentas;
      totals.baseImponible += baseImponible;
      totals.debitoFiscal += debitoFiscal;
      totals.ivaRetenido += ivaRetenido;

      currentRow++;
    });

    // Fila de totales
    XLSX.utils.sheet_add_aoa(ws, [
      [
        'Total',
        '',
        '',
        '',
        '',
        Number(totals.totalVentas).toFixed(2),
        Number(totals.ventasExentas).toFixed(2),
        Number(totals.baseImponible).toFixed(2),
        '',
        Number(totals.debitoFiscal).toFixed(2),
        Number(totals.ivaRetenido).toFixed(2),
        ''
      ]
    ], { origin: `A${currentRow}` });

    currentRow += 2;

    // Sección de resumen
    XLSX.utils.sheet_add_aoa(ws, [
      ['', 'Totales', '', 'Base Imponible', '', 'Débito Fiscal', '', 'IVA Retenido'],
      ['Ventas internas no gravadas', '', '', '0.00', '', '', '', ''],
      ['Ventas de exportación', '', '', '', '', '', '', ''],
      ['Ventas internas gravadas por alícuota general', '', '', Number(totals.baseImponible).toFixed(2), '', Number(totals.debitoFiscal).toFixed(2), '', Number(totals.ivaRetenido).toFixed(2)],
      ['Ventas internas gravadas por alícuota general más alícuota adicional', '', '', '', '', '', '', ''],
      ['Ventas internas gravadas por alícuota reducida', '', '', '', '', '', '', ''],
      ['Total ventas y débitos fiscales del período', '', '', Number(totals.baseImponible).toFixed(2), '', Number(totals.debitoFiscal).toFixed(2), '', Number(totals.ivaRetenido).toFixed(2)]
    ], { origin: `A${currentRow}` });

    // Ajustar anchos de columna
    ws['!cols'] = [
      { wch: 12 }, // Fecha
      { wch: 6 },  // Tipo
      { wch: 15 }, // Número
      { wch: 35 }, // Nombre
      { wch: 12 }, // RIF
      { wch: 18 }, // Total Ventas
      { wch: 18 }, // Ventas Exentas
      { wch: 15 }, // Base Imponible
      { wch: 6 },  // %
      { wch: 15 }, // Débito Fiscal
      { wch: 15 }, // IVA Retenido
      { wch: 15 }  // N° Comprobante
    ];

    return ws;
  }

  // Exportar tabla completa a Excel (detecta automáticamente el tipo)
  exportTableToExcel(invoices, currencyDisplay, filename) {
    if (!invoices || invoices.length === 0) {
      console.warn('No hay facturas para exportar');
      return;
    }

    // Detectar si son ventas o compras/gastos
    const firstInvoice = invoices[0];
    const isVentas = firstInvoice.flow === 'VENTA';

    let ws;
    if (isVentas) {
      ws = this.exportLibroVentas(invoices, firstInvoice.issuer?.rif || '');
    } else {
      ws = this.exportLibroCompras(invoices, firstInvoice.client?.rif || '');
    }

    const wb = XLSX.utils.book_new();
    const sheetName = isVentas ? 'Libro de Ventas' : 'Libro de Compras';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, filename, { compression: true });
  }

  // Generar array de datos para una factura individual
  getInvoiceDataArray(invoice) {
    const data = [
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
      data.push(['Descripción', 'Cantidad', 'Precio Unitario', 'Total']);
      invoice.items.forEach((item) => {
        data.push([
          item.description || '',
          item.quantity || 0,
          this.formatCurrencyForExport(item.unitPrice),
          this.formatCurrencyForExport(item.total)
        ]);
      });
    } else {
      data.push(['Sin items detallados']);
    }

    // Agregar notas si existen
    if (invoice.notes) {
      data.push(['']);
      data.push(['NOTAS']);
      data.push([invoice.notes]);
    }

    // Agregar metadatos
    data.push(['']);
    data.push(['METADATOS']);
    data.push(['Creado por', invoice.createdBy || '']);
    data.push(['Fecha de Creación', this.formatDateForExport(invoice.createdAt)]);
    data.push(['Última Actualización', this.formatDateForExport(invoice.updatedAt)]);

    return data;
  }

  // Exportar factura individual a CSV
  exportInvoiceToCSV(invoice) {
    const data = this.getInvoiceDataArray(invoice);
    return this.convertToCSV(data);
  }

  // Exportar factura individual a Excel (XLSX)
  exportInvoiceToExcel(invoice, filename) {
    const data = this.getInvoiceDataArray(invoice);
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar anchos de columna básicos
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Factura");

    XLSX.writeFile(wb, filename, { compression: true });
  }

  // Convertir datos a formato CSV
  convertToCSV(data) {
    return data.map(row =>
      row.map(cell => {
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

  // Método principal para exportar factura
  exportInvoice(invoice, format = 'xlsx') {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `factura_${invoice.invoiceNumber || 'sin_numero'}_${timestamp}`;

      if (format === 'csv') {
        const filename = `${baseFilename}.csv`;
        const csvContent = this.exportInvoiceToCSV(invoice);
        this.downloadCSV(csvContent, filename);
        return { success: true, message: `Factura exportada como ${filename}`, filename };
      } else if (format === 'xlsx') {
        const filename = `${baseFilename}.xlsx`;
        this.exportInvoiceToExcel(invoice, filename);
        return { success: true, message: `Factura exportada como ${filename}`, filename };
      }

      return { success: false, message: 'Formato no soportado' };
    } catch (error) {
      console.error('Error al exportar factura:', error);
      return { success: false, message: 'Error al exportar la factura' };
    }
  }

  // Método principal para exportar tabla
  exportTable(invoices, currencyDisplay = 'VES', format = 'xlsx') {
    try {
      const timestamp = new Date().toISOString().split('T')[0];

      // Detectar tipo de libro
      const isVentas = invoices.length > 0 && invoices[0].flow === 'VENTA';
      const bookType = isVentas ? 'ventas' : 'compras';
      const baseFilename = `libro_${bookType}_${timestamp}`;

      if (format === 'xlsx') {
        const filename = `${baseFilename}.xlsx`;
        this.exportTableToExcel(invoices, currencyDisplay, filename);
        return { success: true, message: `Libro de ${bookType} exportado como ${filename}`, filename, recordCount: invoices.length };
      }

      return { success: false, message: 'Formato no soportado' };
    } catch (error) {
      console.error('Error al exportar tabla:', error);
      return { success: false, message: 'Error al exportar la tabla' };
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

const exportService = new ExportService();
export default exportService;
