/**
 * Importación de productos desde Excel/CSV — lógica pura (sin red, sin DOM).
 * Especificación: docs/mvp/diseno/productos-y-servicios.md §7.
 *
 * Flujo: matriz de celdas -> detectarEncabezados -> sugerirMapeo -> filasDesdeMatriz
 *        -> construirFila (valida) -> planificar (nuevo / actualizar / error).
 */
import { camposDe, CAMPOS_SERVICIO, tipoPorDefecto } from '@/constants/rubros.js'
import { codigoBarrasValido, limpiarCodigoBarras } from '@/utils/codigoBarras.js'

export const MAX_FILAS = 2000
export const MAX_BYTES = 5 * 1024 * 1024

/** Minúsculas, sin acentos, solo letras y números separados por un espacio. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ── Campos y sinónimos ───────────────────────────────────────────────────────

/** Campos esenciales. `sinonimos` ya normalizados. */
export const CAMPOS_BASE = [
  { clave: 'nombre', etiqueta: 'Nombre', sinonimos: ['nombre', 'nombre del producto', 'producto', 'articulo', 'item', 'denominacion', 'titulo', 'nombre producto', 'nombre articulo'] },
  { clave: 'codigo', etiqueta: 'Código', sinonimos: ['codigo', 'cod', 'sku', 'ref', 'referencia', 'codigo interno', 'codigo producto', 'item code', 'id'] },
  { clave: 'codigo_barras', etiqueta: 'Código de barras', sinonimos: ['codigo de barras', 'codigo barras', 'cod barras', 'cod de barras', 'barras', 'ean', 'ean13', 'upc', 'gtin'] },
  { clave: 'tipo', etiqueta: 'Tipo (producto o servicio)', sinonimos: ['tipo', 'tipo de producto', 'clase'] },
  { clave: 'categoria', etiqueta: 'Categoría', sinonimos: ['categoria', 'departamento', 'grupo', 'linea', 'familia', 'rubro'] },
  { clave: 'marca', etiqueta: 'Marca', sinonimos: ['marca', 'fabricante'] },
  { clave: 'descripcion', etiqueta: 'Descripción', sinonimos: ['descripcion', 'observaciones', 'observacion', 'comentario', 'nota', 'notas'] },
  { clave: 'precio', etiqueta: 'Precio de venta', sinonimos: ['precio', 'p venta', 'pvp', 'precio venta', 'precio de venta', 'precio usd', 'precio unitario', 'venta', 'precio al detal', 'detal', 'precio publico'] },
  { clave: 'costo', etiqueta: 'Costo', sinonimos: ['costo', 'p costo', 'costo unitario', 'precio costo', 'precio de costo', 'costo usd', 'compra', 'precio compra', 'precio de compra'] },
  { clave: 'moneda', etiqueta: 'Moneda', sinonimos: ['moneda', 'divisa'] },
  { clave: 'iva', etiqueta: 'IVA', sinonimos: ['iva', 'impuesto', 'alicuota', 'tax'] },
  { clave: 'unidad', etiqueta: 'Unidad', sinonimos: ['unidad', 'und', 'unidad de medida', 'u m', 'um', 'medida'] },
  { clave: 'existencias', etiqueta: 'Existencias', sinonimos: ['existencia', 'existencias', 'stock', 'cantidad', 'cant', 'inv', 'inventario', 'disponible', 'saldo'] },
  { clave: 'existencias_minimas', etiqueta: 'Existencias mínimas', sinonimos: ['stock minimo', 'minimo', 'existencia minima', 'existencias minimas', 'min', 'stock min', 'cantidad minima', 'punto de reorden'] },
]

/** Claves de un campo del rubro dentro del mapeo. */
export const claveAtributo = (clave) => `attr:${clave}`

/** Campos de rubro (productos y servicios, sin repetir claves) con su clave de mapeo. */
export function camposRubro(rubro) {
  const vistos = new Set()
  const lista = []
  for (const c of [...camposDe(rubro, 'producto'), ...CAMPOS_SERVICIO]) {
    if (vistos.has(c.clave)) continue
    vistos.add(c.clave)
    lista.push({
      clave: claveAtributo(c.clave),
      etiqueta: c.etiqueta,
      campo: c,
      sinonimos: [...new Set([normalizar(c.clave), normalizar(c.etiqueta)])],
    })
  }
  return lista
}

