/**
 * Tests unitarios para el servicio OCR de Inventario (inventoryOCRService.js)
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

import service from '@/services/inventoryOCRService'

describe('InventoryOCRService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Espiar métodos heredados (BaseOCRService)
    vi.spyOn(service, 'validateFile').mockImplementation(() => true)
    vi.spyOn(service, 'convertPdfToImage').mockResolvedValue(new File([''], 'test.jpg'))
    vi.spyOn(service, 'compressImage').mockResolvedValue(new File([''], 'compressed.jpg'))
    vi.spyOn(service, 'fileToBase64').mockResolvedValue('base64StringMock')
    vi.spyOn(service, 'performLocalOCR').mockResolvedValue('Texto extraído fallback OCR')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Analyze Image (Estrategia Principal)
  // ═════════════════════════════════════════════════════════════
  describe('analyzeImage', () => {
    it('intenta llamar a DeepSeek Vision como primera opción', async () => {
      const visionSpy = vi.spyOn(service, 'callDeepSeekVision').mockResolvedValue('{"items":[{"name":"Cafe"}]}')
      const parseSpy = vi.spyOn(service, 'parseResponse').mockReturnValue({ items: [{ name: 'Cafe' }] })

      const mockImage = new File([''], 'inventario.jpg', { type: 'image/jpeg' })
      const result = await service.analyzeImage(mockImage)
      
      expect(service.compressImage).toHaveBeenCalledWith(mockImage)
      expect(service.fileToBase64).toHaveBeenCalled()
      expect(service.callDeepSeekVision).toHaveBeenCalledWith('base64StringMock')
      
      // OCR fallback no se debe llamar si vision funciona
      expect(service.performLocalOCR).not.toHaveBeenCalled()
      expect(result).toEqual({ items: [{ name: 'Cafe' }] })
      
      visionSpy.mockRestore()
      parseSpy.mockRestore()
    })

    it('utiliza OCR de texto (fallback) si DeepSeek Vision falla', async () => {
      // Simulamos fallo en Vision
      const visionSpy = vi.spyOn(service, 'callDeepSeekVision').mockRejectedValue(new Error('Vision endpoint not available'))
      const textAnalyzeSpy = vi.spyOn(service, 'analyzeTextWithDeepSeek').mockResolvedValue({ items: [{ name: 'Harina' }] })

      const mockImage = new File([''], 'inventario2.jpg', { type: 'image/jpeg' })
      const result = await service.analyzeImage(mockImage)
      
      expect(service.callDeepSeekVision).toHaveBeenCalled() // Intentó vision
      expect(service.performLocalOCR).toHaveBeenCalled() // Fallback Tesseract invocado
      expect(service.analyzeTextWithDeepSeek).toHaveBeenCalledWith('Texto extraído fallback OCR')
      expect(result).toEqual({ items: [{ name: 'Harina' }] })
      
      visionSpy.mockRestore()
      textAnalyzeSpy.mockRestore()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Integración real con la Edge Function `ai-chat`
  // ═════════════════════════════════════════════════════════════
  describe('callDeepSeekVision / analyzeTextWithDeepSeek (implementación real)', () => {
    it('callDeepSeekVision envía la imagen en base64 a ai-chat y devuelve el texto', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: true, data: { text: '{"items":[]}' } },
        error: null
      })

      const result = await service.callDeepSeekVision('base64StringMock')

      expect(invokeMock).toHaveBeenCalledWith('ai-chat', expect.objectContaining({
        body: expect.objectContaining({
          images: [{ mimeType: 'image/jpeg', base64: 'base64StringMock' }],
          responseFormat: 'json'
        })
      }))
      expect(result).toBe('{"items":[]}')
    })

    it('analyzeTextWithDeepSeek envía el texto a ai-chat y parsea la respuesta', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: true, data: { text: '{"items":[{"name":"Azucar"}]}' } },
        error: null
      })

      const result = await service.analyzeTextWithDeepSeek('Texto de inventario')

      const [, options] = invokeMock.mock.calls[0]
      expect(options.body.prompt).toContain('Texto de inventario')
      expect(result).toEqual({ items: [{ name: 'Azucar' }] })
    })
  })
})
