/**
 * productoFotoService.js
 *
 * Fotos de productos y servicios (Mi mercancía) + IA "Foto y listo".
 * Bucket privado `productos`, ruta `{organization_id}/{client_id}/{archivo}`.
 *
 * - reducirImagen: baja la foto en el navegador (lado mayor ~1600 px, JPEG 0,85)
 *   para que suba rápido con datos móviles.
 * - subirFoto: reduce y sube a la carpeta del negocio; devuelve la ruta.
 * - urlFoto: URL firmada para mostrarla (con caché de storageUrlService).
 * - identificarProducto / mejorarFoto: invocan la Edge Function `producto-ia`.
 *   Nunca lanzan hacia la UI: devuelven un mensaje en llano en `error`.
 */

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId } from '@/utils/tenantHelpers'
import { obtenerUrlFirmada } from '@/services/storageUrlService'

export const BUCKET_PRODUCTOS = 'productos'
export const LADO_MAXIMO = 1600
export const CALIDAD_JPEG = 0.85

const MSG_RECONOCER = 'No pudimos reconocer el producto. Puedes completar los datos tú.'
const MSG_MEJORAR = 'No pudimos mejorar la foto ahora. Puedes usar la original.'

/** Calcula el tamaño reducido manteniendo la proporción (nunca agranda). */
export function calcularTamano(ancho, alto, ladoMaximo = LADO_MAXIMO) {
  const mayor = Math.max(ancho, alto)
  if (!mayor || mayor <= ladoMaximo) return { ancho, alto }
  const f = ladoMaximo / mayor
  return { ancho: Math.round(ancho * f), alto: Math.round(alto * f) }
}

