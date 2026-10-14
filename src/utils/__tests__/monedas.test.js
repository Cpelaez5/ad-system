import { describe, it, expect } from 'vitest'
import {
  MONEDAS, CODIGOS_MONEDA, CODIGOS_CON_TASA, MONEDAS_VISTA, MONEDAS_OTRAS,
  esMonedaValida, simboloDe, nombreDe, normalizarTasas, tasasDeFactura,
  convertir, montoFacturaEn, sumarFacturasEn, textoSinTasa, monedaDeFactura, parsearTasa
} from '../monedas.js'

const factura = (financial) => ({ financial })

describe('MONEDAS', () => {
  it('tiene las 6 monedas del BCV con símbolo y nombre en español', () => {
    expect(CODIGOS_MONEDA).toEqual(['VES', 'USD', 'EUR', 'CNY', 'TRY', 'RUB'])
    expect(MONEDAS.VES).toEqual({ codigo: 'VES', simbolo: 'Bs', nombre: 'Bolívar' })
    expect(MONEDAS.USD.simbolo).toBe('$')
    expect(MONEDAS.EUR.simbolo).toBe('€')
    expect(MONEDAS.CNY.nombre).toBe('Yuan')
    expect(MONEDAS.TRY.nombre).toBe('Lira turca')
    expect(MONEDAS.RUB.nombre).toBe('Rublo')
  })
  it('separa las monedas a la vista de las de "Otra moneda"', () => {
    expect(MONEDAS_VISTA).toEqual(['VES', 'USD', 'EUR'])
    expect(MONEDAS_OTRAS).toEqual(['CNY', 'TRY', 'RUB'])
    expect(CODIGOS_CON_TASA).not.toContain('VES')
  })
  it('valida códigos y da símbolo/nombre con respaldo', () => {
    expect(esMonedaValida('USD')).toBe(true)
    expect(esMonedaValida('GBP')).toBe(false)
    expect(esMonedaValida('toString')).toBe(false)
    expect(simboloDe('EUR')).toBe('€')
    expect(simboloDe('GBP')).toBe('GBP')
    expect(simboloDe(undefined)).toBe('Bs')
    expect(nombreDe('USD')).toBe('Dólar')
    expect(nombreDe(undefined)).toBe('')
  })
})

describe('normalizarTasas', () => {
  it('un número es la tasa del dólar', () => {
    expect(normalizarTasas(36)).toEqual({ USD: 36 })
    expect(normalizarTasas('36.5')).toEqual({ USD: 36.5 })
    expect(normalizarTasas(0)).toEqual({})
  })
  it('entiende la forma de bcvService', () => {
    expect(normalizarTasas({ dollar: 40, euro: 45, yuan: 5.5, lira: 1.2, rublo: 0.5, date: 'x' }))
      .toEqual({ USD: 40, EUR: 45, CNY: 5.5, TRY: 1.2, RUB: 0.5 })
  })
  it('entiende la forma de tasas_manuales', () => {
    expect(normalizarTasas({ USD: { tasa: 877.9, fecha: '2026-10-14' }, EUR: { tasa: 0 } })).toEqual({ USD: 877.9 })
  })
  it('descarta lo inválido y tolera null', () => {
    expect(normalizarTasas(null)).toEqual({})
    expect(normalizarTasas(undefined)).toEqual({})
    expect(normalizarTasas({ USD: 'abc', EUR: -3, CNY: NaN })).toEqual({})
    expect(normalizarTasas(true)).toEqual({})
  })
})

describe('tasasDeFactura', () => {
  it('lee financial.tasas', () => {
    expect(tasasDeFactura(factura({ tasas: { USD: 40, CNY: 5.6 } }))).toEqual({ USD: 40, CNY: 5.6 })
  })
  it('usa exchangeRate y exchangeRateEur cuando no hay tasas', () => {
    expect(tasasDeFactura(factura({ exchangeRate: 38, exchangeRateEur: 42 }))).toEqual({ USD: 38, EUR: 42 })
  })
  it('financial.tasas manda sobre los campos viejos, y los completa', () => {
    expect(tasasDeFactura(factura({ tasas: { USD: 40 }, exchangeRate: 38, exchangeRateEur: 42 })))
      .toEqual({ USD: 40, EUR: 42 })
  })
  it('exchangeRate = 1 es el relleno del formulario, no una tasa', () => {
    expect(tasasDeFactura(factura({ exchangeRate: 1, exchangeRateEur: null }))).toEqual({})
  })
  it('factura sin financial o nula devuelve {}', () => {
    expect(tasasDeFactura({})).toEqual({})
    expect(tasasDeFactura(null)).toEqual({})
  })
})

