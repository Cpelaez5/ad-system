import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

class ExportService {
  constructor() {
    this.dateFormat = 'DD/MM/YYYY';
  }

  formatCurrency(amount) {
    if (amount === undefined || amount === null) return 0;
    return Number(amount);
  }

  formatDate(dateString) {
    if (!dateString) return '';
    return dayjs(dateString).format(this.dateFormat);
  }

  // Método principal para exportar tablas
  async exportTable(invoices, currencyDisplay = 'VES', filename, mode = 'SENIAT', userCompanyInfo = null) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Contable';
    workbook.created = new Date();

    let worksheet;

    if (mode === 'SENIAT') {
      const isVentas = invoices.length > 0 && invoices[0].flow === 'VENTA';
      const sheetName = isVentas ? 'Libro de Ventas' : 'Libro de Compras';

      worksheet = workbook.addWorksheet(sheetName, {
        pageSetup: { paperSize: 9, orientation: 'landscape' } // A4 Landscape
      });

      // Datos de la empresa
      // Si viene userCompanyInfo, usarlo. Si no, intentar inferir (fallback)
      const companyInfo = userCompanyInfo || {
        name: invoices[0]?.issuer?.companyName || 'EMPRESA DEMO C.A.',
        rif: invoices[0]?.issuer?.rif || 'J-00000000-0',
        period: dayjs().format('MMM YY').toLowerCase() // e.g., nov 25
      };

      if (isVentas) {
        this.buildLibroVentas(worksheet, invoices, companyInfo);
      } else {
        this.buildLibroCompras(worksheet, invoices, companyInfo);
      }
    } else {
      worksheet = workbook.addWorksheet('Reporte General');
      this.buildGeneralReport(worksheet, invoices);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }

