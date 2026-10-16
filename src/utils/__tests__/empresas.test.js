import { describe, it, expect } from 'vitest'
import { estadoEmpresa, actividadEmpresa, cumpleFiltro, opcionesConCantidad, buscarEmpresas, enlaceWhatsApp, diasDesde } from '../empresas'

const ahora = new Date(2026, 9, 16, 10, 0) // 16/10/2026 10:00 local

describe('estadoEmpresa', () => {
  it('una factura vencida manda sobre todo lo demás', () => {
    const e = estadoEmpresa({ deuda_vencida_desde: '2026-08-08', facturas_pendientes: 1, suscripcion_estado: 'active' }, ahora)
    expect(e).toEqual({ clave: 'debe', texto: 'Debe desde el 08/08/2026', color: 'error' })
  })
  it('factura pendiente sin vencer = por pagar', () => {
    expect(estadoEmpresa({ facturas_pendientes: 2 }, ahora).clave).toBe('por_pagar')
  })
  it('suscripción activa = al día', () => {
    expect(estadoEmpresa({ suscripcion_estado: 'active' }, ahora).texto).toBe('Al día')
  })
  it('prueba con días restantes, último día y vencida', () => {
    expect(estadoEmpresa({ prueba_hasta: '2026-10-19T12:00:00Z' }, ahora).texto).toBe('En prueba · 3 días')
    expect(estadoEmpresa({ prueba_hasta: new Date(2026, 9, 16, 18, 30).toISOString() }, ahora).texto).toBe('En prueba · último día')
    expect(estadoEmpresa({ prueba_hasta: '2026-10-01T12:00:00Z' }, ahora).clave).toBe('prueba_vencida')
  })
  it('sin nada = sin plan', () => {
    expect(estadoEmpresa({}, ahora).clave).toBe('sin_plan')
  })
})

describe('actividadEmpresa', () => {
  it('clasifica por días desde el último registro', () => {
    expect(actividadEmpresa({ ultimo_movimiento: new Date(2026, 9, 16, 8).toISOString() }, ahora)).toEqual({ clave: 'activa', texto: 'Último registro hoy' })
    expect(actividadEmpresa({ ultimo_movimiento: new Date(2026, 9, 15, 9).toISOString() }, ahora).texto).toBe('Último registro ayer')
    expect(actividadEmpresa({ ultimo_movimiento: new Date(2026, 9, 1).toISOString() }, ahora).clave).toBe('tibia')
    expect(actividadEmpresa({ ultimo_movimiento: new Date(2026, 6, 1).toISOString() }, ahora).clave).toBe('dormida')
    expect(actividadEmpresa({}, ahora)).toEqual({ clave: 'dormida', texto: 'Nunca registró nada' })
  })
})

describe('filtros y búsqueda', () => {
  const filas = [
    { nombre: 'Panadería La Espiga', rif: 'J-12345678-9', prueba_hasta: '2026-10-25T00:00:00Z', ultimo_movimiento: new Date(2026, 9, 15).toISOString() },
    { nombre: 'Ferretería Ñandú', rif: 'V-87654321-0', facturas_pendientes: 1, deuda_vencida_desde: '2026-09-01' },
    { nombre: 'Café Central', rif: 'J-11111111-1', suscripcion_estado: 'active', ultimo_movimiento: new Date(2026, 9, 10).toISOString() },
  ]
  it('cuenta cada filtro', () => {
    const op = Object.fromEntries(opcionesConCantidad(filas, ahora).map((o) => [o.valor, o.cantidad]))
    expect(op).toEqual({ todas: 3, prueba: 1, al_dia: 1, deben: 1, dormidas: 1 })
    expect(cumpleFiltro(filas[1], 'deben', ahora)).toBe(true)
  })
  it('busca sin acentos, guiones ni mayúsculas', () => {
    expect(buscarEmpresas(filas, 'nandu').map((f) => f.nombre)).toEqual(['Ferretería Ñandú'])
    expect(buscarEmpresas(filas, 'j123456789').length).toBe(1)
    expect(buscarEmpresas(filas, 'CAFE').length).toBe(1)
    expect(buscarEmpresas(filas, '  ').length).toBe(3)
  })
})

describe('enlaceWhatsApp y diasDesde', () => {
  it('arma el enlace con el código de Venezuela', () => {
    expect(enlaceWhatsApp('0414-123.45.67')).toBe('https://wa.me/584141234567')
    expect(enlaceWhatsApp('+58 412 1234567')).toBe('https://wa.me/584121234567')
    expect(enlaceWhatsApp('123')).toBeNull()
    expect(enlaceWhatsApp(null)).toBeNull()
  })
  it('diasDesde sin fecha es null', () => {
    expect(diasDesde(null, ahora)).toBeNull()
  })
})
