/**
 * Tests unitarios para el servicio Gemini OCR Frontend (geminiOcrService.js)
 *
 * Cubre:
 * - Validación de cliente (tipo y tamaño)
 * - Simulación de compresión de imagen
 * - Manejo de subida a Storage (Supabase)
 * - Invocación de la Edge Function y su manejo de errores
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks globales
vi.mock('@/lib/supabaseClient', () => {
  const uploadMock = vi.fn().mockResolvedValue({ error: null })
  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'fake-token', user: { id: 'u123' } } }
        })
      },
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock
        }))
      }
    }
  }
})

vi.mock('browser-image-compression', () => {
  return {
    default: vi.fn().mockResolvedValue(new File([''], 'compressed.jpg', { type: 'image/jpeg' }))
  }
})

import { supabase } from '@/lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import { procesarComprobanteOCR } from '@/services/gemini/geminiOcrService'

describe('geminiOcrService - procesarComprobanteOCR', () => {
  let onProgress;

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    onProgress = vi.fn()
    
    // Importante: setear variables de entorno para fetch url
    import.meta.env.VITE_SUPABASE_URL = 'https://fake-supabase.com'
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: Validaciones de cliente
  // ═════════════════════════════════════════════════════════════
  it('rechaza archivos que no sean PDF o Imagen', async () => {
    const txtFile = new File([''], 'test.txt', { type: 'text/plain' })
    await expect(procesarComprobanteOCR(txtFile)).rejects.toMatchObject({
      code: 'INVALID_TYPE'
    })
  })

  it('rechaza archivos mayores a 15MB', async () => {
    // Creamos un fake file con size property > 15MB
    const bigFile = new File([''], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(bigFile, 'size', { value: 16 * 1024 * 1024 })
    
    await expect(procesarComprobanteOCR(bigFile)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE'
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Compresión y Storage
  // ═════════════════════════════════════════════════════════════
  it('comprime la imagen antes de subirla', async () => {
    global.fetch.mockResolvedValue({ json: async () => ({ ok: true, data: {} }) })
    const imgFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
    
    await procesarComprobanteOCR(imgFile, { onProgress })
    
    expect(imageCompression).toHaveBeenCalledWith(imgFile, expect.any(Object))
    expect(onProgress).toHaveBeenCalledWith('Optimizando imagen...')
    expect(onProgress).toHaveBeenCalledWith('Subiendo documento...')
  })

  it('falla limpiamente si Supabase Storage devuelve un error', async () => {
    // Forzamos error en upload
    const uploadMock = supabase.storage.from().upload
    uploadMock.mockResolvedValueOnce({ error: { message: 'Storage is full' } })
    
    const imgFile = new File([''], 'test.png', { type: 'image/png' })
    
    await expect(procesarComprobanteOCR(imgFile)).rejects.toMatchObject({
      code: 'UPLOAD_ERROR',
      message: 'Storage is full'
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 3: Edge Function Fetch
  // ═════════════════════════════════════════════════════════════
  it('llama a la Edge Function gemini-ocr con el path de storage y el token', async () => {
    const mockExtractedData = { monto: 100, fecha: '2026-08-26' }
    global.fetch.mockResolvedValue({
      json: async () => ({ ok: true, data: mockExtractedData })
    })

    const pdfFile = new File([''], 'recibo.pdf', { type: 'application/pdf' })
    const result = await procesarComprobanteOCR(pdfFile, { onProgress })

    expect(onProgress).toHaveBeenCalledWith('Analizando con IA...')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    
    const fetchArgs = global.fetch.mock.calls[0]
    expect(fetchArgs[0]).toBe('https://fake-supabase.com/functions/v1/gemini-ocr')
    
    const payload = JSON.parse(fetchArgs[1].body)
    expect(payload).toHaveProperty('file_path')
    expect(payload.file_path).toContain('u123/')
    expect(payload.file_path).toContain('recibo.pdf')
    
    expect(result).toEqual(mockExtractedData)
  })

  it('formatea errores estructurados si la Edge Function devuelve HTTP 400+', async () => {
    global.fetch.mockResolvedValue({
      json: async () => ({ ok: false, error: { code: 'PREVIEW_RATE_LIMIT', message: 'Límite excedido' } })
    })

    const pdfFile = new File([''], 'recibo.pdf', { type: 'application/pdf' })
    await expect(procesarComprobanteOCR(pdfFile)).rejects.toMatchObject({
      code: 'PREVIEW_RATE_LIMIT',
      message: 'Has superado el límite de peticiones rápidas de tu proveedor. Espera un minuto e intenta de nuevo.',
      suggestManualEntry: true
    })
  })
})
