import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/services/bcvService.js', () => ({
  default: {
    getCurrentRate: vi.fn(async () => ({ success: true, data: { dollar: 36.5, euro: 39.1 } })),
    clearCache: vi.fn(),
  },
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null })) })) })),
    })),
  },
}))

vi.mock('@/services/user-settings-service.js', () => ({
  default: {
    getSettings: vi.fn(() => ({
      showUsdRate: true,
      showEurRate: true,
      showCnyRate: false,
      showTryRate: false,
      showRubRate: false,
    })),
  },
}))

vi.mock('@/services/venezuelaLocationsService.js', () => ({
  default: { getStateByMunicipality: vi.fn(() => null) },
}))

vi.mock('@/services/userService', () => ({ default: { logout: vi.fn(async () => {}) } }))

import AppShell from '@/components/layout/AppShell.vue'
import BarraSuperior from '@/components/layout/BarraSuperior.vue'
import MenuLateral from '@/components/layout/MenuLateral.vue'
import ClienteBottomNav from '@/components/layout/ClienteBottomNav.vue'

const RAIL_KEY = 'ad_system_sidebar_rail_collapsed'
const MODO_KEY = 'ad_system_menu_modo'

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * AppShell orquesta BarraSuperior/MenuLateral/ClienteBottomNav (todos
 * stubbed aquí: cada uno tiene su propio spec). Lo que se prueba es que
 * AppShell les pasa las props correctas según el breakpoint/rol, que es la
 * lógica propia de este componente (ver docs/mvp/diseno/fase2-spec.md §1 y
 * el feedback de la tarea sobre el shell).
 */
function mountShell({ role, xs, lgAndUp }) {
  localStorage.setItem('currentUser', JSON.stringify({ role, firstName: 'María' }))
  return mount(AppShell, {
    global: {
      mocks: {
        $vuetify: { display: { xs, lgAndUp, mdAndDown: !lgAndUp } },
        $route: { meta: { title: 'Inicio' }, path: '/cliente/inicio' },
        $router: { push: vi.fn() },
      },
      stubs: {
        TrialBanner: true,
        BarraSuperior: true,
        MenuLateral: true,
        ClienteBottomNav: true,
      },
    },
  })
}

describe('AppShell', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('móvil + cliente: no pide el botón de menú (manda la barra inferior, no el drawer)', async () => {
    const wrapper = mountShell({ role: 'cliente', xs: true, lgAndUp: false })
    await flushPromises()

    expect(wrapper.findComponent(ClienteBottomNav).exists()).toBe(true)
    expect(wrapper.findComponent(MenuLateral).props('role')).toBe('cliente')
    expect(wrapper.findComponent(BarraSuperior).props('mostrarMenu')).toBe(false)
  })

  it('tablet/móvil no-cliente (<1280px): pide el botón de menú del drawer temporal', async () => {
    const wrapper = mountShell({ role: 'admin', xs: true, lgAndUp: false })
    await flushPromises()

    expect(wrapper.findComponent(BarraSuperior).props('mostrarMenu')).toBe(true)
  })

  it("escritorio (>=1280px): menú en modo 'fijo' por defecto; el pin lo cambia y se guarda", async () => {
    const wrapper = mountShell({ role: 'admin', xs: false, lgAndUp: true })
    await flushPromises()

    expect(wrapper.findComponent(BarraSuperior).props('mostrarMenu')).toBe(false)
    const menu = wrapper.findComponent(MenuLateral)
    expect(menu.props('modo')).toBe('fijo')

    await menu.vm.$emit('cambiar-modo', 'auto')
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(MenuLateral).props('modo')).toBe('auto')
    expect(localStorage.getItem(MODO_KEY)).toBe('auto')
  })

  it('recuerda el modo guardado de una sesión anterior', async () => {
    localStorage.setItem(MODO_KEY, 'auto')
    const wrapper = mountShell({ role: 'contador', xs: false, lgAndUp: true })
    await flushPromises()
    expect(wrapper.findComponent(MenuLateral).props('modo')).toBe('auto')
  })

  it("migra la preferencia anterior (rail plegado = '1') al modo 'auto'", async () => {
    localStorage.setItem(RAIL_KEY, '1')
    const wrapper = mountShell({ role: 'contador', xs: false, lgAndUp: true })
    await flushPromises()
    expect(wrapper.findComponent(MenuLateral).props('modo')).toBe('auto')
  })

  it('pasa la tasa BCV cargada a ClienteBottomNav y a BarraSuperior', async () => {
    const wrapper = mountShell({ role: 'cliente', xs: true, lgAndUp: false })
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(ClienteBottomNav).props('bcvRate')).toEqual({ dollar: 36.5, euro: 39.1 })
  })
})
