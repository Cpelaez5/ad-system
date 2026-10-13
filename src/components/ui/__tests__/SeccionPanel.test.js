import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SeccionPanel from '../SeccionPanel.vue'

const globalConfig = {
  stubs: {
    'v-card': { template: '<div><slot /></div>' },
    'v-card-item': { template: '<div><slot /></div>' },
    'v-card-text': { template: '<div><slot /></div>' },
    'v-icon': { template: '<i></i>' },
  },
}

describe('SeccionPanel.vue', () => {
  it('muestra el título y el contenido del slot por defecto', () => {
    const wrapper = mount(SeccionPanel, {
      props: { titulo: 'Últimos 6 meses' },
      slots: { default: '<p>contenido del gráfico</p>' },
      global: globalConfig,
    })
    expect(wrapper.find('h2').text()).toContain('Últimos 6 meses')
    expect(wrapper.text()).toContain('contenido del gráfico')
  })

  it('el subtítulo es opcional', () => {
    const sinSubtitulo = mount(SeccionPanel, { props: { titulo: 'Título' }, global: globalConfig })
    expect(sinSubtitulo.find('.seccion-panel__subtitulo').exists()).toBe(false)

    const conSubtitulo = mount(SeccionPanel, {
      props: { titulo: 'Título', subtitulo: 'Un detalle más' },
      global: globalConfig,
    })
    expect(conSubtitulo.text()).toContain('Un detalle más')
  })

  it('el slot "accion" solo se muestra si se usa', () => {
    const sinAccion = mount(SeccionPanel, { props: { titulo: 'Título' }, global: globalConfig })
    expect(sinAccion.html()).not.toContain('Ver todo')

    const conAccion = mount(SeccionPanel, {
      props: { titulo: 'Título' },
      slots: { accion: '<button>Ver todo</button>' },
      global: globalConfig,
    })
    expect(conAccion.text()).toContain('Ver todo')
  })
})
