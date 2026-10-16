import { describe, it, expect } from 'vitest'
import { revisarRetenciones, montoCuadra, textoExcluidas } from '../validacionRetenciones.js'
import { cliente, retIva, retIslr } from './fixtures.js'

const revisarIva = (retenciones, c = cliente, quincena = 1) =>
  revisarRetenciones({ tipo: 'IVA', cliente: c, retenciones, periodo: '202610', quincena })
const revisarIslr = (retenciones, c = cliente) =>
  revisarRetenciones({ tipo: 'ISLR', cliente: c, retenciones, periodo: '202610' })

describe('revisión de IVA', () => {
  it('una retención correcta no tiene problemas', () => {
    const r = revisarIva([retIva()])
    expect(r.problemas).toEqual([])
    expect(r.incluidas).toHaveLength(1)
  })

  it('RIF del negocio ausente o incompleto apunta a Mi negocio', () => {
    for (const rif of ['', null, 'J-1234']) {
      const r = revisarIva([retIva()], { rif })
      expect(r.problemas[0]).toMatchObject({ codigo: 'RIF_NEGOCIO', arreglo: { tipo: 'negocio', id: null } })
      expect(r.problemas[0].mensaje).toContain('RIF de tu negocio')
    }
  })

  it('RIF de proveedor incompleto: mensaje con el nombre y el RIF, arreglo en el proveedor, una sola vez', () => {
    const r = revisarIva([
      retIva({ proveedor_rif: 'J-1234567' }),
      retIva({ id: 'r2', numero_comprobante: '20261000000002', proveedor_rif: 'J-1234567' }),
    ])
    const p = r.problemas.filter((x) => x.codigo === 'RIF_PROVEEDOR')
    expect(p).toHaveLength(1)
    expect(p[0].mensaje).toBe('El RIF de Distribuidora Ejemplo C.A. no está completo (J-1234567).')
    expect(p[0].arreglo).toEqual({ tipo: 'proveedor', id: 'p1' })
  })

  it('factura sin número', () => {
    const r = revisarIva([retIva({ factura_numero: '  ' })])
    const p = r.problemas.find((x) => x.codigo === 'FACTURA_SIN_NUMERO')
    expect(p.mensaje).toBe('A la factura del 05/10 de Distribuidora Ejemplo C.A. le falta el número.')
    expect(p.arreglo).toEqual({ tipo: 'registro', id: 'f1' })
  })

  it('factura sin número de control', () => {
    const r = revisarIva([retIva({ factura_control: '' })])
    const p = r.problemas.find((x) => x.codigo === 'SIN_CONTROL')
    expect(p.mensaje).toContain('la factura 123')
    expect(p.mensaje).toContain('número de control')
    expect(p.arreglo.tipo).toBe('registro')
  })

  it('comprobante sin número o con formato distinto de 14 dígitos', () => {
    const sin = revisarIva([retIva({ numero_comprobante: '' })]).problemas.find((x) => x.codigo === 'COMPROBANTE')
    expect(sin.mensaje).toBe('El comprobante de la factura 123 no tiene número.')
    const corto = revisarIva([retIva({ numero_comprobante: '2026-10-1' })]).problemas.find((x) => x.codigo === 'COMPROBANTE')
    expect(corto.mensaje).toContain('14 números')
  })

  it('comprobante con guiones se normaliza sin molestar', () => {
    const r = revisarIva([retIva({ numero_comprobante: '202610-00000001' })])
    expect(r.problemas).toEqual([])
    expect(r.normalizaciones.some((n) => n.mensaje.includes('comprobante'))).toBe(true)
  })

  it('monto retenido que no cuadra (más de 1 céntimo)', () => {
    expect(montoCuadra(retIva({ monto_retenido: 120.01 }))).toBe(true)
    expect(montoCuadra(retIva({ monto_retenido: 120.5 }))).toBe(false)
    const r = revisarIva([retIva({ monto_retenido: 130 })])
    expect(r.problemas.find((x) => x.codigo === 'MONTO_NO_CUADRA').mensaje).toBe('El monto retenido de la factura 123 no cuadra con el porcentaje.')
  })

  it('100% de retención también se comprueba', () => {
    expect(montoCuadra(retIva({ porcentaje_retencion: 100, monto_retenido: 160 }))).toBe(true)
  })

  it('RIF con guiones se normaliza en silencio', () => {
    const r = revisarIva([retIva()])
    expect(r.normalizaciones.map((n) => n.mensaje).join(' ')).toContain('J123456789')
    expect(r.normalizaciones.map((n) => n.mensaje).join(' ')).toContain('J300000'.slice(0, 1))
  })

  it('separa por quincena y explica lo que quedó afuera', () => {
    const r = revisarIva([retIva(), retIva({ id: 'r9', fecha_comprobante: '2026-10-20' }), retIva({ id: 'r10', fecha_comprobante: '2026-11-02' })])
    expect(r.incluidas.map((x) => x.id)).toEqual(['r1'])
    expect(r.excluidas).toHaveLength(2)
    expect(textoExcluidas(r.excluidas)).toContain('2 comprobantes')
  })

  it('ignora retenciones de otro tipo', () => {
    const r = revisarIva([retIva(), retIslr()])
    expect(r.incluidas).toHaveLength(1)
  })
})

describe('revisión de ISLR', () => {
  it('una retención correcta no tiene problemas (sin número de control es válido: se usa NA)', () => {
    const r = revisarIslr([retIslr({ factura_control: '' })])
    expect(r.problemas).toEqual([])
  })

  it('concepto sin código oficial es problema del equipo, avisado una vez por concepto', () => {
    const r = revisarIslr([retIslr({ codigo_seniat: null }), retIslr({ id: 'i2', codigo_seniat: null })])
    const p = r.problemas.filter((x) => x.codigo === 'CONCEPTO_SIN_CODIGO')
    expect(p).toHaveLength(1)
    expect(p[0].arreglo).toEqual({ tipo: 'equipo', id: 'c2' })
    expect(p[0].mensaje).toContain('Ya le avisamos al equipo')
  })

  it('no exige comprobante de 14 dígitos ni control', () => {
    const r = revisarIslr([retIslr({ numero_comprobante: '', factura_control: null })])
    expect(r.problemas).toEqual([])
  })

  it('el monto considera el sustraendo (UT × valor)', () => {
    // 2000 × 3% = 60; sustraendo 83.33 × 9 = 749.97 → no puede ser negativo: 0
    expect(montoCuadra(retIslr({ porcentaje_retencion: 3, monto_retenido: 0, sustraendo_ut: 83.33 }))).toBe(true)
    // base 100000 × 3% = 3000 - 749.97 = 2250.03
    expect(montoCuadra(retIslr({ base_imponible: 100000, porcentaje_retencion: 3, sustraendo_ut: 83.33, monto_retenido: 2250.03 }))).toBe(true)
    expect(montoCuadra(retIslr({ monto_retenido: 99 }))).toBe(false)
  })

  it('número de factura solo con letras no sirve; con guiones se limpia y se avisa', () => {
    expect(revisarIslr([retIslr({ factura_numero: 'ABC' })]).problemas.some((p) => p.codigo === 'FACTURA_SIN_NUMERO')).toBe(true)
    const r = revisarIslr([retIslr()])
    expect(r.problemas).toEqual([])
    expect(r.normalizaciones.some((n) => n.mensaje.includes('1234'))).toBe(true)
  })

  it('falta la fecha de la factura', () => {
    expect(revisarIslr([retIslr({ factura_fecha: null })]).problemas.some((p) => p.codigo === 'FACTURA_SIN_FECHA')).toBe(true)
  })
})
