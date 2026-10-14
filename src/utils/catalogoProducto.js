/**
 * catalogoProducto.js
 * Cómo se aplica un producto del catálogo global a los datos de un producto
 * del negocio: SOLO se llenan campos vacíos (lo que la persona ya escribió manda).
 */
import { unidadDelFormulario } from '@/services/productoFotoService'

const vacio = v => v === null || v === undefined || String(v).trim() === ''

/**
 * Devuelve { cambios, llenados } con lo que el catálogo aporta a `actual`
 * ({ name, marca, categoria, unit, atributos }). `cambios` usa los nombres del
 * formulario de producto. La unidad solo se aplica si la actual es la de fábrica ('UND').
 */
export function camposDesdeCatalogo(actual = {}, item = {}) {
  const cambios = {}
  const llenados = []
  if (item.nombre && vacio(actual.name)) { cambios.name = item.nombre; llenados.push('name') }
  if (item.marca && vacio(actual.marca)) { cambios.marca = item.marca; llenados.push('marca') }
  if (item.categoria && vacio(actual.categoria)) { cambios.categoria = item.categoria; llenados.push('categoria') }
  if (item.presentacion && vacio(actual.atributos?.presentacion)) {
    cambios.atributos = { ...(actual.atributos || {}), presentacion: item.presentacion }
    llenados.push('presentacion')
  }
  if (item.unidad && (vacio(actual.unit) || actual.unit === 'UND')) {
    const u = unidadDelFormulario(item.unidad)
    if (u !== actual.unit) { cambios.unit = u; llenados.push('unit') }
  }
  return { cambios, llenados }
}

/** "Datos de AD System · confirmados por N negocios" / "· verificados". */
export function marcaCatalogo(item = {}) {
  if (item.verificado) return 'Datos de AD System · verificados'
  const n = Number(item.confirmaciones) || 0
  return `Datos de AD System · confirmados por ${n} ${n === 1 ? 'negocio' : 'negocios'}`
}
