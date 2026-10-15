import { describe, it, expect } from 'vitest'
import { INTERVALO_MIN_MS, puedeSonar, useSonidoMensaje, CLAVE_SONIDO } from '../useSonidoMensaje.js'

describe('puedeSonar (límite de 1,5 s)', () => {
  it('suena la primera vez', () => {
    expect(puedeSonar(0, 1000)).toBe(true)
  })
  it('no suena si pasó menos del intervalo', () => {
    expect(puedeSonar(1000, 1000 + INTERVALO_MIN_MS - 1)).toBe(false)
  })
  it('suena al cumplirse el intervalo', () => {
    expect(puedeSonar(1000, 1000 + INTERVALO_MIN_MS)).toBe(true)
  })
})

describe('useSonidoMensaje', () => {
  it('sin AudioContext (o sin gesto) no falla ni suena', () => {
    const { reproducir } = useSonidoMensaje()
    expect(reproducir()).toBe(false)
  })

  it('alternar silencia, guarda la preferencia y no suena', () => {
    const guardado = {}
    globalThis.localStorage = { getItem: (k) => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = v } }
    const { silenciado, alternar, reproducir } = useSonidoMensaje()
    const antes = silenciado.value
    alternar()
    expect(silenciado.value).toBe(!antes)
    expect(guardado[CLAVE_SONIDO]).toBe(silenciado.value ? 'off' : 'on')
    if (!antes) expect(reproducir()).toBe(false)
    if (!silenciado.value) alternar()
    expect(reproducir()).toBe(false)
  })
})