  // Helper para bordes
  addBorders(cell) {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  // Construir Libro de Compras (Exact Layout)
  buildLibroCompras(worksheet, invoices, companyInfo) {
    const fiscalInvoices = invoices.filter(inv => inv.documentType === 'FACTURA');

    // 1. Configurar Columnas (Anchos aproximados según imagen)
    // A: Fecha, B: Tipo Doc, C: Num Doc, D: Nombre, E: RIF, F: Total+Imp, G: Exento, H: Base Imp (Imp), I: %, J: Credito (Imp), K: Base Imp (Int), L: %, M: Credito (Int)
    // Ajuste según imagen:
    // Col A: Fecha (10)
    // Col B: Tipo Doc (5)
    // Col C: Número (12)
    // Col D: Nombre (35)
    // Col E: RIF (12)
    // Col F: Total Compras (15)
    // Col G: Exento (12)
    // Col H: Base Imp (Importacion) (12)
    // Col I: % (5)
    // Col J: Credito Fiscal (Importacion) (12)
    // Col K: Base Imp (Interna) (12)
    // Col L: % (5)
    // Col M: Credito Fiscal (Interna) (12)

    worksheet.columns = [
      { key: 'fecha', width: 12 },
      { key: 'tipo', width: 6 },
      { key: 'numero', width: 15 },
      { key: 'nombre', width: 40 },
      { key: 'rif', width: 15 },
      { key: 'total', width: 18 },
      { key: 'exento', width: 15 },
      { key: 'base_imp', width: 15 },
      { key: 'alicuota_imp', width: 6 },
      { key: 'credito_imp', width: 15 },
      { key: 'base_int', width: 15 },
      { key: 'alicuota_int', width: 6 },
      { key: 'credito_int', width: 15 },
    ];

    // 2. Encabezado Superior (Filas 1-5)
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'Libro de Compras';
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = 'Según Artículo 75 del Reglamento de la Ley del IVA GO 5.363 del 12 de Julio de 1999';
    worksheet.getCell('A2').font = { size: 8 };

    worksheet.getCell('M2').value = 'Página No';
    worksheet.getCell('M2').alignment = { horizontal: 'right' };
    worksheet.getCell('N2').value = 1; // Pagina 1 estática por ahora

    worksheet.getCell('A3').value = 'Empresa';
    worksheet.mergeCells('B3:F3');
    worksheet.getCell('B3').value = companyInfo.name;
    worksheet.getCell('B3').font = { bold: true };

    worksheet.getCell('K3').value = 'R.I.F.';
    worksheet.getCell('K3').alignment = { horizontal: 'right' };
    worksheet.mergeCells('L3:M3');
    worksheet.getCell('L3').value = companyInfo.rif;
    worksheet.getCell('L3').border = { bottom: { style: 'thin' } };

    worksheet.getCell('A4').value = 'Periodo';
    worksheet.getCell('B4').value = companyInfo.period;

    worksheet.getCell('A5').value = 'PERIODO ACTUAL';
    worksheet.getCell('A5').font = { bold: true };

    // 3. Encabezados de Tabla (Filas 6-8)
    // Fila 6: Super headers
    worksheet.mergeCells('H6:J6');
    worksheet.getCell('H6').value = 'COMPRAS DE IMPORTACION';
    worksheet.getCell('H6').alignment = { horizontal: 'center' };
    worksheet.getCell('H6').font = { size: 8 };

    worksheet.mergeCells('K6:M6');
    worksheet.getCell('K6').value = 'COMPRAS INTERNAS';
    worksheet.getCell('K6').alignment = { horizontal: 'center' };
    worksheet.getCell('K6').font = { size: 8 };

    // Fila 7-8: Headers principales
    const headers = [
      { cell: 'A7', val: 'Fecha' }, { cell: 'A8', val: 'Documento' },
      { cell: 'B7', val: 'Tipo' }, { cell: 'B8', val: 'Doc.' },
      { cell: 'C7', val: 'Número' }, { cell: 'C8', val: 'Documento' },
      { cell: 'D7', val: 'Nombre y Apellido' }, { cell: 'D8', val: 'y/o Razón Social' },
      { cell: 'E7', val: '' }, { cell: 'E8', val: 'RIF' }, // RIF aligned bottom
      { cell: 'F7', val: 'Total Compras' }, { cell: 'F8', val: 'mas Impuesto' },
      { cell: 'G7', val: 'Monto Exento' }, { cell: 'G8', val: 'ó Exonerado' },
      // Importacion
      { cell: 'H8', val: 'Base Imponible' }, { cell: 'I8', val: '(%)' }, { cell: 'J8', val: 'Crédito Fiscal' },
      // Internas
      { cell: 'K8', val: 'Base Imponible' }, { cell: 'L8', val: '(%)' }, { cell: 'M8', val: 'Crédito Fiscal' },
    ];

    headers.forEach(h => {
      const cell = worksheet.getCell(h.cell);
      cell.value = h.val;
      cell.font = { bold: false, size: 9 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'bottom', wrapText: true };
    });

    // 4. Datos (Fila 9+)
    let currentRow = 9;
    fiscalInvoices.forEach(inv => {
      const row = worksheet.getRow(currentRow);
      row.values = {
        fecha: this.formatDate(inv.issueDate),
        tipo: 'FAC', // Hardcoded for now based on filter
        numero: inv.invoiceNumber,
        nombre: inv.issuer?.companyName || 'Proveedor',
        rif: inv.issuer?.rif || 'N/A',
        total: this.formatCurrency(inv.financial?.totalSales),
        exento: this.formatCurrency(inv.financial?.exemptSales),
        base_imp: 0, // Logic needed for import
        alicuota_imp: '',
        credito_imp: 0,
        base_int: this.formatCurrency(inv.financial?.taxableSales),
        alicuota_int: '16%',
        credito_int: this.formatCurrency(inv.financial?.taxDebit)
      };

      // Apply borders to row
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
        this.addBorders(row.getCell(col));
      });

      currentRow++;
    });

    // 5. Totales de Tabla
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell('A').value = 'Total';
    totalRow.getCell('A').font = { bold: true };

