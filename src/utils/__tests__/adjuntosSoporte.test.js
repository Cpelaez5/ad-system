import { describe, it, expect } from 'vitest'
import {
  MAX_BYTES, MAX_POR_MENSAJE, PESO_PARA_COMPRIMIR, adjuntosDeMensaje, construirRuta,
  dimensionesReducidas, extensionDeMime, necesitaComprimir, validarArchivos,
} from '../adjuntosSoporte.js'

const img = (type = 'image/png', size = 1000, name = 'a.png') => ({ type, size, name })

describe('validarArchivos', () => {
  it('acepta png, jpeg y webp', () => {
    const r = validarArchivos(0, [img('image/png'), img('image/jpeg'), img('image/webp')])
    expect(r.aceptados).toHaveLength(3)
    expect(r.rechazados).toHaveLength(0)
  })

  it('rechaza lo que no es imagen permitida', () => {
    const r = validarArchivos(0, [img('application/pdf', 10, 'x.pdf'), img('image/gif', 10, 'x.gif')])
    expect(r.aceptados).toHaveLength(0)
    expect(r.rechazados.map((x) => x.nombre)).toEqual(['x.pdf', 'x.gif'])
  })

  it('rechaza imágenes de más de 5 MB y acepta justo 5 MB', () => {
    expect(validarArchivos(0, [img('image/png', MAX_BYTES + 1)]).rechazados[0].motivo).toMatch(/5 MB/)
    expect(validarArchivos(0, [img('image/png', MAX_BYTES)]).aceptados).toHaveLength(1)
  })

  it('máximo 4 por mensaje contando las que ya estaban', () => {
    const cinco = Array.from({ length: 5 }, () => img())
    const r = validarArchivos(0, cinco)
    expect(r.aceptados).toHaveLength(MAX_POR_MENSAJE)
    expect(r.rechazados).toHaveLength(1)
    expect(validarArchivos(3, [img(), img()]).aceptados).toHaveLength(1)
    expect(validarArchivos(4, [img()]).aceptados).toHaveLength(0)
  })
})

describe('rutas y extensiones', () => {
  it('construye <conversacion>/<uuid>.<ext>', () => {
    expect(construirRuta('c-1', 'u-2', 'image/webp')).toBe('c-1/u-2.webp')
    expect(construirRuta('c-1', 'u-2', 'image/jpeg')).toBe('c-1/u-2.jpg')
    expect(construirRuta('c-1', 'u-2', 'image/png')).toBe('c-1/u-2.png')
  })
  it('mime desconocido cae en jpg', () => {
    expect(extensionDeMime('image/raro')).toBe('jpg')
  })
})

describe('tamaño y compresión', () => {
  it('no agranda ni toca lo que cabe en 1920', () => {
    expect(dimensionesReducidas(1000, 800)).toEqual({ ancho: 1000, alto: 800 })
  })
  it('reduce el lado mayor a 1920 manteniendo la proporción', () => {
    expect(dimensionesReducidas(3840, 2160)).toEqual({ ancho: 1920, alto: 1080 })
    expect(dimensionesReducidas(1080, 2400)).toEqual({ ancho: 864, alto: 1920 })
  })
  it('medidas inválidas devuelven 0', () => {
    expect(dimensionesReducidas(0, 10)).toEqual({ ancho: 0, alto: 0 })
  })
  it('comprime si es pesada o muy grande', () => {
    expect(necesitaComprimir({ size: PESO_PARA_COMPRIMIR + 1, ancho: 800, alto: 600 })).toBe(true)
    expect(necesitaComprimir({ size: 1000, ancho: 2500, alto: 600 })).toBe(true)
    expect(necesitaComprimir({ size: 1000, ancho: 800, alto: 600 })).toBe(false)
  })
})

describe('adjuntosDeMensaje', () => {
  it('tolera nulos y formatos raros', () => {
    expect(adjuntosDeMensaje(null)).toEqual([])
    expect(adjuntosDeMensaje({ adjuntos: null })).toEqual([])
    expect(adjuntosDeMensaje({ adjuntos: [{ path: 'a/b.png' }, null, { x: 1 }] })).toEqual([{ path: 'a/b.png' }])
  })
})
