import { describe, it, expect } from 'vitest'
import { normalizarAjustes, cajaImagen, AJUSTES_POR_DEFECTO } from '@/utils/ajustesSello.js'

describe('ajustesSello', () => {
  it('sin ajustes reproduce las medidas de siempre (sello 22 mm alto, 18 mm sobre la línea)', () => {
    const c = cajaImagen('sello', AJUSTES_POR_DEFECTO.sello, 75, 1)
    expect(c).toEqual({ x: 10, y: -18, ancho: 22, alto: 22 })
    const f = cajaImagen('firma', AJUSTES_POR_DEFECTO.firma, 75, 2)
    expect(f).toEqual({ x: 75 - 4 - 28, y: -13, ancho: 28, alto: 14 })
  })

  it('agrandar crece hacia arriba (el borde inferior no se mueve)', () => {
    const normal = cajaImagen('sello', { escala: 1 }, 75, 1)
    const grande = cajaImagen('sello', { escala: 1.5 }, 75, 1)
    expect(grande.alto).toBe(33)
    expect(grande.y + grande.alto).toBe(normal.y + normal.alto)
  })

  it('mueve con dx/dy en milímetros', () => {
    const c = cajaImagen('sello', { escala: 1, dx: 6, dy: -4 }, 75, 1)
    expect(c.x).toBe(16)
    expect(c.y).toBe(-22)
  })

  it('normaliza valores fuera de rango o basura', () => {
    expect(normalizarAjustes({ sello: { escala: 9, dx: -99, dy: 'x' } })).toEqual({
      sello: { escala: 1.6, dx: -20, dy: 0 },
      firma: { escala: 1, dx: 0, dy: 0 },
    })
    expect(normalizarAjustes(null)).toEqual({ sello: { escala: 1, dx: 0, dy: 0 }, firma: { escala: 1, dx: 0, dy: 0 } })
  })
})
