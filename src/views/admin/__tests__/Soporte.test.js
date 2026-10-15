/**
 * Bandeja de soporte del super admin. El servicio está simulado: ningún test toca la BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const servicio = vi.hoisted(() => ({
  listarBandeja: vi.fn(),
  cargarMensajes: vi.fn(),
  enviarComoEquipo: vi.fn(),
  cambiarEstado: vi.fn(async () => ({ data: true, error: null })),
  cambiarPrioridad: vi.fn(async () => ({ data: true, error: null })),
  asignar: vi.fn(async () => ({ data: true, error: null })),
  marcarLeidoEquipo: vi.fn(async () => ({ data: true, error: null })),
  suscribirBandeja: vi.fn(() => vi.fn()),
}))
vi.mock('@/services/soporteService', () => servicio)

import Soporte from '../Soporte.vue'

const hace = (h) => new Date(Date.now() - h * 3_600_000).toISOString()
const fila = (id, n, estado, h, extra = {}) => ({
  id, ticket_numero: n, estado_ticket: estado, categoria: 'pagos', prioridad: 'normal',
  ultimo_mensaje_en: hace(h), created_at: hace(h), no_leidos_equipo: 0, asignado_a: null,
  current_route_title: 'Mi plan', negocio: `Negocio ${n}`, cliente_nombre: `Cliente ${n}`, plan: 'professional',
  metadata: {}, ...extra,
})

const montar = () => mount(Soporte, {
  global: { plugins: [createVuetify({ components, directives })], stubs: { transition: false } },
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('currentUser', JSON.stringify({ id: 'admin-1', role: 'super_admin' }))
  servicio.listarBandeja.mockResolvedValue({
    data: [
      fila('a', 1, 'nuevo', 2, { no_leidos_equipo: 1 }),
      fila('b', 2, 'nuevo', 30, { current_route_title: 'Mis papeles', metadata: { resumen: 'Pantalla: Mis papeles\nLo que preguntó: "no cuadra"' } }),
      fila('c', 3, 'en_curso', 5),
      fila('d', 4, 'resuelto', 80, { calificacion: -1 }),
    ],
    error: null,
  })
  servicio.cargarMensajes.mockResolvedValue({
    data: [
      { id: 'm1', role: 'user', content: 'Hola, mi IVA no cuadra', created_at: hace(30) },
      { id: 'm2', role: 'assistant', content: 'Revisa tus retenciones', created_at: hace(30) },
      { id: 'm3', role: 'agent', content: 'Nota: parece un duplicado', interno: true, created_at: hace(29) },
    ],
    error: null,
  })
})

describe('Soporte (bandeja)', () => {
  it('muestra los filtros con conteos y, por defecto, las nuevas ordenadas por antigüedad con el aviso de 24 h', async () => {
    const w = montar()
    await flushPromises()
    const texto = w.text()
    expect(texto).toContain('Nuevas · 2')
    expect(texto).toContain('En curso · 1')
    expect(texto).toContain('Esperando al cliente · 0')
    expect(texto).toContain('Resueltas · 1')
    const filas = w.findAll('.fila')
    expect(filas).toHaveLength(2)
    expect(filas[0].text()).toContain('#AD-0002')
    expect(filas[0].text()).toContain('Más de 24 h sin respuesta')
    expect(filas[1].text()).toContain('#AD-0001')
    expect(filas[1].text()).not.toContain('Más de 24 h')
    w.unmount()
  })

  it('al elegir otro estado cambia la lista', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('.v-chip').find((c) => c.text().startsWith('Resueltas')).trigger('click')
    await flushPromises()
    expect(w.findAll('.fila')).toHaveLength(1)
    expect(w.get('.fila').text()).toContain('#AD-0004')
    w.unmount()
  })

  it('al abrir una consulta muestra el contexto, el resumen, el hilo con la IA y la nota interna, y marca leído', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('.fila')[1].trigger('click') // la #1 (2 h) con no leídos
    await flushPromises()
    expect(servicio.cargarMensajes).toHaveBeenCalledWith('a')
    expect(servicio.marcarLeidoEquipo).toHaveBeenCalledWith('a')

    await w.findAll('.fila')[0].trigger('click') // la #2 (30 h)
    await flushPromises()
    const hilo = w.get('.hilo')
    expect(hilo.text()).toContain('Negocio 2')
    expect(hilo.text()).toContain('professional')
    expect(hilo.text()).toContain('Mis papeles')
    expect(hilo.text()).toContain('Resumen del problema')
    expect(hilo.text()).toContain('Hola, mi IVA no cuadra')
    expect(hilo.text()).toContain('Asistente IA')
    expect(hilo.text()).toContain('Nota interna (el cliente no la ve)')
    w.unmount()
  })

  it('responde al cliente con role agent y guarda notas como internas', async () => {
    servicio.enviarComoEquipo.mockResolvedValue({ data: { id: 'n1', role: 'agent', content: 'Ya lo vemos', created_at: new Date().toISOString() }, error: null })
    const w = montar()
    await flushPromises()
    await w.findAll('.fila')[0].trigger('click')
    await flushPromises()

    await w.get('textarea.hilo__campo').setValue('Ya lo vemos')
    await w.get('form.hilo__responder').trigger('submit')
    await flushPromises()
    expect(servicio.enviarComoEquipo).toHaveBeenCalledWith('b', 'Ya lo vemos', { interno: false })
    expect(w.text()).toContain('Ya lo vemos')

    await w.findAll('.hilo__modo button').find((b) => b.text() === 'Nota interna').trigger('click')
    await w.get('textarea.hilo__campo').setValue('Revisar con contabilidad')
    await w.get('form.hilo__responder').trigger('submit')
    await flushPromises()
    expect(servicio.enviarComoEquipo).toHaveBeenLastCalledWith('b', 'Revisar con contabilidad', { interno: true })
    w.unmount()
  })

  it('me asigna la consulta', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('.fila')[0].trigger('click')
    await flushPromises()
    await w.findAll('button').find((b) => b.text().includes('Asignármela')).trigger('click')
    await flushPromises()
    expect(servicio.asignar).toHaveBeenCalledWith('b', 'admin-1')
    expect(w.text()).toContain('Asignada a mí')
    w.unmount()
  })

  it('las respuestas guardadas viven en el navegador: se guardan y se leen', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('.fila')[0].trigger('click')
    await flushPromises()
    w.findComponent({ name: 'HiloEquipo' }).vm.$emit('guardar-respuesta', 'Gracias por escribirnos')
    await flushPromises()
    const guardadas = JSON.parse(localStorage.getItem('ad_soporte_respuestas'))
    expect(guardadas.at(-1).texto).toBe('Gracias por escribirnos')
    w.unmount()
  })

  it('con un error de carga ofrece Reintentar, y sin consultas enseña el vacío', async () => {
    servicio.listarBandeja.mockResolvedValue({ data: [], error: 'No pudimos cargar la bandeja de soporte.' })
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('No pudimos cargar la bandeja de soporte.')
    expect(w.text()).toContain('Reintentar')
    expect(w.text()).toContain('Todavía no hay consultas')
    w.unmount()
  })

  it('se suscribe al tiempo real y se desuscribe al salir', async () => {
    const cancelar = vi.fn()
    servicio.suscribirBandeja.mockReturnValue(cancelar)
    const w = montar()
    await flushPromises()
    expect(servicio.suscribirBandeja).toHaveBeenCalledTimes(1)
    w.unmount()
    expect(cancelar).toHaveBeenCalled()
  })
})
