import { describe, it, expect } from 'vitest'
import { camposDesdeCatalogo, marcaCatalogo } from '../catalogoProducto'

const item = { nombre: 'Harina PAN 1 kg', marca: 'PAN', categoria: 'Víveres', presentacion: '1 kg', unidad: 'KG' }

describe('camposDesdeCatalogo', () => {
  it('llena todo cuando el producto está vacío', () => {
    const { cambios, llenados } = camposDesdeCatalogo({ name: '', marca: '', categoria: '', unit: 'UND', atributos: {} }, item)
    expect(cambios).toEqual({
      name: 'Harina PAN 1 kg', marca: 'PAN', categoria: 'Víveres', atributos: { presentacion: '1 kg' }, unit: 'KG'
    })
    expect(llenados).toHaveLength(5)
  })

  it('no pisa lo que la persona ya escribió', () => {
    const { cambios } = camposDesdeCatalogo({ name: 'Mi harina', marca: 'Otra', categoria: '', unit: 'CAJA', atributos: { presentacion: '2 kg', x: 1 } }, item)
    expect(cambios).toEqual({ categoria: 'Víveres' })
  })

  it('conserva los otros atributos al poner la presentación', () => {
    const { cambios } = camposDesdeCatalogo({ name: 'a', unit: 'UND', atributos: { lote: 'L1' } }, { presentacion: '1 kg' })
    expect(cambios.atributos).toEqual({ lote: 'L1', presentacion: '1 kg' })
  })

  it('catálogo vacío no cambia nada', () => {
    expect(camposDesdeCatalogo({ name: '' }, {}).llenados).toEqual([])
  })
})

describe('marcaCatalogo', () => {
  it('verificado', () => expect(marcaCatalogo({ verificado: true })).toBe('Datos de AD System · verificados'))
  it('singular y plural', () => {
    expect(marcaCatalogo({ confirmaciones: 1 })).toBe('Datos de AD System · confirmados por 1 negocio')
    expect(marcaCatalogo({ confirmaciones: 4 })).toBe('Datos de AD System · confirmados por 4 negocios')
  })
})
