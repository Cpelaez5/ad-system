import { describe, it, expect, vi, beforeEach } from 'vitest'
import retentionRpcService from '@/services/retentionRpcService'
import { supabase } from '@/lib/supabaseClient'

// Mock de supabase
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

describe('RetentionRpcService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('llama correctamente al RPC y devuelve la data si tiene éxito', async () => {
    const mockData = { invoice_id: '1234', municipal: { monto: 100 } }
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null })

    const payload = {
      p_client_id: 'client-123',
      p_proveedor_id: 'prov-123',
      p_factura: { financial: { totalSales: 1000 } },
      p_aplicar_municipal: true,
      p_concepto_municipal_id: 'mun-123'
    }

    const result = await retentionRpcService.registrarCompra(payload)

    expect(supabase.rpc).toHaveBeenCalledWith('registrar_compra_con_retenciones', payload)
    expect(result).toEqual(mockData)
  })

  it('mapea correctamente un error estándar (P0001)', async () => {
    const mockError = { code: 'P0001', message: 'Error de validación del sistema.' }
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError })

    await expect(retentionRpcService.registrarCompra({}))
      .rejects.toThrow('Error de validación del sistema.')
  })

  it('mapea un error de duplicado (23505)', async () => {
    const mockError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError })

    await expect(retentionRpcService.registrarCompra({}))
      .rejects.toThrow('El número de factura o comprobante ya existe para este periodo.')
  })

  it('respeta el mensaje de error de la BD si es un RAISE EXCEPTION conocido', async () => {
    const mockError = { code: 'P0001', message: 'No autorizado para registrar compras de este cliente' }
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError })

    await expect(retentionRpcService.registrarCompra({}))
      .rejects.toThrow('No autorizado para registrar compras de este cliente')
  })

  it('devuelve el error DEFAULT si el código no está mapeado', async () => {
    const mockError = { code: 'UNKNOWN_CODE', message: 'Some weird error' }
    supabase.rpc.mockResolvedValueOnce({ data: null, error: mockError })

    await expect(retentionRpcService.registrarCompra({}))
      .rejects.toThrow('Ha ocurrido un error inesperado al registrar la compra con retenciones.')
  })
})