/** Todos los campos a los que puede ir una columna, para un rubro. */
export function camposDestino(rubro) {
  return [...CAMPOS_BASE, ...camposRubro(rubro)]
}

// ── Números y monedas ────────────────────────────────────────────────────────

/**
 * Convierte "1.234,56", "1,234.56", "$10", "10,5", 10 → número.
 * Devuelve null si está vacío y NaN si no es un número.
 */
export function parseNumero(valor) {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN
  let t = String(valor).trim()
  if (t === '') return null
  t = t.replace(/(bs\.?s?|ves|usd|eur|us\$|\$|€|\s)/gi, '')
  if (t === '') return NaN
  let negativo = false
  if (/^\(.*\)$/.test(t)) { negativo = true; t = t.slice(1, -1) }
  if (t.startsWith('-')) { negativo = !negativo; t = t.slice(1) }
  if (!/^[0-9.,]+$/.test(t) || !/[0-9]/.test(t)) return NaN
  const ultimaComa = t.lastIndexOf(',')
  const ultimoPunto = t.lastIndexOf('.')
  let limpio
  if (ultimaComa !== -1 && ultimoPunto !== -1) {
    // El que aparece de último es el decimal.
    limpio = ultimaComa > ultimoPunto
      ? t.replace(/\./g, '').replace(',', '.')
      : t.replace(/,/g, '')
  } else if (ultimaComa !== -1 || ultimoPunto !== -1) {
    const sep = ultimaComa !== -1 ? ',' : '.'
    const partes = t.split(sep)
    if (partes.length > 2) {
      limpio = partes.join('') // 1.234.567 -> miles
    } else {
      const [ent, dec] = partes
      // "1.234" o "1,234": un solo separador con 3 dígitos y entero corto (no 0) = miles
      const esMiles = dec.length === 3 && ent.length >= 1 && ent.length <= 3 && Number(ent) !== 0
      limpio = esMiles ? ent + dec : `${ent}.${dec}`
    }
  } else {
    limpio = t
  }
  const n = Number(limpio)
  if (!Number.isFinite(n)) return NaN
  return negativo ? -n : n
}

/** 'USD' | 'VES' | 'EUR' | null según un símbolo o texto ("$10", "Bs 5", "usd"). */
export function detectarMoneda(valor) {
  if (valor === null || valor === undefined) return null
  const t = String(valor).trim().toLowerCase()
  if (!t) return null
  if (/€|\beur\b|euro/.test(t)) return 'EUR'
  if (/\$|\busd\b|dolar|dólar|\bus\b/.test(t) && !/bs/.test(t)) return 'USD'
  if (/\bbs\b|bs\.|bs\d|\bves\b|bolivar|bolívar/.test(t)) return 'VES'
  return null
}

// ── Detección de encabezados y mapeo ─────────────────────────────────────────

const esVacia = (celda) => celda === null || celda === undefined || String(celda).trim() === ''

function puntajeEncabezado(celda, sinonimos) {
  const t = normalizar(celda)
  if (!t) return 0
  let mejor = 0
  for (const s of sinonimos) {
    if (t === s) mejor = Math.max(mejor, 1000 + s.length)
    else if (` ${t} `.includes(` ${s} `)) mejor = Math.max(mejor, s.length)
  }
  return mejor
}

/**
 * Busca la fila de encabezados entre las primeras 15 (hay archivos con título
 * o logo arriba). Devuelve el índice de la fila con más columnas reconocidas.
 */
export function detectarEncabezados(matriz, rubro = 'otro') {
  const destino = camposDestino(rubro)
  let mejor = { fila: 0, aciertos: -1 }
  const limite = Math.min(matriz.length, 15)
  for (let i = 0; i < limite; i++) {
    const fila = matriz[i] || []
    if (fila.filter((c) => !esVacia(c)).length < 2) continue
    let aciertos = 0
    for (const celda of fila) {
      if (destino.some((c) => puntajeEncabezado(celda, c.sinonimos) > 0)) aciertos++
    }
    if (aciertos > mejor.aciertos) mejor = { fila: i, aciertos }
  }
  if (mejor.aciertos < 0) {
    const primera = matriz.findIndex((f) => (f || []).some((c) => !esVacia(c)))
    return Math.max(primera, 0)
  }
  return mejor.fila
}

