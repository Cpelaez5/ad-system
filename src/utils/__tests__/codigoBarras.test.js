import { describe, it, expect } from 'vitest'
import { codigoBarrasValido, limpiarCodigoBarras } from '../codigoBarras'

describe('codigoBarrasValido', () => {
  it('acepta EAN-13 válido', () => expect(codigoBarrasValido('4006381333931')).toBe(true))
  it('rechaza EAN-13 con verificador errado', () => expect(codigoBarrasValido('4006381333932')).toBe(false))
  it('acepta UPC-A válido', () => expect(codigoBarrasValido('036000291452')).toBe(true))
  it('acepta EAN-8 válido', () => expect(codigoBarrasValido('96385074')).toBe(true))
  it('ignora espacios y guiones', () => expect(codigoBarrasValido('4006 3813-33931')).toBe(true))
  it('rechaza vacío, letras y largos raros', () => {
    expect(codigoBarrasValido('')).toBe(false)
    expect(codigoBarrasValido(null)).toBe(false)
    expect(codigoBarrasValido('40063813339A1')).toBe(false)
    expect(codigoBarrasValido('123456789')).toBe(false)
  })
  it('limpia separadores', () => expect(limpiarCodigoBarras(' 12-34 ')).toBe('1234'))
})
