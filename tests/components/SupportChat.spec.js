import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const chat = vi.hoisted(() => ({
  getPlanLimits: vi.fn(() => ({ enabled: true })),
  getWelcomeMessage: vi.fn(() => 'Hola, ¿en qué te ayudo?'),
  checkDailyLimit: vi.fn(async () => ({ allowed: true, remaining: 5, limit: 5, message: '' })),
  createConversation: vi.fn(async () => ({ id: 'conv-1' })),
  saveMessage: vi.fn(),
  sendMessage: vi.fn(async () => 'respuesta'),
  updateConversationRoute: vi.fn(),
}))
vi.mock('@/services/chatService', () => ({ default: chat }))

const soporte = vi.hoisted(() => ({
  listarMisConsultas: vi.fn(async () => ({ data: [], error: null })),
  escribirAlEquipo: vi.fn(),
  cargarMensajes: vi.fn(async () => ({ data: [], error: null })),
  responderComoCliente: vi.fn(),
  marcarLeidoCliente: vi.fn(async () => ({ data: true, error: null })),
  marcarResuelta: vi.fn(async () => ({ data: true, error: null })),
  calificar: vi.fn(async () => ({ data: true, error: null })),
  suscribirMensajes: vi.fn(() => vi.fn()),
  suscribirMisConsultas: vi.fn(() => vi.fn()),
}))
vi.mock('@/services/soporteService', () => soporte)

vi.mock('@/services/ayudaService', async () => {
  const { crearArticulo } = await import('@/utils/ayudaBusqueda.js')
  const lista = [
    crearArticulo('mi-plan-y-pagos', '---\ntitulo: Mi plan y pagos\nresumen: Cómo pagar\npalabras: pago, plan\norden: 1\n---\nReporta tu pago.'),
  ]
  return { cargarArticulos: vi.fn(async () => lista), contextoAyudaParaChat: vi.fn(async () => '') }
})

import SupportChat from '@/components/common/SupportChat.vue'

const push = vi.fn()
function montar() {
  return mount(SupportChat, {
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: { transition: false },
      mocks: {
        $route: { name: 'ClienteInicio', meta: { title: 'Inicio' }, query: {} },
        $router: { push },
      },
    },
  })
}

const consulta = (extra = {}) => ({
  id: 'c1', mode: 'human', ticket_numero: 42, categoria: 'pagos', estado_ticket: 'esperando_cliente',
  no_leidos_cliente: 0, calificacion: null, ultimo_mensaje_en: new Date().toISOString(), created_at: new Date().toISOString(), ...extra,
})

async function abrir(wrapper) {
  window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
  await flushPromises()
  return wrapper
}

