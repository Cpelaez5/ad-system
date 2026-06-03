/**
 * Chat Service — Motor de soporte IA para clientes
 * 
 * Responsabilidades:
 * - Comunicación con DeepSeek API (chat completions)
 * - Construcción de system prompt contextualizado por vista
 * - Persistencia de conversaciones y mensajes en Supabase
 * - Infraestructura lógica de límites por plan de suscripción
 * 
 * Preparado para Fase 2: Switch Super Admin (campo mode ai/human)
 */

import { supabase } from '@/lib/supabaseClient'
import OpenAI from 'openai'

// ═══════════════════════════════════════════════════
// CONFIGURACIÓN DE IA MULTIPROVEEDOR
// ═══════════════════════════════════════════════════

const ACTIVE_PROVIDER = import.meta.env.VITE_ACTIVE_AI_PROVIDER || 'deepseek'

// -- Config DeepSeek Original --
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY
const DEEPSEEK_API_URL = import.meta.env.VITE_DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

// -- Config Nvidia (Gemma 3) --
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY
const NVIDIA_MODEL = import.meta.env.VITE_NVIDIA_MODEL || 'google/gemma-3n-e4b-it'
let NVIDIA_API_URL = import.meta.env.VITE_NVIDIA_API_URL || '/api/ai'

if (NVIDIA_API_URL && NVIDIA_API_URL.startsWith('/')) {
  NVIDIA_API_URL = window.location.origin + NVIDIA_API_URL
}

