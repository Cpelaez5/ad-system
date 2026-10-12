/**
 * Tests unitarios para el servicio OCR Admin (adminOcrService.js)
 *
 * Especializado en la extracción COMPLETA de facturas, delegada a la
 * Edge Function `ai-chat` (la temperatura/proveedor se configuran en el servidor).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const invokeMock = vi.fn()
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: (...args) => invokeMock(...args)
    }
  }
}))

import service from '@/services/adminOcrService'

describe('AdminOCRService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Espiar métodos base
    vi.spyOn(service, 'processFile').mockResolvedValue('Texto de factura completa procesada')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Extract Invoice Data
  // ═════════════════════════════════════════════════════════════
  describe('extractInvoiceData', () => {
    it('extrae los datos, los parsea y calcula el nivel de confianza', async () => {
      const mockInvoiceData = {
        invoiceNumber: "INV-001",
        issueDate: "2026-08-26",
        issuer: { companyName: "Empresa Emisora", rif: "J-12345" },
        client: { companyName: "Empresa Cliente", rif: "J-67890" },
        items: [{ code: "A1", description: "Servicio", quantity: 1, unitPrice: 100, amount: 100 }],
        subtotal: 100,
        total: 116
      }

      const analyzeSpy = vi.spyOn(service, 'analyzeTextWithDeepSeek').mockResolvedValue('mockResponseStr')
      const parseSpy = vi.spyOn(service, 'parseJSONResponse').mockReturnValue(mockInvoiceData)

      const mockFile = new File([''], 'factura-completa.pdf', { type: 'application/pdf' })
      const result = await service.extractInvoiceData(mockFile)

      expect(service.processFile).toHaveBeenCalledWith(mockFile)
      expect(service.analyzeTextWithDeepSeek).toHaveBeenCalledWith('Texto de factura completa procesada')

      // La confianza de un JSON que tiene la mayoría de requiredFields debe ser alta
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.invoiceNumber).toBe('INV-001')

      analyzeSpy.mockRestore()
      parseSpy.mockRestore()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Integración con la Edge Function `ai-chat`
  // ═════════════════════════════════════════════════════════════
  describe('analyzeTextWithDeepSeek', () => {
    it('invoca la Edge Function ai-chat pidiendo JSON y devuelve el texto generado', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: true, data: { text: '{"invoiceNumber":"123"}' } },
        error: null
      })

      const result = await service.analyzeTextWithDeepSeek('Texto de prueba admin')

      expect(invokeMock).toHaveBeenCalledWith('ai-chat', expect.objectContaining({
        body: expect.objectContaining({
          responseFormat: 'json',
          prompt: expect.stringContaining('Texto de prueba admin')
        })
      }))
      expect(result).toBe('{"invoiceNumber":"123"}')
    })

    it('lanza { code, message } cuando la Edge Function responde con error', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: false, error: { code: 'INVALID_KEY', message: 'Llave inválida' } },
        error: null
      })

      await expect(service.analyzeTextWithDeepSeek('texto')).rejects.toMatchObject({
        code: 'INVALID_KEY',
        message: 'Llave inválida'
      })
    })
  })
})
