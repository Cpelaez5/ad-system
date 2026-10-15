import { describe, it, expect } from 'vitest'
import {
  rifDeCatalogo, validarProveedor, validarProducto, filtroBusqueda, limpiarBusqueda, ordenarCatalogo,
  extensionFoto, rutaFotoCatalogo, errorFoto, filasSemilla, fusionarSemilla, FILTROS_CATALOGO,
} from '../catalogoAdmin'

const EAN_A = '7591039000015'
const EAN_B = '7591039000022'

describe('rifDeCatalogo', () => {
  it('acepta J/G/C con 9 dígitos y lo deja canónico', () => {
    expect(rifDeCatalogo('j-12345678-9')).toEqual({ rifNormalizado: 'J123456789', rif: 'J-12345678-9' })
    expect(rifDeCatalogo('RIF G200001234')).toEqual({ rifNormalizado: 'G200001234', rif: 'G-20000123-4' })
    expect(rifDeCatalogo('C-00000001-0')).not.toBeNull()
  })
  it('rechaza personas naturales y formatos incompletos', () => {
    expect(rifDeCatalogo('V-12345678-9')).toBeNull()
    expect(rifDeCatalogo('E-12345678-9')).toBeNull()
    expect(rifDeCatalogo('J-1234567')).toBeNull()
    expect(rifDeCatalogo('')).toBeNull()
  })
})

describe('validarProveedor', () => {
  it('arma el valor listo para guardar', () => {
    const r = validarProveedor({ rif: 'G-20000123-4', razon_social: '  Alcaldía de Prueba ', domicilio_fiscal: '' })
    expect(r.ok).toBe(true)
    expect(r.valor).toMatchObject({ rif_normalizado: 'G200001234', tipo_persona: 'gobierno', razon_social: 'Alcaldía de Prueba', domicilio_fiscal: null })
  })
  it('explica qué falta', () => {
    const r = validarProveedor({ rif: 'V-1', razon_social: 'a' })
    expect(r.ok).toBe(false)
    expect(Object.keys(r.errores)).toEqual(['rif', 'razon_social'])
    expect(r.valor).toBeNull()
  })
})

describe('validarProducto', () => {
  it('valida el dígito verificador del código de barras', () => {
    expect(validarProducto({ codigo_barras: EAN_A, nombre: 'Harina PAN 1 kg' }).ok).toBe(true)
    const mala = validarProducto({ codigo_barras: '7591039000016', nombre: 'Harina' })
    expect(mala.ok).toBe(false)
    expect(mala.errores.codigo_barras).toMatch(/no es válido/)
  })
  it('limpia espacios y guiones del código y exige nombre', () => {
    const r = validarProducto({ codigo_barras: '7591 0390-00015', nombre: 'Harina', marca: ' PAN ' })
    expect(r.valor).toMatchObject({ codigo_barras: EAN_A, marca: 'PAN', categoria: null })
    expect(validarProducto({ codigo_barras: EAN_A, nombre: '' }).errores.nombre).toBeTruthy()
  })
})

describe('búsqueda y orden', () => {
  it('limpia lo que rompe el filtro or de PostgREST', () => {
    expect(limpiarBusqueda('  harina, (pan) %  ')).toBe('harina pan')
  })
  it('arma el filtro por tipo y devuelve vacío sin texto', () => {
    expect(filtroBusqueda('productos', '')).toBe('')
    expect(filtroBusqueda('proveedores', 'polar')).toContain('razon_social.ilike.%polar%')
    expect(filtroBusqueda('productos', 'polar')).toContain('codigo_barras.ilike.%polar%')
  })
  it('por verificar: más confirmaciones primero', () => {
    const lista = [{ id: 1, confirmaciones: 1 }, { id: 2, confirmaciones: 5 }, { id: 3, confirmaciones: 3 }]
    expect(ordenarCatalogo(lista, FILTROS_CATALOGO.POR_VERIFICAR).map((x) => x.id)).toEqual([2, 3, 1])
    expect(ordenarCatalogo(lista, FILTROS_CATALOGO.TODOS).map((x) => x.id)).toEqual([1, 2, 3])
  })
})

describe('foto de estudio', () => {
  it('ruta productos/<codigo>.<ext>', () => {
    expect(rutaFotoCatalogo(EAN_A, 'png')).toBe(`productos/${EAN_A}.png`)
    expect(rutaFotoCatalogo('123', 'png')).toBeNull()
    expect(rutaFotoCatalogo(EAN_A, 'gif')).toBeNull()
  })
  it('extensión por tipo o nombre, jpeg cuenta como jpg', () => {
    expect(extensionFoto({ name: 'a.JPEG', type: '' })).toBe('jpg')
    expect(extensionFoto({ name: 'a.bin', type: 'image/webp' })).toBe('webp')
    expect(extensionFoto({ name: 'a.gif', type: 'image/gif' })).toBeNull()
  })
  it('rechaza archivos grandes o de otro tipo', () => {
    expect(errorFoto({ name: 'a.png', type: 'image/png', size: 10 })).toBe('')
    expect(errorFoto({ name: 'a.png', type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/)
    expect(errorFoto({ name: 'a.pdf', type: 'application/pdf', size: 10 })).toMatch(/JPG/)
  })
})

describe('semilla de Excel', () => {
  const matriz = [
    ['Producto', 'Marca', 'Categoría', 'Presentación', 'Unidad', 'Código de barras'],
    ['Harina PAN 1 kg', 'PAN', 'Víveres', '1 kg', 'kg', 7591039000015],
    ['Arroz Mary', '', 'Víveres', '1 kg', 'und', '7591039000022'],
    ['Repetido', '', '', '', '', EAN_A],
    ['Sin código válido', '', '', '', '', '123'],
    ['', '', '', '', '', EAN_B],
  ]
  it('detecta columnas, valida, deduplica y reporta errores', () => {
    const r = filasSemilla(matriz)
    expect(r.columnasFaltantes).toEqual([])
    expect(r.validas).toHaveLength(2)
    expect(r.validas[0]).toMatchObject({ codigo_barras: EAN_A, nombre: 'Harina PAN 1 kg', marca: 'PAN', categoria: 'Víveres', presentacion: '1 kg', unidad: 'KG' })
    expect(r.duplicadas).toBe(1)
    expect(r.errores.map((e) => e.fila)).toEqual([5, 6])
  })
  it('avisa si falta la columna del código de barras', () => {
    const r = filasSemilla([['Producto', 'Marca'], ['Harina', 'PAN']])
    expect(r.columnasFaltantes).toEqual(['codigo_barras'])
    expect(r.validas).toEqual([])
  })
  it('fusionar: un dato vacío del Excel no borra el existente', () => {
    const f = fusionarSemilla({ codigo_barras: EAN_A, nombre: 'Harina', marca: null, categoria: 'Víveres', presentacion: null, unidad: null }, { marca: 'PAN', categoria: 'Otra', presentacion: '1 kg', unidad: 'KG', nombre: 'x' })
    expect(f).toMatchObject({ marca: 'PAN', categoria: 'Víveres', presentacion: '1 kg', unidad: 'KG', fuente: 'importado' })
    expect(fusionarSemilla({ codigo_barras: EAN_A, nombre: 'N' }, null).fuente).toBe('importado')
  })
})
