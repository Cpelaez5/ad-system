/**
 * Reglas puras de las capturas adjuntas al chat de soporte (sin navegador):
 * validación, límites, rutas del bucket y tamaño reducido.
 */
export const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp']
export const MAX_BYTES = 5 * 1024 * 1024
export const MAX_POR_MENSAJE = 4
export const LADO_MAXIMO = 1920
/** Por encima de este peso se recomprime aunque no pase del lado máximo. */
export const PESO_PARA_COMPRIMIR = 1.5 * 1024 * 1024
export const CALIDAD = 0.85
export const BUCKET = 'soporte-adjuntos'

const EXTENSION = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export const extensionDeMime = (mime) => EXTENSION[mime] || 'jpg'

/**
 * Separa los archivos que sirven de los que no, con el motivo en español.
 * @param {number} yaAgregados cuántos adjuntos tiene ya el mensaje
 * @param {Array<{name?:string,type:string,size:number}>} archivos
 */
export function validarArchivos(yaAgregados, archivos) {
  const aceptados = []
  const rechazados = []
  let lugares = Math.max(0, MAX_POR_MENSAJE - (yaAgregados || 0))
  for (const f of archivos || []) {
    const nombre = f?.name || 'captura'
    if (!f || !TIPOS_IMAGEN.includes(f.type)) {
      rechazados.push({ nombre, motivo: 'Solo se aceptan imágenes PNG, JPG o WEBP.' })
    } else if (f.size > MAX_BYTES) {
      rechazados.push({ nombre, motivo: 'La imagen pesa más de 5 MB.' })
    } else if (lugares <= 0) {
      rechazados.push({ nombre, motivo: `Puedes enviar hasta ${MAX_POR_MENSAJE} imágenes por mensaje.` })
    } else {
      aceptados.push(f)
      lugares -= 1
    }
  }
  return { aceptados, rechazados }
}

/** Ruta del objeto: <conversation_id>/<uuid>.<ext> (la primera carpeta decide el permiso). */
export function construirRuta(conversationId, uuid, mime) {
  return `${conversationId}/${uuid}.${extensionDeMime(mime)}`
}

/** Reduce ancho y alto sin deformar para que el lado mayor no pase de `max`. */
export function dimensionesReducidas(ancho, alto, max = LADO_MAXIMO) {
  if (!ancho || !alto) return { ancho: 0, alto: 0 }
  const mayor = Math.max(ancho, alto)
  if (mayor <= max) return { ancho, alto }
  const f = max / mayor
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) }
}

export function necesitaComprimir({ size, ancho, alto }) {
  return size > PESO_PARA_COMPRIMIR || Math.max(ancho || 0, alto || 0) > LADO_MAXIMO
}

/** Normaliza lo que viene de la BD (nulo o formato raro) a una lista usable. */
export function adjuntosDeMensaje(m) {
  const a = m?.adjuntos
  return Array.isArray(a) ? a.filter((x) => x && typeof x.path === 'string') : []
}
