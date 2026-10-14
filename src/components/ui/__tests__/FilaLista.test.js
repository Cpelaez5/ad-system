import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FilaLista from '../FilaLista.vue'

const globalConfig = {
  stubs: {
    'v-avatar': { template: '<div v-bind="$attrs"><slot /></div>' },
    'v-icon': { template: '<i v-bind="$attrs"></i>' },
    'v-chip': { template: '<span class="chip" v-bind="$attrs"><slot /></span>' },
  },
}

describe('FilaLista.vue', () => {
  it('muestra título, subtítulo y valor', () => {
    const wrapper = mount(FilaLista, {
      props: { titulo: 'Proveedor X', subtitulo: 'RIF J-12345678-9', valor: 'Bs. 1.200,00' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Proveedor X')
    expect(wrapper.text()).toContain('RIF J-12345678-9')
    expect(wrapper.text()).toContain('Bs. 1.200,00')
  })

  it('muestra el chip de estado solo si se pasa', () => {
    const sinEstado = mount(FilaLista, { props: { titulo: 'Producto' }, global: globalConfig })
    expect(sinEstado.find('.chip').exists()).toBe(false)

    const conEstado = mount(FilaLista, {
      props: { titulo: 'Producto', estado: 'Stock bajo', colorEstado: 'warning' },
      global: globalConfig,
    })
    expect(conEstado.find('.chip').text()).toBe('Stock bajo')
  })

  it('muestra el slot de acciones solo si se pasa', () => {
    const sinAcciones = mount(FilaLista, { props: { titulo: 'Producto' }, global: globalConfig })
    expect(sinAcciones.find('.fila-lista__acciones').exists()).toBe(false)

    const conAcciones = mount(FilaLista, {
      props: { titulo: 'Producto' },
      slots: { acciones: '<button>Editar</button>' },
      global: globalConfig,
    })
    expect(conAcciones.find('.fila-lista__acciones').text()).toContain('Editar')
  })

  it('no es tocable por defecto; con "clicable" es accesible por teclado y emite "click"', async () => {
    const noClicable = mount(FilaLista, { props: { titulo: 'Producto' }, global: globalConfig })
    expect(noClicable.attributes('role')).toBeUndefined()

    const clicable = mount(FilaLista, { props: { titulo: 'Producto', clicable: true }, global: globalConfig })
    expect(clicable.attributes('role')).toBe('button')
    expect(clicable.attributes('tabindex')).toBe('0')

    await clicable.trigger('click')
    await clicable.trigger('keydown.enter')
    await clicable.trigger('keydown.space')
    expect(clicable.emitted('click')?.length).toBe(3)
  })

  it('un clic en las acciones no dispara el "click" de la fila (stopPropagation)', async () => {
    const wrapper = mount(FilaLista, {
      props: { titulo: 'Producto', clicable: true },
      slots: { acciones: '<button>Editar</button>' },
      global: globalConfig,
    })
    await wrapper.find('.fila-lista__acciones button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  // M7 (ola F2b): antes solo "click" tenía .stop; Enter/Espacio sobre un
  // botón de acciones subía hasta la fila y disparaba su "click" también.
  it('un Enter o Espacio en las acciones tampoco dispara el "click" de la fila', async () => {
    const wrapper = mount(FilaLista, {
      props: { titulo: 'Producto', clicable: true },
      slots: { acciones: '<button>Editar</button>' },
      global: globalConfig,
    })
    await wrapper.find('.fila-lista__acciones button').trigger('keydown.enter')
    await wrapper.find('.fila-lista__acciones button').trigger('keydown.space')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
