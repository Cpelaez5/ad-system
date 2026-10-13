import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ResumenMonto from '../ResumenMonto.vue'

const globalConfig = {
  stubs: {
    'v-card': { template: '<div><slot /></div>' },
    'v-card-item': { template: '<div><slot /></div>' },
  },
}

describe('ResumenMonto.vue', () => {
  it('formatea el monto principal en USD con el separador venezolano', () => {
    const wrapper = mount(ResumenMonto, {
      props: { etiqueta: 'Te quedan', monto: 1250.5 },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Te quedan')
    expect(wrapper.text()).toContain('$ 1.250,50')
  })

  it('muestra el equivalente en bolívares solo si se pasa montoBs', () => {
    const sinBs = mount(ResumenMonto, {
      props: { etiqueta: 'Vendiste', monto: 100 },
      global: globalConfig,
    })
    expect(sinBs.find('.resumen-monto__bs').exists()).toBe(false)

    const conBs = mount(ResumenMonto, {
      props: { etiqueta: 'Vendiste', monto: 100, montoBs: 3650 },
      global: globalConfig,
    })
    expect(conBs.text()).toContain('Bs')
  })

  it('con animar usa AnimatedNumber (porque monto ya es un Number) en vez del texto fijo', () => {
    const wrapper = mount(ResumenMonto, {
      props: { etiqueta: 'Vendiste', monto: 100, animar: true },
      global: {
        stubs: {
          ...globalConfig.stubs,
          AnimatedNumber: {
            props: ['value', 'formatter'],
            template: '<span class="animated-stub">{{ formatter ? formatter(value) : value }}</span>',
          },
        },
      },
    })
    expect(wrapper.find('.animated-stub').exists()).toBe(true)
    expect(wrapper.text()).toContain('$ 100,00')
  })

  it('admite contenido extra por el slot por defecto (lo usa TarjetaKPI para la comparación)', () => {
    const wrapper = mount(ResumenMonto, {
      props: { etiqueta: 'Vendiste', monto: 100 },
      slots: { default: '<p class="extra">12% más</p>' },
      global: globalConfig,
    })
    expect(wrapper.find('.extra').exists()).toBe(true)
  })
})