/**
 * Asocia cada columna a un campo por sinónimos. Devuelve un arreglo del largo
 * de los encabezados con la clave de destino o '' (ignorar). Una clave se usa
 * en una sola columna. Si no hay "nombre" pero sí "descripción", esta pasa a ser el nombre.
 */
export function sugerirMapeo(encabezados, rubro = 'otro') {
  const destino = camposDestino(rubro)
  const candidatos = []
  encabezados.forEach((enc, col) => {
    for (const c of destino) {
      const p = puntajeEncabezado(enc, c.sinonimos)
      if (p > 0) candidatos.push({ col, clave: c.clave, p })
    }
  })
  candidatos.sort((a, b) => b.p - a.p || a.col - b.col)
  const mapeo = encabezados.map(() => '')
  const usadas = new Set()
  for (const c of candidatos) {
    if (mapeo[c.col] || usadas.has(c.clave)) continue
    mapeo[c.col] = c.clave
    usadas.add(c.clave)
  }
  if (!usadas.has('nombre') && usadas.has('descripcion')) {
    const col = mapeo.indexOf('descripcion')
    mapeo[col] = 'nombre'
  }
  return mapeo
}

/** Moneda sugerida por el encabezado de precio/costo ("Precio $" -> USD). */
export function monedasPorColumna(encabezados, mapeo) {
  const res = {}
  mapeo.forEach((clave, i) => {
    if (clave === 'precio' || clave === 'costo') {
      const m = detectarMoneda(encabezados[i])
      if (m) res[clave] = m
    }
  })
  return res
}

/**
 * Pasa la matriz a filas "crudas" { clave: valor } según el mapeo.
 * Se saltan las filas totalmente vacías. `fila` es el número de fila en el archivo (1 = primera).
 */
export function filasDesdeMatriz(matriz, filaEncabezado, mapeo) {
  const filas = []
  for (let i = filaEncabezado + 1; i < matriz.length; i++) {
    const celdas = matriz[i] || []
    if (celdas.every(esVacia)) continue
    const crudo = {}
    mapeo.forEach((clave, col) => {
      if (clave && !esVacia(celdas[col])) crudo[clave] = celdas[col]
    })
    filas.push({ fila: i + 1, crudo })
  }
  return filas
}

// ── Validación de una fila ───────────────────────────────────────────────────

const UNIDADES = {
  UND: ['und', 'unidad', 'unidades', 'unid', 'u', 'pieza', 'pza', 'pz'],
  KG: ['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos', 'kgs'],
  LTS: ['lt', 'lts', 'l', 'litro', 'litros'],
  MTS: ['mt', 'mts', 'm', 'metro', 'metros'],
  CAJA: ['caja', 'cajas'],
  BULTO: ['bulto', 'bultos', 'paq', 'paquete', 'paquetes', 'saco', 'sacos'],
}

export function parseUnidad(valor) {
  const t = normalizar(valor)
  if (!t) return null
  for (const [codigo, alias] of Object.entries(UNIDADES)) {
    if (alias.includes(t)) return codigo
  }
  return null
}

/** 'IVA_G' | 'IVA_R' | 'IVA_A' | 'EXENTO' | null (vacío) | undefined (no se entiende). */
export function parseIva(valor) {
  if (esVacia(valor)) return null
  const t = normalizar(valor)
  if (['exento', 'exenta', 'ex', 'e', '0', 'no', 'sin iva'].includes(t)) return 'EXENTO'
  if (['general', 'g', 'iva g', 'iva general', 'si', 'con iva'].includes(t)) return 'IVA_G'
  if (['reducido', 'r', 'iva r', 'iva reducido'].includes(t)) return 'IVA_R'
  if (['lujo', 'adicional', 'a', 'iva a', 'iva lujo'].includes(t)) return 'IVA_A'
  const n = parseNumero(String(valor).replace('%', ''))
  if (n === 16) return 'IVA_G'
  if (n === 8) return 'IVA_R'
  if (n === 15) return 'IVA_A'
  if (n === 0) return 'EXENTO'
  return undefined
}

