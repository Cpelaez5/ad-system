import { describe, it, expect } from 'vitest'
import {
  convertirAUsd,
  obtenerMontoUsd,
  sumarMontosUsd,
  filtrarPorRango,
  obtenerRangoPeriodo,
  etiquetaPeriodoAnterior,
  agruparPorMes,
  topCategorias,
  topClientes,
  calcularVariacion,
  textoComparacion,
  UMBRAL_SIN_CAMBIO,
  SIN_CATEGORIA,
  SIN_NOMBRE_CLIENTE,
} from '../resumenFinanciero'

const TASA = { dollar: 40, euro: 44 }

function factura({ monto, moneda = 'VES', fecha, categoria, cliente, exchangeRate, exchangeRateEur }) {
  return {
    issueDate: fecha,
    financial: { totalSales: monto, currency: moneda, exchangeRate, exchangeRateEur },
    expenseCategory: categoria ? { name: categoria } : null,
    client: cliente ? { companyName: cliente } : {},
  }
}

describe('convertirAUsd (tasa ya conocida, uso de bajo nivel)', () => {
  it('USD se devuelve igual', () => {
    expect(convertirAUsd(100, 'USD', TASA)).toBe(100)
  })

  it('VES se divide por la tasa del dólar', () => {
    expect(convertirAUsd(4000, 'VES', TASA)).toBe(100)
  })

  it('EUR se pasa por VES y luego a USD', () => {
    // 10 EUR -> 440 VES -> 11 USD
    expect(convertirAUsd(10, 'EUR', TASA)).toBe(11)
  })

  it('sin tasa (0 o ausente) no parte por cero: devuelve el monto tal cual', () => {
    expect(convertirAUsd(4000, 'VES', {})).toBe(4000)
    expect(convertirAUsd(4000, 'VES', { dollar: 0 })).toBe(4000)
  })
})

describe('obtenerMontoUsd (hallazgo #5: tasa de la factura primero, excluye si no hay ninguna)', () => {
  it('USD no necesita conversión', () => {
    const f = factura({ monto: 100, moneda: 'USD' })
    expect(obtenerMontoUsd(f, TASA)).toEqual({ valor: 100, excluida: false })
  })

  it('VES usa la tasa guardada en la factura si existe, aunque la tasa BCV actual sea otra', () => {
    const f = factura({ monto: 4000, moneda: 'VES', exchangeRate: 20 }) // tasa del día en que se emitió
    expect(obtenerMontoUsd(f, TASA)).toEqual({ valor: 200, excluida: false }) // 4000/20, no 4000/40
  })

  it('VES sin tasa guardada usa la tasa BCV actual', () => {
    const f = factura({ monto: 4000, moneda: 'VES' })
    expect(obtenerMontoUsd(f, TASA)).toEqual({ valor: 100, excluida: false }) // 4000/40
  })

  it('VES sin ninguna tasa disponible se excluye (nunca suma Bs como USD)', () => {
    const f = factura({ monto: 4000, moneda: 'VES' })
    expect(obtenerMontoUsd(f, {})).toEqual({ valor: 0, excluida: true })
    expect(obtenerMontoUsd(f, { dollar: 0 })).toEqual({ valor: 0, excluida: true })
  })

  it('EUR usa sus propias tasas guardadas (euro y dólar) si existen', () => {
    const f = factura({ monto: 10, moneda: 'EUR', exchangeRate: 20, exchangeRateEur: 22 })
    expect(obtenerMontoUsd(f, TASA)).toEqual({ valor: 11, excluida: false }) // 10*22/20, no 10*44/40
  })

  it('EUR sin tasas guardadas usa las tasas BCV actuales', () => {
    const f = factura({ monto: 10, moneda: 'EUR' })
    expect(obtenerMontoUsd(f, TASA)).toEqual({ valor: 11, excluida: false })
  })

  it('EUR se excluye si falta la tasa del euro o la del dólar (guardada y BCV)', () => {
    const f = factura({ monto: 10, moneda: 'EUR' })
    expect(obtenerMontoUsd(f, { dollar: 40 }).excluida).toBe(true) // sin tasa de euro
    expect(obtenerMontoUsd(f, { euro: 44 }).excluida).toBe(true) // sin tasa de dólar
  })
})

