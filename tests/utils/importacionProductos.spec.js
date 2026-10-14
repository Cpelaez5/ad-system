import { describe, it, expect } from 'vitest'
import {
  normalizar, parseNumero, detectarMoneda, detectarEncabezados, sugerirMapeo, monedasPorColumna,
  filasDesdeMatriz, construirFila, planificar, textoResumen, mensajeFila, puedeDeshacer, enLotes,
  parseIva, parseUnidad, parseFecha,
} from '@/utils/importacionProductos.js'

describe('parseNumero', () => {
  it.each([
    ['1.234,56', 1234.56], ['1,234.56', 1234.56], ['$10', 10], ['Bs 1.250,50', 1250.5], ['10,5', 10.5],
    ['1.234', 1234], ['0.125', 0.125], ['1.234.567', 1234567], ['USD 3.5', 3.5], [12, 12], ['(5)', -5],
  ])('%s -> %s', (entrada, esperado) => expect(parseNumero(entrada)).toBeCloseTo(esperado))
  it('vacío es null y texto es NaN', () => {
    expect(parseNumero('')).toBeNull()
    expect(parseNumero(undefined)).toBeNull()
    expect(parseNumero('diez')).toBeNaN()
  })
})

describe('detectarMoneda', () => {
  it('reconoce símbolos', () => {
    expect(detectarMoneda('$10')).toBe('USD')
    expect(detectarMoneda('USD')).toBe('USD')
    expect(detectarMoneda('Bs 5')).toBe('VES')
    expect(detectarMoneda('€3')).toBe('EUR')
    expect(detectarMoneda('10')).toBeNull()
  })
})

describe('encabezados y mapeo', () => {
  const matriz = [
    ['Lista de precios 2026', '', ''],
    ['Código', 'Descripción', 'P. Venta', 'Costo unitario', 'Inv.', 'EAN', 'Columna rara'],
    ['A1', 'Harina', '$2,5', '1.5', 10, '759123', 'x'],
  ]
  it('encuentra la fila de encabezados bajo un título', () => {
    expect(detectarEncabezados(matriz)).toBe(1)
  })
  it('asocia por sinónimos y usa descripción como nombre si falta nombre', () => {
    const m = sugerirMapeo(matriz[1])
    expect(m).toEqual(['codigo', 'nombre', 'precio', 'costo', 'existencias', 'codigo_barras', ''])
  })
  it('"Precio costo" va a costo y "Precio" a precio', () => {
    expect(sugerirMapeo(['Producto', 'Precio costo', 'Precio'])).toEqual(['nombre', 'costo', 'precio'])
  })
  it('reconoce campos del rubro', () => {
    const m = sugerirMapeo(['Nombre', 'Talla', 'Color'], 'moda')
    expect(m).toEqual(['nombre', 'attr:talla', 'attr:color'])
  })
  it('moneda por encabezado', () => {
    const enc = ['Nombre', 'Precio $']
    expect(monedasPorColumna(enc, sugerirMapeo(enc))).toEqual({ precio: 'USD' })
  })
  it('filasDesdeMatriz salta vacías y numera como en el archivo', () => {
    const mat = [['Nombre', 'Precio'], ['A', 1], ['', ''], ['B', 2]]
    const filas = filasDesdeMatriz(mat, 0, ['nombre', 'precio'])
    expect(filas.map((f) => f.fila)).toEqual([2, 4])
  })
})

