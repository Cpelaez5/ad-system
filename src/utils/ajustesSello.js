/**
 * Tamaño y posición del sello y la firma en los comprobantes. Lo usan el PDF
 * (retention-pdf-service.js → estamparSelloYFirma) y la vista previa
 * (VistaPreviaSelloFirma.vue), así que ambos quedan idénticos.
 * Ver docs/mvp/diseno/sello-y-firma-ajustes.md §1.
 *
 * Todo en milímetros, relativo a la línea de firma del agente (inicio = x, línea = y).
 * La imagen se ancla por su borde INFERIOR: al agrandarla crece hacia arriba y no tapa el rótulo.
 */

export const LIMITES = { escalaMin: 0.6, escalaMax: 1.6, desplazamiento: 20 }

/** Medidas base (escala 1, sin desplazamiento). */
export const BASE = {
  sello: { alto: 22, anchoMax: 35, x: 10, abajo: 4 }, // borde izquierdo a 10 mm del inicio; 4 mm bajo la línea
  firma: { alto: 14, anchoMax: 38, margenDerecho: 4, abajo: 1 }, // borde derecho a 4 mm del fin de la línea
}

export const AJUSTES_POR_DEFECTO = Object.freeze({
  sello: { escala: 1, dx: 0, dy: 0 },
  firma: { escala: 1, dx: 0, dy: 0 },
})

const recortar = (v, min, max, porDefecto) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : porDefecto
}

/** Limpia lo que venga de la BD: números dentro de los límites, o los valores por defecto. */
export function normalizarAjustes(raw) {
  const uno = (a) => ({
    escala: Math.round(recortar(a?.escala, LIMITES.escalaMin, LIMITES.escalaMax, 1) * 100) / 100,
    dx: recortar(a?.dx, -LIMITES.desplazamiento, LIMITES.desplazamiento, 0),
    dy: recortar(a?.dy, -LIMITES.desplazamiento, LIMITES.desplazamiento, 0),
  })
  return { sello: uno(raw?.sello), firma: uno(raw?.firma) }
}

/**
 * Caja de la imagen relativa a la línea del agente.
 * @param {'sello'|'firma'} tipo
 * @param {{ escala, dx, dy }} ajuste
 * @param {number} anchoLinea  largo de la línea (mm)
 * @param {number} proporcion  ancho/alto de la imagen (para el ancho real)
 * @returns {{ x: number, y: number, ancho: number, alto: number }}  x/y desde el inicio de la línea y desde la línea (y negativa = arriba)
 */
export function cajaImagen(tipo, ajuste, anchoLinea, proporcion = 1) {
  const b = BASE[tipo]
  const a = { escala: 1, dx: 0, dy: 0, ...ajuste }
  const alto = b.alto * a.escala
  const ancho = Math.min(b.anchoMax * a.escala, alto * proporcion)
  const y = b.abajo - alto + a.dy
  const x = tipo === 'sello' ? b.x + a.dx : anchoLinea - b.margenDerecho - ancho + a.dx
  return { x, y, ancho, alto }
}
