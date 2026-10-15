import { describe, it, expect } from 'vitest'
import { formatearTasaEscrita, parsearTasaEscrita, tasaParaCampo } from '@/utils/monedas.js'

describe('campo de tasa en bolívares', () => {
  it('pone puntos de miles y coma decimal mientras se escribe', () => {
    expect(formatearTasaEscrita('104036')).toBe('104.036')
    expect(formatearTasaEscrita('104.036,7')).toBe('104.036,7')
    expect(formatearTasaEscrita('104.036,778')).toBe('104.036,77')
    expect(formatearTasaEscrita('1040367')).toBe('1.040.367')
    expect(formatearTasaEscrita('Bs 879,1')).toBe('879,1')
    expect(formatearTasaEscrita('')).toBe('')
  })
  it('el punto que escribe la persona al final es la coma decimal', () => {
    expect(formatearTasaEscrita('879.')).toBe('879,')
    expect(formatearTasaEscrita('879,12')).toBe('879,12')
  })
  it('lee el campo formateado sin confundir puntos de miles', () => {
    expect(parsearTasaEscrita('104.036,77')).toBe(104036.77)
    expect(parsearTasaEscrita('104.036')).toBe(104036)
    expect(parsearTasaEscrita('879,12')).toBe(879.12)
    expect(parsearTasaEscrita('0')).toBeNull()
    expect(parsearTasaEscrita('abc')).toBeNull()
  })
  it('convierte un número guardado al formato del campo', () => {
    expect(tasaParaCampo(104036.77)).toBe('104.036,77')
    expect(tasaParaCampo(879.1)).toBe('879,10')
    expect(tasaParaCampo(null)).toBe('')
  })
})
