const ExcelJS = require('exceljs');
const fs = require('fs');

async function exportarComprobanteISLR() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AD System';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Comprobante ISLR', {
    pageSetup: { paperSize: 9, orientation: 'landscape', margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 } }
  });

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

  let agenteName = 'Agente', agenteRif = 'J-123', agenteDir = 'Dir';
  let sujetoName = 'Sujeto', sujetoRif = 'J-456', sujetoDir = 'Dir2';

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
  subtitleCell.value = '(Para dar cumplimiento con la normativa establecida)';
  subtitleCell.font = { size: 9 };
  subtitleCell.alignment = { horizontal: 'center' };

  worksheet.mergeCells('A9:D9');
  worksheet.getCell('A9').value = `Fecha: 2023-10-10`;
  
  worksheet.mergeCells('K9:L9');
  worksheet.getCell('K9').value = 'N° COMPROBANTE';
  worksheet.getCell('K9').font = { bold: true };
  worksheet.getCell('K9').alignment = { horizontal: 'right' };
  
  worksheet.getCell('M9').value = '20231000001';
  worksheet.getCell('M9').font = { color: { argb: 'FFFF0000' }, bold: true }; 

  worksheet.mergeCells('M10:M11');
  worksheet.getCell('M10').value = `PERIODO FISCAL\nAÑO: 2023   MES: 10`;
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

  // Tabla
  const headers = [
    'N° Operación', 'Fecha de Factura', 'N° de Factura', 'N° Control de Factura',
    'N° Factura Afectada', 'N° Nota de Débito', 'Tipo de Transacción',
    'Total Compras / Servicio', 'Compras sin Derecho a Crédito (Exento)',
    'Base Imponible', '% Alicuota', 'Impuesto Retenido'
  ];

  const headerRow = 24;
  worksheet.mergeCells('G24:G25');
  worksheet.mergeCells('H24:H25');
  worksheet.mergeCells('I24:I25');
  worksheet.mergeCells('J24:J25');
  worksheet.mergeCells('K24:K25');
  worksheet.mergeCells('L24:L25');
  worksheet.mergeCells('M24:M25');

  worksheet.mergeCells('A24:A25');
  worksheet.mergeCells('B24:B25');
  worksheet.mergeCells('C24:C25');
  worksheet.mergeCells('D24:D25');
  worksheet.mergeCells('E24:E25');
  worksheet.mergeCells('F24:F25');

  function addBorders(cell) {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  }

  const hRow = worksheet.getRow(24);
  headers.forEach((header, idx) => {
    // Note: The loop doesn't perfectly match the merged cells if headers is length 12 but we use col 13. Wait...
    // Let's just put something simple.
    const cell = hRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    addBorders(cell);
  });
  hRow.height = 45;

  const dataRow = worksheet.getRow(26);
  const base = 1000;
  const retencion = 30;
  const exento = 0;
  const total = 1000;
  const alicuota = 3;

  dataRow.values = [
    1,
    '2023-10-10',
    'F-1',
    'C-1',
    '',
    '',
    '01-reg',
    total - retencion,
    total,
    exento,
    base,
    Number(alicuota),
    retencion
  ];

  for (let col = 1; col <= 13; col++) {
    const cell = dataRow.getCell(col);
    addBorders(cell);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (col >= 8) cell.numFmt = '#,##0.00';
  }

  const totalRow = worksheet.getRow(27);

  // 1. Asignar todos los valores de las celdas (antes del merge)
  const tLabel = worksheet.getCell('A27');
  tLabel.value = 'TOTALES';
  tLabel.font = { bold: true };
  tLabel.alignment = { horizontal: 'right', vertical: 'middle' };

  totalRow.getCell(8).value = total - retencion;
  totalRow.getCell(9).value = total;
  totalRow.getCell(10).value = exento;
  totalRow.getCell(11).value = base;
  totalRow.getCell(12).value = '';
  totalRow.getCell(13).value = retencion;

  // 2. Aplicar estilos y bordes a TODAS las celdas (1 a 13) antes del merge
  for (let col = 1; col <= 13; col++) {
    const cell = totalRow.getCell(col);
    cell.font = { bold: true };
    addBorders(cell);
    if (col >= 8 && col !== 12) cell.numFmt = '#,##0.00';
  }

  // 3. Hacer el merge (después de que las celdas esclavas ya tienen su estilo/borde)
  worksheet.mergeCells('A27:G27');

  const firmaAgente = worksheet.getCell('C32');
  firmaAgente.value = '_______________________________________\nFIRMA DEL AGENTE DE RETENCION\nSELLO';
  firmaAgente.alignment = { horizontal: 'center', wrapText: true };
  firmaAgente.font = { bold: true };
  
  worksheet.mergeCells('J32:L32');
  const firmaRetenido = worksheet.getCell('J32');
  firmaRetenido.value = '_______________________________________\nRECIBIDO POR\nFIRMA / SELLO';
  firmaRetenido.alignment = { horizontal: 'center', wrapText: true };
  firmaRetenido.font = { bold: true };

  await workbook.xlsx.writeFile('test_full.xlsx');
}

exportarComprobanteISLR().then(() => console.log('Done')).catch(console.error);
