import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { CLAVE_BLOQUEADA } from '@/composables/useInactividad'

// happy-dom no trae visualViewport (lo usa Vuetify para ubicar overlays)
globalThis.visualViewport = globalThis.visualViewport || {
  width: 1024, height: 768, offsetLeft: 0, offsetTop: 0, scale: 1,
  addEventListener() {}, removeEventListener() {},
}

const signIn = vi.fn()
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { signInWithPassword: (...a) => signIn(...a) } },
}))

import BloqueoInactividad from '@/components/layout/BloqueoInactividad.vue'

const CORREO = 'ana@correo.com'

async function montarBloqueado() {
  localStorage.setItem(CLAVE_BLOQUEADA, CORREO)
  const w = mount(BloqueoInactividad, {
    props: { nombre: 'Ana Pérez', correo: CORREO },
    global: { plugins: [createVuetify({ components, directives })] },
    attachTo: document.body,
  })
  await flushPromises()
  return w
}

const q = (id) => document.body.querySelector(`[data-testid="${id}"]`)

async function escribirYEnviar(clave) {
  const input = q('inactividad-clave').querySelector('input')
  input.value = clave
  input.dispatchEvent(new Event('input'))
  await flushPromises()
  q('inactividad-continuar').click()
  await flushPromises()
}

describe('BloqueoInactividad', () => {
  let w
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    signIn.mockReset()
  })
  afterEach(() => {
    w?.unmount()
    document.body.innerHTML = ''
  })

  it('bloqueado muestra nombre, correo, Continuar y Cerrar sesión', async () => {
    w = await montarBloqueado()
    expect(q('inactividad-bloqueo')).toBeTruthy()
    expect(q('inactividad-nombre').textContent).toContain('Ana Pérez')
    expect(q('inactividad-correo').textContent).toContain(CORREO)
    expect(q('inactividad-continuar')).toBeTruthy()
    expect(q('inactividad-cerrar-sesion').textContent).toContain('Cerrar sesión')
  })

  it('contraseña correcta: verifica con el mismo correo y desbloquea sin recargar', async () => {
    signIn.mockResolvedValue({ data: { user: { email: CORREO } }, error: null })
    w = await montarBloqueado()
    await escribirYEnviar('secreta')
    expect(signIn).toHaveBeenCalledWith({ email: CORREO, password: 'secreta' })
    expect(localStorage.getItem(CLAVE_BLOQUEADA)).toBeNull()
    expect(w.emitted('cerrar-sesion')).toBeUndefined()
  })

  it('contraseña incorrecta: error amable con intentos restantes y sigue bloqueado', async () => {
    signIn.mockResolvedValue({ data: {}, error: { status: 400, message: 'Invalid login credentials' } })
    w = await montarBloqueado()
    await escribirYEnviar('mala')
    expect(document.body.textContent).toContain('Esa contraseña no es la correcta. Te quedan 4 intentos.')
    expect(localStorage.getItem(CLAVE_BLOQUEADA)).toBeTruthy()
    expect(w.emitted('cerrar-sesion')).toBeUndefined()
  })

  it('si la sesión devuelta es de otro correo, no desbloquea', async () => {
    signIn.mockResolvedValue({ data: { user: { email: 'otro@correo.com' } }, error: null })
    w = await montarBloqueado()
    await escribirYEnviar('x')
    expect(localStorage.getItem(CLAVE_BLOQUEADA)).toBeTruthy()
  })

  it('5 intentos fallidos cierran la sesión', async () => {
    signIn.mockResolvedValue({ data: {}, error: { status: 400, message: 'Invalid login credentials' } })
    w = await montarBloqueado()
    for (let i = 0; i < 5; i++) await escribirYEnviar('mala' + i)
    expect(signIn).toHaveBeenCalledTimes(5)
    expect(w.emitted('cerrar-sesion')).toHaveLength(1)
    expect(localStorage.getItem(CLAVE_BLOQUEADA)).toBeNull()
  })

  it('error de red no cuenta como intento', async () => {
    signIn.mockResolvedValue({ data: {}, error: { status: 0, message: 'Failed to fetch' } })
    w = await montarBloqueado()
    await escribirYEnviar('x')
    expect(document.body.textContent).toContain('No pudimos comprobarla')
    expect(document.body.textContent).not.toContain('Te quedan')
  })

  it('"No soy yo · Cerrar sesión" emite el cierre y limpia el bloqueo', async () => {
    w = await montarBloqueado()
    q('inactividad-cerrar-sesion').click()
    await flushPromises()
    expect(w.emitted('cerrar-sesion')).toHaveLength(1)
    expect(localStorage.getItem(CLAVE_BLOQUEADA)).toBeNull()
  })

  it('sin contraseña escrita pide escribirla y no llama a Supabase', async () => {
    w = await montarBloqueado()
    q('inactividad-continuar').click()
    await flushPromises()
    expect(signIn).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('Escribe tu contraseña.')
  })
})
