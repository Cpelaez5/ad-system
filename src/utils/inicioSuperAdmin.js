/**
 * inicioSuperAdmin.js — lógica pura del Inicio del super admin (sin red).
 *
 * Una "empresa" es un usuario con rol `cliente` (uno por negocio). Su estado:
 *  - vencida: `trial_end` ya pasó (en prueba o con plan de pago);
 *  - en prueba: plan `free_trial` y todavía no vence;
 *  - activa: plan de pago y no vencida.
 */
import { textoFaltan } from '@/utils/tasasAdmin.js'

export const PLAN_PRUEBA = 'free_trial'
const DIA_MS = 86_400_000

const aFecha = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function estadoEmpresa(u, ahora = new Date()) {
  const fin = aFecha(u?.trial_end)
  if (fin && fin < ahora) return 'vencida'
  return u?.plan_id === PLAN_PRUEBA || !u?.plan_id ? 'prueba' : 'activa'
}

/** Cuenta empresas activas, en prueba y vencidas, y las pruebas que vencen en 7 días. */
export function contarEmpresas(usuarios = [], ahora = new Date()) {
  const r = { activas: 0, prueba: 0, vencidas: 0, vencenSemana: 0 }
  for (const u of usuarios) {
    const e = estadoEmpresa(u, ahora)
    if (e === 'activa') r.activas++
    else if (e === 'vencida') r.vencidas++
    else {
      r.prueba++
      const fin = aFecha(u.trial_end)
      if (fin && fin - ahora <= 7 * DIA_MS) r.vencenSemana++
    }
  }
  return r
}

export const claveMes = (fecha) => {
  const d = aFecha(fecha)
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''
}

/** Las últimas `n` claves de mes (más antiguo primero), terminando en el mes de `ahora`. */
export function ultimosMeses(n = 6, ahora = new Date()) {
  return Array.from({ length: n }, (_, i) => claveMes(new Date(ahora.getFullYear(), ahora.getMonth() - (n - 1 - i), 1)))
}

const NOMBRES_MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const etiquetaMes = (clave) => NOMBRES_MES[Number(clave.slice(5, 7)) - 1] || clave

/** Ingresos (facturas pagadas, en USD) y altas de empresas por mes. */
export function seriesPorMes({ facturasPagadas = [], usuarios = [] } = {}, n = 6, ahora = new Date()) {
  const meses = ultimosMeses(n, ahora)
  const ingresos = meses.map(() => 0)
  const altas = meses.map(() => 0)
  for (const f of facturasPagadas) {
    const i = meses.indexOf(claveMes(f.paid_at))
    if (i >= 0 && (f.currency || 'USD') === 'USD') ingresos[i] += Number(f.amount) || 0
  }
  for (const u of usuarios) {
    const i = meses.indexOf(claveMes(u.created_at))
    if (i >= 0) altas[i]++
  }
  return { meses, etiquetas: meses.map(etiquetaMes), ingresos, altas }
}

export function usuariosNuevos30Dias(usuarios = [], ahora = new Date()) {
  const desde = ahora.getTime() - 30 * DIA_MS
  return usuarios.filter((u) => { const d = aFecha(u.created_at); return d && d.getTime() >= desde }).length
}

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`

/** Siguiente paso, en orden: pagos → pruebas → IA → tasas → catálogo. null si todo está en orden. */
export function siguientePasoSuperAdmin({ pagosPendientes = 0, vencenSemana = 0, erroresIa = 0, diasSinTasa = 0, porVerificar = 0 } = {}) {
  if (pagosPendientes > 0) {
    return { clave: 'pagos', titulo: plural(pagosPendientes, 'pago por aprobar', 'pagos por aprobar'), detalle: 'Un negocio está esperando que confirmes su pago.', boton: 'Revisar pagos', to: { name: 'FacturacionSistema', query: { tab: 'reports' } } }
  }
  if (vencenSemana > 0) {
    return { clave: 'pruebas', titulo: `${plural(vencenSemana, 'prueba vence', 'pruebas vencen')} esta semana`, detalle: 'Escríbeles antes de que se queden sin acceso.', boton: 'Ver empresas', to: { name: 'Usuarios' } }
  }
  if (erroresIa > 0) {
    return { clave: 'ia', titulo: `${plural(erroresIa, 'error', 'errores')} de IA esta semana`, detalle: 'Mira cuáles códigos se repiten y qué dicen.', boton: 'Ver el uso de IA', to: { name: 'AdminUsoIa' } }
  }
  if (diasSinTasa > 0) {
    return { clave: 'tasas', titulo: `${textoFaltan(diasSinTasa)} de tasa`, detalle: 'Los negocios usan estas tasas para convertir sus facturas.', boton: 'Revisar tasas', to: { name: 'AdminTasas' } }
  }
  if (porVerificar > 0) {
    return { clave: 'catalogo', titulo: `${plural(porVerificar, 'dato', 'datos')} del catálogo por verificar`, detalle: 'Los más confirmados por los negocios van primero.', boton: 'Ir al catálogo', to: { name: 'AdminCatalogo' } }
  }
  return null
}

/** "AD System tiene 3 empresas activas y 5 en prueba; ingresos del mes $120,00." */
export function fraseResumen({ activas = 0, prueba = 0 } = {}, ingresosMes = 0, formato = (n) => `$${Number(n).toFixed(2)}`) {
  const act = `${activas} ${activas === 1 ? 'empresa activa' : 'empresas activas'}`
  return `AD System tiene ${act} y ${prueba} en prueba; ingresos del mes ${formato(ingresosMes)}.`
}
