/**
 * Autocompletado del proveedor con el catálogo global. Se prueban los métodos
 * del componente con un contexto simulado (sin montar Vuetify).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const buscarProveedorPorRif = vi.fn()
vi.mock('@/services/catalogoService', () => ({
  buscarProveedorPorRif: (...a) => buscarProveedorPorRif(...a),
  rifParaCatalogo: (r) => {
    const l = String(r ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    return /^[JGCVEP]\d{9}$/.test(l) ? l : null
  }
}))
vi.mock('@/services/proveedorService.js', () => ({ default: {} }))

import Componente from '../ProveedorModalForm.vue'

function contexto(extra = {}) {
  const ctx = {
    isEdit: false,
    catalogoTimer: null,
    catalogoMarca: '',
    catalogoLlenado: [],
    catalogoRifConsultado: '',
    formData: { nombre: '', rif: 'J-12345678-9', direccion: '' },
    ...extra
  }
  ctx.consultarCatalogo = Componente.methods.consultarCatalogo.bind(ctx)
  return ctx
}

beforeEach(() => { buscarProveedorPorRif.mockReset() })
afterEach(() => { vi.useRealTimers() })

describe('ProveedorModalForm: catálogo global', () => {
  it('llena solo los campos vacíos y pone la marca con el número de negocios', async () => {
    buscarProveedorPorRif.mockResolvedValue({ razon_social: 'Distribuidora X, C.A.', domicilio_fiscal: 'Av. 1', confirmaciones: 3, verificado: false })
    const ctx = contexto({ formData: { nombre: '', rif: 'J-12345678-9', direccion: 'Mi dirección' } })
    await ctx.consultarCatalogo('J123456789')
    expect(ctx.formData.nombre).toBe('Distribuidora X, C.A.')
    expect(ctx.formData.direccion).toBe('Mi dirección')
    expect(ctx.catalogoMarca).toBe('Datos de AD System · confirmados por 3 negocios')
    expect(ctx.catalogoLlenado).toEqual(['nombre'])
  })

  it('muestra "verificados" cuando el catálogo está verificado', async () => {
    buscarProveedorPorRif.mockResolvedValue({ razon_social: 'X', confirmaciones: 1, verificado: true })
    const ctx = contexto()
    await ctx.consultarCatalogo('J123456789')
    expect(ctx.catalogoMarca).toBe('Datos de AD System · verificados')
  })

  it('"No es este" deshace solo lo llenado', async () => {
    buscarProveedorPorRif.mockResolvedValue({ razon_social: 'X', domicilio_fiscal: 'Y', confirmaciones: 2 })
    const ctx = contexto()
    await ctx.consultarCatalogo('J123456789')
    Componente.methods.deshacerCatalogo.call(ctx)
    expect(ctx.formData.nombre).toBe('')
    expect(ctx.formData.direccion).toBe('')
    expect(ctx.catalogoMarca).toBe('')
  })

  it('sin coincidencia no marca nada; con respuesta vieja tampoco', async () => {
    buscarProveedorPorRif.mockResolvedValue(null)
    const ctx = contexto()
    await ctx.consultarCatalogo('J123456789')
    expect(ctx.catalogoMarca).toBe('')
    buscarProveedorPorRif.mockResolvedValue({ razon_social: 'X', confirmaciones: 1 })
    await ctx.consultarCatalogo('J999999999') // el RIF escrito ya es otro
    expect(ctx.formData.nombre).toBe('')
  })

  it('espera ~400 ms y solo consulta con RIF válido y al crear', () => {
    vi.useFakeTimers()
    const ctx = contexto()
    ctx.consultarCatalogo = vi.fn()
    Componente.methods.programarConsultaCatalogo.call(ctx, 'J-1234')
    vi.advanceTimersByTime(500)
    expect(ctx.consultarCatalogo).not.toHaveBeenCalled()
    Componente.methods.programarConsultaCatalogo.call(ctx, 'J-12345678-9')
    vi.advanceTimersByTime(399)
    expect(ctx.consultarCatalogo).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2)
    expect(ctx.consultarCatalogo).toHaveBeenCalledWith('J123456789')
    const edit = contexto({ isEdit: true })
    edit.consultarCatalogo = vi.fn()
    Componente.methods.programarConsultaCatalogo.call(edit, 'J-12345678-9')
    vi.advanceTimersByTime(500)
    expect(edit.consultarCatalogo).not.toHaveBeenCalled()
  })
})
