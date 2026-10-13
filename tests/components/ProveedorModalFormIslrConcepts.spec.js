/**
 * W18 (2026-10-13) — docs/mvp/backlog-contadora-2026-10-12.md:
 * "En los parámetros fiscales del proveedor no aparecen todos los conceptos de
 * ISLR (falta honorarios profesionales 3%; solo 5%), pero en el ajuste de la
 * factura sí aparecen. Listas inconsistentes."
 *
 * Causa raíz: ProveedorModalForm.vue llamaba a
 * proveedorService.getISLRConcepts(this.formData.tipo_persona), que FILTRA el
 * catálogo por tipo de persona (ej. solo conceptos JURIDICA si el proveedor es
 * JURIDICA), mientras que RetentionAdjustSheet.vue (el ajuste de retenciones de
 * la factura) no pasa tipoPersona y por eso muestra el catálogo COMPLETO.
 *
 * Fix: ProveedorModalForm.vue ahora llama a getISLRConcepts() sin filtrar, para
 * usar la misma fuente/lista completa que el ajuste de la factura.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProveedorModalForm from '@/components/forms/ProveedorModalForm.vue';
import proveedorService from '@/services/proveedorService.js';

vi.mock('@/services/proveedorService.js', () => ({
  default: {
    getISLRConcepts: vi.fn(),
    getMunicipios: vi.fn().mockResolvedValue([])
  }
}));

const CONCEPTO_NATURAL_3 = {
  id: 'c001-honorarios-nat',
  codigo: '001',
  nombre: 'Honorarios Profesionales a Personas Naturales Residentes',
  porcentaje_retencion: 3.00,
  sustraendo_ut: 83.33,
  aplica_persona: 'NATURAL'
};

const CONCEPTO_JURIDICA_5 = {
  id: 'c002-honorarios-jur',
  codigo: '002',
  nombre: 'Honorarios Profesionales pagados a Personas Jurídicas Domiciliadas',
  porcentaje_retencion: 5.00,
  sustraendo_ut: 0,
  aplica_persona: 'JURIDICA'
};

function buildVm(tipoPersona = 'JURIDICA') {
  return {
    formData: { tipo_persona: tipoPersona },
    conceptosIslr: []
  };
}

describe('ProveedorModalForm.loadISLRConcepts() — unificación de catálogo ISLR (W18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a proveedorService.getISLRConcepts() SIN filtrar por tipo_persona (misma fuente que el ajuste de la factura)', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_NATURAL_3, CONCEPTO_JURIDICA_5]);

    const vm = buildVm('JURIDICA');
    await ProveedorModalForm.methods.loadISLRConcepts.call(vm);

    // No debe pasar this.formData.tipo_persona como argumento
    expect(proveedorService.getISLRConcepts).toHaveBeenCalledWith();
  });

  it('incluye conceptos de AMBOS tipos de persona aunque el proveedor sea JURIDICA (antes solo mostraba 5%, no 3%)', async () => {
    proveedorService.getISLRConcepts.mockResolvedValue([CONCEPTO_NATURAL_3, CONCEPTO_JURIDICA_5]);

    const vm = buildVm('JURIDICA');
    await ProveedorModalForm.methods.loadISLRConcepts.call(vm);

    const codigos = vm.conceptosIslr.map(c => c.codigo);
    expect(codigos).toContain('001'); // 3% Natural
    expect(codigos).toContain('002'); // 5% Jurídica
  });
});
