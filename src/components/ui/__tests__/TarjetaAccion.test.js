import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TarjetaAccion from '../TarjetaAccion.vue'

const globalConfig = {
  stubs: {
    'v-card': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-card-item': {
      template: '<div><slot name="prepend"/><slot /><slot name="append"/></div>',
    },
    'v-card-title': { template: '<div><slot /></div>' },
    'v-card-subtitle': { template: '<div><slot /></div>' },
    'v-avatar': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-icon': { template: '<i v-bind="$attrs"></i>' },
  },
}

describe('TarjetaAccion.vue', () => {
  it('muestra título, subtítulo e ícono', () => {
    const wrapper = mount(TarjetaAccion, {
      props: { icono: 'mdi-cart', titulo: 'Vendí algo', subtitulo: 'Registra una venta' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Vendí algo')
    expect(wrapper.text()).toContain('Registra una venta')
    expect(wrapper.find('i').attributes('icon')).toBe('mdi-cart')
  })

  it('es accesible por teclado: role=button y tabindex=0', () => {
    const wrapper = mount(TarjetaAccion, {
      props: { icono: 'mdi-cart', titulo: 'Vendí algo' },
      global: globalConfig,
    })
    expect(wrapper.attributes('role')).toBe('button')
    expect(wrapper.attributes('tabindex')).toBe('0')
    expect(wrapper.attributes('aria-label')).toBe('Vendí algo')
  })

  it('emite "click" al hacer clic y al presionar Enter/Espacio', async () => {
    const wrapper = mount(TarjetaAccion, {
      props: { icono: 'mdi-cart', titulo: 'Vendí algo' },
      global: globalConfig,
    })
    await wrapper.trigger('click')
    await wrapper.trigger('keydown.enter')
    await wrapper.trigger('keydown.space')
    expect(wrapper.emitted('click')?.length).toBe(3)
  })
})
