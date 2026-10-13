/**
 * Tests unitarios de la lógica de OCR inteligente usada en SimpleInvoiceForm.vue
 * (Tarea C — ola Fase 2b): matching/creación de proveedor nuevo y sugerencia
 * de categoría de gasto.
 *
 * M10 (revisión ola F2b): antes este archivo REIMPLEMENTABA la misma lógica
 * de decisión que usan `matchProveedorFromOcr` y `sugerirYPrellenarCategoria`
 * dentro de SimpleInvoiceForm.vue, así que si el componente cambiaba, el test
 * seguía en verde sin detectarlo. Ahora importa las funciones puras REALES
 * (`decidirMatchProveedor`/`construirProveedorPendiente` de
 * src/utils/matchProveedorOcr.js, `resolverCategoriaPorNombre` de
 * src/utils/sugerirCategoria.js) que el propio componente llama — ver
 * SimpleInvoiceForm.vue → matchProveedorFromOcr / _buscarCategoriaPorNombre.
 *
 * Los RIF son inventados pero con un dígito verificador calculado de verdad
 * con el algoritmo del SENIAT (ver src/utils/rif.js), igual que en
 * rif.test.js: ninguno corresponde a un contribuyente real.
 */
import { describe, it, expect } from 'vitest'
import { decidirMatchProveedor, construirProveedorPendiente } from '@/utils/matchProveedorOcr.js'
import { sugerirCategoria, resolverCategoriaPorNombre } from '@/utils/sugerirCategoria.js'
import { normalizarRif } from '@/utils/rif.js'

describe('decidirMatchProveedor (matching real de SimpleInvoiceForm)', () => {
  it('vincula por RIF exacto aunque el formato difiera (BD con guiones, OCR sin ellos)', () => {
    const proveedores = [{ id: 'p1', nombre: 'Corpelec', rif: 'J-00000000-0' }]
    const r = decidirMatchProveedor({ companyName: 'CORPELEC C.A.', rif: 'j000000000' }, proveedores)
    expect(r.matched?.id).toBe('p1')
    expect(r.confidence).toBe('exact-rif')
    expect(r.pendiente).toBeNull()
  })

  it('vincula por nombre exacto cuando el RIF no coincide o falta', () => {
    const proveedores = [{ id: 'p2', nombre: 'Distribuidora López', rif: 'J-11111111-0' }]
    const r = decidirMatchProveedor({ companyName: 'Distribuidora López', rif: null }, proveedores)
    expect(r.matched?.id).toBe('p2')
    expect(r.confidence).toBe('exact-name')
  })

  it('vincula por coincidencia parcial de nombre', () => {
    const proveedores = [{ id: 'p3', nombre: 'Panadería y Pastelería El Trigal C.A.', rif: 'J-22222222-1' }]
    const r = decidirMatchProveedor({ companyName: 'El Trigal', rif: null }, proveedores)
    expect(r.matched?.id).toBe('p3')
    expect(r.confidence).toBe('partial-name')
  })

  it('sin match y con RIF reconocible (válido): deja proveedor "pendiente" (se crea al guardar)', () => {
    const proveedores = [{ id: 'p1', nombre: 'Otro Proveedor', rif: 'J-33333333-2' }]
    const r = decidirMatchProveedor({ companyName: 'Ferretería Nueva', rif: 'J-44444444-3' }, proveedores)
    expect(r.matched).toBeNull()
    expect(r.pendiente).toEqual({
      nombre: 'Ferretería Nueva',
      rif: 'J-44444444-3',
      direccion: '',
      telefono: '',
      email: ''
    })
  })

  it('sin proveedores en el directorio: también deja proveedor pendiente si el RIF es válido', () => {
    const r = decidirMatchProveedor({ companyName: 'Importadora XYZ', rif: 'j987654324' }, [])
    expect(r.matched).toBeNull()
    expect(r.pendiente?.rif).toBe('J-98765432-4')
  })

  it('sin match y sin RIF reconocible: NO deja proveedor pendiente (no se puede crear sin RIF)', () => {
    const r = decidirMatchProveedor({ companyName: 'Vendedor Ambulante', rif: null }, [])
    expect(r.matched).toBeNull()
    expect(r.pendiente).toBeNull()
  })

  it('I2: un RIF con dígito verificador inválido (OCR leyó mal un dígito) tampoco deja pendiente', () => {
    // El DV real de J+44444444 es 3, no 9: `normalizarRif` lo rechaza.
    const r = decidirMatchProveedor({ companyName: 'Ferretería Dudosa', rif: 'J-44444444-9' }, [])
    expect(normalizarRif('J-44444444-9')).toBeNull()
    expect(r.matched).toBeNull()
    expect(r.pendiente).toBeNull()
  })
})

