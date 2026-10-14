import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TarjetaKPI from '../TarjetaKPI.vue'

const globalConfig = {
  mocks: {
    $vuetify: { display: { mobile: false } },
  },
  stubs: {
    'v-card': { template: '<div><slot /></div>' },
    'v-card-item': { template: '<div><slot /></div>' },
    'v-card-text': { template: '<div><slot /></div>' },
    'v-icon': { template: '<i :data-icon="icon" :data-color="color"></i>', props: ['icon', 'color', 'size'] },
    'v-menu': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    'v-bottom-sheet': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    'v-btn': { template: '<button><slot /></button>' },
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

  it('variación despreciable (<0.5%) se ve neutra, con ícono de "igual" y texto con contraste AA', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 0.1 },
      global: globalConfig,
    })
    const icono = wrapper.find('[data-icon]')
    expect(icono.attributes('data-icon')).toBe('mdi-minus')
    expect(icono.attributes('data-color')).toBe('grey')
    // hallazgo #12: texto neutro NO usa text-grey (no pasa AA).
    expect(wrapper.find('.tarjeta-kpi__comparacion span').classes()).toContain('text-medium-emphasis')
    expect(wrapper.find('.tarjeta-kpi__comparacion span').classes()).not.toContain('text-grey')
  })

  it('variación "nuevo" (período anterior en 0) no inventa un porcentaje', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 'nuevo', etiquetaPeriodoAnterior: 'el mes pasado' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('No hubo nada el mes pasado para comparar')
    expect(wrapper.text()).not.toContain('100%')
    const icono = wrapper.find('[data-icon]')
    expect(icono.attributes('data-icon')).toBe('mdi-star-four-points-outline')
  })

  it('usa la etiqueta del período anterior que se le pase', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Vendí', monto: 100, variacion: 10, etiquetaPeriodoAnterior: 'el año pasado' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('10% más que el año pasado')
  })

  it('ayudaClave muestra el botón de AyudaTermino junto a la etiqueta', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Lo que vas a declarar', monto: 50, ayudaClave: 'iva_a_pagar_estimado' },
      global: globalConfig,
    })
    expect(wrapper.findComponent({ name: 'AyudaTermino' }).exists()).toBe(true)
  })

  it('sin ayudaClave, no monta AyudaTermino', () => {
    const wrapper = mount(TarjetaKPI, { props: { etiqueta: 'Vendí', monto: 100 }, global: globalConfig })
    expect(wrapper.findComponent({ name: 'AyudaTermino' }).exists()).toBe(false)
  })

  it('nota muestra el texto pequeño debajo (ej. "Estimado: ...")', () => {
    const wrapper = mount(TarjetaKPI, {
      props: { etiqueta: 'Lo que vas a declarar', monto: 9, nota: 'Estimado: débito − crédito − retenciones.' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Estimado: débito − crédito − retenciones.')
  })
})
