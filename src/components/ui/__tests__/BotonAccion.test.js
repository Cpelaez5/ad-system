import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BotonAccion from '../BotonAccion.vue'

const globalConfig = {
  stubs: {
    'v-btn': {
      template: '<button v-bind="$attrs"><slot /></button>',
    },
  },
}

describe('BotonAccion.vue', () => {
  it('muestra el texto y usa ese texto como aria-label por defecto', () => {
    const wrapper = mount(BotonAccion, {
      props: { texto: 'Vendí algo' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Vendí algo')
    expect(wrapper.find('button').attributes('aria-label')).toBe('Vendí algo')
  })

  it('variante "primaria" usa variant flat y color primary', () => {
    const wrapper = mount(BotonAccion, {
      props: { texto: 'Guardar', variante: 'primaria' },
      global: globalConfig,
    })
    const btn = wrapper.find('button')
    expect(btn.attributes('variant')).toBe('flat')
    expect(btn.attributes('color')).toBe('primary')
  })

  it('variante "destructiva" siempre es outlined, nunca relleno', () => {
    const wrapper = mount(BotonAccion, {
      props: { texto: 'Eliminar', variante: 'destructiva' },
      global: globalConfig,
    })
    const btn = wrapper.find('button')
    expect(btn.attributes('variant')).toBe('outlined')
    expect(btn.attributes('color')).toBe('error')
  })

  it('tamano "principal" pide 56px de alto y "normal" pide 48px', () => {
    const principal = mount(BotonAccion, {
      props: { texto: 'Continuar', tamano: 'principal' },
      global: globalConfig,
    })
    const normal = mount(BotonAccion, {
      props: { texto: 'Continuar', tamano: 'normal' },
      global: globalConfig,
    })
    expect(principal.find('button').attributes('min-height')).toBe('56')
    expect(normal.find('button').attributes('min-height')).toBe('48')
  })

  it('emite "click" al hacer clic', async () => {
    const wrapper = mount(BotonAccion, {
      props: { texto: 'Registrar' },
      global: globalConfig,
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('respeta aria-label explícito si se pasa', () => {
    const wrapper = mount(BotonAccion, {
      props: { texto: 'Ver más', ariaLabel: 'Ver más detalles del gasto' },
      global: globalConfig,
    })
    expect(wrapper.find('button').attributes('aria-label')).toBe('Ver más detalles del gasto')
  })
})
