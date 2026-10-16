/**
 * estiloExcel.js — estilo común de los Excel que genera el sistema (marca AD System).
 * Granate #8E1818 y carbón #2A2A2E; nada de azul marino ni dorado (son de otra empresa).
 */
export const COLOR_GRANATE = 'FF8E1818'
export const COLOR_CARBON = 'FF2A2A2E'
export const COLOR_GRIS_CLARO = 'FFF4F4F5'

/** Número con miles y 2 decimales (Excel lo muestra según el idioma del equipo: 104.036,77 en Venezuela). */
export const FORMATO_NUMERO = '#,##0.00'
export const FORMATO_BS = '"Bs" #,##0.00'
export const FORMATO_USD = '"$" #,##0.00'

const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

/** Encabezado de tabla: texto blanco en negrita sobre granate, centrado y con ajuste de línea. */
export function estilizarEncabezado(celda, { color = COLOR_GRANATE, tamano = 10 } = {}) {
  celda.font = { bold: true, size: tamano, color: { argb: 'FFFFFFFF' } }
  celda.fill = relleno(color)
  celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  celda.border = {
    top: { style: 'thin', color: { argb: 'FF8C8C90' } },
    left: { style: 'thin', color: { argb: 'FF8C8C90' } },
    bottom: { style: 'thin', color: { argb: 'FF8C8C90' } },
    right: { style: 'thin', color: { argb: 'FF8C8C90' } },
  }
}

/** Estiliza toda una fila de encabezado de hoja. */
export function estilizarFilaEncabezado(fila, opciones) {
  fila.eachCell({ includeEmpty: false }, (c) => estilizarEncabezado(c, opciones))
  fila.height = Math.max(fila.height || 0, 24)
}

/** Fila de totales: negrita sobre gris claro. */
export function estilizarTotales(celda) {
  celda.font = { bold: true, size: 10 }
  celda.fill = relleno(COLOR_GRIS_CLARO)
}

/** Congela las filas de arriba (el encabezado queda visible al bajar). */
export function congelarEncabezado(hoja, filas = 1) {
  hoja.views = [{ state: 'frozen', ySplit: filas }]
}

/** Texto que nunca es "undefined", "null" ni "NaN". */
export function textoSeguro(valor, vacio = '') {
  if (valor === null || valor === undefined) return vacio
  const t = String(valor).trim()
  if (t === '' || t === 'undefined' || t === 'null' || t === 'NaN') return vacio
  return t
}

/** Número seguro (NaN y vacíos pasan a 0). */
export function numeroSeguro(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}
