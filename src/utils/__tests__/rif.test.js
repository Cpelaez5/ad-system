import { describe, it, expect } from 'vitest'
import { normalizarRif } from '../rif'

// Todos los RIF usados aquí son inventados, pero con un dígito verificador
// calculado de verdad con el algoritmo del SENIAT (pesos 4,3,2,7,6,5,4,3,2
// sobre letra+8 dígitos; DV = 11 - (suma mod 11), con 10 u 11 → 0). Ninguno
// corresponde a un contribuyente real.
describe('normalizarRif', () => {
  it('deja intacto un RIF ya bien formado con DV válido', () => {
    expect(normalizarRif('J-12345678-4')).toBe('J-12345678-4')
  })

  it('normaliza un RIF en minúsculas y sin guiones', () => {
    expect(normalizarRif('j123456784')).toBe('J-12345678-4')
  })

  it('ignora espacios y otros separadores', () => {
    expect(normalizarRif(' V 12345678 1 ')).toBe('V-12345678-1')
    expect(normalizarRif('G.123.456.787')).toBe('G-12345678-7')
  })

  it('tolera el prefijo "RIF:" (y variantes con punto/espacio)', () => {
    expect(normalizarRif('RIF: J-40123456-9')).toBe('J-40123456-9')
    expect(normalizarRif('RIF.J-40123456-9')).toBe('J-40123456-9')
    expect(normalizarRif('rif j-40123456-9')).toBe('J-40123456-9')
  })

  it('conserva la letra cuando viene con 9 dígitos', () => {
    expect(normalizarRif('E-98765432-8')).toBe('E-98765432-8')
    expect(normalizarRif('P987654320')).toBe('P-98765432-0')
  })

  it('rellena con ceros a la izquierda una cédula de 7 dígitos + DV', () => {
    // "1234567" (7 dígitos) + DV "0" → cuerpo canónico "01234567"
    expect(normalizarRif('V-1234567-0')).toBe('V-01234567-0')
  })

  it('rellena con ceros a la izquierda una cédula de 6 dígitos + DV', () => {
    // "123456" (6 dígitos) + DV "0" → cuerpo canónico "00123456"
    expect(normalizarRif('J-123456-0')).toBe('J-00123456-0')
  })

  it('no se autocrea nada: el RIF sin dígito verificador reconocible devuelve null', () => {
    // 8 dígitos "12345678" se interpretan como cuerpo(7)+DV, y ese DV no
    // valida contra "0123456" → se rechaza en vez de adivinar.
    expect(normalizarRif('J-12345678')).toBeNull()
  })

  it('devuelve null cuando el dígito verificador no valida (OCR leyó mal un dígito)', () => {
    // El DV real de J+12345678 es 4, no 9.
    expect(normalizarRif('J-12345678-9')).toBeNull()
  })

  it('ya no asume "Jurídica" cuando no hay letra, aunque traiga 9 dígitos', () => {
    expect(normalizarRif('123456789')).toBeNull()
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
    const deLaBD = normalizarRif('J-30123456-1')
    const delOcr = normalizarRif('j301234561')
    expect(deLaBD).toBe(delOcr)
    expect(deLaBD).toBe('J-30123456-1')
  })
})
