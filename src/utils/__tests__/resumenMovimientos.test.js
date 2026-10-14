import { describe, it, expect } from 'vitest'
import { aUSD, resumenDelMes, porCobrar, siguientePasoMovimientos } from '../resumenMovimientos.js'

const ahora = new Date(2026, 9, 14)
const inv = (o) => ({ status: 'EMITIDA', flow: 'VENTA', issueDate: '2026-10-05', financial: { totalSales: 100, currency: 'USD' }, ...o })

describe('resumenMovimientos', () => {
  it('aUSD convierte VES con tasa y omite VES sin tasa', () => {
    expect(aUSD(3600, 'VES', 36)).toBe(100)
    expect(aUSD(3600, 'VES', 0)).toBe(0)
    expect(aUSD(50, 'USD', 0)).toBe(50)
  })

  it('resume el mes: vendí, gasté y retenciones; ignora borradores, anuladas y otros meses', () => {
    const lista = [
      inv({}),
      inv({ financial: { totalSales: 3600, currency: 'VES' } }),
      inv({ status: 'BORRADOR' }),
      inv({ status: 'ANULADA' }),
      inv({ issueDate: '2026-09-30' }),
      inv({ flow: 'COMPRA', financial: { totalSales: 40, currency: 'USD' }, retenciones: { iva: 3, islr: 1 } }),
    ]
    const r = resumenDelMes(lista, 36, ahora)
    expect(r.vendi).toBe(200)
    expect(r.gaste).toBe(40)
    expect(r.retenciones).toBe(4)
  })

  it('por cobrar cuenta solo ventas a crédito o vencidas', () => {
    const r = porCobrar([inv({ status: 'CRÉDITO' }), inv({ status: 'VENCIDA' }), inv({}), inv({ flow: 'COMPRA', status: 'CRÉDITO' })], 36)
    expect(r).toEqual({ monto: 200, cantidad: 2 })
  })

  it('siguiente paso: borradores primero, luego cobrar, luego retenciones, luego listo', () => {
    const ret = inv({ flow: 'COMPRA', retenciones: { iva: 5 } })
    expect(siguientePasoMovimientos([inv({ status: 'BORRADOR' }), inv({ status: 'CRÉDITO' })], 36).tipo).toBe('borradores')
    expect(siguientePasoMovimientos([inv({ status: 'CRÉDITO' }), ret], 36).tipo).toBe('cobrar')
    expect(siguientePasoMovimientos([ret], 36)).toEqual({ tipo: 'retenciones', cantidad: 1 })
    expect(siguientePasoMovimientos([inv({})], 36).tipo).toBe('listo')
  })
})
