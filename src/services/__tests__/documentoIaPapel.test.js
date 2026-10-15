import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({ supabase: { functions: { invoke: vi.fn() } } }))
vi.mock('@/utils/eventosIa', () => ({ avisarIaUsada: vi.fn() }))
vi.mock('@/services/productoFotoService', () => ({ reducirImagen: vi.fn() }))

import { aPapel, tiposParaIa, avisoDePapel, MSG_ILEGIBLE } from '@/services/documentoIaService'

const TIPOS = {
  LEGAL: [{ id: 'RIF', label: 'RIF', frequency: 'VIGENTE' }, { id: 'PUBLICACION_MERCANTIL', label: 'Publicación Mercantil', frequency: 'PERMANENT' }],
  MUNICIPAL: [{ id: 'PERMISO_SANITARIO', label: 'Permiso Sanitario', frequency: 'VIGENTE' }],
}
const HOY = '2026-10-15'

describe('tiposParaIa', () => {
  it('arma claves CATEGORIA/ID con su nombre', () => {
    expect(tiposParaIa(TIPOS)).toContainEqual({ clave: 'MUNICIPAL/PERMISO_SANITARIO', nombre: 'Permiso Sanitario' })
    expect(tiposParaIa(TIPOS)).toHaveLength(3)
  })
})

describe('aPapel', () => {
  it('llena categoría, tipo, fechas, estado y notas', () => {
    const r = aPapel({
      tipo_papel: 'MUNICIPAL/PERMISO_SANITARIO', titulo: 'Permiso sanitario 2026', numero: 'A-123',
      emisor: 'Alcaldía de Maracaibo', fecha_emision: '2026-03-01', fecha_vencimiento: '2027-03-01',
    }, TIPOS, HOY)
    expect(r).toEqual({
      category: 'MUNICIPAL', doc_type: 'PERMISO_SANITARIO', name: 'Permiso sanitario 2026',
      emission_date: '2026-03-01', expiration_date: '2027-03-01', status: 'VIGENTE',
      notes: 'Número: A-123 · Emitido por: Alcaldía de Maracaibo',
    })
  })
  it('marca VENCIDO si la fecha ya pasó', () => {
    expect(aPapel({ tipo_papel: 'LEGAL/RIF', fecha_vencimiento: '2025-01-01' }, TIPOS, HOY).status).toBe('VENCIDO')
  })
  it('usa la etiqueta del tipo si no hay título', () => {
    expect(aPapel({ tipo_papel: 'LEGAL/RIF' }, TIPOS, HOY).name).toBe('RIF')
  })
  it('un tipo que nunca vence marca isPermanent y no pone vencimiento', () => {
    const r = aPapel({ tipo_papel: 'LEGAL/PUBLICACION_MERCANTIL', fecha_vencimiento: '2030-01-01' }, TIPOS, HOY)
    expect(r.isPermanent).toBe(true)
    expect(r.expiration_date).toBeUndefined()
  })
  it('ignora un tipo que no está en la lista y no inventa campos', () => {
    const r = aPapel({ tipo_papel: 'X/INVENTADO', titulo: 'Algo', numero: '' }, TIPOS, HOY)
    expect(r).toEqual({ name: 'Algo' })
  })
  it('acepta fechas DD/MM/AAAA y descarta las inválidas', () => {
    const r = aPapel({ tipo_papel: 'LEGAL/RIF', fecha_emision: '05/03/2026', fecha_vencimiento: 'pronto' }, TIPOS, HOY)
    expect(r.emission_date).toBe('2026-03-05')
    expect(r.expiration_date).toBeUndefined()
  })
  it('sin respuesta devuelve vacío', () => {
    expect(aPapel(null, TIPOS)).toEqual({})
  })
})

describe('avisoDePapel', () => {
  it('avisa si es ilegible o no hay respuesta', () => {
    expect(avisoDePapel({ legible: false })).toBe(MSG_ILEGIBLE)
    expect(avisoDePapel(null)).toBe(MSG_ILEGIBLE)
    expect(avisoDePapel({ legible: true, confianza: 'media' })).toBeNull()
  })
})
