import { describe, it, expect } from 'vitest'
import { analizarClaridad, esImagenClara, oscurecer, TINTAS } from '@/utils/imagenSello.js'

const px = (...pixeles) => new Uint8ClampedArray(pixeles.flat())
const BLANCO = [255, 255, 255, 255]
const NEGRO = [0, 0, 0, 255]
const TRANSPARENTE = [255, 255, 255, 0]

describe('imagenSello', () => {
  it('un ícono blanco sobre fondo transparente es "claro"', () => {
    const img = px(BLANCO, BLANCO, BLANCO, TRANSPARENTE, TRANSPARENTE)
    expect(analizarClaridad(img)).toEqual({ visibles: 3, claros: 3, proporcionClara: 1 })
    expect(esImagenClara(img)).toBe(true)
  })

  it('una firma oscura (o un JPG con fondo blanco y trazo oscuro suficiente) no es "clara"', () => {
    expect(esImagenClara(px(NEGRO, NEGRO, TRANSPARENTE))).toBe(false)
    expect(esImagenClara(px(BLANCO, BLANCO, BLANCO, NEGRO, NEGRO))).toBe(false)
  })

  it('una imagen totalmente transparente no se marca', () => {
    expect(esImagenClara(px(TRANSPARENTE, TRANSPARENTE))).toBe(false)
  })

  it('oscurecer pinta solo lo visible y conserva la transparencia', () => {
    const r = oscurecer(px([255, 255, 255, 128], TRANSPARENTE), TINTAS.azul)
    expect(Array.from(r)).toEqual([26, 58, 138, 128, 255, 255, 255, 0])
  })
})
