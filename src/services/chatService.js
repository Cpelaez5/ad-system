/**
 * Chat Service — Motor de soporte IA para clientes
 * 
 * Responsabilidades:
 * - Comunicación con la IA vía la Edge Function `ai-chat` (la clave del proveedor
 *   vive en el servidor, nunca en el bundle del navegador)
 * - Construcción de system prompt contextualizado por vista
 * - Persistencia de conversaciones y mensajes en Supabase
 * - Infraestructura lógica de límites por plan de suscripción
 * 
 * Preparado para Fase 2: Switch Super Admin (campo mode ai/human)
 */

import { supabase } from '@/lib/supabaseClient'
import { callAiGenerate } from '@/services/ai/aiGenerateClient'
import { contextoAyudaParaChat } from '@/services/ayudaService'
import { INSTRUCCION_ESCALAR, esSinCreditos } from '@/utils/soporte.js'

// ═══════════════════════════════════════════════════
// LÍMITES POR PLAN (Infraestructura lógica)
// Estos valores se conectarán al sistema de planes real
// cuando se implemente completamente.
// ═══════════════════════════════════════════════════

const PLAN_AI_LIMITS = {
  // Plan mínimo: sin acceso a IA
  basic: {
    enabled: false,
    dailyLimit: 0,
    label: 'Plan Básico'
  },
  // Plan medio: límite preestablecido
  professional: {
    enabled: true,
    dailyLimit: 20,
    label: 'Plan Profesional'
  },
  // Plan mayor: sin límite o extendido
  enterprise: {
    enabled: true,
    dailyLimit: -1, // -1 = sin límite
    label: 'Plan Empresarial'
  },
  // Trial: acceso limitado como profesional
  free_trial: {
    enabled: true,
    dailyLimit: 10,
    label: 'Prueba Gratuita'
  }
}

// Mapeo de plan_id de Supabase a las claves de PLAN_AI_LIMITS
// Ajustar cuando se definan los IDs reales de los planes
const PLAN_ID_MAP = {
  'free_trial': 'free_trial',
  'basic': 'basic',
  'starter': 'basic',
  'professional': 'professional',
  'pro': 'professional',
  'enterprise': 'enterprise',
  'premium': 'enterprise'
}

// ═══════════════════════════════════════════════════
// SYSTEM PROMPT BASE
// Define la personalidad y comportamiento del asistente
// ═══════════════════════════════════════════════════

const SYSTEM_PROMPT_BASE = `Eres un ejecutivo del equipo de soporte de AD System, un sistema de gestión contable.

REGLAS DE COMPORTAMIENTO:
1. Hablas siempre en español, de forma empática, cálida y muy simple.
2. NUNCA uses jerga técnica avanzada. Si necesitas usar un término contable, explícalo brevemente entre paréntesis.
3. Tus respuestas deben ser CONCISAS: máximo 3-4 oraciones por punto.
4. Si no sabes algo o la pregunta no es sobre AD System, dilo honestamente y sugiere contactar soporte humano.
5. Usa emojis con moderación (1-2 por respuesta) para ser amigable.
6. Si el usuario parece frustrado, prioriza la empatía antes de la solución.
7. NUNCA inventes funcionalidades que no existen en el sistema.

SOBRE AD SYSTEM:
- Es un sistema de contabilidad para empresas en Venezuela
- Maneja facturación (compras, ventas, gastos), expediente fiscal, inventario
- Soporta multi-moneda: VES (Bolívares), USD (Dólares), EUR (Euros)
- Usa tasas del BCV (Banco Central de Venezuela)
- Los impuestos incluyen: IVA (16%), retenciones ISLR, retenciones municipales, IGTF
- Los estados de factura son: Borrador, Emitida, Enviada, Pagada, Vencida, Anulada`

// ═══════════════════════════════════════════════════
// MAPA DE CONTEXTO POR VISTA
// Cada ruta del cliente tiene su descripción enriquecida
// para que DeepSeek responda con precisión
// ═══════════════════════════════════════════════════