describe('sumarMontosUsd', () => {
  it('suma facturas en monedas mixtas, todas convertidas a USD', () => {
    const facturas = [
      factura({ monto: 100, moneda: 'USD' }),
      factura({ monto: 4000, moneda: 'VES' }), // 100
      factura({ monto: 10, moneda: 'EUR' }), // 11
    ]
    expect(sumarMontosUsd(facturas, TASA)).toEqual({ total: 211, excluidas: 0 })
  })

  it('array vacío o null da 0 y ninguna excluida', () => {
    expect(sumarMontosUsd([], TASA)).toEqual({ total: 0, excluidas: 0 })
    expect(sumarMontosUsd(null, TASA)).toEqual({ total: 0, excluidas: 0 })
  })

  it('cuenta las facturas sin tasa en vez de inflar el total (hallazgo #5)', () => {
    const facturas = [
      factura({ monto: 100, moneda: 'USD' }),
      factura({ monto: 999999, moneda: 'VES' }), // sin tasa, se excluye
    ]
    expect(sumarMontosUsd(facturas, {})).toEqual({ total: 100, excluidas: 1 })
  })
})

describe('filtrarPorRango', () => {
  it('incluye los bordes del rango y excluye lo de afuera', () => {
    const facturas = [
      factura({ monto: 1, fecha: '2026-09-30' }),
      factura({ monto: 2, fecha: '2026-10-01' }),
      factura({ monto: 3, fecha: '2026-10-15' }),
      factura({ monto: 4, fecha: '2026-10-31' }),
      factura({ monto: 5, fecha: '2026-11-01' }),
    ]
    const inicio = new Date(2026, 9, 1) // 1 oct 2026 local
    const fin = new Date(2026, 9, 31, 23, 59, 59, 999)
    const resultado = filtrarPorRango(facturas, inicio, fin)
    expect(resultado.map((f) => f.financial.totalSales)).toEqual([2, 3, 4])
  })

  it('usa la fecha local, nunca corre un día (regla fechas.js)', () => {
    const facturas = [factura({ monto: 1, fecha: '2026-10-01' })]
    const inicio = new Date(2026, 9, 1)
    const fin = new Date(2026, 9, 1, 23, 59, 59, 999)
    expect(filtrarPorRango(facturas, inicio, fin)).toHaveLength(1)
  })
})

