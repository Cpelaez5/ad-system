import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  crearControlInactividad,
  umbralDesdeUrl,
  CLAVE_ULTIMA_ACTIVIDAD,
  CLAVE_BLOQUEADA,
} from '@/composables/useInactividad'

const MIN = 60 * 1000

function almacenFalso() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  }
}

/** Canal en memoria compartido por "pestañas" para probar la sincronía. */
function crearBus() {
  const canales = []
  return () => {
    const c = {
      onmessage: null,
      postMessage(msg) { canales.filter((o) => o !== c).forEach((o) => o.onmessage?.({ data: msg })) },
      close() { canales.splice(canales.indexOf(c), 1) },
    }
    canales.push(c)
    return c
  }
}

function crear(extra = {}) {
  const estados = []
  const almacen = extra.almacen || almacenFalso()
  const control = crearControlInactividad({
    umbralMs: 20 * MIN,
    avisoMs: MIN,
    almacen,
    crearCanal: () => null,
    onEstado: (e) => estados.push(e),
    ...extra,
  })
  return { control, estados, almacen }
}

describe('useInactividad (lógica)', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('sigue activo antes del umbral menos el aviso', () => {
    const { control, estados } = crear()
    control.iniciar()
    vi.advanceTimersByTime(18 * MIN)
    expect(control.estado).toBe('activo')
    expect(estados).toEqual([])
    control.detener()
  })

  it('avisa 60 s antes y bloquea al cumplirse 20 min', () => {
    const { control, estados, almacen } = crear()
    control.iniciar()
    vi.advanceTimersByTime(19 * MIN + 1000)
    expect(control.estado).toBe('aviso')
    vi.advanceTimersByTime(MIN)
    expect(control.estado).toBe('bloqueado')
    expect(estados).toEqual(['aviso', 'bloqueado'])
    expect(almacen.getItem(CLAVE_BLOQUEADA)).toBeTruthy()
    control.detener()
  })

  it('la actividad reinicia la cuenta y cancela el aviso', () => {
    const { control } = crear()
    control.iniciar()
    vi.advanceTimersByTime(19 * MIN + 10_000)
    expect(control.estado).toBe('aviso')
    control.marcarActividad()
    expect(control.estado).toBe('activo')
    vi.advanceTimersByTime(15 * MIN)
    expect(control.estado).toBe('activo')
    vi.advanceTimersByTime(5 * MIN)
    expect(control.estado).toBe('bloqueado')
    control.detener()
  })

  it('los eventos del navegador cuentan como actividad (con throttle)', () => {
    const { control, almacen } = crear()
    control.iniciar()
    vi.advanceTimersByTime(10 * MIN)
    window.dispatchEvent(new Event('mousemove'))
    const t1 = Number(almacen.getItem(CLAVE_ULTIMA_ACTIVIDAD))
    vi.advanceTimersByTime(200)
    window.dispatchEvent(new Event('mousemove')) // dentro del throttle: no reescribe
    expect(Number(almacen.getItem(CLAVE_ULTIMA_ACTIVIDAD))).toBe(t1)
    vi.advanceTimersByTime(15 * MIN)
    expect(control.estado).toBe('activo') // 15 min desde el último evento < 19 min
    control.detener()
  })

  it('bloqueado ignora la actividad hasta desbloquear', () => {
    const { control, almacen } = crear()
    control.iniciar()
    vi.advanceTimersByTime(20 * MIN)
    expect(control.estado).toBe('bloqueado')
    window.dispatchEvent(new Event('keydown'))
    expect(control.estado).toBe('bloqueado')
    control.desbloquear()
    expect(control.estado).toBe('activo')
    expect(almacen.getItem(CLAVE_BLOQUEADA)).toBeNull()
    vi.advanceTimersByTime(10 * MIN)
    expect(control.estado).toBe('activo')
    control.detener()
  })

  it('umbral corto: el aviso dura como mucho la mitad', () => {
    const { control } = crear({ umbralMs: 10_000 })
    control.iniciar()
    vi.advanceTimersByTime(4000)
    expect(control.estado).toBe('activo')
    vi.advanceTimersByTime(2000)
    expect(control.estado).toBe('aviso')
    vi.advanceTimersByTime(4000)
    expect(control.estado).toBe('bloqueado')
    control.detener()
  })

  it('sincroniza pestañas: una activa mantiene viva a la otra; bloquear y desbloquear se propagan', () => {
    const almacen = almacenFalso()
    const bus = crearBus()
    const a = crear({ almacen, crearCanal: bus })
    const b = crear({ almacen, crearCanal: bus })
    a.control.iniciar()
    b.control.iniciar()

    vi.advanceTimersByTime(15 * MIN)
    a.control.marcarActividad() // solo A se usa
    vi.advanceTimersByTime(10 * MIN)
    expect(b.control.estado).toBe('activo') // B ve la actividad de A

    vi.advanceTimersByTime(10 * MIN)
    expect(a.control.estado).toBe('bloqueado')
    expect(b.control.estado).toBe('bloqueado')

    a.control.desbloquear()
    expect(a.control.estado).toBe('activo')
    expect(b.control.estado).toBe('activo')
    a.control.detener()
    b.control.detener()
  })

  it('un bloqueo guardado persiste al recargar, salvo que sea de otra cuenta', () => {
    const almacen = almacenFalso()
    almacen.setItem(CLAVE_BLOQUEADA, 'ana@correo.com')
    const mismo = crear({ almacen, identidad: 'ana@correo.com' })
    mismo.control.iniciar()
    expect(mismo.control.estado).toBe('bloqueado')
    mismo.control.detener()

    const otro = crear({ almacen, identidad: 'luis@correo.com' })
    almacen.setItem(CLAVE_BLOQUEADA, 'ana@correo.com')
    otro.control.iniciar()
    expect(otro.control.estado).toBe('activo')
    expect(almacen.getItem(CLAVE_BLOQUEADA)).toBeNull()
    otro.control.detener()
  })

  it('detener con limpiar borra las claves compartidas', () => {
    const { control, almacen } = crear()
    control.iniciar()
    control.bloquear()
    control.detener({ limpiar: true })
    expect(almacen.getItem(CLAVE_BLOQUEADA)).toBeNull()
    expect(almacen.getItem(CLAVE_ULTIMA_ACTIVIDAD)).toBeNull()
  })

  it('?inactividad=N solo vale en desarrollo', () => {
    expect(umbralDesdeUrl('?inactividad=10', true)).toBe(10_000)
    expect(umbralDesdeUrl('?inactividad=10', false)).toBeNull()
    expect(umbralDesdeUrl('?inactividad=abc', true)).toBeNull()
    expect(umbralDesdeUrl('', true)).toBeNull()
  })
})
