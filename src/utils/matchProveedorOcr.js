/**
 * matchProveedorOcr.js
 * Función pura que decide, a partir de los datos del EMISOR leídos por el
 * OCR y la lista de proveedores del directorio del cliente, si hay un match
 * (y con qué confianza) o si hay que dejar el proveedor como "pendiente"
 * (se crea recién al guardar, ver registroService.resolverProveedorPendiente).
 *
 * Extraído de SimpleInvoiceForm.vue (`matchProveedorFromOcr` /
 * `_ofrecerCrearProveedor`) para que la DECISIÓN se pueda probar de verdad
 * sin montar el componente completo (M10, ola F2b: el test anterior
 * reimplementaba esta lógica en vez de importar la real). El componente
 * sigue siendo responsable de las partes con efectos (cargar la lista de
 * proveedores, asignar `this.proveedor`, mostrar el snackbar).
 */
import { normalizarRif } from './rif.js'

function normalizeName(name) {
  return String(name || '').toLowerCase().trim()
}

/**
 * Construye los datos del proveedor "pendiente" (se crea al guardar) a
 * partir de lo leído por el OCR. Solo cuando el RIF se pudo reconocer y
 * normalizar: si no, no se puede autocrear (el RIF es obligatorio) y se
 * devuelve `null` para que la UI mande al modal "Nuevo" en su lugar.
 * @param {{ companyName?: string, rif?: string, address?: string, phone?: string, email?: string }} issuerData
 * @param {string|null} ocrRifNormalizado - ya normalizado con `normalizarRif`.
 * @returns {{ nombre: string, rif: string, direccion: string, telefono: string, email: string }|null}
 */
export function construirProveedorPendiente(issuerData, ocrRifNormalizado) {
  if (!ocrRifNormalizado || !issuerData?.companyName) return null
  return {
    nombre: issuerData.companyName,
    rif: ocrRifNormalizado,
    direccion: issuerData.address || '',
    telefono: issuerData.phone || '',
    email: issuerData.email || ''
  }
}

/**
 * Decide si el emisor leído por el OCR corresponde a un proveedor ya
 * existente en el directorio (y con qué nivel de confianza), o si hay que
 * dejarlo pendiente.
 * @param {{ companyName?: string, rif?: string, address?: string, phone?: string, email?: string }} issuerData
 * @param {Array<{ id: string, nombre: string, rif: string }>} proveedores - directorio del cliente.
 * @returns {{ matched: Object|null, confidence: 'exact-rif'|'exact-name'|'partial-name'|'none', pendiente: Object|null }}
 */
export function decidirMatchProveedor(issuerData, proveedores) {
  const lista = Array.isArray(proveedores) ? proveedores : []
  const ocrRif = normalizarRif(issuerData?.rif)
  const ocrName = normalizeName(issuerData?.companyName)

  if (lista.length === 0) {
    return { matched: null, confidence: 'none', pendiente: construirProveedorPendiente(issuerData, ocrRif) }
  }

  let matched = null
  let confidence = 'none'

  // NIVEL 1: match exacto por RIF normalizado (máxima confianza)
  if (ocrRif) {
    matched = lista.find(p => normalizarRif(p.rif) === ocrRif) || null
    if (matched) confidence = 'exact-rif'
  }

  // NIVEL 2: match por nombre exacto normalizado
  if (!matched && ocrName && ocrName.length >= 3) {
    matched = lista.find(p => normalizeName(p.nombre) === ocrName) || null
    if (matched) confidence = 'exact-name'
  }

  // NIVEL 3: match parcial por nombre (subcadena en cualquier dirección)
  if (!matched && ocrName && ocrName.length >= 5) {
    matched = lista.find(p => {
      const pName = normalizeName(p.nombre)
      return pName.includes(ocrName) || ocrName.includes(pName)
    }) || null
    if (matched) confidence = 'partial-name'
  }

  if (matched) return { matched, confidence, pendiente: null }
  return { matched: null, confidence: 'none', pendiente: construirProveedorPendiente(issuerData, ocrRif) }
}

export default decidirMatchProveedor
