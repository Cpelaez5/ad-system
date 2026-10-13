import { describe, it, expect } from 'vitest'
import { normalizarRif } from '../rif'

describe('normalizarRif', () => {
  it('deja intacto un RIF ya bien formado', () => {
    expect(normalizarRif('J-12345678-9')).toBe('J-12345678-9')
  })

  it('normaliza un RIF en minúsculas y sin guiones', () => {
    expect(normalizarRif('j123456789')).toBe('J-12345678-9')
  })

  it('ignora espacios y otros separadores', () => {
    expect(normalizarRif(' V 12345678 9 ')).toBe('V-12345678-9')
    expect(normalizarRif('G.123.456.789')).toBe('G-12345678-9')
  })

  it('asume Jurídica cuando el OCR no trae la letra pero sí 9 dígitos', () => {
    expect(normalizarRif('123456789')).toBe('J-12345678-9')
  })

  it('conserva la letra cuando sí viene, incluso con 9 dígitos', () => {
    expect(normalizarRif('E-98765432-1')).toBe('E-98765432-1')
    expect(normalizarRif('P987654321')).toBe('P-98765432-1')
  })

  it('devuelve el RIF sin dígito verificador cuando el OCR lo recorta', () => {
    expect(normalizarRif('J-12345678')).toBe('J-12345678')
  })

  it('devuelve null para entradas vacías o inválidas', () => {
    expect(normalizarRif('')).toBeNull()
    expect(normalizarRif(null)).toBeNull()
    expect(normalizarRif(undefined)).toBeNull()
    expect(normalizarRif('ABC')).toBeNull()
    expect(normalizarRif('12345')).toBeNull() // muy corto
    expect(normalizarRif('X123456789')).toBeNull() // letra inválida
  })

  it('dos formatos distintos del mismo RIF normalizan igual (para matching)', () => {
    const deLaBD = normalizarRif('J-30123456-7')
    const delOcr = normalizarRif('j301234567')
    expect(deLaBD).toBe(delOcr)
  })
})
