/**
 * rif.js
 * Normalización pura del RIF venezolano al formato canónico `L-12345678-9`
 * (L = V/E/J/P/G/C). Tolerante a variaciones típicas del OCR: minúsculas,
 * espacios, sin guiones, con prefijo "RIF:", etc.
 *
 * No valida el dígito verificador (eso exigiría la tabla de pesos del SENIAT,
 * fuera del alcance de esta tarea); solo reconoce la forma del RIF y lo
 * reescribe siempre igual para poder comparar dos RIF de distinto origen
 * (BD vs. OCR) como el mismo proveedor.
 */

const LETRAS_VALIDAS = ['V', 'E', 'J', 'P', 'G', 'C']

/**
 * Normaliza un RIF a `L-12345678-9`.
 * @param {string} valorCrudo - RIF en cualquier formato (puede venir del OCR).
 * @returns {string|null} RIF normalizado, o `null` si no se reconoce como RIF.
 */
export function normalizarRif(valorCrudo) {
  if (!valorCrudo) return null

  const limpio = String(valorCrudo).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!limpio) return null

  const match = limpio.match(/^([VEJPGC])?(\d{6,9})$/)
  if (!match) return null

  let [, letra, digitos] = match

  if (!letra) {
    // Sin letra explícita: solo la asumimos cuando el largo (9) corresponde
    // a un RIF completo con dígito verificador; el caso más común en
    // facturas de proveedores venezolanos es Persona Jurídica.
    if (digitos.length === 9) {
      letra = 'J'
    } else {
      return null
    }
  }

  if (!LETRAS_VALIDAS.includes(letra)) return null

  if (digitos.length === 9) {
    const base = digitos.slice(0, 8)
    const verificador = digitos.slice(8)
    return `${letra}-${base}-${verificador}`
  }

  if (digitos.length === 8) {
    // Falta el dígito verificador (frecuente cuando el OCR lo recorta):
    // devolvemos lo que sí pudimos reconocer en vez de descartar el dato.
    return `${letra}-${digitos}`
  }

  return null
}

export default normalizarRif
