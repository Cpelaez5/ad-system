import { describe, it, expect, vi, beforeEach } from 'vitest'

const calls = []
let resultado = { data: [], error: null }

// Constructor de consultas encadenable: registra cada llamada y al final resuelve `resultado`.
function consulta(tabla) {
  const q = { tabla, pasos: [] }
  const proxy = new Proxy(q, {
    get(t, prop) {
      if (prop === 'then') return (res) => res(resultado)
      if (prop === 'pasos') return t.pasos
      if (prop === 'tabla') return t.tabla
      return (...args) => {
        t.pasos.push([prop, ...args])
        return proxy
      }
    }
  })
  calls.push(q)
  return proxy
}

vi.mock('@/lib/supabaseClient', () => ({ supabase: { from: (t) => consulta(t) } }))
vi.mock('@/utils/tenantHelpers', () => ({ getCurrentOrganizationId: () => 'org-1' }))

const { municipalConceptsService, resolverMunicipio, sugerirConceptoPorLicencia } = await import('@/services/municipalConceptsService.js')

const paso = (q, nombre) => q.pasos.find((p) => p[0] === nombre)

describe('municipalConceptsService', () => {
  beforeEach(() => {
    calls.length = 0
    resultado = { data: [], error: null }
  })

  it('getConcepts trae comunes y del despacho, y marca el origen', async () => {
    resultado = {
      data: [
        { id: '1', codigo: 'A', organization_id: null, municipio_id: null },
        { id: '2', codigo: 'B', organization_id: 'org-1', municipio_id: 'm1' }
      ],
      error: null
    }
    const r = await municipalConceptsService.getConcepts()
    expect(r.success).toBe(true)
    expect(r.data.map((c) => c.origen)).toEqual(['comun', 'despacho'])
    expect(paso(calls[0], 'or')[1]).toBe('organization_id.is.null,organization_id.eq.org-1')
    expect(paso(calls[0], 'eq')).toEqual(['eq', 'status', 'ACTIVO'])
  })

  it('con municipioId: primero los del municipio, luego los generales, sin los de otros', async () => {
    resultado = {
      data: [
        { id: '1', codigo: '1.00', organization_id: null, municipio_id: null },
        { id: '2', codigo: '9.00', organization_id: null, municipio_id: 'm1' },
        { id: '3', codigo: '2.00', organization_id: 'org-1', municipio_id: 'm2' },
        { id: '4', codigo: '3.00', organization_id: 'org-1', municipio_id: 'm1' }
      ],
      error: null
    }
    const r = await municipalConceptsService.getConcepts({ municipioId: 'm1' })
    expect(r.data.map((c) => c.id)).toEqual(['4', '2', '1'])
  })

  it('getConcepts devuelve success false si falla la consulta', async () => {
    resultado = { data: null, error: new Error('boom') }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await municipalConceptsService.getConcepts()
    expect(r).toEqual({ success: false, error: 'boom' })
    spy.mockRestore()
  })

  it('createConcept del despacho usa su organización y guarda municipio, ordenanza y vigencia', async () => {
    resultado = { data: { id: 'n' }, error: null }
    const r = await municipalConceptsService.createConcept({
      codigo: '1.01', descripcion: 'Comercio', porcentaje: '0', municipio_id: 'm1', ordenanza: ' Ord. 2026 ', vigente_desde: '2026-01-01'
    })
    expect(r.success).toBe(true)
    const payload = paso(calls[0], 'insert')[1][0]
    expect(payload).toMatchObject({
      organization_id: 'org-1', porcentaje: 0, municipio_id: 'm1', ordenanza: 'Ord. 2026', vigente_desde: '2026-01-01', status: 'ACTIVO'
    })
  })

  it('createConcept con comun:true crea en el catálogo común (organization_id null)', async () => {
    resultado = { data: { id: 'n' }, error: null }
    await municipalConceptsService.createConcept({ codigo: 'X', descripcion: 'd', porcentaje: 1 }, { comun: true })
    const payload = paso(calls[0], 'insert')[1][0]
    expect(payload.organization_id).toBeNull()
    expect(payload.municipio_id).toBeNull()
  })

  it('updateConcept filtra por organización, o por organización nula si es común', async () => {
    resultado = { data: { id: '1' }, error: null }
    await municipalConceptsService.updateConcept('1', { codigo: 'A', descripcion: 'd', porcentaje: 2 })
    expect(calls[0].pasos).toContainEqual(['eq', 'organization_id', 'org-1'])
    await municipalConceptsService.updateConcept('1', { codigo: 'A', descripcion: 'd', porcentaje: 2 }, { comun: true })
    expect(calls[1].pasos).toContainEqual(['is', 'organization_id', null])
  })

  it('deleteConcept hace borrado lógico', async () => {
    resultado = { data: { id: '1' }, error: null }
    await municipalConceptsService.deleteConcept('1')
    expect(paso(calls[0], 'update')[1].status).toBe('INACTIVO')
  })
})

describe('resolverMunicipio', () => {
  const lista = [
    { id: 'a', nombre: 'Chacao - Miranda' },
    { id: 'b', nombre: 'Sucre - Miranda' },
    { id: 'c', nombre: 'Sucre - Sucre' }
  ]
  it('acepta el id o el nombre sin estado ni tildes', () => {
    expect(resolverMunicipio('a', lista).id).toBe('a')
    expect(resolverMunicipio('chacao', lista).id).toBe('a')
    expect(resolverMunicipio('Chacao - Miranda', lista).id).toBe('a')
  })
  it('si es ambiguo usa el estado y si no, devuelve null', () => {
    expect(resolverMunicipio('Sucre', lista)).toBeNull()
    expect(resolverMunicipio('Sucre', lista, { estado: 'Miranda' }).id).toBe('b')
    expect(resolverMunicipio('Caroní', lista)).toBeNull()
  })
})

describe('sugerirConceptoPorLicencia', () => {
  const cs = [{ id: '1', codigo: '1.01.00' }, { id: '2', codigo: 'B-2' }]
  it('encuentra por código, sin distinguir mayúsculas ni espacios', () => {
    expect(sugerirConceptoPorLicencia(cs, ' b-2 ').id).toBe('2')
  })
  it('sin licencia o sin coincidencia devuelve null', () => {
    expect(sugerirConceptoPorLicencia(cs, '')).toBeNull()
    expect(sugerirConceptoPorLicencia(cs, '9.99')).toBeNull()
  })
})
