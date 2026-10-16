import { describe, it, expect } from 'vitest'
import {
  urlBase64ToUint8Array, esIOS, debePreguntar, situacionPush, filaDeSuscripcion, construirPayload,
  VAPID_PUBLICA_POR_DEFECTO,
} from '../push.js'

const DIA = 24 * 60 * 60 * 1000

describe('urlBase64ToUint8Array', () => {
  it('decodifica la clave VAPID a 65 bytes que empiezan en 0x04', () => {
    const b = urlBase64ToUint8Array(VAPID_PUBLICA_POR_DEFECTO)
    expect(b.length).toBe(65)
    expect(b[0]).toBe(4)
  })
  it('maneja - y _ y relleno', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
})

describe('debePreguntar', () => {
  const base = { soportado: true, permiso: 'default', ahora: 100 * DIA }
  it('pregunta cuando nunca se descartó', () => expect(debePreguntar(base)).toBe(true))
  it('no pregunta si no hay soporte, o ya se decidió', () => {
    expect(debePreguntar({ ...base, soportado: false })).toBe(false)
    expect(debePreguntar({ ...base, permiso: 'denied' })).toBe(false)
    expect(debePreguntar({ ...base, permiso: 'granted' })).toBe(false)
  })
  it('espera 7 días tras "Ahora no"', () => {
    expect(debePreguntar({ ...base, ultimoDescarte: base.ahora - 6 * DIA })).toBe(false)
    expect(debePreguntar({ ...base, ultimoDescarte: base.ahora - 7 * DIA })).toBe(true)
  })
})

describe('iOS y situación', () => {
  it('detecta iPhone, iPad y iPadOS como Mac táctil', () => {
    expect(esIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(esIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe(true)
    expect(esIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe(false)
    expect(esIOS('Mozilla/5.0 (Windows NT 10.0)')).toBe(false)
  })
  it('explica iOS sin instalar, bloqueado, activo e inactivo', () => {
    expect(situacionPush({ soportado: false, permiso: 'default', suscrito: false, ios: true, instalada: false })).toBe('ios_sin_instalar')
    expect(situacionPush({ soportado: false, permiso: 'default', suscrito: false, ios: false, instalada: false })).toBe('no_soportado')
    expect(situacionPush({ soportado: true, permiso: 'denied', suscrito: false, ios: false, instalada: false })).toBe('bloqueado')
    expect(situacionPush({ soportado: true, permiso: 'granted', suscrito: true, ios: true, instalada: true })).toBe('activo')
    expect(situacionPush({ soportado: true, permiso: 'granted', suscrito: false, ios: false, instalada: false })).toBe('inactivo')
  })
})

describe('payload y fila', () => {
  it('arma el payload y rechaza URLs externas', () => {
    expect(JSON.parse(construirPayload({ titulo: 'Hola', cuerpo: 'x', url: '/a?b=1', tag: 't' }))).toEqual({ titulo: 'Hola', cuerpo: 'x', url: '/a?b=1', tag: 't' })
    expect(JSON.parse(construirPayload({ titulo: '', url: 'https://malo.com' }))).toMatchObject({ titulo: 'AD System', url: '/' })
  })
  it('convierte la suscripción a fila y descarta las incompletas', () => {
    const f = filaDeSuscripcion({ endpoint: 'https://e', keys: { p256dh: 'p', auth: 'a' } }, 'UA')
    expect(f).toMatchObject({ endpoint: 'https://e', p256dh: 'p', auth: 'a', user_agent: 'UA' })
    expect(filaDeSuscripcion({ endpoint: 'https://e', keys: {} })).toBeNull()
  })
})
