import { describe, it, expect } from 'vitest'
import { normalizarTelefonoVE, enlaceWhatsApp, enlaceLlamada, mensajeCobroWhatsApp } from '../telefono.js'

describe('mensajeCobroWhatsApp', () => {
  it('saluda por el primer nombre y menciona el monto', () => {
    const m = mensajeCobroWhatsApp({ nombre: 'Juan Pérez', monto: '$120,00' })
    expect(m).toContain('Hola Juan,')
    expect(m).toContain('$120,00')
  })
  it('funciona sin nombre ni monto', () => {
    expect(mensajeCobroWhatsApp()).toContain('un pago')
  })
})

describe('normalizarTelefonoVE', () => {
  it('normaliza formatos venezolanos comunes', () => {
    expect(normalizarTelefonoVE('0414-123.45.67')).toBe('584141234567')
    expect(normalizarTelefonoVE('(0412) 123 4567')).toBe('584121234567')
    expect(normalizarTelefonoVE('+58 414 1234567')).toBe('584141234567')
    expect(normalizarTelefonoVE('584141234567')).toBe('584141234567')
    expect(normalizarTelefonoVE('0058-414-1234567')).toBe('584141234567')
    expect(normalizarTelefonoVE('4141234567')).toBe('584141234567')
    expect(normalizarTelefonoVE('0212-555.12.34')).toBe('582125551234')
  })
  it('rechaza lo que no es un número venezolano', () => {
    expect(normalizarTelefonoVE('')).toBeNull()
    expect(normalizarTelefonoVE(null)).toBeNull()
    expect(normalizarTelefonoVE('12345')).toBeNull()
    expect(normalizarTelefonoVE('+1 305 555 1234')).toBeNull()
  })
})

describe('enlaceWhatsApp', () => {
  it('arma wa.me con el mensaje codificado', () => {
    expect(enlaceWhatsApp('0414-1234567', 'Hola Ana, ¿cómo estás?'))
      .toBe('https://wa.me/584141234567?text=' + encodeURIComponent('Hola Ana, ¿cómo estás?'))
  })
  it('sin mensaje no agrega ?text y sin número devuelve null', () => {
    expect(enlaceWhatsApp('04141234567')).toBe('https://wa.me/584141234567')
    expect(enlaceWhatsApp('abc', 'x')).toBeNull()
  })
  it('enlaceLlamada', () => {
    expect(enlaceLlamada('0414-1234567')).toBe('tel:+584141234567')
    expect(enlaceLlamada('')).toBeNull()
  })
})