describe('convertir', () => {
  const tasas = { USD: 40, EUR: 50, CNY: 5 }
  it('VES = 1', () => {
    expect(convertir(400, 'VES', 'USD', tasas)).toBe(10)
    expect(convertir(10, 'USD', 'VES', tasas)).toBe(400)
  })
  it('entre dos monedas extranjeras pasa por bolívares', () => {
    expect(convertir(10, 'EUR', 'USD', tasas)).toBe(12.5)
    expect(convertir(100, 'CNY', 'USD', tasas)).toBe(12.5)
  })
  it('misma moneda: no necesita tasa', () => {
    expect(convertir(7, 'USD', 'USD', {})).toBe(7)
    expect(convertir(7, 'VES', 'VES', null)).toBe(7)
    expect(convertir(7, undefined, 'VES', {})).toBe(7)
  })
  it('devuelve null (no 0) si falta una tasa', () => {
    expect(convertir(10, 'USD', 'VES', {})).toBeNull()
    expect(convertir(10, 'TRY', 'USD', tasas)).toBeNull()
    expect(convertir(10, 'VES', 'EUR', { USD: 40 })).toBeNull()
    expect(convertir(10, 'USD', 'VES', { USD: 0 })).toBeNull()
  })
  it('un monto de cero es 0 aunque no haya tasa', () => {
    expect(convertir(0, 'USD', 'VES', {})).toBe(0)
  })
  it('monto no numérico devuelve null', () => {
    expect(convertir('abc', 'USD', 'VES', tasas)).toBeNull()
    expect(convertir(undefined, 'USD', 'VES', tasas)).toBeNull()
  })
  it('acepta tasas con forma de bcvService o un número', () => {
    expect(convertir(10, 'USD', 'VES', { dollar: 40 })).toBe(400)
    expect(convertir(10, 'USD', 'VES', 40)).toBe(400)
  })
})

