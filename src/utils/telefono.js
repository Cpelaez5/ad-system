/**
 * Teléfonos venezolanos y enlace de WhatsApp.
 * `0414-123.45.67` -> `584141234567` (formato internacional sin "+", el que
 * pide wa.me). Si el número no se reconoce como venezolano de 10 dígitos,
 * devuelve null: nunca se adivina.
 */

export function normalizarTelefonoVE(valor) {
  if (!valor) return null
  let d = String(valor).replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('58')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (!/^[24]\d{9}$/.test(d)) return null
  return '58' + d
}

/** Solo abre el enlace: no envía nada. Devuelve null si no hay número válido. */
export function enlaceWhatsApp(telefono, mensaje = '') {
  const n = normalizarTelefonoVE(telefono)
  if (!n) return null
  return `https://wa.me/${n}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`
}

/** Mensaje amable de cobro; la persona lo revisa y toca Enviar en su WhatsApp. */
export function mensajeCobroWhatsApp({ nombre = '', monto = '' } = {}) {
  const primero = String(nombre).trim().split(/\s+/)[0]
  const saludo = primero ? `Hola ${primero}, ¿cómo estás?` : 'Hola, ¿cómo estás?'
  const deuda = monto ? ` ${monto}` : ' un pago'
  return `${saludo} Te escribo para recordarte, con mucho cariño, que tienes pendiente${deuda}. ¿Me avisas cuándo puedes cancelarlo? ¡Gracias!`
}

/** Enlace tel: para el botón "Llamar". */
export function enlaceLlamada(telefono) {
  const n = normalizarTelefonoVE(telefono)
  return n ? `tel:+${n}` : null
}
