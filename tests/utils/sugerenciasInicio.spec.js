import { describe, it, expect } from 'vitest'
import { sugerenciasInicio } from '@/utils/sugerenciasInicio'

const venta = (status, total = 100) => ({ status, financial: { totalSales: total } })
const compra = (conCategoria = true, retencion = 0) => ({
  expenseCategory: conCategoria ? { name: 'Servicios' } : null,
  retenciones: { iva: retencion, islr: 0, municipal: 0 },
})

describe('sugerenciasInicio', () => {
  it('lo más útil primero: cobrar antes que clasificar', () => {
    const r = sugerenciasInicio({
      todasVentas: [venta('POR_COBRAR', 50), venta('PAGADA')],
      comprasMes: [compra(false)],
      diaDelMes: 20,
      papelesSubidos: 10,
    })
    expect(r.map((s) => s.clave).slice(0, 2)).toEqual(['cobrar', 'categorizar'])
    expect(r[0].titulo).toContain('50')
  })

  it('retenciones del mes → entregar comprobantes', () => {
    const r = sugerenciasInicio({ comprasMes: [compra(true, 12)], diaDelMes: 20, papelesSubidos: 10 })
    expect(r.some((s) => s.clave === 'retenciones')).toBe(true)
  })

  it('solo gastos este mes → sugiere registrar ventas', () => {
    const r = sugerenciasInicio({ comprasMes: [compra()], ventasMes: [], diaDelMes: 20, papelesSubidos: 10 })
    expect(r.some((s) => s.clave === 'registrar-ventas' && s.accion.evento === 'registrar-venta')).toBe(true)
  })

  it('primera quincena → revisar lo que se declara; fin de mes → libros', () => {
    expect(sugerenciasInicio({ diaDelMes: 5, papelesSubidos: 10 }).some((s) => s.clave === 'declarar')).toBe(true)
    expect(sugerenciasInicio({ diaDelMes: 27, papelesSubidos: 10 }).some((s) => s.clave === 'libros')).toBe(true)
  })

  it('respeta las descartadas y el máximo; el asistente siempre queda de reserva', () => {
    const r = sugerenciasInicio({ diaDelMes: 20, papelesSubidos: 10, descartadas: ['asistente'] })
    expect(r).toEqual([])
    const r2 = sugerenciasInicio({ diaDelMes: 20, papelesSubidos: 10 })
    expect(r2.map((s) => s.clave)).toEqual(['asistente'])
    const muchas = sugerenciasInicio({
      todasVentas: [venta('POR_COBRAR')], comprasMes: [compra(false, 5)], diaDelMes: 2, papelesSubidos: 1, maximo: 3,
    })
    expect(muchas).toHaveLength(3)
  })
})
