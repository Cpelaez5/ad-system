/**
 * TESTS GOLDEN (caracterización) — Libro de Compras y Libro de Ventas (SENIAT).
 * F1 Red de seguridad, Agente Fiscal Venezuela.
 *
 * exportService.buildLibroCompras() / buildLibroVentas() escriben directamente
 * sobre un worksheet de ExcelJS (no son funciones puras que retornan un valor),
 * así que se les pasa un worksheet REAL de ExcelJS (misma librería que usa la
 * app en producción) y se inspeccionan los valores de las celdas resultantes:
 * filtrado de duplicados/no-FACTURA y sumatorias de la fila de TOTALES.
 *
 * Datos de facturas 100% inventados.
 */
// exportService.js importa retention-pdf-service.js, que a su vez importa
// assets estáticos (logo/watermark) con rutas absolutas que no resuelven bajo
// Vitest/Node. Se mockean igual que en tests/components/FacturacionMunicipalValidation.spec.js.
import { describe, it, expect, vi } from 'vitest';
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));

import ExcelJS from 'exceljs';
import exportService from '@/services/exportService.js';

function makeWorksheet() {
  const workbook = new ExcelJS.Workbook();
  return workbook.addWorksheet('Hoja de prueba');
}

const companyInfo = { name: 'Comercial Ficticia C.A.', rif: 'J-00000001-0', period: 'sep/2026' };

describe('exportService.buildLibroCompras()', () => {
  it('incluye solo documentos tipo FACTURA y omite duplicados por invoiceNumber', () => {
    const ws = makeWorksheet();
    const invoices = [
      { id: 'c1', documentType: 'FACTURA', invoiceNumber: '00000001', issueDate: '2026-09-02', issuer: { companyName: 'Proveedor Uno', rif: 'J-11111111-1' }, financial: { totalSales: 1160, taxableSales: 1000, taxDebit: 160, ivaRetention: 120, islrRetention: 0, municipalRetention: 0, igtf: 0 } },
      { id: 'c2', documentType: 'RECIBO', invoiceNumber: '00000002', issueDate: '2026-09-03', issuer: { companyName: 'Proveedor Dos', rif: 'J-22222222-2' }, financial: { totalSales: 500 } },
      // Duplicado exacto del mismo invoiceNumber que c1 → debe omitirse
      { id: 'c1-dup', documentType: 'FACTURA', invoiceNumber: '00000001', issueDate: '2026-09-02', issuer: { companyName: 'Proveedor Uno' }, financial: { totalSales: 1160 } }
    ];

    exportService.buildLibroCompras(ws, invoices, companyInfo);

    // Fila 7 = primera fila de datos (headerRow = 6)
    expect(ws.getCell('D7').value).toBe('00000001');
    expect(ws.getCell('F7').value).toBe('Proveedor Uno');
    // Solo debe existir UNA fila de datos (la RECIBO y el duplicado se filtran)
    expect(ws.getCell('D8').value).toBeFalsy();
  });

  it('calcula correctamente la fila de TOTALES sumando cada factura', () => {
    const ws = makeWorksheet();
    const invoices = [
      { id: 'c1', documentType: 'FACTURA', invoiceNumber: '00000001', issueDate: '2026-09-01', issuer: { companyName: 'Proveedor A' }, financial: { totalSales: 1160, taxableSales: 1000, taxDebit: 160, ivaRetention: 120, islrRetention: 20, municipalRetention: 10, igtf: 0 } },
      { id: 'c2', documentType: 'FACTURA', invoiceNumber: '00000002', issueDate: '2026-09-05', issuer: { companyName: 'Proveedor B' }, financial: { totalSales: 580, taxableSales: 500, taxDebit: 80, ivaRetention: 60, islrRetention: 10, municipalRetention: 5, igtf: 0 } }
    ];

    exportService.buildLibroCompras(ws, invoices, companyInfo);

    // headerRow = 6, 2 filas de datos (7 y 8) → fila de totales = 9
    const totalRow = 9;
    expect(ws.getCell(`H${totalRow}`).value).toBe(1740);  // 1160 + 580 (Total Compra)
    expect(ws.getCell(`J${totalRow}`).value).toBe(1500);  // 1000 + 500 (Compras Gravadas)
    expect(ws.getCell(`K${totalRow}`).value).toBe(240);   // 160 + 80 (Crédito Fiscal / IVA)
    expect(ws.getCell(`L${totalRow}`).value).toBe(180);   // 120 + 60 (Retención IVA)
    expect(ws.getCell(`M${totalRow}`).value).toBe(30);    // 20 + 10 (Retención ISLR)
    expect(ws.getCell(`N${totalRow}`).value).toBe(15);    // 10 + 5 (Retención Municipal)
  });

  it('no genera fila de totales si no hay facturas fiscales (todas filtradas)', () => {
    const ws = makeWorksheet();
    const invoices = [
      { id: 'r1', documentType: 'RECIBO', invoiceNumber: '00000099', issueDate: '2026-09-01', financial: { totalSales: 100 } }
    ];

    exportService.buildLibroCompras(ws, invoices, companyInfo);

    const totalRow = 7; // headerRow(6) + 1 fila de datos vacía + totales inmediatos
    expect(ws.getCell(`H${totalRow}`).value).toBeFalsy();
  });
});

