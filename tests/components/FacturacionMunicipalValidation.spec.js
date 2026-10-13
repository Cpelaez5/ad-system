vi.mock('/Cashea-black-icon.svg', () => ({ default: 'mock-cashea.svg' }));
vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Facturacion from '@/views/cliente/Facturacion.vue';
import retentionPdfService from '@/services/retention-pdf-service.js';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } })
    }
  }
}));

vi.mock('@/services/invoiceService.js', () => ({ default: {} }));
vi.mock('@/services/bcvService.js', () => ({ default: {} }));
vi.mock('@/services/exportService.js', () => ({ default: {} }));
vi.mock('@/services/retentionRpcService.js', () => ({ default: {} }));
vi.mock('@/services/email-notification-service.js', () => ({ default: {} }));
vi.mock('@/services/userService.js', () => ({ default: {} }));
vi.mock('@/services/proveedorService.js', () => ({ default: { getProveedores: vi.fn().mockResolvedValue([]) } }));
vi.mock('@/services/receipt-pdf-service.js', () => ({ generateReceiptPdf: vi.fn() }));
vi.mock('@/services/retention-pdf-service.js', () => ({
  default: {
    generarComprobanteMunicipal: vi.fn(),
    generarComprobanteIVA: vi.fn(),
    generarComprobanteISLR: vi.fn()
  }
}));

