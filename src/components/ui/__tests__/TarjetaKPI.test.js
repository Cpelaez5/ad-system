import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TarjetaKPI from '../TarjetaKPI.vue'

const globalConfig = {
  stubs: {
    'v-card': { template: '<div><slot /></div>' },
    'v-card-item': { template: '<div><slot /></div>' },
    'v-icon': { template: '<i :data-icon="icon" :data-color="color"></i>', props: ['icon', 'color', 'size'] },
    AnimatedNumber: {
      props: ['value', 'formatter'],
      template: '<span>{{ formatter ? formatter(value) : value }}</span>',
    },
  },
}

describe('TarjetaKPI.vue', () => {
  it('muestra la etiqueta y el monto formateado en USD', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 1250.5 },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Vendí')
    expect(wrapper.text()).toContain('$ 1.250,50')
  })

  it('sin variación (null) no muestra ninguna comparación', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: null },
      global: globalConfig,
    })
    expect(wrapper.find('.tarjeta-kpi__comparacion').exists()).toBe(false)
  })

  it('subir es bueno (Vendí): variación positiva se ve en verde con flecha arriba', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 12.4, subirEsBueno: true },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('12% más que el período anterior')
    const icono = wrapper.find('[data-icon]')
    expect(icono.attributes('data-icon')).toBe('mdi-arrow-up-bold')
    expect(icono.attributes('data-color')).toBe('success')
  })

  it('subir es malo (Gasté): la misma subida se ve en rojo, nunca solo por color (lleva flecha y texto)', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Gasté', monto: 100, variacion: 12.4, subirEsBueno: false },
      global: globalConfig,
    })
    const icono = wrapper.find('[data-icon]')
    expect(icono.attributes('data-icon')).toBe('mdi-arrow-up-bold')
    expect(icono.attributes('data-color')).toBe('error')
    expect(wrapper.text()).toContain('12% más que el período anterior')
  })

  it('variación despreciable (<0.5%) se ve neutra, con ícono de "igual"', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 0.1 },
      global: globalConfig,
    })
    const icono = wrapper.find('[data-icon]')
    expect(icono.attributes('data-icon')).toBe('mdi-minus')
    expect(icono.attributes('data-color')).toBe('grey')
  })

  it('usa la etiqueta del período anterior que se le pase', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 10, etiquetaPeriodoAnterior: 'el año pasado' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('10% más que el año pasado')
  })
})
