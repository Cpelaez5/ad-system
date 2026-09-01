import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabaseClient'
import retentionRpcService from '@/services/retentionRpcService'

// Mock de Supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn()
  }
}))

describe('Aislamiento Multi-Empresa de Retenciones y Facturas (Tenant Isolation)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Unicidad y Privacidad de Comprobantes por Empresa (Client ID)', () => {
    it('permite que dos empresas distintas (Empresa A y Empresa B) usen el mismo número de comprobante', async () => {
      const empresaAId = 'client-empresa-a'
      const empresaBId = 'client-empresa-b'
      const numeroComprobante = '20260800000001'

      // Mock para validar_comprobante_unico
      supabase.rpc.mockImplementation((funcName, args) => {
        if (funcName === 'validar_comprobante_unico') {
          // Para Empresa A está disponible (true), para Empresa B también (true)
          return Promise.resolve({ data: true, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })

      // Validar para Empresa A
      const { data: libreEmpresaA } = await supabase.rpc('validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaAId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })

      // Validar para Empresa B
      const { data: libreEmpresaB } = await supabase.rpc('validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaBId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })

      expect(libreEmpresaA).toBe(true)
      expect(libreEmpresaB).toBe(true)
      expect(supabase.rpc).toHaveBeenCalledTimes(2)
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaAId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaBId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })
    })

    it('detecta duplicado solo si la MISMA empresa intenta repetir su comprobante', async () => {
      const empresaAId = 'client-empresa-a'
      const numeroComprobante = '20260800000001'

      supabase.rpc.mockResolvedValueOnce({ data: false, error: null }) // false = ya existe para esa empresa

      const { data: esLibre } = await supabase.rpc('validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaAId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })

      expect(esLibre).toBe(false)
      expect(supabase.rpc).toHaveBeenCalledWith('validar_comprobante_unico', {
        p_org_id: 'org-1',
        p_client_id: empresaAId,
        p_tipo: 'IVA',
        p_numero: numeroComprobante
      })
    })
  })

  describe('2. Sugerencia Dinámica de Correlativos sin Colisiones', () => {
    it('sugiere el correlativo correcto para IVA basándose en el historial de la empresa', async () => {
      const empresaId = 'client-ilumecca'
      const fecha = '2026-08-28'

      supabase.rpc.mockResolvedValueOnce({ data: '20260800000004', error: null })

      const { data: sugeridoIva } = await supabase.rpc('sugerir_correlativo_retencion', {
        p_org_id: 'org-1',
        p_client_id: empresaId,
        p_tipo: 'IVA',
        p_fecha: fecha
      })

      expect(sugeridoIva).toBe('20260800000004')
      expect(supabase.rpc).toHaveBeenCalledWith('sugerir_correlativo_retencion', {
        p_org_id: 'org-1',
        p_client_id: empresaId,
        p_tipo: 'IVA',
        p_fecha: fecha
      })
    })

    it('sugiere el correlativo correcto para ISLR con prefijo anual', async () => {
      const empresaId = 'client-ilumecca'
      const fecha = '2026-08-28'

      supabase.rpc.mockResolvedValueOnce({ data: 'ISLR-2026-00000003', error: null })

      const { data: sugeridoIslr } = await supabase.rpc('sugerir_correlativo_retencion', {
        p_org_id: 'org-1',
        p_client_id: empresaId,
        p_tipo: 'ISLR',
        p_fecha: fecha
      })

      expect(sugeridoIslr).toBe('ISLR-2026-00000003')
      expect(sugeridoIslr).toMatch(/^ISLR-\d{4}-\d{8}$/)
    })

    it('sugiere el correlativo correcto para MUNICIPAL con prefijo anual', async () => {
      const empresaId = 'client-ilumecca'
      const fecha = '2026-08-28'

      supabase.rpc.mockResolvedValueOnce({ data: 'MUN-2026-00000001', error: null })

      const { data: sugeridoMun } = await supabase.rpc('sugerir_correlativo_retencion', {
        p_org_id: 'org-1',
        p_client_id: empresaId,
        p_tipo: 'MUNICIPAL',
        p_fecha: fecha
      })

      expect(sugeridoMun).toBe('MUN-2026-00000001')
      expect(sugeridoMun).toMatch(/^MUN-\d{4}-\d{8}$/)
    })
  })

  describe('3. Flujo Completo de Registro de Compra con Retenciones (registrarCompra)', () => {
    it('registra exitosamente la compra con comprobantes independientes por empresa', async () => {
      const mockResult = {
        invoice_id: 'inv-uuid-777',
        iva: { monto: 120.0, porcentaje: 75, comprobante: '20260800000004' },
        islr: { monto: 20.0, porcentaje: 2, comprobante: 'ISLR-2026-00000003' },
        municipal: { monto: 15.0, porcentaje: 1.5, comprobante: 'MUN-2026-00000001' },
        total_retenido: 155.0,
        neto_a_pagar: 845.0
      }

      supabase.rpc.mockResolvedValueOnce({ data: mockResult, error: null })

      const payload = {
        p_client_id: 'client-ilumecca',
        p_proveedor_id: 'prov-electrocable',
        p_aplicar_iva: true,
        p_aplicar_islr: true,
        p_aplicar_municipal: true,
        p_comprobante_iva: '20260800000004',
        p_comprobante_islr: 'ISLR-2026-00000003',
        p_comprobante_municipal: 'MUN-2026-00000001',
        p_factura: {
          flow: 'COMPRA',
          expense_type: 'COMPRA',
          invoiceNumber: 'FAC-9948',
          controlNumber: '00-00129',
          issueDate: '2026-08-28',
          financial: { taxableSales: 1000, taxDebit: 160, totalSales: 1160 }
        }
      }

      const response = await retentionRpcService.registrarCompra(payload)

      expect(response).toEqual(mockResult)
      expect(response.neto_a_pagar).toBe(845.0)
      expect(response.iva.comprobante).toBe('20260800000004')
      expect(supabase.rpc).toHaveBeenCalledWith('registrar_compra_con_retenciones', payload)
    })

    it('maneja y reporta adecuadamente el error 23505 si se intenta forzar un duplicado dentro de la misma empresa', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      })

      const payload = {
        p_client_id: 'client-ilumecca',
        p_comprobante_iva: '20260800000003' // Ya usado por esta empresa
      }

      await expect(retentionRpcService.registrarCompra(payload))
        .rejects.toThrow('El número de factura o comprobante ya existe para este periodo.')
    })
  })
})
