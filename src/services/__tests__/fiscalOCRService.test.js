/**
 * Tests unitarios para el servicio OCR Fiscal (fiscalOCRService.js)
 * 
 * Cubre:
 * - Extracción de texto y fallback a OCR local.
 * - Simulación de llamadas a la API de DeepSeek (fetch mock).
 * - Formateo y clasificación de la respuesta.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import service from '@/services/fiscalOCRService'
import BaseOCRService from '@/services/baseOcrService'

describe('FiscalOCRService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Espiar métodos heredados para evitar procesamiento real de PDFs/Imágenes
    vi.spyOn(service, 'validateFile').mockImplementation(() => true)
    // String largo para pasar la validación directText.length > 100
    vi.spyOn(service, 'extractTextFromPdf').mockResolvedValue('Texto extraído directamente del PDF digital. '.repeat(10))
    vi.spyOn(service, 'convertPdfToImage').mockResolvedValue(new File([''], 'test.jpg'))
    vi.spyOn(service, 'compressImage').mockResolvedValue(new File([''], 'compressed.jpg'))
    vi.spyOn(service, 'performLocalOCR').mockResolvedValue('Texto extraído mediante OCR Tesseract')
    
    // Mock global fetch para simular DeepSeek API
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Analyze Document (Estrategia de parseo)
  // ═════════════════════════════════════════════════════════════
  describe('analyzeDocument', () => {
    it('intenta extraer texto digitalmente de un PDF primero', async () => {
      // Mock respuesta exitosa de IA
      const analyzeSpy = vi.spyOn(service, 'analyzeTextWithDeepSeek').mockResolvedValue('{"docName":"RIF"}')
      const parseSpy = vi.spyOn(service, 'parseResponse').mockReturnValue({ docName: 'RIF' })

      const mockPdf = new File([''], 'documento.pdf', { type: 'application/pdf' })
      const result = await service.analyzeDocument(mockPdf)
      
      // Debe haber llamado a extractTextFromPdf
      expect(service.extractTextFromPdf).toHaveBeenCalledWith(mockPdf)
      
      // Como simulamos que extrajo suficiente texto ('Texto extraído...'), no debió usar convertPdfToImage
      expect(service.convertPdfToImage).not.toHaveBeenCalled()
      expect(result).toEqual({ docName: 'RIF' })
      
      analyzeSpy.mockRestore()
      parseSpy.mockRestore()
    })

    it('utiliza OCR local (fallback) si el PDF no contiene texto suficiente (escaneado)', async () => {
      // Simulamos que el PDF digital no tiene texto (devuelve null o poco texto)
      service.extractTextFromPdf.mockResolvedValue('Corto') // < 100 caracteres
      
      const analyzeSpy = vi.spyOn(service, 'analyzeTextWithDeepSeek').mockResolvedValue('{"docName":"Patente"}')
      const parseSpy = vi.spyOn(service, 'parseResponse').mockReturnValue({ docName: 'Patente' })

      const mockPdf = new File([''], 'escaneado.pdf', { type: 'application/pdf' })
      await service.analyzeDocument(mockPdf)
      
      // Debe haber recurrido a imagen y OCR
      expect(service.convertPdfToImage).toHaveBeenCalledWith(mockPdf)
      expect(service.compressImage).toHaveBeenCalled()
      expect(service.performLocalOCR).toHaveBeenCalled()
      
      analyzeSpy.mockRestore()
      parseSpy.mockRestore()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: IA API DeepSeek Integration
  // ═════════════════════════════════════════════════════════════
  describe('analyzeTextWithDeepSeek', () => {
    it('realiza la petición fetch con los parámetros correctos y retorna el contenido', async () => {
      // Simulamos respuesta 200 OK de Fetch
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"category":"MUNICIPAL"}' } }
          ]
        })
      })

      const content = await service.analyzeTextWithDeepSeek('Texto de prueba municipal')
      
      expect(global.fetch).toHaveBeenCalled()
      expect(content).toBe('{"category":"MUNICIPAL"}')
      
      const fetchCallArgs = global.fetch.mock.calls[0]
      expect(fetchCallArgs[0]).toBe('https://api.deepseek.com/v1/chat/completions')
      
      // Verificamos payload
      const payload = JSON.parse(fetchCallArgs[1].body)
      expect(payload.model).toBe('deepseek-chat')
      expect(payload.messages[0].content).toContain('Texto de prueba municipal')
    })

    it('lanza un error si la API de DeepSeek falla (ej. 401 Unauthorized)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API Key' } })
      })

      await expect(service.analyzeTextWithDeepSeek('texto')).rejects.toThrow('API Error: Invalid API Key')
    })
  })
})
