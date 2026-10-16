import { describe, it, expect } from 'vitest'
import { estadoTarjeta, metaEstado, estadoPendiente } from '../estadoTarjeta.js'

describe('estadoTarjeta', () => {
  it('sin líneas ni declaración: nada', () => {
    expect(estadoTarjeta({})).toBe('nada')
  })
  it('con problemas: faltan datos', () => {
    expect(estadoTarjeta({ lineas: 3, montoTotal: 300, problemas: 2 })).toBe('faltan_datos')
  })
  it('con líneas y sin problemas: lista', () => {
    expect(estadoTarjeta({ lineas: 3, montoTotal: 300 })).toBe('lista')
  })
  it('descargada y declarada cuando nada cambió', () => {
    const d = { estado: 'descargada', lineas: 3, monto_total: 300 }
    expect(estadoTarjeta({ lineas: 3, montoTotal: 300, declaracion: d })).toBe('descargada')
    expect(estadoTarjeta({ lineas: 3, montoTotal: 300.004, declaracion: { ...d, estado: 'declarada' } })).toBe('declarada')
  })
  it('cambios cuando difieren las líneas o el monto', () => {
    const d = { estado: 'descargada', lineas: 3, monto_total: 300 }
    expect(estadoTarjeta({ lineas: 4, montoTotal: 300, declaracion: d })).toBe('cambios')
    expect(estadoTarjeta({ lineas: 3, montoTotal: 310, declaracion: d })).toBe('cambios')
    expect(estadoTarjeta({ lineas: 0, montoTotal: 0, declaracion: d })).toBe('cambios')
    expect(estadoTarjeta({ lineas: 4, montoTotal: 300, declaracion: { ...d, estado: 'declarada' } })).toBe('cambios')
  })
  it('meta y pendientes', () => {
    expect(metaEstado('declarada').etiqueta).toBe('Declarada')
    expect(metaEstado('raro').etiqueta).toBe('Nada que declarar')
    expect(estadoPendiente('lista')).toBe(true)
    expect(estadoPendiente('cambios')).toBe(true)
    expect(estadoPendiente('declarada')).toBe(false)
    expect(estadoPendiente('nada')).toBe(false)
  })
})
