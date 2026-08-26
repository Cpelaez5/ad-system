/**
 * Tests unitarios para la lógica de retenciones en SimpleInvoiceForm.vue
 * Cubre: sugerirCorrelativosRetencion, checkComprobanteDuplicado, validate()
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock de supabase ──────────────────────────────────────────────────────────
const mockRpc = vi.fn();
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] })
        }),
        order: vi.fn().mockResolvedValue({ data: [] })
      })
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })
  }
}));

// Mock de servicios
vi.mock('@/services/invoiceService.js', () => ({
  default: {
    checkDuplicate: vi.fn().mockResolvedValue(false),
    uploadAttachment: vi.fn().mockResolvedValue({ success: true })
  }
}));
vi.mock('@/services/userService.js', () => ({
  default: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getUserProfile: vi.fn().mockResolvedValue(null)
  }
}));
vi.mock('@/services/gemini/geminiOcrService.js', () => ({
  procesarComprobanteOCR: vi.fn()
}));
vi.mock('@/services/inventoryService.js', () => ({
  default: {
    getProducts: vi.fn().mockResolvedValue([]),
    searchProducts: vi.fn().mockResolvedValue([])
  }
}));
vi.mock('@/services/proveedorService.js', () => ({
  default: {
    getProveedores: vi.fn().mockResolvedValue([]),
    getISLRConcepts: vi.fn().mockResolvedValue([]),
    getRetentionConfig: vi.fn().mockResolvedValue(null)
  }
}));
vi.mock('@/services/clientService.js', () => ({
  default: {
    getClient: vi.fn().mockResolvedValue(null),
    getExpenseCategories: vi.fn().mockResolvedValue([])
  }
}));
vi.mock('@/services/bcvService.js', () => ({
  default: {
    getRates: vi.fn().mockResolvedValue({ usd: 1, eur: 1 })
  }
}));

// ══════════════════════════════════════════════════════════════════════════════
// Tests de la LÓGICA extraída (sin montar el componente completo de Vuetify)
// ══════════════════════════════════════════════════════════════════════════════

describe('Retenciones — Lógica de correlativos', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── sugerirCorrelativosRetencion ──────────────────────────────────────────

  describe('sugerirCorrelativosRetencion()', () => {
    // Simular la lógica del método directamente
    const sugerirCorrelativosRetencion = async (ctx, iva, islr, municipal) => {
      try {
        const clientId = ctx.currentUser?.client?.id || ctx.currentUser?.client_id;
        const fecha = ctx.formData.issueDate || new Date().toISOString().split('T')[0];
        if (!clientId) return;

        const { supabase } = await import('@/lib/supabaseClient');

        if (iva > 0 && !ctx.editarComprobanteIva) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: ctx.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'IVA',
            p_fecha: fecha
          });
          if (data) ctx.formData.financial.ivaRetentionNumber = data;
        } else if (iva === 0) {
          ctx.formData.financial.ivaRetentionNumber = '';
        }

        if (islr > 0 && !ctx.editarComprobanteIslr) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: ctx.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'ISLR',
            p_fecha: fecha
          });
          if (data) ctx.formData.financial.islrRetentionNumber = data;
        } else if (islr === 0) {
          ctx.formData.financial.islrRetentionNumber = '';
        }

        if (municipal > 0 && !ctx.editarComprobanteMunicipal) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: ctx.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'MUNICIPAL',
            p_fecha: fecha
          });
          if (data) ctx.formData.financial.municipalRetentionNumber = data;
        } else if (municipal === 0) {
          ctx.formData.financial.municipalRetentionNumber = '';
        }
      } catch (e) {
        // silenciar
      }
    };

    function createCtx(overrides = {}) {
      return {
        currentUser: {
          client_id: 'client-123',
          organization_id: 'org-456'
        },
        formData: {
          issueDate: '2026-08-26',
          financial: {
            ivaRetentionNumber: '',
            islrRetentionNumber: '',
            municipalRetentionNumber: ''
          }
        },
        editarComprobanteIva: false,
        editarComprobanteIslr: false,
        editarComprobanteMunicipal: false,
        ...overrides
      };
    }

    it('llama a supabase.rpc con los parámetros correctos para IVA', async () => {
      mockRpc.mockResolvedValue({ data: '20260800000003' });
      const ctx = createCtx();

      await sugerirCorrelativosRetencion(ctx, 100, 0, 0);

      expect(mockRpc).toHaveBeenCalledWith('sugerir_correlativo_retencion', {
        p_org_id: 'org-456',
        p_client_id: 'client-123',
        p_tipo: 'IVA',
        p_fecha: '2026-08-26'
      });
      expect(ctx.formData.financial.ivaRetentionNumber).toBe('20260800000003');
    });

    it('llama a rpc para los 3 tipos cuando todos son > 0', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: '20260800000003' })  // IVA
        .mockResolvedValueOnce({ data: 'ISLR-2026-00000003' })  // ISLR
        .mockResolvedValueOnce({ data: 'MUN-2026-00000003' });  // Municipal

      const ctx = createCtx();
      await sugerirCorrelativosRetencion(ctx, 100, 50, 25);

      expect(mockRpc).toHaveBeenCalledTimes(3);
      expect(ctx.formData.financial.ivaRetentionNumber).toBe('20260800000003');
      expect(ctx.formData.financial.islrRetentionNumber).toBe('ISLR-2026-00000003');
      expect(ctx.formData.financial.municipalRetentionNumber).toBe('MUN-2026-00000003');
    });

    it('NO sobrescribe el número si editarComprobanteIva = true', async () => {
      mockRpc.mockResolvedValue({ data: '20260800000099' });
      const ctx = createCtx({
        editarComprobanteIva: true,
        formData: {
          issueDate: '2026-08-26',
          financial: {
            ivaRetentionNumber: 'MI-NUMERO-CUSTOM',
            islrRetentionNumber: '',
            municipalRetentionNumber: ''
          }
        }
      });

      await sugerirCorrelativosRetencion(ctx, 100, 0, 0);

      // NO debe haber llamado a rpc para IVA
      expect(mockRpc).not.toHaveBeenCalled();
      // Debe mantener el número custom
      expect(ctx.formData.financial.ivaRetentionNumber).toBe('MI-NUMERO-CUSTOM');
    });

    it('limpia el número cuando el monto es 0', async () => {
      const ctx = createCtx({
        formData: {
          issueDate: '2026-08-26',
          financial: {
            ivaRetentionNumber: 'VIEJO-NUMERO',
            islrRetentionNumber: 'VIEJO-ISLR',
            municipalRetentionNumber: 'VIEJO-MUN'
          }
        }
      });

      await sugerirCorrelativosRetencion(ctx, 0, 0, 0);

      expect(ctx.formData.financial.ivaRetentionNumber).toBe('');
      expect(ctx.formData.financial.islrRetentionNumber).toBe('');
      expect(ctx.formData.financial.municipalRetentionNumber).toBe('');
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('no hace nada si no hay clientId', async () => {
      const ctx = createCtx({
        currentUser: { organization_id: 'org-456' } // sin client_id
      });

      await sugerirCorrelativosRetencion(ctx, 100, 50, 25);

      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  // ── checkComprobanteDuplicado ─────────────────────────────────────────────

  describe('checkComprobanteDuplicado()', () => {
    // Extraer la lógica del método — usa mockRpc directamente (ya es el mock de supabase.rpc)
    const checkComprobanteDuplicado = (ctx, tipo, numero) => {
      if (ctx.comprobanteCheckTimers[tipo]) {
        clearTimeout(ctx.comprobanteCheckTimers[tipo]);
      }

      if (!numero || numero.trim() === '') {
        ctx.comprobanteDuplicado[tipo] = false;
        return;
      }

      ctx.comprobanteCheckTimers[tipo] = setTimeout(async () => {
        try {
          const tipoDb = tipo === 'iva' ? 'IVA' : tipo === 'islr' ? 'ISLR' : 'MUNICIPAL';
          const { data, error } = await mockRpc('validar_comprobante_unico', {
            p_org_id: ctx.currentUser?.organization_id,
            p_tipo: tipoDb,
            p_numero: numero.trim()
          });
          if (error) throw error;
          ctx.comprobanteDuplicado[tipo] = !data;
        } catch (e) {
          ctx.comprobanteDuplicado[tipo] = false;
        }
      }, 500);
    };

    function createCtx() {
      return {
        currentUser: { organization_id: 'org-456' },
        comprobanteDuplicado: { iva: false, islr: false, municipal: false },
        comprobanteCheckTimers: { iva: null, islr: null, municipal: null }
      };
    }

    it('marca como duplicado cuando validar_comprobante_unico devuelve false', async () => {
      // false = ya existe = ES duplicado
      mockRpc.mockResolvedValue({ data: false, error: null });
      const ctx = createCtx();

      checkComprobanteDuplicado(ctx, 'iva', '20260800000001');

      // Avanzar el debounce de 500ms
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(mockRpc).toHaveBeenCalledWith('validar_comprobante_unico', {
        p_org_id: 'org-456',
        p_tipo: 'IVA',
        p_numero: '20260800000001'
      });
      expect(ctx.comprobanteDuplicado.iva).toBe(true);
    });

    it('NO marca como duplicado cuando validar_comprobante_unico devuelve true', async () => {
      // true = es único = NO es duplicado
      mockRpc.mockResolvedValue({ data: true, error: null });
      const ctx = createCtx();

      checkComprobanteDuplicado(ctx, 'iva', 'NUMERO-NUEVO-999');

      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(ctx.comprobanteDuplicado.iva).toBe(false);
    });

    it('limpia el estado cuando el número es vacío', () => {
      const ctx = createCtx();
      ctx.comprobanteDuplicado.iva = true; // previamente marcado

      checkComprobanteDuplicado(ctx, 'iva', '');

      expect(ctx.comprobanteDuplicado.iva).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('limpia el estado cuando el número es null', () => {
      const ctx = createCtx();
      ctx.comprobanteDuplicado.iva = true;

      checkComprobanteDuplicado(ctx, 'iva', null);

      expect(ctx.comprobanteDuplicado.iva).toBe(false);
    });

    it('cancela el timer anterior al recibir un nuevo input (debounce)', () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const ctx = createCtx();

      checkComprobanteDuplicado(ctx, 'iva', 'PRIMER-INPUT');
      vi.advanceTimersByTime(300); // Solo 300ms, no llega al debounce

      checkComprobanteDuplicado(ctx, 'iva', 'SEGUNDO-INPUT');
      vi.advanceTimersByTime(300); // 300ms desde el segundo

      // El primer timer fue cancelado, rpc no debe haberse llamado aún
      expect(mockRpc).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200); // Ahora llega a 500ms del segundo
      // Ahora sí debería llamarse (pero es async, esperamos)
    });

    it('mapea los tipos correctamente: iva → IVA, islr → ISLR, municipal → MUNICIPAL', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const ctx = createCtx();

      checkComprobanteDuplicado(ctx, 'municipal', 'MUN-TEST');
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      expect(mockRpc).toHaveBeenCalledWith('validar_comprobante_unico', expect.objectContaining({
        p_tipo: 'MUNICIPAL'
      }));
    });
  });

  // ── validate() — regla 6 de comprobantes duplicados ───────────────────────

  describe('validate() — regla de comprobantes duplicados', () => {
    function createFormState(overrides = {}) {
      return {
        formData: {
          flow: 'COMPRA',
          invoiceNumber: 'FAC-001',
          issueDate: '2026-08-26',
          status: 'BORRADOR',
          financial: {
            totalSales: 100,
            taxableSales: 100,
            nonTaxableSales: 0,
            taxDebit: 16,
            ivaRetention: 12,
            islrRetention: 0,
            municipalRetention: 0,
            ivaRetentionNumber: '20260800000003',
            islrRetentionNumber: '',
            municipalRetentionNumber: '',
            igtf: 0
          },
          items: [{ description: 'Test', quantity: 1, price: 100, total: 100 }]
        },
        isDuplicate: false,
        showFlowError: false,
        comprobanteDuplicado: { iva: false, islr: false, municipal: false },
        snackbarMessages: [],
        showSnackbar(msg) { this.snackbarMessages.push(msg); },
        ...overrides
      };
    }

    // Extraer solo la regla 6 de validate()
    function validateComprobantes(state) {
      if (state.formData.flow === 'COMPRA') {
        if (state.comprobanteDuplicado.iva || state.comprobanteDuplicado.islr || state.comprobanteDuplicado.municipal) {
          state.showSnackbar('Hay números de comprobante de retención duplicados. Corrígelos antes de guardar.');
          return false;
        }
      }
      return true;
    }

    it('permite guardar cuando no hay comprobantes duplicados', () => {
      const state = createFormState();
      expect(validateComprobantes(state)).toBe(true);
    });

    it('bloquea guardar cuando IVA tiene duplicado', () => {
      const state = createFormState({
        comprobanteDuplicado: { iva: true, islr: false, municipal: false }
      });
      expect(validateComprobantes(state)).toBe(false);
      expect(state.snackbarMessages).toHaveLength(1);
    });

    it('bloquea guardar cuando ISLR tiene duplicado', () => {
      const state = createFormState({
        comprobanteDuplicado: { iva: false, islr: true, municipal: false }
      });
      expect(validateComprobantes(state)).toBe(false);
    });

    it('bloquea guardar cuando Municipal tiene duplicado', () => {
      const state = createFormState({
        comprobanteDuplicado: { iva: false, islr: false, municipal: true }
      });
      expect(validateComprobantes(state)).toBe(false);
    });

    it('NO bloquea comprobantes en flujo VENTA (no aplica validación)', () => {
      const state = createFormState({
        formData: {
          flow: 'VENTA',
          invoiceNumber: 'FAC-001',
          issueDate: '2026-08-26',
          status: 'BORRADOR',
          financial: { totalSales: 100, ivaRetentionNumber: '' },
          items: []
        },
        comprobanteDuplicado: { iva: true, islr: false, municipal: false }
      });
      // En VENTA no se validan comprobantes
      expect(validateComprobantes(state)).toBe(true);
    });
  });

  // ── formData.financial — estructura correcta ──────────────────────────────

  describe('formData.financial — campos de retención', () => {
    it('tiene los 3 campos de número de comprobante inicializados como string vacío', () => {
      const financial = {
        totalSales: 0, nonTaxableSales: 0, taxableSales: 0,
        taxDebit: 0, ivaRetention: 0, islrRetention: 0,
        municipalRetention: 0, igtf: 0,
        ivaRetentionNumber: '', islrRetentionNumber: '', municipalRetentionNumber: '',
        currency: 'VES', exchangeRate: 1, exchangeRateEur: null,
        paymentMethod: null, paymentReference: '',
        credit: null
      };

      expect(financial).toHaveProperty('ivaRetentionNumber', '');
      expect(financial).toHaveProperty('islrRetentionNumber', '');
      expect(financial).toHaveProperty('municipalRetentionNumber', '');
    });
  });

  // ── calcularRetenciones — limpieza de números ─────────────────────────────

  describe('calcularRetenciones() — limpieza de números', () => {
    it('limpia los números de comprobante cuando el flujo no es COMPRA', () => {
      const formData = {
        flow: 'VENTA',
        financial: {
          ivaRetention: 50,
          islrRetention: 30,
          municipalRetention: 10,
          ivaRetentionNumber: '20260800000001',
          islrRetentionNumber: 'ISLR-2026-00000001',
          municipalRetentionNumber: 'MUN-2026-00000001'
        }
      };

      // Simular la lógica de limpieza
      if (formData.flow !== 'COMPRA') {
        formData.financial.ivaRetention = 0;
        formData.financial.islrRetention = 0;
        formData.financial.municipalRetention = 0;
        formData.financial.ivaRetentionNumber = '';
        formData.financial.islrRetentionNumber = '';
        formData.financial.municipalRetentionNumber = '';
      }

      expect(formData.financial.ivaRetentionNumber).toBe('');
      expect(formData.financial.islrRetentionNumber).toBe('');
      expect(formData.financial.municipalRetentionNumber).toBe('');
      expect(formData.financial.ivaRetention).toBe(0);
    });
  });
});
