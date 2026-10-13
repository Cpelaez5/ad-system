/**
 * Tests unitarios de la lógica de OCR inteligente añadida en SimpleInvoiceForm.vue
 * (Tarea C — ola Fase 2b): matching/creación de proveedor nuevo y sugerencia
 * de categoría de gasto.
 *
 * Siguiendo la convención de retentionCorrelatives.test.js: en vez de montar
 * el componente completo (pesado, con Vuetify + muchos hijos), se reproduce
 * aquí la MISMA lógica de decisión que usan `matchProveedorFromOcr` y
 * `sugerirYPrellenarCategoria` dentro de SimpleInvoiceForm.vue, operando
 * sobre un `ctx` simple. Las funciones puras de las que depende
 * (`normalizarRif`, `sugerirCategoria`) se importan de verdad.
 */
import { describe, it, expect } from 'vitest'
import { normalizarRif } from '@/utils/rif.js'
import { sugerirCategoria } from '@/utils/sugerirCategoria.js'

// ── Reproduce matchProveedorFromOcr (niveles de match + decisión de "pendiente") ──
function decidirMatchProveedor(issuerData, proveedores) {
  const normalizeName = (name) => String(name || '').toLowerCase().trim()
  const ocrRif = normalizarRif(issuerData.rif)
  const ocrName = normalizeName(issuerData.companyName)

  if (proveedores.length === 0) {
    return { matched: null, pendiente: construirPendiente(issuerData, ocrRif) }
  }

  let matched = null
  if (ocrRif) {
    matched = proveedores.find(p => normalizarRif(p.rif) === ocrRif) || null
  }
  if (!matched && ocrName && ocrName.length >= 3) {
    matched = proveedores.find(p => normalizeName(p.nombre) === ocrName) || null
  }
  if (!matched && ocrName && ocrName.length >= 5) {
    matched = proveedores.find(p => {
      const pName = normalizeName(p.nombre)
      return pName.includes(ocrName) || ocrName.includes(pName)
    }) || null
  }

  if (matched) return { matched, pendiente: null }
  return { matched: null, pendiente: construirPendiente(issuerData, ocrRif) }
}

// ── Reproduce _ofrecerCrearProveedor: solo deja "pendiente" (auto-crear al
//    guardar) si el RIF se pudo reconocer; si no, no hay nada que auto-crear.
function construirPendiente(issuerData, ocrRifNormalizado) {
  if (!ocrRifNormalizado || !issuerData.companyName) return null
  return {
    nombre: issuerData.companyName,
    rif: ocrRifNormalizado,
    direccion: issuerData.address || '',
    telefono: issuerData.phone || '',
    email: issuerData.email || ''
  }
}

describe('Tarea C — OCR: matching y creación pendiente de proveedor', () => {
  it('vincula por RIF exacto aunque el formato difiera (BD con guiones, OCR sin ellos)', () => {
    const proveedores = [{ id: 'p1', nombre: 'Corpelec', rif: 'J-00000000-1' }]
    const r = decidirMatchProveedor({ companyName: 'CORPELEC C.A.', rif: 'j000000001' }, proveedores)
    expect(r.matched?.id).toBe('p1')
    expect(r.pendiente).toBeNull()
  })

  it('vincula por nombre exacto cuando el RIF no coincide o falta', () => {
    const proveedores = [{ id: 'p2', nombre: 'Distribuidora López', rif: 'J-11111111-1' }]
    const r = decidirMatchProveedor({ companyName: 'Distribuidora López', rif: null }, proveedores)
    expect(r.matched?.id).toBe('p2')
  })

  it('vincula por coincidencia parcial de nombre', () => {
    const proveedores = [{ id: 'p3', nombre: 'Panadería y Pastelería El Trigal C.A.', rif: 'J-22222222-2' }]
    const r = decidirMatchProveedor({ companyName: 'El Trigal', rif: null }, proveedores)
    expect(r.matched?.id).toBe('p3')
  })

  it('sin match y con RIF reconocible: deja proveedor "pendiente" (se crea al guardar)', () => {
    const proveedores = [{ id: 'p1', nombre: 'Otro Proveedor', rif: 'J-33333333-3' }]
    const r = decidirMatchProveedor({ companyName: 'Ferretería Nueva', rif: 'J-44444444-4' }, proveedores)
    expect(r.matched).toBeNull()
    expect(r.pendiente).toEqual({
      nombre: 'Ferretería Nueva',
      rif: 'J-44444444-4',
      direccion: '',
      telefono: '',
      email: ''
    })
  })

  it('sin proveedores en el directorio: también deja proveedor pendiente si hay RIF', () => {
    const r = decidirMatchProveedor({ companyName: 'Importadora XYZ', rif: 'j987654321' }, [])
    expect(r.matched).toBeNull()
    expect(r.pendiente?.rif).toBe('J-98765432-1')
  })

  it('sin match y sin RIF reconocible: NO deja proveedor pendiente (no se puede crear sin RIF)', () => {
    const r = decidirMatchProveedor({ companyName: 'Vendedor Ambulante', rif: null }, [])
    expect(r.matched).toBeNull()
    expect(r.pendiente).toBeNull()
  })
})

