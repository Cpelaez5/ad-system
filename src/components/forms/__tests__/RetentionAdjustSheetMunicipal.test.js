import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const getConcepts = vi.fn()
vi.mock('@/services/municipalConceptsService.js', async () => {
  const real = await vi.importActual('@/services/municipalConceptsService.js')
  return {
    ...real,
    municipalConceptsService: {
      getMunicipios: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'm1', nombre: 'Chacao - Miranda' }] }),
      getConcepts: (...a) => getConcepts(...a)
    }
  }
})
vi.mock('@/services/proveedorService.js', () => ({ default: { getISLRConcepts: vi.fn().mockResolvedValue([]) } }))

const Hoja = (await import('@/components/forms/RetentionAdjustSheet.vue')).default

class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = globalThis.ResizeObserver || RO

const conceptos = [
  { id: 'c1', codigo: '1.01', descripcion: 'Comercio', porcentaje: 0.5, municipio_id: 'm1' },
  { id: 'c2', codigo: '2.02', descripcion: 'Servicios', porcentaje: 1, municipio_id: null }
]

async function abrir(props) {
  const w = mount(Hoja, {
    props: { modelValue: false, config: { aplicar_municipal: true, concepto_municipal_id: null }, ...props },
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: { VBottomSheet: { template: '<div><slot /></div>' } }
    },
    attachTo: document.body
  })
  await w.setProps({ modelValue: true })
  await flushPromises()
  return w
}

describe('RetentionAdjustSheet — conceptos municipales', () => {
  beforeEach(() => {
    getConcepts.mockReset()
    getConcepts.mockResolvedValue({ success: true, data: conceptos })
  })

  it('pide los conceptos del municipio del negocio', async () => {
    await abrir({ municipio: 'Chacao' })
    expect(getConcepts).toHaveBeenCalledWith({ municipioId: 'm1' })
  })

  it('preselecciona el concepto cuyo código es la licencia del proveedor y lo avisa', async () => {
    const w = await abrir({ municipio: 'Chacao', licencia: '2.02' })
    expect(w.vm.localConfig.concepto_municipal_id).toBe('c2')
    expect(w.vm.sugeridoPorLicencia).toBe(true)
    expect(document.body.textContent).toContain('Sugerido por la actividad del proveedor')
    w.unmount()
  })

  it('no pisa un concepto ya elegido ni sugiere si no hay coincidencia', async () => {
    const elegido = await abrir({ licencia: '2.02', config: { aplicar_municipal: true, concepto_municipal_id: 'c1' } })
    expect(elegido.vm.localConfig.concepto_municipal_id).toBe('c1')
    expect(elegido.vm.sugeridoPorLicencia).toBe(false)
    elegido.unmount()
    const sin = await abrir({ licencia: '9.99' })
    expect(sin.vm.localConfig.concepto_municipal_id).toBeNull()
    sin.unmount()
  })
})
