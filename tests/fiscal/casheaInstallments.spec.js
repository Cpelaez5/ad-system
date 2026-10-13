/**
 * TESTS GOLDEN (caracterización) — Cashea (pago inicial + cuotas).
 * F1 Red de seguridad, Agente Fiscal Venezuela.
 *
 * Métodos probados (SimpleInvoiceForm.vue, invocados con `.call(vm, ...)`):
 *   - onInitialPercentageChange()
 *   - onInitialAmountChange()
 *   - generateInstallments()
 *
 * Datos inventados. Montos y fechas ficticios.
 */
import { describe, it, expect, vi } from 'vitest';
// SimpleInvoiceForm.vue ahora importa retention-pdf-service.js (modo simple, botón
// "Descargar comprobante"), que a su vez importa el logo con una ruta absoluta
// ('/ADSystem/logo.png'); sin este mock, Vitest intenta resolverla como archivo real
// y falla en Windows. Mismo mock que ya usan otros specs que tocan ese servicio.
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';

function buildVm(overrides = {}) {
  return {
    formData: {
      issueDate: '2026-09-01',
      financial: {
        totalSales: 1000,
        currency: 'VES',
        credit: {
          initialAmount: 0,
          initialPercentage: 40,
          initialStatus: 'POR_COBRAR',
          installmentsCount: 3,
          installments: []
        }
      }
    },
    checkAllInstallmentsPaid: vi.fn(),
    ...overrides
  };
}

describe('SimpleInvoiceForm — Cashea: pago inicial', () => {
  it('onInitialPercentageChange() calcula initialAmount a partir del % sobre totalSales', () => {
    const vm = buildVm();
    vm.generateInstallments = vi.fn();

    SimpleInvoiceForm.methods.onInitialPercentageChange.call(vm);

    // 1000 * 40% = 400
    expect(vm.formData.financial.credit.initialAmount).toBe(400);
    expect(vm.generateInstallments).toHaveBeenCalled();
  });

  it('onInitialAmountChange() calcula initialPercentage a partir del monto sobre totalSales', () => {
    const vm = buildVm();
    vm.generateInstallments = vi.fn();
    vm.formData.financial.credit.initialAmount = 250;

    SimpleInvoiceForm.methods.onInitialAmountChange.call(vm);

    // 250 / 1000 * 100 = 25
    expect(vm.formData.financial.credit.initialPercentage).toBe(25);
    expect(vm.generateInstallments).toHaveBeenCalled();
  });
});