const VIEW_CONTEXT_MAP = {
  ClienteDashboard: {
    description: 'El usuario está en su Dashboard principal, donde ve un resumen ejecutivo de su negocio.',
    capabilities: [
      'Ver KPIs: ingresos del período, egresos, margen neto, valor del inventario',
      'Gráfico de evolución de rendimiento (ingresos vs egresos, últimos 6 meses)',
      'Gráfico de distribución de gastos',
      'Cambiar moneda entre USD y VES',
      'Filtrar por período: este mes, mes anterior, trimestre, año, todo',
      'Ver insights automáticos y alertas',
      'Ver actividad reciente de facturas',
      'Ver top productos vendidos',
      'Ver estado del expediente fiscal (vigentes, en trámite, por vencer)',
      'Las cards son arrastrables para reorganizar el layout'
    ]
  },

  ClienteFacturacion: {
    description: 'El usuario está en el módulo de Facturación, donde gestiona todas sus facturas.',
    capabilities: [
      'Ver listado de todas las facturas (compras, ventas, gastos)',
      'Filtrar por pestañas: Todas, Ventas, Compras, Gastos',
      'Crear nueva factura con formulario completo',
      'Escanear facturas con OCR (cámara o archivo) — la IA extrae los datos automáticamente',
      'Editar facturas existentes',
      'Cambiar estado de facturas (Borrador → Emitida → Pagada, etc.)',
      'Buscar facturas por número o proveedor/cliente',
      'Exportar facturas a Excel (formato SENIAT) o PDF',
      'Ver estadísticas: total facturas, emitidas, pagadas, monto total',
      'Generar recibos PDF individuales'
    ]
  },

  ClienteFiscal360: {
    description: 'El usuario está en el Expediente Fiscal 360, donde gestiona sus documentos legales y permisos.',
    capabilities: [
      'Ver todos los documentos fiscales organizados por categoría',
      'Subir nuevos documentos fiscales (RIF, Conformidad de ISLR, Registro Mercantil, etc.)',
      'Ver el estado de cada documento: Vigente, En Trámite, Vencido, No Aplica',
      'Recibir alertas de documentos próximos a vencer',
      'Filtrar documentos por estado y categoría',
      'Descargar documentos almacenados',
      'Ver estadísticas del expediente: cuántos vigentes, en trámite, vencidos'
    ]
  },

  ClienteInventario: {
    description: 'El usuario está en el módulo de Inventario, donde controla el stock de sus productos.',
    capabilities: [
      'Ver listado completo de productos con stock actual',
      'Crear nuevos productos (nombre, código, precio de costo, precio de venta, stock)',
      'Editar productos existentes',
      'Ver alertas de stock bajo (productos por agotarse)',
      'El inventario se actualiza automáticamente con las compras y ventas',
      'Exportar inventario a Excel',
      'Ver valor total del inventario en costo y precio de venta'
    ]
  },

  ClientePlanes: {
    description: 'El usuario está viendo los planes de suscripción disponibles.',
    capabilities: [
      'Ver los diferentes planes: Básico, Profesional, Empresarial',
      'Comparar funcionalidades entre planes',
      'Ver precio mensual y anual de cada plan',
      'Cambiar de plan'
    ]
  },

  ClienteFacturacionSuscripcion: {
    description: 'El usuario está viendo las facturas de su suscripción al sistema AD System.',
    capabilities: [
      'Ver historial de facturas del sistema',
      'Ver estado de pagos: pendiente, pagado, vencido',
      'Reportar un pago realizado',
      'Ver métodos de pago disponibles'
    ]
  },

  ClienteMiArea: {
    description: 'El usuario está en Mi Área, su espacio personal dentro del sistema.',
    capabilities: [
      'Ver información de su perfil y empresa',
      'Ver datos de su organización contadora'
    ]
  }
}

// Contexto genérico para rutas no mapeadas
const DEFAULT_VIEW_CONTEXT = {
  description: 'El usuario está navegando el sistema AD System.',
  capabilities: [
    'Navegar entre los diferentes módulos del sistema',
    'Acceder al Dashboard, Facturación, Expediente Fiscal, Inventario'
  ]
}

