/**
 * Tests unitarios de storageUrlService.js
 *
 * Cubre:
 * - extraerRutaStorage: rutas relativas, URLs públicas antiguas, URLs firmadas antiguas,
 *   valores inválidos (dataURL, otro bucket, URLs externas, vacío/null).
 * - obtenerUrlFirmada: generación vía createSignedUrl, caché en memoria, manejo de errores.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn()
    }
  }
}))

import { supabase } from '@/lib/supabaseClient'
import { extraerRutaStorage, obtenerUrlFirmada } from '@/services/storageUrlService.js'

describe('extraerRutaStorage', () => {
  it('devuelve la misma ruta si ya es una ruta relativa', () => {
    expect(extraerRutaStorage('documents', 'org123/FISCAL/archivo.pdf')).toBe('org123/FISCAL/archivo.pdf')
  })

  it('devuelve la ruta relativa de sellos/firmas con subcarpetas', () => {
    const ruta = 'seals-signatures/org123/clients/client456/seal_123.png'
    expect(extraerRutaStorage('documents', ruta)).toBe(ruta)
  })

  it('extrae la ruta de una URL pública antigua', () => {
    const url = 'https://xyzproject.supabase.co/storage/v1/object/public/documents/org123/FISCAL/archivo.pdf'
    expect(extraerRutaStorage('documents', url)).toBe('org123/FISCAL/archivo.pdf')
  })

  it('extrae la ruta de una URL firmada antigua con token', () => {
    const url = 'https://xyzproject.supabase.co/storage/v1/object/sign/invoices/org123/factura.jpg?token=abc.def.ghi'
    expect(extraerRutaStorage('invoices', url)).toBe('org123/factura.jpg')
  })

  it('decodifica componentes de la ruta con caracteres especiales (espacios, etc.)', () => {
    const url = 'https://xyzproject.supabase.co/storage/v1/object/public/documents/org123/FISCAL/Factura%20Final.pdf'
    expect(extraerRutaStorage('documents', url)).toBe('org123/FISCAL/Factura Final.pdf')
  })

  it('devuelve null si la URL corresponde a otro bucket', () => {
    const url = 'https://xyzproject.supabase.co/storage/v1/object/public/invoices/org123/factura.pdf'
    expect(extraerRutaStorage('documents', url)).toBeNull()
  })

  it('devuelve null para un DataURL (base64)', () => {
    expect(extraerRutaStorage('documents', 'data:image/png;base64,AAAA')).toBeNull()
  })

  it('devuelve null para una URL http que no es de Supabase Storage', () => {
    expect(extraerRutaStorage('documents', 'https://ejemplo.com/foo.pdf')).toBeNull()
  })

  it('devuelve null para valores vacíos, null o no-string', () => {
    expect(extraerRutaStorage('documents', '')).toBeNull()
    expect(extraerRutaStorage('documents', null)).toBeNull()
    expect(extraerRutaStorage('documents', undefined)).toBeNull()
    expect(extraerRutaStorage('documents', 123)).toBeNull()
  })

  it('devuelve null si no se provee bucket', () => {
    expect(extraerRutaStorage(null, 'org123/archivo.pdf')).toBeNull()
  })
})

describe('obtenerUrlFirmada', () => {
  let createSignedUrlMock

  beforeEach(() => {
    vi.clearAllMocks()
    createSignedUrlMock = vi.fn()
    supabase.storage.from.mockReturnValue({
      createSignedUrl: createSignedUrlMock
    })
  })

  it('devuelve null si el valor no es una ruta reconocible', async () => {
    const result = await obtenerUrlFirmada('documents', 'data:image/png;base64,AAAA')
    expect(result).toBeNull()
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })

  it('genera una URL firmada a partir de una ruta relativa', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://xyz.supabase.co/storage/v1/object/sign/documents/org1/a.pdf?token=t1' },
      error: null
    })

    const result = await obtenerUrlFirmada('documents', 'org1/a.pdf', 3600)

    expect(supabase.storage.from).toHaveBeenCalledWith('documents')
    expect(createSignedUrlMock).toHaveBeenCalledWith('org1/a.pdf', 3600)
    expect(result).toBe('https://xyz.supabase.co/storage/v1/object/sign/documents/org1/a.pdf?token=t1')
  })

  it('genera la URL firmada a partir de una URL pública antigua, extrayendo la ruta', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://xyz.supabase.co/storage/v1/object/sign/invoices/org1/b.jpg?token=t2' },
      error: null
    })

    const oldPublicUrl = 'https://xyz.supabase.co/storage/v1/object/public/invoices/org1/b.jpg'
    const result = await obtenerUrlFirmada('invoices', oldPublicUrl, 1800)

    expect(createSignedUrlMock).toHaveBeenCalledWith('org1/b.jpg', 1800)
    expect(result).toBe('https://xyz.supabase.co/storage/v1/object/sign/invoices/org1/b.jpg?token=t2')
  })

  it('usa la caché en memoria para no repetir la llamada mientras la URL siga vigente', async () => {
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: 'https://xyz.supabase.co/storage/v1/object/sign/documents/org1/c.pdf?token=t3' },
      error: null
    })

    const first = await obtenerUrlFirmada('documents', 'org1/c.pdf', 3600)
    const second = await obtenerUrlFirmada('documents', 'org1/c.pdf', 3600)

    expect(first).toBe(second)
    expect(createSignedUrlMock).toHaveBeenCalledTimes(1)
  })

  it('devuelve null (sin lanzar) si Supabase responde con error', async () => {
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: 'No encontrado' } })

    const result = await obtenerUrlFirmada('documents', 'org1/no-existe.pdf')
    expect(result).toBeNull()
  })

  it('devuelve null (sin lanzar) si createSignedUrl lanza una excepción', async () => {
    createSignedUrlMock.mockRejectedValue(new Error('Network error'))

    const result = await obtenerUrlFirmada('documents', 'org1/x.pdf')
    expect(result).toBeNull()
  })

  it('devuelve null si no se reconoce el bucket en la URL dada', async () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/otro-bucket/org1/x.pdf'
    const result = await obtenerUrlFirmada('documents', url)
    expect(result).toBeNull()
    expect(supabase.storage.from).not.toHaveBeenCalled()
  })
})
