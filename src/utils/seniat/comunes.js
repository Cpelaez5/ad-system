/**
 * comunes.js — normalizaciones compartidas por la revisión, el TXT de IVA y el XML de ISLR.
 * Funciones puras.
 *
 * Forma de una "retención" que usa todo el módulo (la arma seniatService):
 * { id, invoice_id, tipo: 'IVA'|'ISLR', numero_comprobante, fecha_comprobante,
 *   porcentaje_retencion, base_imponible, monto_retenido, monto_iva, sustraendo_ut, valor_ut,
 *   proveedor_id, proveedor_nombre, proveedor_rif, factura_numero, factura_control, factura_fecha,
 *   concepto_islr_id, concepto_islr_nombre, codigo_seniat,
 *   document_type, total, exento, doc_afectado }
 */

export const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Solo dígitos de un texto ('00-123' → '00123'). */
export function soloDigitos(v) {
  return String(v ?? '').replace(/\D/g, '')
}

/** Recorta espacios y colapsa los repetidos. */
export function limpiarTexto(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * RIF para el SENIAT: sin guiones ni espacios, mayúsculas, letra + 9 dígitos
 * (las cédulas V, E y P con menos de 8 dígitos en el cuerpo se rellenan con ceros).
 * @returns {string|null} 'J123456789' o null si no está completo.
 */
export function rifSeniat(valor) {
  const limpio = String(valor ?? '').toUpperCase().replace(/^RIF\.?\s*:?\s*/, '').replace(/[^A-Z0-9]/g, '')
  const m = limpio.match(/^([VEJPGC])(\d{7,9})$/)
  if (!m) return null
  const digitos = m[2]
  // Solo las cédulas (V, E, P) pueden venir sin ceros a la izquierda; J, G y C llevan 9 dígitos.
  if (digitos.length < 9 && !'VEP'.includes(m[1])) return null
  const cuerpo = digitos.slice(0, -1).padStart(8, '0')
  return `${m[1]}${cuerpo}${digitos.slice(-1)}`
}

/** Monto con punto decimal y 2 decimales, sin separador de miles. Nunca '-0.00'. */
export function monto2(valor) {
  const n = Math.round((num(valor) + Number.EPSILON) * 100) / 100
  const t = n.toFixed(2)
  return t === '-0.00' ? '0.00' : t
}

/** 'FACTURA' → '01', débito → '02', crédito → '03'. */
export function codigoTipoDocumento(documentType) {
  const t = String(documentType ?? '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (t.includes('CREDITO')) return '03'
  if (t.includes('DEBITO')) return '02'
  return '01'
}

export const esNotaCredito = (documentType) => codigoTipoDocumento(documentType) === '03'

/** Alícuota de IVA más cercana (8, 16 o 31) a partir del IVA y la base. Sin datos: 16. */
export function alicuotaIva(montoIva, base) {
  const b = num(base)
  const iva = num(montoIva)
  if (b <= 0 || iva <= 0) return 16
  const pct = (iva / b) * 100
  return [8, 16, 31].reduce((mejor, a) => (Math.abs(a - pct) < Math.abs(mejor - pct) ? a : mejor), 16)
}

/** Número de comprobante: solo dígitos; válido si son 14 (AAAAMM + 8). */
export function comprobante14(valor) {
  const d = soloDigitos(valor)
  return d.length === 14 ? d : null
}

/** Quita acentos y todo lo que no sea ASCII imprimible (para el TXT). */
export function sinAcentos(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\t\r\n]/g, '')
}
