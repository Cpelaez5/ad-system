/**
 * Llaves de API de la empresa (Mi negocio → Conexiones).
 * La llave completa solo se devuelve al crearla; después solo queda su prefijo.
 */
import { supabase } from '@/lib/supabaseClient'
import { getCurrentClientId } from '@/utils/tenantHelpers'

/** URL del endpoint público de productos. */
export function urlApiProductos() {
  const base = (import.meta.env?.VITE_SUPABASE_URL || '').replace(/\/$/, '')
  return `${base}/functions/v1/api-productos`
}

export async function listarLlaves() {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, nombre, prefijo, ultimo_uso, revocada_en, created_at')
    .eq('client_id', getCurrentClientId())
    .is('revocada_en', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

/** Crea una llave. Devuelve { id, llave, prefijo }; `llave` no se vuelve a mostrar. */
export async function crearLlave(nombre) {
  const { data, error } = await supabase.rpc('crear_api_key', { p_nombre: nombre })
  if (error) throw new Error(error.message || 'No pudimos crear la llave')
  const fila = Array.isArray(data) ? data[0] : data
  if (!fila?.llave) throw new Error('No pudimos crear la llave')
  return fila
}

export async function revocarLlave(id) {
  const { error } = await supabase.rpc('revocar_api_key', { p_id: id })
  if (error) throw new Error(error.message || 'No pudimos revocar la llave')
}

/** Ejemplo para copiar y pegar. */
export function ejemploCurl(llave = 'ads_tu_llave') {
  return `curl "${urlApiProductos()}?pagina=1" \\\n  -H "x-api-key: ${llave}"`
}

export default { listarLlaves, crearLlave, revocarLlave, urlApiProductos, ejemploCurl }
