import { describe, it, expect } from 'vitest'
import { fotosASuprimir } from '@/utils/fotosProducto'

describe('fotosASuprimir', () => {
  it('al reemplazar y guardar borra la anterior, salvo la nueva y la original', () => {
    const r = fotosASuprimir({
      iniciales: ['vieja', 'orig'], subidas: ['nueva'], conservar: ['nueva', 'orig'], guardado: true,
    })
    expect(r).toEqual(['vieja'])
  })

  it('si la foto mejorada reemplaza a la original subida, conserva ambas rutas finales', () => {
    const r = fotosASuprimir({
      iniciales: [null, null], subidas: ['orig', 'mejorada'], conservar: ['mejorada', 'orig'], guardado: true,
    })
    expect(r).toEqual([])
  })

  it('una foto descartada en la comparación se borra', () => {
    const r = fotosASuprimir({ iniciales: [], subidas: ['orig', 'mejorada'], conservar: ['orig', 'orig'], guardado: true })
    expect(r).toEqual(['mejorada'])
  })

  it('al cancelar borra solo lo subido en la sesión, nunca lo que ya tenía', () => {
    const r = fotosASuprimir({
      iniciales: ['vieja', 'orig'], subidas: ['nueva'], conservar: ['vieja', 'orig'], guardado: false,
    })
    expect(r).toEqual(['nueva'])
  })

  it('al cancelar una alta nueva borra todo lo subido', () => {
    expect(fotosASuprimir({ iniciales: [], subidas: ['a', 'a', 'b'], conservar: [], guardado: false })).toEqual(['a', 'b'])
  })

  it('ignora nulos', () => {
    expect(fotosASuprimir({ iniciales: [null], subidas: [null], conservar: [null], guardado: true })).toEqual([])
  })
})
