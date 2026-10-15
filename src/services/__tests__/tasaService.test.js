import { describe, it, expect, vi, beforeEach } from 'vitest'

const filaClientes = { data: null, error: null }
const filaInvoices = { data: [], error: null }
const update = vi.fn()
const eq = vi.fn()
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve(filaClientes)),
          is: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(filaInvoices)) }))
        }))
      })),
      update: (...a) => { update(...a); return { eq: (...b) => { eq(...b); return Promise.resolve({ error: filaClientes.updateError || null }) } } }
    }))
  }
}))
vi.mock('@/utils/tenantHelpers', () => ({ getCurrentClientId: vi.fn(() => 'cli-1') }))
const getCurrentRate = vi.fn()
vi.mock('@/services/bcvService.js', () => ({ default: { getCurrentRate: (...a) => getCurrentRate(...a) } }))

import { getCurrentClientId } from '@/utils/tenantHelpers'
import { preferencia, guardarPreferencia, tasasVigentes, monedasUsadas, diasDeAntiguedad, _reiniciar } from '@/services/tasaService.js'

const AHORA = new Date(2026, 9, 14)
const bcvOk = (extra = {}) => ({
  success: true,
  data: { dollar: 40, euro: 45, yuan: 5.5, lira: 1.2, rublo: 0.5, date: '2026-10-14', source: 'PROXY-API', ...extra }
})

beforeEach(() => {
  filaClientes.data = null
  filaClientes.error = null
  delete filaClientes.updateError
  update.mockClear(); eq.mockClear(); getCurrentRate.mockReset()
  getCurrentClientId.mockReturnValue('cli-1')
  _reiniciar()
})

describe('diasDeAntiguedad', () => {
  it('cuenta días enteros', () => {
    expect(diasDeAntiguedad('2026-10-14', AHORA)).toBe(0)
    expect(diasDeAntiguedad('2026-10-12', AHORA)).toBe(2)
    expect(diasDeAntiguedad('x', AHORA)).toBe(0)
  })
})

describe('preferencia', () => {
  it('por defecto es automática', async () => {
    filaClientes.data = { tasa_modo: 'automatica', tasas_manuales: {}, tasa_aviso_aceptado_en: null }
    expect(await preferencia()).toEqual({ modo: 'automatica', tasas: {}, avisoAceptadoEn: null })
  })
  it('lee el modo manual y limpia las tasas', async () => {
    filaClientes.data = {
      tasa_modo: 'manual',
      tasas_manuales: { USD: { tasa: 877.9, fecha: '2026-10-14' }, EUR: { tasa: 0 }, XXX: { tasa: 3 } },
      tasa_aviso_aceptado_en: '2026-10-01T00:00:00Z'
    }
    const p = await preferencia()
    expect(p.modo).toBe('manual')
    expect(p.tasas).toEqual({ USD: { tasa: 877.9, fecha: '2026-10-14' } })
    expect(p.avisoAceptadoEn).toBe('2026-10-01T00:00:00Z')
  })
  it('sin cliente, con error o sin fila: automática (nunca lanza)', async () => {
    getCurrentClientId.mockReturnValue(null)
    expect((await preferencia()).modo).toBe('automatica')
    getCurrentClientId.mockReturnValue('cli-1')
    filaClientes.error = { message: 'x' }
    expect((await preferencia()).modo).toBe('automatica')
    filaClientes.error = null
    filaClientes.data = null
    expect((await preferencia()).modo).toBe('automatica')
  })
})

describe('monedasUsadas', () => {
  it('devuelve las monedas extranjeras usadas, en orden y sin repetir', async () => {
    filaInvoices.data = [{ moneda: 'VES' }, { moneda: 'CNY' }, { moneda: 'USD' }, { moneda: 'CNY' }, { moneda: null }, { moneda: 'XXX' }]
    filaInvoices.error = null
    expect(await monedasUsadas()).toEqual(['USD', 'CNY'])
  })
  it('ante un error o sin negocio devuelve []', async () => {
    filaInvoices.error = { message: 'x' }
    expect(await monedasUsadas()).toEqual([])
    filaInvoices.error = null
    getCurrentClientId.mockReturnValue(null)
    expect(await monedasUsadas()).toEqual([])
  })
})

