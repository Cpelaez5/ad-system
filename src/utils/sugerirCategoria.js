/**
 * sugerirCategoria.js
 * Función pura que sugiere una categoría de gasto a partir de lo que el OCR
 * leyó de una factura/recibo, sin tocar red ni BD.
 *
 * Orden de prioridad (ver docs/mvp/briefs/ola-f2b-C-ocr.md §2):
 *   (a) última categoría que el cliente usó con este mismo proveedor
 *   (b) reglas por palabras clave sobre el nombre del proveedor / ítems / texto OCR
 *   (c) categoría que la IA del OCR haya devuelto como pista (`categoriaIA`)
 *
 * `categoria` en el resultado es siempre un NOMBRE (no un id): quien llama a
 * esta función decide cómo resolverlo contra las categorías reales del
 * cliente (buscar por nombre, o dejar que el usuario la cree si no existe).
 */

import { normalizarRif } from './rif'

// Reglas por palabras clave. Los patrones corren sobre texto sin tildes y en
// minúsculas (ver `normalizarTexto`). El orden importa: la primera regla que
// matchea gana.
// Nota (I9): los patrones corren SOLO sobre el nombre del proveedor y la
// descripción de los ítems (ver `sugerirCategoria`), nunca sobre notas
// libres del OCR ("Teléfono:", "Tlf:", "Email:" suelen venir ahí y daban
// falsos positivos). Todos con límite de palabra (`\b`) para no matchear
// una palabra que solo contiene el patrón como subcadena (p. ej. una
// "ferretería eléctrica" no es un pago de electricidad).
const REGLAS_PALABRAS_CLAVE = [
  {
    categoria: 'Electricidad',
    patrones: [/\bcorpelec\b/, /\belectricidad\b/, /\bluz electrica\b/]
  },
  {
    categoria: 'Internet y telefonía',
    patrones: [/\binter\b/, /\binternet\b/, /\btelefon/, /\bmovistar\b/, /\bdigitel\b/, /\bcantv\b/]
  },
  {
    categoria: 'Papelería e imprenta',
    patrones: [/\bpapeler/, /\bimprenta\b/, /\bimpresion/, /\bfotocopia/]
  },
  {
    categoria: 'Comida',
    patrones: [/\brestaurant/, /\bcomida\b/, /\balmuerzo\b/, /\bpanaderia/, /\bcharcuteria/]
  },
  {
    categoria: 'Combustible',
    // "pdv" (sin "sa") significa casi siempre "punto de venta" (pago con
    // tarjeta) en Venezuela, no "Petróleos de Venezuela": se quita para no
    // marcar como Combustible cualquier compra pagada con tarjeta.
    patrones: [/\bcombustible\b/, /\bgasolina\b/, /\bestacion de servicio\b/, /\bpdvsa\b/]
  },
  {
    categoria: 'Alquiler',
    patrones: [/\balquiler\b/, /\barrendamiento\b/, /\bcanon de arrendamiento\b/]
  },
  {
    categoria: 'Compras en línea',
    patrones: [/\bamazon\b/, /\bmercado ?libre\b/, /\bebay\b/, /\baliexpress\b/, /\bcompras? en linea\b/]
  }
]

/**
 * Minúsculas y sin tildes, para que las reglas no dependan de cómo vino
 * acentuado el texto del OCR.
 * @param {string} texto
 * @returns {string}
 */
function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Sugiere una categoría de gasto.
 * @param {Object} params
 * @param {{ nombre?: string, companyName?: string, rif?: string }|null} [params.proveedor]
 * @param {Array<{ description?: string }>} [params.items]
 * @param {string} [params.textoOcr] - Notas u otro texto libre leído del documento.
 * @param {Array<{ proveedorRif?: string, proveedorNombre?: string, categoriaNombre: string, fecha?: string }>} [params.historial]
 *   Historial de facturas anteriores del cliente (ya resuelto por quien llama, esta función no consulta la BD).
 * @param {string|null} [params.categoriaIA] - Pista de categoría que haya devuelto la IA del OCR, si la hay.
 * @returns {{ categoria: string|null, confianza: number, motivo: string|null }}
 */
export function sugerirCategoria({ proveedor = null, items = [], textoOcr = '', historial = [], categoriaIA = null } = {}) {
  const nombreProveedor = proveedor?.nombre || proveedor?.companyName || ''
  const rifProveedor = proveedor?.rif ? normalizarRif(proveedor.rif) : null
  const nombreProveedorNorm = normalizarTexto(nombreProveedor)

  // (a) última categoría usada con este proveedor ─────────────────────────
  const coincidencias = (Array.isArray(historial) ? historial : [])
    .filter(h => h && h.categoriaNombre)
    .filter(h => {
      const hRif = h.proveedorRif ? normalizarRif(h.proveedorRif) : null
      if (rifProveedor && hRif) return hRif === rifProveedor
      const hNombre = normalizarTexto(h.proveedorNombre || '')
      return !!nombreProveedorNorm && !!hNombre && hNombre === nombreProveedorNorm
    })
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))

  if (coincidencias.length > 0) {
    return {
      categoria: coincidencias[0].categoriaNombre,
      confianza: 0.9,
      motivo: `Es la categoría que usaste la última vez con ${nombreProveedor || 'este proveedor'}`
    }
  }

  // (b) reglas por palabras clave ──────────────────────────────────────────
  // I9: solo nombre del proveedor + descripción de ítems. Las notas libres
  // del OCR (`textoOcr`) quedan afuera a propósito: ahí es donde aparecen
  // etiquetas como "Teléfono:", "Tlf:" o "Email:" que daban falsos positivos
  // (p. ej. "Teléfono: 0212…" sugería "Internet y telefonía").
  const descripcionesItems = Array.isArray(items) ? items.map(i => i?.description || '') : []
  const bolsaTexto = normalizarTexto([nombreProveedor, ...descripcionesItems].join(' '))

  for (const regla of REGLAS_PALABRAS_CLAVE) {
    if (regla.patrones.some(patron => patron.test(bolsaTexto))) {
      return {
        categoria: regla.categoria,
        confianza: 0.65,
        motivo: `La factura tiene palabras típicas de "${regla.categoria}"`
      }
    }
  }

  // (c) categoría sugerida por la IA del OCR ──────────────────────────────
  if (categoriaIA && String(categoriaIA).trim()) {
    return {
      categoria: String(categoriaIA).trim(),
      confianza: 0.4,
      motivo: 'La IA que leyó tu documento sugirió esta categoría'
    }
  }

  return { categoria: null, confianza: 0, motivo: null }
}

/**
 * Busca, entre categorías reales (`{ id, name }`), una cuyo nombre coincida
 * EXACTO (normalizado: sin tildes, minúsculas) con el nombre sugerido. Nunca
 * hace coincidencia parcial (I9: antes también aceptaba que un nombre fuera
 * subcadena del otro, lo que podía elegir una categoría de nombre corto o
 * genérico del cliente) y nunca inventa una categoría nueva: si no existe,
 * devuelve `null` para que la persona la elija o la cree a mano.
 * @param {string} nombreSugerido
 * @param {Array<{ id: string, name: string }>} categorias - categorías reales del cliente.
 * @returns {{ id: string, name: string }|null}
 */
export function resolverCategoriaPorNombre(nombreSugerido, categorias) {
  const objetivo = normalizarTexto(nombreSugerido)
  if (!objetivo) return null
  const lista = Array.isArray(categorias) ? categorias : []
  return lista.find(c => normalizarTexto(c.name) === objetivo) || null
}

export default sugerirCategoria
