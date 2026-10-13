import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/services/chatService', () => ({
  default: {
    getPlanLimits: vi.fn(() => ({ enabled: true })),
    getQuickActions: vi.fn(() => []),
    getWelcomeMessage: vi.fn(() => 'Hola'),
    checkDailyLimit: vi.fn(async () => ({ allowed: true, remaining: 5, limit: 5, message: '' })),
    createConversation: vi.fn(async () => ({ id: 'conv-1' })),
    saveMessage: vi.fn(),
    sendMessage: vi.fn(async () => 'respuesta'),
  },
}))

import SupportChat from '@/components/common/SupportChat.vue'

/**
 * Feedback del shell (punto 1): en móvil (<600px) la burbuja flotante del
 * chat tapaba el botón "Más" de la barra inferior del cliente. Se oculta
 * ahí y se abre desde la hoja "Más" → "Ayuda" vía el evento
 * 'ad-open-support-chat' (ver ClienteBottomNav.vue/HojaMas.vue).
 */
function mountChat() {
  return mount(SupportChat, {
    global: {
      mocks: {
        $route: { name: 'ClienteInicio', meta: { title: 'Inicio' }, query: {} },
      },
    },
  })
}

describe('SupportChat', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('currentUser', JSON.stringify({ id: 'u1', role: 'cliente', firstName: 'María' }))
  })

  afterEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true })
  })

  it('muestra la burbuja flotante en escritorio (>=600px)', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    const wrapper = mountChat()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.chat-fab').exists()).toBe(true)
  })

  it('NO muestra la burbuja flotante en móvil (<600px)', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    const wrapper = mountChat()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.chat-fab').exists()).toBe(false)
  })

  it('el evento "ad-open-support-chat" abre el panel aunque la burbuja esté oculta (móvil)', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    const wrapper = mountChat()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isChatOpen).toBe(false)

    window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isChatOpen).toBe(true)
    expect(wrapper.find('.chat-panel').exists()).toBe(true)
  })
})