describe('exportService.buildLibroVentas()', () => {
  it('usa los datos del CLIENTE (no del issuer) para razón social y RIF', () => {
    const ws = makeWorksheet();
    const invoices = [
      { id: 'v1', documentType: 'FACTURA', invoiceNumber: '00000010', issueDate: '2026-09-10', client: { companyName: 'Cliente Ficticio S.A.', rif: 'J-33333333-3' }, financial: { totalSales: 232, taxableSales: 200, taxDebit: 32, ivaRetention: 0, islrRetention: 0, municipalRetention: 0, igtf: 0 } }
    ];

    exportService.buildLibroVentas(ws, invoices, companyInfo);

    // headerRow = 7 → primera fila de datos = 8
    expect(ws.getCell('F8').value).toBe('Cliente Ficticio S.A.');
    expect(ws.getCell('G8').value).toBe('J-33333333-3');
    expect(ws.getCell('K8').value).toBe(32); // Débito Fiscal
  });

  it('suma el total de ventas, base gravada y débito fiscal en la fila de TOTALES', () => {
    const ws = makeWorksheet();
    const invoices = [
      { id: 'v1', documentType: 'FACTURA', invoiceNumber: '00000010', issueDate: '2026-09-10', client: { companyName: 'Cliente A' }, financial: { totalSales: 232, taxableSales: 200, taxDebit: 32, ivaRetention: 0, islrRetention: 0, municipalRetention: 0, igtf: 0 } },
      { id: 'v2', documentType: 'FACTURA', invoiceNumber: '00000011', issueDate: '2026-09-11', client: { companyName: 'Cliente B' }, financial: { totalSales: 116, taxableSales: 100, taxDebit: 16, ivaRetention: 0, islrRetention: 0, municipalRetention: 0, igtf: 0 } }
    ];

    exportService.buildLibroVentas(ws, invoices, companyInfo);

    // headerRow = 7, 2 filas de datos (8, 9) → totales en fila 10
    const totalRow = 10;
    expect(ws.getCell(`H${totalRow}`).value).toBe(348); // 232 + 116
    expect(ws.getCell(`J${totalRow}`).value).toBe(300);  // 200 + 100 (Venta Gravada)
    expect(ws.getCell(`K${totalRow}`).value).toBe(48);   // 32 + 16 (Débito Fiscal)
  });
});

describe('exportService.formatCurrency()', () => {
  it('convierte strings con separadores de miles a número, y null/undefined a 0', () => {
    expect(exportService.formatCurrency('1,234.56')).toBe(1234.56);
    expect(exportService.formatCurrency(null)).toBe(0);
    expect(exportService.formatCurrency(undefined)).toBe(0);
    expect(exportService.formatCurrency(500.5)).toBe(500.5);
  });
});
