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

  // Construir Libro de Compras (Formato SENIAT Oficial)
  buildLibroCompras(worksheet, invoices, companyInfo) {
    // Filtrar solo facturas fiscales y eliminar duplicados
    const seen = new Set();
    const fiscalInvoices = invoices.filter(inv => {
      if (inv.documentType !== 'FACTURA') return false;
      const key = inv.invoiceNumber || inv.id;
      if (seen.has(key)) {
        console.warn(`⚠️ Libro Compras: Factura duplicada detectada y omitida: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });

    console.log(`📊 Libro de Compras - Total facturas a exportar: ${fiscalInvoices.length}`);

    // Configurar columnas según plantilla SENIAT
    // N° | Fecha | Tipo Doc | N° Documento | N° Control | Razón Social | RIF | 
    // Total Compra | Compras No Gravadas | Compras Gravadas | Crédito Fiscal |
    // Retención IVA | Retención ISLR | Retención Municipal | IGTF
    worksheet.columns = [
      { key: 'num', width: 5 },
      { key: 'fecha', width: 12 },
      { key: 'tipoDoc', width: 10 },
      { key: 'numDoc', width: 15 },
      { key: 'numControl', width: 15 },
      { key: 'razonSocial', width: 35 },
      { key: 'rif', width: 15 },
      { key: 'totalCompra', width: 14 },
      { key: 'comprasNoGravadas', width: 14 },
      { key: 'comprasGravadas', width: 14 },
      { key: 'creditoFiscal', width: 14 },
      { key: 'retencionIva', width: 12 },
      { key: 'retencionIslr', width: 12 },
      { key: 'retencionMunicipal', width: 12 },
      { key: 'igtf', width: 10 },
    ];

    // ==========================================
    // HEADER EMPRESA (Filas 1-4)
    // ==========================================
    const headerStyle = { font: { bold: true } };
    const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Fila 1: Contribuyente
    worksheet.getCell('A1').value = 'Contribuyente:';
    worksheet.mergeCells('B1:E1');
    worksheet.getCell('B1').value = companyInfo.name || 'EMPRESA';
    worksheet.getCell('B1').font = { bold: true };

    // Fila 2: RIF
    worksheet.getCell('A2').value = 'RIF';
    worksheet.mergeCells('B2:E2');
    worksheet.getCell('B2').value = companyInfo.rif || 'J-00000000-0';
    worksheet.getCell('B2').font = { bold: true };

    // Fila 3: Tipo de contribuyente (configurable)
    worksheet.getCell('A3').value = 'Tipo de contribuyente';
    worksheet.mergeCells('B3:E3');
    worksheet.getCell('B3').value = companyInfo.taxpayerType || 'Ordinario';

    // Fila 4: Libro de Compras/Mes/Año
    worksheet.getCell('A4').value = 'Libro de Compras/Mes/Año';
    worksheet.mergeCells('B4:E4');
    worksheet.getCell('B4').value = companyInfo.period || dayjs().format('MMMM/YYYY');

    // ==========================================
    // ENCABEZADOS DE TABLA (Fila 6)
    // ==========================================
    const headerRow = 6;
    const headers = [
      'N°', 'Fecha', 'Tipo\nDocumento', 'N° Documento', 'N° Control',
      'Razón Social,\nProveedor y/o Cliente', 'Rif',
      'Total\nCompra', 'Compras No\nGravadas', 'Compras\nGravadas', 'Crédito Fiscal',
      'Retención IVA', 'Retención de\nISLR', 'Retención\nMunicipal', 'IGTF'
    ];

    const hRow = worksheet.getRow(headerRow);
    headers.forEach((header, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, size: 9 };
      cell.fill = yellowFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      this.addBorders(cell);
    });
    hRow.height = 30;

    // ==========================================
    // DATOS (Fila 7+)
    // ==========================================
    let currentRow = headerRow + 1;
    fiscalInvoices.forEach((inv, index) => {
      const row = worksheet.getRow(currentRow);

      // Validar número de factura
      if (!inv.invoiceNumber) {
        console.warn(`⚠️ Factura sin número en posición ${index + 1}, usando ID: ${inv.id}`);
      }

      row.values = [
        index + 1, // N° secuencial
        this.formatDate(inv.issueDate),
        'FACTURA',
        inv.invoiceNumber || '-',
        inv.controlNumber || '-',
        inv.issuer?.companyName || 'Proveedor',
        inv.issuer?.rif || '-',
        this.formatCurrency(inv.financial?.totalSales),
        this.formatCurrency(inv.financial?.exemptSales),
        this.formatCurrency(inv.financial?.taxableSales),
        this.formatCurrency(inv.financial?.taxDebit), // Crédito fiscal
        this.formatCurrency(inv.financial?.ivaRetention),
        this.formatCurrency(inv.financial?.islrRetention),
        this.formatCurrency(inv.financial?.municipalRetention),
        this.formatCurrency(inv.financial?.igtf)
      ];

      // Aplicar bordes a todas las celdas
      for (let col = 1; col <= 15; col++) {
        this.addBorders(row.getCell(col));
      }

      currentRow++;
    });

    // ==========================================
    // FILA DE TOTALES
    // ==========================================
    const totalRow = worksheet.getRow(currentRow);
    const dataStartRow = headerRow + 1;
    const dataEndRow = currentRow - 1;

    // Solo calcular totales si hay datos
    if (fiscalInvoices.length > 0) {
      totalRow.getCell(1).value = ''; // N°
      totalRow.getCell(8).value = { formula: `SUM(H${dataStartRow}:H${dataEndRow})` };
      totalRow.getCell(9).value = { formula: `SUM(I${dataStartRow}:I${dataEndRow})` };
      totalRow.getCell(10).value = { formula: `SUM(J${dataStartRow}:J${dataEndRow})` };
      totalRow.getCell(11).value = { formula: `SUM(K${dataStartRow}:K${dataEndRow})` };
      totalRow.getCell(12).value = { formula: `SUM(L${dataStartRow}:L${dataEndRow})` };
      totalRow.getCell(13).value = { formula: `SUM(M${dataStartRow}:M${dataEndRow})` };
      totalRow.getCell(14).value = { formula: `SUM(N${dataStartRow}:N${dataEndRow})` };
      totalRow.getCell(15).value = { formula: `SUM(O${dataStartRow}:O${dataEndRow})` };

      for (let col = 8; col <= 15; col++) {
        totalRow.getCell(col).font = { bold: true };
        this.addBorders(totalRow.getCell(col));
      }
    }

    currentRow += 2;

    // ==========================================
    // TABLA RESUMEN (Categorías SENIAT)
    // ==========================================
    const summaryStartRow = currentRow;

    // Encabezado resumen
    worksheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);
    worksheet.getCell(`A${summaryStartRow}`).value = '';
    worksheet.getCell(`E${summaryStartRow}`).value = 'Base Imponible';
    worksheet.getCell(`F${summaryStartRow}`).value = 'Crédito Fiscal';
    worksheet.getCell(`E${summaryStartRow}`).font = { bold: true };
    worksheet.getCell(`F${summaryStartRow}`).font = { bold: true };
    this.addBorders(worksheet.getCell(`E${summaryStartRow}`));
    this.addBorders(worksheet.getCell(`F${summaryStartRow}`));

    const summaryItems = [
      { label: 'Total: Compras Excentas y/o sin Derecho a Crédito Fiscal', row: 30, baseFormula: null, creditFormula: null },
      { label: 'Σ de las Compras Importación Afectas solo Alícuota General', row: 31, baseFormula: null, creditFormula: null },
      { label: 'Σ de las Compras Importación Afectas en Alícuota General + Adicional', row: 312, baseFormula: null, creditFormula: null },
      { label: 'Σ de las Compras Importación Afectas en Alícuota Reducida', row: 313, baseFormula: null, creditFormula: null },
      { label: 'Σ de las Compras Internas Afectas solo en Alícuota General', row: 33, baseFormula: `J${dataEndRow + 1}`, creditFormula: `K${dataEndRow + 1}` },
      { label: 'Σ de las Compras Internas Afectas en Alícuota General + Adicional', row: 332, baseFormula: null, creditFormula: null },
      { label: 'Σ de las Compras Internas Afectas en Alícuota Reducida', row: 333, baseFormula: null, creditFormula: null },
    ];

    summaryItems.forEach((item, idx) => {
      const r = summaryStartRow + 1 + idx;
      const row = worksheet.getRow(r);
      worksheet.mergeCells(`A${r}:D${r}`);
      row.getCell(1).value = item.label;
      row.getCell(5).value = item.baseFormula ? { formula: item.baseFormula } : 0;
      row.getCell(6).value = item.creditFormula ? { formula: item.creditFormula } : 0;

      this.addBorders(row.getCell(1));
      this.addBorders(row.getCell(5));
      this.addBorders(row.getCell(6));
    });

    // Fila de total resumen
    const totalSummaryRow = summaryStartRow + summaryItems.length + 1;
    worksheet.mergeCells(`A${totalSummaryRow}:D${totalSummaryRow}`);
    worksheet.getCell(`A${totalSummaryRow}`).value = '';
    worksheet.getCell(`E${totalSummaryRow}`).value = { formula: `SUM(E${summaryStartRow + 1}:E${totalSummaryRow - 1})` };
    worksheet.getCell(`F${totalSummaryRow}`).value = { formula: `SUM(F${summaryStartRow + 1}:F${totalSummaryRow - 1})` };
    worksheet.getCell(`E${totalSummaryRow}`).font = { bold: true };
    worksheet.getCell(`F${totalSummaryRow}`).font = { bold: true };
    this.addBorders(worksheet.getCell(`E${totalSummaryRow}`));
    this.addBorders(worksheet.getCell(`F${totalSummaryRow}`));

    console.log(`✅ Libro de Compras generado con ${fiscalInvoices.length} registros`);
  }

  // Construir Libro de Ventas (Formato SENIAT Oficial)
  buildLibroVentas(worksheet, invoices, companyInfo) {
    // Filtrar solo facturas fiscales y eliminar duplicados
    const seen = new Set();
    const fiscalInvoices = invoices.filter(inv => {
      if (inv.documentType !== 'FACTURA') return false;
      const key = inv.invoiceNumber || inv.id;
      if (seen.has(key)) {
        console.warn(`⚠️ Libro Ventas: Factura duplicada detectada y omitida: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });

    console.log(`📊 Libro de Ventas - Total facturas a exportar: ${fiscalInvoices.length}`);

    // Configurar columnas según plantilla SENIAT
    // N° | Fecha | Tipo Doc | N° Documento | N° Control | Razón Social | RIF | 
    // Total Ventas | Venta No Gravadas | Venta Gravadas | Débito Fiscal |
    // Retenciones IVA de Clientes | Retención ISLR | Retención Municipal | IGTF
    worksheet.columns = [
      { key: 'num', width: 5 },
      { key: 'fecha', width: 12 },
      { key: 'tipoDoc', width: 10 },
      { key: 'numDoc', width: 15 },
      { key: 'numControl', width: 15 },
      { key: 'razonSocial', width: 35 },
      { key: 'rif', width: 15 },
      { key: 'totalVentas', width: 14 },
      { key: 'ventaNoGravadas', width: 14 },
      { key: 'ventaGravadas', width: 14 },
      { key: 'debitoFiscal', width: 14 },
      { key: 'retencionIvaClientes', width: 14 },
      { key: 'retencionIslr', width: 12 },
      { key: 'retencionMunicipal', width: 12 },
      { key: 'igtf', width: 10 },
    ];

    // ==========================================
    // HEADER EMPRESA (Filas 1-5)
    // ==========================================
    const yellowFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    // Fila 1: Contribuyente
    worksheet.getCell('A1').value = 'Contribuyente:';
    worksheet.mergeCells('B1:E1');
    worksheet.getCell('B1').value = companyInfo.name || 'EMPRESA';
    worksheet.getCell('B1').font = { bold: true };

    // Fila 2: RIF
    worksheet.getCell('A2').value = 'RIF';
    worksheet.mergeCells('B2:E2');
    worksheet.getCell('B2').value = companyInfo.rif || 'J-00000000-0';
    worksheet.getCell('B2').font = { bold: true };

    // Fila 3: Tipo de contribuyente (configurable)
    worksheet.getCell('A3').value = 'Tipo de contribuyente';
    worksheet.mergeCells('B3:E3');
    worksheet.getCell('B3').value = companyInfo.taxpayerType || 'Ordinario';

    // Fila 4: Libro de Ventas/Mes/Año
    worksheet.getCell('A4').value = 'Libro de Ventas/Mes/Año';
    worksheet.mergeCells('B4:E4');
    worksheet.getCell('B4').value = companyInfo.period || dayjs().format('MMMM/YYYY');

    // Fila 5: Máquina Fiscal Nro (configurable, vacío por defecto)
    worksheet.getCell('A5').value = 'Máquina Fiscal Nro.';
    worksheet.mergeCells('B5:E5');
    worksheet.getCell('B5').value = companyInfo.fiscalMachineNumber || '';

    // ==========================================
    // ENCABEZADOS DE TABLA (Fila 7)
    // ==========================================
    const headerRow = 7;
    const headers = [
      'N°', 'Fecha', 'Tipo\nDocumento', 'N° Documento', 'N° Control',
      'Razón Social, Proveedor\ny/o cliente', 'Rif',
      'Total\nVentas', 'Venta No\nGravadas', 'Venta\nGravadas', 'Débito Fiscal',
      'Retenciones IVA\nde Clientes', 'Retención\nISRL', 'Retención\nMunicipal', 'IGTF'
    ];

    const hRow = worksheet.getRow(headerRow);
    headers.forEach((header, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, size: 9 };
      cell.fill = yellowFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      this.addBorders(cell);
    });
    hRow.height = 35;

    // ==========================================
    // DATOS (Fila 8+)
    // ==========================================
    let currentRow = headerRow + 1;
    fiscalInvoices.forEach((inv, index) => {
      const row = worksheet.getRow(currentRow);

      // Validar número de factura
      if (!inv.invoiceNumber) {
        console.warn(`⚠️ Factura sin número en posición ${index + 1}, usando ID: ${inv.id}`);
      }

      row.values = [
        index + 1, // N° secuencial
        this.formatDate(inv.issueDate),
        'FACTURA',
        inv.invoiceNumber || '-',
        inv.controlNumber || '-',
        inv.client?.companyName || 'Cliente General',
        inv.client?.rif || '-',
        this.formatCurrency(inv.financial?.totalSales),
        this.formatCurrency(inv.financial?.exemptSales),
        this.formatCurrency(inv.financial?.taxableSales),
        this.formatCurrency(inv.financial?.taxDebit), // Débito fiscal
        this.formatCurrency(inv.financial?.ivaRetention),
        this.formatCurrency(inv.financial?.islrRetention),
        this.formatCurrency(inv.financial?.municipalRetention),
        this.formatCurrency(inv.financial?.igtf)
      ];

      // Aplicar bordes a todas las celdas
      for (let col = 1; col <= 15; col++) {
        this.addBorders(row.getCell(col));
      }

      currentRow++;
    });

    // ==========================================
    // FILA DE TOTALES
    // ==========================================
    const totalRow = worksheet.getRow(currentRow);
    const dataStartRow = headerRow + 1;
    const dataEndRow = currentRow - 1;

    // Solo calcular totales si hay datos
    if (fiscalInvoices.length > 0) {
      totalRow.getCell(1).value = ''; // N°
      totalRow.getCell(8).value = { formula: `SUM(H${dataStartRow}:H${dataEndRow})` };
      totalRow.getCell(9).value = { formula: `SUM(I${dataStartRow}:I${dataEndRow})` };
      totalRow.getCell(10).value = { formula: `SUM(J${dataStartRow}:J${dataEndRow})` };
      totalRow.getCell(11).value = { formula: `SUM(K${dataStartRow}:K${dataEndRow})` };
      totalRow.getCell(12).value = { formula: `SUM(L${dataStartRow}:L${dataEndRow})` };
      totalRow.getCell(13).value = { formula: `SUM(M${dataStartRow}:M${dataEndRow})` };
      totalRow.getCell(14).value = { formula: `SUM(N${dataStartRow}:N${dataEndRow})` };
      totalRow.getCell(15).value = { formula: `SUM(O${dataStartRow}:O${dataEndRow})` };

      for (let col = 8; col <= 15; col++) {
        totalRow.getCell(col).font = { bold: true };
        this.addBorders(totalRow.getCell(col));
      }
    }

    currentRow += 2;

    // ==========================================
    // TABLA RESUMEN (Categorías SENIAT)
    // ==========================================
    const summaryStartRow = currentRow;

    // Encabezado resumen
    worksheet.mergeCells(`A${summaryStartRow}:D${summaryStartRow}`);
    worksheet.getCell(`A${summaryStartRow}`).value = '';
    worksheet.getCell(`E${summaryStartRow}`).value = 'Base Imponible';
    worksheet.getCell(`F${summaryStartRow}`).value = 'Débito Fiscal';
    worksheet.getCell(`G${summaryStartRow}`).value = 'Retención IVA';
    worksheet.getCell(`E${summaryStartRow}`).font = { bold: true };
    worksheet.getCell(`F${summaryStartRow}`).font = { bold: true };
    worksheet.getCell(`G${summaryStartRow}`).font = { bold: true };
    this.addBorders(worksheet.getCell(`E${summaryStartRow}`));
    this.addBorders(worksheet.getCell(`F${summaryStartRow}`));
    this.addBorders(worksheet.getCell(`G${summaryStartRow}`));

    const summaryItems = [
      { label: 'Total: Ventas Internas No Gravadas', baseFormula: `I${currentRow - 2}`, debitFormula: null, retFormula: null },
      { label: 'Sumatoria de las: Ventas de Exportación', baseFormula: null, debitFormula: null, retFormula: null },
      { label: 'Sumatoria de las: Ventas Internas Afectadas solo alícuota General', baseFormula: `J${currentRow - 2}`, debitFormula: `K${currentRow - 2}`, retFormula: `L${currentRow - 2}` },
      { label: 'Sumatoria de las: Ventas Internas Afectadas solo alícuota General+Adicional', baseFormula: null, debitFormula: null, retFormula: null },
      { label: 'Sumatoria de las: Ventas Internas Afectadas en Alícuotas Reducida', baseFormula: null, debitFormula: null, retFormula: null },
    ];

    summaryItems.forEach((item, idx) => {
      const r = summaryStartRow + 1 + idx;
      const row = worksheet.getRow(r);
      worksheet.mergeCells(`A${r}:D${r}`);
      row.getCell(1).value = item.label;
      row.getCell(5).value = item.baseFormula ? { formula: item.baseFormula } : 0;
      row.getCell(6).value = item.debitFormula ? { formula: item.debitFormula } : 0;
      row.getCell(7).value = item.retFormula ? { formula: item.retFormula } : 0;

      this.addBorders(row.getCell(1));
      this.addBorders(row.getCell(5));
      this.addBorders(row.getCell(6));
      this.addBorders(row.getCell(7));
    });

    // Fila de total resumen
    const totalSummaryRow = summaryStartRow + summaryItems.length + 1;
    worksheet.mergeCells(`A${totalSummaryRow}:D${totalSummaryRow}`);
    worksheet.getCell(`A${totalSummaryRow}`).value = '';
    worksheet.getCell(`E${totalSummaryRow}`).value = { formula: `SUM(E${summaryStartRow + 1}:E${totalSummaryRow - 1})` };
    worksheet.getCell(`F${totalSummaryRow}`).value = { formula: `SUM(F${summaryStartRow + 1}:F${totalSummaryRow - 1})` };
    worksheet.getCell(`G${totalSummaryRow}`).value = { formula: `SUM(G${summaryStartRow + 1}:G${totalSummaryRow - 1})` };
    worksheet.getCell(`E${totalSummaryRow}`).font = { bold: true };
    worksheet.getCell(`F${totalSummaryRow}`).font = { bold: true };
    worksheet.getCell(`G${totalSummaryRow}`).font = { bold: true };
    this.addBorders(worksheet.getCell(`E${totalSummaryRow}`));
    this.addBorders(worksheet.getCell(`F${totalSummaryRow}`));
    this.addBorders(worksheet.getCell(`G${totalSummaryRow}`));

    console.log(`✅ Libro de Ventas generado con ${fiscalInvoices.length} registros`);
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

  // ==========================================
  // COMPROBANTE DE RETENCIÓN DE ISLR
  // ==========================================
  async exportarComprobanteISLR(invoice, companyInfo) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AD System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Comprobante ISLR', {
      pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 } }
    });

    try {
      // LOGO REMOVIDO TEMPORALMENTE PARA EVITAR CORRUPCIÓN XML EN EXCELJS
      /*
      const response = await fetch('/ADSystem/logo.png');
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('image')) {
        const imageBuffer = await response.arrayBuffer();
        const logoId = workbook.addImage({
          buffer: imageBuffer,
          extension: 'png',
        });
        worksheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 140, height: 60 } 
        });
      }
      */
    } catch(e) {
      console.warn("⚠️ No se pudo cargar el logo de ADSystem:", e);
    }

    worksheet.columns = [
      { width: 8 },  // A
      { width: 12 }, // B
      { width: 15 }, // C
      { width: 15 }, // D
      { width: 15 }, // E
      { width: 15 }, // F
      { width: 12 }, // G
      { width: 15 }, // H
      { width: 15 }, // I
      { width: 15 }, // J
      { width: 15 }, // K
      { width: 10 }, // L
      { width: 15 }, // M
    ];

    let agenteName, agenteRif, agenteDir;
    let sujetoName, sujetoRif, sujetoDir;

    // Tratar de obtener de la base de datos (invoice.organization para el tenant)
    const tenantName = companyInfo?.name || companyInfo?.companyName || invoice.organization?.name || 'EMPRESA (TENANT)';
    const tenantRif = companyInfo?.rif || invoice.organization?.rif || 'J-00000000-0';
    const tenantDir = companyInfo?.address || companyInfo?.direccion || invoice.organization?.address || 'DIRECCIÓN NO REGISTRADA';

    if (invoice.flow === 'COMPRA') {
      // En una COMPRA, si el usuario es el cliente y está registrando su propia compra, 
      // EL CLIENTE es el agente de retención. Pero en el sistema, las COMPRAS registradas
      // pertenecen al tenant. Asumiremos que el Tenant es el agente y el emisor (proveedor) el sujeto.
      agenteName = tenantName;
      agenteRif = tenantRif;
      agenteDir = tenantDir;
      sujetoName = invoice.issuer?.razon_social || invoice.issuer?.nombre || invoice.issuer?.companyName || 'PROVEEDOR NO REGISTRADO';
      sujetoRif = invoice.issuer?.rif || 'J-00000000-0';
      sujetoDir = invoice.issuer?.direccion || invoice.issuer?.address || 'DIRECCIÓN NO REGISTRADA';
    } else {
      agenteName = invoice.client?.razon_social || invoice.client?.nombre || invoice.client?.companyName || 'CLIENTE NO REGISTRADO';
      agenteRif = invoice.client?.rif || 'J-00000000-0';
      agenteDir = invoice.client?.direccion || invoice.client?.address || 'DIRECCIÓN NO REGISTRADA';
      sujetoName = tenantName;
      sujetoRif = tenantRif;
      sujetoDir = tenantDir;
    }

    // Fila 2 y 3: Datos del Agente de Retención (cabecera)
    worksheet.mergeCells('D2:J2');
    const nameCell = worksheet.getCell('D2');
    nameCell.value = agenteName;
    nameCell.font = { bold: true, size: 14 };
    nameCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('D3:J3');
    const rifCell = worksheet.getCell('D3');
    rifCell.value = agenteRif;
    rifCell.font = { bold: true, size: 12 };
    rifCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A6:M6');
    const titleCell = worksheet.getCell('A6');
    titleCell.value = 'COMPROBANTE DE RETENCION DE IMPUESTO SOBRE LA RENTA';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A7:M7');
    const subtitleCell = worksheet.getCell('A7');
    subtitleCell.value = '(Para dar cumplimiento con la normativa establecida el Articulo 24, Decreto 1,808 en materia de Retenciones ISLR publicado en G. O. N° 36,203 del 12 de Mayo de 1997)';
    subtitleCell.font = { size: 9 };
    subtitleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A9:D9');
    worksheet.getCell('A9').value = `Fecha: ${this.formatDate(invoice.issueDate)}`;
    
    worksheet.mergeCells('K9:L9');
    worksheet.getCell('K9').value = 'N° COMPROBANTE';
    worksheet.getCell('K9').font = { bold: true };
    worksheet.getCell('K9').alignment = { horizontal: 'right' };
    
    const yearMonth = dayjs(invoice.issueDate).format('YYYYMM');
    // Generar correlativo básico si no existe (normalmente vendría del backend)
    const comprobanteNum = invoice.retention_number || `${yearMonth}00001`; 
    worksheet.getCell('M9').value = comprobanteNum;
    worksheet.getCell('M9').font = { color: { argb: 'FFFF0000' }, bold: true }; 

    worksheet.mergeCells('M10:M11');
    worksheet.getCell('M10').value = `PERIODO FISCAL\nAÑO: ${dayjs(invoice.issueDate).format('YYYY')}   MES: ${dayjs(invoice.issueDate).format('MM')}`;
    worksheet.getCell('M10').alignment = { horizontal: 'center', wrapText: true };
    worksheet.getCell('M10').font = { bold: true };

    // Agente Retención
    worksheet.getCell('A12').value = 'NOMBRE O RAZON SOCIAL DEL AGENTE DE RETENCION:';
    worksheet.getCell('A12').font = { bold: true };
    worksheet.getCell('I12').value = 'REGISTRO DE INFORMACION FISCAL DEL AGENTE DE RETENCION:';
    worksheet.getCell('I12').font = { bold: true };
    
    worksheet.getCell('A13').value = agenteName;
    worksheet.getCell('I13').value = agenteRif;

    worksheet.getCell('A15').value = 'DIRECCION FISCAL DEL AGENTE DE RETENCION:';
    worksheet.getCell('A15').font = { bold: true };
    worksheet.getCell('A16').value = agenteDir;

    // Sujeto Retenido
    worksheet.getCell('A18').value = 'NOMBRE O RAZON SOCIAL DEL SUJETO RETENIDO:';
    worksheet.getCell('A18').font = { bold: true };
    worksheet.getCell('I18').value = 'REGISTRO DE INFORMACION FISCAL DEL SUJETO RETENIDO (R.I.F):';
    worksheet.getCell('I18').font = { bold: true };

    worksheet.getCell('A19').value = sujetoName;
    worksheet.getCell('I19').value = sujetoRif;

    worksheet.getCell('A21').value = 'DIRECCION FISCAL DEL SUJETO RETENIDO:';
    worksheet.getCell('A21').font = { bold: true };
    worksheet.getCell('A22').value = sujetoDir;

    // Tabla Operaciones
    const headerRow = 24;
    const headers = [
      'Oper.\nNro.', 'Fecha de pago o\nAbono en cuenta', 'Número de\nFactura', 'Número de\nControl',
      'Número\nNota Débito', 'Número de\nNota Crédito', 'Tipo de\nTransacc.', 'Cantidad\nPagada',
      'Total Compras\nIncluyendo\nel IVA', 'Compras sin\nderecho a\nCrédito IVA', 
      'Cantidad Objeto\nde Retencion', '%\nAlicuota', 'Impuesto\nRetenido'
    ];

    const hRow = worksheet.getRow(headerRow);
    headers.forEach((header, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { bold: true, size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      this.addBorders(cell);
    });
    hRow.height = 45;

    const dataRow = worksheet.getRow(25);
    const base = invoice.financial?.taxableSales || 0;
    const retencion = invoice.financial?.islrRetention || 0;
    const exento = invoice.financial?.exemptSales || 0;
    const total = invoice.financial?.totalSales || 0;
    const alicuota = base > 0 ? ((retencion / base) * 100).toFixed(0) : 0;

    dataRow.values = [
      1,
      this.formatDate(invoice.issueDate),
      invoice.invoiceNumber,
      invoice.controlNumber,
      '',
      '',
      '01-reg',
      this.formatCurrency(total - retencion),
      this.formatCurrency(total),
      this.formatCurrency(exento),
      this.formatCurrency(base),
      Number(alicuota),
      this.formatCurrency(retencion)
    ];

    for (let col = 1; col <= 13; col++) {
      const cell = dataRow.getCell(col);
      this.addBorders(cell);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (col >= 8) cell.numFmt = '#,##0.00';
    }

    const totalRow = worksheet.getRow(27);
    worksheet.mergeCells('A27:G27');
    const tLabel = worksheet.getCell('A27');
    tLabel.value = 'TOTALES';
    tLabel.font = { bold: true };
    tLabel.alignment = { horizontal: 'right', vertical: 'middle' };
    this.addBorders(tLabel);

    totalRow.getCell(8).value = (total - retencion) || 0;
    totalRow.getCell(9).value = total || 0;
    totalRow.getCell(10).value = exento || 0;
    totalRow.getCell(11).value = base || 0;
    totalRow.getCell(12).value = '';
    totalRow.getCell(13).value = retencion || 0;

    const masterCell = totalRow.getCell(1);
    masterCell.font = { bold: true };
    this.addBorders(masterCell);

    for (let col = 8; col <= 13; col++) {
      const cell = totalRow.getCell(col);
      cell.font = { bold: true };
      this.addBorders(cell);
      if (col !== 12) cell.numFmt = '#,##0.00';
    }

    const firmaAgente = worksheet.getCell('C32');
    firmaAgente.value = '_______________________________________\nFIRMA DEL AGENTE DE RETENCION\nSELLO';
    firmaAgente.alignment = { horizontal: 'center', wrapText: true };
    firmaAgente.font = { bold: true };
    
    worksheet.mergeCells('J32:L32');
    const firmaRetenido = worksheet.getCell('J32');
    firmaRetenido.value = '_______________________________________\nRECIBIDO POR\nFIRMA / SELLO';
    firmaRetenido.alignment = { horizontal: 'center', wrapText: true };
    firmaRetenido.font = { bold: true };

    const filename = `Comprobante_ISLR_${invoice.invoiceNumber || 'Borrador'}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }
}

export default new ExportService();
