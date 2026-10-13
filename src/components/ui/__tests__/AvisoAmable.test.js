import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AvisoAmable from '../AvisoAmable.vue'

const globalConfig = {
  stubs: {
    'v-alert': {
      template: '<div role="status"><slot /><slot name="append" /></div>',
      props: ['type', 'icon', 'variant', 'density', 'closable', 'title'],
      emits: ['click:close'],
    },
    'v-btn': { template: '<button v-bind="$attrs"><slot /></button>' },
  },
}

describe('AvisoAmable.vue', () => {
  it('muestra el mensaje en lenguaje llano', () => {
    const wrapper = mount(AvisoAmable, {
      props: { mensaje: 'Tu RIF vence en 5 días' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Tu RIF vence en 5 días')
  })

  it('traduce tipo "advertencia" al color "warning" de Vuetify', () => {
    const wrapper = mount(AvisoAmable, {
      props: { mensaje: 'Revisa esto', tipo: 'advertencia' },
      global: globalConfig,
    })
    expect(wrapper.vm.tipoVuetify).toBe('warning')
  })

  it('muestra el botón de acción solo si hay textoAccion, y emite "accion"', async () => {
    const wrapper = mount(AvisoAmable, {
      props: { mensaje: 'Pago pendiente', textoAccion: 'Pagar ahora' },
      global: globalConfig,
    })
    const boton = wrapper.find('button')
    expect(boton.text()).toBe('Pagar ahora')
    await boton.trigger('click')
    expect(wrapper.emitted('accion')).toBeTruthy()
  })
})
