import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CifrasEnLinea from '../CifrasEnLinea.vue'
import DialogoConfirmar from '../DialogoConfirmar.vue'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}
const vuetify = createVuetify({ components, directives })
const DialogoStub = {
  props: ['modelValue', 'titulo'],
  template: '<div v-if="modelValue" class="dialogo"><h2>{{ titulo }}</h2><slot /><slot name="acciones" /></div>',
}

describe('CifrasEnLinea', () => {
  const cifras = [
    { clave: 'a', valor: 12, texto: 'empresas activas' },
    { clave: 'b', valor: '$ 50,00', texto: 'por cobrar', alerta: true },
  ]

  it('muestra cada cifra con su texto y marca la alerta', () => {
    const w = mount(CifrasEnLinea, { props: { cifras }, global: { plugins: [vuetify] } })
    expect(w.get('[data-testid="cifra-a"]').text()).toContain('12')
    expect(w.get('[data-testid="cifra-a"]').text()).toContain('empresas activas')
    expect(w.find('[data-testid="cifra-b"] .cifras-en-linea__valor--alerta').exists()).toBe(true)
    expect(w.find('[data-testid="cifra-a"] .cifras-en-linea__valor--alerta').exists()).toBe(false)
  })

  it('mientras carga muestra puntos suspensivos en vez de números', () => {
    const w = mount(CifrasEnLinea, { props: { cifras, cargando: true }, global: { plugins: [vuetify] } })
    expect(w.get('[data-testid="cifra-a"]').text()).toContain('…')
    expect(w.text()).not.toContain('12')
  })

  it('no usa colores fijos: solo variables del tema (claro y oscuro)', () => {
    const w = mount(CifrasEnLinea, { props: { cifras }, global: { plugins: [vuetify] } })
    expect(w.html()).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  })
})

describe('DialogoConfirmar', () => {
  const montar = (props = {}) => mount(DialogoConfirmar, {
    props: { modelValue: true, titulo: '¿Anular?', mensaje: 'No se puede deshacer.', textoConfirmar: 'Anular', ...props },
    global: { plugins: [vuetify], stubs: { DialogoAdaptable: DialogoStub } },
  })

  it('dice qué pasará y emite confirmar', async () => {
    const w = montar()
    expect(w.get('[data-testid="confirmar-mensaje"]').text()).toBe('No se puede deshacer.')
    await w.get('[data-testid="confirmar-aceptar"]').trigger('click')
    expect(w.emitted('confirmar')).toHaveLength(1)
  })

  it('Cancelar cierra sin confirmar', async () => {
    const w = montar()
    await w.get('[data-testid="confirmar-cancelar"]').trigger('click')
    expect(w.emitted('update:modelValue')[0]).toEqual([false])
    expect(w.emitted('confirmar')).toBeUndefined()
  })

  it('el botón de confirmar se deshabilita cuando la vista lo pide', () => {
    const w = montar({ deshabilitado: true })
    expect(w.get('[data-testid="confirmar-aceptar"]').attributes('disabled')).toBeDefined()
  })
})
