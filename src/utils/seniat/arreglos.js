/**
 * arreglos.js — a dónde lleva el botón "Arreglar" de cada problema de la revisión.
 * Función pura (devuelve el destino para router.push; null si lo arregla el equipo).
 *
 * Enlaces profundos que existen hoy:
 *  - Mi negocio: /cliente/mi-area
 *  - Proveedor: /cliente/proveedores?editar=<id> (abre su edición; agregado con esta función)
 *  - Registro: /cliente/facturacion?tab=compras&ver=<id> (abre el detalle; desde ahí se edita)
 */
export function destinoDeArreglo(arreglo) {
  switch (arreglo?.tipo) {
    case 'negocio':
      return { name: 'ClienteMiArea' }
    case 'proveedor':
      return { name: 'ClienteProveedores', query: arreglo.id ? { editar: arreglo.id } : {} }
    case 'registro':
      return { name: 'ClienteFacturacion', query: arreglo.id ? { tab: 'compras', ver: arreglo.id } : { tab: 'compras' } }
    default:
      return null
  }
}
