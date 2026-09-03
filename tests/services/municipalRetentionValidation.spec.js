vi.mock('/ADSystem/logo.png', () => ({ default: 'mock-logo.png' }));
vi.mock('/ADSystem/png/svg_logo_ADADAD_3000x3000.png', () => ({ default: 'mock-watermark.png' }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import retentionPdfService from '@/services/retention-pdf-service.js';
import exportService from '@/services/exportService.js';
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    })
  }
}));

describe('Validación de Municipios en Servicios de Retención Municipal', () => {

  describe('retentionPdfService.generarComprobanteMunicipal', () => {
    it('lanza MUNICIPAL_MISMATCH si la empresa y el proveedor están en municipios distintos', async () => {
      const invoice = {
        id: 'inv-123',
        issuer: {
          municipio_id: 'm-baruta',
          nombre: 'Proveedor Baruta C.A.'
        }
      };

      const companyInfo = {
        name: 'Mi Empresa',
        municipio: 'm-chacao'
      };

      await expect(
        retentionPdfService.generarComprobanteMunicipal(invoice, companyInfo)
      ).rejects.toMatchObject({
        code: 'MUNICIPAL_MISMATCH'
      });
    });

    it('lanza MUNICIPAL_MISMATCH si el proveedor o la empresa no tienen municipio registrado', async () => {
      const invoiceSinMun = {
        id: 'inv-456',
        issuer: {
          municipio_id: null,
          nombre: 'Proveedor Sin Municipio'
        }
      };

      const companyInfo = {
        name: 'Mi Empresa',
        municipio: 'm-chacao'
      };

      await expect(
        retentionPdfService.generarComprobanteMunicipal(invoiceSinMun, companyInfo)
      ).rejects.toMatchObject({
        code: 'MUNICIPAL_MISMATCH'
      });
    });

    it('usa invoice.client como fallback cuando companyInfo no define municipio', async () => {
      const invoice = {
        id: 'inv-789',
        client: {
          municipio_id: 'm-chacao'
        },
        issuer: {
          municipio_id: 'm-sucre'
        }
      };

      await expect(
        retentionPdfService.generarComprobanteMunicipal(invoice, {})
      ).rejects.toMatchObject({
        code: 'MUNICIPAL_MISMATCH'
      });
    });
  });

  describe('exportService.exportarComprobanteMunicipal', () => {
    it('bloquea la exportación y lanza MUNICIPAL_MISMATCH antes de llamar al servicio PDF si los municipios difieren', async () => {
      const invoice = {
        id: 'inv-exp-1',
        issuer: {
          municipio_id: 'ae0fd71e-a052-4755-9a2b-fa148caa96d5' // Maracaibo
        }
      };

      const companyInfo = {
        municipio: 'c8921e1d-5407-4cc4-87f3-04f9ce46920f' // Libertador (Caracas)
      };

      const pdfSpy = vi.spyOn(retentionPdfService, 'generarComprobanteMunicipal');

      await expect(
        exportService.exportarComprobanteMunicipal(invoice, companyInfo)
      ).rejects.toMatchObject({
        code: 'MUNICIPAL_MISMATCH'
      });

      expect(pdfSpy).not.toHaveBeenCalled();
      pdfSpy.mockRestore();
    });

    it('permite delegar a generarComprobanteMunicipal si ambos municipios coinciden', async () => {
      const invoice = {
        id: 'inv-exp-2',
        issuer: {
          municipio_id: 'm-chacao'
        }
      };

      const companyInfo = {
        municipio: '4c5edabf-05e3-4601-922c-ec7f5e4dfeb0' // UUID correspondiente a Chacao (Miranda)
      };

      const pdfSpy = vi.spyOn(retentionPdfService, 'generarComprobanteMunicipal')
        .mockResolvedValueOnce({ success: true, filename: 'comprobante.pdf' });

      const result = await exportService.exportarComprobanteMunicipal(invoice, companyInfo);

      expect(pdfSpy).toHaveBeenCalledWith(invoice, companyInfo);
      expect(result).toEqual({ success: true, filename: 'comprobante.pdf' });

      pdfSpy.mockRestore();
    });
  });

});
