import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const leerDocumento = vi.fn()
vi.mock('@/services/documentoIaService', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, leerDocumento: (...a) => leerDocumento(...a) }
})

import LlenarConDocumento from '../LlenarConDocumento.vue'
import { aProveedor } from '@/services/documentoIaService'

const stubs = {
  'v-btn': { template: '<button v-bind="$attrs"><slot /></button>' },
  'v-icon': { template: '<i><slot /></i>' },
  'v-progress-circular': { template: '<i />' },
  'v-menu': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
  'v-list': { template: '<div><slot /></div>' },
  'v-list-item': { template: '<button v-bind="$attrs">{{ title }}</button>', props: ['title'] },
}

const RIF = {
  tipo: 'rif', tipo_persona: 'juridica', nombre: 'DISTRIBUIDORA EJEMPLO, C.A.', rif: 'J-40123456-7',
  domicilio_fiscal: 'Av. Ficticia', confianza: 'alta', legible: true,
}

function montar(formulario, extra = {}) {
  return mount(LlenarConDocumento, {
    props: { formulario, mapear: aProveedor, forzar: ['tipo_persona'], ...extra },
    global: { stubs },
  })
}

async function elegirArchivo(wrapper) {
  const input = wrapper.find('[data-testid="llenar-input"]')
  const archivo = new File(['x'], 'rif.png', { type: 'image/png' })
  Object.defineProperty(input.element, 'files', { value: [archivo], configurable: true })
  await input.trigger('change')
  await flushPromises()
  return archivo
}

beforeEach(() => {
  vi.clearAllMocks()
  window.matchMedia = vi.fn(() => ({ matches: false }))
})

describe('LlenarConDocumento.vue', () => {
  it('muestra el botón y el selector acepta imágenes y PDF', () => {
    const w = montar({})
    expect(w.text()).toContain('Llenar con un documento')
    expect(w.find('[data-testid="llenar-input"]').attributes('accept')).toBe('image/*,application/pdf')
  })

  it('en el teléfono ofrece Tomar foto (cámara trasera) y Subir foto o PDF', async () => {
    window.matchMedia = vi.fn(() => ({ matches: true }))
    const w = montar({})
    await flushPromises()
    expect(w.text()).toContain('Tomar foto')
    expect(w.text()).toContain('Subir foto o PDF')
    expect(w.find('[data-testid="llenar-input-camara"]').attributes('capture')).toBe('environment')
  })

  it('muestra "Leyendo tu documento…" mientras trabaja', async () => {
    let resolver
    leerDocumento.mockReturnValue(new Promise((r) => { resolver = r }))
    const w = montar({})
    const input = w.find('[data-testid="llenar-input"]')
    Object.defineProperty(input.element, 'files', { value: [new File(['x'], 'a.png', { type: 'image/png' })], configurable: true })
    await input.trigger('change')
    expect(w.text()).toContain('Leyendo tu documento…')
    resolver({ documento: RIF, error: null })
    await flushPromises()
    expect(w.text()).not.toContain('Leyendo tu documento…')
  })

  it('llena solo los campos vacíos, emite datos y muestra la marca; Deshacer restaura', async () => {
    leerDocumento.mockResolvedValue({ documento: RIF, error: null })
    const form = { nombre: 'Lo que escribí', rif: '', direccion: '', tipo_persona: 'NATURAL' }
    const w = montar(form)
    const archivo = await elegirArchivo(w)

    expect(form.nombre).toBe('Lo que escribí')
    expect(form.rif).toBe('J-40123456-7')
    expect(form.tipo_persona).toBe('JURIDICA')
    expect(w.emitted('datos')[0]).toEqual([RIF, archivo])
    expect(w.find('[data-testid="llenar-marca"]').text()).toContain('Llenado con IA desde tu documento · revisa los datos')

    await w.find('[data-testid="llenar-deshacer"]').trigger('click')
    expect(form.rif).toBe('')
    expect(form.tipo_persona).toBe('NATURAL')
    expect(w.find('[data-testid="llenar-marca"]').exists()).toBe(false)
  })

  it('si no es legible muestra el mensaje amable y no llena nada', async () => {
    leerDocumento.mockResolvedValue({ documento: { legible: false, confianza: 'baja' }, error: null })
    const form = { nombre: '', rif: '' }
    const w = montar(form)
    await elegirArchivo(w)
    expect(form).toEqual({ nombre: '', rif: '' })
    expect(w.find('[data-testid="llenar-aviso"]').text()).toContain('No pudimos leer bien el documento')
  })

  it('un error del servicio se muestra amable y se emite error', async () => {
    leerDocumento.mockResolvedValue({ documento: null, error: { code: 'RED', message: 'No pudimos leer tu documento ahora.' } })
    const w = montar({ nombre: '' })
    await elegirArchivo(w)
    expect(w.emitted('error')).toHaveLength(1)
    expect(w.find('[data-testid="llenar-aviso"]').text()).toContain('No pudimos leer tu documento')
  })

  it('si "validar" rechaza el documento, no llena nada', async () => {
    leerDocumento.mockResolvedValue({ documento: RIF, error: null })
    const form = { nombre: '', rif: '' }
    const w = montar(form, { validar: () => 'Ese RIF no es el de tu negocio.' })
    await elegirArchivo(w)
    expect(form.rif).toBe('')
    expect(w.find('[data-testid="llenar-aviso"]').text()).toContain('no es el de tu negocio')
  })
})
