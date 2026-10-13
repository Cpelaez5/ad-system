import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DialogoAdaptable from '../DialogoAdaptable.vue'

const stubs = {
  'v-dialog': {
    template: '<div class="dialog" :data-fullscreen="String(fullscreen)" :data-scrollable="String(scrollable)" v-if="modelValue"><slot /></div>',
    props: { modelValue: Boolean, persistent: Boolean, maxWidth: [String, Number], fullscreen: Boolean, scrollable: Boolean, transition: String },
  },
  'v-card': { template: '<div><slot /></div>' },
  'v-card-title': { template: '<div class="titulo"><slot /></div>' },
  'v-card-text': { template: '<div class="contenido"><slot /></div>' },
  'v-card-actions': { template: '<div class="acciones"><slot /></div>' },
  'v-divider': { template: '<hr />' },
  'v-spacer': { template: '<span />' },
  'v-icon': { template: '<i />' },
  'v-btn': { template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"></button>', props: ['disabled'], emits: ['click'] },
}

function montar(props = {}, { xs = false, slots = {} } = {}) {
  return mount(DialogoAdaptable, {
    props: { modelValue: true, titulo: 'Nuevo documento', ...props },
    slots: { default: 'Formulario', ...slots },
    global: { stubs, mocks: { $vuetify: { display: { xs } } } },
  })
}

describe('DialogoAdaptable.vue', () => {
  it('siempre es scrollable para que las acciones queden fijas', () => {
    const wrapper = montar()
    expect(wrapper.find('.dialog').attributes('data-scrollable')).toBe('true')
    expect(wrapper.find('.titulo').text()).toContain('Nuevo documento')
    expect(wrapper.find('.contenido').text()).toContain('Formulario')
  })

  it('pantalla completa solo en teléfono (xs)', () => {
    expect(montar({}, { xs: true }).find('.dialog').attributes('data-fullscreen')).toBe('true')
    expect(montar({}, { xs: false }).find('.dialog').attributes('data-fullscreen')).toBe('false')
  })

  it('muestra el slot de acciones solo si se pasa', () => {
    expect(montar().find('.acciones').exists()).toBe(false)
    const conAcciones = montar({}, { slots: { acciones: '<button>Guardar</button>' } })
    expect(conAcciones.find('.acciones').text()).toContain('Guardar')
  })

  it('el botón cerrar emite update:modelValue=false', async () => {
    const wrapper = montar()
    await wrapper.find('button[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('el botón cerrar se deshabilita mientras carga', () => {
    const wrapper = montar({ cargando: true })
    expect(wrapper.find('button[aria-label="Cerrar"]').attributes('disabled')).toBeDefined()
  })

  // I5 (ola F2b): la X antes emitía update:modelValue=false directo, sin
  // pasar por ningún cierre propio de la vista.
  it('la X también emite "cerrar", para que la vista limpie su propio estado', async () => {
    const wrapper = montar()
    await wrapper.find('button[aria-label="Cerrar"]').trigger('click')
    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  it('el cierre por el backdrop/Esc (update:model-value del v-dialog) también emite "cerrar"', async () => {
    const wrapper = montar()
    // Simula lo que hace v-dialog al cerrarse por backdrop/Esc.
    await wrapper.vm.actualizarModelo(false)
    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  it('no emite "cerrar" cuando el modelo pasa a true', async () => {
    const wrapper = montar()
    await wrapper.vm.actualizarModelo(true)
    expect(wrapper.emitted('cerrar')).toBeFalsy()
  })
})
