import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TarjetaDocumentoFiscal from '../TarjetaDocumentoFiscal.vue'

const globalConfig = {
  stubs: {
    'v-card': { template: '<div v-bind="$attrs" @click="$emit(\'click\')"><slot /></div>' },
    'v-avatar': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-icon': { template: '<i v-bind="$attrs"><slot /></i>' },
    'v-chip': { template: '<span v-bind="$attrs"><slot /></span>' },
    'v-btn': { template: '<button v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>' }
  }
}

describe('TarjetaDocumentoFiscal.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15)) // 15 de junio de 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza el nombre del documento y el texto del semáforo (nunca solo color)', () => {
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: {
        doc: {
          id: 1,
          name: 'RIF',
          status: 'VIGENTE',
          emission_date: '2026-01-10',
          expiration_date: '2026-06-20' // vence en 5 días → rojo
        }
      },
      global: globalConfig
    })

    expect(wrapper.text()).toContain('RIF')
    expect(wrapper.text()).toContain('Vence en 5 días')
  })

  it('muestra "No aplica a tu negocio" para documentos con status NO_APLICA', () => {
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: {
        doc: { id: 2, name: 'Permiso Sanitario', status: 'NO_APLICA' }
      },
      global: globalConfig
    })

    expect(wrapper.text()).toContain('No aplica a tu negocio')
  })

  it('muestra "En trámite" para documentos con status TRAMITE', () => {
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: {
        doc: { id: 3, name: 'Licencia de Actividad Económica', status: 'TRAMITE' }
      },
      global: globalConfig
    })

    expect(wrapper.text()).toContain('En trámite')
  })

  it('renderiza un botón "Subir ahora" y el nombre del tipo cuando es un documento pendiente', () => {
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: {
        pendiente: { id: 'RIF', label: 'RIF', category: 'LEGAL', required: true }
      },
      global: globalConfig
    })

    expect(wrapper.text()).toContain('RIF')
    expect(wrapper.text()).toContain('Subir ahora')
  })

  it('muestra la categoría cuando se pasa categoriaTitulo', () => {
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: {
        doc: { id: 4, name: 'RIF', status: 'VIGENTE' },
        categoriaTitulo: 'Legal'
      },
      global: globalConfig
    })

    expect(wrapper.text()).toContain('Legal')
  })

  it('emite "ver" al hacer click en la tarjeta cuando hay un documento', async () => {
    const doc = { id: 5, name: 'RIF', status: 'VIGENTE' }
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: { doc },
      global: globalConfig
    })

    await wrapper.find('div.tarjeta-doc-fiscal').trigger('click')
    expect(wrapper.emitted('ver')).toBeTruthy()
    expect(wrapper.emitted('ver')[0][0]).toEqual(doc)
  })

  it('emite "subir" con el tipo pendiente al pulsar "Subir ahora"', async () => {
    const pendiente = { id: 'RIF', label: 'RIF', category: 'LEGAL', required: true }
    const wrapper = mount(TarjetaDocumentoFiscal, {
      props: { pendiente },
      global: globalConfig
    })

    const buttons = wrapper.findAll('button')
    const subirBtn = buttons.find(b => b.text().includes('Subir ahora'))
    expect(subirBtn).toBeTruthy()
    await subirBtn.trigger('click')
    expect(wrapper.emitted('subir')).toBeTruthy()
    expect(wrapper.emitted('subir')[0][0]).toEqual(pendiente)
  })
})
