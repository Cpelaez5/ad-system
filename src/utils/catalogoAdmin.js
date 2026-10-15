/**
 * catalogoAdmin.js — lógica PURA del panel del super admin para el catálogo
 * global (docs/mvp/diseno/catalogo-global.md): validaciones, búsqueda, ruta de
 * la foto de estudio y lectura de la semilla de productos desde Excel.
 * Sin red ni DOM, para poder probarla.
 */
import { codigoBarrasValido, limpiarCodigoBarras } from '@/utils/codigoBarras.js'
import {
  detectarEncabezados, sugerirMapeo, filasDesdeMatriz, parseUnidad, normalizar,
  MAX_FILAS,
} from '@/utils/importacionProductos.js'

export const FILTROS_CATALOGO = Object.freeze({ POR_VERIFICAR: 'por_verificar', VERIFICADOS: 'verificados', TODOS: 'todos' })
export const EXTENSIONES_FOTO = Object.freeze(['jpg', 'jpeg', 'png', 'webp'])
export const MAX_BYTES_FOTO = 5 * 1024 * 1024

const texto = (v) => String(v ?? '').trim()
const opcional = (v, max) => {
  const t = texto(v)
  return t ? t.slice(0, max) : null
}

/**
 * RIF del catálogo: letra J/G/C + 9 dígitos. Acepta "J-12345678-9", "j123456789", "RIF J-…".
 * @returns {{ rifNormalizado: string, rif: string }|null}
 */
export function rifDeCatalogo(valor) {
  const limpio = texto(valor).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^RIF/, '')
  if (!/^[JGC]\d{9}$/.test(limpio)) return null
  return { rifNormalizado: limpio, rif: `${limpio[0]}-${limpio.slice(1, 9)}-${limpio[9]}` }
}

/** Valida y deja listo el proveedor para guardar. */
export function validarProveedor(form = {}) {
  const errores = {}
  const rif = rifDeCatalogo(form.rif)
  if (!rif) errores.rif = 'El RIF debe empezar con J, G o C y tener 9 números (ej. J-12345678-9). Las personas naturales no van en el catálogo.'
  const razon = texto(form.razon_social)
  if (razon.length < 3) errores.razon_social = 'Escribe la razón social.'
  const ok = Object.keys(errores).length === 0
  const valor = ok
    ? {
        rif_normalizado: rif.rifNormalizado,
        rif: rif.rif,
        razon_social: razon.slice(0, 160),
        nombre_comercial: opcional(form.nombre_comercial, 160),
        tipo_persona: rif.rifNormalizado[0] === 'G' ? 'gobierno' : 'juridica',
        domicilio_fiscal: opcional(form.domicilio_fiscal, 300),
        es_contribuyente_especial: typeof form.es_contribuyente_especial === 'boolean' ? form.es_contribuyente_especial : null,
        actividad: opcional(form.actividad, 200),
      }
    : null
  return { ok, errores, valor }
}

/** Valida y deja listo el producto para guardar. */
export function validarProducto(form = {}) {
  const errores = {}
  const codigo = limpiarCodigoBarras(form.codigo_barras)
  if (!codigo) errores.codigo_barras = 'Escribe el código de barras.'
  else if (!codigoBarrasValido(codigo)) errores.codigo_barras = 'Ese código de barras no es válido: revisa los números (EAN-8, UPC o EAN-13).'
  const nombre = texto(form.nombre)
  if (nombre.length < 2) errores.nombre = 'Escribe el nombre del producto.'
  const ok = Object.keys(errores).length === 0
  const valor = ok
    ? {
        codigo_barras: codigo,
        nombre: nombre.slice(0, 160),
        marca: opcional(form.marca, 80),
        categoria: opcional(form.categoria, 80),
        presentacion: opcional(form.presentacion, 80),
        unidad: opcional(form.unidad, 20),
      }
    : null
  return { ok, errores, valor }
}

