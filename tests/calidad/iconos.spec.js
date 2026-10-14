// Todo ícono `mdi-*` usado en src/ debe existir en la versión instalada de @mdi/font.
// Un nombre inexistente no da error: se dibuja un hueco (p. ej. "mdi-receipt-long",
// que es de Material Symbols, salía como un círculo vacío en el detalle de factura).
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const RAIZ = path.resolve(__dirname, '../..')
// Clases utilitarias de @mdi/font que no son íconos
const NO_ICONOS = new Set(['mdi-set', 'mdi-spin', 'mdi-rotate', 'mdi-flip', 'mdi-light', 'mdi-dark', 'mdi-inactive', 'mdi-font', 'mdi-icon'])

function archivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : archivos(ruta)
    return /\.(vue|js)$/.test(e.name) ? [ruta] : []
  })
}

describe('íconos MDI', () => {
  it('todos los nombres mdi-* usados en src existen en @mdi/font', () => {
    const css = fs.readFileSync(path.join(RAIZ, 'node_modules/@mdi/font/css/materialdesignicons.css'), 'utf8')
    const validos = new Set([...css.matchAll(/\.(mdi-[a-z0-9-]+)::before/g)].map((m) => m[1]))

    const invalidos = new Map()
    for (const archivo of archivos(path.join(RAIZ, 'src'))) {
      const texto = fs.readFileSync(archivo, 'utf8')
      for (const [nombre] of texto.matchAll(/\bmdi-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
        if (validos.has(nombre) || NO_ICONOS.has(nombre) || /^mdi-(\d+px|rotate-\d+|flip-[hv])$/.test(nombre)) continue
        invalidos.set(nombre, path.relative(RAIZ, archivo))
      }
    }
    expect(Object.fromEntries(invalidos)).toEqual({})
  })
})
