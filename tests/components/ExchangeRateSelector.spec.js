import { describe, it, expect, vi } from 'vitest';
// SimpleInvoiceForm.vue ahora importa retention-pdf-service.js (modo simple, botón
// "Descargar comprobante"), que a su vez importa el logo con una ruta absoluta
// ('/ADSystem/logo.png'); sin este mock, Vitest intenta resolverla como archivo real
// y falla en Windows. Mismo mock que ya usan otros specs que tocan ese servicio.
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';
import bcvService from '@/services/bcvService.js';

vi.mock('@/services/bcvService.js', () => ({
  default: {
    getCurrentRate: vi.fn(),
    getRateForDate: vi.fn()
  }
}));

describe('SimpleInvoiceForm - Manejo de Multi-Moneda y Tasa de Cambio Flexible (Punto 5)', () => {

  it('obtiene el valor de la tasa activa según la moneda seleccionada (USD vs EUR)', () => {
    const vm = {
      formData: {
        financial: {
          currency: 'USD',
          exchangeRate: 41.50,
          exchangeRateEur: 45.20
        }
      }
    };

    expect(SimpleInvoiceForm.computed.currentExchangeRateValue.call(vm)).toBe(41.50);

    vm.formData.financial.currency = 'EUR';
    expect(SimpleInvoiceForm.computed.currentExchangeRateValue.call(vm)).toBe(45.20);
  });

  it('calcula con precisión el equivalente en Bolívares en tiempo real', () => {
    const vm = {
      formData: {
        financial: {
          currency: 'USD',
          totalSales: 100,
          exchangeRate: 41.50
        }
      }
    };

    // 100 USD * 41.50 = 4150 Bs
    expect(SimpleInvoiceForm.computed.equivalentInBs.call(vm)).toBe(4150);

    // Si cambia el total
    vm.formData.financial.totalSales = 250.50;
    expect(SimpleInvoiceForm.computed.equivalentInBs.call(vm)).toBeCloseTo(10395.75, 2);
  });

  it('permite aplicar manualmente una tasa personalizada y actualiza la etiqueta de origen', () => {
    const vm = {
      formData: {
        financial: {
          currency: 'USD',
          exchangeRate: 40.00
        }
      },
      rateSourceLabel: 'BCV hoy',
      guardarTasaDeMonedaActual: SimpleInvoiceForm.methods.guardarTasaDeMonedaActual
    };
    vm.guardarTasaDeMonedaActual = vm.guardarTasaDeMonedaActual.bind(vm);

    SimpleInvoiceForm.methods.onManualExchangeRateChange.call(vm, 42.10);

    expect(vm.formData.financial.exchangeRate).toBe(42.10);
    expect(vm.formData.financial.tasas.USD).toBe(42.10);
    expect(vm.rateSourceLabel).toBe('Tasa manual personalizada');
  });

  it('una tasa manual de yuan queda en financial.tasas.CNY sin tocar la del dólar', () => {
    const vm = {
      formData: { financial: { currency: 'CNY', exchangeRate: 40, tasas: { USD: 40 } } },
      rateSourceLabel: '',
      guardarTasaDeMonedaActual: null
    };
    vm.guardarTasaDeMonedaActual = SimpleInvoiceForm.methods.guardarTasaDeMonedaActual.bind(vm);

    SimpleInvoiceForm.methods.onManualExchangeRateChange.call(vm, '5,6'.replace(',', '.'));

    expect(vm.formData.financial.exchangeRate).toBe(40);
    expect(vm.formData.financial.tasas).toEqual({ USD: 40, CNY: 5.6 });
  });

  it('la tasa activa de una moneda "otra" sale de financial.tasas', () => {
    const vm = { formData: { financial: { currency: 'CNY', tasas: { CNY: 5.6 } } }, esOtraMoneda: true };
    expect(SimpleInvoiceForm.computed.currentExchangeRateValue.call(vm)).toBe(5.6);
  });

  it('construye financial.tasas con todas las tasas del día y las editadas por factura', () => {
    const hoy = new Date();
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const vm = {
      formData: {
        issueDate: iso,
        financial: { exchangeRate: 45, exchangeRateEur: 1, tasas: { CNY: 5.6 } }
      },
      tasasHoy: { USD: 40, EUR: 50, TRY: 1.2 }
    };
    const tasas = SimpleInvoiceForm.methods.construirTasasFactura.call(vm);
    // USD editada para esta factura (45), EUR vigente (la de la factura = 1 es relleno), CNY escrita, TRY vigente
    expect(tasas).toEqual({ USD: 45, EUR: 50, TRY: 1.2, CNY: 5.6 });

    // Factura de otro día: no se le pegan las tasas de hoy
    vm.formData.issueDate = '2020-01-01';
    expect(SimpleInvoiceForm.methods.construirTasasFactura.call(vm)).toEqual({ USD: 45, CNY: 5.6 });
  });

  it('el botón Tasa Fecha Factura consulta la tasa histórica exacta de la fecha emitida', async () => {
    bcvService.getRateForDate.mockResolvedValueOnce({
      success: true,
      data: { dollar: 772.54, euro: 894.49, date: '2026-08-15' }
    });

    const vm = {
      formData: {
        issueDate: '2026-08-15',
        financial: {
          currency: 'USD',
          exchangeRate: 0,
          exchangeRateEur: null
        }
      },
      rateSourceLabel: '',
      isEditingExchangeRate: true,
      formatDateReadable: SimpleInvoiceForm.methods.formatDateReadable,
      fetchExchangeRate: null,
      showSnackbar: vi.fn()
    };
    vm.fetchExchangeRate = function(date, isManualToday, isUserClick) {
      return SimpleInvoiceForm.methods.fetchExchangeRate.call(vm, date, isManualToday, isUserClick);
    };

    await SimpleInvoiceForm.methods.applyInvoiceDateRate.call(vm);

    expect(bcvService.getRateForDate).toHaveBeenCalledWith('2026-08-15');
    expect(vm.formData.financial.exchangeRate).toBe(772.54);
    expect(vm.formData.financial.exchangeRateEur).toBe(894.49);
    expect(vm.rateSourceLabel).toBe('BCV al 15/08/2026');
    expect(vm.isEditingExchangeRate).toBe(false);
  });

  it('aplica la tasa de la semana si la fecha es fin de semana y notifica amigablemente al cliente', async () => {
    // Supongamos que 2026-08-16 era domingo y no hubo cotización
    bcvService.getRateForDate.mockResolvedValueOnce({
      success: true,
      data: {
        dollar: 772.54,
        euro: 894.49,
        approximate: true,
        closestDate: '2026-08-15',
        requestedDate: '2026-08-16'
      }
    });

    const vm = {
      formData: {
        issueDate: '2026-08-16',
        financial: {
          currency: 'EUR',
          exchangeRate: 0,
          exchangeRateEur: 0
        }
      },
      rateSourceLabel: '',
      isEditingExchangeRate: true,
      formatDateReadable: SimpleInvoiceForm.methods.formatDateReadable,
      fetchExchangeRate: null,
      showSnackbar: vi.fn()
    };
    vm.fetchExchangeRate = function(date, isManualToday, isUserClick) {
      return SimpleInvoiceForm.methods.fetchExchangeRate.call(vm, date, isManualToday, isUserClick);
    };

    await SimpleInvoiceForm.methods.applyInvoiceDateRate.call(vm);

    expect(vm.formData.financial.exchangeRateEur).toBe(894.49);
    expect(vm.rateSourceLabel).toBe('BCV al 15/08/2026');
    // Verifica que el snackbar explique de forma amigable que fue fin de semana
    expect(vm.showSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('fin de semana o feriado'),
      'info',
      6000
    );
  });

  it('notifica amigablemente si no existe tasa registrada para la fecha ni su semana y abre el editor manual', async () => {
    bcvService.getRateForDate.mockResolvedValueOnce({
      success: false,
      error: 'Tasa no encontrada para esta fecha'
    });

    const vm = {
      formData: {
        issueDate: '2023-01-01',
        financial: {
          currency: 'USD',
          exchangeRate: 35.00
        }
      },
      rateSourceLabel: '',
      isEditingExchangeRate: false,
      formatDateReadable: SimpleInvoiceForm.methods.formatDateReadable,
      fetchExchangeRate: null,
      showSnackbar: vi.fn()
    };
    vm.fetchExchangeRate = function(date, isManualToday, isUserClick) {
      return SimpleInvoiceForm.methods.fetchExchangeRate.call(vm, date, isManualToday, isUserClick);
    };

    await SimpleInvoiceForm.methods.applyInvoiceDateRate.call(vm);

    // No debe sobreescribir la tasa con la de hoy
    expect(vm.formData.financial.exchangeRate).toBe(35.00);
    expect(vm.rateSourceLabel).toBe('Sin registro oficial para esta fecha');
    expect(vm.isEditingExchangeRate).toBe(true);
    expect(vm.showSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('No se encontró tasa oficial registrada'),
      'warning',
      6000
    );
  });

  it('el botón Tasa de Hoy consulta la tasa actual en vivo del BCV', async () => {
    bcvService.getCurrentRate.mockResolvedValueOnce({
      success: true,
      data: { dollar: 832.48, euro: 968.06 }
    });

    const vm = {
      formData: {
        issueDate: '2026-08-15',
        financial: {
          currency: 'USD',
          exchangeRate: 772.54
        }
      },
      rateSourceLabel: '',
      isEditingExchangeRate: true,
      fetchExchangeRate: null,
      showSnackbar: vi.fn(),
      modoTasa: 'automatica',
      tasasHoy: {}
    };
    vm.fetchExchangeRate = function(date, isManualToday, isUserClick) {
      return SimpleInvoiceForm.methods.fetchExchangeRate.call(vm, date, isManualToday, isUserClick);
    };
    vm.obtenerTasaVigente = SimpleInvoiceForm.methods.obtenerTasaVigente.bind(vm);

    await SimpleInvoiceForm.methods.applyTodayRate.call(vm);

    expect(bcvService.getCurrentRate).toHaveBeenCalled();
    expect(vm.formData.financial.exchangeRate).toBe(832.48);
    expect(vm.formData.financial.exchangeRateEur).toBe(968.06);
    expect(vm.formData.financial.tasas).toEqual({ USD: 832.48, EUR: 968.06 });
    expect(vm.rateSourceLabel).toBe('BCV oficial hoy');
    expect(vm.isEditingExchangeRate).toBe(false);
  });

  it('maneja fechas pasadas como objeto Date sin fallar en split ni en la consulta', async () => {
    bcvService.getRateForDate.mockResolvedValueOnce({
      success: true,
      data: { dollar: 772.54, euro: 894.49, date: '2026-08-15' }
    });

    const dateObj = new Date(2026, 7, 15); // 15 de agosto 2026
    const vm = {
      formData: {
        issueDate: dateObj,
        financial: {
          currency: 'EUR',
          exchangeRate: 0,
          exchangeRateEur: null
        }
      },
      rateSourceLabel: '',
      isEditingExchangeRate: false,
      normalizeDateToYMD: SimpleInvoiceForm.methods.normalizeDateToYMD,
      formatDateReadable: SimpleInvoiceForm.methods.formatDateReadable,
      fetchExchangeRate: null,
      showSnackbar: vi.fn()
    };
    vm.fetchExchangeRate = function(date, isManualToday, isUserClick) {
      return SimpleInvoiceForm.methods.fetchExchangeRate.call(vm, date, isManualToday, isUserClick);
    };

    await SimpleInvoiceForm.methods.applyInvoiceDateRate.call(vm);

    expect(bcvService.getRateForDate).toHaveBeenCalledWith('2026-08-15');
    expect(vm.formData.financial.exchangeRateEur).toBe(894.49);
    expect(vm.rateSourceLabel).toBe('BCV al 15/08/2026');
  });
});