describe('SimpleInvoiceForm — Cashea: generación de cuotas (generateInstallments)', () => {
  it('reparte el remanente (total - inicial) en partes iguales entre las cuotas', () => {
    const vm = buildVm();
    vm.formData.financial.totalSales = 1000;
    vm.formData.financial.credit.initialAmount = 400; // 40% inicial
    vm.formData.financial.credit.installmentsCount = 3;

    SimpleInvoiceForm.methods.generateInstallments.call(vm);

    const insts = vm.formData.financial.credit.installments;
    expect(insts).toHaveLength(3);
    // Remanente = 600 / 3 = 200 exactos (sin ajuste de redondeo necesario)
    expect(insts.map(i => i.amount)).toEqual([200, 200, 200]);
    // La suma de cuotas debe reconstruir el remanente exacto
    expect(insts.reduce((s, i) => s + i.amount, 0)).toBe(600);
  });

  it('ajusta la última cuota para absorber el residuo de redondeo (division no exacta)', () => {
    const vm = buildVm();
    vm.formData.financial.totalSales = 1000;
    vm.formData.financial.credit.initialAmount = 400;
    vm.formData.financial.credit.installmentsCount = 3;
    // Remanente = 600, pero forzamos un total no divisible exacto cambiando el total
    vm.formData.financial.totalSales = 1001; // remanente = 601 → 601/3 = 200.333...
    vm.formData.financial.credit.initialAmount = 400;

    SimpleInvoiceForm.methods.generateInstallments.call(vm);

    const insts = vm.formData.financial.credit.installments;
    // 601 / 3 = 200.33 (redondeado a 200.33), las 2 primeras iguales,
    // la última absorbe la diferencia para que la suma cierre exacta en 601.
    expect(insts[0].amount).toBe(200.33);
    expect(insts[1].amount).toBe(200.33);
    const total = insts.reduce((s, i) => s + i.amount, 0);
    expect(Number(total.toFixed(2))).toBe(601);
  });

  it('las fechas de cuota se calculan cada 14 días desde la fecha de emisión (issueDate)', () => {
    const vm = buildVm();
    vm.formData.issueDate = '2026-09-01';
    vm.formData.financial.totalSales = 900;
    vm.formData.financial.credit.initialAmount = 300;
    vm.formData.financial.credit.installmentsCount = 3;

    SimpleInvoiceForm.methods.generateInstallments.call(vm);

    const insts = vm.formData.financial.credit.installments;
    expect(insts[0].date).toBe('2026-09-15'); // +14 días
    expect(insts[1].date).toBe('2026-09-29'); // +28 días
    expect(insts[2].date).toBe('2026-10-13'); // +42 días
  });

  it('preserva el status PAGADA de una cuota existente al regenerar (no reinicia cobros ya hechos)', () => {
    const vm = buildVm();
    vm.formData.financial.totalSales = 900;
    vm.formData.financial.credit.initialAmount = 300;
    vm.formData.financial.credit.installmentsCount = 3;
    vm.formData.financial.credit.installments = [
      { id: 1, date: '2026-09-15', amount: 200, status: 'PAGADA' },
      { id: 2, date: '2026-09-29', amount: 200, status: 'POR_COBRAR' }
    ];

    SimpleInvoiceForm.methods.generateInstallments.call(vm);

    const insts = vm.formData.financial.credit.installments;
    expect(insts[0].status).toBe('PAGADA');
    expect(insts[1].status).toBe('POR_COBRAR');
    expect(insts[2].status).toBe('POR_COBRAR'); // cuota nueva, default
  });

  it(
    // REVISAR CON CONTADORA: según GEMINI.md ("Contexto de negocio: Cashea"),
    // CADA pago (inicial y cada cuota) puede pagarse en una MONEDA DISTINTA
    // (USD o Bs) y debe usar la tasa BCV vigente en la fecha de ESE pago
    // específico. generateInstallments() actual NO guarda ningún campo de
    // moneda ni de tasa de cambio por cuota: cada objeto de cuota solo tiene
    // { id, date, amount, status }. Toda la factura usa una única
    // `formData.financial.currency` / `exchangeRate` global (ver CasheaInstallmentsModal.vue,
    // computed `credit()`, que también expone una sola `currency` para todo
    // el plan). Este test fija el comportamiento ACTUAL: las cuotas generadas
    // NO tienen currency ni exchangeRate propios, aunque el negocio permite
    // que cada cuota se cobre en una moneda distinta.
    'las cuotas generadas NO tienen un campo de moneda/tasa propio: solo heredan la moneda única de la factura',
    () => {
      const vm = buildVm();
      vm.formData.financial.currency = 'USD';
      vm.formData.financial.totalSales = 300;
      vm.formData.financial.credit.initialAmount = 100;
      vm.formData.financial.credit.installmentsCount = 2;

      SimpleInvoiceForm.methods.generateInstallments.call(vm);

      const insts = vm.formData.financial.credit.installments;
      insts.forEach(inst => {
        expect(inst).not.toHaveProperty('currency');
        expect(inst).not.toHaveProperty('exchangeRate');
        expect(Object.keys(inst).sort()).toEqual(['amount', 'date', 'id', 'status']);
      });
    }
  );

  it('no hace nada si financial.credit es null (sin método Cashea activo)', () => {
    const vm = buildVm({
      formData: {
        issueDate: '2026-09-01',
        financial: { totalSales: 1000, currency: 'VES', credit: null }
      }
    });

    expect(() => SimpleInvoiceForm.methods.generateInstallments.call(vm)).not.toThrow();
    expect(vm.formData.financial.credit).toBeNull();
  });
});
