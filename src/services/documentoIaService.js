/**
 * documentoIaService.js
 *
 * "Llenar con un documento": la IA lee un RIF o una cédula (foto o PDF) y
 * devuelve los datos para llenar un formulario. Ver
 * docs/mvp/diseno/llenar-con-documento.md.
 *
 * - leerDocumento: reduce la foto en el navegador (misma función que Mi
 *   mercancía) y llama a la Edge Function `documento-ia`. El archivo NO se
 *   guarda. Nunca lanza hacia la UI: devuelve { documento, error }.
 * - aProveedor / aCliente / aEmpresa: mapeos puros al nombre real de cada campo.
 * - aplicarSoloVacios / restaurar: llenan únicamente lo vacío y permiten deshacer.
 */

import { supabase } from '@/lib/supabaseClient'
import { reducirImagen } from '@/services/productoFotoService'

export const MAX_BYTES_PDF = 8 * 1024 * 1024

export const MSG_ILEGIBLE =
  'No pudimos leer bien el documento. Prueba con una foto más clara, de frente y con buena luz.'

const MENSAJES = {
  NO_AUTORIZADO: 'Tu sesión venció. Inicia sesión de nuevo.',
  SIN_EMPRESA: 'Tu usuario no tiene empresa asignada.',
  TIPO: 'Sube una foto (JPG, PNG o WebP) o un PDF.',
  GRANDE: 'El archivo pesa más de 8 MB. Prueba con una foto o un PDF más liviano.',
  SIN_IA: 'Esta ayuda no está disponible por ahora. Puedes llenar los datos tú.',
  TIEMPO_IA: 'Tardó demasiado en leer el documento. Inténtalo de nuevo.',
  RESPUESTA_IA: MSG_ILEGIBLE,
  IMAGEN: 'No pudimos abrir esa imagen. Prueba con otra foto o con un PDF.',
  RED: 'No pudimos leer tu documento ahora. Puedes llenar los datos tú.',
}

/** Mensaje amable para un código de error. */
export function mensajeDeError(code) {
  return MENSAJES[code] || MENSAJES.RED
}

function aBase64(blobOArchivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1] || '')
    lector.onerror = () => reject(new Error('lectura'))
    lector.readAsDataURL(blobOArchivo)
  })
}

async function extraerError(error) {
  try {
    const cuerpo = await error?.context?.json?.()
    if (cuerpo?.error?.code) return cuerpo.error.code
  } catch { /* sin cuerpo legible */ }
  return 'RED'
}

/**
 * Lee un RIF o una cédula.
 * @param {File} file foto o PDF
 * @param {'rif'|'cedula'|'auto'} tipoEsperado
 * @returns {Promise<{documento: object|null, error: {code:string, message:string}|null}>}
 */
export async function leerDocumento(file, tipoEsperado = 'auto') {
  const fallo = (code) => ({ documento: null, error: { code, message: mensajeDeError(code) } })
  try {
    if (!file) return fallo('TIPO')
    let base64
    let mime
    if (file.type === 'application/pdf') {
      if (file.size > MAX_BYTES_PDF) return fallo('GRANDE')
      base64 = await aBase64(file)
      mime = 'application/pdf'
    } else if (String(file.type).startsWith('image/')) {
      let reducida
      try { reducida = await reducirImagen(file) } catch { return fallo('IMAGEN') }
      base64 = await aBase64(reducida)
      mime = 'image/jpeg'
    } else {
      return fallo('TIPO')
    }

    const { data, error } = await supabase.functions.invoke('documento-ia', {
      body: { archivo: { base64, mime }, tipo_esperado: tipoEsperado },
    })
    if (error) return fallo(await extraerError(error))
    if (data?.error) return fallo(data.error.code || 'RED')
    if (!data?.documento) return fallo('RESPUESTA_IA')
    return { documento: data.documento, error: null }
  } catch {
    return fallo('RED')
  }
}

// ── Calidad de la lectura ──────────────────────────────────────────────

/** Mensaje amable si la lectura no sirve o es dudosa; null si todo bien. */
export function avisoDeCalidad(doc) {
  if (!doc || doc.legible === false) return MSG_ILEGIBLE
  if (doc.confianza === 'baja') return MSG_ILEGIBLE
  return null
}

/** true si no vale la pena llenar nada. */
export function esIlegible(doc) {
  return !doc || doc.legible === false
}

/** "el RIF" / "la cédula" para la marca. */
export function origenDelDocumento(doc) {
  return doc?.tipo === 'cedula' ? 'la cédula' : 'el RIF'
}

export function marcaDeLlenado(doc) {
  return `Llenado con IA desde ${origenDelDocumento(doc)} · revisa los datos`
}

// ── Utilidades ─────────────────────────────────────────────────────────

const texto = (v) => (v == null ? '' : String(v).trim())

