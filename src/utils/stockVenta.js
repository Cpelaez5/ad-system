/**
 * stockVenta.js — reglas de stock al VENDER (formulario de factura).
 * Los servicios no llevan stock: siempre se pueden vender y nunca se descuentan.
 */

export function esServicio(producto) {
  return !!producto && producto.tipo === 'servicio'
}

/** ¿Este producto se puede elegir en una venta? (servicios siempre; productos con stock > 0) */
export function vendible(producto, flow) {
  if (flow !== 'VENTA') return true
  return esServicio(producto) || Number(producto?.stock) > 0
}

/** ¿La línea pide más de lo que hay? Los servicios nunca exceden. */
export function excedeStock(item, flow) {
  if (flow !== 'VENTA' || !item?.product || esServicio(item.product)) return false
  return Number(item.quantity) > Number(item.product.stock)
}
