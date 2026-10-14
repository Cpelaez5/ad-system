/**
 * rubroService.js — rubro comercial del negocio (clients.rubro).
 * Decide qué campos extra pide el formulario de productos (src/constants/rubros.js).
 * El cliente puede actualizar su propia fila de `clients`.
 */
import { supabase } from '@/lib/supabaseClient'
import { getCurrentClientId } from '@/utils/tenantHelpers'
import { RUBROS } from '@/constants/rubros'

/** Devuelve el rubro guardado o null. Nunca lanza. */
export async function obtenerRubro() {
  try {
    const id = getCurrentClientId()
    if (!id) return null
    const { data, error } = await supabase.from('clients').select('rubro').eq('id', id).maybeSingle()
    if (error) return null
    return data?.rubro || null
  } catch {
    return null
  }
}

/** Guarda el rubro. Devuelve { ok } o { ok: false, error }. */
export async function guardarRubro(rubro) {
  if (!RUBROS.some(r => r.valor === rubro)) return { ok: false, error: 'Rubro no válido' }
  try {
    const id = getCurrentClientId()
    if (!id) return { ok: false, error: 'No pudimos identificar tu negocio.' }
    const { error } = await supabase.from('clients').update({ rubro }).eq('id', id)
    if (error) return { ok: false, error: 'No pudimos guardar el rubro. Intenta de nuevo.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'No pudimos guardar el rubro. Intenta de nuevo.' }
  }
}

export default { obtenerRubro, guardarRubro }
