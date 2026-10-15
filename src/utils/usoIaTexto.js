/**
 * usoIaTexto.js — textos de "Tu asistente" (uso de IA del negocio).
 * Puro. El cliente NUNCA ve "créditos" ni "tokens": solo porcentaje, frases
 * y acciones. Ver docs/mvp/diseno/uso-ia-por-cliente.md §Lenguaje.
 */
import { parseFechaLocal } from '@/utils/fechas.js'

/** Porcentaje 0–100 entero a partir de la respuesta de la RPC. */
export function porcentajeDeUso(uso) {
  if (!uso) return 0
  let p = uso.porcentaje == null ? NaN : Number(uso.porcentaje)
  if (!Number.isFinite(p)) {
    const limite = Number(uso.limite)
    p = limite > 0 ? (Number(uso.usados) / limite) * 100 : 0
  }
  return Math.max(0, Math.min(100, Math.round(p)))
}

/** '2026-11-01' -> '1 de noviembre'. '' si no hay fecha válida. */
export function fechaRenovacion(renueva) {
  const f = parseFechaLocal(renueva)
  return f ? f.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' }) : ''
}

/** 'Se renueva el 1 de noviembre' (o un texto genérico sin fecha). */
export function textoRenovacion(renueva) {
  const f = fechaRenovacion(renueva)
  return f ? `Se renueva el ${f}` : 'Se renueva el mes que viene'
}

/** Nivel de uso: 'bien' < 50, 'medio' 50–79, 'poco' 80–99, 'agotado' 100. */
export function nivelDeUso(porcentaje) {
  if (porcentaje >= 100) return 'agotado'
  if (porcentaje >= 80) return 'poco'
  if (porcentaje >= 50) return 'medio'
  return 'bien'
}

/** Frase corta según el porcentaje. */
export function fraseDeUso(porcentaje, renueva) {
  switch (nivelDeUso(porcentaje)) {
    case 'agotado': return textoRenovacion(renueva)
    case 'poco': return 'Te queda poco'
    case 'medio': return 'Vas a mitad de mes de uso'
    default: return 'Te queda bastante'
  }
}

/** Color de Vuetify de la barra según el nivel. */
export function colorDeUso(porcentaje) {
  const n = nivelDeUso(porcentaje)
  if (n === 'agotado') return 'error'
  if (n === 'poco') return 'warning'
  return 'primary'
}

/** Desde el 80 % se ofrece mejorar el plan. */
export function sugiereMejorarPlan(porcentaje) {
  return porcentaje >= 80
}

const ACCIONES = [
  ['ocr', (n) => (n === 1 ? 'Leíste 1 factura con foto' : `Leíste ${n} facturas con foto`)],
  ['identificar', (n) => (n === 1 ? 'Reconociste 1 producto con foto' : `Reconociste ${n} productos con foto`)],
  ['estante', (n) => (n === 1 ? 'Hiciste 1 foto del estante' : `Hiciste ${n} fotos del estante`)],
  ['mejorar', (n) => (n === 1 ? 'Mejoraste 1 foto' : `Mejoraste ${n} fotos`)],
  ['documento', (n) => (n === 1 ? 'Llenaste 1 formulario con un documento' : `Llenaste ${n} formularios con un documento`)],
  ['chat', (n) => (n === 1 ? 'Hiciste 1 pregunta al asistente' : `Hiciste ${n} preguntas al asistente`)],
]

/** Lista de frases de lo que se hizo este mes (omite lo que está en cero). */
export function accionesEnPalabras(porAccion) {
  if (!porAccion || typeof porAccion !== 'object') return []
  const salida = []
  for (const [clave, frase] of ACCIONES) {
    const n = Math.round(Number(porAccion[clave]))
    if (Number.isFinite(n) && n > 0) salida.push(frase(n))
  }
  return salida
}
