import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const preferencia = vi.fn()
const guardarPreferencia = vi.fn()
const tasasVigentes = vi.fn()
const monedasUsadas = vi.fn()
const historialTasas = vi.fn().mockResolvedValue([])
vi.mock('@/services/tasaService.js', () => ({
  preferencia: (...a) => preferencia(...a),
  guardarPreferencia: (...a) => guardarPreferencia(...a),
  tasasVigentes: (...a) => tasasVigentes(...a),
  monedasUsadas: (...a) => monedasUsadas(...a),
  diasDeAntiguedad: (f) => (f === '2026-10-01' ? 13 : 0),
  historialTasas: (...a) => historialTasas(...a),
}))

import TasaDeCambio from '../TasaDeCambio.vue'

const vuetify = createVuetify({ components, directives })

async function montar() {
  const w = mount(TasaDeCambio, { global: { plugins: [vuetify] }, attachTo: document.body })
  await flushPromises()
  return w
}
const t = (w, id) => w.find(`[data-testid="${id}"]`)

beforeEach(() => {
  preferencia.mockReset(); guardarPreferencia.mockReset(); tasasVigentes.mockReset(); monedasUsadas.mockReset()
  preferencia.mockResolvedValue({ modo: 'automatica', tasas: {}, avisoAceptadoEn: null })
  tasasVigentes.mockResolvedValue({ tasas: { USD: 40, EUR: 45 }, modo: 'automatica' })
  monedasUsadas.mockResolvedValue([])
  guardarPreferencia.mockResolvedValue({ ok: true })
  document.body.innerHTML = ''
})

