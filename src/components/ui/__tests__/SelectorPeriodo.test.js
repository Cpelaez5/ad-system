import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SelectorPeriodo from '../SelectorPeriodo.vue'

const globalConfig = {
  stubs: {
    'v-chip-group': {
      name: 'VChipGroupStub',
      template: '<div><slot /></div>',
      props: ['modelValue'],
    },
    'v-chip': {
      template: '<button :data-value="value"><slot /></button>',
      props: ['value'],
    },
  },
}

describe('SelectorPeriodo.vue', () => {
  it('muestra las tres opciones de período en lenguaje llano', () => {
    const wrapper = mount(SelectorPeriodo, { global: globalConfig })
    expect(wrapper.text()).toContain('Este mes')
    expect(wrapper.text()).toContain('Mes pasado')
    expect(wrapper.text()).toContain('Este año')
  })

  it('pasa el v-model al v-chip-group y emite update:modelValue al cambiar', async () => {
    const wrapper = mount(SelectorPeriodo, {
      props: { modelValue: 'este_mes' },
      global: globalConfig,
    })
    const grupo = wrapper.findComponent({ name: 'VChipGroupStub' })
    expect(grupo.props('modelValue')).toBe('este_mes')

    await grupo.vm.$emit('update:modelValue', 'mes_pasado')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['mes_pasado'])
  })

  it('por defecto empieza en "este_mes"', () => {
    const wrapper = mount(SelectorPeriodo, { global: globalConfig })
    const grupo = wrapper.findComponent({ name: 'VChipGroupStub' })
    expect(grupo.props('modelValue')).toBe('este_mes')
  })
})
