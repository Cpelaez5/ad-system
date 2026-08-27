/**
 * Tests unitarios para el servicio OCR de Inventario (inventoryOCRService.js)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    
    global.fetch = vi.fn()
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
})
