import { describe, it, expect } from 'vitest'
import { avisoDeIdentificacion, MENSAJES_ANALISIS } from '@/utils/fotoYListo'

describe('avisoDeIdentificacion', () => {
  it('si la IA falla, avisa con amabilidad y no bloquea', () => {
    const a = avisoDeIdentificacion(null, null)
    expect(a.tipo).toBe('info')
    expect(a.texto).toMatch(/Completa los datos/)
  })
  it('usa el mensaje de error de la IA si lo hay', () => {
    expect(avisoDeIdentificacion(null, 'Foto muy oscura').texto).toBe('Foto muy oscura')
  })
  it('confianza baja: pide completar el nombre', () => {
    const a = avisoDeIdentificacion({ nombre: 'Algo', confianza: 'baja' })
    expect(a.tipo).toBe('warning')
    expect(a.texto).toMatch(/nombre/)
  })
  it('sin nombre también cuenta como baja', () => {
    expect(avisoDeIdentificacion({ nombre: '  ', confianza: 'alta' }).tipo).toBe('warning')
  })
  it('confianza media: pide revisar', () => {
    expect(avisoDeIdentificacion({ nombre: 'X', confianza: 'media' }).texto).toMatch(/Revisa/)
  })
  it('confianza alta: sin aviso', () => {
    expect(avisoDeIdentificacion({ nombre: 'X', confianza: 'alta' })).toBeNull()
  })
  it('hay mensajes de espera', () => {
    expect(MENSAJES_ANALISIS.length).toBeGreaterThan(2)
  })
})
