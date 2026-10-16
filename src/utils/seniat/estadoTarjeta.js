/**
 * estadoTarjeta.js — estado de cada tarjeta de "SENIAT del mes". Función pura.
 *
 * Estados: nada | faltan_datos | lista | descargada | declarada | cambios
 * "cambios" = ya se descargó/declaró, pero las retenciones del período cambiaron
 * (se comparan `lineas` y `monto_total` guardados contra los actuales).
 */

const CENTIMO = 0.01

/**
 * @param {object} p
 * @param {number} p.lineas        comprobantes/registros del período hoy
 * @param {number} p.montoTotal    suma de montos hoy
 * @param {number} [p.problemas]   cantidad de problemas de la revisión
 * @param {{estado:string, lineas?:number, monto_total?:number}|null} [p.declaracion] fila guardada
 * @returns {'nada'|'faltan_datos'|'lista'|'descargada'|'declarada'|'cambios'}
 */
export function estadoTarjeta({ lineas = 0, montoTotal = 0, problemas = 0, declaracion = null } = {}) {
  if (declaracion && (declaracion.estado === 'descargada' || declaracion.estado === 'declarada')) {
    const igual = Number(declaracion.lineas ?? 0) === Number(lineas)
      && Math.abs(Number(declaracion.monto_total ?? 0) - Number(montoTotal)) <= CENTIMO
    if (!igual) return 'cambios'
    return declaracion.estado
  }
  if (!lineas) return 'nada'
  if (problemas > 0) return 'faltan_datos'
  return 'lista'
}

/** Texto, ícono y color (de tema) de cada estado: nunca solo color. */
export const META_ESTADO = {
  nada: { etiqueta: 'Nada que declarar', icono: 'mdi-check-circle-outline', color: 'secondary' },
  faltan_datos: { etiqueta: 'Faltan datos', icono: 'mdi-alert-outline', color: 'warning' },
  lista: { etiqueta: 'Lista para descargar', icono: 'mdi-file-download-outline', color: 'primary' },
  descargada: { etiqueta: 'Descargada', icono: 'mdi-tray-arrow-down', color: 'info' },
  declarada: { etiqueta: 'Declarada', icono: 'mdi-check-decagram', color: 'success' },
  cambios: { etiqueta: 'Lista para descargar (hubo cambios)', icono: 'mdi-update', color: 'warning' },
}

export function metaEstado(estado) {
  return META_ESTADO[estado] || META_ESTADO.nada
}

/** ¿Este estado cuenta como "algo pendiente" (punto en el menú, sugerencia en Inicio)? */
export function estadoPendiente(estado) {
  return estado === 'lista' || estado === 'faltan_datos' || estado === 'cambios'
}
