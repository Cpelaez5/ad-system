/**
 * estante.js — lógica pura de "Foto del estante" (Mi mercancía).
 * Ver docs/mvp/diseno/productos-y-servicios.md, sección 6.
 *
 * - normalizarTexto: minúsculas, sin tildes ni signos.
 * - buscarCoincidencia: encuentra en el inventario el producto que ya existe.
 * - cajaAPixeles: convierte box_2d (0–1000: [ymin, xmin, ymax, xmax]) en un
 *   rectángulo en píxeles para recortar con canvas.
 * - construirAjustes / resumenEstante: qué se crea y qué se ajusta.
 */

export const MAX_PRODUCTOS_ESTANTE = 40

export function normalizarTexto(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(texto) {
  return normalizarTexto(texto).split(' ').filter(t => t.length > 1)
}

function esActivo(p) {
  return p && !p.deleted_at && p.tipo !== 'servicio'
}

/**
 * Busca en el inventario el producto que corresponde a lo visto en la foto.
 * Orden: código de barras → nombre igual → marca + presentación → nombres
 * que contienen las mismas palabras (mínimo 2).
 * @returns {{producto: object, motivo: string}|null}
 */
export function buscarCoincidencia(item, productos = []) {
  const activos = (productos || []).filter(esActivo)
  if (!item || !activos.length) return null

  const codigo = String(item.codigo_barras ?? '').trim()
  if (codigo) {
    const p = activos.find(x => String(x.codigo_barras ?? '').trim() === codigo)
    if (p) return { producto: p, motivo: 'codigo' }
  }

  const nombre = normalizarTexto(item.nombre)
  if (!nombre) return null

  const igual = activos.find(p => normalizarTexto(p.name) === nombre)
  if (igual) return { producto: igual, motivo: 'nombre' }

  const marca = normalizarTexto(item.marca)
  const presentacion = normalizarTexto(item.presentacion)
  if (marca && presentacion) {
    const p = activos.find(x => {
      const n = normalizarTexto(x.name)
      const marcaP = normalizarTexto(x.marca)
      const presP = normalizarTexto(x.atributos?.presentacion)
      const mismaMarca = marcaP ? marcaP === marca : n.includes(marca)
      const mismaPres = presP ? presP === presentacion : n.includes(presentacion)
      return mismaMarca && mismaPres
    })
    if (p) return { producto: p, motivo: 'marca' }
  }

  const tk = tokens(item.nombre)
  if (tk.length >= 2) {
    const p = activos.find(x => {
      const tp = tokens(x.name)
      if (tp.length < 2) return false
      const [corto, largo] = tk.length <= tp.length ? [tk, tp] : [tp, tk]
      return corto.every(t => largo.includes(t))
    })
    if (p) return { producto: p, motivo: 'parecido' }
  }
  return null
}

/**
 * box_2d [ymin, xmin, ymax, xmax] en 0–1000 → rectángulo en píxeles con un
 * margen. Devuelve null si la caja no sirve (falta, invertida o diminuta).
 */
export function cajaAPixeles(box, ancho, alto, margen = 0.04) {
  if (!Array.isArray(box) || box.length !== 4 || !ancho || !alto) return null
  const [ymin, xmin, ymax, xmax] = box.map(Number)
  if ([ymin, xmin, ymax, xmax].some(n => !Number.isFinite(n))) return null
  if (ymax <= ymin || xmax <= xmin) return null
  const c = v => Math.min(1000, Math.max(0, v))
  let y0 = c(ymin) / 1000, x0 = c(xmin) / 1000, y1 = c(ymax) / 1000, x1 = c(xmax) / 1000
  const mx = (x1 - x0) * margen
  const my = (y1 - y0) * margen
  x0 = Math.max(0, x0 - mx); x1 = Math.min(1, x1 + mx)
  y0 = Math.max(0, y0 - my); y1 = Math.min(1, y1 + my)
  const x = Math.round(x0 * ancho)
  const y = Math.round(y0 * alto)
  const w = Math.round((x1 - x0) * ancho)
  const h = Math.round((y1 - y0) * alto)
  if (w < 16 || h < 16) return null
  return { x, y, w, h }
}

/** Tamaño de salida del recorte sin agrandarlo (lado mayor ≤ max). */
export function tamanoRecorte(w, h, max = 800) {
  const mayor = Math.max(w, h)
  if (mayor <= max) return { w, h }
  const f = max / mayor
  return { w: Math.round(w * f), h: Math.round(h * f) }
}

/**
 * Convierte la respuesta de la IA en tarjetas editables.
 * Estado de cada tarjeta: incluir, nombre, cantidad, coincidencia (producto o
 * null = nuevo), precio (opcional), item (dato original).
 */
export function armarTarjetas(productosIA = [], inventario = []) {
  return (productosIA || []).slice(0, MAX_PRODUCTOS_ESTANTE).map((item, i) => {
    const c = buscarCoincidencia(item, inventario)
    const cant = Math.max(1, Math.round(Number(item.cantidad_visible) || 1))
    return {
      id: `e${i}`,
      incluir: item.confianza !== 'baja',
      nombre: String(item.nombre || '').trim(),
      cantidad: cant,
      precio: null,
      coincidencia: c ? c.producto : null,
      motivo: c ? c.motivo : null,
      item
    }
  })
}

/** Tarjetas incluidas que no existen aún (se crean). */
export function tarjetasNuevas(tarjetas = []) {
  return tarjetas.filter(t => t.incluir && !t.coincidencia && t.nombre.trim())
}

/** Ajustes antes → después de las tarjetas incluidas que ya existen. */
export function construirAjustes(tarjetas = []) {
  return tarjetas
    .filter(t => t.incluir && t.coincidencia)
    .map(t => {
      const antes = Number(t.coincidencia.stock) || 0
      const despues = Math.max(0, Math.round(Number(t.cantidad) || 0))
      return { id: t.id, producto: t.coincidencia, antes, despues, delta: despues - antes }
    })
}

export function resumenEstante(tarjetas = []) {
  return {
    nuevos: tarjetasNuevas(tarjetas).length,
    ajustes: construirAjustes(tarjetas).filter(a => a.delta !== 0).length,
    incluidos: tarjetas.filter(t => t.incluir).length
  }
}
