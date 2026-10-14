/**
 * fotoYListo.js — piezas puras del flujo "Foto y listo" (Mi mercancía).
 */

/** Mensajes amables mientras la IA trabaja, en orden. */
export const MENSAJES_ANALISIS = [
  'Subiendo tu foto…',
  'Mirando tu producto…',
  'Leyendo la etiqueta…',
  'Armando tu ficha…',
]

/**
 * Aviso para el formulario según lo que devolvió la IA.
 * @param {object|null} producto respuesta de la IA (o null si falló)
 * @param {string|null} error mensaje de error de la IA
 * @returns {{tipo: 'info'|'warning', icono: string, texto: string}|null}
 */
export function avisoDeIdentificacion(producto, error) {
  if (!producto) {
    return {
      tipo: 'info',
      icono: 'mdi-pencil-outline',
      texto: error || 'No pudimos reconocer el producto. Completa los datos tú; tu foto ya quedó guardada.',
    }
  }
  if (producto.confianza === 'baja' || !String(producto.nombre || '').trim()) {
    return {
      tipo: 'warning',
      icono: 'mdi-help-circle-outline',
      texto: 'No reconocimos bien el producto. Completa el nombre y revisa los datos.',
    }
  }
  if (producto.confianza === 'media') {
    return { tipo: 'info', icono: 'mdi-check-circle-outline', texto: 'Revisa que los datos estén bien antes de guardar.' }
  }
  return null
}
