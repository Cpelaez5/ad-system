import { describe, it, expect, vi, beforeEach } from 'vitest'

// Cada tabla devuelve lo que configure `respuestas[tabla]`; el builder es
// "thenable" y registra las llamadas para poder comprobar que NO hay embeds.
const respuestas = {}
const llamadas = []
function constructor(tabla) {
  const registro = { tabla, ops: [] }
  llamadas.push(registro)
  const b = {}
  for (const m of ['select', 'insert', 'update', 'eq', 'is', 'not', 'order']) {
    b[m] = vi.fn((...args) => { registro.ops.push([m, ...args]); return b })
  }
  const resultado = () => respuestas[tabla] ?? { data: [], error: null }
  b.single = vi.fn(() => Promise.resolve(resultado()))
  b.maybeSingle = vi.fn(() => Promise.resolve(resultado()))
  b.then = (ok, ko) => Promise.resolve(resultado()).then(ok, ko)
  return b
}

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn((t) => constructor(t)),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
  }
}))
vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn(() => 'org-1'),
  getCurrentClientId: vi.fn(() => 'cli-1')
}))

import servicio, { calcularTotales, esFrecuente, sinDatosFiscales, diasDesde, esConsumidorFinal } from '@/services/clientesNegocioService.js'

const AHORA = new Date(2026, 9, 14) // 14 oct 2026
const venta = (o) => ({
  cliente_negocio_id: 'a', issue_date: '2026-10-01', status: 'PAGADA',
  financial: { totalSales: 100, currency: 'USD' }, ...o
})

beforeEach(() => {
  for (const k of Object.keys(respuestas)) delete respuestas[k]
  llamadas.length = 0
  vi.restoreAllMocks()
  vi.spyOn(servicio, '_contexto').mockResolvedValue({ orgId: 'org-1', clientId: 'cli-1' })
})

describe('calcularTotales', () => {
  it('suma 90 días, año, por cobrar y última compra', () => {
    const t = calcularTotales([
      venta({ issue_date: '2026-10-01' }),
      venta({ issue_date: '2026-03-01', status: 'PAGADA' }), // este año, fuera de 90 días
      venta({ issue_date: '2025-12-31' }), // año pasado
      venta({ issue_date: '2026-09-20', status: 'CRÉDITO', financial: { totalSales: 50, currency: 'USD' } }),
      venta({ issue_date: '2026-08-01', status: 'VENCIDA', financial: { totalSales: 30, currency: 'USD' } })
    ], 0, AHORA).a
    expect(t.comprado90).toBe(180) // 100 + 50 + 30 (1 ago está dentro de 90 días)
    expect(t.compradoAnio).toBe(280)
    expect(t.compras90).toBe(3)
    expect(t.porCobrar).toBe(80)
    expect(t.facturasPorCobrar).toBe(2)
    expect(t.deudaDesde).toBe('2026-08-01')
    expect(t.ultimaCompra).toBe('2026-10-01')
  })

  it('convierte Bs a USD con la tasa y respeta la moneda de cada factura', () => {
    const t = calcularTotales([
      venta({ financial: { totalSales: 3650, currency: 'VES' } }),
      venta({ financial: { totalSales: 20, currency: 'USD' } })
    ], 36.5, AHORA).a
    expect(t.comprado90).toBeCloseTo(120)
  })

  it('sin tasa, las ventas en Bs no suman (no se inventa un monto)', () => {
    const t = calcularTotales([venta({ financial: { totalSales: 3650, currency: 'VES' } })], 0, AHORA).a
    expect(t.comprado90).toBe(0)
  })

  it('las anuladas y borradores no cuentan; las sin cliente se ignoran', () => {
    const t = calcularTotales([
      venta({ status: 'ANULADA' }), venta({ status: 'BORRADOR' }), venta({ cliente_negocio_id: null })
    ], 0, AHORA)
    expect(t).toEqual({})
  })

  it('separa por cliente', () => {
    const t = calcularTotales([venta({}), venta({ cliente_negocio_id: 'b' })], 0, AHORA)
    expect(Object.keys(t).sort()).toEqual(['a', 'b'])
  })
})

describe('ayudantes', () => {
  it('esFrecuente: 3 o más compras en 90 días', () => {
    expect(esFrecuente({ compras90: 3 })).toBe(true)
    expect(esFrecuente({ compras90: 2 })).toBe(false)
  })
  it('sinDatosFiscales usa el RIF normalizado', () => {
    expect(sinDatosFiscales({ rif: '' })).toBe(true)
    expect(sinDatosFiscales({ rif: 'J-12345678-0' })).toBe(true) // DV inválido
    expect(sinDatosFiscales({ rif: 'j123456784' })).toBe(false)
  })
  it('diasDesde cuenta días enteros', () => {
    expect(diasDesde('2026-09-26', AHORA)).toBe(18)
    expect(diasDesde('2027-01-01', AHORA)).toBe(0)
  })
  it('esConsumidorFinal ignora acentos y mayúsculas', () => {
    expect(esConsumidorFinal(' CONSUMIDOR Final ')).toBe(true)
    expect(esConsumidorFinal('Juan')).toBe(false)
  })
})

