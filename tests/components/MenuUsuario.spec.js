import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MenuUsuario from '@/components/layout/MenuUsuario.vue'

const logoutMock = vi.fn(async () => {})
vi.mock('@/services/userService', () => ({ default: { logout: logoutMock } }))

/**
 * MenuUsuario — hallazgo #8 Importante (sin spec propio hasta ahora). Se
 * stubbean v-menu/v-btn/v-list-item con stubs transparentes (renderizan su
 * slot por defecto) para no depender del comportamiento real de apertura
 * de Vuetify: lo que importa aquí son las opciones mostradas y el logout.
 */
const globalConfig = {
  mocks: {
    $router: { push: vi.fn() },
  },
  stubs: {
    // Stubs transparentes: renderizan su slot y reenvían los listeners
    // (v-bind="$attrs") para que el @click real de MenuUsuario siga
    // funcionando, sin depender del comportamiento visual de Vuetify.
    'v-menu': { template: '<div><slot /></div>' },
    'v-badge': { template: '<span><slot /></span>' },
    'v-divider': { template: '<hr />' },
    'v-list': { template: '<div class="v-list"><slot /></div>' },
    'v-list-item': { template: '<div class="v-list-item" v-bind="$attrs"><slot /></div>' },
    'v-list-item-title': { template: '<div class="v-list-item-title"><slot /></div>' },
    'v-list-item-subtitle': { template: '<div class="v-list-item-subtitle"><slot /></div>' },
    'v-chip': { template: '<span class="v-chip"><slot /></span>' },
  },
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('MenuUsuario', () => {
  afterEach(() => {
    logoutMock.mockClear()
  })

  it('muestra el nombre del usuario actual', () => {
    const wrapper = mount(MenuUsuario, {
      props: { currentUser: { firstName: 'María', lastName: 'Pérez', role: 'cliente' } },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('María')
    expect(wrapper.text()).toContain('Pérez')
  })

  it('usa "Usuario" si no hay nombre', () => {
    const wrapper = mount(MenuUsuario, { global: globalConfig })
    expect(wrapper.text()).toContain('Usuario')
  })

  it('muestra el rol en lenguaje llano', () => {
    const wrapper = mount(MenuUsuario, {
      props: { currentUser: { role: 'contador' } },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Contador')
  })

  it('muestra el plan (si se pasa userPlan) como chip', () => {
    const wrapper = mount(MenuUsuario, {
      props: { currentUser: { role: 'cliente' }, userPlan: 'pro' },
      global: globalConfig,
    })
    expect(wrapper.text()).toContain('Plan Profesional')
  })

  it('muestra las opciones: Mi Suscripción, Facturación, Mi Perfil, Configuración y Cerrar Sesión', () => {
    const wrapper = mount(MenuUsuario, { global: globalConfig })
    expect(wrapper.text()).toContain('Mi Suscripción')
    expect(wrapper.text()).toContain('Facturación')
    expect(wrapper.text()).toContain('Mi Perfil')
    expect(wrapper.text()).toContain('Configuración')
    expect(wrapper.text()).toContain('Cerrar Sesión')
  })

  it('clic en "Mi Perfil" navega a /cliente/mi-area', async () => {
    const wrapper = mount(MenuUsuario, { global: globalConfig })
    const item = wrapper.findAll('.v-list-item').find((i) => i.text().includes('Mi Perfil'))
    await item.trigger('click')
    expect(globalConfig.mocks.$router.push).toHaveBeenCalledWith('/cliente/mi-area')
  })

  it('clic en "Cerrar Sesión" llama a userService.logout() y navega a /login', async () => {
    const wrapper = mount(MenuUsuario, { global: globalConfig })
    const item = wrapper.findAll('.v-list-item').find((i) => i.text().includes('Cerrar Sesión'))
    await item.trigger('click')
    await flushPromises()
    expect(logoutMock).toHaveBeenCalled()
    expect(globalConfig.mocks.$router.push).toHaveBeenCalledWith('/login')
  })

  it('marca "Mi Perfil" con un ícono de alerta si el perfil del cliente está incompleto', () => {
    const wrapper = mount(MenuUsuario, {
      props: { currentUser: { role: 'cliente' }, isClientProfileIncomplete: true },
      global: globalConfig,
    })
    expect(wrapper.html()).toContain('mdi-alert-circle')
  })
})
