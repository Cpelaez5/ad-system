/**
 * eventosIa.js — evento que avisa que se usó la IA (refresca "Tu asistente").
 * Módulo mínimo y sin dependencias para poder llamarlo desde cualquier servicio.
 */

/** Se despacha en `window` tras una llamada de IA exitosa. */
export const EVENTO_IA_USADA = 'ad-ia-usada'

/** Avisa a "Tu asistente" que se usó la IA. Seguro fuera del navegador. */
export function avisarIaUsada() {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENTO_IA_USADA))
  } catch { /* sin window */ }
}