describe('listar / obtener', () => {
  it('une clientes y ventas en JS, sin embeds de PostgREST', async () => {
    respuestas.clientes_negocio = { data: [{ id: 'a', nombre: 'Ana' }, { id: 'b', nombre: 'Beto' }], error: null }
    respuestas.invoices = { data: [venta({ status: 'CRÉDITO' })], error: null }
    const lista = await servicio.listar({ tasa: 0, ahora: AHORA })
    expect(lista[0].totales.porCobrar).toBe(100)
    expect(lista[1].totales.porCobrar).toBe(0)
    const select = llamadas.find((l) => l.tabla === 'invoices').ops.find((o) => o[0] === 'select')[1]
    expect(select).not.toMatch(/clientes_negocio\(|\(\*\)/)
  })

  it('obtener devuelve historial ordenado y totales', async () => {
    respuestas.clientes_negocio = { data: { id: 'a', nombre: 'Ana' }, error: null }
    respuestas.invoices = { data: [
      venta({ id: 'v1', issue_date: '2026-09-01' }), venta({ id: 'v2', issue_date: '2026-10-01' })
    ], error: null }
    const r = await servicio.obtener('a', { ahora: AHORA })
    expect(r.ventas.map((v) => v.id)).toEqual(['v2', 'v1'])
    expect(r.totales.compradoAnio).toBe(200)
  })

  it('obtener devuelve null si no existe', async () => {
    respuestas.clientes_negocio = { data: null, error: null }
    expect(await servicio.obtener('zzz')).toBeNull()
  })
})

describe('buscar', () => {
  beforeEach(() => {
    respuestas.clientes_negocio = { data: [
      { id: '1', nombre: 'José Pérez', rif: 'V-12345678-1' },
      { id: '2', nombre: 'Distribuidora López', rif: 'J-30123456-1' }
    ], error: null }
  })
  it('por nombre sin acentos', async () => {
    expect((await servicio.buscar('jose')).map((c) => c.id)).toEqual(['1'])
  })
  it('por RIF con o sin guiones', async () => {
    expect((await servicio.buscar('j301234')).map((c) => c.id)).toEqual(['2'])
    expect((await servicio.buscar('V-12345678')).map((c) => c.id)).toEqual(['1'])
  })
  it('devuelve [] si falla', async () => {
    respuestas.clientes_negocio = { data: null, error: new Error('red') }
    expect(await servicio.buscar('x')).toEqual([])
  })
})

describe('crear / actualizar / papelera', () => {
  it('crear exige nombre y normaliza el RIF', async () => {
    expect((await servicio.crear({ nombre: ' ' })).success).toBe(false)
    respuestas.clientes_negocio = { data: { id: 'n' }, error: null }
    const r = await servicio.crear({ nombre: 'Ana', rif: 'v123456781' })
    expect(r.success).toBe(true)
    const insert = llamadas.at(-1).ops.find((o) => o[0] === 'insert')[1][0]
    expect(insert).toMatchObject({ nombre: 'Ana', rif: 'V-12345678-1', tipo_persona: 'natural', client_id: 'cli-1', organization_id: 'org-1' })
  })
  it('RIF duplicado da un mensaje en llano', async () => {
    respuestas.clientes_negocio = { data: null, error: { code: '23505', message: 'dup' } }
    const r = await servicio.crear({ nombre: 'Ana', rif: 'V-12345678-1' })
    expect(r.success).toBe(false)
    expect(r.error).toMatch(/Ya tienes un cliente/)
  })
  it('papelera marca deleted_at y nunca borra', async () => {
    respuestas.clientes_negocio = { data: null, error: null }
    expect((await servicio.papelera('a')).success).toBe(true)
    const ops = llamadas.at(-1).ops
    expect(ops.find((o) => o[0] === 'update')[1].deleted_at).toBeTruthy()
  })
})

describe('asegurarClienteDeVenta', () => {
  it('usa cliente_negocio_id si viene', async () => {
    expect(await servicio.asegurarClienteDeVenta({ cliente_negocio_id: 'x' })).toMatchObject({ success: true, id: 'x', creado: false })
    expect(llamadas.length).toBe(0)
  })
  it('Consumidor final y sin nombre no crean nada', async () => {
    expect((await servicio.asegurarClienteDeVenta({ client: { companyName: 'Consumidor final' } })).id).toBeNull()
    expect((await servicio.asegurarClienteDeVenta({ client: { companyName: '' } })).id).toBeNull()
    expect(llamadas.length).toBe(0)
  })
  it('cliente nuevo con RIF que ya existe: reutiliza (RIF normalizado)', async () => {
    respuestas.clientes_negocio = { data: [{ id: 'e1', nombre: 'Ana', rif: 'V-12345678-1' }], error: null }
    const r = await servicio.asegurarClienteDeVenta({ client: { companyName: 'Ana P.', rif: 'v 12345678 1' } })
    expect(r).toMatchObject({ success: true, id: 'e1', creado: false })
    expect(llamadas.some((l) => l.ops.some((o) => o[0] === 'insert'))).toBe(false)
  })
  it('cliente nuevo que no existe: lo crea con los datos del formulario', async () => {
    const crear = vi.spyOn(servicio, 'crear').mockResolvedValue({ success: true, data: { id: 'nuevo' } })
    respuestas.clientes_negocio = { data: [], error: null }
    const r = await servicio.asegurarClienteDeVenta({ client: { companyName: 'Beto', rif: 'J-30123456-1', phone: '0414-1234567' } })
    expect(r).toMatchObject({ success: true, id: 'nuevo', creado: true })
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Beto', rif: 'J-30123456-1', telefono: '0414-1234567' }))
  })
  it('si no se puede comprobar duplicados, no crea y avisa', async () => {
    const crear = vi.spyOn(servicio, 'crear')
    respuestas.clientes_negocio = { data: null, error: new Error('red') }
    const r = await servicio.asegurarClienteDeVenta({ client: { companyName: 'Beto', rif: 'J-30123456-1' } })
    expect(r.success).toBe(false)
    expect(r.message).toMatch(/No pudimos comprobar/)
    expect(crear).not.toHaveBeenCalled()
  })
})
