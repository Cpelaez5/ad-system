import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import HojaInferior from '../HojaInferior.vue'

const stubs = {
  'v-bottom-sheet': { template: '<div class="bottom-sheet" v-if="modelValue"><slot /></div>', props: ['modelValue', 'persistent'] },
  'v-dialog': { template: '<div class="dialog" v-if="modelValue"><slot /></div>', props: ['modelValue', 'persistent', 'maxWidth'] },
  'v-card': { template: '<div><slot /></div>' },
  'v-card-title': { template: '<div><slot /></div>' },
  'v-card-text': { template: '<div><slot /></div>' },
  'v-card-actions': { template: '<div><slot /></div>' },
  'v-btn': { template: '<button v-bind="$attrs"></button>' },
}

function mockDisplay(mobile) {
  return { mocks: { $vuetify: { display: { mobile } } } }
}

describe('HojaInferior.vue', () => {
  it('usa v-bottom-sheet en móvil', () => {
    const wrapper = mount(HojaInferior, {
      props: { modelValue: true, titulo: 'Registrar' },
      slots: { default: 'Contenido del formulario' },
      global: { stubs, ...mockDisplay(true) },
    })
    expect(wrapper.find('.bottom-sheet').exists()).toBe(true)
    expect(wrapper.find('.dialog').exists()).toBe(false)
    expect(wrapper.text()).toContain('Contenido del formulario')
  })

  it('usa v-dialog en escritorio con la misma API', () => {
    const wrapper = mount(HojaInferior, {
      props: { modelValue: true, titulo: 'Registrar' },
      slots: { default: 'Contenido del formulario' },
      global: { stubs, ...mockDisplay(false) },
    })
    expect(wrapper.find('.dialog').exists()).toBe(true)
    expect(wrapper.find('.bottom-sheet').exists()).toBe(false)
    expect(wrapper.text()).toContain('Contenido del formulario')
  })

  it('el botón de cerrar emite update:modelValue en false', async () => {
    const wrapper = mount(HojaInferior, {
      props: { modelValue: true, titulo: 'Registrar' },
      global: { stubs, ...mockDisplay(true) },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
