import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import EstadoVacio from '../EstadoVacio.vue'

const globalConfig = {
  stubs: {
    'v-empty-state': {
      template:
        '<div><span>{{ icon }}</span><h3>{{ title }}</h3><p>{{ text }}</p>' +
        '<button v-if="actionText" @click="$emit(\'click:action\')">{{ actionText }}</button></div>',
      props: ['icon', 'title', 'text', 'actionText', 'color'],
      emits: ['click:action'],
    },
    'v-btn': {
      template: '<button class="secundaria" @click="$emit(\'click\')"><slot /></button>',
      emits: ['click'],
    },
  },
}

describe('EstadoVacio.vue', () => {
  it('muestra título, mensaje e ícono con valores por defecto en lenguaje llano', () => {
    const wrapper = mount(EstadoVacio, {
      props: { titulo: 'Todavía no registras nada' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Todavía no registras nada')
    expect(wrapper.find('span').text()).toBe('mdi-text-box-search-outline')
  })

  it('muestra el botón de acción solo si se pasa textoAccion, y emite "accion" al pulsarlo', async () => {
    const sinAccion = mount(EstadoVacio, {
      props: { titulo: 'Sin proveedores' },
      global: globalConfig,
    })
    expect(sinAccion.find('button').exists()).toBe(false)

    const conAccion = mount(EstadoVacio, {
      props: { titulo: 'Sin proveedores', textoAccion: 'Agregar proveedor' },
      global: globalConfig,
    })
    const boton = conAccion.find('button')
    expect(boton.text()).toBe('Agregar proveedor')
    await boton.trigger('click')
    expect(conAccion.emitted('accion')).toBeTruthy()
  })

  it('muestra una segunda salida de bajo énfasis solo si se pasa, y emite "accionSecundaria"', async () => {
    const sinSecundaria = mount(EstadoVacio, {
      props: { titulo: 'Todavía no tienes productos', textoAccion: 'Agregar producto' },
      global: globalConfig,
    })
    expect(sinSecundaria.find('.secundaria').exists()).toBe(false)

    const conSecundaria = mount(EstadoVacio, {
      props: {
        titulo: 'Todavía no tienes productos',
        textoAccion: 'Agregar producto',
        textoAccionSecundaria: 'Subir lista de Excel',
      },
      global: globalConfig,
    })
    const boton = conSecundaria.find('.secundaria')
    expect(boton.text()).toBe('Subir lista de Excel')
    await boton.trigger('click')
    expect(conSecundaria.emitted('accionSecundaria')).toBeTruthy()
  })
})
