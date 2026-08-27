/**
 * Tests unitarios para el servicio OCR Admin (adminOcrService.js)
 * 
 * Especializado en la extracción COMPLETA de facturas (temperatura 0)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import service from '@/services/adminOcrService'

describe('AdminOCRService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Espiar métodos base
    vi.spyOn(service, 'processFile').mockResolvedValue('Texto de factura completa procesada')
    global.fetch = vi.fn()
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
  // Suite 2: AI DeepSeek Integration (Temperatura 0.0)
  // ═════════════════════════════════════════════════════════════
  describe('analyzeTextWithDeepSeek', () => {
    it('ejecuta fetch configurando la temperatura explícitamente a 0.0', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"invoiceNumber":"123"}' } }
          ]
        })
      })

      await service.analyzeTextWithDeepSeek('Texto de prueba admin')
      
      const fetchArgs = global.fetch.mock.calls[0]
      const payload = JSON.parse(fetchArgs[1].body)
      
      expect(payload.model).toBe('deepseek-chat')
      expect(payload.temperature).toBe(0.0) // Admin requiere max precisión
      expect(payload.messages[0].content).toContain('Texto de prueba admin')
    })
  })
})
