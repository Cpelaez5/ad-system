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
      aplicarIslr: false, conceptoIslr: null, conceptoIslrNombre: '',
      aplicarMunicipal: false, porcentajeMunicipal: 0,
      concepto_municipal_id: null, conceptoMunicipalNombre: ''
    },
    retencionesResult: null,
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
    // REVISAR CON CONTADORA: según docs/mvp/manuales/04-agente-fiscal-venezuela.md
    // ("PN: (base × %) − sustraendo (UT)") y el patrón ya aplicado en el RPC SQL
    // `registrar_compra_con_retenciones` (docs/archivo/migrations-legacy/007_*.sql,
    // líneas ~247-253: resta sustraendo_ut * valor_ut cuando tipo_persona = 'NATURAL'),
    // el cálculo de ISLR para Persona Natural DEBERÍA restar el sustraendo en
    // Unidades Tributarias. El método calcularRetenciones() de SimpleInvoiceForm.vue
    // (preview en el formulario, antes de guardar) NO resta el sustraendo: solo hace
    // base × %. Este test fija ese comportamiento ACTUAL de la vista previa, que es
    // más alto que lo que finalmente se guarda vía el RPC. Posible inconsistencia
    // entre lo que el usuario ve en pantalla y lo que se registra en BD.
    'Persona Natural con sustraendo_ut: la vista previa actual NO resta el sustraendo en UT (posible inconsistencia con el RPC de guardado)',
    async () => {
      proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO]);

      const vm = buildVm();
      vm.formData.financial.taxableSales = 5000;
      vm.retentionConfig.aplicarIslr = true;
      vm.retentionConfig.conceptoIslr = CONCEPTO_PN_SERVICIOS_3_SUSTRAENDO.id;

      await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

      // 5000 * 100% * 3% = 150 (SIN restar sustraendo_ut * valor_ut)
      // El RPC SQL, en cambio, restaría 83.33 UT * valor_ut vigente (ver nota arriba).
      expect(vm.formData.financial.islrRetention).toBe(150);
    }
  );

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
    // REVISAR CON CONTADORA: la decisión 16 de GEMINI.md exige que la retención
    // municipal solo aplique si comprador y proveedor están en el MISMO municipio
    // (venezuelaLocationsService.areSameMunicipality), y así se bloquea la
    // exportación del PDF (MUNICIPAL_MISMATCH, ver exportService.js y
    // retention-pdf-service.js, ya cubierto por tests existentes). Sin embargo,
    // calcularRetenciones() -- el cálculo que alimenta la VISTA PREVIA en el
    // formulario -- NO llama a areSameMunicipality en ningún punto: calcula y
    // muestra el monto municipal igual aunque los municipios difieran. Solo se
    // bloquea después, al generar el comprobante PDF. Este test fija ese
    // comportamiento actual (no es una validación, es una observación de que la
    // vista previa es "optimista" respecto al PDF/guardado final).
    'la vista previa calcula el monto municipal sin verificar si el proveedor está en el mismo municipio que la empresa',
    async () => {
      municipalConceptsService.getConcepts.mockResolvedValue({
        success: true,
        data: [{ id: 'mun-2', porcentaje: 2, descripcion: 'Servicios ficticios' }]
      });

      const vm = buildVm();
      vm.formData.financial.taxableSales = 1000;
      vm.retentionConfig.aplicarMunicipal = true;
      vm.retentionConfig.concepto_municipal_id = 'mun-2';
      // Nota: calcularRetenciones() no recibe ni usa el municipio del proveedor
      // ni el de la empresa en ningún punto de su lógica actual.

      await SimpleInvoiceForm.methods.calcularRetenciones.call(vm);

      expect(vm.formData.financial.municipalRetention).toBe(20); // 1000 * 2%
    }
  );

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
