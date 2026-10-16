// Genera, EN EL NAVEGADOR, las muestras de documentos con datos ficticios.
// Lo abre scripts/muestras-documentos.mjs con Playwright y recoge `window.__muestras`.
import { jsPDF } from 'jspdf'
import retentionPdfService from '@/services/retention-pdf-service.js'
import { generateReceiptPdf } from '@/services/receipt-pdf-service.js'
import exportService from '@/services/exportService.js'
import inventoryExportService from '@/services/inventoryExportService.js'
import { generarPlantilla } from '@/components/inventario/plantillaRubro.js'
import { construirTxtIva } from '@/utils/seniat/txtIva.js'
import { construirXmlIslr } from '@/utils/seniat/xmlIslr.js'
import { factura, facturaVenta, companyInfo, libroCompras, libroVentas, retenciones, papeles } from './datos.js'

const salidas = {}
window.__muestras = salidas

function aBase64(buffer) {
  let bin = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

// jsPDF.save -> capturar en vez de descargar
jsPDF.prototype.save = function (nombre) {
  salidas[nombre] = { base64: aBase64(this.output('arraybuffer')) }
}

// file-saver -> capturar el Blob en vez de descargar
let ultimoBlob = null
const crear = URL.createObjectURL.bind(URL)
URL.createObjectURL = (b) => { ultimoBlob = b; return crear(b) }
async function capturarAnchor(a) {
  if (a.download && ultimoBlob) {
    const buf = await ultimoBlob.arrayBuffer()
    salidas[a.download] = { base64: aBase64(buf) }
  }
}
HTMLAnchorElement.prototype.click = function () { capturarAnchor(this) }
const despachar = HTMLAnchorElement.prototype.dispatchEvent
HTMLAnchorElement.prototype.dispatchEvent = function (e) { capturarAnchor(this); return despachar.call(this, e) }

const tareas = {
  async retencionIVA() { await retentionPdfService.generarComprobanteIVA(factura, companyInfo) },
  async retencionISLR() { await retentionPdfService.generarComprobanteISLR(factura, companyInfo) },
  async retencionMunicipal() { await retentionPdfService.generarComprobanteMunicipal(factura, companyInfo, { confirmMismatch: true }) },
  async retencionIVAventa() { await retentionPdfService.generarComprobanteIVA(facturaVenta, companyInfo) },
  async ejemploSello() { await retentionPdfService.descargarEjemploSelloFirma({}) },
  async recibo() { await generateReceiptPdf(factura) },
  async reciboVentaUsd() {
    await generateReceiptPdf({ ...facturaVenta, invoiceNumber: '00000099', financial: { ...facturaVenta.financial, currency: 'USD', taxableSales: 100, taxDebit: 16, totalSales: 116, exemptSales: 0, nonTaxableSales: 0, ivaRetention: 0, islrRetention: 0, municipalRetention: 0, exchangeRate: 104.03677 }, items: [{ description: 'Asesoría contable mensual', quantity: 1, unitPrice: 100, total: 100 }] })
  },
  async libroCompras() { await exportService.exportTable(libroCompras, 'VES', 'Libro_Compras.xlsx', 'SENIAT', { name: companyInfo.name, rif: companyInfo.rif, period: 'octubre/2026' }) },
  async libroVentas() { await exportService.exportTable(libroVentas, 'VES', 'Libro_Ventas.xlsx', 'SENIAT', { name: companyInfo.name, rif: companyInfo.rif, period: 'octubre/2026' }) },
  async reporteGeneral() { await exportService.exportTable([...libroCompras, ...libroVentas], 'VES', 'Reporte_General.xlsx', 'GENERAL') },
  async facturaIndividual() { await exportService.exportInvoice(factura) },
  async plantillaBodega() {
    const blob = await generarPlantilla('bodega')
    salidas['Plantilla_bodega.xlsx'] = { base64: aBase64(await blob.arrayBuffer()) }
  },
  async inventarioValorizado() {
    await inventoryExportService.exportValuation([
      { code: 'HAR-001', name: 'Harina de maíz precocida 1 kg', unit: 'UND', stock: 120, cost_price: 1.5, sale_price: 2.5 },
      { code: 'ACE-002', name: 'Aceite vegetal 900 ml', unit: 'UND', stock: 48, cost_price: 3, sale_price: 4.2 },
    ], 'Bodega La Esquina Feliz, C.A.')
  },
  async kardex() {
    await inventoryExportService.exportMovements([
      { created_at: '2026-10-02T14:30:00Z', movement_type: 'IN_PURCHASE', products: { name: 'Harina de maíz precocida 1 kg' }, quantity: 100, description: 'Compra 00012345' },
      { created_at: '2026-10-03T09:10:00Z', movement_type: 'OUT_SALE', products: { name: 'Harina de maíz precocida 1 kg' }, quantity: -12, description: 'Venta 00000077' },
    ], 'Harina')
  },
  async resumenInventario() {
    await inventoryExportService.exportHorizontalSummary(
      [{ id: 'a', code: 'HAR-001', name: 'Harina de maíz precocida 1 kg' }],
      [{ product_id: 'a', created_at: '2026-10-02T14:30:00Z', movement_type: 'IN_PURCHASE', quantity: 100 }, { product_id: 'a', created_at: '2026-10-03T09:10:00Z', movement_type: 'OUT_SALE', quantity: -12 }],
      { start: '2026-10-01', end: '2026-10-31' },
    )
  },
  async expedientePapeles() {
    let mod
    for (let i = 0; i < 4 && !mod; i++) mod = await import('@/services/expediente-pdf-service.js').catch(async (e) => { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 800)) })
    await mod.generarExpedientePdf({
      ...papeles,
      docs: [
        { id: 'd1', category: 'SENIAT', doc_type: 'RIF', name: 'RIF de la empresa', status: 'VIGENTE', emission_date: '2024-01-10' },
        { id: 'd2', category: 'LEGAL', doc_type: 'REGISTRO_MERCANTIL', name: 'Registro Mercantil', status: 'VIGENTE', emission_date: '2020-05-03' },
        { id: 'd3', category: 'MUNICIPAL', doc_type: 'LICENCIA_ACTIVIDADES', name: 'Licencia de actividades económicas', status: 'TRAMITE', emission_date: '2026-03-15' },
      ],
      complianceDetail: { LEGAL: { covered: 1, total: 3, rate: 33 }, SENIAT: { covered: 2, total: 5, rate: 40 }, MUNICIPAL: { covered: 0, total: 2, rate: 0 } },
    })
  },
  async txtIva() {
    const txt = construirTxtIva({ cliente: { rif: companyInfo.rif }, retenciones: [{ ...retenciones.IVA, document_type: 'FACTURA', total: 122183.15, exento: 1500.5 }] })
    salidas['retenciones-iva.txt'] = { base64: btoa(unescape(encodeURIComponent(txt))) }
  },
  async xmlIslr() {
    const xml = construirXmlIslr({ cliente: { rif: companyInfo.rif }, periodo: '202610', retenciones: [{ ...retenciones.ISLR, codigo_seniat: '055' }] })
    salidas['retenciones-islr.xml'] = { base64: btoa(unescape(encodeURIComponent(xml))) }
  },
}

window.__generar = async function () {
  const errores = {}
  for (const [nombre, fn] of Object.entries(tareas)) {
    try { await fn() } catch (e) { errores[nombre] = String(e?.message || e) }
  }
  await new Promise((r) => setTimeout(r, 600))
  window.__errores = errores
  return errores
}
window.__listo = true
