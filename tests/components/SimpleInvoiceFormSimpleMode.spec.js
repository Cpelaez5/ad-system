/**
 * Modo simple de SimpleInvoiceForm.vue (prop `simple`, ver docs/mvp/diseno/fase2-spec.md §3).
 *
 * Con simple=false el formulario debe verse EXACTAMENTE igual que hoy (lo usa
 * Facturacion.vue): estos tests solo confirman que el paso 1 del asistente no
 * aparece en ese caso. El resto de la cobertura de simple=false ya la fijan
 * tests/components/SimpleInvoiceForm.spec.js y tests/fiscal/*.
 *
 * Con simple=true (lo usa src/views/cliente/Inicio.vue) se prueba:
 *   - Paso 1 "¿Tienes la factura?" visible con sus 3 opciones.
 *   - "No tengo factura" avanza al paso 2 con documentType = RECIBO (sin OCR).
 *   - Paso 2 muestra los 4 campos según el flujo (COMPRA vs VENTA).
 *   - "Ver detalles contables" está presente pero colapsado (eager: el resto
 *     del formulario sigue montado para que los cálculos no se rompan).
 *
 * Se usa shallowMount (no se instala el plugin de Vuetify real, mismo criterio
 * que tests/components/ClienteBottomNav.spec.js) para no depender de los
 * hijos reales (OCR, autocompletados, etc.) y centrarnos en el aspecto
 * presentacional del modo simple.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';

// SimpleInvoiceForm.vue importa retention-pdf-service.js (botón "Descargar
// comprobante" de la pantalla de éxito), que a su vez importa el logo con
// rutas absolutas; sin estos mocks, Vitest intenta resolverlas como archivos
// reales y falla en Windows (mismo mock que usan otros specs del repo).
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] })
        })
      })
    })
  }
}));

vi.mock('@/services/invoiceService.js', () => ({ default: {} }));
vi.mock('@/services/userService.js', () => ({
  default: { getCurrentUser: vi.fn().mockResolvedValue(null) }
}));
vi.mock('@/services/gemini/geminiOcrService.js', () => ({ procesarComprobanteOCR: vi.fn() }));
vi.mock('@/services/inventoryService.js', () => ({ default: {} }));
vi.mock('@/services/proveedorService.js', () => ({ default: {} }));
vi.mock('@/services/bcvService.js', () => ({
  default: {
    getCurrentRate: vi.fn().mockResolvedValue({ success: true, data: { dollar: 40 } }),
    getRateForDate: vi.fn().mockResolvedValue({ success: true, data: { dollar: 40 } })
  }
}));
vi.mock('@/services/municipalConceptsService.js', () => ({ municipalConceptsService: {} }));
vi.mock('@/services/venezuelaLocationsService.js', () => ({ default: {} }));
vi.mock('@/services/retention-pdf-service.js', () => ({ default: {} }));

import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';

function montar(props = {}) {
  return shallowMount(SimpleInvoiceForm, {
    props: { flow: 'COMPRA', simple: true, ...props },
    global: {
      // TarjetaAccion/PasoGuiado/AyudaTermino son envoltorios livianos (sin
      // llamadas a servicios) que renderizan sus props como texto (titulo,
      // subtitulo...); se dejan "reales" para poder verificar los textos del
      // modo simple. El resto de hijos (OCR, autocompletados, etc.) se
      // auto-stubean (comportamiento por defecto de shallowMount).
      stubs: { TarjetaAccion: false, PasoGuiado: false, AyudaTermino: false, EnvolturaDetallesContables: false },
      // No se instala el plugin de Vuetify real (mismo criterio que
      // tests/components/ClienteBottomNav.spec.js): AyudaTermino usa
      // $vuetify.display.mobile para elegir bottom-sheet vs. menú, así que
      // se mockea para que no explote al quedar "real" arriba.
      mocks: { $vuetify: { display: { mobile: false, xs: false, smAndDown: false } } }
    }
  });
}

describe('SimpleInvoiceForm — modo simple (fase2-spec.md §3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('con simple=true muestra el paso 1 "¿Tienes la factura?" con sus 3 opciones', async () => {
    const wrapper = montar({ flow: 'COMPRA' });
    await flushPromises();

    expect(wrapper.vm.simpleStep).toBe(1);
    const texto = wrapper.text();
    expect(texto).toContain('¿Tienes la factura o el recibo?');
    expect(texto).toContain('Tomarle foto');
    expect(texto).toContain('Subir archivo');
    expect(texto).toContain('No tengo factura');

    wrapper.unmount();
  });

  it('"No tengo factura" avanza al paso 2 con documentType RECIBO, sin pasar por el OCR', async () => {
    const wrapper = montar({ flow: 'COMPRA' });
    await flushPromises();

    expect(wrapper.vm.formData.documentType).not.toBe('RECIBO');

    wrapper.vm.simpleSinFactura();
    await flushPromises();

    expect(wrapper.vm.formData.documentType).toBe('RECIBO');
    expect(wrapper.vm.simpleStep).toBe(2);
    expect(wrapper.text()).toContain('Confirma estos datos');

    wrapper.unmount();
  });

  it('paso 2 (COMPRA) muestra los 4 campos: a quién le pagaste, cuánto, cuándo, en qué', async () => {
    const wrapper = montar({ flow: 'COMPRA' });
    await flushPromises();
    wrapper.vm.simpleSinFactura();
    await flushPromises();

    const texto = wrapper.text();
    expect(texto).toContain('¿A quién le pagaste?');
    expect(texto).toContain('¿Cuánto?');
    expect(texto).toContain('¿Cuándo?');
    expect(texto).toContain('¿En qué?');

    wrapper.unmount();
  });

  it('paso 2 (VENTA) muestra los 4 campos: a quién le vendiste, cuánto, cuándo, cómo te pagaron', async () => {
    const wrapper = montar({ flow: 'VENTA' });
    await flushPromises();
    wrapper.vm.simpleSinFactura();
    await flushPromises();

    const texto = wrapper.text();
    expect(texto).toContain('¿A quién le vendiste?');
    expect(texto).toContain('¿Cuánto?');
    expect(texto).toContain('¿Cuándo?');
    expect(texto).toContain('¿Cómo te pagaron?');

    wrapper.unmount();
  });

  it('en paso 2 "Ver detalles contables" está presente pero colapsado (eager: sigue montado)', async () => {
    const wrapper = montar({ flow: 'COMPRA' });
    await flushPromises();
    wrapper.vm.simpleSinFactura();
    await flushPromises();

    // El acordeón existe y arranca cerrado...
    expect(wrapper.text()).toContain('Ver detalles contables');
    expect(wrapper.vm.simpleDetailsOpen).toBe(false);

    // ...pero su contenido (el resto del formulario de siempre) sigue montado
    // en el DOM (eager), para que cálculos/validaciones no se rompan.
    expect(wrapper.text()).toContain('Productos o servicios');
    expect(wrapper.text()).toContain('Totales');

    wrapper.unmount();
  });

  it('con simple=false NO aparece el paso 1 (el formulario se ve igual que siempre)', async () => {
    const wrapper = montar({ flow: 'COMPRA', simple: false });
    await flushPromises();

    const texto = wrapper.text();
    expect(texto).not.toContain('¿Tienes la factura o el recibo?');
    expect(texto).not.toContain('Tomarle foto');
    expect(texto).toContain('Nuevo Registro');

    wrapper.unmount();
  });
});
