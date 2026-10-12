/**
 * Tests unitarios para el servicio OCR Fiscal (fiscalOCRService.js)
 *
 * Cubre:
 * - Extracción de texto y fallback a OCR local.
 * - Integración con la Edge Function `ai-chat` (mockeando supabase.functions.invoke).
 * - Formateo y clasificación de la respuesta.
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

import service from '@/services/fiscalOCRService'

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
  // Suite 2: Integración con la Edge Function `ai-chat`
  // ═════════════════════════════════════════════════════════════
  describe('analyzeTextWithDeepSeek', () => {
    it('invoca ai-chat con el texto en el prompt y retorna el texto generado', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: true, data: { text: '{"category":"MUNICIPAL"}' } },
        error: null
      })

      const content = await service.analyzeTextWithDeepSeek('Texto de prueba municipal')

      expect(invokeMock).toHaveBeenCalledTimes(1)
      expect(content).toBe('{"category":"MUNICIPAL"}')

      const [fnName, options] = invokeMock.mock.calls[0]
      expect(fnName).toBe('ai-chat')
      expect(options.body.responseFormat).toBe('json')
      expect(options.body.prompt).toContain('Texto de prueba municipal')
    })

    it('lanza un error { code, message } si la Edge Function falla (ej. clave inválida)', async () => {
      invokeMock.mockResolvedValue({
        data: { ok: false, error: { code: 'INVALID_KEY', message: 'Invalid API Key' } },
        error: null
      })

      await expect(service.analyzeTextWithDeepSeek('texto')).rejects.toMatchObject({
        code: 'INVALID_KEY',
        message: 'Invalid API Key'
      })
    })
  })
})