describe('TasaDeCambio', () => {
  it('muestra la sección con las dos opciones grandes y el aviso del servicio de terceros', async () => {
    const w = await montar()
    expect(w.text()).toContain('Tasa de cambio')
    expect(w.text()).toContain('Automática (BCV)')
    expect(w.text()).toContain('La buscamos por ti cada día')
    expect(w.text()).toContain('La defino yo')
    expect(w.text()).toContain('La cambias tú cuando quieras')
    expect(t(w, 'tasa-aviso').text()).toBe(
      'Las tasas automáticas vienen de un servicio externo basado en el BCV. Pueden fallar o llegar con retraso. Revísalas antes de declarar.'
    )
    expect(w.element.id).toBe('tasa')
  })

  it('en automática por primera vez pide "Entiendo" y guarda la aceptación', async () => {
    const w = await montar()
    expect(t(w, 'tasa-acciones').exists()).toBe(false)
    expect(w.text()).toContain('Hoy usamos: Dólar')
    await w.find('[data-testid="tasa-entiendo"] input').setValue(true)
    expect(t(w, 'tasa-guardar').exists()).toBe(true)
    await t(w, 'tasa-guardar').trigger('click')
    await flushPromises()
    expect(guardarPreferencia).toHaveBeenCalledWith({ modo: 'automatica', tasas: {}, avisoAceptado: true })
    expect(w.emitted('guardado')[0]).toEqual(['automatica'])
  })

  it('si ya aceptó el aviso no vuelve a pedir "Entiendo"', async () => {
    preferencia.mockResolvedValue({ modo: 'automatica', tasas: {}, avisoAceptadoEn: '2026-10-01T00:00:00Z' })
    const w = await montar()
    expect(t(w, 'tasa-entiendo').exists()).toBe(false)
  })

  it('al cambiar a manual muestra USD y EUR y "Agregar otra moneda"; Cancelar vuelve sin guardar', async () => {
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    expect(t(w, 'tasa-manual').exists()).toBe(true)
    expect(t(w, 'tasa-campo-USD').exists()).toBe(true)
    expect(t(w, 'tasa-campo-EUR').exists()).toBe(true)
    expect(t(w, 'tasa-campo-CNY').exists()).toBe(false)
    expect(t(w, 'tasa-agregar').exists()).toBe(true)
    expect(t(w, 'tasa-guardar').attributes('disabled')).toBeDefined()
    await t(w, 'tasa-cancelar').trigger('click')
    expect(t(w, 'tasa-manual').exists()).toBe(false)
    expect(t(w, 'tasa-opcion-automatica').attributes('aria-checked')).toBe('true')
    expect(guardarPreferencia).not.toHaveBeenCalled()
  })

  it('volver a la opción guardada sin guardar no deja cambios pendientes', async () => {
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    await t(w, 'tasa-opcion-automatica').trigger('click')
    expect(t(w, 'tasa-acciones').exists()).toBe(false)
  })

  it('en manual guarda las tasas escritas (coma decimal) con la fecha de hoy', async () => {
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    await w.find('[data-testid="tasa-campo-USD"] input').setValue('877,9')
    expect(w.find('[data-testid="tasa-campo-USD"]').text()).toContain('Se guardará con la fecha de hoy')
    await t(w, 'tasa-guardar').trigger('click')
    await flushPromises()
    expect(guardarPreferencia).toHaveBeenCalledWith({ modo: 'manual', tasas: { USD: { tasa: 877.9 } }, avisoAceptado: false })
  })

  it('no deja escribir letras y rechaza una tasa en cero', async () => {
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    const input = w.find('[data-testid="tasa-campo-USD"] input')
    await input.setValue('abc')
    expect(input.element.value).toBe('')
    await input.setValue('0')
    expect(w.text()).toContain('Escribe un número mayor que cero')
    expect(t(w, 'tasa-guardar').attributes('disabled')).toBeDefined()
  })

  it('en manual guardada: muestra "Actualizada el …" y conserva la fecha de la que no cambió', async () => {
    preferencia.mockResolvedValue({
      modo: 'manual',
      tasas: { USD: { tasa: 800, fecha: '2026-10-01' }, EUR: { tasa: 900, fecha: '2026-10-14' } },
      avisoAceptadoEn: '2026-10-01T00:00:00Z',
    })
    const w = await montar()
    expect(t(w, 'tasa-campo-USD').text()).toContain('Actualizada el')
    expect(t(w, 'tasa-campo-USD').text()).toContain('tiene más de un día')
    expect(t(w, 'tasa-campo-EUR').text()).toContain('Actualizada el')
    expect(t(w, 'tasa-campo-EUR').text()).not.toContain('más de un día')
    await w.find('[data-testid="tasa-campo-USD"] input').setValue('810')
    await t(w, 'tasa-guardar').trigger('click')
    await flushPromises()
    expect(guardarPreferencia).toHaveBeenCalledWith({
      modo: 'manual',
      tasas: { USD: { tasa: 810 }, EUR: { tasa: 900, fecha: '2026-10-14' } },
      avisoAceptado: false,
    })
  })

  it('muestra también las monedas que el negocio ya usó en sus facturas', async () => {
    preferencia.mockResolvedValue({ modo: 'manual', tasas: { USD: { tasa: 800, fecha: '2026-10-14' } }, avisoAceptadoEn: 'x' })
    monedasUsadas.mockResolvedValue(['CNY'])
    const w = await montar()
    expect(t(w, 'tasa-campo-CNY').exists()).toBe(true)
    expect(t(w, 'tasa-campo-TRY').exists()).toBe(false)
  })

  it('al pasar de manual a automática conserva las tasas manuales guardadas', async () => {
    const tasas = { USD: { tasa: 800, fecha: '2026-10-14' } }
    preferencia.mockResolvedValue({ modo: 'manual', tasas, avisoAceptadoEn: 'x' })
    const w = await montar()
    await t(w, 'tasa-opcion-automatica').trigger('click')
    await t(w, 'tasa-guardar').trigger('click')
    await flushPromises()
    expect(guardarPreferencia).toHaveBeenCalledWith({ modo: 'automatica', tasas, avisoAceptado: false })
  })

  it('muestra el error si no se pudo guardar y no pierde lo escrito', async () => {
    guardarPreferencia.mockResolvedValue({ ok: false, error: 'No pudimos guardar la tasa. Intenta de nuevo.' })
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    await w.find('[data-testid="tasa-campo-USD"] input').setValue('800')
    await t(w, 'tasa-guardar').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('No pudimos guardar la tasa')
    expect(w.find('[data-testid="tasa-campo-USD"] input').element.value).toBe('800')
  })

  it('formatea en bolívares mientras se escribe: 104036,77 → 104.036,77', async () => {
    const w = await montar()
    await t(w, 'tasa-opcion-manual').trigger('click')
    const input = w.find('[data-testid="tasa-campo-USD"] input')
    await input.setValue('104036,77')
    expect(input.element.value).toBe('104.036,77')
  })

  it('el historial muestra "USD Bs 879,12" sin repetir Bs, con la hora', async () => {
    historialTasas.mockResolvedValueOnce([{ fecha: '2026-10-15', en: '2026-10-15T19:42:00Z', tasas: { USD: 879.12, EUR: 104036.77 } }])
    const w = await montar()
    await flushPromises()
    await w.find('[data-testid="tasa-historial"] .v-expansion-panel-title').trigger('click')
    await flushPromises()
    const texto = w.find('[data-testid="tasa-historial"]').text()
    expect(texto).toContain('Bs 879,12')
    expect(texto).toContain('Bs 104.036,77')
    expect(texto).toContain('3:42')
    expect(texto).not.toMatch(/Bs\S*\s+Bs/)
  })
})
