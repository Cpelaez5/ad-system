/**
 * ayudaBusqueda — lógica PURA de la ayuda pública (sin Vue ni red).
 *
 * Fuente única: los archivos `docs/ayuda/*.md`. Aquí se parsea su frontmatter,
 * se buscan por palabras clave (sin acentos) y se arma el contexto que recibe
 * el chat de soporte con IA (v0 sin vectores, ver
 * docs/mvp/estrategia/ia-vectorial-y-documentacion.md §2 fase 2).
 */

/** Palabras que no aportan a la búsqueda. */
const PALABRAS_VACIAS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'a', 'en', 'del', 'al', 'por', 'para',
  'con', 'sin', 'que', 'como', 'cual', 'cuales', 'es', 'se', 'mi', 'mis', 'tu', 'tus', 'lo', 'le', 'les', 'me',
  'te', 'su', 'sus', 'si', 'no', 'ya', 'hay', 'puedo', 'quiero', 'donde', 'hacer', 'esta', 'este', 'esto',
])

/** Minúsculas, sin acentos ni signos; solo letras, números y espacios. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Quita la "s" final de un plural simple ("tasas" → "tasa"). */
function raiz(palabra) {
  return palabra.length > 3 && palabra.endsWith('s') ? palabra.slice(0, -1) : palabra
}

/** Palabras útiles de un texto (normalizadas, sin vacías, sin plural simple). */
export function palabrasClave(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p.length >= 2 && !PALABRAS_VACIAS.has(p))
    .map(raiz)
}

/**
 * Separa el frontmatter (`---` … `---`) del cuerpo. Solo admite `clave: valor`
 * en una línea; `palabras` se devuelve como lista y `orden` como número.
 * @returns {{ datos: { titulo?: string, resumen?: string, palabras: string[], orden: number }, cuerpo: string }}
 */
export function parsearFrontmatter(raw) {
  const texto = String(raw ?? '').replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const datos = { palabras: [], orden: 999 }
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { datos, cuerpo: texto.trim() }
  for (const linea of m[1].split('\n')) {
    const i = linea.indexOf(':')
    if (i < 1) continue
    const clave = linea.slice(0, i).trim()
    const valor = linea.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (clave === 'palabras') datos.palabras = valor.split(',').map((p) => p.trim()).filter(Boolean)
    else if (clave === 'orden') datos.orden = Number(valor) || 999
    else if (clave === 'titulo' || clave === 'resumen') datos[clave] = valor
  }
  return { datos, cuerpo: texto.slice(m[0].length).trim() }
}

/** Texto plano aproximado de un Markdown (para buscar). */
export function markdownATexto(md) {
  return String(md ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ruta de archivo → slug ("/docs/ayuda/mi-negocio.md" → "mi-negocio"). */
export function slugDeRuta(ruta) {
  return String(ruta).split('/').pop().replace(/\.md$/i, '')
}

/** Construye un artículo a partir de su slug y su Markdown crudo. */
export function crearArticulo(slug, raw) {
  const { datos, cuerpo } = parsearFrontmatter(raw)
  return {
    slug,
    titulo: datos.titulo || slug,
    resumen: datos.resumen || '',
    palabras: datos.palabras,
    orden: datos.orden,
    cuerpo,
    texto: markdownATexto(cuerpo),
  }
}

/** Ordena por `orden` y luego por título. */
export function ordenarArticulos(articulos) {
  return [...articulos].sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, 'es'))
}

function contieneRaiz(palabras, token) {
  return palabras.some((p) => p === token || (token.length >= 3 && p.startsWith(token)))
}

/** Puntaje de un artículo para una lista de palabras buscadas. */
export function puntuar(articulo, tokens) {
  if (!tokens.length) return 0
  const titulo = palabrasClave(articulo.titulo)
  const claves = articulo.palabras.flatMap((p) => palabrasClave(p))
  const resumen = palabrasClave(articulo.resumen)
  const textoNorm = ` ${normalizar(articulo.texto)} `
  let total = 0
  for (const t of tokens) {
    if (contieneRaiz(titulo, t)) total += 6
    if (contieneRaiz(claves, t)) total += 5
    if (contieneRaiz(resumen, t)) total += 2
    const veces = textoNorm.split(t).length - 1
    total += Math.min(veces, 3)
  }
  return total
}

