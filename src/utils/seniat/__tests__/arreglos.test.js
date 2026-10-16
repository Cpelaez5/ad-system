import { describe, it, expect } from 'vitest'
import { destinoDeArreglo } from '../arreglos.js'

describe('destinoDeArreglo', () => {
  it('lleva cada arreglo a su lugar', () => {
    expect(destinoDeArreglo({ tipo: 'negocio', id: null })).toEqual({ name: 'ClienteMiArea' })
    expect(destinoDeArreglo({ tipo: 'proveedor', id: 'p1' })).toEqual({ name: 'ClienteProveedores', query: { editar: 'p1' } })
    expect(destinoDeArreglo({ tipo: 'registro', id: 'f1' })).toEqual({ name: 'ClienteFacturacion', query: { tab: 'compras', ver: 'f1' } })
    expect(destinoDeArreglo({ tipo: 'registro', id: null }).query).toEqual({ tab: 'compras' })
  })
  it('el equipo no tiene destino', () => {
    expect(destinoDeArreglo({ tipo: 'equipo', id: 'c1' })).toBeNull()
    expect(destinoDeArreglo(undefined)).toBeNull()
  })
})
