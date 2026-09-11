import { describe, it, expect, vi } from 'vitest';
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';

describe('SimpleInvoiceForm - Cálculo Automático de Totales en Modo Manual (Punto 3)', () => {

  it('suma automáticamente Base + IVA + Exento en modo manual sin necesidad de calculadora externa', () => {
    const vm = {
      manualMode: true,
      manualTotalOverride: false,
      formData: {
        financial: {
          taxableSales: 100,
          taxDebit: 16,
          nonTaxableSales: 20,
          igtf: 0,
          totalSales: 0
        }
      },
      calcularRetenciones: vi.fn()
    };

    // Ejecutar calculateTotals
    SimpleInvoiceForm.methods.calculateTotals.call(vm);

    // 100 + 16 + 20 = 136.00
    expect(vm.formData.financial.totalSales).toBe(136);
    expect(vm.calcularRetenciones).toHaveBeenCalled();
  });

  it('actualiza el Total automáticamente al cambiar taxableSales en modo manual', () => {
    const vm = {
      manualMode: true,
      manualTotalOverride: false,
      formData: {
        financial: {
          taxableSales: 200,
          taxDebit: 32,
          nonTaxableSales: 50,
          igtf: 0,
          totalSales: 0
        }
      },
      calcularRetenciones: vi.fn(),
      calculateTotals: null
    };
    vm.calculateTotals = function() {
      SimpleInvoiceForm.methods.calculateTotals.call(vm);
    };

    // Simular evento onTaxableSalesChange
    SimpleInvoiceForm.methods.onTaxableSalesChange.call(vm, 250);

    expect(vm.formData.financial.taxableSales).toBe(250);
    // 250 + 32 + 50 = 332
    expect(vm.formData.financial.totalSales).toBe(332);
  });

  it('permite sobreescribir el total manualmente y detecta discrepancia con la suma', () => {
    const vm = {
      manualMode: true,
      manualTotalOverride: false,
      formData: {
        financial: {
          taxableSales: 100,
          taxDebit: 16,
          nonTaxableSales: 0,
          igtf: 0,
          totalSales: 116
        }
      },
      calcularRetenciones: vi.fn()
    };

    // Al inicio no hay discrepancia (100 + 16 = 116)
    expect(SimpleInvoiceForm.computed.hasManualTotalDiscrepancy.call(vm)).toBe(false);

    // Usuario sobreescribe el total a 115 por redondeo del emisor en factura física
    SimpleInvoiceForm.methods.onManualTotalInput.call(vm, 115);

    expect(vm.manualTotalOverride).toBe(true);
    expect(vm.formData.financial.totalSales).toBe(115);
    // Ahora hay discrepancia porque 116 != 115
    expect(SimpleInvoiceForm.computed.hasManualTotalDiscrepancy.call(vm)).toBe(true);
  });

  it('el botón Auto-sumar (recalculateTotalFromParts) restablece la suma automática y elimina la discrepancia', () => {
    const vm = {
      manualMode: true,
      manualTotalOverride: true,
      formData: {
        financial: {
          taxableSales: 100,
          taxDebit: 16,
          nonTaxableSales: 5,
          igtf: 0,
          totalSales: 115 // Discrepante con 121
        }
      },
      calcularRetenciones: vi.fn(),
      calculateTotals: null
    };
    vm.calculateTotals = function() {
      SimpleInvoiceForm.methods.calculateTotals.call(vm);
    };

    expect(SimpleInvoiceForm.computed.hasManualTotalDiscrepancy.call(vm)).toBe(true);

    // Clic en [Auto-sumar]
    SimpleInvoiceForm.methods.recalculateTotalFromParts.call(vm);

    expect(vm.manualTotalOverride).toBe(false);
    expect(vm.formData.financial.totalSales).toBe(121);
    expect(SimpleInvoiceForm.computed.hasManualTotalDiscrepancy.call(vm)).toBe(false);
  });
});
