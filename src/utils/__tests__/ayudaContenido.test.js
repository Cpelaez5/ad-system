/**
 * Valida los archivos reales de docs/ayuda/*.md (la fuente única de la ayuda):
 * frontmatter completo, enlaces internos válidos y sin dominios reales.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { crearArticulo, parsearFrontmatter, SLUG_FAQ, construirContextoAyuda } from '../ayudaBusqueda.js'

const carpeta = join(process.cwd(), 'docs', 'ayuda')
const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.md'))
const articulos = archivos.map((f) => crearArticulo(f.replace(/\.md$/, ''), readFileSync(join(carpeta, f), 'utf8')))
const slugs = new Set(articulos.map((a) => a.slug))

describe('docs/ayuda', () => {
  it('trae los artículos pedidos', () => {
    for (const s of ['primeros-pasos', 'registrar', 'mis-movimientos', 'como-voy', 'mis-papeles', 'mi-mercancia',
      'mis-proveedores', 'mis-clientes', 'mi-negocio', 'retenciones', 'seniat-retenciones', 'mi-plan-y-pagos', SLUG_FAQ, 'api']) {
      expect(slugs.has(s), s).toBe(true)
    }
  })

  it.each(archivos)('%s tiene frontmatter completo', (f) => {
    const { datos } = parsearFrontmatter(readFileSync(join(carpeta, f), 'utf8'))
    expect(datos.titulo, 'titulo').toBeTruthy()
    expect(datos.resumen, 'resumen').toBeTruthy()
    expect(datos.palabras.length, 'palabras').toBeGreaterThan(2)
    expect(datos.orden, 'orden').toBeLessThan(999)
  })

  it('los órdenes no se repiten', () => {
    const ordenes = articulos.map((a) => a.orden)
    expect(new Set(ordenes).size).toBe(ordenes.length)
  })

  it('todos los enlaces internos /ayuda/... apuntan a un artículo que existe', () => {
    for (const f of archivos) {
      const texto = readFileSync(join(carpeta, f), 'utf8')
      for (const m of texto.matchAll(/\]\(\/ayuda\/([a-z0-9-]+)\)/g)) {
        expect(slugs.has(m[1]), `${f} → ${m[1]}`).toBe(true)
      }
    }
  })

  it('no escribe un dominio real de Supabase', () => {
    for (const f of archivos) {
      const texto = readFileSync(join(carpeta, f), 'utf8')
      expect(texto.replace(/<proyecto>\.supabase\.co/g, ''), f).not.toMatch(/[a-z0-9]{15,}\.supabase\.co/)
    }
  })

  it('la API documenta la autenticación y las reglas clave', () => {
    const api = articulos.find((a) => a.slug === 'api').cuerpo
    for (const t of ['x-api-key', '500', 'codigo_barras', 'existencias', 'exento', 'VES', 'CAJA', 'LLAVE', 'LOTE', 'curl', 'fetch']) {
      expect(api, t).toContain(t)
    }
  })

  it('buscar "tasa" lleva a Mi negocio y el chat recibe esa guía', () => {
    expect(construirContextoAyuda(articulos, '¿cómo cambio la tasa del dólar?')).toContain('### Guía: Mi negocio')
  })
})
