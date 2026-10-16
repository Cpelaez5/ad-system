import { describe, it, expect } from 'vitest'
import {
  tiempoRelativo, agruparPorFecha, textoInsignia, iconoDeTipo, esDeSoporte,
  resolverPreferencia, tiposParaRol, rutaSegura, agruparSoporte, diaCaracas,
} from '../notificaciones.js'

// Mediodía en Caracas (UTC-4) = 16:00 UTC
const AHORA = new Date('2026-10-16T16:00:00Z')
const hace = (ms) => new Date(AHORA.getTime() - ms).toISOString()
const MIN = 60_000
const H = 60 * MIN
const D = 24 * H

describe('tiempoRelativo', () => {
  it('ahora / minutos / horas', () => {
    expect(tiempoRelativo(hace(10_000), AHORA)).toBe('ahora')
    expect(tiempoRelativo(hace(5 * MIN), AHORA)).toBe('hace 5 min')
    expect(tiempoRelativo(hace(59 * MIN), AHORA)).toBe('hace 59 min')
    expect(tiempoRelativo(hace(3 * H), AHORA)).toBe('hace 3 h')
  })
  it('una hora de anoche vista hoy es "ayer", no "hace 14 h"', () => {
    // 22:00 de Caracas de ayer = 02:00 UTC de hoy -> 14 h antes de AHORA
    expect(tiempoRelativo('2026-10-16T02:00:00Z', AHORA)).toBe('ayer')
  })
  it('días y fecha corta', () => {
    expect(tiempoRelativo(hace(2 * D), AHORA)).toBe('hace 2 días')
    expect(tiempoRelativo(hace(6 * D), AHORA)).toBe('hace 6 días')
    expect(tiempoRelativo(hace(20 * D), AHORA)).toMatch(/\d/)
  })
  it('fecha inválida -> vacío', () => {
    expect(tiempoRelativo('nada', AHORA)).toBe('')
  })
})

describe('agruparPorFecha', () => {
  const n = (id, ms) => ({ id, created_at: hace(ms) })
  it('separa Hoy, Esta semana y Antes, del más nuevo al más viejo', () => {
    const grupos = agruparPorFecha([n('viejo', 30 * D), n('semana', 3 * D), n('b', 3 * H), n('a', 1 * H)], AHORA)
    expect(grupos.map((g) => g.titulo)).toEqual(['Hoy', 'Esta semana', 'Antes'])
    expect(grupos[0].items.map((x) => x.id)).toEqual(['a', 'b'])
    expect(grupos[1].items.map((x) => x.id)).toEqual(['semana'])
    expect(grupos[2].items.map((x) => x.id)).toEqual(['viejo'])
  })
  it('omite los grupos vacíos', () => {
    expect(agruparPorFecha([n('a', H)], AHORA).map((g) => g.clave)).toEqual(['hoy'])
    expect(agruparPorFecha([], AHORA)).toEqual([])
  })
  it('"hoy" se cuenta por día de Caracas, no por UTC', () => {
    // 23:30 de Caracas de ayer (03:30 UTC de hoy) NO es hoy
    const ayerNoche = { id: 'x', created_at: '2026-10-16T03:30:00Z' }
    expect(diaCaracas(ayerNoche.created_at)).toBe('2026-10-15')
    expect(agruparPorFecha([ayerNoche], AHORA)[0].clave).toBe('semana')
  })
})

describe('insignia, iconos y rutas', () => {
  it('textoInsignia', () => {
    expect(textoInsignia(0)).toBe('')
    expect(textoInsignia(3)).toBe('3')
    expect(textoInsignia(9)).toBe('9')
    expect(textoInsignia(10)).toBe('9+')
  })
  it('iconoDeTipo con respaldo', () => {
    expect(iconoDeTipo('soporte_respuesta')).toBe('mdi-message-reply-text-outline')
    expect(iconoDeTipo('algo_nuevo')).toBe('mdi-bell-outline')
  })
  it('esDeSoporte y agruparSoporte', () => {
    expect(esDeSoporte('soporte_nueva')).toBe(true)
    expect(esDeSoporte('papel_por_vencer')).toBe(false)
    expect(agruparSoporte('abc')).toBe('soporte:abc')
  })
  it('rutaSegura solo acepta rutas internas', () => {
    expect(rutaSegura('/cliente/inicio?soporte=1')).toBe('/cliente/inicio?soporte=1')
    expect(rutaSegura('//malo.com')).toBeNull()
    expect(rutaSegura('https://malo.com')).toBeNull()
    expect(rutaSegura(null)).toBeNull()
  })
})

describe('preferencias', () => {
  const def = { correo_def: false, push_def: true }
  it('sin fila usa el catálogo', () => {
    expect(resolverPreferencia(undefined, def)).toEqual({ correo: false, push: true })
  })
  it('la fila de la persona manda, incluso si es false', () => {
    expect(resolverPreferencia({ correo: true, push: false }, def)).toEqual({ correo: true, push: false })
  })
  it('sin catálogo ni fila: todo activo', () => {
    expect(resolverPreferencia(null, null)).toEqual({ correo: true, push: true })
  })
  it('tiposParaRol filtra por rol y ordena', () => {
    const tipos = [
      { tipo: 'b', para_rol: 'super_admin', orden: 2 },
      { tipo: 'a', para_rol: 'cliente', orden: 3 },
      { tipo: 'c', para_rol: 'cliente', orden: 1 },
      { tipo: 'd', para_rol: 'todos', orden: 4 },
    ]
    expect(tiposParaRol(tipos, 'cliente').map((t) => t.tipo)).toEqual(['c', 'a', 'd'])
    expect(tiposParaRol(tipos, 'super_admin').map((t) => t.tipo)).toEqual(['b', 'd'])
  })
})