describe('Facturacion.vue - Descarga de Comprobante Municipal (downloadMunicipal)', () => {
  let vm;
  let snackbarSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    snackbarSpy = vi.fn();

    vm = {
      currentUser: {
        companyName: 'Tech Solutions C.A.',
        rif: 'J-12345678-9',
        client: {
          company_name: 'Tech Solutions C.A.',
          rif: 'J-12345678-9',
          municipio_id: '4c5edabf-05e3-4601-922c-ec7f5e4dfeb0', // Chacao (Miranda)
          municipio: 'Chacao',
          estado: 'Miranda'
        }
      },
      snackbar: {
        show: false,
        message: '',
        type: 'info'
      },
      proveedoresMap: {},
      $root: {
        showSnackbar: snackbarSpy
      },
      _buildCompanyInfo: Facturacion.methods._buildCompanyInfo,
      showNotification: Facturacion.methods.showNotification,
      canDownloadMunicipal: Facturacion.methods.canDownloadMunicipal
    };
  });

  // C7 (2026-10-13): antes "bloqueaba" sin excepción (MUNICIPAL_MISMATCH). Ahora
  // advierte con snackbar y pregunta con un confirm; si el usuario cancela, no
  // descarga; si confirma, continúa igual. Pedido de la contadora (W5).
  it('advierte con snackbar y NO descarga si el usuario cancela el confirm, cuando el proveedor es de otro municipio', async () => {
    vm.confirmarMunicipioDistinto = vi.fn().mockResolvedValue(false);
    const invoice = {
      id: 'inv-dif-mun',
      invoiceNumber: '00000042',
      issuer: {
        nombre: 'Proveedor Baruta S.A.',
        municipio_id: '15eecd2c-e9e1-4476-a5bc-b6a3889e6607' // Baruta (Miranda)
      }
    };

    await Facturacion.methods.downloadMunicipal.call(vm, invoice);

    // 1. Debe mostrar advertencia en el snackbar (no bloqueo duro)
    expect(snackbarSpy).toHaveBeenCalledTimes(1);
    const [msg, type] = snackbarSpy.mock.calls[0];
    expect(type).toBe('warning');
    expect(msg).toContain('Chacao');
    expect(msg).toContain('Baruta');

    // 2. Pregunta confirmación al usuario
    expect(vm.confirmarMunicipioDistinto).toHaveBeenCalledTimes(1);

    // 3. Como el usuario canceló, NO debe llamar a generarComprobanteMunicipal
    expect(retentionPdfService.generarComprobanteMunicipal).not.toHaveBeenCalled();
  });

  it('advierte y permite continuar si el usuario CONFIRMA, aunque el proveedor sea de otro municipio', async () => {
    vm.confirmarMunicipioDistinto = vi.fn().mockResolvedValue(true);
    retentionPdfService.generarComprobanteMunicipal.mockResolvedValueOnce({ success: true });

    const invoice = {
      id: 'inv-dif-mun-confirmado',
      invoiceNumber: '00000045',
      issuer: {
        nombre: 'Proveedor Baruta S.A.',
        municipio_id: '15eecd2c-e9e1-4476-a5bc-b6a3889e6607' // Baruta (Miranda)
      }
    };

    await Facturacion.methods.downloadMunicipal.call(vm, invoice);

    // 1. Se llama a generarComprobanteMunicipal con confirmMismatch: true
    expect(retentionPdfService.generarComprobanteMunicipal).toHaveBeenCalledTimes(1);
    const callArgs = retentionPdfService.generarComprobanteMunicipal.mock.calls[0];
    expect(callArgs[2]).toEqual({ confirmMismatch: true });

    // 2. Termina en éxito
    expect(snackbarSpy).toHaveBeenCalledWith('Comprobante Municipal exportado exitosamente', 'success');
  });

  it('permite la descarga y muestra snackbar success cuando ambos municipios coinciden', async () => {
    retentionPdfService.generarComprobanteMunicipal.mockResolvedValueOnce({ success: true });

    const invoice = {
      id: 'inv-same-mun',
      invoiceNumber: '00000043',
      issuer: {
        nombre: 'Comercial Chacao C.A.',
        municipio_id: 'm-chacao' // Mismo municipio (Chacao) usando slug
      }
    };

    await Facturacion.methods.downloadMunicipal.call(vm, invoice);

    // 1. Debe llamar a generarComprobanteMunicipal
    expect(retentionPdfService.generarComprobanteMunicipal).toHaveBeenCalledTimes(1);

    // 2. Debe mostrar snackbar de éxito
    expect(snackbarSpy).toHaveBeenCalledWith('Comprobante Municipal exportado exitosamente', 'success');
  });

  it('muestra snackbar de error si la generación del PDF falla inesperadamente', async () => {
    retentionPdfService.generarComprobanteMunicipal.mockRejectedValueOnce(new Error('PDF render failed'));

    const invoice = {
      id: 'inv-same-err',
      invoiceNumber: '00000044',
      issuer: {
        municipio_id: 'm-chacao'
      }
    };

    await Facturacion.methods.downloadMunicipal.call(vm, invoice);

    expect(snackbarSpy).toHaveBeenCalledWith('Error al exportar comprobante Municipal', 'error');
  });

  describe('canDownloadMunicipal (Visibilidad en Dropdown de Descargas)', () => {
    it('retorna false si la factura no tiene retención municipal', () => {
      const invoice = {
        retenciones: { municipal: 0 },
        financial: { municipalRetention: 0 },
        issuer: { municipio_id: 'm-chacao' }
      };
      expect(vm.canDownloadMunicipal(invoice)).toBe(false);
    });

    // C7 (2026-10-13): ya no se oculta del dropdown solo porque los municipios
    // difieran; downloadMunicipal() advierte y pide confirmación al hacer clic.
    it('retorna true aunque el proveedor y la empresa cliente estén en DIFERENTES municipios (ya no se oculta del dropdown)', () => {
      const invoice = {
        retenciones: { municipal: 15.50 },
        issuer: {
          nombre: 'Proveedor Baruta',
          municipio_id: '15eecd2c-e9e1-4476-a5bc-b6a3889e6607' // Baruta (Miranda)
        }
      };
      // La empresa en vm está en Chacao
      expect(vm.canDownloadMunicipal(invoice)).toBe(true);
    });

    it('retorna true si el proveedor y la empresa cliente están en el MISMO municipio (muestra en dropdown)', () => {
      const invoice = {
        retenciones: { municipal: 15.50 },
        issuer: {
          nombre: 'Proveedor Chacao',
          municipio_id: '4c5edabf-05e3-4601-922c-ec7f5e4dfeb0' // Chacao (Miranda)
        }
      };
      // La empresa en vm está en Chacao
      expect(vm.canDownloadMunicipal(invoice)).toBe(true);
    });

    it('retorna true si el proveedor fue actualizado en proveedoresMap al mismo municipio que la empresa', () => {
      const provId = 'prov-uuid-999';
      vm.proveedoresMap = {
        [provId]: '4c5edabf-05e3-4601-922c-ec7f5e4dfeb0' // Chacao en proveedoresMap
      };

      const invoice = {
        retenciones: { municipal: 10.00 },
        issuer: {
          id: provId,
          municipio_id: '15eecd2c-e9e1-4476-a5bc-b6a3889e6607' // Baruta en JSON histórico
        }
      };

      // Debe tomar el valor actualizado de proveedoresMap (Chacao) y permitir la descarga
      expect(vm.canDownloadMunicipal(invoice)).toBe(true);
    });
  });
});