// ── Reproduce sugerirYPrellenarCategoria: sugerirCategoria (real) + resolver
//    por nombre contra las categorías reales del cliente (nunca crea una nueva) ──
function normalizarTexto(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}
function resolverCategoriaSugerida({ proveedor, items, textoOcr, historial, categoriaIA, categoriasCliente }) {
  const sugerencia = sugerirCategoria({ proveedor, items, textoOcr, historial, categoriaIA })
  if (!sugerencia.categoria) return { ...sugerencia, categoriaId: null }

  const objetivo = normalizarTexto(sugerencia.categoria)
  const encontrada = categoriasCliente.find(c => normalizarTexto(c.name) === objetivo)
    || categoriasCliente.find(c => normalizarTexto(c.name).includes(objetivo) || objetivo.includes(normalizarTexto(c.name)))
    || null

  return { ...sugerencia, categoriaId: encontrada?.id || null }
}

describe('Tarea C — OCR: prellenado de categoría sugerida', () => {
  it('prellena expense_category_id cuando la categoría sugerida existe en el cliente', () => {
    const r = resolverCategoriaSugerida({
      proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' },
      items: [],
      textoOcr: '',
      historial: [],
      categoriaIA: null,
      categoriasCliente: [{ id: 'cat-1', name: 'Electricidad' }, { id: 'cat-2', name: 'Internet y telefonía' }]
    })
    expect(r.categoria).toBe('Electricidad')
    expect(r.categoriaId).toBe('cat-1')
  })

  it('no prellena nada si la categoría sugerida no existe para ese cliente (no la inventa)', () => {
    const r = resolverCategoriaSugerida({
      proveedor: { nombre: 'Amazon.com' },
      items: [],
      textoOcr: '',
      historial: [],
      categoriaIA: null,
      categoriasCliente: [{ id: 'cat-9', name: 'Nómina' }]
    })
    expect(r.categoria).toBe('Compras en línea')
    expect(r.categoriaId).toBeNull()
  })

  it('prioriza el historial del proveedor (id de su categoría habitual) sobre palabras clave', () => {
    const r = resolverCategoriaSugerida({
      proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' },
      items: [],
      textoOcr: '',
      historial: [{ proveedorRif: 'J-00000000-0', categoriaNombre: 'Servicios de luz', fecha: '2026-09-01' }],
      categoriaIA: null,
      categoriasCliente: [
        { id: 'cat-luz', name: 'Servicios de luz' },
        { id: 'cat-elec', name: 'Electricidad' }
      ]
    })
    expect(r.categoriaId).toBe('cat-luz')
  })

  it('usa la pista de la IA del OCR como último recurso', () => {
    const r = resolverCategoriaSugerida({
      proveedor: { nombre: 'Distribuidora XYZ' },
      items: [],
      textoOcr: '',
      historial: [],
      categoriaIA: 'Mantenimiento de equipos',
      categoriasCliente: [{ id: 'cat-mant', name: 'Mantenimiento de equipos' }]
    })
    expect(r.categoriaId).toBe('cat-mant')
  })
})