function sinTildes(s) {
  return texto(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Identificación principal del documento: RIF, o la cédula si no hay RIF. */
export function identificacion(doc) {
  return texto(doc?.rif) || texto(doc?.cedula)
}

/** 'JURIDICA' | 'NATURAL' a partir del tipo de persona o la letra del RIF. */
export function tipoPersonaDe(doc) {
  const t = sinTildes(doc?.tipo_persona)
  if (t.startsWith('jur')) return 'JURIDICA'
  if (t.startsWith('nat')) return 'NATURAL'
  const letra = identificacion(doc).charAt(0).toUpperCase()
  if (letra === 'V' || letra === 'E') return 'NATURAL'
  if (letra === 'J' || letra === 'G' || letra === 'C') return 'JURIDICA'
  return null
}

/** Quita las claves vacías: solo viaja lo que el documento sí trae. */
function sinVacios(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null))
}

// ── Mapeos puros (nombres reales de campo de cada formulario) ──────────

/** ProveedorModalForm: nombre, rif, tipo_persona (JURIDICA|NATURAL), direccion, telefono, email. */
export function aProveedor(doc) {
  if (!doc) return {}
  return sinVacios({
    nombre: texto(doc.nombre),
    rif: identificacion(doc),
    tipo_persona: tipoPersonaDe(doc) || '',
    direccion: texto(doc.domicilio_fiscal),
    telefono: texto(doc.telefono),
    email: texto(doc.correo),
  })
}

/** Clientes.vue: nombre, rif, tipo_persona (natural|juridica), direccion, telefono, correo. */
export function aCliente(doc) {
  if (!doc) return {}
  const tipo = tipoPersonaDe(doc)
  return sinVacios({
    nombre: texto(doc.nombre),
    rif: identificacion(doc),
    tipo_persona: tipo ? tipo.toLowerCase() : '',
    direccion: texto(doc.domicilio_fiscal),
    telefono: texto(doc.telefono),
    correo: texto(doc.correo),
  })
}

/** ClienteMiArea.vue: companyName, rif, address, estado, phone. */
export function aEmpresa(doc, estadosValidos = []) {
  if (!doc) return {}
  return sinVacios({
    companyName: texto(doc.nombre),
    rif: texto(doc.rif),
    address: texto(doc.domicilio_fiscal),
    estado: coincidirEstado(doc.estado, estadosValidos),
    phone: texto(doc.telefono),
  })
}

/** Empata el estado leído ("EDO. MIRANDA", "Distrito Capital") con la lista de la app. */
export function coincidirEstado(estado, lista = []) {
  const buscado = sinTildes(estado).replace(/^(estado|edo\.?)\s+/, '').trim()
  if (!buscado) return ''
  const exacto = lista.find((e) => sinTildes(e) === buscado)
  if (exacto) return exacto
  const parcial = lista.find((e) => sinTildes(e).includes(buscado) || buscado.includes(sinTildes(e)))
  return parcial || ''
}

/** Compara dos RIF ignorando guiones y espacios. */
export function rifCoincide(a, b) {
  const limpio = (v) => texto(v).toUpperCase().replace(/[^A-Z0-9]/g, '')
  const x = limpio(a)
  const y = limpio(b)
  return !!x && !!y && x === y
}

// ── Llenar solo lo vacío y deshacer ────────────────────────────────────

/**
 * Llena en `form` los campos vacíos con `datos`. `forzar` lista campos que
 * siempre se sobrescriben (p. ej. un selector que ya trae un valor por defecto).
 * @returns {{ campos: string[], previo: Object }} lo que cambió y su valor anterior
 */
export function aplicarSoloVacios(form, datos, forzar = []) {
  const campos = []
  const previo = {}
  for (const [campo, valor] of Object.entries(datos || {})) {
    if (valor === '' || valor == null) continue
    const actual = form[campo]
    const vacio = actual == null || String(actual).trim() === ''
    if (!vacio && !forzar.includes(campo)) continue
    if (actual === valor) continue
    previo[campo] = actual
    form[campo] = valor
    campos.push(campo)
  }
  return { campos, previo }
}

/** Devuelve los campos a como estaban antes de llenarlos. */
export function restaurar(form, previo) {
  for (const [campo, valor] of Object.entries(previo || {})) form[campo] = valor
}

// ── Fechas ─────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' (o 'DD/MM/AAAA') a 'YYYY-MM-DD'; '' si no es una fecha. */
export function fechaIso(f) {
  const s = texto(f)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

/** 'YYYY-MM-DD' a 'DD/MM/AAAA'. */
export function fechaParaMostrar(f) {
  const iso = fechaIso(f)
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export default {
  leerDocumento, mensajeDeError, avisoDeCalidad, aProveedor, aCliente, aEmpresa,
  aplicarSoloVacios, restaurar,
}
