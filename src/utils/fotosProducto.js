/**
 * fotosProducto.js — qué fotos del bucket `productos` se pueden borrar sin dejar
 * huérfanas ni quitarle la foto a un producto.
 */

/**
 * @param {object} p
 * @param {Array<string|null>} p.iniciales  fotos que tenía el producto al abrir
 * @param {Array<string|null>} p.subidas    fotos subidas en esta sesión (nueva, mejorada, descartadas)
 * @param {Array<string|null>} p.conservar  fotos que deben quedar (foto_path y foto_original_path finales)
 * @param {boolean} p.guardado              true si se guardó (las iniciales reemplazadas también se borran)
 * @returns {string[]} rutas a borrar, sin repetir
 */
export function fotosASuprimir({ iniciales = [], subidas = [], conservar = [], guardado = false }) {
  const quedan = new Set(conservar.filter(Boolean))
  const candidatas = [...subidas, ...(guardado ? iniciales : [])].filter(Boolean)
  return [...new Set(candidatas)].filter(r => !quedan.has(r))
}
