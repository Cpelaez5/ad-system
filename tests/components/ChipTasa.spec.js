import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChipTasa from '@/components/ui/ChipTasa.vue'

/**
 * ChipTasa — hallazgo #3 Importante: antes formateaba la tasa con
 * `formatMoney(rate, currency)`, mostrando "$ 36,50" para una tasa que son
 * BOLÍVARES por dólar (no dólares). Ahora usa `formatTasa` (siempre "Bs
 * ..."), con el código de moneda al frente, y expone un `aria-label`
 * descriptivo porque el texto visible no basta para un lector de pantalla.
 */
const globalConfig = {
  stubs: {
    'v-tooltip': { props: ['text'], template: '<div><slot name="activator" :props="{}" /></div>' },
  },
}

describe('ChipTasa', () => {
  it('muestra el código de moneda + la tasa en bolívares con formatTasa ("USD Bs 36,50", nunca "$ 36,50")', () => {
    const wrapper = mount(ChipTasa, {
      props: { currency: 'USD', rateValue: 36.5 },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('USD Bs 36,50')
    expect(wrapper.text()).not.toContain('$ 36,50')
  })

  it('lo mismo para EUR: "EUR Bs 39,10"', () => {
    const wrapper = mount(ChipTasa, {
      props: { currency: 'EUR', rateValue: 39.1 },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('EUR Bs 39,10')
  })

  it('tiene un aria-label descriptivo con el nombre llano de la moneda ("Tasa oficial BCV del dólar: Bs 36,50...")', () => {
    const wrapper = mount(ChipTasa, {
      props: { currency: 'USD', rateValue: 36.5 },
      global: globalConfig,
    })
    const chip = wrapper.find('.chip-tasa')
    expect(chip.attributes('aria-label')).toContain('Tasa oficial BCV del dólar')
    expect(chip.attributes('aria-label')).toContain('Bs 36,50')
  })

  it('aria-label distinto por error/carga, sin inventar un valor', () => {
    const cargando = mount(ChipTasa, { props: { currency: 'USD', rateValue: null }, global: globalConfig })
    expect(cargando.find('.chip-tasa').attributes('aria-label')).toContain('cargando')

    const error = mount(ChipTasa, { props: { currency: 'USD', rateValue: 36.5, error: true }, global: globalConfig })
    expect(error.find('.chip-tasa').attributes('aria-label')).toContain('no disponible')
  })

  it('muestra "···" mientras no hay valor y "—" si hay error', () => {
    const cargando = mount(ChipTasa, { props: { currency: 'USD', rateValue: null }, global: globalConfig })
    expect(cargando.text()).toContain('···')

    const error = mount(ChipTasa, { props: { currency: 'USD', rateValue: 36.5, error: true }, global: globalConfig })
    expect(error.text()).toContain('—')
  })

  it('emite "click" al pulsar el chip (refresca la tasa)', async () => {
    const wrapper = mount(ChipTasa, { props: { currency: 'USD', rateValue: 36.5 }, global: globalConfig })
    await wrapper.find('.chip-tasa').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
