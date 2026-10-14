import { describe, it, expect } from 'vitest'
import { decidirMatchProveedor, construirProveedorPendiente } from '../matchProveedorOcr'

describe('decidirMatchProveedor', () => {
  it('sin proveedores y sin RIF ni nombre: no hay match ni pendiente', () => {
    const r = decidirMatchProveedor({}, [])
    expect(r.matched).toBeNull()
    expect(r.confidence).toBe('none')
    expect(r.pendiente).toBeNull()
  })

  it('el nombre debe tener al menos 3 caracteres para el match exacto por nombre', () => {
    const proveedores = [{ id: 'p1', nombre: 'Ab', rif: null }]
    const r = decidirMatchProveedor({ companyName: 'Ab' }, proveedores)
    expect(r.matched).toBeNull()
  })

  it('el nombre debe tener al menos 5 caracteres para el match parcial', () => {
    const proveedores = [{ id: 'p1', nombre: 'Ferretería ABCD', rif: null }]
    const r = decidirMatchProveedor({ companyName: 'ABCD' }, proveedores)
    expect(r.matched).toBeNull()
  })
})

describe('construirProveedorPendiente', () => {
  it('usa cadenas vacías para los campos opcionales ausentes', () => {
    const p = construirProveedorPendiente({ companyName: 'X' }, 'J-44444444-3')
    expect(p).toEqual({ nombre: 'X', rif: 'J-44444444-3', direccion: '', telefono: '', email: '' })
  })
})