    ['F', 'G', 'H', 'J', 'K', 'M'].forEach(col => {
      totalRow.getCell(col).value = { formula: `SUM(${col}9:${col}${currentRow - 1})` };
      totalRow.getCell(col).font = { bold: true };
      this.addBorders(totalRow.getCell(col));
    });

    currentRow += 2; // Espacio

    // 6. Tabla Resumen (Footer)
    // Estructura:
    // Col A-D: Descripciones
    // Col E: Base Imponible
    // Col F: Crédito Fiscal
    // Col G-H: Retención IVA (merged)

    const summaryStartRow = currentRow;
    const summaryHeaders = ['Totales', '', '', '', 'Base', 'Crédito', 'Retención de IVA'];
    const summaryRow = worksheet.getRow(summaryStartRow);

    // Merge A-D for "Totales" label
    worksheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);
    summaryRow.getCell('A').value = 'Totales';
    summaryRow.getCell('E').value = 'Base\nImponible';
    summaryRow.getCell('F').value = 'Crédito\nFiscal';
    worksheet.mergeCells(`G${summaryStartRow}:H${summaryStartRow}`);
    summaryRow.getCell('G').value = 'Retención de IVA';

    // Style Summary Header
    ['A', 'E', 'F', 'G'].forEach(col => {
      const cell = summaryRow.getCell(col);
      cell.font = { bold: true };
      cell.alignment = { wrapText: true, vertical: 'top' };
      this.addBorders(cell);
    });
    // Fix borders for merged cells
    this.addBorders(summaryRow.getCell('H'));

    const summaryItems = [
      'Compras no gravadas y/o sin derecho a crédito fiscal',
      'Importación gravada por alícuota general',
      'Importaciones gravadas por alícuota general más alícuota adicional',
      'Importaciones gravadas por alícuota reducida',
      'Compras internas gravadas por alícuota general',
      'Compras internas gravadas por alícuota general más alícuota adicional',
      'Compras internas gravadas por alícuota reducida',
      'Total compras y créditos fiscales del periodo'
    ];

    summaryItems.forEach((item, idx) => {
      const r = summaryStartRow + 1 + idx;
      const row = worksheet.getRow(r);
      worksheet.mergeCells(`A${r}:D${r}`);
      row.getCell('A').value = item;
      this.addBorders(row.getCell('A'));

      // Placeholders for formulas
      // Example logic:
      if (item.includes('Compras internas gravadas por alícuota general')) {
        row.getCell('E').value = { formula: `K${currentRow - 2}` }; // Total Base Int
        row.getCell('F').value = { formula: `M${currentRow - 2}` }; // Total Credito Int
      } else if (item.includes('Total compras')) {
        // Sum of above
        row.getCell('E').value = { formula: `SUM(E${summaryStartRow + 1}:E${r - 1})` };
        row.getCell('F').value = { formula: `SUM(F${summaryStartRow + 1}:F${r - 1})` };
      } else {
        row.getCell('E').value = 0;
        row.getCell('F').value = 0;
      }

      this.addBorders(row.getCell('E'));
      this.addBorders(row.getCell('F'));

      // Retencion merged G-H
      worksheet.mergeCells(`G${r}:H${r}`);
      this.addBorders(row.getCell('G'));
      this.addBorders(row.getCell('H'));
    });
  }

  // Construir Libro de Ventas (Adaptado del de Compras)
  buildLibroVentas(worksheet, invoices, companyInfo) {
    const fiscalInvoices = invoices.filter(inv => inv.documentType === 'FACTURA');

    worksheet.columns = [
      { key: 'fecha', width: 12 },
      { key: 'tipo', width: 6 },
      { key: 'numero', width: 15 },
      { key: 'nombre', width: 40 },
      { key: 'rif', width: 15 },
      { key: 'total', width: 18 },
      { key: 'exento', width: 15 },
      { key: 'base_imp', width: 15 }, // Exportaciones?
      { key: 'alicuota_imp', width: 6 },
      { key: 'debito_imp', width: 15 },
      { key: 'base_int', width: 15 },
      { key: 'alicuota_int', width: 6 },
      { key: 'debito_int', width: 15 },
    ];

    // Header (Similar to Compras)
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'Libro de Ventas';
    worksheet.getCell('A1').font = { bold: true, size: 14 };

    // ... (Company info same as Compras) ...
    worksheet.mergeCells('A2:F2');
    worksheet.getCell('A2').value = 'Según Artículo 75 del Reglamento de la Ley del IVA';
    worksheet.getCell('A3').value = 'Empresa';
    worksheet.mergeCells('B3:F3');
    worksheet.getCell('B3').value = companyInfo.name;
    worksheet.getCell('B3').font = { bold: true };
    worksheet.getCell('K3').value = 'R.I.F.';
    worksheet.mergeCells('L3:M3');
    worksheet.getCell('L3').value = companyInfo.rif;
    worksheet.getCell('A4').value = 'Periodo';
    worksheet.getCell('B4').value = companyInfo.period;

    // Headers
    worksheet.mergeCells('H6:J6');
    worksheet.getCell('H6').value = 'VENTAS DE EXPORTACION'; // O similar
    worksheet.getCell('H6').alignment = { horizontal: 'center' };

    worksheet.mergeCells('K6:M6');
    worksheet.getCell('K6').value = 'VENTAS INTERNAS';
    worksheet.getCell('K6').alignment = { horizontal: 'center' };

    const headers = [
      { cell: 'A7', val: 'Fecha' }, { cell: 'A8', val: 'Documento' },
      { cell: 'B7', val: 'Tipo' }, { cell: 'B8', val: 'Doc.' },
      { cell: 'C7', val: 'Número' }, { cell: 'C8', val: 'Documento' },
      { cell: 'D7', val: 'Nombre y Apellido' }, { cell: 'D8', val: 'y/o Razón Social' },
      { cell: 'E7', val: '' }, { cell: 'E8', val: 'RIF' },
      { cell: 'F7', val: 'Total Ventas' }, { cell: 'F8', val: 'mas Impuesto' },
      { cell: 'G7', val: 'Monto Exento' }, { cell: 'G8', val: 'ó Exonerado' },
      // Exportacion
      { cell: 'H8', val: 'Base Imponible' }, { cell: 'I8', val: '(%)' }, { cell: 'J8', val: 'Débito Fiscal' },
      // Internas
      { cell: 'K8', val: 'Base Imponible' }, { cell: 'L8', val: '(%)' }, { cell: 'M8', val: 'Débito Fiscal' },
    ];

    headers.forEach(h => {
      const cell = worksheet.getCell(h.cell);
      cell.value = h.val;
      cell.font = { bold: false, size: 9 };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'bottom', wrapText: true };
    });

    // Data
    let currentRow = 9;
    fiscalInvoices.forEach(inv => {
      const row = worksheet.getRow(currentRow);
      row.values = {
        fecha: this.formatDate(inv.issueDate),
        tipo: 'FAC',
        numero: inv.invoiceNumber,
        nombre: inv.client?.companyName || 'Cliente General',
        rif: inv.client?.rif || 'N/A',
        total: this.formatCurrency(inv.financial?.totalSales),
        exento: this.formatCurrency(inv.financial?.exemptSales),
        base_imp: 0,
        alicuota_imp: '',
        debito_imp: 0,
        base_int: this.formatCurrency(inv.financial?.taxableSales),
        alicuota_int: '16%',
        debito_int: this.formatCurrency(inv.financial?.taxDebit)
      };
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(col => {
        this.addBorders(row.getCell(col));
      });
      currentRow++;
    });

    // Totales
    const totalRow = worksheet.getRow(currentRow);
    totalRow.getCell('A').value = 'Total';
    totalRow.getCell('A').font = { bold: true };

    ['F', 'G', 'H', 'J', 'K', 'M'].forEach(col => {
      totalRow.getCell(col).value = { formula: `SUM(${col}9:${col}${currentRow - 1})` };
      totalRow.getCell(col).font = { bold: true };
      this.addBorders(totalRow.getCell(col));
    });

    // Summary (Simplified for Ventas)
    currentRow += 2;
    const summaryStartRow = currentRow;
    worksheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);
    const summaryRow = worksheet.getRow(summaryStartRow);
    summaryRow.getCell('A').value = 'Totales Ventas';
    summaryRow.getCell('E').value = 'Base Imponible';
    summaryRow.getCell('F').value = 'Débito Fiscal';

    ['A', 'E', 'F'].forEach(col => {
      const cell = summaryRow.getCell(col);
      cell.font = { bold: true };
      this.addBorders(cell);
    });

    const summaryItems = [
      'Ventas Internas Gravadas 16%',
      'Ventas Internas Exentas',
      'Total Ventas'
    ];

    summaryItems.forEach((item, idx) => {
      const r = summaryStartRow + 1 + idx;
      const row = worksheet.getRow(r);
      worksheet.mergeCells(`A${r}:D${r}`);
      row.getCell('A').value = item;
      this.addBorders(row.getCell('A'));

      if (item.includes('16%')) {
        row.getCell('E').value = { formula: `K${currentRow - 2}` };
        row.getCell('F').value = { formula: `M${currentRow - 2}` };
      } else if (item.includes('Total')) {
        row.getCell('E').value = { formula: `SUM(E${summaryStartRow + 1}:E${r - 1})` };
        row.getCell('F').value = { formula: `SUM(F${summaryStartRow + 1}:F${r - 1})` };
      } else {
        row.getCell('E').value = 0;
        row.getCell('F').value = 0;
      }
      this.addBorders(row.getCell('E'));
      this.addBorders(row.getCell('F'));
    });
  }

  // Construir Reporte General (Sin cambios mayores)
  buildGeneralReport(worksheet, invoices) {
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Nro', key: 'number', width: 15 },
      { header: 'Cliente/Proveedor', key: 'client', width: 30 },
      { header: 'Categoría', key: 'category', width: 15 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Total', key: 'total', width: 15 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.border = { bottom: { style: 'medium' } };

    invoices.forEach(inv => {
      worksheet.addRow({
        date: this.formatDate(inv.issueDate),
        number: inv.invoiceNumber,
        client: inv.flow === 'VENTA' ? (inv.client?.companyName || 'Cliente General') : (inv.issuer?.companyName || 'Proveedor'),
        category: inv.documentType || 'N/A',
        status: inv.status,
        total: this.formatCurrency(inv.financial?.totalSales)
      });
    });
  }

  // Exportar factura individual
  async exportInvoice(invoice, format = 'xlsx') {
    // ... (Misma implementación anterior)
    const filename = `Factura_${invoice.number || 'borrador'}.xlsx`;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Factura');
    // ... (Simplificado para no repetir todo el código anterior si no cambió)
    // Asumiendo que se mantiene igual que la versión anterior aprobada

    // Re-implementing simplified version for completeness
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = `FACTURA ${invoice.invoiceNumber}`;
    worksheet.getCell('A1').font = { size: 20, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.getCell('A3').value = 'Cliente:';
    worksheet.getCell('B3').value = invoice.client?.companyName || 'Cliente General';
    worksheet.getCell('A4').value = 'Fecha:';
    worksheet.getCell('B4').value = this.formatDate(invoice.issueDate);

    worksheet.getRow(6).values = ['Descripción', 'Cantidad', 'Precio', 'Total'];
    worksheet.getRow(6).font = { bold: true };

    if (invoice.items) {
      invoice.items.forEach((item, idx) => {
        const rowIdx = 7 + idx;
        worksheet.getRow(rowIdx).values = [
          item.description,
          item.quantity,
          item.unit_price,
          item.total
        ];
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }
}

export default new ExportService();
