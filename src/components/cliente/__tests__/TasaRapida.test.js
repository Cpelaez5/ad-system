import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const guardarPreferencia = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/services/tasaService.js', () => ({
  preferencia: vi.fn().mockResolvedValue({ modo: 'manual', tasas: { EUR: { tasa: 950, fecha: '2026-10-10' } }, avisoAceptadoEn: null }),
  tasasVigentes: vi.fn().mockResolvedValue({ modo: 'manual', tasas: {}, fecha: null }),
  monedasUsadas: vi.fn().mockResolvedValue(['CNY']),
  guardarPreferencia: (...a) => guardarPreferencia(...a),
}))
vi.mock('@/services/bcvService.js', () => ({ default: { getCurrentRate: vi.fn().mockResolvedValue({ success: false }) } }))

const TasaRapida = (await import('@/components/cliente/TasaRapida.vue')).default
const montar = (props) => mount(TasaRapida, { props, global: { plugins: [createVuetify({ components, directives })] } })

describe('TasaRapida', () => {
  it('al tocar el chip del dólar solo muestra el campo del dólar', async () => {
    const w = montar({ moneda: 'USD' })
    await flushPromises()
    expect(w.find('[data-testid="tasa-rapida-USD"]').exists()).toBe(true)
    expect(w.find('[data-testid="tasa-rapida-EUR"]').exists()).toBe(false)
    expect(w.text()).toContain('Agregar otra moneda')
  })

  it('guarda el dólar formateado y conserva las otras tasas ya guardadas', async () => {
    const w = montar({ moneda: 'USD' })
    await flushPromises()
    const input = w.find('[data-testid="tasa-rapida-USD"] input')
    await input.setValue('104036,77')
    expect(input.element.value).toBe('104.036,77')
    await w.find('[data-testid="tasa-rapida-guardar"]').trigger('click')
    await flushPromises()
    const arg = guardarPreferencia.mock.calls.at(-1)[0]
    expect(arg.modo).toBe('manual')
    expect(arg.tasas.USD).toBe(104036.77)
    expect(arg.tasas.EUR).toEqual({ tasa: 950, fecha: '2026-10-10' })
  })
})
