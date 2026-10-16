import { describe, it, expect } from 'vitest'
import {
  periodoPorDefecto, moverPeriodo, periodosRecientes, nombrePeriodo, rangoPeriodo, rangoQuincena, textoQuincena,
  parsePeriodo, periodoDeFecha, quincenaDeFecha, fechaEnPeriodo,
} from '../periodos.js'

describe('periodoPorDefecto', () => {
  it('antes del día 16 muestra el mes anterior', () => {
    expect(periodoPorDefecto(new Date(2026, 9, 15))).toBe('202609')
    expect(periodoPorDefecto(new Date(2026, 9, 1))).toBe('202609')
  })
  it('desde el día 16 muestra el mes en curso', () => {
    expect(periodoPorDefecto(new Date(2026, 9, 16))).toBe('202610')
    expect(periodoPorDefecto(new Date(2026, 9, 31))).toBe('202610')
  })
  it('en enero antes del 16 cae en diciembre del año anterior', () => {
    expect(periodoPorDefecto(new Date(2026, 0, 10))).toBe('202512')
  })
})

describe('helpers de período', () => {
  it('parsea y rechaza', () => {
    expect(parsePeriodo('202610')).toEqual({ anio: 2026, mes: 10 })
    expect(parsePeriodo('202613')).toBeNull()
    expect(parsePeriodo('')).toBeNull()
  })
  it('mueve meses cruzando el año', () => {
    expect(moverPeriodo('202601', -1)).toBe('202512')
    expect(moverPeriodo('202512', 1)).toBe('202601')
  })
  it('lista los meses recientes', () => {
    expect(periodosRecientes(new Date(2026, 9, 20), 3)).toEqual(['202610', '202609', '202608'])
  })
  it('nombra el período', () => {
    expect(nombrePeriodo('202610')).toBe('Octubre 2026')
    expect(nombrePeriodo('202610', { corto: true })).toBe('Octubre')
  })
  it('rangos del mes y de las quincenas (incluye febrero bisiesto)', () => {
    expect(rangoPeriodo('202610')).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' })
    expect(rangoQuincena('202610', 1)).toEqual({ desde: '2026-10-01', hasta: '2026-10-15' })
    expect(rangoQuincena('202610', 2)).toEqual({ desde: '2026-10-16', hasta: '2026-10-31' })
    expect(rangoQuincena('202402', 2).hasta).toBe('2024-02-29')
    expect(rangoQuincena('202610', 3)).toBeNull()
  })
  it('texto de quincena', () => {
    expect(textoQuincena('202610', 1)).toBe('1ra quincena · 1 al 15')
    expect(textoQuincena('202611', 2)).toBe('2da quincena · 16 al 30')
  })
  it('período y quincena de una fecha', () => {
    expect(periodoDeFecha('2026-10-07')).toBe('202610')
    expect(periodoDeFecha('2026-10-07T12:00:00Z')).toBe('202610')
    expect(quincenaDeFecha('2026-10-15')).toBe(1)
    expect(quincenaDeFecha('2026-10-16')).toBe(2)
    expect(quincenaDeFecha(null)).toBeNull()
    expect(fechaEnPeriodo('2026-10-16', '202610', 1)).toBe(false)
    expect(fechaEnPeriodo('2026-10-16', '202610', 2)).toBe(true)
    expect(fechaEnPeriodo('2026-11-01', '202610')).toBe(false)
  })
})
