/**
 * soporteService — tickets de soporte en el mismo chat (cliente y equipo).
 * Tablas: support_conversations / support_messages (ver
 * supabase/migrations/20261015150000_soporte_tickets.sql). La RLS decide qué ve
 * cada quien: el cliente nunca lee notas internas.
 *
 * Devuelve { data, error } (error = mensaje en español o null); no lanza.
 */
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/utils/logger'

const COLUMNAS_CLIENTE =
  'id, mode, status, categoria, estado_ticket, ticket_numero, ultimo_mensaje_en, no_leidos_cliente, calificacion, resuelto_en, current_route_title, created_at, updated_at'

const falla = (e, texto) => {
  logger.error?.(texto, e)
  return { data: null, error: texto }
}

// ── Cliente ─────────────────────────────────────────────────────────────────

/** Sus consultas con el equipo (las que ya pasaron a "humano"), la más reciente primero. */
export async function listarMisConsultas(userId) {
  if (!userId) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('support_conversations')
      .select(COLUMNAS_CLIENTE)
      .eq('user_id', userId)
      .eq('mode', 'human')
      .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (e) {
    return { ...falla(e, 'No pudimos cargar tus consultas. Intenta de nuevo.'), data: [] }
  }
}

/**
 * Pasa la conversación al equipo: asigna tema y resumen, y guarda el primer mensaje.
 * Orden importante: primero `mode='human'` (el trigger asigna el número) y después el
 * mensaje (así cuenta como no leído para el equipo).
 * El resumen vive en `metadata.resumen`: la RLS no deja que el cliente escriba mensajes
 * de rol "system", y el equipo lo ve al inicio del hilo.
 */