function parseSiNo(valor) {
  const t = normalizar(valor)
  if (['si', 's', 'x', '1', 'true', 'verdadero', 'yes', 'y'].includes(t)) return true
  if (['no', 'n', '0', 'false', 'falso'].includes(t)) return false
  return undefined
}

const pad = (n) => String(n).padStart(2, '0')

/** Fecha -> 'AAAA-MM-DD' o undefined si no se entiende. Acepta Date, serial de Excel, DD/MM/AAAA y AAAA-MM-DD. */
export function parseFecha(valor) {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? undefined : `${valor.getFullYear()}-${pad(valor.getMonth() + 1)}-${pad(valor.getDate())}`
  }
  if (typeof valor === 'number') {
    if (valor < 20000 || valor > 80000) return undefined
    const d = new Date(Math.round((valor - 25569) * 86400 * 1000))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const t = String(valor).trim()
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return valida(+m[1], +m[2], +m[3])
  m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) return valida(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1])
  return undefined
}
function valida(a, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
  return `${a}-${pad(m)}-${pad(d)}`
}

const txt = (v, max) => {
  const t = String(v ?? '').trim()
  return t === '' ? null : t.slice(0, max)
}
/** Códigos como texto sin notación científica ni ".0". */
const codigoTexto = (v, max = 60) => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.round(v) === v ? v : v).slice(0, max)
  return txt(v, max)
}

/**
 * Valida y convierte una fila cruda.
 * ctx: { rubro, monedaDefecto='VES', monedasColumna={} }
 * Devuelve { datos, existencias, errores:[{campo, mensaje}] }.
 *   datos: solo las claves que vinieron en el archivo (así actualizar no pisa lo demás).
 */