describe('guardarPreferencia', () => {
  it('guarda modo manual con tasas y fecha de hoy por defecto', async () => {
    const r = await guardarPreferencia({ modo: 'manual', tasas: { USD: 877.9, EUR: { tasa: 950, fecha: '2026-10-10' } } })
    expect(r).toEqual({ ok: true })
    const cambios = update.mock.calls[0][0]
    expect(cambios.tasa_modo).toBe('manual')
    expect(cambios.tasas_manuales.USD.tasa).toBe(877.9)
    expect(cambios.tasas_manuales.USD.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(cambios.tasas_manuales.EUR).toEqual({ tasa: 950, fecha: '2026-10-10' })
    expect(cambios.tasa_aviso_aceptado_en).toBeUndefined()
    expect(eq).toHaveBeenCalledWith('id', 'cli-1')
  })
  it('guarda la aceptación del aviso al elegir automática', async () => {
    await guardarPreferencia({ modo: 'automatica', avisoAceptado: true })
    expect(update.mock.calls[0][0].tasa_aviso_aceptado_en).toBeTruthy()
  })
  it('rechaza modo inválido, manual sin tasas y tasas no numéricas', async () => {
    expect((await guardarPreferencia({ modo: 'otro' })).ok).toBe(false)
    expect((await guardarPreferencia({ modo: 'manual', tasas: {} })).ok).toBe(false)
    expect((await guardarPreferencia({ modo: 'manual', tasas: { USD: -1 } })).ok).toBe(false)
    expect((await guardarPreferencia({ modo: 'manual', tasas: { USD: 'abc' } })).ok).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
  it('reporta el error de la BD y la falta de negocio', async () => {
    filaClientes.updateError = { message: 'rls' }
    expect((await guardarPreferencia({ modo: 'automatica' })).ok).toBe(false)
    getCurrentClientId.mockReturnValue(null)
    expect((await guardarPreferencia({ modo: 'automatica' })).ok).toBe(false)
  })
})

describe('tasasVigentes', () => {
  it('automática: usa el servicio', async () => {
    getCurrentRate.mockResolvedValue(bcvOk())
    const v = await tasasVigentes({ ahora: AHORA })
    expect(v).toMatchObject({ modo: 'automatica', fecha: '2026-10-14', desactualizada: false, fallo: false })
    expect(v.tasas).toEqual({ USD: 40, EUR: 45, CNY: 5.5, TRY: 1.2, RUB: 0.5 })
  })
  it('automática con más de un día: desactualizada', async () => {
    getCurrentRate.mockResolvedValue(bcvOk({ date: '2026-10-10' }))
    expect((await tasasVigentes({ ahora: AHORA })).desactualizada).toBe(true)
  })
  it('automática con respaldo de BD: fallo', async () => {
    getCurrentRate.mockResolvedValue(bcvOk({ source: 'DB-Fallback' }))
    expect((await tasasVigentes({ ahora: AHORA })).fallo).toBe(true)
  })
  it('automática sin respuesta: usa la última conocida y marca fallo', async () => {
    getCurrentRate.mockResolvedValueOnce(bcvOk())
    await tasasVigentes({ ahora: AHORA })
    getCurrentRate.mockResolvedValueOnce({ success: false, error: 'x' })
    const v = await tasasVigentes({ ahora: AHORA })
    expect(v.fallo).toBe(true)
    expect(v.tasas.USD).toBe(40)
    getCurrentRate.mockRejectedValueOnce(new Error('red'))
    expect((await tasasVigentes({ ahora: AHORA })).tasas.USD).toBe(40)
  })
  it('automática sin respuesta y sin nada conocido: tasas vacías y fallo', async () => {
    getCurrentRate.mockResolvedValue({ success: false })
    const v = await tasasVigentes({ ahora: AHORA })
    expect(v).toMatchObject({ tasas: {}, fallo: true, desactualizada: true })
  })
  it('manual: usa las del cliente y NUNCA llama al servicio', async () => {
    filaClientes.data = {
      tasa_modo: 'manual',
      tasas_manuales: { USD: { tasa: 877.9, fecha: '2026-10-14' }, EUR: { tasa: 950, fecha: '2026-10-13' } }
    }
    const v = await tasasVigentes({ ahora: AHORA })
    expect(getCurrentRate).not.toHaveBeenCalled()
    expect(v).toMatchObject({ modo: 'manual', fuente: 'MANUAL', fallo: false, desactualizada: false, fecha: '2026-10-13' })
    expect(v.tasas).toEqual({ USD: 877.9, EUR: 950 })
  })
  it('manual con una tasa de más de un día: desactualizada', async () => {
    filaClientes.data = { tasa_modo: 'manual', tasas_manuales: { USD: { tasa: 800, fecha: '2026-10-10' } } }
    expect((await tasasVigentes({ ahora: AHORA })).desactualizada).toBe(true)
  })
  it('manual: no completa monedas faltantes con el servicio', async () => {
    filaClientes.data = { tasa_modo: 'manual', tasas_manuales: { USD: { tasa: 800, fecha: '2026-10-14' } } }
    const v = await tasasVigentes({ ahora: AHORA })
    expect(v.tasas.CNY).toBeUndefined()
    expect(getCurrentRate).not.toHaveBeenCalled()
  })
  it('staff sin contexto de cliente: automática', async () => {
    getCurrentClientId.mockReturnValue(null)
    getCurrentRate.mockResolvedValue(bcvOk())
    expect((await tasasVigentes({ ahora: AHORA })).modo).toBe('automatica')
  })
  it('staff con clientId: usa la preferencia de ese cliente', async () => {
    getCurrentClientId.mockReturnValue(null)
    filaClientes.data = { tasa_modo: 'manual', tasas_manuales: { USD: { tasa: 900, fecha: '2026-10-14' } } }
    const v = await tasasVigentes({ clientId: 'otro', ahora: AHORA })
    expect(v.modo).toBe('manual')
    expect(v.tasas.USD).toBe(900)
  })
})
