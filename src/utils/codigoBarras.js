/**
 * codigoBarras.js
 * Espejo en JS de `codigo_barras_valido` (BD): GTIN de 8, 12, 13 o 14 dígitos
 * con dígito verificador correcto (EAN-8, UPC-A, EAN-13, GTIN-14).
 */

/** Quita espacios y guiones. */
export function limpiarCodigoBarras(valor) {
  return String(valor ?? '').replace(/[\s-]/g, '')
}

/** true si el texto es un GTIN 8/12/13/14 con dígito verificador válido. */
export function codigoBarrasValido(valor) {
  const c = limpiarCodigoBarras(valor)
  if (!/^\d+$/.test(c) || ![8, 12, 13, 14].includes(c.length)) return false
  const digitos = c.split('').map(Number)
  const verificador = digitos.pop()
  // Desde la derecha (sin el verificador) los pesos alternan 3, 1, 3, 1...
  let suma = 0
  for (let i = digitos.length - 1, peso = 3; i >= 0; i--, peso = peso === 3 ? 1 : 3) {
    suma += digitos[i] * peso
  }
  return (10 - (suma % 10)) % 10 === verificador
}