// Solo crear el cliente de OpenAI si la API key de Nvidia está disponible.
// Sin esta protección, el SDK lanza una excepción fatal al cargarse el módulo
// cuando no hay clave configurada (ej. en producción sin variables de Nvidia),
// lo que provoca una página en blanco.
let nvidiaClient = null
try {
  if (NVIDIA_API_KEY) {
    nvidiaClient = new OpenAI({
      apiKey: NVIDIA_API_KEY,
      baseURL: NVIDIA_API_URL,
      dangerouslyAllowBrowser: true
    })
  }
} catch (err) {
  console.warn('⚠️ No se pudo crear el cliente de Nvidia OpenAI:', err.message)
}

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
    ],
    quickActions: [
      { label: '¿Qué significan los KPIs?', message: '¿Qué significa cada tarjeta de KPI en mi dashboard?', predefinedResponse: 'Los KPIs te muestran un resumen de tu negocio en el período seleccionado. **Ingresos** son tus ventas totales, **Egresos** son tus gastos y compras, el **Margen** es la ganancia (Ingresos - Egresos), y el **Inventario** es el valor total de la mercancía que tienes en stock.' },
      { label: '¿Cómo cambio de moneda?', message: '¿Cómo puedo cambiar la moneda de visualización?', predefinedResponse: 'Para cambiar la moneda, ve a las opciones en la parte superior derecha de tu Dashboard (cerca de tu perfil) y selecciona **USD** o **VES**. Todos los montos se recalcularán automáticamente usando la tasa del BCV del día.' },
      { label: '¿Cómo leo los gráficos?', message: '¿Cómo interpreto los gráficos de mi dashboard?', predefinedResponse: 'El **gráfico de rendimiento** compara tus ingresos contra tus egresos mes a mes, mostrándote la tendencia de tu rentabilidad. El **gráfico de distribución** te permite ver en qué categorías se están concentrando la mayor parte de tus gastos.' }
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
    ],
    quickActions: [
      { label: '¿Cómo creo una factura?', message: '¿Cómo creo una nueva factura paso a paso?', predefinedResponse: 'Para crear una factura, haz clic en el botón **"+ Nueva Factura"**. Llena los datos del cliente, agrega los productos o servicios, verifica los montos e impuestos, y finalmente haz clic en **"Guardar"**. Tu factura quedará en estado Borrador hasta que la emitas.' },
      { label: '¿Cómo uso el escáner OCR?', message: '¿Cómo puedo escanear una factura física?', predefinedResponse: 'Ve a la opción **"Escanear Factura"**. Puedes tomarle una foto a la factura con tu celular o subir un archivo PDF/Imagen. El sistema leerá automáticamente el RIF, nombre, montos y número de factura, ahorrándote tiempo de carga manual.' },
      { label: '¿Cómo exporto a Excel?', message: '¿Cómo exporto mis facturas a Excel en formato SENIAT?', predefinedResponse: 'Selecciona las facturas que deseas exportar (o filtra por mes) y haz clic en el botón **"Exportar"**. Selecciona la opción **"Formato Excel (SENIAT)"** y el sistema descargará el archivo listo para tu contador.' }
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
    ],
    quickActions: [
      { label: '¿Qué documentos necesito?', message: '¿Cuáles documentos fiscales necesito tener al día?', predefinedResponse: 'Normalmente, debes mantener al día: **RIF** vigente de la empresa, **Registro Mercantil**, y los permisos de funcionamiento (**Patente de Industria y Comercio**, **Conformidad de Bomberos**, etc.). Depende de la naturaleza de tu empresa.' },
      { label: '¿Cómo subo un documento?', message: '¿Cómo puedo subir un documento a mi expediente?', predefinedResponse: 'Haz clic en el botón **"+ Nuevo Documento"**, selecciona la categoría (Ej: Legal, Tributario), ingresa la fecha de vencimiento si aplica, y sube el archivo PDF o Imagen. El sistema te alertará antes de que se venza.' },
      { label: '¿Qué pasa si un doc vence?', message: '¿Qué sucede cuando un documento se vence?', predefinedResponse: 'El sistema marcará el documento en rojo como **"Vencido"** y te enviará alertas. Debes gestionar la renovación con la entidad correspondiente y, una vez tengas el nuevo documento, actualizarlo en tu Expediente Fiscal 360.' }
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
    ],
    quickActions: [
      { label: '¿Cómo agrego un producto?', message: '¿Cómo agrego un producto a mi inventario?', predefinedResponse: 'Ve a Inventario y haz clic en **"+ Nuevo Producto"**. Ingresa el código, nombre, y establece tanto el costo como el precio de venta. Si tienes stock inicial, colócalo allí.' },
      { label: '¿Cómo actualizo el stock?', message: '¿Cómo se actualiza mi stock?', predefinedResponse: 'El stock **se actualiza automáticamente** cuando registras facturas de Venta (resta stock) y facturas de Compra (suma stock). También puedes hacer ajustes manuales si haces un conteo físico.' },
      { label: '¿Qué es alerta de stock?', message: '¿Qué significa la alerta de stock bajo?', predefinedResponse: 'El sistema te avisará cuando un producto llegue al nivel mínimo que tú hayas definido, para que sepas cuándo es el momento de contactar a tus proveedores y reponer mercancía.' }
    ]
  },

  ClientePlanes: {
    description: 'El usuario está viendo los planes de suscripción disponibles.',
    capabilities: [
      'Ver los diferentes planes: Básico, Profesional, Empresarial',
      'Comparar funcionalidades entre planes',
      'Ver precio mensual y anual de cada plan',
      'Cambiar de plan'
    ],
    quickActions: [
      { label: '¿Qué plan me conviene?', message: '¿Cuál plan me conviene según mi empresa?', predefinedResponse: 'Si eres independiente o un negocio pequeño, el **Plan Básico** suele ser suficiente. Si necesitas reportes avanzados, IA y multiusuario, te recomendamos el **Plan Profesional**. Para múltiples sucursales, el **Plan Empresarial** es ideal.' },
      { label: '¿Cómo cambio de plan?', message: '¿Cómo cambio mi suscripción actual?', predefinedResponse: 'Puedes hacer clic en el botón **"Cambiar Plan"** debajo de la suscripción deseada. Sigue los pasos para confirmar tu selección y emitiremos la factura correspondiente.' }
    ]
  },

  ClienteFacturacionSuscripcion: {
    description: 'El usuario está viendo las facturas de su suscripción al sistema AD System.',
    capabilities: [
      'Ver historial de facturas del sistema',
      'Ver estado de pagos: pendiente, pagado, vencido',
      'Reportar un pago realizado',
      'Ver métodos de pago disponibles'
    ],
    quickActions: [
      { label: '¿Cómo reporto un pago?', message: '¿Cómo reporto el pago de mi suscripción?', predefinedResponse: 'Ubica la factura pendiente en tu listado, haz clic en **"Reportar Pago"**, ingresa los datos de la transferencia (banco, referencia, fecha, monto) y sube el comprobante. Nuestro equipo lo validará a la brevedad.' },
      { label: '¿Métodos de pago?', message: '¿Cuáles métodos de pago aceptan?', predefinedResponse: 'Aceptamos transferencias bancarias nacionales, Pago Móvil, Zelle y, en algunos casos, Binance o efectivo en nuestras oficinas. Podrás ver los detalles bancarios al momento de reportar el pago.' }
    ]
  },

  ClienteMiArea: {
    description: 'El usuario está en Mi Área, su espacio personal dentro del sistema.',
    capabilities: [
      'Ver información de su perfil y empresa',
      'Ver datos de su organización contadora'
    ],
    quickActions: [
      { label: '¿Cómo edito mis datos?', message: '¿Cómo puedo editar mis datos de empresa?', predefinedResponse: 'En tu Área Personal, ve a la sección de **"Perfil de Empresa"** y haz clic en "Editar". Allí podrás modificar tu nombre, dirección, logo y datos de contacto.' },
      { label: '¿Quién es mi contador?', message: '¿Cómo veo la info de mi organización contadora?', predefinedResponse: 'En la sección **"Mi Contador"** dentro de Mi Área, encontrarás los datos de contacto y RIF de la firma contable que está administrando tu empresa en este momento.' }
    ]
  }
}

