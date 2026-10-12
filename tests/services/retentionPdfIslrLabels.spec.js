/**
 * C2 (2026-10-13) — docs/mvp/backlog-contadora-2026-10-12.md puntos 2 y 3:
 * El comprobante PDF de retención de ISLR debe:
 *  1. Incluir un renglón con el monto TOTAL de la factura (con IVA) ANTES del
 *     sustraendo.
 *  2. Cambiar la etiqueta "Cantidad Pagada" por "Monto Total Factura".
 *  3. Mantener la etiqueta "Impuesto Retenido".
 *  4. Cambiar "Total Retención" por "Neto a Pagar" (= total factura - retención ISLR).
 *
 * retention-pdf-service.js no es una función pura: dibuja directamente sobre un
 * documento jsPDF y lo descarga (no retorna los valores calculados). Para
 * verificar las ETIQUETAS y el VALOR que realmente dibuja, sin acoplarse a
 * coordenadas de dibujo ni a la implementación interna de la librería jsPDF
 * (que asigna sus métodos como propiedades propias de la instancia, no del
 * prototipo, lo que impide espiar con vi.spyOn), se mockea el módulo 'jspdf'
 * con un stub mínimo que registra cada llamada a `text(label, x, y)`.
 */
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { textCalls } = vi.hoisted(() => ({ textCalls: [] }));

vi.mock('jspdf', () => {
  class MockJsPDF {
    constructor() {
      this.internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
    }
    setFillColor() {} setDrawColor() {} setLineWidth() {} setFont() {} setFontSize() {} setTextColor() {}
    rect() {} line() {}
    text(...args) { textCalls.push(args); }
    splitTextToSize(text) { return [String(text)]; }
    getTextWidth(str) { return String(str || '').length * 1.5; }
    addImage() {}
    save() {}
  }
  return { jsPDF: MockJsPDF };
});

// Mock de supabase encadenable genérico: fetchRetentionData() y resolveParties()
// encadenan .select().eq().eq().is().maybeSingle() (o variantes más cortas); un
// objeto que se devuelve a sí mismo en cada método cubre cualquier combinación.
function makeChainable(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(result),
    single: () => Promise.resolve(result)
  };
  return chain;
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => makeChainable({ data: null, error: null }))
  }
}));

vi.mock('@/services/seal-service.js', () => ({
  default: { getSealConfig: vi.fn().mockResolvedValue(null) }
}));

import retentionPdfService from '@/services/retention-pdf-service.js';

describe('retentionPdfService.generarComprobanteISLR() — etiquetas y cálculo del Neto a Pagar (C2)', () => {
  const OriginalImage = global.Image;

  beforeEach(() => {
    textCalls.length = 0;
    // El servicio intenta cargar el logo/marca de agua con `new Image()`. En el
    // entorno de pruebas (happy-dom) esa carga nunca resuelve (no hay red real),
    // lo que colgaría el test indefinidamente. Se reemplaza por un stub que
    // dispara onerror en el siguiente microtask, igual que pasaría sin conexión.
    global.Image = class {
      set src(_v) { queueMicrotask(() => { if (this.onerror) this.onerror(); }); }
    };
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  /** Busca el valor dibujado inmediatamente después de una etiqueta exacta. */
  function findValueAfterLabel(label) {
    const idx = textCalls.findIndex(args => args[0] === label);
    if (idx === -1) return undefined;
    return textCalls[idx + 1]?.[0];
  }

  it('dibuja "Monto Total Factura" (con IVA), mantiene "Impuesto Retenido" y cambia a "Neto a Pagar" calculado', async () => {
    const invoice = {
      id: 'inv-islr-1',
      flow: 'COMPRA',
      invoiceNumber: '00000099',
      controlNumber: '00-000099',
      issueDate: '2026-09-10',
      issuer: { razon_social: 'Proveedor Ficticio C.A.', rif: 'J-99999999-9' },
      financial: {
        totalSales: 1160, // incluye IVA (1000 base + 160 IVA)
        taxableSales: 1000,
        taxDebit: 160,
        islrRetention: 20
      }
    };

    await retentionPdfService.generarComprobanteISLR(invoice, {});

    const allLabels = textCalls.map(c => c[0]);

    // 1. Ya NO deben aparecer las etiquetas viejas
    expect(allLabels).not.toContain('Cantidad Pagada:');
    expect(allLabels).not.toContain('Total Retención:');

    // 2. "Monto Total Factura" con el total CON IVA (1160), dibujada ANTES del sustraendo
    expect(allLabels).toContain('Monto Total Factura:');
    expect(findValueAfterLabel('Monto Total Factura:')).toBe('1.160,00');

    const idxMontoTotal = allLabels.indexOf('Monto Total Factura:');
    const idxSustraendo = allLabels.indexOf('Sustraendo (Bs):');
    expect(idxMontoTotal).toBeGreaterThan(-1);
    expect(idxSustraendo).toBeGreaterThan(-1);
    expect(idxMontoTotal).toBeLessThan(idxSustraendo);

    // 3. Se mantiene "Impuesto Retenido (ISLR)"
    expect(allLabels).toContain('Impuesto Retenido (ISLR):');
    expect(findValueAfterLabel('Impuesto Retenido (ISLR):')).toBe('20,00');

    // 4. "Neto a Pagar" = total factura (1160) - retención ISLR (20) = 1140
    expect(allLabels).toContain('Neto a Pagar:');
    expect(findValueAfterLabel('Neto a Pagar:')).toBe('1.140,00');
  });
});
