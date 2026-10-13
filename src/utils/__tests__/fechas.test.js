import { describe, it, expect } from 'vitest'
import { hoyISO, parseFechaLocal, formatFechaCorta, formatFechaLocal } from '../fechas'

describe('fechas en hora local', () => {
  it('parseFechaLocal no corre la fecha un día (fecha sin hora = medianoche local)', () => {
    const f = parseFechaLocal('2026-07-01')
    expect(f.getFullYear()).toBe(2026)
    expect(f.getMonth()).toBe(6)
    expect(f.getDate()).toBe(1)
  })

  it('acepta ISO de medianoche UTC como fecha pura', () => {
    expect(formatFechaCorta('2026-10-13T00:00:00Z')).toBe('13/10/2026')
    expect(formatFechaCorta('2026-10-13T00:00:00.000+00:00')).toBe('13/10/2026')
  })

  it('formatFechaCorta da DD/MM/AAAA y vacío si no hay fecha', () => {
    expect(formatFechaCorta('2026-07-01')).toBe('01/07/2026')
    expect(formatFechaCorta(null)).toBe('')
    expect(formatFechaCorta('no-es-fecha')).toBe('')
  })

  it('hoyISO usa la fecha local, no la UTC', () => {
    // 13/10/2026 a las 21:30 local
    expect(hoyISO(new Date(2026, 9, 13, 21, 30))).toBe('2026-10-13')
    expect(hoyISO(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('formatFechaLocal respeta el día local', () => {
    expect(formatFechaLocal('2026-07-01', { day: 'numeric' })).toBe('1')
  })

  it('acepta objetos Date', () => {
    expect(formatFechaCorta(new Date(2026, 1, 3))).toBe('03/02/2026')
  })
})