describe('SupportChat', () => {
  const originalInnerWidth = window.innerWidth

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem('currentUser', JSON.stringify({ id: 'u1', role: 'cliente', firstName: 'María' }))
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true })
    soporte.listarMisConsultas.mockResolvedValue({ data: [], error: null })
    chat.sendMessage.mockResolvedValue('respuesta')
  })

  afterEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true })
  })

  describe('botón flotante y apertura', () => {
    it('muestra la burbuja flotante en escritorio (>=600px)', async () => {
      const w = montar()
      await flushPromises()
      expect(w.find('.chat-fab').exists()).toBe(true)
      w.unmount()
    })

    it('NO muestra la burbuja flotante en móvil (<600px)', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      const w = montar()
      await flushPromises()
      expect(w.find('.chat-fab').exists()).toBe(false)
      w.unmount()
    })

    it('el evento "ad-open-support-chat" abre el panel aunque la burbuja esté oculta (móvil)', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      const w = montar()
      await flushPromises()
      expect(w.vm.isChatOpen).toBe(false)
      await abrir(w)
      expect(w.vm.isChatOpen).toBe(true)
      expect(w.find('.chat-panel').exists()).toBe(true)
      expect(w.find('.chat-panel').classes()).toContain('chat-panel--mobile')
      w.unmount()
    })

    it('no aparece para quien no es cliente', async () => {
      localStorage.setItem('currentUser', JSON.stringify({ id: 'u2', role: 'contador' }))
      const w = montar()
      await flushPromises()
      expect(w.find('.support-chat-wrapper').exists()).toBe(false)
      w.unmount()
    })
  })

  describe('pestañas y "Escribirle al equipo"', () => {
    it('muestra las pestañas Asistente y Mis consultas, y el botón "Escribirle al equipo" siempre visible', async () => {
      const w = montar()
      await abrir(w)
      const pestanas = w.findAll('[role="tab"]').map((t) => t.text())
      expect(pestanas[0]).toContain('Asistente')
      expect(pestanas[1]).toContain('Mis consultas')
      expect(w.text()).toContain('Escribirle al equipo')
      w.unmount()
    })

    it('Mis consultas vacía enseña qué hacer', async () => {
      const w = montar()
      await abrir(w)
      await w.findAll('[role="tab"]')[1].trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Aún no le has escrito al equipo')
      w.unmount()
    })

    it('cancelar el paso de escribir no envía nada', async () => {
      const w = montar()
      await abrir(w)
      await w.findAll('button').find((b) => b.text().includes('Escribirle al equipo')).trigger('click')
      await flushPromises()
      expect(w.text()).toContain('¿Sobre qué es?')
      await w.findAll('button').find((b) => b.text() === 'Cancelar').trigger('click')
      await flushPromises()
      expect(soporte.escribirAlEquipo).not.toHaveBeenCalled()
      expect(w.text()).not.toContain('¿Sobre qué es?')
      w.unmount()
    })

    it('envía el ticket con tema, mensaje y resumen, y muestra el número y la promesa', async () => {
      soporte.escribirAlEquipo.mockResolvedValue({ data: consulta({ estado_ticket: 'nuevo' }), error: null })
      soporte.listarMisConsultas.mockResolvedValue({ data: [consulta({ estado_ticket: 'nuevo' })], error: null })
      const w = montar()
      await abrir(w)
      await w.findAll('button').find((b) => b.text().includes('Escribirle al equipo')).trigger('click')
      await flushPromises()

      const enviar = () => w.findAll('button').find((b) => b.text().includes('Enviar al equipo'))
      expect(enviar().attributes('disabled')).toBeDefined()
      await w.findAll('.tema').find((t) => t.text().includes('Pagos y mi plan')).trigger('click')
      await w.get('#soporte-mensaje').setValue('Ya pagué y sigue vencido')
      expect(enviar().attributes('disabled')).toBeUndefined()
      await w.get('form.paso').trigger('submit')
      await flushPromises()

      expect(soporte.escribirAlEquipo).toHaveBeenCalledTimes(1)
      const arg = soporte.escribirAlEquipo.mock.calls[0][0]
      expect(arg).toMatchObject({ conversationId: 'conv-1', categoria: 'pagos', mensaje: 'Ya pagué y sigue vencido' })
      expect(arg.resumen).toContain('Pantalla: Inicio')
      expect(w.text()).toContain('Consulta #AD-0042 · Te respondemos en menos de 24 horas hábiles')
      w.unmount()
    })

    it('si falla el envío, avisa y deja intentar de nuevo', async () => {
      soporte.escribirAlEquipo.mockResolvedValue({ data: null, error: 'No pudimos enviar tu consulta. Intenta de nuevo.' })
      const w = montar()
      await abrir(w)
      await w.findAll('button').find((b) => b.text().includes('Escribirle al equipo')).trigger('click')
      await flushPromises()
      await w.findAll('.tema')[1].trigger('click')
      await w.get('#soporte-mensaje').setValue('No me carga la pantalla')
      await w.get('form.paso').trigger('submit')
      await flushPromises()
      expect(w.text()).toContain('No pudimos enviar tu consulta')
      expect(w.text()).toContain('¿Sobre qué es?')
      w.unmount()
    })
  })

  describe('guías, IA y salidas', () => {
    it('mientras escribe sugiere guías con enlace a /ayuda', async () => {
      const w = montar()
      await abrir(w)
      await w.get('input[type="text"]').setValue('cómo pago mi plan')
      await flushPromises()
      const enlace = w.get('a.guias__enlace')
      expect(enlace.text()).toContain('Mi plan y pagos')
      expect(enlace.attributes('href')).toBe('/ayuda/mi-plan-y-pagos')
      await enlace.trigger('click')
      expect(push).toHaveBeenCalledWith('/ayuda/mi-plan-y-pagos')
      w.unmount()
    })

    it('sin créditos de IA: mensaje amable, guías y "Escribirle al equipo"; el asistente se apaga', async () => {
      chat.sendMessage.mockRejectedValue(Object.assign(new Error('SIN_CREDITOS'), { code: 'SIN_CREDITOS' }))
      const w = montar()
      await abrir(w)
      await w.get('input[type="text"]').setValue('cómo pago mi plan')
      await w.get('form.asistente__form').trigger('submit')
      await flushPromises()
      const aviso = w.get('.aviso')
      expect(aviso.text()).toContain('ya usó los créditos de este mes')
      expect(aviso.text()).toContain('Mi plan y pagos')
      expect(aviso.text()).toContain('Escribirle al equipo')
      expect(w.get('input[type="text"]').attributes('disabled')).toBeDefined()
      w.unmount()
    })

    it('un fallo cualquiera de la IA también deja salida', async () => {
      chat.sendMessage.mockRejectedValue(new Error('boom'))
      const w = montar()
      await abrir(w)
      await w.get('input[type="text"]').setValue('hola equipo')
      await w.get('form.asistente__form').trigger('submit')
      await flushPromises()
      expect(w.get('.aviso').text()).toContain('no pudo responder')
      expect(w.get('input[type="text"]').attributes('disabled')).toBeUndefined()
      w.unmount()
    })

    it('si la IA no sabe, oculta la marca y ofrece "¿Se lo pasamos al equipo?"; al aceptar abre el paso con la pregunta', async () => {
      chat.sendMessage.mockResolvedValue('No tengo cómo verlo.\n[[ESCALAR]]')
      const w = montar()
      await abrir(w)
      await w.get('input[type="text"]').setValue('Mis números no cuadran')
      await w.get('form.asistente__form').trigger('submit')
      await flushPromises()
      expect(w.text()).toContain('No tengo cómo verlo.')
      expect(w.text()).not.toContain('[[ESCALAR]]')
      expect(w.text()).toContain('¿Se lo pasamos al equipo?')
      await w.findAll('button').find((b) => b.text().includes('Sí, pasárselo')).trigger('click')
      await flushPromises()
      expect(w.text()).toContain('¿Sobre qué es?')
      expect(w.get('#soporte-mensaje').element.value).toBe('Mis números no cuadran')
      w.unmount()
    })

    it('una respuesta normal a una pregunta normal no ofrece escalar', async () => {
      chat.sendMessage.mockResolvedValue('Toca Registrar y elige Venta.')
      const w = montar()
      await abrir(w)
      await w.get('input[type="text"]').setValue('cómo registro una venta')
      await w.get('form.asistente__form').trigger('submit')
      await flushPromises()
      expect(w.text()).not.toContain('¿Se lo pasamos al equipo?')
      w.unmount()
    })
  })

  describe('no leídos y el hilo', () => {
    it('muestra el punto rojo en el botón flotante y abre directo en Mis consultas', async () => {
      soporte.listarMisConsultas.mockResolvedValue({ data: [consulta({ no_leidos_cliente: 2 })], error: null })
      const w = montar()
      await flushPromises()
      expect(w.find('[data-test="punto-fab"]').exists()).toBe(true)
      await w.get('.chat-fab').trigger('click')
      await flushPromises()
      expect(w.find('[data-test="punto-pestana"]').exists()).toBe(true)
      expect(w.text()).toContain('Consulta #AD-0042')
      w.unmount()
    })

    it('al abrir el hilo carga los mensajes, pone los no leídos en 0 y escucha en tiempo real', async () => {
      soporte.listarMisConsultas.mockResolvedValue({ data: [consulta({ no_leidos_cliente: 1 })], error: null })
      soporte.cargarMensajes.mockResolvedValue({
        data: [
          { id: 'm1', role: 'user', content: 'Mi pago no aparece', created_at: new Date().toISOString() },
          { id: 'm2', role: 'agent', content: 'Ya lo revisamos', created_at: new Date().toISOString() },
        ],
        error: null,
      })
      const w = montar()
      await flushPromises()
      await w.get('.chat-fab').trigger('click')
      await flushPromises()
      await w.get('.fila').trigger('click')
      await flushPromises()
      expect(soporte.marcarLeidoCliente).toHaveBeenCalledWith('c1')
      expect(w.text()).toContain('Equipo AD System')
      expect(w.text()).toContain('Ya lo revisamos')

      const alRecibir = soporte.suscribirMensajes.mock.calls[0][1]
      alRecibir({ id: 'm3', role: 'agent', content: 'Listo, ya quedó', created_at: new Date().toISOString() })
      alRecibir({ id: 'm4', role: 'agent', content: 'NOTA', interno: true, created_at: new Date().toISOString() })
      await flushPromises()
      expect(w.text()).toContain('Listo, ya quedó')
      expect(w.text()).not.toContain('NOTA')
      w.unmount()
    })

    it('el cliente puede responder, marcar "Ya se resolvió" y calificar', async () => {
      soporte.listarMisConsultas.mockResolvedValue({ data: [consulta()], error: null })
      soporte.cargarMensajes.mockResolvedValue({ data: [{ id: 'm1', role: 'agent', content: 'Hola', created_at: new Date().toISOString() }], error: null })
      soporte.responderComoCliente.mockResolvedValue({ data: { id: 'm9', role: 'user', content: 'Gracias', created_at: new Date().toISOString() }, error: null })
      const w = montar()
      await flushPromises()
      await w.get('.chat-fab').trigger('click')
      await flushPromises()
      await w.findAll('[role="tab"]')[1].trigger('click')
      await flushPromises()
      await w.get('.fila').trigger('click')
      await flushPromises()

      await w.get('textarea.hilo__campo').setValue('Gracias')
      await w.get('form.hilo__form').trigger('submit')
      await flushPromises()
      expect(soporte.responderComoCliente).toHaveBeenCalledWith('c1', 'Gracias', undefined) // sin capturas adjuntas
      expect(w.text()).toContain('Gracias')

      await w.findAll('button').find((b) => b.text().includes('Ya se resolvió')).trigger('click')
      await flushPromises()
      expect(soporte.marcarResuelta).toHaveBeenCalledWith('c1')
      expect(w.text()).toContain('¿Quedó resuelto?')

      await w.findAll('button').find((b) => b.text() === 'Sí').trigger('click')
      await flushPromises()
      expect(soporte.calificar).toHaveBeenCalledWith('c1', 1)
      expect(w.text()).toContain('Nos alegra haberte ayudado')
      w.unmount()
    })
  })
})
