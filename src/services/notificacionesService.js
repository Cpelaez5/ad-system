/**
 * notificacionesService — campanita y preferencias de avisos.
 * Tablas: notificaciones, notificacion_tipos, preferencias_notificacion
 * (supabase/migrations/20261016110000_centro_notificaciones.sql). La RLS deja a cada persona
 * ver y marcar solo lo suyo. Devuelve { data, error } (error = texto en español o null); no lanza.
 */
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'

export const TAMANO_PAGINA = 30
const COLUMNAS = 'id, tipo, titulo, cuerpo, url, datos, agrupar, leida_en, created_at'

const falla = (e, texto, vacio = null) => {
  logger.error?.(texto, e)
  return { data: vacio, error: texto }
}

/** Una página (30) de avisos, del más nuevo al más viejo. pagina empieza en 0. */
export async function listar({ pagina = 0, tamano = TAMANO_PAGINA } = {}) {
  try {
    const desde = pagina * tamano
    const { data, error } = await supabase
      .from('notificaciones')
      .select(COLUMNAS)
      .order('created_at', { ascending: false })
      .range(desde, desde + tamano - 1)
    if (error) throw error
    const filas = data || []
    return { data: filas, hayMas: filas.length === tamano, error: null }
  } catch (e) {
    return { ...falla(e, 'No pudimos cargar tus avisos.', []), hayMas: false }
  }
}

export async function contarNoLeidas() {
  try {
    const { count, error } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .is('leida_en', null)
    if (error) throw error
    return { data: count || 0, error: null }
  } catch (e) {
    return falla(e, 'No pudimos contar tus avisos.', 0)
  }
}

/**
 * Avisos nuevos o cambiados de una persona, en tiempo real.
 * Devuelve una función para cancelar. alCambiar({ tipo: 'INSERT'|'UPDATE'|'DELETE', fila, anterior }).
 */
export function suscribir(userId, alCambiar) {
  if (!userId) return () => {}
  const canal = supabase
    .channel(`notificaciones-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${userId}` },
      (payload) => alCambiar({ tipo: payload.eventType, fila: payload.new, anterior: payload.old }))
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}

async function marcar(params) {
  try {
    const { data, error } = await supabase.rpc('marcar_notificaciones_leidas', params)
    if (error) throw error
    return { data: data ?? 0, error: null }
  } catch (e) {
    return falla(e, 'No pudimos marcar tus avisos como leídos.', 0)
  }
}

export const marcarLeidas = (ids) => marcar({ p_ids: ids, p_agrupar: null })
export const marcarTodas = () => marcar({ p_ids: null, p_agrupar: null })
/** Los avisos de una consulta de soporte (agrupar = 'soporte:<id>'). */
export const marcarLeidasDeSoporte = (conversationId) =>
  conversationId ? marcar({ p_ids: null, p_agrupar: `soporte:${conversationId}` }) : Promise.resolve({ data: 0, error: null })

// ── Preferencias ──────────────────────────────────────────────────────────

export async function listarTipos() {
  try {
    const { data, error } = await supabase
      .from('notificacion_tipos')
      .select('tipo, nombre, descripcion, para_rol, correo_def, push_def, activo, orden')
      .order('orden', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (e) {
    return falla(e, 'No pudimos cargar los tipos de avisos.', [])
  }
}

export async function listarPreferencias(userId) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('preferencias_notificacion')
      .select('tipo, correo, push')
      .eq('user_id', userId)
    if (error) throw error
    return { data: data || [], error: null }
  } catch (e) {
    return falla(e, 'No pudimos cargar tus preferencias.', [])
  }
}

/** Guarda las dos opciones del evento (correo y push). */
export async function guardarPreferencia(userId, tipo, { correo, push }) {
  try {
    const { error } = await supabase
      .from('preferencias_notificacion')
      .upsert({ user_id: userId, tipo, correo, push, updated_at: new Date().toISOString() }, { onConflict: 'user_id,tipo' })
    if (error) throw error
    return { data: true, error: null }
  } catch (e) {
    return falla(e, 'No pudimos guardar el cambio. Intenta de nuevo.')
  }
}

/** Correo de prueba a la dirección de la persona que lo pide (la función valida su sesión). */
export async function enviarCorreoPrueba() {
  try {
    const { data, error } = await supabase.functions.invoke('despachar-notificacion', { body: { modo: 'prueba' } })
    if (error) {
      const status = error?.context?.status
      if (status === 429) return { data: null, error: 'Espera unos segundos antes de pedir otro correo de prueba.' }
      throw error
    }
    if (data?.motivo === 'sin_configuracion') return { data: null, error: 'El envío de correos todavía no está configurado. Avísale al equipo.' }
    return { data: true, error: null }
  } catch (e) {
    return falla(e, 'No pudimos enviar el correo de prueba. Intenta de nuevo.')
  }
}