export function construirFila(crudo, ctx = {}) {
  const { rubro = 'otro', monedaDefecto = 'VES', monedasColumna = {} } = ctx
  const errores = []
  const datos = {}
  const err = (campo, mensaje) => errores.push({ campo, mensaje })

  // Tipo
  let tipo = tipoPorDefecto(rubro)
  if (!esVacia(crudo.tipo)) {
    const t = normalizar(crudo.tipo)
    if (/^serv/.test(t)) tipo = 'servicio'
    else if (/^prod|^art|^bien|^mercan/.test(t)) tipo = 'producto'
    else err('tipo', `El tipo "${crudo.tipo}" no se entiende: escribe "Producto" o "Servicio"`)
    if (!errores.length) datos.tipo = tipo
  }
  datos.tipo = datos.tipo || tipo

  // Nombre
  const nombre = txt(crudo.nombre, 160)
  if (!nombre) err('nombre', 'Falta el nombre')
  else datos.name = nombre

  if (!esVacia(crudo.codigo)) datos.code = codigoTexto(crudo.codigo)
  if (!esVacia(crudo.codigo_barras)) datos.codigo_barras = codigoTexto(crudo.codigo_barras)
  if (!esVacia(crudo.categoria)) datos.categoria = txt(crudo.categoria, 80)
  if (!esVacia(crudo.marca)) datos.marca = txt(crudo.marca, 80)
  if (!esVacia(crudo.descripcion)) datos.description = txt(crudo.descripcion, 1000)

  // Moneda
  let moneda = null
  if (!esVacia(crudo.moneda)) {
    moneda = detectarMoneda(crudo.moneda) || (['ves', 'bs', 'bolivares'].includes(normalizar(crudo.moneda)) ? 'VES' : null)
    if (!moneda) err('moneda', `La moneda "${crudo.moneda}" no se entiende: usa Bs, USD o EUR`)
  }

  // Números
  const numero = (clave, etiqueta, { entero = false } = {}) => {
    if (esVacia(crudo[clave])) return undefined
    const n = parseNumero(crudo[clave])
    if (Number.isNaN(n)) { err(clave, `${etiqueta} "${crudo[clave]}" no es un número`); return undefined }
    if (n < 0) { err(clave, `${etiqueta} no puede ser negativo`); return undefined }
    return entero ? Math.round(n) : n
  }
  const precio = numero('precio', 'El precio')
  const costo = numero('costo', 'El costo')
  const existencias = numero('existencias', 'Las existencias')
  const minimas = numero('existencias_minimas', 'El mínimo')

  if (precio !== undefined) datos.sale_price = precio
  if (costo !== undefined && datos.tipo === 'producto') datos.cost_price = costo
  if (minimas !== undefined && datos.tipo === 'producto') datos.min_stock = minimas

  // La moneda de la fila: columna Moneda, símbolo en la celda, símbolo en el encabezado o la elegida.
  if (precio !== undefined || costo !== undefined || moneda) {
    datos.currency = moneda
      || detectarMoneda(crudo.precio)
      || detectarMoneda(crudo.costo)
      || monedasColumna.precio
      || monedasColumna.costo
      || monedaDefecto
  }

  if (!esVacia(crudo.iva)) {
    const iva = parseIva(crudo.iva)
    if (iva === undefined) err('iva', `El IVA "${crudo.iva}" no se entiende: usa General, Reducido, Exento o 16%`)
    else if (iva) datos.tax_type = iva
  }
  if (!esVacia(crudo.unidad)) {
    datos.unit = parseUnidad(crudo.unidad) || 'UND'
  }

  // Atributos del rubro
  const atributos = {}
  for (const c of camposRubro(rubro)) {
    const bruto = crudo[c.clave]
    if (esVacia(bruto)) continue
    const campo = c.campo
    if (campo.aplicaA === 'servicio' && datos.tipo !== 'servicio') continue
    if (campo.aplicaA !== 'servicio' && datos.tipo === 'servicio' && !CAMPOS_SERVICIO.some((s) => s.clave === campo.clave)) continue
    const k = campo.clave
    if (campo.tipo === 'numero') {
      const n = parseNumero(bruto)
      if (Number.isNaN(n)) err(c.clave, `${campo.etiqueta} "${bruto}" no es un número`)
      else atributos[k] = n
    } else if (campo.tipo === 'si_no') {
      const b = parseSiNo(bruto)
      if (b === undefined) err(c.clave, `${campo.etiqueta}: escribe Sí o No`)
      else atributos[k] = b
    } else if (campo.tipo === 'fecha') {
      const f = parseFecha(bruto)
      if (!f) err(c.clave, `${campo.etiqueta} "${bruto instanceof Date ? 'fecha' : bruto}" no es una fecha (usa DD/MM/AAAA)`)
      else atributos[k] = f
    } else if (campo.tipo === 'opciones') {
      const t = normalizar(bruto)
      const op = (campo.opciones || []).find((o) => normalizar(o) === t)
      atributos[k] = op || txt(bruto, 80)
    } else {
      atributos[k] = txt(bruto, 120)
    }
  }
  if (Object.keys(atributos).length) datos.atributos = atributos

  return {
    datos,
    existencias: datos.tipo === 'servicio' ? undefined : existencias,
    errores,
  }
}

// ── Plan: nuevo / se actualizará / con problemas ────────────────────────────

/**
 * Valida todas las filas y decide qué pasará con cada una.
 * @param {{fila:number, crudo:object}[]} filas
 * @param {object} ctx  contexto de construirFila
 * @param {{id:string, code?:string, codigo_barras?:string, stock?:number}[]} existentes productos ya registrados
 * @returns {{ filas: object[], resumen: object }}
 */
export function planificar(filas, ctx, existentes = []) {
  const porCodigo = new Map()
  const porBarras = new Map()
  for (const e of existentes) {
    if (e.code) porCodigo.set(String(e.code).trim().toLowerCase(), e)
    if (e.codigo_barras) porBarras.set(String(e.codigo_barras).trim(), e)
  }
  const vistosCodigo = new Map()
  const vistosBarras = new Map()

  const resultado = filas.map((f) => {
    const { datos, existencias, errores } = construirFila(f.crudo, ctx)
    const fila = { fila: f.fila, crudo: f.crudo, datos, existencias, errores: [...errores], estado: 'nuevo', existente: null, ajuste: null }
    if (errores.length) { fila.estado = 'error'; return fila }

    const kc = datos.code ? datos.code.toLowerCase() : null
    const kb = datos.codigo_barras || null
    const previo = (kc && vistosCodigo.get(kc)) || (kb && vistosBarras.get(kb))
    if (previo) {
      fila.estado = 'error'
      fila.errores.push({ campo: 'codigo', mensaje: `Repite el código de la fila ${previo}: déjalo una sola vez` })
      return fila
    }
    if (kc) vistosCodigo.set(kc, f.fila)
    if (kb) vistosBarras.set(kb, f.fila)

    const existente = (kc && porCodigo.get(kc)) || (kb && porBarras.get(kb)) || null
    if (existente) {
      fila.estado = 'actualizar'
      fila.existente = existente
      if (existencias !== undefined && existente.tipo !== 'servicio') {
        const delta = existencias - (Number(existente.stock) || 0)
        if (delta !== 0) fila.ajuste = { nuevo: existencias, actual: Number(existente.stock) || 0, delta }
      }
    }
    return fila
  })

  return { filas: resultado, resumen: resumir(resultado) }
}

