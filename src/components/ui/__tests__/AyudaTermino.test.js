import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AyudaTermino from '../AyudaTermino.vue'
import GLOSARIO from '@/constants/glosario.js'

const globalConfig = {
  mocks: {
    $vuetify: { display: { mobile: false } }
  },
  stubs: {
    'v-menu': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    'v-bottom-sheet': { template: '<div><slot name="activator" :props="{}" /><slot /></div>' },
    'v-btn': { template: '<button class="v-btn"><slot /></button>' },
    'v-card': { template: '<div class="v-card"><slot /></div>' },
    'v-card-text': { template: '<div><slot /></div>' },
  }
}

describe('AyudaTermino.vue', () => {
  it('no renderiza nada si la clave es inválida', () => {
    const wrapper = mount(AyudaTermino, {
      props: { clave: 'clave_inexistente' },
      global: globalConfig
    })
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renderiza con clave válida y muestra el texto simple al abrir', () => {
    const wrapper = mount(AyudaTermino, {
      props: { clave: 'iva' },
      global: globalConfig
    })
    
    // Renderiza el botón
    expect(wrapper.find('button.v-btn').exists()).toBe(true)
    
    // Con los stubs simplificados, el contenido del slot por defecto
    // ya está en el DOM, así que validamos los textos del glosario
    const termino = GLOSARIO['iva']
    expect(wrapper.text()).toContain(termino.simple)
    expect(wrapper.text()).toContain(termino.explicacion)
    expect(wrapper.text()).toContain(termino.ejemplo)
    expect(wrapper.text()).toContain(`Término oficial: ${termino.termino}`)
  })
})
