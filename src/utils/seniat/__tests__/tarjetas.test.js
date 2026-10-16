import { describe, it, expect } from 'vitest'
import { armarTarjetas, pendienteParaInicio, buscarDeclaracion } from '../tarjetas.js'
import { registrosDelLibro } from '../libros.js'
import { cliente, retIva, retIslr } from './fixtures.js'

describe('armarTarjetas', () => {
  it('contribuyente especial: dos de IVA y una de ISLR', () => {
    const t = armarTarjetas({ cliente, retenciones: [], declaraciones: [], periodo: '202610' })
    expect(t.map((x) => x.clave)).toEqual(['iva-1', 'iva-2', 'islr'])
    expect(t.every((x) => x.estado === 'nada')).toBe(true)
  })

  it('no especial: solo ISLR', () => {
    const t = armarTarjetas({ cliente: { ...cliente, es_contribuyente_especial: false }, retenciones: [], periodo: '202610' })
    expect(t.map((x) => x.clave)).toEqual(['islr'])
  })

  it('reparte por quincena, suma y marca lista', () => {
    const t = armarTarjetas({
      cliente,
      retenciones: [retIva(), retIva({ id: 'x', fecha_comprobante: '2026-10-20', numero_comprobante: '20261000000009' }), retIslr()],
      periodo: '202610',
    })
    expect(t[0]).toMatchObject({ lineas: 1, montoTotal: 120, estado: 'lista' })
    expect(t[1].lineas).toBe(1)
    expect(t[2]).toMatchObject({ lineas: 1, montoTotal: 100, estado: 'lista' })
  })

  it('con problemas: faltan datos; con concepto sin código el problema es del equipo', () => {
    const t = armarTarjetas({ cliente, retenciones: [retIva({ factura_control: '' }), retIslr({ codigo_seniat: null })], periodo: '202610' })
    expect(t[0].estado).toBe('faltan_datos')
    expect(t[2].estado).toBe('faltan_datos')
    expect(t[2].problemas[0].arreglo.tipo).toBe('equipo')
  })

  it('declarada si nada cambió, cambios si cambió', () => {
    const declaraciones = [{ tipo: 'IVA', periodo: '202610', quincena: 1, estado: 'declarada', lineas: 1, monto_total: 120 }]
    expect(buscarDeclaracion(declaraciones, 'IVA', '202610', 1)).toBeTruthy()
    expect(buscarDeclaracion(declaraciones, 'IVA', '202610', 2)).toBeNull()
    expect(armarTarjetas({ cliente, retenciones: [retIva()], declaraciones, periodo: '202610' })[0].estado).toBe('declarada')
    expect(armarTarjetas({ cliente, retenciones: [retIva({ monto_retenido: 90, monto_iva: 120 })], declaraciones, periodo: '202610' })[0].estado).toBe('cambios')
  })
})

describe('pendienteParaInicio', () => {
  it('null si no hay nada pendiente', () => {
    expect(pendienteParaInicio({ cliente, retenciones: [], declaraciones: [], periodo: '202610' })).toBeNull()
  })
  it('una pendiente: nombra la quincena', () => {
    const s = pendienteParaInicio({ cliente, retenciones: [retIva()], declaraciones: [], periodo: '202610' })
    expect(s.cantidad).toBe(1)
    expect(s.titulo).toContain('1ra quincena de octubre')
  })
  it('varias pendientes: las cuenta', () => {
    const s = pendienteParaInicio({ cliente, retenciones: [retIva(), retIslr()], declaraciones: [], periodo: '202610' })
    expect(s.cantidad).toBe(2)
    expect(s.titulo).toContain('2 declaraciones')
  })
})

describe('registrosDelLibro', () => {
  const inv = (extra) => ({ flow: 'COMPRA', documentType: 'FACTURA', issueDate: '2026-09-30', fecha_fiscal: null, ...extra })
  it('compras por fecha fiscal con respaldo en la emisión; ventas por emisión; solo facturas', () => {
    const lista = [
      inv({ id: 1, fecha_fiscal: '2026-10-02' }),
      inv({ id: 2 }),
      inv({ id: 3, documentType: 'RECIBO', fecha_fiscal: '2026-10-02' }),
      inv({ id: 4, flow: 'VENTA', issueDate: '2026-10-10', fecha_fiscal: '2026-09-01' }),
    ]
    expect(registrosDelLibro(lista, 'COMPRA', '202610').map((x) => x.id)).toEqual([1])
    expect(registrosDelLibro(lista, 'COMPRA', '202609').map((x) => x.id)).toEqual([2])
    expect(registrosDelLibro(lista, 'VENTA', '202610').map((x) => x.id)).toEqual([4])
  })
})
