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
const REGLAS_PALABRAS_CLAVE = [
  {
    categoria: 'Electricidad',
    patrones: [/corpelec/, /electricidad/, /\belectrica\b/, /luz electrica/]
  },
  {
    categoria: 'Internet y telefonía',
    patrones: [/\binter\b/, /internet/, /telefon/, /movistar/, /digitel/, /\bcantv\b/]
  },
  {
    categoria: 'Papelería e imprenta',
    patrones: [/papeler/, /imprenta/, /impresion/, /fotocopia/]
  },
  {
    categoria: 'Comida',
    patrones: [/restaurant/, /\bcomida\b/, /almuerzo/, /panaderia/, /charcuteria/]
  },
  {
    categoria: 'Combustible',
    patrones: [/combustible/, /gasolina/, /estacion de servicio/, /\bpdv\b/]
  },
  {
    categoria: 'Alquiler',
    patrones: [/alquiler/, /arrendamiento/, /canon de arrendamiento/]
  },
  {
    categoria: 'Compras en línea',
    patrones: [/amazon/, /mercado ?libre/, /\bebay\b/, /aliexpress/, /compra en linea/, /compras en linea/]
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
  const descripcionesItems = Array.isArray(items) ? items.map(i => i?.description || '') : []
  const bolsaTexto = normalizarTexto([nombreProveedor, textoOcr, ...descripcionesItems].join(' '))

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

export default sugerirCategoria
