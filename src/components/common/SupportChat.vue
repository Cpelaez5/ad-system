<template>
  <!-- ═══════════════════════════════════════════════ -->
  <!-- FAB: Botón flotante de chat (solo para clientes) -->
  <!-- ═══════════════════════════════════════════════ -->
  <div v-if="isCliente" class="support-chat-wrapper">

    <!-- Botón flotante -->
    <transition name="fab-bounce">
      <v-btn
        v-if="!isChatOpen"
        class="chat-fab"
        icon
        size="56"
        elevation="8"
        @click="openChat"
      >
        <v-icon size="28" color="white">mdi-chat</v-icon>

        <!-- Badge de mensajes no leídos (futuro) -->
        <div v-if="false" class="fab-badge">1</div>
      </v-btn>
    </transition>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- PANEL DE CHAT -->
    <!-- ═══════════════════════════════════════════════ -->
    <transition name="chat-panel">
      <div v-if="isChatOpen" class="chat-panel" :class="{ 'chat-panel--mobile': isMobile }">

        <!-- Header del chat -->
        <div class="chat-header">
          <div class="chat-header__info">
            <div class="chat-header__avatar">
              <v-icon color="white" size="22">mdi-face-agent</v-icon>
            </div>
            <div>
              <h4 class="chat-header__title">Soporte AD System</h4>
              <span class="chat-header__status">
                <span class="status-dot"></span>
                En línea
              </span>
            </div>
          </div>
          <div class="chat-header__actions">
            <!-- Indicador de mensajes restantes -->
            <v-chip
              v-if="dailyLimitInfo.limit > 0 && dailyLimitInfo.remaining >= 0"
              size="x-small"
              variant="tonal"
              color="white"
              class="mr-1"
            >
              {{ dailyLimitInfo.remaining }}/{{ dailyLimitInfo.limit }}
            </v-chip>
            <v-btn icon variant="text" size="small" @click="closeChat" class="chat-close-btn">
              <v-icon color="white" size="20">mdi-close</v-icon>
            </v-btn>
          </div>
        </div>

        <!-- Área de mensajes -->
        <div ref="messagesContainer" class="chat-messages" @scroll="handleScroll">

          <!-- Mensaje de bienvenida -->
          <div class="message message--assistant message--welcome">
            <div class="message__avatar">
              <v-icon color="#1F355C" size="18">mdi-face-agent</v-icon>
            </div>
            <div class="message__bubble">
              <p class="message__text" v-html="formatMessage(welcomeMessage)"></p>
            </div>
          </div>

          <!-- Quick Actions (botones predefinidos) -->
          <div v-if="messages.length === 0 && quickActions.length > 0" class="quick-actions">
            <button
              v-for="(action, idx) in quickActions"
              :key="'qa-' + idx"
              class="quick-action-btn"
              @click="sendQuickAction(action)"
            >
              <v-icon size="14" class="mr-1">mdi-lightning-bolt</v-icon>
              {{ action.label }}
            </button>
          </div>

          <!-- Mensajes de la conversación -->
          <template v-for="(msg, index) in messages" :key="'msg-' + index">
            <div
              class="message"
              :class="{
                'message--user': msg.role === 'user',
                'message--assistant': msg.role === 'assistant',
                'message--system': msg.role === 'system'
              }"
            >
              <!-- Avatar del asistente -->
              <div v-if="msg.role === 'assistant'" class="message__avatar">
                <v-icon color="#1F355C" size="18">mdi-face-agent</v-icon>
              </div>

              <!-- Burbuja del mensaje -->
              <div class="message__bubble">
                <p class="message__text" v-html="formatMessage(msg.content)"></p>
                <span class="message__time">{{ formatTime(msg.created_at) }}</span>
              </div>
            </div>
          </template>

          <!-- Indicador de "escribiendo..." -->
          <div v-if="isTyping" class="message message--assistant message--typing">
            <div class="message__avatar">
              <v-icon color="#1F355C" size="18">mdi-face-agent</v-icon>
            </div>
            <div class="message__bubble typing-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          <!-- Mensaje de error -->
          <div v-if="errorMessage" class="message message--system">
            <div class="message__bubble message__bubble--error">
              <v-icon size="16" color="#c62828" class="mr-1">mdi-alert-circle</v-icon>
              <p class="message__text">{{ errorMessage }}</p>
            </div>
          </div>

          <!-- Mensaje de límite alcanzado -->
          <div v-if="limitReached" class="message message--system">
            <div class="message__bubble message__bubble--limit">
              <v-icon size="16" color="#E0B04F" class="mr-1">mdi-clock-outline</v-icon>
              <p class="message__text">{{ dailyLimitInfo.message }}</p>
            </div>
          </div>
        </div>

        <!-- Input de mensaje -->
        <div class="chat-input">
          <div class="chat-input__container">
            <input
              ref="chatInput"
              v-model="inputMessage"
              type="text"
              class="chat-input__field"
              placeholder="Escribe tu pregunta..."
              :disabled="isTyping || limitReached || !aiEnabled"
              @keyup.enter="sendMessage"
              maxlength="500"
            />
            <v-btn
              icon
              variant="text"
              size="small"
              class="chat-input__send"
              :disabled="!inputMessage.trim() || isTyping || limitReached || !aiEnabled"
              @click="sendMessage"
            >
              <v-icon
                size="22"
                :color="inputMessage.trim() && !isTyping ? '#E0B04F' : '#aaa'"
              >
                mdi-send
              </v-icon>
            </v-btn>
          </div>
          <p class="chat-input__hint">
            Escribe tu mensaje... · 
            <span v-if="dailyLimitInfo.message && !limitReached" class="limit-hint">
              {{ dailyLimitInfo.message }}
            </span>
            <span v-else>Presiona Enter para enviar</span>
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import chatService from '@/services/chatService'