/**
 * Catálogo global: a las filas NUEVAS con código de barras válido les completa
 * solo lo que el archivo dejó vacío (marca, categoría, presentación, unidad).
 * Las filas que actualizan un producto existente no se tocan (no se pisa lo
 * que el negocio ya tiene). Las fotos del catálogo NO se copian aquí: serían
 * cientos de subidas (mejora pendiente: copiarlas en segundo plano).
 * @param {object[]} filas  resultado de planificar().filas
 * @param {Map<string,object>} catalogoPorCodigo  codigo_barras -> fila del catálogo
 * @returns {object[]} filas nuevas (copias); las completadas llevan `completadoCatalogo: true`
 */
export function completarConCatalogo(filas, catalogoPorCodigo) {
  if (!catalogoPorCodigo || !catalogoPorCodigo.size) return filas
  return filas.map((f) => {
    if (f.estado !== 'nuevo' || f.datos.tipo === 'servicio') return f
    const codigo = limpiarCodigoBarras(f.datos.codigo_barras)
    if (!codigoBarrasValido(codigo)) return f
    const item = catalogoPorCodigo.get(codigo)
    if (!item) return f
    const datos = { ...f.datos }
    let completado = false
    if (!datos.marca && item.marca) { datos.marca = item.marca; completado = true }
    if (!datos.categoria && item.categoria) { datos.categoria = item.categoria; completado = true }
    if (!datos.unit && item.unidad) {
      const u = parseUnidad(item.unidad)
      if (u) { datos.unit = u; completado = true }
    }
    if (item.presentacion && !datos.atributos?.presentacion) {
      datos.atributos = { ...(datos.atributos || {}), presentacion: item.presentacion }
      completado = true
    }
    return completado ? { ...f, datos, completadoCatalogo: true } : f
  })
}

export function resumir(filas) {
  const nuevos = filas.filter((f) => f.estado === 'nuevo').length
  const actualizar = filas.filter((f) => f.estado === 'actualizar').length
  const errores = filas.filter((f) => f.estado === 'error').length
  const ajustes = filas.filter((f) => f.ajuste).length
  return { total: filas.length, nuevos, actualizar, errores, ajustes, importables: nuevos + actualizar }
}

/** "98 nuevos · 18 se actualizarán · 4 con problemas" */
export function textoResumen(r) {
  const partes = [`${r.nuevos} ${r.nuevos === 1 ? 'nuevo' : 'nuevos'}`, `${r.actualizar} se ${r.actualizar === 1 ? 'actualizará' : 'actualizarán'}`]
  partes.push(`${r.errores} con ${r.errores === 1 ? 'problema' : 'problemas'}`)
  return partes.join(' · ')
}

/** Mensaje de error de una fila en lenguaje llano: "Fila 14: ..." */
export function mensajeFila(fila) {
  return `Fila ${fila.fila}: ${fila.errores.map((e) => e.mensaje).join('; ')}`
}

/** ¿Se puede deshacer? 24 h desde la creación y sin haberse deshecho antes. */
export function puedeDeshacer(importacion, ahora = new Date()) {
  if (!importacion || importacion.deshecha_en || importacion.origen === 'api') return false
  if (!importacion.ids_creados?.length) return false
  const t = new Date(importacion.created_at).getTime()
  return Number.isFinite(t) && ahora.getTime() - t < 24 * 3600 * 1000
}

/** Parte un arreglo en lotes. */
export function enLotes(lista, tamano = 50) {
  const lotes = []
  for (let i = 0; i < lista.length; i += tamano) lotes.push(lista.slice(i, i + tamano))
  return lotes
}
