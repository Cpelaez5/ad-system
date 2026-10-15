/**
 * usoIa.js — agregaciones PURAS del tablero "Uso de IA" del super admin sobre
 * `ai_usage_logs`. No usa correos ni nombres: solo cuenta usuarios distintos.
 */
import { hoyISO, parseFechaLocal } from '@/utils/fechas.js'

export const PERIODOS_IA = Object.freeze([7, 30, 90])
export const MAX_FILAS_IA = 10000

/** Fecha 'YYYY-MM-DD' (hora local) de un timestamp ISO. */
export function diaDe(timestamp) {
  const d = parseFechaLocal(timestamp)
  return d ? hoyISO(d) : ''
}

/** Lista de los últimos `dias` días terminando en `hoy` (ascendente). */
export function ultimosDias(dias, hoy = new Date()) {
  const lista = []
  for (let i = dias - 1; i >= 0; i--) {
    lista.push(hoyISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)))
  }
  return lista
}

/** Inicio (ISO) del período, para filtrar `created_at >=`. */
export function inicioPeriodo(dias, hoy = new Date()) {
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (dias - 1)).toISOString()
}

const esError = (f) => f.status !== 'success'
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

/**
 * @param {object[]} filas - { user_id, model, status, error_code, error_message, tokens_prompt, tokens_completion, costo_estimado, created_at }
 * @param {{ dias?: number, hoy?: Date, truncado?: boolean }} opciones
 */
export function agregarUsoIa(filas = [], { dias = 30, hoy = new Date(), truncado = false } = {}) {
  const lista = ultimosDias(dias, hoy)
  const porDiaMapa = new Map(lista.map((d) => [d, { fecha: d, llamadas: 0, errores: 0 }]))
  const modelos = new Map()
  const errores = new Map()
  const usuarios = new Set()
  let llamadas = 0
  let fallidas = 0
  let tokens = 0
  let costo = 0

  for (const f of filas) {
    const celda = porDiaMapa.get(diaDe(f.created_at))
    if (!celda) continue // fuera del período
    llamadas++
    celda.llamadas++
    tokens += num(f.tokens_prompt) + num(f.tokens_completion)
    costo += num(f.costo_estimado)
    if (f.user_id) usuarios.add(f.user_id)

    const modelo = f.model || 'desconocido'
    const m = modelos.get(modelo) || { modelo, llamadas: 0, errores: 0, costo: 0 }
    m.llamadas++
    m.costo += num(f.costo_estimado)
    modelos.set(modelo, m)

    if (esError(f)) {
      fallidas++
      celda.errores++
      m.errores++
      const codigo = f.error_code || 'SIN_CODIGO'
      const e = errores.get(codigo) || { codigo, cantidad: 0, ultimoMensaje: '', ultimaFecha: '' }
      e.cantidad++
      if (String(f.created_at || '') >= e.ultimaFecha) {
        e.ultimaFecha = String(f.created_at || '')
        e.ultimoMensaje = String(f.error_message || '').slice(0, 240)
      }
      errores.set(codigo, e)
    }
  }

  return {
    dias,
    llamadas,
    errores: fallidas,
    porcentajeErrores: llamadas ? Math.round((fallidas / llamadas) * 1000) / 10 : 0,
    tokens,
    costo,
    usuarios: usuarios.size,
    porDia: lista.map((d) => porDiaMapa.get(d)),
    porModelo: [...modelos.values()].sort((a, b) => b.llamadas - a.llamadas),
    topErrores: [...errores.values()]
      .sort((a, b) => b.cantidad - a.cantidad || b.ultimaFecha.localeCompare(a.ultimaFecha))
      .slice(0, 8),
    truncado: truncado || filas.length >= MAX_FILAS_IA,
  }
}

/** "$0,0042" para costos chicos, "$12,35" para los grandes. */
export function formatoCostoUsd(valor) {
  const n = num(valor)
  const dec = n > 0 && n < 1 ? 4 : 2
  return `$${n.toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
