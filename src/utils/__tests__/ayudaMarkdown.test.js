// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderizarMarkdown, sanitizarHtml, idDeEncabezado } from '../ayudaMarkdown.js'

describe('sanitizarHtml', () => {
  it('quita scripts y manejadores de eventos', () => {
    const html = sanitizarHtml('<p onclick="robar()">hola</p><script>alert(1)</script><img src="x" onerror="alert(1)">')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/onclick|onerror/i)
    expect(html).toContain('hola')
  })
  it('quita enlaces javascript:, iframes y formularios', () => {
    const html = sanitizarHtml('<a href="javascript:alert(1)">x</a><iframe src="https://malo.test"></iframe><form action="/x"><input></form>')
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/<iframe|<form|<input/i)
  })
  it('conserva el formato normal', () => {
    expect(sanitizarHtml('<h2 id="a">Título</h2><ol><li>Uno</li></ol>')).toContain('<ol><li>Uno</li></ol>')
  })
})

describe('renderizarMarkdown', () => {
  it('convierte Markdown a HTML con índice de encabezados 2 y 3', () => {
    const { html, indice } = renderizarMarkdown('# Título\n\n## ¿Cómo voy?\n\n### Detalle\n\n1. Paso uno\n2. Paso dos')
    expect(html).toContain('<h2 id="como-voy">')
    expect(html).toContain('<ol>')
    expect(indice).toEqual([
      { id: 'como-voy', texto: '¿Cómo voy?', nivel: 2 },
      { id: 'detalle', texto: 'Detalle', nivel: 3 },
    ])
  })
  it('no repite ids de encabezados iguales', () => {
    const { indice } = renderizarMarkdown('## Paso\n\n## Paso')
    expect(indice.map((h) => h.id)).toEqual(['paso', 'paso-2'])
  })
  it('sanea el HTML que venga dentro del Markdown', () => {
    const { html } = renderizarMarkdown('Hola <script>alert(1)</script> [malo](javascript:alert(1)) <img src=x onerror=alert(1)>')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/javascript:/i)
    expect(html).not.toMatch(/onerror/i)
  })
  it('los bloques de código llevan botón Copiar y escapan el contenido', () => {
    const { html } = renderizarMarkdown('```bash\ncurl -H "x-api-key: ads_x" <url>\n```')
    expect(html).toContain('data-copiar')
    expect(html).toContain('ayuda-codigo')
    expect(html).toContain('x-api-key')
    expect(html).not.toContain('<url>')
  })
  it('los enlaces externos abren aparte y los internos no', () => {
    const { html } = renderizarMarkdown('[afuera](https://ejemplo.com) y [adentro](/ayuda/api)')
    expect(html).toMatch(/href="https:\/\/ejemplo.com"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/)
    expect(html).toContain('<a href="/ayuda/api">adentro</a>')
  })
  it('el Markdown vacío no falla', () => {
    expect(renderizarMarkdown('')).toEqual({ html: '', indice: [] })
  })
})

describe('idDeEncabezado', () => {
  it('quita acentos y signos', () => {
    expect(idDeEncabezado('Mi mercancía (Foto y listo)')).toBe('mi-mercancia-foto-y-listo')
  })
})
