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
  SIN_CATEGORIA,
  SIN_NOMBRE_CLIENTE,
} from '../resumenFinanciero'

const TASA = { dollar: 40, euro: 44 }

function factura({ monto, moneda = 'VES', fecha, categoria, cliente }) {
  return {
    issueDate: fecha,
    financial: { totalSales: monto, currency: moneda },
    expenseCategory: categoria ? { name: categoria } : null,
    client: cliente ? { companyName: cliente } : {},
  }
}

describe('convertirAUsd / obtenerMontoUsd', () => {
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

  it('obtenerMontoUsd lee financial.totalSales y financial.currency', () => {
    const f = factura({ monto: 4000, moneda: 'VES' })
    expect(obtenerMontoUsd(f, TASA)).toBe(100)
  })
})

describe('sumarMontosUsd', () => {
  it('suma facturas en monedas mixtas, todas convertidas a USD', () => {
    const facturas = [
      factura({ monto: 100, moneda: 'USD' }),
      factura({ monto: 4000, moneda: 'VES' }), // 100
      factura({ monto: 10, moneda: 'EUR' }), // 11
    ]
    expect(sumarMontosUsd(facturas, TASA)).toBe(211)
  })

  it('array vacío o null da 0', () => {
    expect(sumarMontosUsd([], TASA)).toBe(0)
    expect(sumarMontosUsd(null, TASA)).toBe(0)
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

describe('obtenerRangoPeriodo', () => {
  const hoy = new Date(2026, 9, 13) // 13 oct 2026 (local)

  it('este_mes: del 1 de octubre a hoy; anterior = septiembre completo', () => {
    const r = obtenerRangoPeriodo('este_mes', hoy)
    expect(r.inicio).toEqual(new Date(2026, 9, 1))
    expect(r.fin.getDate()).toBe(13)
    expect(r.fin.getMonth()).toBe(9)
    expect(r.inicioAnterior).toEqual(new Date(2026, 8, 1))
    expect(r.finAnterior.getMonth()).toBe(8)
    expect(r.finAnterior.getDate()).toBe(30)
  })

  it('mes_pasado: septiembre completo; anterior = agosto completo', () => {
    const r = obtenerRangoPeriodo('mes_pasado', hoy)
    expect(r.inicio).toEqual(new Date(2026, 8, 1))
    expect(r.fin.getMonth()).toBe(8)
    expect(r.fin.getDate()).toBe(30)
    expect(r.inicioAnterior).toEqual(new Date(2026, 7, 1))
    expect(r.finAnterior.getMonth()).toBe(7)
    expect(r.finAnterior.getDate()).toBe(31)
  })

  it('este_anio: 1 de enero a hoy; anterior = año pasado completo', () => {
    const r = obtenerRangoPeriodo('este_anio', hoy)
    expect(r.inicio).toEqual(new Date(2026, 0, 1))
    expect(r.fin.getMonth()).toBe(9)
    expect(r.fin.getDate()).toBe(13)
    expect(r.inicioAnterior).toEqual(new Date(2025, 0, 1))
    expect(r.finAnterior).toEqual(new Date(2025, 11, 31, 23, 59, 59, 999))
  })

  it('un período desconocido cae al comportamiento de este_mes', () => {
    const r = obtenerRangoPeriodo('otro', hoy)
    expect(r.inicio).toEqual(new Date(2026, 9, 1))
  })
})

describe('etiquetaPeriodoAnterior', () => {
  it('nombra el período anterior según el período elegido', () => {
    expect(etiquetaPeriodoAnterior('este_mes')).toBe('el mes pasado')
    expect(etiquetaPeriodoAnterior('mes_pasado')).toBe('el mes anterior')
    expect(etiquetaPeriodoAnterior('este_anio')).toBe('el año pasado')
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

  it('100% cuando antes era 0 y ahora hay algo', () => {
    expect(calcularVariacion(50, 0)).toBe(100)
  })

  it('-100% cuando antes era 0 y ahora es negativo (no debería pasar pero no explota)', () => {
    expect(calcularVariacion(-50, 0)).toBe(-100)
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

  it('positivo: "X% más que <etiqueta>"', () => {
    expect(textoComparacion(12.4, 'el mes pasado')).toBe('12% más que el mes pasado')
  })

  it('negativo: "X% menos que <etiqueta>"', () => {
    expect(textoComparacion(-8.6, 'el mes pasado')).toBe('9% menos que el mes pasado')
  })

  it('diferencia menor a 0.5% se lee como "Igual que..."', () => {
    expect(textoComparacion(0.2, 'el mes pasado')).toBe('Igual que el mes pasado')
    expect(textoComparacion(-0.1, 'el mes pasado')).toBe('Igual que el mes pasado')
  })
})
