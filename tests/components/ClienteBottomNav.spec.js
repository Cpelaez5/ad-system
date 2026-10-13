import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ClienteBottomNav from '@/components/layout/ClienteBottomNav.vue'

/**
 * Tests básicos de render de la barra inferior del cliente:
 * - Visible en móvil (<600px) cuando el usuario es cliente.
 * - No visible para otros roles (ej. admin), aunque sea móvil.
 * - No visible en escritorio para cliente (ahí manda el drawer permanente).
 *
 * No se instala el plugin de Vuetify real (evita el problema conocido de
 * vitest con los imports de CSS de `vuetify/components`): basta con mockear
 * `$vuetify.display.xs`, ya que solo nos interesa la lógica de visibilidad
 * (el v-if raíz del componente), no el estilo visual de Vuetify.
 */

function mountBottomNav(isXs) {
  return mount(ClienteBottomNav, {
    global: {
      mocks: {
        $vuetify: { display: { xs: isXs } },
        $route: { path: '/cliente/inicio', query: {} },
        $router: { push: vi.fn() }
      },
      stubs: {
        HojaInferior: true,
        TarjetaAccion: true
      }
    }
  })
}

describe('ClienteBottomNav', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('se muestra en móvil (<600px) para el rol cliente', async () => {
    localStorage.setItem('currentUser', JSON.stringify({ role: 'cliente' }))

    const wrapper = mountBottomNav(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Inicio')
    expect(wrapper.text()).toContain('Registrar')
    expect(wrapper.text()).toContain('Mis números')
    expect(wrapper.text()).toContain('Más')
  })

  it('NO se muestra en móvil para el rol admin', async () => {
    localStorage.setItem('currentUser', JSON.stringify({ role: 'admin' }))

    const wrapper = mountBottomNav(true)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Registrar')
  })

  it('NO se muestra en escritorio (>=600px) para el rol cliente (ahí manda el drawer)', async () => {
    localStorage.setItem('currentUser', JSON.stringify({ role: 'cliente' }))

    const wrapper = mountBottomNav(false)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Registrar')
  })
})
