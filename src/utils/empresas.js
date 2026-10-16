/**
 * Empresas (super admin): estado comercial, actividad, filtros y búsqueda sobre las filas de
 * la RPC `admin_listar_empresas`. Lógica pura (sin Vue ni Supabase) para poder probarla.
 */
import { parseFechaLocal, formatFechaCorta } from './fechas'

const MS_DIA = 24 * 60 * 60 * 1000

const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Días de calendario (hora local) desde `fecha` hasta `ahora`: 0 = hoy, 1 = ayer, -2 = pasado mañana. */
export function diasDesde(fecha, ahora = new Date()) {
  const f = parseFechaLocal(fecha)
  if (!f) return null
  return Math.round((inicioDelDia(ahora) - inicioDelDia(f)) / MS_DIA)
}

/**
 * Estado comercial, en orden de urgencia: debe (factura vencida) > por pagar > al día >
 * en prueba > prueba vencida > sin plan. Devuelve { clave, texto, color }.
 */
export function estadoEmpresa(fila, ahora = new Date()) {
  if (fila?.deuda_vencida_desde) {
    return { clave: 'debe', texto: `Debe desde el ${formatFechaCorta(fila.deuda_vencida_desde)}`, color: 'error' }
  }
  if ((fila?.facturas_pendientes || 0) > 0) {
    return { clave: 'por_pagar', texto: 'Por pagar', color: 'warning' }
  }
  if (fila?.suscripcion_estado === 'active') {
    return { clave: 'al_dia', texto: 'Al día', color: 'success' }
  }
  if (fila?.prueba_hasta) {
    const quedan = -diasDesde(fila.prueba_hasta, ahora)
    if (quedan >= 0) {
      const texto = quedan === 0 ? 'En prueba · último día' : `En prueba · ${quedan} ${quedan === 1 ? 'día' : 'días'}`
      return { clave: 'prueba', texto, color: 'info' }
    }
    return { clave: 'prueba_vencida', texto: 'Prueba vencida', color: 'grey-darken-2' }
  }
  return { clave: 'sin_plan', texto: 'Sin plan', color: 'grey-darken-2' }
}

/** Actividad según el último registro: activa (≤7 días), tibia (≤30) o dormida. */
export function actividadEmpresa(fila, ahora = new Date()) {
  const dias = diasDesde(fila?.ultimo_movimiento, ahora)
  if (dias === null) return { clave: 'dormida', texto: 'Nunca registró nada' }
  const cuando = dias <= 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`
  const texto = `Último registro ${cuando}`
  if (dias <= 7) return { clave: 'activa', texto }
  if (dias <= 30) return { clave: 'tibia', texto }
  return { clave: 'dormida', texto }
}

export const FILTROS_EMPRESAS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'prueba', texto: 'En prueba' },
  { valor: 'al_dia', texto: 'Al día' },
  { valor: 'deben', texto: 'Por cobrar' },
  { valor: 'dormidas', texto: 'Sin uso en 30 días' },
]

export function cumpleFiltro(fila, filtro, ahora = new Date()) {
  const estado = estadoEmpresa(fila, ahora).clave
  switch (filtro) {
    case 'prueba': return estado === 'prueba'
    case 'al_dia': return estado === 'al_dia'
    case 'deben': return estado === 'debe' || estado === 'por_pagar'
    case 'dormidas': return actividadEmpresa(fila, ahora).clave === 'dormida'
    default: return true
  }
}

/** Opciones de FiltroChips con la cantidad de cada filtro. */
export function opcionesConCantidad(filas, ahora = new Date()) {
  return FILTROS_EMPRESAS.map((op) => ({ ...op, cantidad: (filas || []).filter((f) => cumpleFiltro(f, op.valor, ahora)).length }))
}

const normalizar = (t) => String(t ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '')

/** Busca por nombre o RIF sin importar acentos, guiones ni mayúsculas. */
export function buscarEmpresas(filas, texto) {
  const q = normalizar(texto)
  if (!q) return filas || []
  return (filas || []).filter((f) => normalizar(f.nombre).includes(q) || normalizar(f.rif).includes(q))
}

/** Enlace de WhatsApp para un teléfono venezolano (0414-1234567 → 584141234567). null si no sirve. */
export function enlaceWhatsApp(telefono) {
  let d = String(telefono ?? '').replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('0')) d = '58' + d.slice(1)
  else if (d.length === 10) d = '58' + d
  return d.length >= 11 && d.length <= 15 ? `https://wa.me/${d}` : null
}
