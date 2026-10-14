import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const tablas = {}
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    rpc: (...a) => rpc(...a),
    from: (t) => tablas[t](),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  },
}))
vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: () => 'org1',
  getCurrentClientId: () => 'cli1',
}))
vi.mock('@/services/inventoryService', () => ({ default: { registerMovement: vi.fn(async () => ({ success: true })) } }))

import { crearLlave, revocarLlave, ejemploCurl } from '@/services/apiKeysService.js'
import { importarPlan, deshacerImportacion } from '@/services/importacionProductosService.js'

/** Constructor encadenable que resuelve con `resultado` al await. */
const cadena = (resultado, registro) => {
  const c = new Proxy({}, {
    get: (_, prop) => {
      if (prop === 'then') return (res) => res(resultado)
      return (...args) => { registro?.push([prop, args]); return c }
    },
  })
  return c
}

beforeEach(() => {
  rpc.mockReset()
  for (const k of Object.keys(tablas)) delete tablas[k]
})

describe('apiKeysService', () => {
  it('crea una llave y la devuelve completa una sola vez', async () => {
    rpc.mockResolvedValue({ data: [{ id: 'k1', llave: 'ads_abc', prefijo: 'ads_abc' }], error: null })
    expect(await crearLlave('Mi tienda')).toEqual({ id: 'k1', llave: 'ads_abc', prefijo: 'ads_abc' })
    expect(rpc).toHaveBeenCalledWith('crear_api_key', { p_nombre: 'Mi tienda' })
  })
  it('muestra el mensaje del servidor si falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Máximo 5 llaves activas: revoca una que no uses' } })
    await expect(crearLlave('x')).rejects.toThrow('Máximo 5')
  })
  it('revoca por id', async () => {
    rpc.mockResolvedValue({ error: null })
    await revocarLlave('k1')
    expect(rpc).toHaveBeenCalledWith('revocar_api_key', { p_id: 'k1' })
  })
  it('el ejemplo curl apunta a la función', () => {
    expect(ejemploCurl('ads_x')).toContain('/functions/v1/api-productos')
    expect(ejemploCurl('ads_x')).toContain('x-api-key: ads_x')
  })
})

describe('importarPlan', () => {
  it('importa por lotes de 50, existencias solo a nuevos (INITIAL) y registra el historial', async () => {
    const inserciones = []
    const movimientos = []
    const historial = []
    tablas.inventory_products = () => ({
      insert: (regs) => {
        inserciones.push(regs.length)
        return cadena({ data: regs.map((r, i) => ({ id: `p${inserciones.length}-${i}`, cost_price: r.cost_price || 0, stock: r.stock })), error: null })
      },
      update: () => cadena({ error: null }),
    })
    tablas.inventory_movements = () => ({ insert: (m) => { movimientos.push(...m); return Promise.resolve({ error: null }) } })
    tablas.importaciones_productos = () => ({ insert: (r) => { historial.push(r); return cadena({ data: { id: 'imp1' }, error: null }) } })

    const filas = Array.from({ length: 120 }, (_, i) => ({ fila: i + 2, estado: 'nuevo', datos: { name: `P${i}`, tipo: 'producto' }, existencias: i < 10 ? 5 : undefined, crudo: {} }))
    filas.push({ fila: 200, estado: 'actualizar', datos: { name: 'Viejo' }, existente: { id: 'e1' }, crudo: {} })
    const avance = []
    const r = await importarPlan(filas, { archivo: 'a.xlsx', rubro: 'bodega', totalArchivo: 125, onProgreso: (p) => avance.push(p.hechas) })

    expect(inserciones).toEqual([50, 50, 20])
    expect(r).toMatchObject({ creados: 120, actualizados: 1, fallidas: 0, importacionId: 'imp1' })
    expect(movimientos).toHaveLength(10)
    expect(movimientos.every((m) => m.movement_type === 'INITIAL')).toBe(true)
    expect(avance[avance.length - 1]).toBe(121)
    expect(historial[0]).toMatchObject({ origen: 'archivo', total: 125, creados: 120, actualizados: 1, con_error: 4, creado_por: 'u1' })
  })
})

describe('deshacerImportacion', () => {
  const imp = { id: 'imp1', origen: 'archivo', ids_creados: ['a', 'b', 'c'], created_at: new Date().toISOString(), deshecha_en: null }
  it('quita solo los productos sin ventas y marca la importación', async () => {
    const cambios = []
    tablas.inventory_movements = () => cadena({ data: [{ product_id: 'b' }], error: null })
    tablas.inventory_products = () => ({ update: (v) => cadena({ error: null }, cambios.push(['p', v]) && null) })
    const marcadas = []
    tablas.importaciones_productos = () => ({ update: (v) => { marcadas.push(v); return cadena({ error: null }) } })
    const r = await deshacerImportacion(imp)
    expect(r).toEqual({ quitados: 2, conservados: 1 })
    expect(cambios[0][1]).toMatchObject({ status: 'INACTIVE' })
    expect(marcadas[0].deshecha_en).toBeTruthy()
  })
  it('rechaza pasadas 24 horas', async () => {
    await expect(deshacerImportacion({ ...imp, created_at: '2020-01-01T00:00:00Z' })).rejects.toThrow('24 horas')
  })
})
