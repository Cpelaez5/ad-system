import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import PasoGuiado from '../PasoGuiado.vue'

const globalConfig = {
  stubs: {
    'v-progress-linear': {
      template: '<div role="progressbar" v-bind="$attrs"></div>',
    },
  },
}

describe('PasoGuiado.vue', () => {
  it('muestra "Paso X de Y", el título y el subtítulo', () => {
    const wrapper = mount(PasoGuiado, {
      props: { pasoActual: 2, totalPasos: 3, titulo: 'Confirma los datos', subtitulo: 'Revisa antes de guardar' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Paso 2 de 3')
    expect(wrapper.text()).toContain('Confirma los datos')
    expect(wrapper.text()).toContain('Revisa antes de guardar')
  })

  it('calcula el porcentaje de avance para la barra de progreso', () => {
    const wrapper = mount(PasoGuiado, {
      props: { pasoActual: 1, totalPasos: 4, titulo: '¿Tienes la factura?' },
      global: globalConfig,
    })
    expect(wrapper.find('[role="progressbar"]').attributes('model-value')).toBe('25')
  })
})