export default {
  name: 'SupportChat',

  data() {
    return {
      // Estado del chat
      isChatOpen: false,
      isTyping: false,
      inputMessage: '',
      errorMessage: '',

      // Mensajes de la conversación (solo en memoria para UI)
      messages: [],

      // Conversación en Supabase
      conversationId: null,

      // Historial para enviar a DeepSeek (formato simplificado)
      conversationHistory: [],

      // Usuario actual
      currentUser: null,

      // Límites
      dailyLimitInfo: {
        allowed: true,
        remaining: -1,
        limit: -1,
        message: ''
      },

      // Responsive
      isMobile: false
    }
  },

  computed: {
    /**
     * Verifica si el usuario tiene rol cliente
     */
    isCliente() {
      return this.currentUser?.role === 'cliente'
    },

    /**
     * Verifica si la IA está habilitada para el plan del usuario
     */
    aiEnabled() {
      const planLimits = chatService.getPlanLimits(this.currentUser?.plan_id)
      return planLimits.enabled
    },

    /**
     * Verifica si se alcanzó el límite diario
     */
    limitReached() {
      return !this.dailyLimitInfo.allowed
    },

    /**
     * Quick actions contextuales según la ruta actual
     */
    quickActions() {
      return chatService.getQuickActions(this.$route.name)
    },

    /**
     * Mensaje de bienvenida contextualizado
     */
    welcomeMessage() {
      const userName = this.currentUser?.firstName || this.currentUser?.first_name || ''
      return chatService.getWelcomeMessage(
        this.$route.name,
        this.$route.meta?.title,
        userName
      )
    }
  },

  watch: {
    /**
     * Cuando el usuario navega a otra vista, actualizar contexto
     */
    '$route'(to) {
      if (this.isChatOpen && this.conversationId) {
        chatService.updateConversationRoute(
          this.conversationId,
          to.name,
          to.meta?.title
        )
      }
    }
  },

  mounted() {
    this.loadUser()
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    window.addEventListener('userUpdated', this.loadUser)
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    window.removeEventListener('userUpdated', this.loadUser)
  },

  methods: {
    // ─── Inicialización ───

    /**
     * Carga los datos del usuario desde localStorage
     */
    loadUser() {
      try {
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}')
        this.currentUser = userData
      } catch (error) {
        console.error('Error cargando usuario en SupportChat:', error)
        this.currentUser = {}
      }
    },

    /**
     * Detecta si estamos en móvil para ajustar el layout
     */
    checkMobile() {
      this.isMobile = window.innerWidth < 600
    },

    // ─── Control del Chat ───

    /**
     * Abre el panel de chat
     */
    async openChat() {
      this.isChatOpen = true
      this.errorMessage = ''

      // Verificar límites
      await this.refreshLimits()

      // Crear conversación en Supabase si no existe
      if (!this.conversationId && this.currentUser?.id) {
        const conversation = await chatService.createConversation({
          userId: this.currentUser.id,
          organizationId: this.currentUser.organization_id,
          clientId: this.currentUser.client_id,
          routeName: this.$route.name,
          routeTitle: this.$route.meta?.title
        })
        if (conversation) {
          this.conversationId = conversation.id
        }
      }

      // Focus en el input después de la animación
      this.$nextTick(() => {
        setTimeout(() => {
          this.$refs.chatInput?.focus()
        }, 350)
      })
    },

    /**
     * Cierra el panel de chat (no elimina el historial de la sesión)
     */
    closeChat() {
      this.isChatOpen = false
    },

    // ─── Envío de Mensajes ───

    /**
     * Envía un mensaje del usuario
     */
    async sendMessage() {
      const text = this.inputMessage.trim()
      if (!text || this.isTyping || this.limitReached) return

      // Limpiar estado
      this.inputMessage = ''
      this.errorMessage = ''

      // Agregar mensaje del usuario a la UI
      const userMsg = {
        role: 'user',
        content: text,
        created_at: new Date().toISOString()
      }
      this.messages.push(userMsg)
      this.conversationHistory.push({ role: 'user', content: text })

      // Guardar en Supabase (background, no bloquea)
      chatService.saveMessage(this.conversationId, 'user', text, {
        route: this.$route.name
      })

      // Scroll al fondo
      this.scrollToBottom()

      // Mostrar indicador de "escribiendo..."
      this.isTyping = true

      try {
        // Obtener contexto de la vista actual
        const viewContext = {
          routeName: this.$route.name,
          routeTitle: this.$route.meta?.title,
          queryParams: this.$route.query
        }

        // Llamar a DeepSeek
        const response = await chatService.sendMessage(
          text,
          this.conversationHistory,
          viewContext
        )

        // Agregar respuesta de IA a la UI
        const assistantMsg = {
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString()
        }
        this.messages.push(assistantMsg)
        this.conversationHistory.push({ role: 'assistant', content: response })

        // Guardar respuesta en Supabase (background)
        chatService.saveMessage(this.conversationId, 'assistant', response, {
          route: this.$route.name,
          model: 'deepseek-chat'
        })

        // Actualizar límites después de cada mensaje
        await this.refreshLimits()

      } catch (error) {
        this.errorMessage = error.message
      } finally {
        this.isTyping = false
        this.scrollToBottom()
      }
    },

    /**
     * Envía un quick action (botón predefinido)
     */
    async sendQuickAction(action) {
      if (action.predefinedResponse) {
        // 1. Mostrar mensaje del usuario
        const text = action.message
        this.inputMessage = ''
        
        const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() }
        this.messages.push(userMsg)
        this.conversationHistory.push({ role: 'user', content: text })
        
        // Guardar silenciosamente
        chatService.saveMessage(this.conversationId, 'user', text, { route: this.$route.name })
        this.scrollToBottom()
        
        // 2. Simular que el agente lee y escribe
        this.isTyping = true
        await new Promise(resolve => setTimeout(resolve, 800))
        this.isTyping = false
        
        // 3. Mostrar la respuesta predefinida
        const response = action.predefinedResponse
        const assistantMsg = { role: 'assistant', content: response, created_at: new Date().toISOString() }
        this.messages.push(assistantMsg)
        this.conversationHistory.push({ role: 'assistant', content: response })
        
        // Guardar silenciosamente
        chatService.saveMessage(this.conversationId, 'assistant', response, { route: this.$route.name, type: 'predefined' })
        this.scrollToBottom()
      } else {
        // Fallback si no hay respuesta predefinida, usar DeepSeek
        this.inputMessage = action.message
        this.sendMessage()
      }
    },

    // ─── Límites ───

    /**
     * Actualiza la información de límites diarios
     */
    async refreshLimits() {
      if (!this.currentUser?.id) return

      this.dailyLimitInfo = await chatService.checkDailyLimit(
        this.currentUser.id,
        this.currentUser.plan_id
      )
    },

    // ─── Utilidades de UI ───

    /**
     * Scroll automático al último mensaje
     */
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      })
    },

    /**
     * Formatea un timestamp a hora legible
     */
    formatTime(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    },

    /**
     * Formatea el contenido del mensaje (negrita con **, saltos de línea)
     */
    formatMessage(text) {
      if (!text) return ''
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    },

    /**
     * Maneja el scroll (para futuro: cargar historial antiguo)
     */
    handleScroll() {
      // Preparado para paginación de historial en el futuro
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════
   VARIABLES LOCALES
   ═══════════════════════════════════════════════════ */

.support-chat-wrapper {
  --chat-primary: #1F355C;
  --chat-accent: #E0B04F;
  --chat-bg: #f8f9fa;
  --chat-user-bg: #1F355C;
  --chat-assistant-bg: #ffffff;
  --chat-radius: 20px;
  --chat-width: 380px;
  --chat-height: 560px;
}

/* ═══════════════════════════════════════════════════
   FAB (Botón flotante)
   ═══════════════════════════════════════════════════ */

.chat-fab {
  position: fixed !important;
  bottom: 24px;
  right: 24px;
  z-index: 1500;
  background: linear-gradient(135deg, #1F355C 0%, #2a4a7f 100%) !important;
  box-shadow: 0 6px 24px rgba(31, 53, 92, 0.45) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease !important;
}

.chat-fab:hover {
  transform: scale(1.08) !important;
  box-shadow: 0 8px 32px rgba(31, 53, 92, 0.55) !important;
}

.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #A81C22;
  color: white;
  font-size: 11px;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* Animación de entrada del FAB */
.fab-bounce-enter-active {
  animation: fabBounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.fab-bounce-leave-active {
  animation: fabBounceOut 0.2s ease-in;
}
@keyframes fabBounceIn {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes fabBounceOut {
  to { transform: scale(0); opacity: 0; }
}

/* ═══════════════════════════════════════════════════
   PANEL DE CHAT
   ═══════════════════════════════════════════════════ */

.chat-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: var(--chat-width);
  height: var(--chat-height);
  max-height: calc(100vh - 48px);
  background: var(--chat-bg);
  border-radius: var(--chat-radius);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1500;
  font-family: 'Open Sans', sans-serif;
}

/* Versión móvil: fullscreen */
.chat-panel--mobile {
  bottom: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
}

/* Animación de apertura/cierre */
.chat-panel-enter-active {
  animation: chatSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.chat-panel-leave-active {
  animation: chatSlideDown 0.25s ease-in;
}
@keyframes chatSlideUp {
  0% { transform: translateY(20px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes chatSlideDown {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(20px) scale(0.95); opacity: 0; }
}

/* ═══════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════ */

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #1F355C 0%, #2a4a7f 100%);
  color: white;
  flex-shrink: 0;
}

.chat-header__info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-header__avatar {
  width: 36px;
  height: 36px;
  background: rgba(224, 176, 79, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chat-header__title {
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  line-height: 1.2;
}

.chat-header__status {
  font-size: 11px;
  opacity: 0.85;
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-dot {
  width: 7px;
  height: 7px;
  background: #4CAF50;
  border-radius: 50%;
  display: inline-block;
  animation: statusPulse 2s infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.chat-header__actions {
  display: flex;
  align-items: center;
}

.chat-close-btn {
  color: white !important;
}

/* ═══════════════════════════════════════════════════
   ÁREA DE MENSAJES
   ═══════════════════════════════════════════════════ */

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Scrollbar sutil */
.chat-messages::-webkit-scrollbar {
  width: 4px;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
}

/* ═══════════════════════════════════════════════════
   MENSAJES
   ═══════════════════════════════════════════════════ */

.message {
  display: flex;
  gap: 8px;
  animation: messageIn 0.3s ease;
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Mensaje del usuario: alineado a la derecha */
.message--user {
  flex-direction: row-reverse;
}

.message--user .message__bubble {
  background: var(--chat-user-bg);
  color: white;
  border-radius: 16px 16px 4px 16px;
  max-width: 85%;
}

.message--user .message__time {
  color: rgba(255, 255, 255, 0.6);
  text-align: right;
}

/* Mensaje del asistente: alineado a la izquierda */
.message--assistant .message__bubble {
  background: var(--chat-assistant-bg);
  color: #333;
  border-radius: 16px 16px 16px 4px;
  max-width: 85%;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

/* Mensaje de sistema (errores, límites) */
.message--system {
  justify-content: center;
}

.message--system .message__bubble {
  background: #fff3e0;
  color: #6d4c00;
  border-radius: 12px;
  max-width: 90%;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.message__bubble--error {
  background: #fce4ec !important;
  color: #c62828 !important;
}

.message__bubble--limit {
  background: #fff8e1 !important;
  color: #6d4c00 !important;
}

/* Avatar del asistente */
.message__avatar {
  width: 28px;
  height: 28px;
  min-width: 28px;
  background: rgba(31, 53, 92, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

/* Burbuja */
.message__bubble {
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.message__text {
  margin: 0;
}

.message__time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  display: block;
}

/* Mensaje de bienvenida */
.message--welcome .message__bubble {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8edf8 100%);
  border: 1px solid rgba(31, 53, 92, 0.1);
}

/* ═══════════════════════════════════════════════════
   INDICADOR DE ESCRIBIENDO
   ═══════════════════════════════════════════════════ */

.typing-bubble {
  padding: 12px 18px !important;
}

.typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-dots span {
  width: 7px;
  height: 7px;
  background: #999;
  border-radius: 50%;
  animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: 0s; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ═══════════════════════════════════════════════════
   QUICK ACTIONS (Botones predefinidos)
   ═══════════════════════════════════════════════════ */

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 0 8px;
  animation: messageIn 0.4s ease 0.2s both;
}

.quick-action-btn {
  background: white;
  border: 1px solid rgba(31, 53, 92, 0.15);
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 12px;
  font-family: 'Open Sans', sans-serif;
  color: #1F355C;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  line-height: 1.3;
}

.quick-action-btn:hover {
  background: #1F355C;
  color: white;
  border-color: #1F355C;
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(31, 53, 92, 0.2);
}

.quick-action-btn:active {
  transform: translateY(0);
}

/* ═══════════════════════════════════════════════════
   INPUT DE MENSAJE
   ═══════════════════════════════════════════════════ */

.chat-input {
  padding: 12px 14px 10px;
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.chat-input__container {
  display: flex;
  align-items: center;
  background: #f3f4f6;
  border-radius: 24px;
  padding: 4px 4px 4px 16px;
  transition: box-shadow 0.2s ease;
}

.chat-input__container:focus-within {
  box-shadow: 0 0 0 2px rgba(31, 53, 92, 0.15);
}

.chat-input__field {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13px;
  font-family: 'Open Sans', sans-serif;
  color: #333;
  padding: 8px 0;
}

.chat-input__field::placeholder {
  color: #aaa;
}

.chat-input__field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input__send {
  flex-shrink: 0;
}

.chat-input__hint {
  font-size: 10px;
  color: #bbb;
  text-align: center;
  margin: 6px 0 0;
}

.limit-hint {
  color: #E0B04F;
  font-weight: 500;
}

/* ═══════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════ */

@media (max-width: 599px) {
  .chat-fab {
    bottom: 16px;
    right: 16px;
  }
}
</style>
