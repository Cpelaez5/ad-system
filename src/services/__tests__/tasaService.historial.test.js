import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }))
vi.mock('@/services/bcvService.js', () => ({ default: { getCurrentRate: vi.fn() } }))

const { agruparPorDia, necesitaRecordatorio } = await import('@/services/tasaService.js')

describe('tasaService — historial y recordatorio', () => {
  it('agrupa el historial por día, del más reciente al más viejo', () => {
    const r = agruparPorDia([
      { moneda: 'USD', tasa: '870', fecha: '2026-10-13' },
      { moneda: 'USD', tasa: '879.12', fecha: '2026-10-14' },
      { moneda: 'EUR', tasa: '977.68', fecha: '2026-10-14' },
    ])
    expect(r).toEqual([
      { fecha: '2026-10-14', tasas: { USD: 879.12, EUR: 977.68 } },
      { fecha: '2026-10-13', tasas: { USD: 870 } },
    ])
  })

  it('recuerda de lunes a viernes si la tasa manual no es de hoy', () => {
    const miercoles = new Date(2026, 9, 14, 10)
    expect(necesitaRecordatorio({ modo: 'manual', fecha: '2026-10-13' }, miercoles)).toBe(true)
    expect(necesitaRecordatorio({ modo: 'manual', fecha: '2026-10-14' }, miercoles)).toBe(false)
    expect(necesitaRecordatorio({ modo: 'manual', fecha: null }, miercoles)).toBe(true)
  })

  it('no recuerda los fines de semana ni en modo automático', () => {
    const sabado = new Date(2026, 9, 17, 10)
    const domingo = new Date(2026, 9, 18, 10)
    expect(necesitaRecordatorio({ modo: 'manual', fecha: '2026-10-10' }, sabado)).toBe(false)
    expect(necesitaRecordatorio({ modo: 'manual', fecha: '2026-10-10' }, domingo)).toBe(false)
    expect(necesitaRecordatorio({ modo: 'automatica', fecha: '2026-10-01' }, new Date(2026, 9, 14))).toBe(false)
  })
})
