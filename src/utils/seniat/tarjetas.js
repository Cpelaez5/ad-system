/**
 * tarjetas.js — arma las tarjetas de "SENIAT del mes" a partir de datos ya cargados.
 * Función pura: la usan la pantalla y la sugerencia del Inicio.
 *
 * Tarjeta: { clave, tipo, quincena, titulo, subtitulo, lineas, montoTotal, estado, problemas,
 *            normalizaciones, incluidas, excluidas, declaracion }
 */
import { revisarRetenciones } from './validacionRetenciones.js'
import { estadoTarjeta, estadoPendiente } from './estadoTarjeta.js'
import { nombrePeriodo, textoQuincena } from './periodos.js'
import { num } from './comunes.js'

const suma = (lista) => lista.reduce((t, r) => t + num(r.monto_retenido), 0)

/** Busca la declaración guardada de una tarjeta. */
export function buscarDeclaracion(declaraciones = [], tipo, periodo, quincena = null) {
  return declaraciones.find((d) => d.tipo === tipo && d.periodo === periodo && (d.quincena ?? null) === (quincena ?? null)) || null
}

function tarjetaRetenciones({ tipo, quincena, cliente, retenciones, declaraciones, periodo }) {
  const rev = revisarRetenciones({ tipo, cliente, retenciones, periodo, quincena })
  const lineas = rev.incluidas.length
  const montoTotal = Math.round(suma(rev.incluidas) * 100) / 100
  const declaracion = buscarDeclaracion(declaraciones, tipo, periodo, quincena)
  return {
    clave: tipo === 'IVA' ? `iva-${quincena}` : 'islr',
    tipo,
    quincena,
    titulo: tipo === 'IVA' ? 'Retenciones de IVA' : 'Retenciones de ISLR',
    subtitulo: tipo === 'IVA' ? textoQuincena(periodo, quincena) : nombrePeriodo(periodo),
    lineas,
    montoTotal,
    problemas: rev.problemas,
    normalizaciones: rev.normalizaciones,
    incluidas: rev.incluidas,
    excluidas: rev.excluidas,
    declaracion,
    estado: estadoTarjeta({ lineas, montoTotal, problemas: lineas ? rev.problemas.length : 0, declaracion }),
  }
}

/**
 * @param {object} p
 * @param {{rif?:string, es_contribuyente_especial?:boolean}} p.cliente
 * @param {Array} p.retenciones    todas las del mes (forma de comunes.js)
 * @param {Array} p.declaraciones  filas de declaraciones_seniat del mes
 * @param {string} p.periodo       AAAAMM
 * @returns {Array} tarjetas de IVA (si es contribuyente especial) y de ISLR
 */
export function armarTarjetas({ cliente, retenciones = [], declaraciones = [], periodo }) {
  const tarjetas = []
  if (cliente?.es_contribuyente_especial) {
    for (const quincena of [1, 2]) tarjetas.push(tarjetaRetenciones({ tipo: 'IVA', quincena, cliente, retenciones, declaraciones, periodo }))
  }
  tarjetas.push(tarjetaRetenciones({ tipo: 'ISLR', quincena: null, cliente, retenciones, declaraciones, periodo }))
  return tarjetas
}

/** Tarjetas con algo por hacer. */
export const tarjetasPendientes = (tarjetas) => tarjetas.filter((t) => estadoPendiente(t.estado))

/**
 * Sugerencia para el Inicio: la primera tarjeta pendiente, o null.
 * @returns {{periodo:string, cantidad:number, titulo:string, detalle:string}|null}
 */
export function pendienteParaInicio({ cliente, retenciones, declaraciones, periodo }) {
  const pendientes = tarjetasPendientes(armarTarjetas({ cliente, retenciones, declaraciones, periodo }))
  if (!pendientes.length) return null
  const primera = pendientes[0]
  const mes = nombrePeriodo(periodo, { corto: true }).toLowerCase()
  const cuando = primera.tipo === 'IVA' ? `la ${primera.quincena === 1 ? '1ra' : '2da'} quincena de ${mes}` : mes
  return {
    periodo,
    cantidad: pendientes.length,
    titulo: pendientes.length === 1
      ? `Tus retenciones de ${primera.tipo === 'IVA' ? 'IVA' : 'ISLR'} de ${cuando} están por declarar`
      : `Tienes ${pendientes.length} declaraciones de retenciones por hacer`,
    detalle: 'Armamos el archivo para el SENIAT y lo revisamos por ti.',
  }
}