// Contexto genérico para rutas no mapeadas
const DEFAULT_VIEW_CONTEXT = {
  description: 'El usuario está navegando el sistema AD System.',
  capabilities: [
    'Navegar entre los diferentes módulos del sistema',
    'Acceder al Dashboard, Facturación, Expediente Fiscal, Inventario'
  ],
  quickActions: [
    { label: '¿Qué hago aquí?', message: '¿Qué puedo hacer en AD System?', predefinedResponse: 'AD System es tu plataforma contable integral. Puedes gestionar tus facturas, llevar control de inventario, organizar tu expediente fiscal y tener visibilidad de la salud financiera de tu negocio en tiempo real.' },
    { label: '¿Por dónde empiezo?', message: '¿Por dónde me recomiendas empezar?', predefinedResponse: 'Te recomendamos empezar por configurar el **Perfil de tu Empresa** en Mi Área. Luego, carga tus **Documentos Fiscales**, y finalmente empieza a registrar tus **Facturas** para que tu Dashboard comience a mostrar métricas reales.' }
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
   * @returns {string} System prompt enriquecido
   */
  buildSystemPrompt(routeName, routeTitle, queryParams = {}) {
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

    return SYSTEM_PROMPT_BASE + contextBlock
  }

  /**
   * Obtiene las quick actions (botones de respuestas predefinidas) para la vista actual.
   * @param {string} routeName - Nombre de la ruta actual
   * @returns {Array<{label: string, message: string}>}
   */
  getQuickActions(routeName) {
    const viewContext = VIEW_CONTEXT_MAP[routeName] || DEFAULT_VIEW_CONTEXT
    return viewContext.quickActions || []
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

    return `${saludo} Soy parte del equipo de soporte. Actualmente te encuentras en **${modulo}**. ${viewContext.description.replace('El usuario está en ', 'Aquí puedes ').replace('El usuario está viendo ', 'Aquí puedes ver ')} ¿En qué te puedo ayudar hoy?`
  }

  // ─── Comunicación con DeepSeek ───

  /**
   * Envía un mensaje al usuario y recibe respuesta de DeepSeek.
   * @param {string} userMessage - Mensaje del usuario
   * @param {Array} conversationHistory - Historial de mensajes [{role, content}]
   * @param {Object} viewContext - Contexto de la vista {routeName, routeTitle, queryParams}
   * @returns {Promise<string>} Respuesta de DeepSeek
   */
  async sendMessage(userMessage, conversationHistory = [], viewContext = {}) {
    const systemPrompt = this.buildSystemPrompt(
      viewContext.routeName,
      viewContext.routeTitle,
      viewContext.queryParams
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

    // Construir array final de mensajes para la API
    const messages = [
      { role: 'system', content: systemPrompt },
      ...safeHistory
    ]
    
    // Siempre terminar con el mensaje actual del usuario
    if (lastRole !== 'user') {
      messages.push({ role: 'user', content: userMessage })
    } else {
      // Si el historial sin el mensaje actual terminaba en user, hubo un error de flujo.
      // Reemplazamos el último mensaje por el actual para forzar la alternancia.
      messages[messages.length - 1] = { role: 'user', content: userMessage }
    }

    try {
      if (ACTIVE_PROVIDER === 'nvidia') {
        // ---- FLUJO NVIDIA (Fetch Directo) ----
        // Evitamos el SDK de OpenAI porque añade metadatos que el modelo Gemma 3 rechaza (HTTP 400)
        const response = await fetch(`${NVIDIA_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NVIDIA_API_KEY}`
          },
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages,
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 1000,
            stream: false
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Nvidia API Error:", errorData)
          throw new Error(errorData.detail || errorData.error?.message || `Error HTTP ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0].message.content
        
      } else {
        // ---- FLUJO DEEPSEEK (Fetch Directo Original) ----
        const response = await fetch(DEEPSEEK_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 500,
            top_p: 0.9
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error?.message || `Error HTTP ${response.status}`)
        }

        const data = await response.json()
        return data.choices[0].message.content
      }

    } catch (error) {
      console.error(`❌ Error comunicándose con la IA (${ACTIVE_PROVIDER}):`, error)

      // Mensaje de fallback amigable
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new Error('El servicio de IA no está disponible temporalmente. Por favor, intenta más tarde.')
      }
      if (error.message.includes('429')) {
        throw new Error('Hemos recibido muchas consultas. Por favor espera un momento y vuelve a intentar. ⏳')
      }
      if (!navigator.onLine) {
        throw new Error('Parece que no tienes conexión a internet. Verifica tu conexión y vuelve a intentar. 📡')
      }

      throw new Error('Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.')
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