/**
 * Busca artículos por palabras. Sin consulta devuelve todos por `orden`.
 * @param {Array} articulos
 * @param {string} consulta
 * @param {{ max?: number }} [opciones]
 * @returns {Array} artículos con `puntaje`, del más al menos relevante
 */
export function buscarArticulos(articulos, consulta, { max = Infinity } = {}) {
  const tokens = palabrasClave(consulta)
  if (!tokens.length) return ordenarArticulos(articulos).slice(0, max).map((a) => ({ ...a, puntaje: 0 }))
  return articulos
    .map((a) => ({ ...a, puntaje: puntuar(a, tokens) }))
    .filter((a) => a.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
    .slice(0, max)
}

export const SLUG_FAQ = 'preguntas-frecuentes'

/**
 * Los artículos que se le dan al chat: los 3 más relevantes y, si no hay
 * resultados claros (menos de 3 o empate en el corte), también las
 * preguntas frecuentes.
 */
export function articulosParaChat(articulos, pregunta, { max = 3 } = {}) {
  const tokens = palabrasClave(pregunta)
  const puntuados = articulos
    .map((a) => ({ ...a, puntaje: puntuar(a, tokens) }))
    .filter((a) => a.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.orden - b.orden)
  const elegidos = puntuados.slice(0, max)
  const empate = puntuados.length > max && puntuados[max - 1].puntaje === puntuados[max].puntaje
  if ((elegidos.length < max || empate) && !elegidos.some((a) => a.slug === SLUG_FAQ)) {
    const faq = articulos.find((a) => a.slug === SLUG_FAQ)
    if (faq) elegidos.push({ ...faq, puntaje: 0 })
  }
  return elegidos
}

export const INSTRUCCION_GUIAS =
  'Responde usando estas guías de AD System; si no está en ellas, dilo y sugiere escribir al equipo; cita el nombre de la guía.'

/**
 * Bloque de texto para el mensaje de sistema del chat. Devuelve '' si no hay
 * guías (el chat funciona igual que antes).
 */
export function construirContextoAyuda(articulos, pregunta, { max = 3, maxCaracteres = 3500 } = {}) {
  const elegidos = articulosParaChat(articulos, pregunta, { max })
  if (!elegidos.length) return ''
  const bloques = elegidos.map((a) => {
    const cuerpo = a.cuerpo.length > maxCaracteres ? `${a.cuerpo.slice(0, maxCaracteres)}…` : a.cuerpo
    return `### Guía: ${a.titulo}\n${cuerpo}`
  })
  return `\n\nGUÍAS DE AYUDA DE AD SYSTEM:\n${INSTRUCCION_GUIAS}\n\n${bloques.join('\n\n')}`
}

const ICONOS = {
  'primeros-pasos': 'mdi-rocket-launch-outline',
  registrar: 'mdi-plus-circle-outline',
  'mis-movimientos': 'mdi-receipt-text-outline',
  'como-voy': 'mdi-chart-line',
  'mis-papeles': 'mdi-file-certificate-outline',
  'mi-mercancia': 'mdi-package-variant-closed',
  'mis-proveedores': 'mdi-truck-delivery-outline',
  'mis-clientes': 'mdi-account-group-outline',
  'mi-negocio': 'mdi-domain',
  retenciones: 'mdi-percent-outline',
  'seniat-retenciones': 'mdi-file-send-outline',
  'mi-plan-y-pagos': 'mdi-crown-outline',
  'preguntas-frecuentes': 'mdi-help-circle-outline',
  api: 'mdi-code-braces',
}

/** Ícono de la tarjeta de un artículo. */
export function iconoArticulo(slug) {
  return ICONOS[slug] || 'mdi-book-open-page-variant-outline'
}

/** Ruta pública de un artículo (la API tiene su propia pantalla). */
export function rutaArticulo(slug) {
  return slug === 'api' ? '/ayuda/api' : `/ayuda/${slug}`
}
