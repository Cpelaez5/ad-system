import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ListaRanking from '../ListaRanking.vue'

const globalConfig = {
  stubs: {
    'v-progress-linear': {
      template: '<div class="barra" :data-model-value="modelValue"></div>',
      props: ['modelValue', 'color', 'bgColor', 'height', 'rounded'],
    },
  },
}

// Espera a que pase el requestAnimationFrame que dispara el crecimiento de
// las barras (ver ListaRanking.vue: reiniciarCrecimiento).
async function esperarCrecimiento() {
  await new Promise((resolve) => setTimeout(resolve, 30))
}

describe('ListaRanking.vue', () => {
  it('muestra el texto de vacío cuando no hay ítems', () => {
    const wrapper = mount(ListaRanking, {
      props: { items: [], vacioTexto: 'Sin gastos registrados en este período.' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Sin gastos registrados en este período.')
  })

  it('muestra nombre y monto formateado de cada ítem', () => {
    const wrapper = mount(ListaRanking, {
      props: {
        items: [
          { nombre: 'Mercancía', monto: 300 },
          { nombre: 'Servicios', monto: 100 },
        ],
      },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Mercancía')
    expect(wrapper.text()).toContain('$ 300,00')
    expect(wrapper.text()).toContain('Servicios')
    expect(wrapper.text()).toContain('$ 100,00')
  })

  it('las barras arrancan en 0 y crecen al primer ítem relativo al más grande', async () => {
    const wrapper = mount(ListaRanking, {
      props: {
        items: [
          { nombre: 'A', monto: 200 },
          { nombre: 'B', monto: 100 },
        ],
      },
      global: globalConfig,
    })
    const barras = wrapper.findAll('.barra')
    expect(barras[0].attributes('data-model-value')).toBe('0')
    expect(barras[1].attributes('data-model-value')).toBe('0')

    await esperarCrecimiento()

    const barrasCrecidas = wrapper.findAll('.barra')
    expect(barrasCrecidas[0].attributes('data-model-value')).toBe('100') // el más grande = 100%
    expect(barrasCrecidas[1].attributes('data-model-value')).toBe('50') // la mitad del más grande
  })

  it('un solo ítem con monto 0 no revienta (porcentaje 0, sin dividir por cero)', async () => {
    const wrapper = mount(ListaRanking, {
      props: { items: [{ nombre: 'Sin categoría', monto: 0 }] },
      global: globalConfig,
    })
    await esperarCrecimiento()
    expect(wrapper.find('.barra').attributes('data-model-value')).toBe('0')
  })
})