describe('obtenerRangoPeriodo (hallazgo #4: compara contra el MISMO TRAMO del período anterior)', () => {
  const hoy = new Date(2026, 9, 13) // 13 oct 2026 (local)

  it('este_mes: del 1 de octubre a hoy; anterior = del 1 al 13 de septiembre (mismo tramo, NO septiembre completo)', () => {
    const r = obtenerRangoPeriodo('este_mes', hoy)
    expect(r.inicio).toEqual(new Date(2026, 9, 1))
    expect(r.fin.getDate()).toBe(13)
    expect(r.fin.getMonth()).toBe(9)
    expect(r.inicioAnterior).toEqual(new Date(2026, 8, 1))
    expect(r.finAnterior.getMonth()).toBe(8)
    expect(r.finAnterior.getDate()).toBe(13) // NO 30: mismo día, no el mes completo
  })

  it('este_mes: si el día de hoy no existe en el mes anterior, se acota al último día de ese mes', () => {
    const hoy31 = new Date(2026, 2, 31) // 31 de marzo
    const r = obtenerRangoPeriodo('este_mes', hoy31)
    expect(r.finAnterior.getMonth()).toBe(1) // febrero
    expect(r.finAnterior.getDate()).toBe(28) // 2026 no es bisiesto
  })

  it('mes_pasado: septiembre completo; anterior = agosto completo (no hay tramo que acotar, ambos ya cerrados)', () => {
    const r = obtenerRangoPeriodo('mes_pasado', hoy)
    expect(r.inicio).toEqual(new Date(2026, 8, 1))
    expect(r.fin.getMonth()).toBe(8)
    expect(r.fin.getDate()).toBe(30)
    expect(r.inicioAnterior).toEqual(new Date(2026, 7, 1))
    expect(r.finAnterior.getMonth()).toBe(7)
    expect(r.finAnterior.getDate()).toBe(31)
  })

  it('este_anio: 1 de enero a hoy; anterior = del 1 de enero al 13 de octubre del año pasado (mismo tramo, NO el año completo)', () => {
    const r = obtenerRangoPeriodo('este_anio', hoy)
    expect(r.inicio).toEqual(new Date(2026, 0, 1))
    expect(r.fin.getMonth()).toBe(9)
    expect(r.fin.getDate()).toBe(13)
    expect(r.inicioAnterior).toEqual(new Date(2025, 0, 1))
    expect(r.finAnterior).toEqual(new Date(2025, 9, 13, 23, 59, 59, 999)) // NO 31/dic
  })

  it('este_anio: 29 de febrero (bisiesto) se acota al 28 en el año pasado si no es bisiesto', () => {
    const hoy29feb = new Date(2024, 1, 29) // 2024 es bisiesto
    const r = obtenerRangoPeriodo('este_anio', hoy29feb)
    expect(r.finAnterior.getFullYear()).toBe(2023)
    expect(r.finAnterior.getMonth()).toBe(1)
    expect(r.finAnterior.getDate()).toBe(28)
  })

  it('un período desconocido cae al comportamiento de este_mes', () => {
    const r = obtenerRangoPeriodo('otro', hoy)
    expect(r.inicio).toEqual(new Date(2026, 9, 1))
  })
})

describe('etiquetaPeriodoAnterior', () => {
  it('"este_mes"/"este_anio" aclaran "a esta altura de", porque comparan el mismo tramo', () => {
    expect(etiquetaPeriodoAnterior('este_mes')).toBe('a esta altura del mes pasado')
    expect(etiquetaPeriodoAnterior('mes_pasado')).toBe('el mes anterior')
    expect(etiquetaPeriodoAnterior('este_anio')).toBe('a esta altura del año pasado')
  })
})

describe('agruparPorMes', () => {
  it('devuelve 6 meses terminando en el mes de la fecha de referencia', () => {
    const hoy = new Date(2026, 9, 13) // oct 2026
    const ventas = [factura({ monto: 100, moneda: 'USD', fecha: '2026-10-05' })]
    const compras = [factura({ monto: 40, moneda: 'USD', fecha: '2026-09-10' })]
    const { labels, vendi, gaste } = agruparPorMes(ventas, compras, TASA, 6, hoy)

    expect(labels).toEqual(['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'])
    expect(vendi[5]).toBe(100) // octubre
    expect(gaste[4]).toBe(40) // septiembre
    expect(vendi[0]).toBe(0) // mayo sin datos
  })

  it('no suma facturas en Bs sin tasa disponible', () => {
    const hoy = new Date(2026, 9, 13)
    const ventas = [factura({ monto: 999999, moneda: 'VES', fecha: '2026-10-05' })]
    const { vendi } = agruparPorMes(ventas, [], {}, 6, hoy)
    expect(vendi[5]).toBe(0)
  })
})