export async function escribirAlEquipo({ conversationId, categoria, mensaje, resumen, routeTitle }) {
  try {
    const { data, error } = await supabase
      .from('support_conversations')
      .update({
        mode: 'human',
        categoria,
        metadata: { resumen: resumen || '', pantalla: routeTitle || '' },
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .select(COLUMNAS_CLIENTE)
      .single()
    if (error) throw error

    const { error: errMensaje } = await supabase
      .from('support_messages')
      .insert([{ conversation_id: conversationId, role: 'user', content: mensaje, metadata: { tipo: 'ticket' } }])
    if (errMensaje) throw errMensaje
    return { data, error: null }
  } catch (e) {
    return falla(e, 'No pudimos enviar tu consulta. Intenta de nuevo.')
  }
}

export async function cargarMensajes(conversationId) {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id, role, content, interno, created_at, metadata')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return { data: data || [], error: null }
  } catch (e) {
    return { ...falla(e, 'No pudimos cargar la conversación.'), data: [] }
  }
}

/** Respuesta del cliente dentro de un ticket. */
export async function responderComoCliente(conversationId, texto) {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .insert([{ conversation_id: conversationId, role: 'user', content: texto, metadata: { tipo: 'ticket' } }])
      .select('id, role, content, interno, created_at, metadata')
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (e) {
    return falla(e, 'No pudimos enviar tu mensaje. Intenta de nuevo.')
  }
}

export async function marcarLeidoCliente(conversationId) {
  try {
    const { error } = await supabase.from('support_conversations').update({ no_leidos_cliente: 0 }).eq('id', conversationId)
    if (error) throw error
    return { data: true, error: null }
  } catch (e) {
    return falla(e, 'No pudimos marcar la consulta como leída.')
  }
}

export async function marcarResuelta(conversationId) {
  try {
    const { error } = await supabase.from('support_conversations').update({ estado_ticket: 'resuelto' }).eq('id', conversationId)
    if (error) throw error
    return { data: true, error: null }
  } catch (e) {
    return falla(e, 'No pudimos cerrar la consulta. Intenta de nuevo.')
  }
}

/** valor: 1 (👍) o -1 (👎). */
export async function calificar(conversationId, valor) {
  try {
    const { error } = await supabase.from('support_conversations').update({ calificacion: valor }).eq('id', conversationId)
    if (error) throw error
    return { data: true, error: null }
  } catch (e) {
    return falla(e, 'No pudimos guardar tu opinión.')
  }
}

// ── Tiempo real ─────────────────────────────────────────────────────────────

/** Mensajes nuevos de una conversación. Devuelve una función para cancelar. */
export function suscribirMensajes(conversationId, alRecibir) {
  const canal = supabase
    .channel(`soporte-mensajes-${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => alRecibir(payload.new))
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}

/** Cambios en las conversaciones de un usuario (no leídos, estado). */
export function suscribirMisConsultas(userId, alCambiar) {
  const canal = supabase
    .channel(`soporte-mis-consultas-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations', filter: `user_id=eq.${userId}` },
      (payload) => alCambiar(payload.new))
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}

// ── Equipo (super admin) ────────────────────────────────────────────────────

/**
 * Todas las consultas con el equipo, con el contexto del negocio (nombre, plan).
 * Las consultas se piden sin "embeds" y el contexto se trae aparte: así no depende
 * de relaciones entre tablas y, si falla, la bandeja igual se ve.
 */
export async function listarBandeja() {
  try {
    const { data, error } = await supabase
      .from('support_conversations')
      .select('*')
      .eq('mode', 'human')
      .order('ultimo_mensaje_en', { ascending: true, nullsFirst: false })
      .limit(300)
    if (error) throw error
    const consultas = data || []

    const ids = (campo) => [...new Set(consultas.map((c) => c[campo]).filter(Boolean))]
    const [usuarios, negocios] = await Promise.all([
      ids('user_id').length
        ? supabase.from('users').select('id, first_name, last_name, email, plan_id').in('id', ids('user_id'))
        : { data: [] },
      ids('client_id').length
        ? supabase.from('clients').select('id, company_name').in('id', ids('client_id'))
        : { data: [] },
    ])
    const porUsuario = new Map((usuarios.data || []).map((u) => [u.id, u]))
    const porNegocio = new Map((negocios.data || []).map((n) => [n.id, n]))
    const enriquecidas = consultas.map((c) => {
      const u = porUsuario.get(c.user_id)
      return {
        ...c,
        negocio: porNegocio.get(c.client_id)?.company_name || '',
        cliente_nombre: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '',
        plan: u?.plan_id || '',
      }
    })
    return { data: enriquecidas, error: null }
  } catch (e) {
    return { ...falla(e, 'No pudimos cargar la bandeja de soporte.'), data: [] }
  }
}

async function actualizarConsulta(id, cambios, textoError) {
  try {
    const { error } = await supabase.from('support_conversations').update(cambios).eq('id', id)
    if (error) throw error
    return { data: true, error: null }
  } catch (e) {
    return falla(e, textoError)
  }
}

export const marcarLeidoEquipo = (id) => actualizarConsulta(id, { no_leidos_equipo: 0 }, 'No pudimos marcar la consulta como leída.')
export const cambiarEstado = (id, estado) => actualizarConsulta(id, { estado_ticket: estado }, 'No pudimos cambiar el estado.')
export const cambiarPrioridad = (id, prioridad) => actualizarConsulta(id, { prioridad }, 'No pudimos cambiar la prioridad.')
export const asignar = (id, userId) => actualizarConsulta(id, { asignado_a: userId }, 'No pudimos asignar la consulta.')

/** Respuesta del equipo (role 'agent') o nota interna (interno=true). */
export async function enviarComoEquipo(conversationId, texto, { interno = false } = {}) {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .insert([{ conversation_id: conversationId, role: 'agent', content: texto, interno, metadata: {} }])
      .select('id, role, content, interno, created_at, metadata')
      .single()
    if (error) throw error
    return { data, error: null }
  } catch (e) {
    return falla(e, interno ? 'No pudimos guardar la nota.' : 'No pudimos enviar la respuesta.')
  }
}

/** Cualquier cambio en las consultas o mensajes (la bandeja se actualiza sola). */
export function suscribirBandeja(alCambiar) {
  const canal = supabase
    .channel('soporte-bandeja')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_conversations' }, (p) => alCambiar({ tabla: 'conversaciones', payload: p }))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (p) => alCambiar({ tabla: 'mensajes', payload: p }))
    .subscribe()
  return () => { supabase.removeChannel(canal) }
}

/** Cuántas consultas esperan respuesta del equipo (nuevas o en curso). */
export async function contarSinResponder() {
  try {
    const { count, error } = await supabase
      .from('support_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('mode', 'human')
      .in('estado_ticket', ['nuevo', 'en_curso'])
    if (error) throw error
    return { data: count || 0, error: null }
  } catch (e) {
    return { ...falla(e, 'No pudimos contar las consultas de soporte.'), data: 0 }
  }
}
