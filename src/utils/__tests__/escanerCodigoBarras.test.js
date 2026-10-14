import { describe, it, expect, afterEach } from 'vitest'
import { soportaEscaner, mensajeErrorCamara, FORMATOS_ESCANER } from '../escanerCodigoBarras'

afterEach(() => {
  delete globalThis.BarcodeDetector
})

describe('escanerCodigoBarras', () => {
  it('soportaEscaner es false sin BarcodeDetector', () => {
    expect(soportaEscaner()).toBe(false)
  })

  it('soportaEscaner es true con BarcodeDetector y cámara', () => {
    globalThis.BarcodeDetector = class {}
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getUserMedia: () => {} } }, configurable: true
    })
    expect(soportaEscaner()).toBe(true)
  })

  it('detecta los formatos pedidos', () => {
    expect(FORMATOS_ESCANER).toEqual(['ean_13', 'ean_8', 'upc_a', 'upc_e'])
  })

  it('mensaje amable si rechazan el permiso', () => {
    expect(mensajeErrorCamara({ name: 'NotAllowedError' })).toBe('Para escanear, permite usar la cámara.')
    expect(mensajeErrorCamara({ name: 'NotFoundError' })).toMatch(/No encontramos una cámara/)
    expect(mensajeErrorCamara(new Error('x'))).toMatch(/No pudimos abrir la cámara/)
  })
})