// ═══════════════════════════════════════════════════
// CLASE PRINCIPAL DEL SERVICIO
// ═══════════════════════════════════════════════════

class ChatService {

  // ─── Construcción del System Prompt ───

  /**
   * Construye el system prompt completo con el contexto de la vista actual.
   * @param {string} routeName - Nombre de la ruta actual del router
   * @param {string} routeTitle - Título meta de la ruta
   * @param {Object} queryParams - Query params de la ruta (ej: { tab: 'compras' })
   * @param {string} [guiasAyuda] - Bloque con las guías de la ayuda pública más relevantes (ver ayudaBusqueda.js)
   * @returns {string} System prompt enriquecido
   */
  buildSystemPrompt(routeName, routeTitle, queryParams = {}, guiasAyuda = '') {
    const viewContext = VIEW_CONTEXT_MAP[routeName] || DEFAULT_VIEW_CONTEXT

    let contextBlock = `\nCONTEXTO ACTUAL DEL USUARIO:\n`
    contextBlock += `- Módulo: ${routeTitle || 'General'}\n`
    contextBlock += `- ${viewContext.description}\n`

    // Agregar pestaña activa si existe (ej: Facturación → tab compras)
    if (queryParams.tab) {
      contextBlock += `- Pestaña activa: ${queryParams.tab}\n`
    }

    contextBlock += `\nFUNCIONALIDADES DISPONIBLES EN ESTE MÓDULO:\n`
    viewContext.capabilities.forEach(cap => {
      contextBlock += `- ${cap}\n`
    })

    contextBlock += `\nIMPORTANTE: Responde SOLO sobre funcionalidades que existen en este módulo. Si el usuario pregunta sobre algo de otro módulo, indícale dónde encontrarlo.`

    return SYSTEM_PROMPT_BASE + contextBlock + (guiasAyuda || '') + `

CUANDO NO SEPAS:
${INSTRUCCION_ESCALAR}`
  }

  /**
   * Obtiene el mensaje de bienvenida contextualizado.
   * @param {string} routeName - Nombre de la ruta actual
   * @param {string} routeTitle - Título de la ruta
   * @param {string} userName - Nombre del usuario
   * @returns {string}
   */
  getWelcomeMessage(routeName, routeTitle, userName = '') {
    const viewContext = VIEW_CONTEXT_MAP[routeName] || DEFAULT_VIEW_CONTEXT
    const saludo = userName ? `¡Hola, ${userName}! 👋` : '¡Hola! 👋'
    const modulo = routeTitle || 'AD System'

    // Honesto y simple: es el asistente con IA (no "el equipo"), y sin textos internos del prompt.
    void viewContext
    return `${saludo} Soy tu asistente de AD System. Pregúntame lo que necesites sobre **${modulo}**, o toca una de las guías de abajo. Si prefieres hablar con una persona, toca «Escribirle al equipo».`
  }

  // ─── Comunicación con la IA (Edge Function `ai-chat`) ───

