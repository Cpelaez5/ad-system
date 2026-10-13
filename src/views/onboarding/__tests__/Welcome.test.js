import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Welcome from '../Welcome.vue'
import BotonAccion from '@/components/ui/BotonAccion.vue'

// Mock userService
const mockGetCurrentUser = vi.fn()
vi.mock('@/services/userService', () => ({
  default: { getCurrentUser: (...args) => mockGetCurrentUser(...args) }
}))

function montarWelcome({ routerPush = vi.fn() } = {}) {
  const wrapper = mount(Welcome, {
    global: {
      mocks: {
        $router: { push: routerPush }
      },
      stubs: {
        LogoAdSystem: true,
        vWindow: {
          template: '<div class="v-window-stub"><slot /></div>',
          props: ['modelValue']
        },
        vWindowItem: {
          template: '<div v-if="$parent.modelValue === value"><slot /></div>',
          props: ['value']
        },
        vIcon: true
      }
    }
  })
  return { wrapper, routerPush }
}

describe('Welcome.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('muestra el paso 1, avanza al 2 y 3, Empezar marca welcome_seen y navega a mi-area si perfil fiscal incompleto', async () => {
    // Configurar el usuario mockeado con perfil fiscal incompleto (sin municipio)
    mockGetCurrentUser.mockResolvedValue({
      role: 'cliente',
      client: {
        activity_type: 'Servicios',
        licencia_actividad_economica: '12345'
        // municipio / estado faltantes
      }
    })

    const { wrapper, routerPush } = montarWelcome()

    // Paso 1
    expect(wrapper.text()).toContain('Bienvenido a AD System')
    expect(wrapper.text()).toContain('Aquí llevas las cuentas de tu negocio')

    // Botón Siguiente en paso 1
    let botones = wrapper.findAllComponents(BotonAccion)
    let btnSiguiente = botones.find(b => b.props('texto') === 'Siguiente')
    expect(btnSiguiente.exists()).toBe(true)
    
    await btnSiguiente.trigger('click')
    
    // Paso 2 (simulado cambiando step, aunque v-window-stub renderiza condicionalmente)
    expect(wrapper.vm.step).toBe(2)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Registra con una foto')
    
    // Botón Siguiente en paso 2
    botones = wrapper.findAllComponents(BotonAccion)
    btnSiguiente = botones.find(b => b.props('texto') === 'Siguiente')
    expect(btnSiguiente.exists()).toBe(true)
    
    await btnSiguiente.trigger('click')
    
    // Paso 3
    expect(wrapper.vm.step).toBe(3)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Mira cómo vas')
    
    // Botón Empezar en paso 3
    botones = wrapper.findAllComponents(BotonAccion)
    const btnEmpezar = botones.find(b => b.props('texto') === 'Empezar')
    expect(btnEmpezar.exists()).toBe(true)

    // Hacer clic en empezar
    await btnEmpezar.trigger('click')
    await flushPromises()

    // Verificar localStorage y router
    expect(localStorage.getItem('welcome_seen')).toBe('true')
    expect(routerPush).toHaveBeenCalledWith({ path: '/cliente/mi-area', query: { required: 'fiscal' } })
  })

  it('Empezar navega a /cliente/inicio si el perfil fiscal está completo', async () => {
    // Configurar el usuario mockeado con perfil fiscal completo
    mockGetCurrentUser.mockResolvedValue({
      role: 'cliente',
      client: {
        activity_type: 'Servicios',
        licencia_actividad_economica: '12345',
        municipio: 'Libertador',
        estado: 'Distrito Capital'
      }
    })

    const { wrapper, routerPush } = montarWelcome()

    // Saltar al paso 3 para probar Empezar
    wrapper.vm.step = 3
    await wrapper.vm.$nextTick()

    const btnEmpezar = wrapper.findAllComponents(BotonAccion).find(b => b.props('texto') === 'Empezar')
    await btnEmpezar.trigger('click')
    await flushPromises()

    // Verificar localStorage y router
    expect(localStorage.getItem('welcome_seen')).toBe('true')
    expect(routerPush).toHaveBeenCalledWith('/cliente/inicio')
  })
})