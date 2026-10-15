import { describe, it, expect } from 'vitest'
import { resumenDelMes, porCobrar, siguientePasoMovimientos } from '../resumenMovimientos.js'
import { montoFacturaEn } from '../monedas.js'

const ahora = new Date(2026, 9, 14)
const inv = (o) => ({ status: 'EMITIDA', flow: 'VENTA', issueDate: '2026-10-05', financial: { totalSales: 100, currency: 'USD' }, ...o })

describe('resumenMovimientos', () => {
  it('convierte VES con tasa a USD y omite VES sin tasa (antes aUSD)', () => {
    const ves = { financial: { totalSales: 3600, currency: 'VES' } }
    expect(montoFacturaEn(ves, 'USD', 36).monto).toBe(100)
    expect(montoFacturaEn(ves, 'USD', 0)).toEqual({ monto: 0, aproximado: false, sinTasa: true })
    expect(montoFacturaEn({ financial: { totalSales: 50, currency: 'USD' } }, 'USD', 0).monto).toBe(50)
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
    expect(r.sinTasa).toBe(0)
  })

  it('cuenta las facturas sin tasa en vez de inventar un monto', () => {
    const lista = [
      inv({}),
      inv({ financial: { totalSales: 3600, currency: 'VES' } }),
      inv({ financial: { totalSales: 500, currency: 'CNY' } }),
    ]
    const r = resumenDelMes(lista, 0, ahora)
    expect(r.vendi).toBe(100)
    expect(r.sinTasa).toBe(2)
  })

  it('usa la tasa guardada en cada factura antes que la de hoy', () => {
    const lista = [inv({ financial: { totalSales: 3000, currency: 'VES', exchangeRate: 30 } })]
    expect(resumenDelMes(lista, { USD: 60 }, ahora).vendi).toBe(100)
  })

  it('convierte euros y yuanes con tasas completas', () => {
    const lista = [
      inv({ financial: { totalSales: 10, currency: 'EUR', exchangeRateEur: 50, exchangeRate: 40 } }),
      inv({ financial: { totalSales: 100, currency: 'CNY', tasas: { USD: 40, CNY: 5 } } }),
    ]
    expect(resumenDelMes(lista, {}, ahora).vendi).toBe(25)
  })

  it('por cobrar cuenta solo ventas a crédito o vencidas', () => {
    const r = porCobrar([inv({ status: 'CRÉDITO' }), inv({ status: 'VENCIDA' }), inv({}), inv({ flow: 'COMPRA', status: 'CRÉDITO' })], 36)
    expect(r).toEqual({ monto: 200, cantidad: 2, sinTasa: 0 })
  })

  it('por cobrar cuenta las que no tienen tasa', () => {
    const r = porCobrar([inv({ status: 'CRÉDITO', financial: { totalSales: 3600, currency: 'VES' } })], 0)
    expect(r).toEqual({ monto: 0, cantidad: 1, sinTasa: 1 })
  })

  it('siguiente paso: borradores primero, luego cobrar, luego retenciones, luego listo', () => {
    const ret = inv({ flow: 'COMPRA', retenciones: { iva: 5 } })
    expect(siguientePasoMovimientos([inv({ status: 'BORRADOR' }), inv({ status: 'CRÉDITO' })], 36).tipo).toBe('borradores')
    expect(siguientePasoMovimientos([inv({ status: 'CRÉDITO' }), ret], 36).tipo).toBe('cobrar')
    expect(siguientePasoMovimientos([ret], 36)).toEqual({ tipo: 'retenciones', cantidad: 1 })
    expect(siguientePasoMovimientos([inv({})], 36).tipo).toBe('listo')
  })
})

describe('totales en bolívares (antes aVES)', () => {
  it('deja los bolívares igual y convierte dólares con la tasa', () => {
    expect(montoFacturaEn({ financial: { totalSales: 100, currency: 'VES' } }, 'VES', 36).monto).toBe(100)
    expect(montoFacturaEn({ financial: { totalSales: 10, currency: 'USD' } }, 'VES', 36).monto).toBe(360)
  })
  it('sin tasa no inventa un monto; el euro ya se convierte si hay tasa', () => {
    expect(montoFacturaEn({ financial: { totalSales: 10, currency: 'USD' } }, 'VES', 0).sinTasa).toBe(true)
    expect(montoFacturaEn({ financial: { totalSales: 10, currency: 'EUR' } }, 'VES', 36).sinTasa).toBe(true)
    expect(montoFacturaEn({ financial: { totalSales: 10, currency: 'EUR' } }, 'VES', { EUR: 50 }).monto).toBe(500)
  })
})