/** Nombre de archivo único y seguro. */
export function nombreArchivo() {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${id}.jpg`
}

function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen_invalida')) }
    img.src = url
  })
}

/** Reduce una foto (File/Blob) a JPEG de lado mayor ~1600 px. Devuelve un Blob. */
export async function reducirImagen(archivo, { ladoMaximo = LADO_MAXIMO, calidad = CALIDAD_JPEG } = {}) {
  const img = await cargarImagen(archivo)
  const { ancho, alto } = calcularTamano(img.naturalWidth || img.width, img.naturalHeight || img.height, ladoMaximo)
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // PNG con transparencia: fondo blanco
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(img, 0, 0, ancho, alto)
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no_se_pudo_reducir'))), 'image/jpeg', calidad)
  })
}

/** Carpeta del negocio dentro del bucket: `{organization_id}/{client_id}`. */
export function carpetaNegocio() {
  const org = getCurrentOrganizationId()
  const cliente = getCurrentClientId()
  if (!org || !cliente) return null
  return `${org}/${cliente}`
}

/** Sube un Blob JPEG ya reducido a la carpeta del negocio. Devuelve { path, error }. */
export async function subirBlob(blob) {
  try {
    const carpeta = carpetaNegocio()
    if (!carpeta) return { path: null, error: 'No pudimos identificar tu negocio. Vuelve a iniciar sesión.' }
    const path = `${carpeta}/${nombreArchivo()}`
    const { error } = await supabase.storage
      .from(BUCKET_PRODUCTOS)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) return { path: null, error: 'No pudimos subir la foto. Revisa tu conexión e intenta de nuevo.' }
    return { path, error: null }
  } catch {
    return { path: null, error: 'No pudimos subir la foto. Revisa tu conexión e intenta de nuevo.' }
  }
}

/** Reduce y sube una foto. Devuelve { path, blob, error } (blob = la foto reducida). */
export async function subirFoto(archivo) {
  if (!carpetaNegocio()) return { path: null, blob: null, error: 'No pudimos identificar tu negocio. Vuelve a iniciar sesión.' }
  let blob
  try {
    blob = await reducirImagen(archivo)
  } catch {
    return { path: null, blob: null, error: 'No pudimos leer esa foto. Prueba con otra.' }
  }
  const r = await subirBlob(blob)
  return { ...r, blob }
}

/**
 * Recorta un rectángulo {x,y,w,h} (en píxeles de la imagen) y lo devuelve como
 * { blob, dataUrl } de lado mayor <= max. Para "Foto del estante".
 */
export async function recortarImagen(archivo, rect, { max = 800, calidad = CALIDAD_JPEG } = {}) {
  const img = await cargarImagen(archivo)
  const escala = Math.min(1, max / Math.max(rect.w, rect.h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(rect.w * escala))
  canvas.height = Math.max(1, Math.round(rect.h * escala))
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no_se_pudo_recortar'))), 'image/jpeg', calidad)
  })
  return { blob, dataUrl: canvas.toDataURL('image/jpeg', 0.8) }
}

/** Mide una imagen (File/Blob). */
export async function medirImagen(archivo) {
  const img = await cargarImagen(archivo)
  return { ancho: img.naturalWidth || img.width, alto: img.naturalHeight || img.height }
}

/**
 * Firma muchas rutas de una vez (cuadrícula). Devuelve { ruta: url }.
 * Nunca lanza; si falla devuelve lo que alcanzó a firmar.
 */
export async function firmarVarias(paths = [], segundos = 3600) {
  const unicas = [...new Set(paths.filter(Boolean))]
  const mapa = {}
  for (let i = 0; i < unicas.length; i += 100) {
    const lote = unicas.slice(i, i + 100)
    try {
      const { data, error } = await supabase.storage.from(BUCKET_PRODUCTOS).createSignedUrls(lote, segundos)
      if (error) continue
      for (const f of data || []) {
        if (f?.signedUrl && f.path) mapa[f.path] = f.signedUrl
      }
    } catch { /* se queda sin foto, nunca rompe */ }
  }
  return mapa
}

/** URL firmada para mostrar una foto guardada (o null). */
export function urlFoto(path, segundos = 3600) {
  if (!path) return Promise.resolve(null)
  return obtenerUrlFirmada(BUCKET_PRODUCTOS, path, segundos)
}

/** Borra fotos del bucket (por ejemplo una que se descartó). No lanza. */
export async function borrarFotos(paths = []) {
  const lista = paths.filter(Boolean)
  if (!lista.length) return false
  try {
    const { error } = await supabase.storage.from(BUCKET_PRODUCTOS).remove(lista)
    return !error
  } catch {
    return false
  }
}

async function invocar(body, mensajeFallo) {
  try {
    const { data, error } = await supabase.functions.invoke('producto-ia', { body })
    if (error) return { data: null, error: mensajeFallo }
    if (data?.error) return { data: null, error: data.error.message || mensajeFallo }
    return { data, error: null }
  } catch {
    return { data: null, error: mensajeFallo }
  }
}

/**
 * Pide a la IA que identifique el producto de la foto.
 * @param {string} fotoPath ruta ya subida
 * @param {Array<{clave:string, etiqueta:string}>} campos campos del rubro
 * @returns {Promise<{producto: object|null, error: string|null}>}
 */
export async function identificarProducto(fotoPath, campos = []) {
  const { data, error } = await invocar(
    { accion: 'identificar', foto_path: fotoPath, campos: campos.map(({ clave, etiqueta }) => ({ clave, etiqueta })) },
    MSG_RECONOCER
  )
  if (error) return { producto: null, error }
  if (!data?.producto) return { producto: null, error: MSG_RECONOCER }
  return { producto: data.producto, error: null }
}

/** Genera la foto de estudio (Nano Banana). Devuelve { path, error }. */
export async function mejorarFoto(fotoPath) {
  const { data, error } = await invocar({ accion: 'mejorar', foto_path: fotoPath }, MSG_MEJORAR)
  if (error) return { path: null, error }
  if (!data?.foto_path) return { path: null, error: MSG_MEJORAR }
  return { path: data.foto_path, error: null }
}

/**
 * Foto del estante: la IA devuelve todos los productos que ve.
 * @returns {Promise<{productos: Array, error: string|null}>}
 */
export async function identificarEstante(fotoPath) {
  const { data, error } = await invocar(
    { accion: 'estante', foto_path: fotoPath },
    'No pudimos leer el estante. Intenta con una foto más cerca o por partes.'
  )
  if (error) return { productos: [], error }
  return { productos: Array.isArray(data?.productos) ? data.productos : [], error: null }
}

/** Pasa la unidad de la IA (LT, MT, PAQ) a las unidades del formulario. */
export function unidadDelFormulario(unidad) {
  const mapa = { UND: 'UND', KG: 'KG', LT: 'LTS', LTS: 'LTS', MT: 'MTS', MTS: 'MTS', CAJA: 'CAJA', PAQ: 'BULTO', BULTO: 'BULTO' }
  return mapa[String(unidad || '').toUpperCase()] || 'UND'
}

export default {
  reducirImagen, subirFoto, subirBlob, recortarImagen, medirImagen, firmarVarias, urlFoto, borrarFotos,
  identificarProducto, identificarEstante, mejorarFoto,
  calcularTamano, carpetaNegocio, unidadDelFormulario
}
