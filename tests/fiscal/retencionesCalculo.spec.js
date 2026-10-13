/**
 * TESTS GOLDEN (caracterización) — F1 Red de seguridad, Agente Fiscal Venezuela.
 *
 * Fijan el comportamiento ACTUAL de los métodos de cálculo fiscal que viven
 * dentro de SimpleInvoiceForm.vue (no son funciones puras exportadas, pero son
 * métodos del objeto de opciones de Vue y se pueden invocar con `.call(vm, ...)`
 * sin montar el componente completo, igual que tests/components/SimpleInvoiceForm.spec.js
 * y tests/components/SimpleInvoiceTotalsCalculation.spec.js ya hacen en este repo).
 *
 * Datos 100% inventados (RIF, nombres y montos ficticios). No se copian datos
 * de examples/.
 *
 * IMPORTANTE: Esta tarea es de "red de seguridad": NO se corrige ningún cálculo,
 * solo se documenta el comportamiento actual. Donde el resultado parece
 * incorrecto según docs/mvp/manuales/04-agente-fiscal-venezuela.md se deja un
 * comentario `// REVISAR CON CONTADORA:` y se referencia en
 * docs/mvp/auditorias/fiscal-inventario.md.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// SimpleInvoiceForm.vue ahora importa retention-pdf-service.js (modo simple, botón
// "Descargar comprobante"), que a su vez importa el logo con una ruta absoluta
// ('/ADSystem/logo.png'); sin este mock, Vitest intenta resolverla como archivo real
// y falla en Windows. Mismo mock que ya usan otros specs que tocan ese servicio.
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));
import SimpleInvoiceForm from '@/components/forms/client/SimpleInvoiceForm.vue';
import proveedorService from '@/services/proveedorService.js';
import { municipalConceptsService } from '@/services/municipalConceptsService.js';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/services/proveedorService.js', () => ({
  default: {
    getISLRConcepts: vi.fn(),
    getRetentionConfig: vi.fn()
  }
}));

vi.mock('@/services/municipalConceptsService.js', () => ({
  municipalConceptsService: {
    getConcepts: vi.fn()
  }
}));

// La implementación real de supabaseClient.js crea un cliente real (con un URL
// placeholder si faltan las variables de entorno), lo que dispararía llamadas
// de red reales si se dejara sin mockear. Se mockea para que
// sugerirCorrelativosRetencion() se pueda probar de forma aislada y rápida.
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

// Conceptos ISLR ficticios (misma forma que el catálogo SENIAT real, valores inventados)
const CONCEPTO_PJ_SERVICIOS_2 = {
  id: 'concepto-pj-servicios',
  nombre: 'Servicios Generales a Personas Jurídicas (ficticio)',
  porcentaje_base: 100,
  porcentaje_retencion: 2.00,
  sustraendo_ut: 0,
  aplica_persona: 'JURIDICA'
};

const CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO = {
  id: 'concepto-pn-servicios',
  nombre: 'Servicios Generales a Personas Naturales (ficticio)',
  porcentaje_base: 100,
  porcentaje_retencion: 3.00,
  sustraendo_ut: 83.33, // U.T. ficticia, igual al catálogo SENIAT de ejemplo
  aplica_persona: 'NATURAL'
};

function buildVm(overrides = {}) {
  return {
    formData: {
      flow: 'COMPRA',
      issueDate: '2026-09-01',
      issuer: {},
      client: {},
      financial: {
        taxableSales: 0,
        nonTaxableSales: 0,
        taxDebit: 0,
        igtf: 0,
        totalSales: 0,
        ivaRetention: 0,
        islrRetention: 0,
        municipalRetention: 0,
        ivaRetentionNumber: '',
        islrRetentionNumber: '',
        municipalRetentionNumber: '',
        retentionDate: '2026-09-01'
      }
    },
    proveedor: { id: 'prov-ficticio-1' },
    retentionConfig: {
      aplicarIva: false, porcentajeIva: 75,
      aplicarIslr: false, conceptoIslr: null, conceptoIslrNombre: '', tipoPersona: 'JURIDICA',
      aplicarMunicipal: false, porcentajeMunicipal: 0,
      concepto_municipal_id: null, conceptoMunicipalNombre: ''
    },
    retencionesResult: null,
    // C6: valor UT ficticio para los tests (la implementación real consulta
    // configuracion_fiscal_global); solo se usa si tipoPersona === 'NATURAL'.
    valorUT: null,
    getValorUT: vi.fn().mockResolvedValue(0),
    // C7: estado de advertencia de municipio distinto (no bloquea, se puede confirmar)
    municipalMismatch: { detected: false, tenantNombre: '', issuerNombre: '' },
    municipalMismatchConfirmed: false,
    // C1: calcularRetenciones() llama a prefillFechaFiscal() al final; se aísla
    // aquí (igual que sugerirCorrelativosRetencion) para que estos tests se
    // queden en el cálculo de montos. prefillFechaFiscal() se prueba aparte.
    fechaFiscalManuallyEdited: false,
    prefillFechaFiscal: vi.fn(),
    editarComprobanteIva: false,
    editarComprobanteIslr: false,
    editarComprobanteMunicipal: false,
    retentionCorrelativoManuallyEdited: false,
    // Se aísla sugerirCorrelativosRetencion (llama a supabase.rpc) para que estos
    // tests se queden en el cálculo puro de montos, no en la numeración.
    sugerirCorrelativosRetencion: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('SimpleInvoiceForm.calculateFromBase() — IVA 16% sobre base imponible', () => {
  it('calcula el débito fiscal (IVA) como 16% exacto de la base imponible gravada', () => {
    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;
    vm.calcularRetenciones = vi.fn();
    vm.calculateTotals = vi.fn();

    SimpleInvoiceForm.methods.calculateFromBase.call(vm);

    expect(vm.formData.financial.taxDebit).toBe(160); // 1000 * 0.16
  });
});

describe('SimpleInvoiceForm.calculateTotals() — factura con parte exenta', () => {
  it('suma base gravada + exento + IVA + IGTF para el total, sin alterar la base exenta', () => {
    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;   // gravado
    vm.formData.financial.nonTaxableSales = 200; // exento (ej. alimentos, servicios exonerados)
    vm.formData.financial.taxDebit = 160;        // 16% de 1000
    vm.formData.financial.igtf = 0;
    vm.calcularRetenciones = vi.fn();

    SimpleInvoiceForm.methods.calculateTotals.call(vm);

    // 1000 (gravado) + 200 (exento) + 160 (IVA) + 0 (IGTF) = 1360
    expect(vm.formData.financial.totalSales).toBe(1360);
    expect(vm.formData.financial.nonTaxableSales).toBe(200); // el exento no se grava
    expect(vm.calcularRetenciones).toHaveBeenCalled();
  });
});

describe('SimpleInvoiceForm.calcularRetenciones() — Retención de IVA (contribuyente especial)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proveedorService.getISLRConcepts.mockResolvedValue([]);
    municipalConceptsService.getConcepts.mockResolvedValue({ success: true, data: [] });
  });

  it('retiene el 75% del IVA (16% de la base) cuando porcentajeIva = 75', async () => {
    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;
    vm.formData.financial.taxDebit = 160; // IVA 16% de 1000
    vm.retentionConfig.aplicarIva = true;
    vm.retentionConfig.porcentajeIva = 75;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    // 160 * 75% = 120
    expect(vm.formData.financial.ivaRetention).toBe(120);
  });

  it('retiene el 100% del IVA cuando porcentajeIva = 100', async () => {
    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;
    vm.formData.financial.taxDebit = 160;
    vm.retentionConfig.aplicarIva = true;
    vm.retentionConfig.porcentajeIva = 100;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.ivaRetention).toBe(160);
  });

  it('no retiene IVA si no hay proveedor seleccionado o el flujo no es COMPRA', async () => {
    const vmSinProveedor = buildVm({ proveedor: null });
    vmSinProveedor.retentionConfig.aplicarIva = true;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vmSinProveedor);

    expect(vmSinProveedor.retencionesResult).toBeNull();
    expect(vmSinProveedor.formData.financial.ivaRetention).toBe(0);

    const vmVenta = buildVm({ proveedor: { id: 'prov-x' } });
    vmVenta.formData.flow = 'VENTA';
    vmVenta.retentionConfig.aplicarIva = true;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vmVenta);
    expect(vmVenta.formData.financial.ivaRetention).toBe(0);
  });
});

describe('SimpleInvoiceForm.calcularRetenciones() — Retención de ISLR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    municipalConceptsService.getConcepts.mockResolvedValue({ success: true, data: [] });
  });

  it('Persona Jurídica, servicios 2%: retiene base × 2% directo (sin sustraendo)', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PJ_SERVICIOS_2]);

    const vm = buildVm();
    vm.formData.financial.taxableSales = 5000; // base imponible ficticia
    vm.retentionConfig.aplicarIslr = true;
    vm.retentionConfig.conceptoIslr = CONCEPTO_PJ_SERVICIOS_2.id;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    // 5000 * 100% (porcentaje_base) * 2% (porcentaje_retencion) = 100
    expect(vm.formData.financial.islrRetention).toBe(100);
    expect(vm.retentionConfig.conceptoIslrNombre).toBe(CONCEPTO_PJ_SERVICIOS_2.nombre);
  });

  it(
    // C6 (2026-10-13), antes REVISAR CON CONTADORA: la vista previa ahora replica
    // la regla del RPC SQL `registrar_compra_con_retenciones`
    // (docs/archivo/migrations-legacy/20260831_fix_retention_base_imponible_and_date.sql,
    // líneas ~247-253): para proveedores con tipo_persona = 'NATURAL' resta
    // sustraendo_ut * valor_ut (UT vigente), con piso en 0. Antes NO restaba nada
    // en el preview, lo que causaba que el monto mostrado fuera mayor al guardado.
    'Persona Natural con sustraendo_ut: la vista previa SÍ resta el sustraendo en UT, igual que el RPC de guardado',
    async () => {
      proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO]);

      const vm = buildVm();
      vm.formData.financial.taxableSales = 5000;
      vm.retentionConfig.aplicarIslr = true;
      vm.retentionConfig.conceptoIslr = CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO.id;
      vm.retentionConfig.tipoPersona = 'NATURAL';
      vm.getValorUT = vi.fn().mockResolvedValue(1); // UT ficticia = Bs. 1 (solo para el test)

      await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

      // 5000 * 100% * 3% = 150, menos sustraendo 83.33 UT * Bs. 1 = 83.33 → 66.67
      expect(vm.formData.financial.islrRetention).toBeCloseTo(66.67, 2);
      expect(vm.getValorUT).toHaveBeenCalled();
    }
  );

  it('Persona Natural: si el sustraendo supera la retención calculada, el monto nunca queda negativo (piso en 0)', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO]);

    const vm = buildVm();
    vm.formData.financial.taxableSales = 100; // base chica: 100 * 3% = 3, sustraendo >> 3
    vm.retentionConfig.aplicarIslr = true;
    vm.retentionConfig.conceptoIslr = CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO.id;
    vm.retentionConfig.tipoPersona = 'NATURAL';
    vm.getValorUT = vi.fn().mockResolvedValue(1);

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.islrRetention).toBe(0);
  });

  it('Persona Jurídica: no se resta sustraendo aunque el concepto lo tenga (solo aplica a NATURAL)', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO]);

    const vm = buildVm();
    vm.formData.financial.taxableSales = 5000;
    vm.retentionConfig.aplicarIslr = true;
    vm.retentionConfig.conceptoIslr = CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO.id;
    vm.retentionConfig.tipoPersona = 'JURIDICA';
    vm.getValorUT = vi.fn().mockResolvedValue(1);

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.islrRetention).toBe(150);
    expect(vm.getValorUT).not.toHaveBeenCalled();
  });

  it('no calcula ISLR si aplicarIslr es false aunque haya conceptoIslr asignado', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PJ_SERVICIOS_2]);

    const vm = buildVm();
    vm.formData.financial.taxableSales = 5000;
    vm.retentionConfig.aplicarIslr = false;
    vm.retentionConfig.conceptoIslr = CONCEPTO_PJ_SERVICIOS_2.id;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.islrRetention).toBe(0);
  });
});

describe('SimpleInvoiceForm.calcularRetenciones() — Retención Municipal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proveedorService.getISLRConcepts.mockResolvedValue([]);
  });

  it('calcula la retención municipal con el porcentaje del concepto seleccionado', async () => {
    municipalConceptsService.getConcepts.mockResolvedValue({
      success: true,
      data: [{ id: 'mun-1', porcentaje: 1.5, descripcion: 'Actividad comercial ficticia' }]
    });

    const vm = buildVm();
    vm.formData.financial.taxableSales = 2000;
    vm.retentionConfig.aplicarMunicipal = true;
    vm.retentionConfig.concepto_municipal_id = 'mun-1';

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    // 2000 * 1.5% = 30
    expect(vm.formData.financial.municipalRetention).toBe(30);
    expect(vm.retentionConfig.conceptoMunicipalNombre).toBe('Actividad comercial ficticia');
  });

  it(
    // C7 (2026-10-13), antes REVISAR CON CONTADORA: la decisión 16 de GEMINI.md
    // exige mismo municipio, pero la contadora pidió "advertir sin bloquear" (W5,
    // docs/mvp/backlog-cliente-whatsapp.md). Ahora calcularRetenciones() SÍ verifica
    // el municipio (venezuelaLocationsService.areSameMunicipality): si difieren, NO
    // aplica el monto por defecto (queda en 0) y expone vm.municipalMismatch para
    // que la UI muestre la advertencia; si el usuario confirma explícitamente
    // ("Continuar igual" → municipalMismatchConfirmed = true), se recalcula y el
    // monto se aplica igual.
    'advierte (y NO aplica por defecto) si el proveedor está en un municipio distinto al de la empresa; permite continuar si el usuario confirma',
    async () => {
      municipalConceptsService.getConcepts.mockResolvedValue({
        success: true,
        data: [{ id: 'mun-2', porcentaje: 2, descripcion: 'Servicios ficticios' }]
      });

      const vm = buildVm();
      vm.formData.financial.taxableSales = 1000;
      vm.retentionConfig.aplicarMunicipal = true;
      vm.retentionConfig.concepto_municipal_id = 'mun-2';
      vm.formData.client.municipio_id = 'm-chacao';
      vm.formData.issuer.municipio_id = 'm-baruta';

      await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

      // Por defecto NO se aplica el monto (se protege al usuario de un error fiscal)
      expect(vm.formData.financial.municipalRetention).toBe(0);
      expect(vm.municipalMismatch.detected).toBe(true);
      expect(vm.municipalMismatch.tenantNombre).toContain('Chacao');
      expect(vm.municipalMismatch.issuerNombre).toContain('Baruta');

      // El usuario confirma explícitamente que quiere continuar igual
      vm.municipalMismatchConfirmed = true;
      await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

      expect(vm.formData.financial.municipalRetention).toBe(20); // 1000 * 2%
    }
  );

  it('no advierte si el proveedor y la empresa están en el mismo municipio', async () => {
    municipalConceptsService.getConcepts.mockResolvedValue({
      success: true,
      data: [{ id: 'mun-2', porcentaje: 2, descripcion: 'Servicios ficticios' }]
    });

    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;
    vm.retentionConfig.aplicarMunicipal = true;
    vm.retentionConfig.concepto_municipal_id = 'mun-2';
    vm.formData.client.municipio_id = 'm-chacao';
    vm.formData.issuer.municipio_id = 'm-chacao';

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.municipalRetention).toBe(20);
    expect(vm.municipalMismatch.detected).toBe(false);
  });

  it('no calcula municipal si aplicarMunicipal es false', async () => {
    municipalConceptsService.getConcepts.mockResolvedValue({ success: true, data: [] });

    const vm = buildVm();
    vm.formData.financial.taxableSales = 1000;
    vm.retentionConfig.aplicarMunicipal = false;

    await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

    expect(vm.formData.financial.municipalRetention).toBe(0);
  });
});

describe('SimpleInvoiceForm.sugerirCorrelativosRetencion() — formato AAAAMM + correlativo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asigna el número sugerido por el RPC sugerir_correlativo_retencion cuando iva > 0 y no hay edición manual', async () => {
    supabase.rpc.mockResolvedValue({ data: '20260900014492' });

    const vm = buildVm();
    vm.currentUser = { organization_id: 'org-1', client: { id: 'client-1' } };
    delete vm.sugerirCorrelativosRetencion; // usar la implementación real, no el stub

    await SimpleInvoiceForm.methods.sugerirCorrelativosRetencion.call(vm, 120, 0, 0);

    expect(supabase.rpc).toHaveBeenCalledWith('sugerir_correlativo_retencion', expect.objectContaining({
      p_tipo: 'IVA',
      p_client_id: 'client-1'
    }));
    expect(vm.formData.financial.ivaRetentionNumber).toBe('20260900014492');
    // Período AAAAMM (6 dígitos) + secuencia de 8 dígitos = 14 caracteres
    expect(vm.formData.financial.ivaRetentionNumber).toHaveLength(14);
  });

  it('limpia el número de IVA cuando el monto retenido es 0 (no llama al RPC)', async () => {
    const vm = buildVm();
    vm.currentUser = { organization_id: 'org-1', client: { id: 'client-1' } };
    vm.formData.financial.ivaRetentionNumber = '20260900000001';
    delete vm.sugerirCorrelativosRetencion;

    await SimpleInvoiceForm.methods.sugerirCorrelativosRetencion.call(vm, 0, 0, 0);

    expect(vm.formData.financial.ivaRetentionNumber).toBe('');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('no sugiere un nuevo número si el usuario ya editó manualmente el comprobante de IVA', async () => {
    const vm = buildVm();
    vm.currentUser = { organization_id: 'org-1', client: { id: 'client-1' } };
    vm.editarComprobanteIva = true;
    delete vm.sugerirCorrelativosRetencion;

    await SimpleInvoiceForm.methods.sugerirCorrelativosRetencion.call(vm, 120, 0, 0);

    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe('SimpleInvoiceForm.prefillFechaFiscal() — C1, Fecha fiscal (Libro de Compras)', () => {
  it('usa la fecha del comprobante de retención (retentionDate) cuando hay retención de IVA', () => {
    const vm = buildVm();
    vm.formData.financial.ivaRetention = 120;
    vm.formData.financial.retentionDate = '2026-09-02';
    vm.formData.issueDate = '2026-08-31';

    SimpleInvoiceForm.methods.prefillFechaFiscal.call(vm);

    expect(vm.formData.fecha_fiscal).toBe('2026-09-02');
  });

  it('usa la fecha de emisión (issueDate) cuando NO hay retención de IVA', () => {
    const vm = buildVm();
    vm.formData.financial.ivaRetention = 0;
    vm.formData.issueDate = '2026-09-05';

    SimpleInvoiceForm.methods.prefillFechaFiscal.call(vm);

    expect(vm.formData.fecha_fiscal).toBe('2026-09-05');
  });

  it('no sobrescribe el valor si el usuario ya lo editó manualmente', () => {
    const vm = buildVm();
    vm.formData.financial.ivaRetention = 120;
    vm.formData.financial.retentionDate = '2026-09-02';
    vm.formData.fecha_fiscal = '2026-10-15'; // el usuario puso otra fecha a mano
    vm.fechaFiscalManuallyEdited = true;

    SimpleInvoiceForm.methods.prefillFechaFiscal.call(vm);

    expect(vm.formData.fecha_fiscal).toBe('2026-10-15');
  });

  it('no hace nada si el flujo no es COMPRA', () => {
    const vm = buildVm();
    vm.formData.flow = 'VENTA';
    vm.formData.fecha_fiscal = '2026-01-01';
    vm.formData.issueDate = '2026-09-05';

    SimpleInvoiceForm.methods.prefillFechaFiscal.call(vm);

    expect(vm.formData.fecha_fiscal).toBe('2026-01-01');
  });
});