/** Saca de la búsqueda lo que rompe un filtro `or` de PostgREST (comas, paréntesis, comodines). */
export function limpiarBusqueda(valor) {
  return texto(valor).replace(/[,()%*\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

/** Texto del filtro `or` de PostgREST para buscar en proveedores o productos ('' si no hay búsqueda). */
export function filtroBusqueda(tipo, valor) {
  const t = limpiarBusqueda(valor)
  if (!t) return ''
  const campos = tipo === 'proveedores'
    ? ['razon_social', 'rif', 'nombre_comercial', 'rif_normalizado']
    : ['nombre', 'marca', 'categoria', 'codigo_barras']
  return campos.map((c) => `${c}.ilike.%${t}%`).join(',')
}

/** Orden de una lista ya traída: por verificar = más confirmaciones primero (luego la más reciente). */
export function ordenarCatalogo(lista = [], filtro = FILTROS_CATALOGO.TODOS) {
  const copia = [...lista]
  if (filtro === FILTROS_CATALOGO.POR_VERIFICAR) {
    copia.sort((a, b) => (b.confirmaciones || 0) - (a.confirmaciones || 0) || String(b.created_at || '').localeCompare(String(a.created_at || '')))
  }
  return copia
}

/** Extensión permitida de una foto ('jpg', 'png', 'webp') o null. */
export function extensionFoto(archivo) {
  const porNombre = texto(archivo?.name).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  const porTipo = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[archivo?.type]
  const ext = porTipo || (porNombre === 'jpeg' ? 'jpg' : porNombre)
  return ['jpg', 'png', 'webp'].includes(ext) ? ext : null
}

/** Ruta en el bucket `catalogo`: productos/<codigo_barras>.<ext>. null si falta algo válido. */
export function rutaFotoCatalogo(codigoBarras, ext) {
  const codigo = limpiarCodigoBarras(codigoBarras)
  if (!codigoBarrasValido(codigo) || !['jpg', 'png', 'webp'].includes(ext)) return null
  return `productos/${codigo}.${ext}`
}

/** Valida el archivo de la foto: devuelve un mensaje de error o ''. */
export function errorFoto(archivo) {
  if (!archivo) return 'Elige una foto.'
  if (!extensionFoto(archivo)) return 'La foto debe ser JPG, PNG o WebP.'
  if (archivo.size > MAX_BYTES_FOTO) return 'La foto pesa más de 5 MB.'
  return ''
}

/**
 * Une una fila de la semilla con el producto que ya existe en el catálogo:
 * un dato vacío del Excel NO borra el que ya estaba (marca, categoría…).
 */
export function fusionarSemilla(fila, existente) {
  if (!existente) return { ...fila, fuente: 'importado' }
  const salida = { codigo_barras: fila.codigo_barras, nombre: fila.nombre || existente.nombre, fuente: 'importado' }
  for (const c of ['marca', 'categoria', 'presentacion', 'unidad']) salida[c] = fila[c] ?? existente[c] ?? null
  return salida
}

/**
 * Semilla de productos desde una matriz de Excel: reutiliza la detección de
 * encabezados y sinónimos de `importacionProductos`. Columnas que usa: nombre,
 * marca, categoría, presentación, unidad y código de barras.
 * @returns {{ validas: object[], errores: {fila:number, mensaje:string}[], duplicadas: number, columnasFaltantes: string[], total: number }}
 */
export function filasSemilla(matriz = []) {
  const vacio = { validas: [], errores: [], duplicadas: 0, columnasFaltantes: [], total: 0 }
  if (!Array.isArray(matriz) || matriz.length < 2) return { ...vacio, columnasFaltantes: ['nombre', 'codigo_barras'] }
  const filaEnc = detectarEncabezados(matriz, 'otro')
  const encabezados = (matriz[filaEnc] || []).map((c) => String(c ?? ''))
  const mapeo = sugerirMapeo(encabezados, 'otro').map((clave, i) => {
    if (clave === 'attr:presentacion') return 'presentacion'
    if (!clave && ['presentacion', 'contenido', 'tamano', 'peso'].includes(normalizar(encabezados[i]))) return 'presentacion'
    return clave
  })
  const faltan = ['nombre', 'codigo_barras'].filter((k) => !mapeo.includes(k))
  if (faltan.length) return { ...vacio, columnasFaltantes: faltan }
  const filas = filasDesdeMatriz(matriz, filaEnc, mapeo)
  const vistos = new Set()
  const res = { ...vacio, total: filas.length }
  for (const { fila, crudo } of filas.slice(0, MAX_FILAS)) {
    const codigo = limpiarCodigoBarras(String(crudo.codigo_barras ?? '').replace(/\.0+$/, ''))
    const v = validarProducto({
      codigo_barras: codigo,
      nombre: crudo.nombre,
      marca: crudo.marca,
      categoria: crudo.categoria,
      presentacion: crudo.presentacion,
      unidad: crudo.unidad ? parseUnidad(crudo.unidad) : null,
    })
    if (!v.ok) { res.errores.push({ fila, mensaje: Object.values(v.errores)[0] }); continue }
    if (vistos.has(v.valor.codigo_barras)) { res.duplicadas++; continue }
    vistos.add(v.valor.codigo_barras)
    res.validas.push(v.valor)
  }
  return res
}
