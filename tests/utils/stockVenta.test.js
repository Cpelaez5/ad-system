import { describe, it, expect } from 'vitest'
import { esServicio, vendible, excedeStock } from '@/utils/stockVenta'

describe('stockVenta', () => {
  const servicio = { tipo: 'servicio', stock: 0 }
  const agotado = { tipo: 'producto', stock: 0 }
  const normal = { stock: 5 }

  it('los servicios siempre se pueden vender, aunque su stock sea 0', () => {
    expect(esServicio(servicio)).toBe(true)
    expect(vendible(servicio, 'VENTA')).toBe(true)
    expect(vendible(agotado, 'VENTA')).toBe(false)
    expect(vendible(normal, 'VENTA')).toBe(true)
    expect(vendible(agotado, 'COMPRA')).toBe(true)
  })

  it('un servicio nunca excede el stock', () => {
    expect(excedeStock({ product: servicio, quantity: 10 }, 'VENTA')).toBe(false)
  })

  it('un producto excede si pide más de lo que hay (solo en venta)', () => {
    expect(excedeStock({ product: normal, quantity: 6 }, 'VENTA')).toBe(true)
    expect(excedeStock({ product: normal, quantity: 5 }, 'VENTA')).toBe(false)
    expect(excedeStock({ product: normal, quantity: 6 }, 'COMPRA')).toBe(false)
    expect(excedeStock({ product: null, quantity: 6 }, 'VENTA')).toBe(false)
  })
})
