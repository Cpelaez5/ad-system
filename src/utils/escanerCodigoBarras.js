/**
 * escanerCodigoBarras.js
 * Soporte del escáner de código de barras con la cámara (API BarcodeDetector).
 * Chrome en Android lo trae; en los demás navegadores el botón no aparece.
 */

export const FORMATOS_ESCANER = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

/** true si el navegador puede leer códigos de barras con la cámara. */
export function soportaEscaner() {
  return typeof globalThis !== 'undefined'
    && 'BarcodeDetector' in globalThis
    && !!globalThis.navigator?.mediaDevices?.getUserMedia
}

/** Mensaje en llano para un error de getUserMedia. */
export function mensajeErrorCamara(err) {
  const nombre = err?.name || ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError' || nombre === 'PermissionDeniedError') {
    return 'Para escanear, permite usar la cámara.'
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
    return 'No encontramos una cámara en este equipo. Puedes escribir el código.'
  }
  return 'No pudimos abrir la cámara. Puedes escribir el código.'
}
