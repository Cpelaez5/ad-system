/**
 * usoIaService.js — uso de IA del negocio ("Tu asistente").
 * Llama a la RPC `uso_ia_mes`. Nunca lanza: ante cualquier problema devuelve null
 * y la pantalla no muestra nada (jamás un error). Ver uso-ia-por-cliente.md.
 */
import { supabase } from '@/lib/supabaseClient'

import { EVENTO_IA_USADA, avisarIaUsada } from '@/utils/eventosIa'

export { EVENTO_IA_USADA, avisarIaUsada }

/** Valida/normaliza la respuesta de la RPC. null si no sirve. */
export function normalizarUso(data) {
  if (!data || typeof data !== 'object') return null
  const limite = Number(data.limite)
  if (!Number.isFinite(limite) || limite <= 0) return null
  const usados = Number(data.usados)
  const porcentaje = data.porcentaje == null ? NaN : Number(data.porcentaje)
  return {
    usados: Number.isFinite(usados) ? usados : 0,
    limite,
    porcentaje: Number.isFinite(porcentaje) ? porcentaje : null,
    por_accion: data.por_accion && typeof data.por_accion === 'object' ? data.por_accion : {},
    renueva: data.renueva || null,
  }
}

/**
 * @param {{clientId?: string}} [opciones] el staff pasa clientId; el cliente nada.
 * @returns {Promise<object|null>}
 */
export async function obtenerUsoIa({ clientId } = {}) {
  try {
    const args = clientId ? { p_client_id: clientId } : undefined
    const { data, error } = await supabase.rpc('uso_ia_mes', args)
    if (error) return null
    return normalizarUso(data)
  } catch {
    return null
  }
}

export default { obtenerUsoIa, avisarIaUsada, normalizarUso, EVENTO_IA_USADA }