describe('topCategorias', () => {
  it('agrupa por categoría, usa "Sin categoría" sin expenseCategory y ordena descendente', () => {
    const compras = [
      factura({ monto: 100, moneda: 'USD', categoria: 'Mercancía' }),
      factura({ monto: 50, moneda: 'USD', categoria: 'Mercancía' }),
      factura({ monto: 200, moneda: 'USD' }), // sin categoría
      factura({ monto: 10, moneda: 'USD', categoria: 'Servicios' }),
    ]
    const top = topCategorias(compras, TASA, 5)
    expect(top[0]).toEqual({ nombre: SIN_CATEGORIA, monto: 200, porcentaje: expect.closeTo(55.56, 1) })
    expect(top[1].nombre).toBe('Mercancía')
    expect(top[1].monto).toBe(150)
    expect(top[2].nombre).toBe('Servicios')
  })

  it('respeta el límite', () => {
    const compras = ['A', 'B', 'C', 'D'].map((c) => factura({ monto: 1, moneda: 'USD', categoria: c }))
    expect(topCategorias(compras, TASA, 2)).toHaveLength(2)
  })

  it('excluye facturas en Bs sin tasa disponible (no infla ninguna categoría)', () => {
    const compras = [
      factura({ monto: 10, moneda: 'USD', categoria: 'Mercancía' }),
      factura({ monto: 999999, moneda: 'VES', categoria: 'Mercancía' }), // sin tasa
    ]
    const top = topCategorias(compras, {}, 5)
    expect(top[0]).toEqual({ nombre: 'Mercancía', monto: 10, porcentaje: 100 })
  })
})

describe('topClientes', () => {
  it('agrupa por client.companyName y usa "Cliente sin nombre" si falta', () => {
    const ventas = [
      factura({ monto: 300, moneda: 'USD', cliente: 'Panadería Lola' }),
      factura({ monto: 100, moneda: 'USD', cliente: 'Panadería Lola' }),
      factura({ monto: 50, moneda: 'USD' }),
    ]
    const top = topClientes(ventas, TASA, 5)
    expect(top[0]).toEqual({ nombre: 'Panadería Lola', monto: 400, porcentaje: expect.closeTo(88.89, 1) })
    expect(top[1].nombre).toBe(SIN_NOMBRE_CLIENTE)
  })
})

describe('calcularVariacion', () => {
  it('null cuando ambos valores son 0 (sin base de comparación)', () => {
    expect(calcularVariacion(0, 0)).toBeNull()
  })

  it('"nuevo" cuando antes era 0 y ahora hay algo (crecimiento indefinido, no "100%")', () => {
    expect(calcularVariacion(50, 0)).toBe('nuevo')
  })

  it('"nuevo" también si antes era 0 y ahora es negativo (no debería pasar pero no explota)', () => {
    expect(calcularVariacion(-50, 0)).toBe('nuevo')
  })

  it('variación normal entre dos valores positivos', () => {
    expect(calcularVariacion(120, 100)).toBe(20)
    expect(calcularVariacion(80, 100)).toBe(-20)
  })
})

describe('textoComparacion', () => {
  it('sin datos (null) da texto vacío, para que la tarjeta no muestre nada', () => {
    expect(textoComparacion(null, 'el mes pasado')).toBe('')
  })

  it('"nuevo" tiene su propio texto, sin inventar un porcentaje', () => {
    expect(textoComparacion('nuevo', 'el mes pasado')).toBe('No hubo nada el mes pasado para comparar')
  })

  it('positivo: "X% más que <etiqueta>"', () => {
    expect(textoComparacion(12.4, 'a esta altura del mes pasado')).toBe('12% más que a esta altura del mes pasado')
  })

  it('negativo: "X% menos que <etiqueta>"', () => {
    expect(textoComparacion(-8.6, 'el mes pasado')).toBe('9% menos que el mes pasado')
  })

  it('diferencia menor al umbral (UMBRAL_SIN_CAMBIO) se lee como "Igual que..."', () => {
    expect(UMBRAL_SIN_CAMBIO).toBe(0.5)
    expect(textoComparacion(0.2, 'el mes pasado')).toBe('Igual que el mes pasado')
    expect(textoComparacion(-0.1, 'el mes pasado')).toBe('Igual que el mes pasado')
  })
})
