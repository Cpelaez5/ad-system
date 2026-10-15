import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const getConcepts = vi.fn()
vi.mock('@/services/municipalConceptsService', async () => {
  const real = await vi.importActual('@/services/municipalConceptsService')
  return {
    ...real,
    default: {
      getMunicipios: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'm1', nombre: 'Chacao - Miranda' }] }),
      getConcepts: (...a) => getConcepts(...a)
    }
  }
})

const RetencionesMunicipales = (await import('@/components/cliente/RetencionesMunicipales.vue')).default
const montar = (props) =>
  mount(RetencionesMunicipales, {
    props,
    global: { plugins: [createVuetify({ components, directives })], stubs: { RouterLink: true } }
  })

describe('RetencionesMunicipales', () => {
  beforeEach(() => {
    getConcepts.mockReset()
    getConcepts.mockResolvedValue({ success: true, data: [{ id: 'c1', codigo: '1.01', descripcion: 'Comercio', porcentaje: 0.5 }] })
  })

  it('muestra el municipio del negocio y los códigos que aplican', async () => {
    const w = montar({ municipio: 'Chacao' })
    await flushPromises()
    expect(getConcepts).toHaveBeenCalledWith({ municipioId: 'm1' })
    expect(w.find('[data-testid="retenciones-municipio"]').text()).toContain('Chacao - Miranda')
    expect(w.find('[data-testid="retenciones-lista"]').text()).toContain('1.01')
    expect(w.text()).toContain('Ver todos los códigos')
  })

  it('sin municipio dice que lo elija en Datos de la empresa', async () => {
    const w = montar({ municipio: '' })
    await flushPromises()
    expect(w.find('[data-testid="retenciones-sin-municipio"]').text()).toContain('Elige tu municipio en Datos de la empresa')
    expect(getConcepts).not.toHaveBeenCalled()
  })

  it('"No encuentro mi código" abre el chat de ayuda', async () => {
    const oyente = vi.fn()
    window.addEventListener('ad-open-support-chat', oyente)
    const w = montar({ municipio: 'Chacao' })
    await flushPromises()
    await w.find('[data-testid="retenciones-no-encuentro"]').trigger('click')
    expect(oyente).toHaveBeenCalledTimes(1)
    window.removeEventListener('ad-open-support-chat', oyente)
  })
})
