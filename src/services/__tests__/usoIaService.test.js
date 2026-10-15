import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
vi.mock('@/lib/supabaseClient', () => ({ supabase: { rpc: (...a) => rpc(...a) } }))

import { obtenerUsoIa, normalizarUso, avisarIaUsada, EVENTO_IA_USADA } from '../usoIaService'

const BUENO = {
  usados: 34, limite: 100, porcentaje: 34,
  por_accion: { ocr: 12, chat: 18 }, renueva: '2026-11-01',
}

describe('usoIaService', () => {
  beforeEach(() => { rpc.mockReset() })

  it('el cliente llama la RPC sin parámetros', async () => {
    rpc.mockResolvedValue({ data: BUENO, error: null })
    const r = await obtenerUsoIa()
    expect(rpc).toHaveBeenCalledWith('uso_ia_mes', undefined)
    expect(r.limite).toBe(100)
    expect(r.por_accion.ocr).toBe(12)
  })

  it('el staff pasa p_client_id', async () => {
    rpc.mockResolvedValue({ data: BUENO, error: null })
    await obtenerUsoIa({ clientId: 'abc' })
    expect(rpc).toHaveBeenCalledWith('uso_ia_mes', { p_client_id: 'abc' })
  })

  it('devuelve null si la RPC falla, devuelve null o lanza', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } })
    expect(await obtenerUsoIa()).toBeNull()
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await obtenerUsoIa()).toBeNull()
    rpc.mockReturnValue(Promise.reject(new Error('red')))
    expect(await obtenerUsoIa()).toBeNull()
  })

  it('normalizarUso descarta datos sin límite', () => {
    expect(normalizarUso({ usados: 1, limite: 0 })).toBeNull()
    expect(normalizarUso('hola')).toBeNull()
    expect(normalizarUso({ usados: 1, limite: 10 }).por_accion).toEqual({})
  })

  it('avisarIaUsada despacha el evento ad-ia-usada', () => {
    const oyente = vi.fn()
    window.addEventListener(EVENTO_IA_USADA, oyente)
    avisarIaUsada()
    window.removeEventListener(EVENTO_IA_USADA, oyente)
    expect(EVENTO_IA_USADA).toBe('ad-ia-usada')
    expect(oyente).toHaveBeenCalledTimes(1)
  })
})