describe('construirProveedorPendiente', () => {
  it('arma los datos del proveedor pendiente a partir del RIF ya normalizado', () => {
    const p = construirProveedorPendiente(
      { companyName: 'Ferretería Nueva', address: 'Av. Principal', phone: '0212-1234567', email: 'a@b.com' },
      'J-44444444-3'
    )
    expect(p).toEqual({
      nombre: 'Ferretería Nueva',
      rif: 'J-44444444-3',
      direccion: 'Av. Principal',
      telefono: '0212-1234567',
      email: 'a@b.com'
    })
  })

  it('devuelve null sin RIF normalizado, aunque haya nombre', () => {
    expect(construirProveedorPendiente({ companyName: 'Ferretería Nueva' }, null)).toBeNull()
  })

  it('devuelve null sin nombre, aunque el RIF sea válido', () => {
    expect(construirProveedorPendiente({ companyName: '' }, 'J-44444444-3')).toBeNull()
  })
})

// ── sugerirYPrellenarCategoria: sugerirCategoria (real) + resolverCategoriaPorNombre (real) ──
describe('Tarea C — OCR: prellenado de categoría sugerida', () => {
  it('prellena expense_category_id cuando la categoría sugerida existe en el cliente', () => {
    const sugerencia = sugerirCategoria({ proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' } })
    expect(sugerencia.categoria).toBe('Electricidad')

    const categoria = resolverCategoriaPorNombre(sugerencia.categoria, [
      { id: 'cat-1', name: 'Electricidad' },
      { id: 'cat-2', name: 'Internet y telefonía' }
    ])
    expect(categoria?.id).toBe('cat-1')
  })

  it('no prellena nada si la categoría sugerida no existe para ese cliente (no la inventa)', () => {
    const sugerencia = sugerirCategoria({ proveedor: { nombre: 'Amazon.com' } })
    expect(sugerencia.categoria).toBe('Compras en línea')

    const categoria = resolverCategoriaPorNombre(sugerencia.categoria, [{ id: 'cat-9', name: 'Nómina' }])
    expect(categoria).toBeNull()
  })

  it('prioriza el historial del proveedor (id de su categoría habitual) sobre palabras clave', () => {
    const sugerencia = sugerirCategoria({
      proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' },
      historial: [{ proveedorRif: 'J-00000000-0', categoriaNombre: 'Servicios de luz', fecha: '2026-09-01' }]
    })
    expect(sugerencia.categoria).toBe('Servicios de luz')
    expect(sugerencia.confianza).toBeGreaterThanOrEqual(0.9)

    const categoria = resolverCategoriaPorNombre(sugerencia.categoria, [
      { id: 'cat-luz', name: 'Servicios de luz' },
      { id: 'cat-elec', name: 'Electricidad' }
    ])
    expect(categoria?.id).toBe('cat-luz')
  })

  it('usa la pista de la IA del OCR como último recurso', () => {
    const sugerencia = sugerirCategoria({
      proveedor: { nombre: 'Distribuidora XYZ' },
      categoriaIA: 'Mantenimiento de equipos'
    })
    expect(sugerencia.categoria).toBe('Mantenimiento de equipos')

    const categoria = resolverCategoriaPorNombre(sugerencia.categoria, [{ id: 'cat-mant', name: 'Mantenimiento de equipos' }])
    expect(categoria?.id).toBe('cat-mant')
  })

  it('I9: no elige una categoría por coincidencia parcial (solo nombre exacto normalizado)', () => {
    // "Electricidad" sugerido no debe matchear "Electricidad del hogar" por
    // subcadena — antes `_buscarCategoriaPorNombre` sí lo hacía.
    const categoria = resolverCategoriaPorNombre('Electricidad', [{ id: 'cat-x', name: 'Electricidad del hogar' }])
    expect(categoria).toBeNull()
  })
})
