import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const obtenerUsoIa = vi.fn()
vi.mock('@/services/usoIaService', async () => {
  const ev = await import('@/utils/eventosIa')
  return { obtenerUsoIa: (...a) => obtenerUsoIa(...a), EVENTO_IA_USADA: ev.EVENTO_IA_USADA }
})
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import TuAsistente from '../TuAsistente.vue'
import { avisarIaUsada } from '@/utils/eventosIa'

const stubs = {
  'v-btn': { template: '<button v-bind="$attrs"><slot /></button>' },
  'v-icon': { template: '<i />' },
  'v-progress-linear': { props: ['modelValue'], template: '<div class="barra" :data-valor="modelValue" />' },
  'v-progress-circular': { props: ['modelValue'], template: '<div class="circulo" :data-valor="modelValue"><slot /></div>' },
  'v-tooltip': { template: '<div><slot name="activator" :props="{}" /></div>' },
  DialogoAdaptable: { props: ['modelValue'], template: '<div v-if="modelValue" class="dialogo"><slot /></div>' },
}

const USO = (p, extra = {}) => ({
  usados: p, limite: 100, porcentaje: p, renueva: '2026-11-01',
  por_accion: { ocr: 12, mejorar: 3, chat: 18 }, ...extra,
})
const montados = []
const montar = (props = {}) => {
  const w = mount(TuAsistente, { props, global: { stubs } })
  montados.push(w)
  return w
}

describe('TuAsistente', () => {
  afterEach(() => { montados.splice(0).forEach((w) => { try { w.unmount() } catch { /* ya desmontado */ } }) })
  beforeEach(() => { obtenerUsoIa.mockReset(); push.mockReset() })

  it('no pinta nada si la RPC devuelve null (nunca un error)', async () => {
    obtenerUsoIa.mockResolvedValue(null)
    const w = montar()
    await flushPromises()
    expect(w.find('[data-testid="tu-asistente"]').exists()).toBe(false)
    expect(w.text()).toBe('')
  })

  it('compacta: etiqueta, frase y sin créditos ni tokens', async () => {
    obtenerUsoIa.mockResolvedValue(USO(34))
    const w = montar({ variante: 'compacta' })
    await flushPromises()
    expect(w.text()).toContain('Tu asistente')
    expect(w.text()).toContain('Te queda bastante')
    expect(w.text().toLowerCase()).not.toMatch(/cr[eé]dito|token/)
    expect(w.find('.circulo').exists()).toBe(true)
  })

  it('compacta: al tocarla abre el detalle completo', async () => {
    obtenerUsoIa.mockResolvedValue(USO(34))
    const w = montar({ variante: 'compacta' })
    await flushPromises()
    expect(w.find('.dialogo').exists()).toBe(false)
    await w.find('[data-testid="tu-asistente-compacta"]').trigger('click')
    await flushPromises()
    expect(w.find('.dialogo').exists()).toBe(true)
    expect(w.text()).toContain('Leíste 12 facturas con foto')
    expect(w.text()).toContain('Se renueva el 1 de noviembre')
  })

  it('completa: acciones del mes y sin botón de plan bajo el 80 %', async () => {
    obtenerUsoIa.mockResolvedValue(USO(60))
    const w = montar({ variante: 'completa' })
    await flushPromises()
    expect(w.text()).toContain('Vas a mitad de mes de uso')
    expect(w.text()).toContain('Mejoraste 3 fotos')
    expect(w.text()).toContain('Hiciste 18 preguntas al asistente')
    expect(w.find('[data-testid="tu-asistente-mejorar"]').exists()).toBe(false)
  })

  it('completa: desde el 80 % ofrece "Mejorar mi plan" y navega', async () => {
    obtenerUsoIa.mockResolvedValue(USO(85))
    const w = montar({ variante: 'completa' })
    await flushPromises()
    const b = w.find('[data-testid="tu-asistente-mejorar"]')
    expect(b.text()).toBe('Mejorar mi plan')
    await b.trigger('click')
    expect(push).toHaveBeenCalledWith('/cliente/planes')
  })

  it('al 100 % la frase es la fecha de renovación', async () => {
    obtenerUsoIa.mockResolvedValue(USO(100))
    const w = montar({ variante: 'completa' })
    await flushPromises()
    expect(w.find('[data-testid="tu-asistente-frase"]').text()).toBe('Se renueva el 1 de noviembre')
  })

  it('el staff pasa clientId a la consulta', async () => {
    obtenerUsoIa.mockResolvedValue(USO(10))
    montar({ variante: 'completa', clientId: 'c-1' })
    await flushPromises()
    expect(obtenerUsoIa).toHaveBeenCalledWith({ clientId: 'c-1' })
  })

  it('se refresca con el evento ad-ia-usada', async () => {
    obtenerUsoIa.mockResolvedValue(USO(10))
    const w = montar({ variante: 'completa' })
    await flushPromises()
    obtenerUsoIa.mockResolvedValue(USO(40))
    avisarIaUsada()
    await flushPromises()
    expect(obtenerUsoIa).toHaveBeenCalledTimes(2)
    expect(w.find('.barra').attributes('data-valor')).toBe('40')
    w.unmount()
    avisarIaUsada()
    await flushPromises()
    expect(obtenerUsoIa).toHaveBeenCalledTimes(2)
  })
})
