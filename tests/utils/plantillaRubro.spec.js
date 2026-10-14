import { describe, it, expect } from 'vitest'
import { RUBROS } from '@/constants/rubros.js'
import { columnasPlantilla, filasEjemplo } from '@/components/inventario/plantillaRubro.js'
import { sugerirMapeo, filasDesdeMatriz, planificar } from '@/utils/importacionProductos.js'

describe('plantilla por rubro', () => {
  it.each(RUBROS.map((r) => r.valor))('%s: la plantilla se reconoce sola y sus ejemplos son válidos', (rubro) => {
    const cols = columnasPlantilla(rubro)
    const encabezados = cols.map((c) => c.titulo)
    const mapeo = sugerirMapeo(encabezados, rubro)
    expect(mapeo).toEqual(cols.map((c) => c.clave))

    const matriz = [encabezados, ...filasEjemplo(rubro)]
    const filas = filasDesdeMatriz(matriz, 0, mapeo)
    const { filas: plan, resumen } = planificar(filas, { rubro }, [])
    expect(plan.filter((f) => f.estado === 'error').map((f) => f.errores)).toEqual([])
    expect(resumen.nuevos).toBe(filas.length)
  })

  it('servicios no lleva costo ni existencias', () => {
    const claves = columnasPlantilla('servicios').map((c) => c.clave)
    expect(claves).not.toContain('costo')
    expect(claves).not.toContain('existencias')
  })
})