describe('construirFila', () => {
  it('convierte una fila válida', () => {
    const { datos, existencias, errores } = construirFila({ nombre: 'Harina', codigo: 5, precio: '$2,50', existencias: '10', unidad: 'kilos', iva: '16%' }, { rubro: 'bodega' })
    expect(errores).toEqual([])
    expect(datos).toMatchObject({ name: 'Harina', code: '5', sale_price: 2.5, currency: 'USD', unit: 'KG', tax_type: 'IVA_G', tipo: 'producto' })
    expect(existencias).toBe(10)
  })
  it('errores en lenguaje llano', () => {
    const { errores } = construirFila({ precio: 'diez' }, {})
    expect(errores.map((e) => e.mensaje)).toEqual(['Falta el nombre', 'El precio "diez" no es un número'])
  })
  it('la moneda por defecto aplica si no hay pista', () => {
    expect(construirFila({ nombre: 'A', precio: 3 }, { monedaDefecto: 'USD' }).datos.currency).toBe('USD')
    expect(construirFila({ nombre: 'A', precio: 3 }, {}).datos.currency).toBe('VES')
  })
  it('los servicios no llevan existencias ni costo', () => {
    const r = construirFila({ nombre: 'Corte', tipo: 'Servicio', costo: 5, existencias: 3, precio: 10 }, { rubro: 'belleza' })
    expect(r.datos.cost_price).toBeUndefined()
    expect(r.existencias).toBeUndefined()
    expect(r.datos.tipo).toBe('servicio')
  })
  it('el rubro servicios empieza en servicio', () => {
    expect(construirFila({ nombre: 'Asesoría' }, { rubro: 'servicios' }).datos.tipo).toBe('servicio')
  })
  it('atributos del rubro con fecha y sí/no', () => {
    const r = construirFila({ nombre: 'Jarabe', 'attr:vencimiento': '31/12/2027', 'attr:requiere_recipe': 'Sí' }, { rubro: 'farmacia' })
    expect(r.datos.atributos).toEqual({ vencimiento: '2027-12-31', requiere_recipe: true })
    const mal = construirFila({ nombre: 'x', 'attr:vencimiento': 'pronto' }, { rubro: 'farmacia' })
    expect(mal.errores).toHaveLength(1)
  })
  it('tipo desconocido es error', () => {
    expect(construirFila({ nombre: 'x', tipo: 'cosa rara' }, {}).errores).toHaveLength(1)
  })
})

describe('planificar', () => {
  const existentes = [{ id: 'e1', code: 'AB1', stock: 5 }, { id: 'e2', codigo_barras: '7591', stock: 2 }]
  const filas = [
    { fila: 2, crudo: { nombre: 'Uno', codigo: 'ab1', existencias: 8 } },
    { fila: 3, crudo: { nombre: 'Dos', codigo_barras: '7591' } },
    { fila: 4, crudo: { nombre: 'Tres', codigo: 'N1', existencias: 4 } },
    { fila: 5, crudo: { codigo: 'N2' } },
    { fila: 6, crudo: { nombre: 'Tres otra vez', codigo: 'n1' } },
  ]
  const { filas: plan, resumen } = planificar(filas, {}, existentes)
  it('clasifica', () => {
    expect(plan.map((f) => f.estado)).toEqual(['actualizar', 'actualizar', 'nuevo', 'error', 'error'])
    expect(resumen).toMatchObject({ total: 5, nuevos: 1, actualizar: 2, errores: 2, importables: 3, ajustes: 1 })
  })
  it('no pisa existencias: las deja como ajuste aparte', () => {
    expect(plan[0].ajuste).toEqual({ nuevo: 8, actual: 5, delta: 3 })
    expect(plan[0].datos.stock).toBeUndefined()
  })
  it('repetidos dentro del archivo', () => {
    expect(mensajeFila(plan[4])).toContain('Repite el código de la fila 4')
  })
  it('texto de resumen', () => {
    expect(textoResumen(resumen)).toBe('1 nuevo · 2 se actualizarán · 2 con problemas')
  })
})

describe('utilidades', () => {
  it('normalizar', () => expect(normalizar('  Código  de BARRAS ')).toBe('codigo de barras'))
  it('parseIva, parseUnidad, parseFecha', () => {
    expect(parseIva('Exento')).toBe('EXENTO')
    expect(parseIva('8')).toBe('IVA_R')
    expect(parseIva('77')).toBeUndefined()
    expect(parseUnidad('Litros')).toBe('LTS')
    expect(parseUnidad('zzz')).toBeNull()
    expect(parseFecha('2027-01-05')).toBe('2027-01-05')
    expect(parseFecha(new Date(2027, 0, 5))).toBe('2027-01-05')
    expect(parseFecha('32/13/2027')).toBeUndefined()
  })
  it('puedeDeshacer: 24 h, solo archivo, sin deshacer antes', () => {
    const base = { origen: 'archivo', ids_creados: ['a'], created_at: '2026-10-14T10:00:00Z', deshecha_en: null }
    expect(puedeDeshacer(base, new Date('2026-10-15T09:00:00Z'))).toBe(true)
    expect(puedeDeshacer(base, new Date('2026-10-15T11:00:00Z'))).toBe(false)
    expect(puedeDeshacer({ ...base, deshecha_en: 'x' }, new Date('2026-10-14T11:00:00Z'))).toBe(false)
    expect(puedeDeshacer({ ...base, origen: 'api' }, new Date('2026-10-14T11:00:00Z'))).toBe(false)
  })
  it('enLotes de 50', () => {
    expect(enLotes(Array.from({ length: 120 }, (_, i) => i), 50).map((l) => l.length)).toEqual([50, 50, 20])
  })
})
