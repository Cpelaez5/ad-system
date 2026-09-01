import { describe, it, expect, vi, beforeEach } from 'vitest';
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';

// Mock de dependencias para permitir instanciar o probar la lógica del componente
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] })
        })
      })
    })
  }
}));

vi.mock('@/services/invoiceService.js', () => ({ default: {} }));
vi.mock('@/services/userService.js', () => ({ default: { getCurrentUser: vi.fn() } }));
vi.mock('@/services/gemini/geminiOcrService.js', () => ({ procesarComprobanteOCR: vi.fn() }));
vi.mock('@/services/inventoryService.js', () => ({ default: {} }));
vi.mock('@/services/proveedorService.js', () => ({ default: {} }));
vi.mock('@/services/bcvService.js', () => ({ default: { getLatestRate: vi.fn() } }));
vi.mock('@/services/municipalConceptsService.js', () => ({ municipalConceptsService: {} }));

describe('SimpleInvoiceForm - Watcher de Invoice en Modo Edición', () => {

  it('asigna today como fallback estricto cuando una factura no tiene retentionDate (sin usar issueDate)', () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Factura histórica emitida hace 2 semanas sin retentionDate en financial
    const historicalInvoice = {
      id: 'inv-hist-1',
      invoice_number: 'FAC-001',
      issueDate: '2026-08-14',
      flow: 'COMPRA',
      expense_type: 'COMPRA',
      financial: {
        totalSales: 500,
        taxableSales: 400,
        taxDebit: 64,
        ivaRetention: 48
      },
      items: []
    };

    // Simulación directa del handler del watcher invoice
    const vm = {
      formData: null
    };

    const handler = SimpleInvoiceForm.watch.invoice.handler;
    handler.call(vm, historicalInvoice);

    expect(vm.formData).toBeDefined();
    // No debe usar issueDate ('2026-08-14')
    expect(vm.formData.financial.retentionDate).not.toBe('2026-08-14');
    // Debe usar today
    expect(vm.formData.financial.retentionDate).toBe(today);
  });

  it('preserva retentionDate existente en financial si la factura ya lo tiene configurado', () => {
    const existingInvoice = {
      id: 'inv-with-ret-date',
      invoice_number: 'FAC-002',
      issueDate: '2026-08-10',
      flow: 'COMPRA',
      expense_type: 'COMPRA',
      financial: {
        totalSales: 1000,
        taxableSales: 800,
        taxDebit: 128,
        ivaRetention: 96,
        retentionDate: '2026-08-25'
      },
      items: []
    };

    const vm = {
      formData: null
    };

    const handler = SimpleInvoiceForm.watch.invoice.handler;
    handler.call(vm, existingInvoice);

    expect(vm.formData).toBeDefined();
    expect(vm.formData.financial.retentionDate).toBe('2026-08-25');
  });

  it('actualiza correlativos en tiempo real si retentionDate cambia y retentionCorrelativoManuallyEdited es false', async () => {
    const vm = {
      retencionesResult: { iva: 48, islr: 10, municipal: 5 },
      retentionCorrelativoManuallyEdited: false,
      sugerirCorrelativosRetencion: vi.fn()
    };

    const retentionDateWatcher = SimpleInvoiceForm.watch['formData.financial.retentionDate'];
    retentionDateWatcher.call(vm, '2026-09-01');

    expect(vm.sugerirCorrelativosRetencion).toHaveBeenCalledWith(48, 10, 5);
  });

  it('bloquea la sugerencia de correlativos si el usuario activó la edición manual (retentionCorrelativoManuallyEdited = true)', async () => {
    const vm = {
      retencionesResult: { iva: 48, islr: 10, municipal: 5 },
      retentionCorrelativoManuallyEdited: true,
      sugerirCorrelativosRetencion: vi.fn()
    };

    const retentionDateWatcher = SimpleInvoiceForm.watch['formData.financial.retentionDate'];
    retentionDateWatcher.call(vm, '2026-09-01');

    expect(vm.sugerirCorrelativosRetencion).not.toHaveBeenCalled();
  });
});
