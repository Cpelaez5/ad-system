import { describe, it, expect } from 'vitest'
import { sugerirCategoria } from '../sugerirCategoria'

describe('sugerirCategoria', () => {
  it('sugiere Electricidad para CORPELEC por palabra clave', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' },
      items: [],
      textoOcr: ''
    })
    expect(r.categoria).toBe('Electricidad')
    expect(r.confianza).toBeGreaterThan(0)
  })

  it('sugiere Internet y telefonía para el proveedor "Inter"', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Inter, C.A.', rif: 'J-11111111-1' }
    })
    expect(r.categoria).toBe('Internet y telefonía')
  })

  it('sugiere Papelería e imprenta para "imprenta digital"', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Imprenta Digital Caracas' }
    })
    expect(r.categoria).toBe('Papelería e imprenta')
  })

  it('sugiere Compras en línea para Amazon', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Amazon.com' },
      items: [{ description: 'Cable USB' }]
    })
    expect(r.categoria).toBe('Compras en línea')
  })

  it('prioriza el historial del proveedor sobre las palabras clave', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'CORPELEC', rif: 'J-00000000-0' },
      historial: [
        { proveedorRif: 'J-00000000-0', categoriaNombre: 'Servicios públicos', fecha: '2026-09-01' },
        { proveedorRif: 'J-00000000-0', categoriaNombre: 'Electricidad vieja', fecha: '2026-06-01' }
      ]
    })
    expect(r.categoria).toBe('Servicios públicos')
    expect(r.confianza).toBeGreaterThanOrEqual(0.9)
  })

  it('matchea el historial por nombre cuando no hay RIF', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Panadería El Trigal' },
      historial: [
        { proveedorNombre: 'Panadería El Trigal', categoriaNombre: 'Comida del equipo', fecha: '2026-05-01' }
      ]
    })
    expect(r.categoria).toBe('Comida del equipo')
  })

  it('usa la pista de la IA cuando no hay historial ni palabra clave', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Distribuidora XYZ' },
      categoriaIA: 'Mantenimiento de equipos'
    })
    expect(r.categoria).toBe('Mantenimiento de equipos')
    expect(r.confianza).toBeGreaterThan(0)
    expect(r.confianza).toBeLessThan(0.65)
  })

  it('no sugiere nada si no hay ninguna señal', () => {
    const r = sugerirCategoria({ proveedor: { nombre: 'Distribuidora XYZ' } })
    expect(r.categoria).toBeNull()
    expect(r.confianza).toBe(0)
  })

  it('no lanza con parámetros vacíos', () => {
    expect(() => sugerirCategoria({})).not.toThrow()
    expect(() => sugerirCategoria(undefined)).not.toThrow()
  })

  // I9: falsos positivos del vocabulario venezolano ──────────────────────
  it('no sugiere Combustible por "Pago PDV" en las notas (PDV = punto de venta)', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Distribuidora XYZ' },
      textoOcr: 'Pago PDV Banesco'
    })
    expect(r.categoria).not.toBe('Combustible')
  })

  it('no sugiere nada a partir de una etiqueta "Teléfono:" en las notas', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Distribuidora XYZ' },
      textoOcr: 'Teléfono: 0212-1234567'
    })
    expect(r.categoria).toBeNull()
  })

  it('no confunde una "ferretería eléctrica" con el servicio de Electricidad', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'Ferretería Eléctrica Los Andes' }
    })
    expect(r.categoria).not.toBe('Electricidad')
  })

  it('sí sugiere Combustible con "PDVSA" (Petróleos de Venezuela)', () => {
    const r = sugerirCategoria({
      proveedor: { nombre: 'PDVSA Estación El Llanito' }
    })
    expect(r.categoria).toBe('Combustible')
  })
})
