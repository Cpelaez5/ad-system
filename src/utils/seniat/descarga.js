/**
 * descarga.js — bajar y compartir los archivos de SENIAT del mes desde el navegador.
 * Toca el DOM y `navigator`, por eso va aparte de las funciones puras.
 *
 * - TXT: el navegador no escribe windows-1252 fácil; ya viene sin acentos (txtIva.js), así que UTF-8 = ASCII.
 * - XML: bytes ISO-8859-1 (codificarLatin1), como dice su declaración.
 */
import { codificarLatin1 } from './xmlIslr.js'

/** Arma { nombre, mime, bytes } del archivo de una tarjeta ya generado (texto). */
export function archivoDeTexto({ nombre, texto, latin1 = false }) {
  const bytes = latin1 ? codificarLatin1(texto) : new TextEncoder().encode(texto)
  const mime = latin1 ? 'application/xml;charset=iso-8859-1' : 'text/plain;charset=utf-8'
  return { nombre, mime, bytes }
}

/** Baja el archivo en el aparato. */
export function descargarArchivo({ nombre, mime, bytes }) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** ¿Este aparato puede compartir el archivo con el menú del sistema? */
export function puedeCompartir(archivo) {
  try {
    if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false
    return navigator.canShare({ files: [new File([archivo.bytes], archivo.nombre, { type: archivo.mime.split(';')[0] })] })
  } catch {
    return false
  }
}

/** Abre el menú de compartir con el archivo adjunto. Devuelve false si la persona lo cancela. */
export async function compartirArchivo(archivo, { titulo, texto }) {
  const file = new File([archivo.bytes], archivo.nombre, { type: archivo.mime.split(';')[0] })
  try {
    await navigator.share({ files: [file], title: titulo, text: texto })
    return true
  } catch (e) {
    if (e?.name === 'AbortError') return false
    throw e
  }
}

/** Copia un texto al portapapeles. */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}
