import { describe, it, expect, vi, beforeEach } from 'vitest'

const buscarProductosPorCodigos = vi.fn()
vi.mock('@/services/catalogoService', () => ({ buscarProductosPorCodigos: (...a) => buscarProductosPorCodigos(...a) }))
vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }))
vi.mock('@/utils/tenantHelpers', () => ({ getCurrentOrganizationId: () => 'o', getCurrentClientId: () => 'c' }))
vi.mock('@/services/inventoryService', () => ({ default: {} }))

import { planificar, completarConCatalogo } from '@/utils/importacionProductos.js'
import { cargarCatalogo } from '@/services/importacionProductosService.js'

const ITEM = { codigo_barras: '4006381333931', marca: 'PAN', categoria: 'Víveres', presentacion: '1 kg', unidad: 'KG' }
const catalogo = new Map([[ITEM.codigo_barras, ITEM]])

function plan(crudos, existentes = []) {
  return planificar(crudos.map((crudo, i) => ({ fila: i + 2, crudo })), { rubro: 'otro' }, existentes).filas
}

describe('completarConCatalogo', () => {
  it('completa solo lo vacío en filas nuevas con código válido y las marca', () => {
    const [f] = completarConCatalogo(plan([{ nombre: 'Harina', codigo_barras: '4006381333931', marca: 'Mi marca' }]), catalogo)
    expect(f.datos.marca).toBe('Mi marca')
    expect(f.datos.categoria).toBe('Víveres')
    expect(f.datos.unit).toBe('KG')
    expect(f.datos.atributos.presentacion).toBe('1 kg')
    expect(f.completadoCatalogo).toBe(true)
  })

  it('no toca código inválido, sin coincidencia ni filas que actualizan', () => {
    const filas = plan([
      { nombre: 'A', codigo_barras: '4006381333932' },
      { nombre: 'B', codigo_barras: '036000291452' },
    ])
    expect(completarConCatalogo(filas, catalogo).some(f => f.completadoCatalogo)).toBe(false)
    const actualizar = plan([{ nombre: 'C', codigo_barras: '4006381333931' }], [{ id: 'x', codigo_barras: '4006381333931' }])
    expect(actualizar[0].estado).toBe('actualizar')
    expect(completarConCatalogo(actualizar, catalogo)[0].completadoCatalogo).toBeUndefined()
  })

  it('catálogo vacío devuelve las mismas filas', () => {
    const filas = plan([{ nombre: 'A', codigo_barras: '4006381333931' }])
    expect(completarConCatalogo(filas, new Map())).toBe(filas)
  })
})

describe('cargarCatalogo', () => {
  beforeEach(() => buscarProductosPorCodigos.mockReset())

  it('pide solo códigos válidos y arma el Map', async () => {
    buscarProductosPorCodigos.mockResolvedValue([ITEM])
    const m = await cargarCatalogo([{ crudo: { codigo_barras: '4006381333931' } }, { crudo: { codigo_barras: '123' } }, { crudo: {} }])
    expect(buscarProductosPorCodigos).toHaveBeenCalledWith(['4006381333931'])
    expect(m.get('4006381333931')).toEqual(ITEM)
  })
})
