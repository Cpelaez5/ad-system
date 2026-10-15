/**
 * Inicio del super admin: servicio simulado, sin BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

if (!globalThis.visualViewport) {
  globalThis.visualViewport = { width: 1024, height: 768, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener() {}, removeEventListener() {} }
}

const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
const servicio = vi.hoisted(() => ({ cargarInicio: vi.fn() }))
vi.mock('@/services/inicioSuperAdminService', () => servicio)

import InicioSuperAdmin from '../InicioSuperAdmin.vue'

const stubs = { GraficoBarras: { props: ['labels', 'series', 'formato'], template: '<div class="grafico" :data-formato="formato" :data-nombre="series[0].nombre" />' } }
const montar = () => mount(InicioSuperAdmin, { global: { plugins: [createVuetify({ components, directives })], stubs } })

const hace = (dias) => new Date(Date.now() - dias * 86_400_000).toISOString()
const manana = (dias) => new Date(Date.now() + dias * 86_400_000).toISOString()
const base = {
  usuarios: [
    { plan_id: 'pro', trial_end: null, created_at: hace(100) },
    { plan_id: 'free_trial', trial_end: manana(3), created_at: hace(2) },
    { plan_id: 'free_trial', trial_end: manana(30), created_at: hace(10) },
    { plan_id: 'free_trial', trial_end: hace(4), created_at: hace(60) },
  ],
  facturasPagadas: [{ amount: 15, currency: 'USD', paid_at: new Date().toISOString() }],
  pagosPendientes: 0, porVerificar: 0, erroresIa: 0, diasSinTasa: 0,
}

beforeEach(() => {
  vi.clearAllMocks()
  servicio.cargarInicio.mockResolvedValue({ data: base, error: null })
})

describe('InicioSuperAdmin', () => {
  it('muestra la frase del negocio y las cifras', async () => {
    const w = montar()
    await flushPromises()
    expect(w.get('[data-testid="frase"]').text()).toMatch(/AD System tiene 1 empresa activa y 2 en prueba; ingresos del mes .*15/)
    expect(w.get('[data-testid="cifra-activas"]').text()).toContain('1')
    expect(w.get('[data-testid="cifra-vencidas"]').text()).toContain('1')
    expect(w.get('[data-testid="cifra-pagos"]').text()).toContain('0')
    expect(w.get('[data-testid="cifra-nuevos"]').text()).toContain('2')
  })

  it('el siguiente paso es la prueba por vencer cuando no hay pagos pendientes', async () => {
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('1 prueba vence esta semana')
  })

  it('los pagos por aprobar van primero y el botón lleva a Facturación', async () => {
    servicio.cargarInicio.mockResolvedValue({ data: { ...base, pagosPendientes: 2, erroresIa: 9 }, error: null })
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('2 pagos por aprobar')
    const boton = w.findAll('button').find((b) => b.text().includes('Revisar pagos'))
    await boton.trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'FacturacionSistema', query: { tab: 'reports' } })
  })

  it('con todo en orden muestra el mensaje de logro', async () => {
    servicio.cargarInicio.mockResolvedValue({ data: { ...base, usuarios: [] }, error: null })
    const w = montar()
    await flushPromises()
    expect(w.text()).toContain('Todo en orden')
  })

  it('ofrece reintentar cuando el servicio avisa de un error', async () => {
    servicio.cargarInicio.mockResolvedValueOnce({ data: base, error: 'No pudimos cargar las tasas.' })
    const w = montar()
    await flushPromises()
    expect(w.get('[data-testid="error"]').text()).toContain('No pudimos cargar las tasas.')
    servicio.cargarInicio.mockResolvedValue({ data: base, error: null })
    await w.get('[data-testid="error"] button').trigger('click')
    await flushPromises()
    expect(servicio.cargarInicio).toHaveBeenCalledTimes(2)
    expect(w.find('[data-testid="error"]').exists()).toBe(false)
  })

  it('el gráfico alterna entre ingresos (moneda) y empresas nuevas (entero)', async () => {
    const w = montar()
    await flushPromises()
    expect(w.get('[data-formato]').attributes('data-formato')).toBe('moneda')
    const chip = w.findAll('.v-chip').find((c) => c.text().includes('Empresas nuevas'))
    await chip.trigger('click')
    expect(w.get('[data-formato]').attributes('data-formato')).toBe('entero')
  })

  it('los accesos llevan a Operación, Facturación, Usuarios y Configuración IA', async () => {
    const w = montar()
    await flushPromises()
    for (const [clave, name] of [['operacion', 'AdminOperacion'], ['facturacion', 'FacturacionSistema'], ['usuarios', 'Usuarios'], ['ia', 'AiSettings']]) {
      await w.get(`[data-testid="acceso-${clave}"]`).trigger('click')
      expect(push).toHaveBeenLastCalledWith({ name })
    }
  })
})
