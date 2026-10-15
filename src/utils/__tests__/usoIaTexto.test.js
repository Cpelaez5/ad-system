import { describe, it, expect } from 'vitest'
import {
  porcentajeDeUso, fraseDeUso, accionesEnPalabras, textoRenovacion, nivelDeUso,
  colorDeUso, sugiereMejorarPlan,
} from '../usoIaTexto'

describe('usoIaTexto', () => {
  it('frase según el porcentaje', () => {
    expect(fraseDeUso(0, '2026-11-01')).toBe('Te queda bastante')
    expect(fraseDeUso(49, '2026-11-01')).toBe('Te queda bastante')
    expect(fraseDeUso(50, '2026-11-01')).toBe('Vas a mitad de mes de uso')
    expect(fraseDeUso(79, '2026-11-01')).toBe('Vas a mitad de mes de uso')
    expect(fraseDeUso(80, '2026-11-01')).toBe('Te queda poco')
    expect(fraseDeUso(99, '2026-11-01')).toBe('Te queda poco')
    expect(fraseDeUso(100, '2026-11-01')).toBe('Se renueva el 1 de noviembre')
  })

  it('renovación con y sin fecha', () => {
    expect(textoRenovacion('2026-12-01')).toBe('Se renueva el 1 de diciembre')
    expect(textoRenovacion(null)).toBe('Se renueva el mes que viene')
  })

  it('porcentaje desde la RPC, con respaldo y acotado a 0–100', () => {
    expect(porcentajeDeUso({ porcentaje: 34.4 })).toBe(34)
    expect(porcentajeDeUso({ usados: 25, limite: 100 })).toBe(25)
    expect(porcentajeDeUso({ porcentaje: 250 })).toBe(100)
    expect(porcentajeDeUso({ porcentaje: -3 })).toBe(0)
    expect(porcentajeDeUso(null)).toBe(0)
  })

  it('nivel, color y sugerencia de mejorar plan', () => {
    expect(nivelDeUso(10)).toBe('bien')
    expect(nivelDeUso(60)).toBe('medio')
    expect(nivelDeUso(85)).toBe('poco')
    expect(nivelDeUso(100)).toBe('agotado')
    expect(colorDeUso(85)).toBe('warning')
    expect(colorDeUso(100)).toBe('error')
    expect(sugiereMejorarPlan(79)).toBe(false)
    expect(sugiereMejorarPlan(80)).toBe(true)
  })

  it('acciones en palabras, singular y plural', () => {
    const lista = accionesEnPalabras({ ocr: 12, identificar: 1, estante: 1, mejorar: 3, documento: 2, chat: 18 })
    expect(lista).toEqual([
      'Leíste 12 facturas con foto',
      'Reconociste 1 producto con foto',
      'Hiciste 1 foto del estante',
      'Mejoraste 3 fotos',
      'Llenaste 2 formularios con un documento',
      'Hiciste 18 preguntas al asistente',
    ])
    expect(accionesEnPalabras({ ocr: 1, mejorar: 1, documento: 1, chat: 1 })).toEqual([
      'Leíste 1 factura con foto',
      'Mejoraste 1 foto',
      'Llenaste 1 formulario con un documento',
      'Hiciste 1 pregunta al asistente',
    ])
  })

  it('omite ceros y tolera datos raros', () => {
    expect(accionesEnPalabras({ ocr: 0, chat: 2 })).toEqual(['Hiciste 2 preguntas al asistente'])
    expect(accionesEnPalabras(null)).toEqual([])
    expect(accionesEnPalabras({ ocr: 'x' })).toEqual([])
  })

  it('nunca menciona créditos ni tokens', () => {
    const todo = [
      ...accionesEnPalabras({ ocr: 2, identificar: 2, estante: 2, mejorar: 2, documento: 2, chat: 2 }),
      fraseDeUso(10), fraseDeUso(60), fraseDeUso(90), fraseDeUso(100, '2026-11-01'),
    ].join(' ').toLowerCase()
    expect(todo).not.toMatch(/cr[eé]dito|token/)
  })
})
