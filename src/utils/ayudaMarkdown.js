/**
 * ayudaMarkdown — convierte el Markdown de la ayuda a HTML SEGURO.
 * Siempre pasa por DOMPurify: nada de lo que venga del Markdown llega al DOM sin sanear.
 */
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import { normalizar } from './ayudaBusqueda.js'

/** Identificador de ancla para un encabezado ("¿Cómo voy?" → "como-voy"). */
export function idDeEncabezado(texto) {
  return normalizar(texto).replace(/\s+/g, '-') || 'seccion'
}

const escapar = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Quita todo lo peligroso del HTML (scripts, eventos, javascript:, iframes…). */
export function sanitizarHtml(html) {
  // Sin un DOM completo DOMPurify no puede sanear (devolvería el HTML tal cual):
  // en ese caso se escapa todo, así nunca pasa HTML sin revisar.
  if (!DOMPurify.isSupported) return escapar(html)
  return DOMPurify.sanitize(String(html ?? ''), {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
    ADD_ATTR: ['target'],
  })
}

/**
 * @param {string} markdown
 * @returns {{ html: string, indice: { id: string, texto: string, nivel: number }[] }}
 *   `indice` trae los encabezados de nivel 2 y 3, para la tabla de contenido.
 */
export function renderizarMarkdown(markdown) {
  const indice = []
  const usados = new Map()
  const marked = new Marked({ gfm: true, breaks: false })
  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const interior = this.parser.parseInline(tokens)
        let id = idDeEncabezado(text)
        const n = usados.get(id) || 0
        usados.set(id, n + 1)
        if (n) id = `${id}-${n + 1}`
        if (depth === 2 || depth === 3) indice.push({ id, texto: text.replace(/[*_`]/g, ''), nivel: depth })
        return `<h${depth} id="${id}">${interior}</h${depth}>\n`
      },
      code({ text, lang }) {
        const etiqueta = lang ? `<span class="ayuda-codigo__lenguaje">${escapar(lang)}</span>` : ''
        return `<div class="ayuda-codigo">${etiqueta}<button type="button" class="ayuda-codigo__copiar" data-copiar>Copiar</button><pre><code>${escapar(text)}</code></pre></div>\n`
      },
      link({ href, title, tokens }) {
        const interior = this.parser.parseInline(tokens)
        const externo = /^https?:\/\//i.test(href)
        const t = title ? ` title="${escapar(title)}"` : ''
        return `<a href="${escapar(href)}"${t}${externo ? ' target="_blank" rel="noopener noreferrer"' : ''}>${interior}</a>`
      },
    },
  })
  const html = sanitizarHtml(marked.parse(String(markdown ?? '')))
  return { html, indice }
}
