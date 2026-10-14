import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { estadoPapel, siguientePaso, resumenPapeles } from '@/utils/estadoPapel'

const ISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const enDias = (n) => { const d = new Date(2026, 9, 13); d.setDate(d.getDate() + n); return ISO(d) }

describe('estadoPapel', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 13, 10, 0, 0)) })
  afterEach(() => vi.useRealTimers())

  it('requerido sin subir → falta, acción Subir', () => {
    const e = estadoPapel({ pendiente: { id: 'RIF', label: 'RIF' } })
    expect(e.clave).toBe('falta')
    expect(e.accion).toMatchObject({ texto: 'Subir', evento: 'subir' })
  })

  it('vencido → atender, acción Renovar, texto en llano', () => {
    const e = estadoPapel({ doc: { status: 'VIGENTE', emission_date: enDias(-400), expiration_date: enDias(-10) } })
    expect(e.clave).toBe('atender')
    expect(e.semaforo.texto).toMatch(/Venció hace 10 días/)
    expect(e.accion).toMatchObject({ texto: 'Renovar', evento: 'editar' })
  })

  it('vigente lejos de vencer → al día, acción Ver', () => {
    const e = estadoPapel({ doc: { status: 'VIGENTE', emission_date: enDias(-200), expiration_date: enDias(300) } })
    expect(e.clave).toBe('aldia')
    expect(e.accion.evento).toBe('ver')
  })

  it('"una sola vez" (PERMANENT) subido sin fecha está listo, nunca pide Renovar', () => {
    const e = estadoPapel({ doc: { status: 'VIGENTE', emission_date: enDias(-900) }, frecuencia: 'PERMANENT' })
    expect(e.clave).toBe('aldia')
    expect(e.semaforo.texto).toMatch(/una sola vez/)
    expect(e.accion.evento).toBe('ver')
  })

  it('renovable (VIGENTE) sin fecha de vencimiento queda "por completar" con acción Agregar fecha', () => {
    const e = estadoPapel({ doc: { status: 'VIGENTE', emission_date: enDias(-30) }, frecuencia: 'VIGENTE' })
    expect(e.clave).toBe('completar')
    expect(e.accion).toMatchObject({ texto: 'Agregar fecha', evento: 'editar' })
  })

  it('el pendiente explica su ciclo', () => {
    expect(estadoPapel({ pendiente: { label: 'Publicación Mercantil', frequency: 'PERMANENT' } }).semaforo.texto).toMatch(/una sola vez/)
    expect(estadoPapel({ pendiente: { label: 'RIF', frequency: 'VIGENTE' } }).semaforo.texto).toMatch(/se renueva al vencer/)
  })

  it('TRAMITE y NO_APLICA tienen su propio grupo', () => {
    expect(estadoPapel({ doc: { status: 'TRAMITE' } }).clave).toBe('tramite')
    expect(estadoPapel({ doc: { status: 'NO_APLICA' } }).clave).toBe('noaplica')
  })
})

describe('siguientePaso y resumenPapeles', () => {
  const papel = (clave, diasRestantes = null, id = clave) => ({ id, estado: { clave, diasRestantes } })

  it('prioriza lo más vencido, luego lo que falta, luego lo que está en trámite', () => {
    const lista = [papel('falta', null, 'f1'), papel('atender', 20, 'a1'), papel('atender', -236, 'a2'), papel('tramite')]
    expect(siguientePaso(lista).id).toBe('a2')
    expect(siguientePaso([papel('tramite'), papel('falta', null, 'f1')]).id).toBe('f1')
    expect(siguientePaso([papel('tramite'), papel('completar', null, 'c1')]).id).toBe('c1')
    expect(siguientePaso([papel('aldia')])).toBeNull()
  })

  it('el avance no cuenta los "no aplica"', () => {
    const r = resumenPapeles([papel('aldia'), papel('aldia'), papel('falta'), papel('noaplica')])
    expect(r).toMatchObject({ total: 3, alDia: 2, falta: 1, porResolver: 1, porcentaje: 67 })
  })
})