  /**
   * Envía un mensaje al usuario y recibe respuesta de la IA (vía Edge Function `ai-chat`).
   * @param {string} userMessage - Mensaje del usuario
   * @param {Array} conversationHistory - Historial de mensajes [{role, content}]
   * @param {Object} viewContext - Contexto de la vista {routeName, routeTitle, queryParams}
   * @returns {Promise<string>} Respuesta de la IA
   */
  async sendMessage(userMessage, conversationHistory = [], viewContext = {}) {
    // v0 de contexto: las 3 guías de la ayuda pública más relevantes a la pregunta.
    const guiasAyuda = await contextoAyudaParaChat(userMessage)
    const systemPrompt = this.buildSystemPrompt(
      viewContext.routeName,
      viewContext.routeTitle,
      viewContext.queryParams,
      guiasAyuda
    )

    // Asegurar que no haya roles duplicados consecutivos para no romper modelos estrictos (como Gemma 3)
    const rawHistory = [...conversationHistory]
    
    // Si la vista ya metió el mensaje actual al final del historial, lo quitamos temporalmente
    if (rawHistory.length > 0 && 
        rawHistory[rawHistory.length - 1].role === 'user' && 
        rawHistory[rawHistory.length - 1].content === userMessage) {
      rawHistory.pop()
    }

    // Filtrar para asegurar alternancia de roles
    const safeHistory = []
    let lastRole = 'system'

    for (const msg of rawHistory.slice(-10)) {
      if (msg.role !== lastRole) {
        safeHistory.push(msg)
        lastRole = msg.role
      }
    }

    // Siempre terminar con el mensaje actual del usuario
    if (lastRole === 'user') {
      // Si el historial sin el mensaje actual terminaba en user, hubo un error de flujo.
      // Quitamos ese último turno para forzar la alternancia antes de añadir el actual.
      safeHistory.pop()
    }

    // El contrato de la Edge Function `ai-chat` es { prompt, system }, sin roles
    // intercalados, así que el historial se serializa como transcripción de texto
    // y el system prompt se envía aparte.
    const transcript = safeHistory
      .map(msg => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n\n')

    const prompt = transcript
      ? `${transcript}\n\nUsuario: ${userMessage}`
      : userMessage

    try {
      return await callAiGenerate({ prompt, system: systemPrompt })

    } catch (error) {
      console.error('❌ Error comunicándose con la IA:', error)

      // Sin créditos de IA: la pantalla muestra el aviso amable con guías y "Escribirle al equipo".
      if (esSinCreditos(error)) {
        throw Object.assign(new Error('SIN_CREDITOS'), { code: 'SIN_CREDITOS' })
      }
      // Mensaje de fallback amigable según el código de error de la Edge Function
      if (error.code === 'UNAUTHORIZED' || error.code === 'INVALID_KEY') {
        throw Object.assign(new Error('El servicio de IA no está disponible temporalmente. Por favor, intenta más tarde.'), { code: error.code })
      }
      if (error.code === 'QUOTA_EXCEEDED' || error.code === 'PREVIEW_RATE_LIMIT') {
        throw Object.assign(new Error('Hemos recibido muchas consultas. Por favor espera un momento y vuelve a intentar. ⏳'), { code: error.code })
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Parece que no tienes conexión a internet. Verifica tu conexión y vuelve a intentar. 📡')
      }

      throw Object.assign(new Error('Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.'), { code: error?.code || 'AI_ERROR' })
    }
  }

  // ─── Persistencia en Supabase ───

  /**
   * Crea una nueva conversación en Supabase.
   * @param {Object} params - { userId, organizationId, clientId, routeName, routeTitle }
   * @returns {Promise<Object>} Conversación creada
   */
  async createConversation({ userId, organizationId, clientId, routeName, routeTitle }) {
    try {
      const { data, error } = await supabase
        .from('support_conversations')
        .insert([{
          user_id: userId,
          organization_id: organizationId,
          client_id: clientId,
          current_route: routeName,
          current_route_title: routeTitle,
          status: 'active',
          mode: 'ai'
        }])
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('❌ Error creando conversación:', error)
      // No lanzar error — el chat puede funcionar sin persistencia
      return null
    }
  }

  /**
   * Guarda un mensaje en Supabase.
   * @param {string} conversationId - ID de la conversación
   * @param {string} role - 'user' | 'assistant' | 'system'
   * @param {string} content - Contenido del mensaje
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<Object|null>}
   */
  async saveMessage(conversationId, role, content, metadata = {}) {
    if (!conversationId) return null

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert([{
          conversation_id: conversationId,
          role,
          content,
          metadata
        }])
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('❌ Error guardando mensaje:', error)
      return null
    }
  }

