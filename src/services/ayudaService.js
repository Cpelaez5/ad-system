/**
 * ayudaService — carga los artículos de la ayuda pública (`docs/ayuda/*.md`).
 * Es la misma fuente para /ayuda, /ayuda/:slug, /ayuda/api y el chat de soporte.
 * Los Markdown se cargan por Vite (`import.meta.glob`) y se guardan en caché.
 */
import { crearArticulo, ordenarArticulos, slugDeRuta, construirContextoAyuda } from '@/utils/ayudaBusqueda.js'

const cargadores = import.meta.glob('/docs/ayuda/*.md', { query: '?raw', import: 'default' })

let cache = null

/** Todos los artículos, ordenados. */
export async function cargarArticulos() {
  if (!cache) {
    cache = (async () => {
      const lista = await Promise.all(
        Object.entries(cargadores).map(async ([ruta, cargar]) => crearArticulo(slugDeRuta(ruta), await cargar())),
      )
      return ordenarArticulos(lista)
    })()
    cache.catch(() => { cache = null })
  }
  return cache
}

export async function obtenerArticulo(slug) {
  const todos = await cargarArticulos()
  return todos.find((a) => a.slug === slug) || null
}

/**
 * Dominio del proyecto para mostrar en la documentación de la API.
 * Se toma de VITE_SUPABASE_URL en tiempo de ejecución; el Markdown solo trae un marcador.
 */
export function urlBaseApi() {
  const crudo = import.meta.env?.VITE_SUPABASE_URL || ''
  try {
    return new URL(crudo).origin
  } catch {
    return 'https://<proyecto>.supabase.co'
  }
}

/** Reemplaza el marcador del dominio por el real. */
export function conDominioReal(markdown) {
  return String(markdown).split('https://<proyecto>.supabase.co').join(urlBaseApi())
}

/**
 * Contexto de guías para el mensaje de sistema del chat. Nunca lanza error:
 * si la ayuda no carga, el chat responde como siempre.
 */
export async function contextoAyudaParaChat(pregunta) {
  try {
    return construirContextoAyuda(await cargarArticulos(), pregunta)
  } catch {
    return ''
  }
}

export default { cargarArticulos, obtenerArticulo, urlBaseApi, conDominioReal, contextoAyudaParaChat }
