import { describe, it, expect } from 'vitest'
import { agregarUsoIa, ultimosDias, formatoCostoUsd, MAX_FILAS_IA } from '../usoIa'

const hoy = new Date(2026, 9, 15, 12, 0, 0) // 15/10/2026 hora local
const f = (extra) => ({ user_id: 'u1', model: 'gemini-2.5-flash', status: 'success', tokens_prompt: 100, tokens_completion: 50, costo_estimado: 0.001, created_at: '2026-10-15T15:00:00Z', ...extra })

describe('ultimosDias', () => {
  it('incluye hoy y va en orden ascendente', () => {
    expect(ultimosDias(3, hoy)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15'])
  })
})

describe('agregarUsoIa', () => {
  const filas = [
    f({}),
    f({ user_id: 'u2', created_at: '2026-10-14T15:00:00Z', costo_estimado: 0.002 }),
    f({ status: 'error', error_code: 'RATE_LIMIT', error_message: 'viejo', created_at: '2026-10-13T15:00:00Z', tokens_prompt: null, tokens_completion: null, costo_estimado: null }),
    f({ status: 'error', error_code: 'RATE_LIMIT', error_message: 'nuevo', created_at: '2026-10-15T16:00:00Z', model: 'gemini-pro' }),
    f({ status: null, error_code: null, created_at: '2026-10-15T16:30:00Z' }),
    f({ created_at: '2026-09-01T15:00:00Z' }), // fuera del período
  ]
  const r = agregarUsoIa(filas, { dias: 7, hoy })

  it('suma llamadas, errores, tokens y costo del período', () => {
    expect(r.llamadas).toBe(5)
    expect(r.errores).toBe(3)
    expect(r.porcentajeErrores).toBe(60)
    expect(r.tokens).toBe(150 * 4)
    expect(r.costo).toBeCloseTo(0.001 + 0.002 + 0.001 + 0.001, 6)
  })
  it('solo cuenta usuarios distintos, nunca los expone', () => {
    expect(r.usuarios).toBe(2)
    expect(JSON.stringify(r)).not.toContain('u1')
  })
  it('llena todos los días del período, también los vacíos', () => {
    expect(r.porDia).toHaveLength(7)
    expect(r.porDia.at(-1)).toEqual({ fecha: '2026-10-15', llamadas: 3, errores: 2 })
    expect(r.porDia[0].llamadas).toBe(0)
  })
  it('agrupa por modelo y ordena por llamadas', () => {
    expect(r.porModelo[0]).toMatchObject({ modelo: 'gemini-2.5-flash', llamadas: 4 })
    expect(r.porModelo[1]).toMatchObject({ modelo: 'gemini-pro', llamadas: 1, errores: 1 })
  })
  it('top de errores con el último mensaje', () => {
    expect(r.topErrores[0]).toMatchObject({ codigo: 'RATE_LIMIT', cantidad: 2, ultimoMensaje: 'nuevo' })
    expect(r.topErrores[1].codigo).toBe('SIN_CODIGO')
  })
  it('sin datos no divide entre cero', () => {
    const v = agregarUsoIa([], { dias: 7, hoy })
    expect(v).toMatchObject({ llamadas: 0, porcentajeErrores: 0, costo: 0 })
  })
  it('avisa cuando se llegó al límite de filas', () => {
    expect(agregarUsoIa(Array.from({ length: MAX_FILAS_IA }, () => f({})), { dias: 7, hoy }).truncado).toBe(true)
    expect(r.truncado).toBe(false)
  })
})

describe('formatoCostoUsd', () => {
  it('usa 4 decimales para costos chicos', () => {
    expect(formatoCostoUsd(0.0042)).toBe('$0,0042')
    expect(formatoCostoUsd(12.345)).toBe('$12,35')
  })
})