  /**
   * Recupera el historial de mensajes de una conversación.
   * @param {string} conversationId 
   * @returns {Promise<Array>}
   */
  async getConversationHistory(conversationId) {
    if (!conversationId) return []

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []

    } catch (error) {
      console.error('❌ Error cargando historial:', error)
      return []
    }
  }

  /**
   * Actualiza la ruta actual de una conversación (cuando el usuario navega).
   * @param {string} conversationId 
   * @param {string} routeName 
   * @param {string} routeTitle 
   */
  async updateConversationRoute(conversationId, routeName, routeTitle) {
    if (!conversationId) return

    try {
      await supabase
        .from('support_conversations')
        .update({
          current_route: routeName,
          current_route_title: routeTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
    } catch (error) {
      console.error('⚠️ Error actualizando ruta de conversación:', error)
    }
  }

  /**
   * Cierra una conversación.
   * @param {string} conversationId 
   */
  async closeConversation(conversationId) {
    if (!conversationId) return

    try {
      await supabase
        .from('support_conversations')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', conversationId)
    } catch (error) {
      console.error('⚠️ Error cerrando conversación:', error)
    }
  }

  // ─── Límites por Plan ───

  /**
   * Obtiene la configuración de límites de IA para un plan dado.
   * @param {string} planId - ID del plan del usuario (de Supabase)
   * @returns {Object} { enabled, dailyLimit, label }
   */
  getPlanLimits(planId) {
    const planKey = PLAN_ID_MAP[planId] || 'free_trial'
    return PLAN_AI_LIMITS[planKey] || PLAN_AI_LIMITS.free_trial
  }

  /**
   * Verifica si el usuario puede enviar más mensajes hoy.
   * Cuenta los mensajes del día actual del usuario.
   * @param {string} userId - ID del usuario
   * @param {string} planId - ID del plan
   * @returns {Promise<{allowed: boolean, remaining: number, limit: number, message: string}>}
   */
  async checkDailyLimit(userId, planId) {
    // ⚠️ MODO DESARROLLO: Límites de IA desactivados temporalmente para pruebas locales
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
      message: ''
    }

    const limits = this.getPlanLimits(planId)

    // Si el plan no tiene IA habilitada
    if (!limits.enabled) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        message: 'Tu plan actual no incluye asistente IA. Actualiza tu plan para acceder a esta funcionalidad. ✨'
      }
    }

    // Sin límite
    if (limits.dailyLimit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        message: ''
      }
    }

    // Contar mensajes de hoy
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 1. Obtener conversaciones del usuario
      const { data: convs, error: convError } = await supabase
        .from('support_conversations')
        .select('id')
        .eq('user_id', userId)

      if (convError) throw convError

      const convIds = convs.map(c => c.id)
      let messagesUsed = 0

      if (convIds.length > 0) {
        // 2. Contar los mensajes de hoy en esas conversaciones
        const { count, error } = await supabase
          .from('support_messages')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'user')
          .gte('created_at', today.toISOString())
          .in('conversation_id', convIds)

        // Si hay error contando, permitir por seguridad (no bloquear al usuario)
        if (error) {
          console.warn('⚠️ Error contando mensajes diarios, permitiendo por defecto:', error)
          return { allowed: true, remaining: limits.dailyLimit, limit: limits.dailyLimit, message: '' }
        }
        messagesUsed = count || 0
      }
      const remaining = Math.max(0, limits.dailyLimit - messagesUsed)

      if (remaining <= 0) {
        return {
          allowed: false,
          remaining: 0,
          limit: limits.dailyLimit,
          message: `Has alcanzado el límite de ${limits.dailyLimit} consultas por hoy. El contador se reinicia a medianoche. 🌙`
        }
      }

      return {
        allowed: true,
        remaining,
        limit: limits.dailyLimit,
        message: remaining <= 3 ? `Te quedan ${remaining} consultas por hoy.` : ''
      }

    } catch (error) {
      console.error('❌ Error verificando límite diario:', error)
      // En caso de error, permitir (no bloquear la UX)
      return { allowed: true, remaining: limits.dailyLimit, limit: limits.dailyLimit, message: '' }
    }
  }
}

// Exportar instancia singleton
export default new ChatService()

// Exportar constantes para testing o uso externo
export { PLAN_AI_LIMITS, VIEW_CONTEXT_MAP, PLAN_ID_MAP }
