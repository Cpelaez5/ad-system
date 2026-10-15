import { describe, it, expect } from 'vitest'
import {
  estadoEmpresa, contarEmpresas, ultimosMeses, seriesPorMes, usuariosNuevos30Dias,
  siguientePasoSuperAdmin, fraseResumen, claveMes,
} from '../inicioSuperAdmin.js'

const ahora = new Date(2026, 9, 15, 12) // 15-oct-2026, hora local
const enDias = (n) => new Date(ahora.getTime() + n * 86_400_000).toISOString()

describe('estadoEmpresa / contarEmpresas', () => {
  it('clasifica activa, en prueba y vencida', () => {
    expect(estadoEmpresa({ plan_id: 'pro', trial_end: null }, ahora)).toBe('activa')
    expect(estadoEmpresa({ plan_id: 'free_trial', trial_end: enDias(10) }, ahora)).toBe('prueba')
    expect(estadoEmpresa({ plan_id: 'free_trial', trial_end: null }, ahora)).toBe('prueba')
    expect(estadoEmpresa({ plan_id: 'free_trial', trial_end: enDias(-1) }, ahora)).toBe('vencida')
    expect(estadoEmpresa({ plan_id: 'pro', trial_end: enDias(-1) }, ahora)).toBe('vencida')
  })

  it('cuenta cada estado y las pruebas que vencen en 7 días', () => {
    const r = contarEmpresas([
      { plan_id: 'pro' },
      { plan_id: 'free_trial', trial_end: enDias(3) },
      { plan_id: 'free_trial', trial_end: enDias(20) },
      { plan_id: 'free_trial', trial_end: enDias(-5) },
    ], ahora)
    expect(r).toEqual({ activas: 1, prueba: 2, vencidas: 1, vencenSemana: 1 })
  })

  it('lista vacía = todo en cero', () => {
    expect(contarEmpresas([], ahora)).toEqual({ activas: 0, prueba: 0, vencidas: 0, vencenSemana: 0 })
  })
})

describe('series por mes', () => {
  it('ultimosMeses termina en el mes actual y cruza el año', () => {
    expect(ultimosMeses(6, ahora)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'])
    expect(ultimosMeses(3, new Date(2026, 0, 10))).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  it('suma ingresos en USD y cuenta altas por mes; ignora lo que está fuera de rango', () => {
    const s = seriesPorMes({
      facturasPagadas: [
        { amount: 15, currency: 'USD', paid_at: new Date(2026, 9, 2).toISOString() },
        { amount: '29.5', currency: 'USD', paid_at: new Date(2026, 9, 9).toISOString() },
        { amount: 10, currency: 'USD', paid_at: new Date(2026, 8, 9).toISOString() },
        { amount: 999, currency: 'VES', paid_at: new Date(2026, 9, 9).toISOString() },
        { amount: 5, currency: 'USD', paid_at: new Date(2025, 0, 9).toISOString() },
      ],
      usuarios: [{ created_at: new Date(2026, 9, 1).toISOString() }, { created_at: new Date(2026, 7, 1).toISOString() }, { created_at: null }],
    }, 6, ahora)
    expect(s.ingresos).toEqual([0, 0, 0, 0, 10, 44.5])
    expect(s.altas).toEqual([0, 0, 0, 1, 0, 1])
    expect(s.etiquetas[5]).toBe('oct')
  })

  it('claveMes devuelve vacío con fechas inválidas', () => {
    expect(claveMes(null)).toBe('')
    expect(claveMes('no es fecha')).toBe('')
  })
})

describe('usuariosNuevos30Dias', () => {
  it('cuenta solo las altas de los últimos 30 días', () => {
    expect(usuariosNuevos30Dias([{ created_at: enDias(-5) }, { created_at: enDias(-29) }, { created_at: enDias(-31) }, {}], ahora)).toBe(2)
  })
})

describe('siguientePasoSuperAdmin', () => {
  const todo = { pagosPendientes: 2, vencenSemana: 3, erroresIa: 4, diasSinTasa: 5, porVerificar: 6 }

  it('respeta el orden: pagos, pruebas, IA, tasas, catálogo', () => {
    expect(siguientePasoSuperAdmin(todo).clave).toBe('pagos')
    expect(siguientePasoSuperAdmin({ ...todo, pagosPendientes: 0 }).clave).toBe('pruebas')
    expect(siguientePasoSuperAdmin({ ...todo, pagosPendientes: 0, vencenSemana: 0 }).clave).toBe('ia')
    expect(siguientePasoSuperAdmin({ ...todo, pagosPendientes: 0, vencenSemana: 0, erroresIa: 0 }).clave).toBe('tasas')
    expect(siguientePasoSuperAdmin({ porVerificar: 6 }).clave).toBe('catalogo')
  })

  it('singular y plural en el título, y destino correcto', () => {
    expect(siguientePasoSuperAdmin({ pagosPendientes: 1 }).titulo).toBe('1 pago por aprobar')
    expect(siguientePasoSuperAdmin({ pagosPendientes: 3 }).titulo).toBe('3 pagos por aprobar')
    expect(siguientePasoSuperAdmin({ pagosPendientes: 1 }).to).toEqual({ name: 'FacturacionSistema', query: { tab: 'reports' } })
    expect(siguientePasoSuperAdmin({ vencenSemana: 1 }).titulo).toBe('1 prueba vence esta semana')
    expect(siguientePasoSuperAdmin({ erroresIa: 1 }).titulo).toBe('1 error de IA esta semana')
    expect(siguientePasoSuperAdmin({ diasSinTasa: 2 }).titulo).toBe('Faltan 2 días de tasa')
  })

  it('devuelve null cuando todo está en orden', () => {
    expect(siguientePasoSuperAdmin({})).toBeNull()
  })
})

describe('fraseResumen', () => {
  it('arma la frase del negocio', () => {
    expect(fraseResumen({ activas: 3, prueba: 5 }, 120)).toBe('AD System tiene 3 empresas activas y 5 en prueba; ingresos del mes $120.00.')
    expect(fraseResumen({ activas: 1, prueba: 0 }, 0, () => '$ 0,00')).toBe('AD System tiene 1 empresa activa y 0 en prueba; ingresos del mes $ 0,00.')
  })
})
