import { describe, it, expect } from 'vitest'
import { sugerenciasInicio } from '../sugerenciasInicio.js'

describe('sugerenciasInicio: SENIAT del mes', () => {
  it('aparece con su ruta cuando hay una declaración pendiente', () => {
    const s = sugerenciasInicio({ seniatPendiente: { titulo: 'Tus retenciones de IVA están por declarar', detalle: 'x' }, diaDelMes: 20 })
    const sug = s.find((x) => x.clave === 'seniat')
    expect(sug.accion).toEqual({ ruta: '/cliente/seniat' })
  })
  it('no aparece sin pendiente', () => {
    expect(sugerenciasInicio({ diaDelMes: 20 }).some((x) => x.clave === 'seniat')).toBe(false)
  })
})
