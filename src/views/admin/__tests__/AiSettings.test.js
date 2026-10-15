/**
 * Pantalla Configuración de IA (super_admin). Supabase simulado: nada toca
 * la BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const db = vi.hoisted(() => ({ perfiles: [], logs: [], llamadas: [] }))

vi.mock('@/lib/supabaseClient', () => {
  const tabla = (nombre) => {
    const q = {
      _nombre: nombre,
      select: vi.fn((cols) => { db.llamadas.push({ op: 'select', nombre, cols }); return q }),
      order: vi.fn(() => q),
      limit: vi.fn(() => q),
      update: vi.fn((p) => { db.llamadas.push({ op: 'update', nombre, p }); return q }),
      insert: vi.fn((p) => { db.llamadas.push({ op: 'insert', nombre, p }); return Promise.resolve({ error: null }) }),
      delete: vi.fn(() => { db.llamadas.push({ op: 'delete', nombre }); return q }),
      eq: vi.fn(() => Promise.resolve({ error: null })),
      then(res) { res({ data: nombre === 'ai_usage_logs' ? db.logs : db.perfiles, error: null }) },
    }
    return q
  }
  return { supabase: { from: (n) => tabla(n) } }
})

const mostrar = vi.hoisted(() => vi.fn())
vi.mock('@/store/notificacionStore', () => ({ useNotificacionStore: () => ({ mostrar }) }))
const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/views/shared/OCRDemo.vue', () => ({ default: { template: '<div class="ocr-demo" />' } }))
vi.mock('@/components/chat/AiChatDemo.vue', () => ({ default: { template: '<div class="chat-demo" />' } }))

import AiSettings from '../AiSettings.vue'
import { llaveEnmascarada, deducirEstado, formularioValido, sufijoDeLlave } from '@/components/admin/ia/iaUtil'

const stubs = {
  DialogoAdaptable: {
    props: ['modelValue', 'titulo'],
    template: '<div v-if="modelValue" class="dialogo"><h2>{{ titulo }}</h2><slot /><slot name="acciones" /></div>',
  },
  VMenu: { template: '<div class="menu"><slot name="activator" :props="{}" /><slot /></div>' },
  'router-link': { props: ['to'], template: '<a :href="to" class="enlace"><slot /></a>' },
}
const montar = () => mount(AiSettings, { global: { plugins: [createVuetify({ components, directives })], stubs } })

const gemini = { id: 'p1', profile_name: 'Gemini producción', provider: 'gemini', model: 'gemini-3.7-flash', is_active: true, key_suffix: '1234' }
const deep = { id: 'p2', profile_name: 'DeepSeek respaldo', provider: 'deepseek', model: 'deepseek-chat', is_active: false, key_suffix: '9876' }
const log = (extra = {}) => ({ id: 'l1', created_at: '2026-10-14T15:00:00Z', provider: 'gemini', model: 'gemini-3.7-flash', status: 'success', costo_estimado: 0.0012, ...extra })

beforeEach(() => {
  vi.clearAllMocks()
  db.perfiles = [gemini, deep]
  db.logs = [log()]
  db.llamadas = []
})

describe('iaUtil', () => {
  it('enmascara la llave y deduce el estado', () => {
    expect(llaveEnmascarada('1234')).toBe('••••1234')
    expect(llaveEnmascarada(null)).toBe('••••')
    expect(sufijoDeLlave('sk-abcdef9876')).toBe('9876')
    expect(deducirEstado([log({ status: 'error', error_code: 'INVALID_KEY' })], gemini)).toBe('invalid_key')
    expect(deducirEstado([log({ status: 'error', error_code: 'PREVIEW_RATE_LIMIT' })], gemini)).toBe('quota_exceeded')
    expect(deducirEstado([log({ provider: 'deepseek' })], gemini)).toBe('connected')
    expect(deducirEstado([], gemini)).toBeNull()
    expect(formularioValido({ profileName: 'a', model: 'm', apiKey: '' })).toBe(false)
    expect(formularioValido({ id: 'x', profileName: 'a', model: 'm', apiKey: '' })).toBe(true)
  })
})

describe('AiSettings', () => {
  it('lista los perfiles con la llave enmascarada, nunca completa', async () => {
    const w = montar()
    await flushPromises()
    const filas = w.findAll('[data-testid="fila-perfil"]')
    expect(filas).toHaveLength(2)
    expect(filas[0].get('[data-testid="llave"]').text()).toContain('••••1234')
    expect(filas[0].text()).toContain('En uso')
    expect(filas[1].get('[data-testid="llave"]').text()).toContain('••••9876')
    // La consulta de perfiles no trae la llave cifrada.
    const consulta = db.llamadas.find((l) => l.nombre === 'ai_provider_profiles' && l.op === 'select')
    expect(consulta.cols).not.toContain('encrypted_api_key')
  })

  it('tiene el enlace a Uso de IA', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="ir-uso"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/admin/uso-ia')
  })

  it('el panel confirma que todo funciona, o avisa de llave rechazada', async () => {
    let w = montar()
    await flushPromises()
    expect(w.text()).toContain('La IA está funcionando')
    expect(w.get('[data-testid="estado-conexion"]').text()).toContain('Funcionando bien')

    db.logs = [log({ status: 'error', error_code: 'INVALID_KEY' })]
    w = montar()
    await flushPromises()
    expect(w.text()).toContain('La llave del perfil en uso fue rechazada')
    expect(w.get('[data-testid="estado-conexion"]').text()).toContain('rechazada')
  })

  it('activar un perfil apaga los demás y enciende el elegido', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="activar"]').trigger('click')
    await flushPromises()
    const updates = db.llamadas.filter((l) => l.op === 'update')
    expect(updates.map((u) => u.p)).toEqual([{ is_active: false }, { is_active: true }])
    expect(mostrar).toHaveBeenCalledWith('Ahora se usa «DeepSeek respaldo»', 'success')
  })

  it('crear un perfil exige llave, la guarda con su sufijo y no es activo si ya hay otro', async () => {
    const w = montar()
    await flushPromises()
    await w.get('[data-testid="nuevo"]').trigger('click')
    expect(w.get('.dialogo h2').text()).toBe('Nuevo perfil de IA')
    expect(w.get('[data-testid="guardar"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="campo-nombre"] input').setValue('Otro')
    await w.get('[data-testid="campo-modelo"] input').setValue('gemini-x')
    expect(w.get('[data-testid="guardar"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="campo-llave"] input').setValue('sk-secreta-5555')
    expect(w.get('[data-testid="guardar"]').attributes('disabled')).toBeUndefined()
    await w.get('#form-perfil-ia').trigger('submit')
    await flushPromises()
    const ins = db.llamadas.find((l) => l.op === 'insert')
    expect(ins.p).toMatchObject({ profile_name: 'Otro', provider: 'gemini', model: 'gemini-x', encrypted_api_key: 'sk-secreta-5555', key_suffix: '5555', is_active: false })
  })

  it('editar no precarga la llave y, sin llave nueva, no la toca', async () => {
    const w = montar()
    await flushPromises()
    await w.findAll('[data-testid="menu-editar"]')[0].trigger('click')
    expect(w.get('[data-testid="campo-llave"] input').element.value).toBe('')
    expect(w.text()).toContain('••••1234')
    await w.get('[data-testid="campo-modelo"] input').setValue('gemini-nuevo')
    await w.get('#form-perfil-ia').trigger('submit')
    await flushPromises()
    const up = db.llamadas.find((l) => l.op === 'update')
    expect(up.p).toEqual({ profile_name: 'Gemini producción', provider: 'gemini', model: 'gemini-nuevo' })
  })

  it('eliminar pide confirmación y solo existe para perfiles que no están en uso', async () => {
    const w = montar()
    await flushPromises()
    const botones = w.findAll('[data-testid="menu-eliminar"]')
    expect(botones).toHaveLength(1)
    await botones[0].trigger('click')
    expect(w.text()).toContain('DeepSeek respaldo')
    expect(db.llamadas.some((l) => l.op === 'delete')).toBe(false)
    await w.get('[data-testid="confirmar-eliminar"]').trigger('click')
    await flushPromises()
    expect(db.llamadas.some((l) => l.op === 'delete')).toBe(true)
  })

  it('muestra el uso reciente y las pruebas en su pestaña', async () => {
    const w = montar()
    await flushPromises()
    expect(w.findAll('[data-testid="fila-uso"]')).toHaveLength(1)
    expect(w.text()).toContain('$0.001200')
    const chip = w.findAll('.v-chip').find((c) => c.text().startsWith('Laboratorio'))
    await chip.trigger('click')
    await flushPromises()
    expect(w.find('.chat-demo').exists()).toBe(true)
  })

  it('sin perfiles enseña a crear el primero', async () => {
    db.perfiles = []
    db.logs = []
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('Todavía no hay perfiles')
    expect(w.text()).toContain('Crea tu primer perfil de IA')
  })
})