describe('montoFacturaEn', () => {
  it('usa la tasa de la factura antes que la vigente', () => {
    const inv = factura({ totalSales: 3600, currency: 'VES', exchangeRate: 36 })
    expect(montoFacturaEn(inv, 'USD', { USD: 100 })).toEqual({ monto: 100, aproximado: false, sinTasa: false })
  })
  it('sin tasa propia usa la vigente y marca aproximado', () => {
    const inv = factura({ totalSales: 4000, currency: 'VES' })
    expect(montoFacturaEn(inv, 'USD', { USD: 40 })).toEqual({ monto: 100, aproximado: true, sinTasa: false })
  })
  it('sin ninguna tasa: sinTasa y monto 0 (no se inventa)', () => {
    const inv = factura({ totalSales: 4000, currency: 'VES' })
    expect(montoFacturaEn(inv, 'USD', {})).toEqual({ monto: 0, aproximado: false, sinTasa: true })
    expect(montoFacturaEn(inv, 'USD', undefined).sinTasa).toBe(true)
  })
  it('misma moneda no pide tasa', () => {
    const inv = factura({ totalSales: 50, currency: 'USD' })
    expect(montoFacturaEn(inv, 'USD', {})).toEqual({ monto: 50, aproximado: false, sinTasa: false })
  })
  it('sin moneda = bolívares', () => {
    expect(monedaDeFactura(factura({ totalSales: 10 }))).toBe('VES')
    expect(montoFacturaEn(factura({ totalSales: 10 }), 'VES', {}).monto).toBe(10)
    expect(montoFacturaEn(factura({ totalSales: 400 }), 'USD', { USD: 40 }).monto).toBe(10)
  })
  it('factura en USD a bolívares con su tasa', () => {
    const inv = factura({ totalSales: 10, currency: 'USD', exchangeRate: 38 })
    expect(montoFacturaEn(inv, 'VES', { USD: 40 })).toEqual({ monto: 380, aproximado: false, sinTasa: false })
  })
  it('factura en EUR a USD con tasas propias', () => {
    const inv = factura({ totalSales: 10, currency: 'EUR', exchangeRate: 40, exchangeRateEur: 50 })
    expect(montoFacturaEn(inv, 'USD', {}).monto).toBe(12.5)
  })
  it('factura en CNY con tasa propia de financial.tasas', () => {
    const inv = factura({ totalSales: 100, currency: 'CNY', tasas: { USD: 40, CNY: 5 } })
    expect(montoFacturaEn(inv, 'USD', {})).toEqual({ monto: 12.5, aproximado: false, sinTasa: false })
    expect(montoFacturaEn(inv, 'VES', {}).monto).toBe(500)
  })
  it('factura en CNY sin tasa de yuan: usa la vigente (aproximado) o queda sin tasa', () => {
    const inv = factura({ totalSales: 100, currency: 'CNY', exchangeRate: 40 })
    expect(montoFacturaEn(inv, 'USD', { CNY: 5 })).toEqual({ monto: 12.5, aproximado: true, sinTasa: false })
    expect(montoFacturaEn(inv, 'USD', {}).sinTasa).toBe(true)
  })
  it('mezcla: tasa propia de un lado y vigente del otro marca aproximado', () => {
    const inv = factura({ totalSales: 10, currency: 'EUR', exchangeRateEur: 50 })
    expect(montoFacturaEn(inv, 'USD', { USD: 40 })).toEqual({ monto: 12.5, aproximado: true, sinTasa: false })
  })
  it('permite convertir otro monto (retención) de la misma factura', () => {
    const inv = factura({ totalSales: 999, currency: 'USD', exchangeRate: 40 })
    expect(montoFacturaEn(inv, 'VES', {}, { monto: 2 }).monto).toBe(80)
  })
  it('monto cero o ausente: 0 sin pedir tasa', () => {
    expect(montoFacturaEn(factura({ totalSales: 0, currency: 'USD' }), 'VES', {})).toEqual({ monto: 0, aproximado: false, sinTasa: false })
    expect(montoFacturaEn({}, 'USD', {})).toEqual({ monto: 0, aproximado: false, sinTasa: false })
  })
  it('una tasa propia inválida cae a la vigente', () => {
    const inv = factura({ totalSales: 400, currency: 'VES', exchangeRate: 'x' })
    expect(montoFacturaEn(inv, 'USD', { USD: 40 }).aproximado).toBe(true)
  })
})

describe('parsearTasa', () => {
  it('lee coma o punto decimal y miles', () => {
    expect(parsearTasa('877,9')).toBe(877.9)
    expect(parsearTasa('877.9')).toBe(877.9)
    expect(parsearTasa('1.234,56')).toBe(1234.56)
    expect(parsearTasa(' Bs 40 ')).toBe(40)
    expect(parsearTasa(40)).toBe(40)
  })
  it('devuelve null si no es un número mayor que cero', () => {
    for (const malo of ['', '   ', 'abc', '0', '-5', '1,2,3', null, undefined, 0, NaN]) {
      expect(parsearTasa(malo)).toBeNull()
    }
  })
})

describe('sumarFacturasEn y textoSinTasa', () => {
  it('suma, cuenta aproximadas y deja fuera las sin tasa', () => {
    const lista = [
      factura({ totalSales: 10, currency: 'USD' }),
      factura({ totalSales: 400, currency: 'VES' }),
      factura({ totalSales: 100, currency: 'CNY' })
    ]
    expect(sumarFacturasEn(lista, 'USD', { USD: 40 })).toEqual({ total: 20, aproximadas: 1, sinTasa: 1 })
  })
  it('acepta un selector de monto y listas vacías', () => {
    expect(sumarFacturasEn([factura({ currency: 'USD' })], 'USD', {}, () => 5).total).toBe(5)
    expect(sumarFacturasEn(null, 'USD', {})).toEqual({ total: 0, aproximadas: 0, sinTasa: 0 })
  })
  it('textoSinTasa', () => {
    expect(textoSinTasa(0)).toBe('')
    expect(textoSinTasa(1)).toBe('1 factura sin tasa')
    expect(textoSinTasa(3)).toBe('3 facturas sin tasa')
  })
})
