/**
 * rif.js
 * Normalización y validación del RIF venezolano al formato canónico
 * `L-12345678-9` (L = V/E/J/P/G/C).
 *
 * Solo devuelve un RIF cuando:
 * - trae una letra válida (V, E, J, P, G, C) — nunca se adivina, ni siquiera
 *   cuando hay 9 dígitos (antes se asumía "J", lo que podía convertir una
 *   persona natural en jurídica y afectar el sustraendo de ISLR);
 * - el cuerpo viene con su dígito verificador y este valida contra el
 *   algoritmo del SENIAT (pesos 4,3,2,7,6,5,4,3,2 sobre letra+8 dígitos).
 *
 * El cuerpo puede llegar con 6, 7 u 8 dígitos (cédulas viejas sin ceros a la
 * izquierda, p. ej. "V-1234567-0"): siempre se rellena con ceros a la
 * izquierda hasta 8 antes de validar el DV, para que la forma canónica sea
 * siempre la misma y dos orígenes distintos (BD vs. OCR) se puedan comparar
 * como el mismo proveedor.
 *
 * Si el RIF no trae dígito verificador reconocible, o el DV no valida (p.
 * ej. el OCR leyó mal un dígito), se devuelve `null`: quien llama no debe
 * autocrear nada con ese dato, sino dejar que la persona lo escriba o lo
 * corrija a mano.
 *
 * Tolerante a variaciones típicas del OCR: minúsculas, espacios, puntos,
 * guiones, y el prefijo "RIF" (con o sin ".", ":").
 */

const LETRAS_VALIDAS = ['V', 'E', 'J', 'P', 'G', 'C']

// Valor numérico de cada letra para el algoritmo del dígito verificador del
// SENIAT (ocupa el primer peso, 4, en la suma ponderada).
const VALOR_LETRA = { V: 1, E: 2, J: 3, P: 4, G: 5, C: 6 }

// Pesos del algoritmo SENIAT, en orden: [letra, d1, d2, ..., d8].
const PESOS = [4, 3, 2, 7, 6, 5, 4, 3, 2]

/**
 * Calcula el dígito verificador del SENIAT para una letra + 8 dígitos.
 * @param {string} letra - una de LETRAS_VALIDAS.
 * @param {string} ochoDigitos - exactamente 8 caracteres numéricos.
 * @returns {number} dígito verificador esperado (0-9).
 */
function calcularDigitoVerificador(letra, ochoDigitos) {
  const valores = [VALOR_LETRA[letra], ...ochoDigitos.split('').map(Number)]
  const suma = valores.reduce((acc, v, i) => acc + v * PESOS[i], 0)
  const resto = suma % 11
  const dv = 11 - resto
  return dv >= 10 ? 0 : dv
}

/**
 * Normaliza un RIF a `L-12345678-9`, validando su dígito verificador.
 * @param {string} valorCrudo - RIF en cualquier formato (puede venir del OCR).
 * @returns {string|null} RIF normalizado y con DV válido, o `null` si no se
 *   reconoce como RIF completo y válido.
 */
export function normalizarRif(valorCrudo) {
  if (!valorCrudo) return null

  let texto = String(valorCrudo).toUpperCase().trim()
  // Tolerar el prefijo "RIF" / "RIF." / "RIF:" antes del valor real.
  texto = texto.replace(/^RIF\.?\s*:?\s*/, '')

  const limpio = texto.replace(/[^A-Z0-9]/g, '')
  if (!limpio) return null

  // Letra obligatoria (nunca se adivina) + 7 a 9 dígitos: el último dígito
  // siempre es el verificador, los anteriores son el cuerpo (6 a 8 dígitos).
  const match = limpio.match(/^([VEJPGC])(\d{7,9})$/)
  if (!match) return null

  const [, letra, digitos] = match
  if (!LETRAS_VALIDAS.includes(letra)) return null

  const cuerpoSinDv = digitos.slice(0, -1).padStart(8, '0')
  const dv = digitos.slice(-1)
  if (cuerpoSinDv.length !== 8) return null

  const dvEsperado = calcularDigitoVerificador(letra, cuerpoSinDv)
  if (String(dvEsperado) !== dv) return null

  return `${letra}-${cuerpoSinDv}-${dv}`
}

/**
 * Deduce el tipo de persona (NATURAL/JURIDICA) a partir de la letra de un
 * RIF ya normalizado (ver `normalizarRif`). V, E, P → persona natural;
 * J, G, C → persona jurídica (decisión del orquestador, ola F2b, C2). Si no
 * se reconoce la letra, asume JURIDICA (el default más común en facturas de
 * proveedores venezolanos).
 * @param {string|null} rifNormalizado
 * @returns {'NATURAL'|'JURIDICA'}
 */
export function tipoPersonaPorLetra(rifNormalizado) {
  const letra = String(rifNormalizado || '').trim().charAt(0).toUpperCase()
  return ['V', 'E', 'P'].includes(letra) ? 'NATURAL' : 'JURIDICA'
}

export default normalizarRif
