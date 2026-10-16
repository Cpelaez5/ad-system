<template>
  <!-- Chat de soporte del cliente: Asistente (guías + IA) y Mis consultas (tickets con el equipo).
       Especificación: docs/mvp/diseno/soporte-y-tickets.md -->
  <div v-if="isCliente" class="support-chat-wrapper">
    <!-- Botón flotante: oculto en móvil (<600px), donde tapaba el botón "Más" de la barra
         inferior. En móvil se abre desde "Más" → "Ayuda" con el evento 'ad-open-support-chat'. -->
    <transition name="fab-bounce">
      <v-btn
        v-if="!isChatOpen && !isMobile"
        class="chat-fab"
        icon
        size="56"
        elevation="8"
        color="secondary"
        :aria-label="noLeidos ? `Ayuda, ${noLeidos} mensajes nuevos` : 'Ayuda'"
        @click="openChat"
      >
        <v-icon size="28">mdi-chat</v-icon>
        <span v-if="noLeidos > 0" :key="noLeidos" class="fab-badge" data-test="punto-fab" aria-hidden="true">{{ noLeidos > 9 ? '9+' : noLeidos }}</span>
      </v-btn>
    </transition>

    <transition name="chat-panel">
      <div v-if="isChatOpen" class="chat-panel" :class="{ 'chat-panel--mobile': isMobile }" role="dialog" aria-label="Ayuda y soporte">
        <div class="chat-header">
          <h4 class="chat-header__title">Ayuda</h4>
          <BotonSonido class="chat-header__sonido" :silenciado="sonido.silenciado.value" @alternar="sonido.alternar" />
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar la ayuda" class="chat-close-btn" @click="closeChat" />
        </div>

        <div class="chat-tabs" role="tablist">
          <button type="button" role="tab" class="chat-tab" :class="{ 'chat-tab--activa': pestana === 'asistente' }" :aria-selected="pestana === 'asistente'" @click="pestana = 'asistente'">
            Asistente
          </button>
          <button type="button" role="tab" class="chat-tab" :class="{ 'chat-tab--activa': pestana === 'consultas' }" :aria-selected="pestana === 'consultas'" @click="irAConsultas">
            Mis consultas
            <span v-if="noLeidos > 0" class="chat-tab__punto" data-test="punto-pestana" :aria-label="`${noLeidos} mensajes nuevos`"></span>
          </button>
        </div>

        <!-- Asistente (v-show: conserva la conversación al cambiar de pestaña) -->
        <div v-show="pestana === 'asistente'" class="chat-cuerpo">
          <PasoEscribirEquipo
            v-if="escribirEquipo"
            :tema-inicial="borrador.tema"
            :mensaje-inicial="borrador.borrador"
            :enviando="enviandoTicket"
            :error="errorTicket"
            @enviar="enviarTicket"
            @cancelar="cancelarEscribir"
          />
          <PanelAsistente
            v-show="!escribirEquipo"
            ref="panel"
            :usuario="currentUser || {}"
            :ruta="rutaActual"
            :ia-disponible="aiEnabled"
            :limite-alcanzado="limitReached"
            :mensaje-limite="dailyLimitInfo.message"
            @escribir-equipo="empezarAEscribir"
            @abrir-guia="irAGuia"
          />
        </div>

        <!-- Mis consultas -->
        <div v-if="pestana === 'consultas'" class="chat-cuerpo">
          <HiloConsulta
            v-if="ticketAbierto"
            :consulta="ticketAbierto"
            :mensajes="mensajesTicket"
            :cargando="cargandoHilo"
            :error="errorHilo"
            :enviando="enviandoRespuesta"
            @volver="cerrarTicket"
            @enviar="responder"
            @resolver="resolver"
            @calificar="calificarTicket"
          />
          <ListaConsultas
            v-else
            :consultas="consultas"
            :cargando="cargandoConsultas"
            :error="errorConsultas"
            @abrir="abrirTicket"
            @escribir="irAEscribir"
            @reintentar="refrescarConsultas"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import chatService from '@/services/chatService'
import * as soporte from '@/services/soporteService'
import { resumenParaTicket, textoTema, totalNoLeidosCliente } from '@/utils/soporte.js'
import PanelAsistente from '@/components/soporte/PanelAsistente.vue'
import PasoEscribirEquipo from '@/components/soporte/PasoEscribirEquipo.vue'
import ListaConsultas from '@/components/soporte/ListaConsultas.vue'
import HiloConsulta from '@/components/soporte/HiloConsulta.vue'
import BotonSonido from '@/components/soporte/BotonSonido.vue'
import * as adjuntosServicio from '@/services/adjuntosSoporteService'
import { useSonidoMensaje } from '@/composables/useSonidoMensaje'
import * as notificaciones from '@/services/notificacionesService'

export default {
  name: 'SupportChat',
  components: { PanelAsistente, PasoEscribirEquipo, ListaConsultas, HiloConsulta, BotonSonido },

  setup() {
    const sonido = useSonidoMensaje()
    return { sonido }
  },

  data() {
    return {
      isChatOpen: false,
      isMobile: false,
      currentUser: null,
      pestana: 'asistente',
      dailyLimitInfo: { allowed: true, remaining: -1, limit: -1, message: '' },

      // Escribirle al equipo
      escribirEquipo: false,
      borrador: { conversationId: null, preguntas: [], borrador: '', tema: '' },
      enviandoTicket: false,
      errorTicket: '',

      // Mis consultas
      consultas: [],
      cargandoConsultas: false,
      errorConsultas: '',
      ticketAbierto: null,
      mensajesTicket: [],
      cargandoHilo: false,
      errorHilo: '',
      enviandoRespuesta: false,

      // Tiempo real
      cancelarConsultas: null,
      cancelarMensajes: null,
      suscritoA: null,
    }
  },

  computed: {
    isCliente() {
      return this.currentUser?.role === 'cliente'
    },
    aiEnabled() {
      return chatService.getPlanLimits(this.currentUser?.plan_id).enabled
    },
    limitReached() {
      return !this.dailyLimitInfo.allowed
    },
    rutaActual() {
      return { name: this.$route?.name, title: this.$route?.meta?.title, query: this.$route?.query || {} }
    },
    noLeidos() {
      return totalNoLeidosCliente(this.consultas)
    },
  },

  watch: {
    noLeidos(n) {
      // Para que otras partes (p. ej. la hoja "Más" del teléfono) puedan mostrar el punto.
      // También queda el último valor, por si la hoja "Más" se monta después del aviso.
      window.__adSoporteNoLeidos = n
      window.dispatchEvent(new CustomEvent('ad-soporte-no-leidos', { detail: { cantidad: n } }))
    },
    'currentUser.id'() {
      this.suscribirConsultas()
    },
    '$route.query.soporte'() {
      this.abrirDesdeUrl()
    },
  },

  mounted() {
    this.loadUser()
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    window.addEventListener('userUpdated', this.loadUser)
    window.addEventListener('ad-open-support-chat', this.openChat)
    this.suscribirConsultas()
    this.abrirDesdeUrl()
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.checkMobile)
    window.removeEventListener('userUpdated', this.loadUser)
    window.removeEventListener('ad-open-support-chat', this.openChat)
    this.cancelarConsultas?.()
    this.cancelarMensajes?.()
    this.avisarConversacionAbierta(null)
  },

  methods: {
    // ─── Usuario y pantalla ───
    loadUser() {
      try {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      } catch (error) {
        console.error('Error cargando usuario en SupportChat:', error)
        this.currentUser = {}
      }
    },
    checkMobile() {
      this.isMobile = window.innerWidth < 600
    },

    // ─── Abrir y cerrar ───
    // Aviso push: /cliente/inicio?soporte=<id> abre esa consulta.
    async abrirDesdeUrl() {
      const id = this.$route?.query?.soporte
      if (!id || !this.currentUser?.id) return
      await this.openChat()
      const consulta = this.consultas.find((c) => c.id === id)
      this.irAConsultas()
      if (consulta) this.abrirTicket(consulta)
      const { soporte: _quitar, ...resto } = this.$route.query
      this.$router.replace({ query: resto })
    },
    async openChat() {
      this.isChatOpen = true
      this.refreshLimits()
      await this.refrescarConsultas()
      // Si el equipo le respondió, lo primero que ve es esa respuesta.
      if (this.noLeidos > 0) this.irAConsultas()
    },
    closeChat() {
      this.isChatOpen = false
      this.cancelarMensajes?.()
      this.cancelarMensajes = null
      this.ticketAbierto = null
      this.avisarConversacionAbierta(null)
    },
    async refreshLimits() {
      if (!this.currentUser?.id) return
      this.dailyLimitInfo = await chatService.checkDailyLimit(this.currentUser.id, this.currentUser.plan_id)
    },
    irAGuia(ruta) {
      this.closeChat()
      this.$router?.push(ruta)
    },

    // ─── Escribirle al equipo ───
    empezarAEscribir(datos) {
      this.borrador = { ...datos }
      this.errorTicket = ''
      this.escribirEquipo = true
      this.pestana = 'asistente'
    },
    irAEscribir() {
      this.empezarAEscribir({ conversationId: null, preguntas: [], borrador: '', tema: '' })
    },
    cancelarEscribir() {
      this.escribirEquipo = false
      this.errorTicket = ''
    },
    async enviarTicket({ categoria, mensaje, archivos = [] }) {
      this.enviandoTicket = true
      this.errorTicket = ''
      try {
        let id = this.borrador.conversationId
        if (!id) {
          const c = await chatService.createConversation({
            userId: this.currentUser.id,
            organizationId: this.currentUser.organization_id,
            clientId: this.currentUser.client_id,
            routeName: this.$route?.name,
            routeTitle: this.$route?.meta?.title,
          })
          id = c?.id
        }
        if (!id) {
          this.errorTicket = 'No pudimos enviar tu consulta. Intenta de nuevo.'
          return
        }
        const resumen = resumenParaTicket({
          preguntas: this.borrador.preguntas,
          pantalla: this.$route?.meta?.title || '',
          tema: textoTema(categoria),
        })
        let adjuntos = []
        if (archivos.length) {
          const subida = await adjuntosServicio.subirAdjuntos(id, archivos)
          if (subida.error) {
            this.errorTicket = subida.error
            return
          }
          adjuntos = subida.data
        }
        const { data, error } = await soporte.escribirAlEquipo({
          conversationId: id,
          categoria,
          mensaje,
          resumen,
          routeTitle: this.$route?.meta?.title || '',
          adjuntos,
        })
        if (error) {
          this.errorTicket = error
          return
        }
        this.$refs.panel?.reiniciar()
        this.escribirEquipo = false
        this.borrador = { conversationId: null, preguntas: [], borrador: '', tema: '' }
        await this.refrescarConsultas()
        this.pestana = 'consultas'
        this.abrirTicket(data)
      } finally {
        this.enviandoTicket = false
      }
    },

    // ─── Mis consultas ───
    irAConsultas() {
      this.pestana = 'consultas'
      if (!this.ticketAbierto) this.refrescarConsultas()
    },
    async refrescarConsultas() {
      if (!this.currentUser?.id) return
      this.cargandoConsultas = true
      const { data, error } = await soporte.listarMisConsultas(this.currentUser.id)
      this.consultas = data
      this.errorConsultas = error || ''
      this.cargandoConsultas = false
    },
    async abrirTicket(consulta) {
      this.ticketAbierto = { ...consulta }
      this.mensajesTicket = []
      this.errorHilo = ''
      this.cargandoHilo = true
      this.cancelarMensajes?.()
      this.cancelarMensajes = soporte.suscribirMensajes(consulta.id, (m) => this.alLlegarMensaje(m))
      // Lectura sincronizada: los avisos de la campanita de esta consulta quedan leídos.
      this.avisarConversacionAbierta(consulta.id)
      notificaciones.marcarLeidasDeSoporte(consulta.id)
      const { data, error } = await soporte.cargarMensajes(consulta.id)
      this.mensajesTicket = data
      this.errorHilo = error || ''
      this.cargandoHilo = false
      this.marcarLeida(consulta.id)
    },
    cerrarTicket() {
      this.cancelarMensajes?.()
      this.cancelarMensajes = null
      this.ticketAbierto = null
      this.avisarConversacionAbierta(null)
    },
    /** La campanita lo usa para no avisar de lo que ya se está viendo y para dejar leídos sus avisos. */
    avisarConversacionAbierta(id) {
      window.dispatchEvent(new CustomEvent('ad-soporte-conversacion-abierta', { detail: { id } }))
    },
    /** El equipo respondió con el hilo abierto: se agrega al instante y queda leído. */
    alLlegarMensaje(m) {
      if (!m || m.interno) return
      if (this.mensajesTicket.some((x) => x.id === m.id)) return
      this.mensajesTicket = [...this.mensajesTicket, m]
      // Sonido solo para lo ajeno que llega en vivo (nunca lo que uno mismo escribe).
      if (m.role === 'agent' || m.role === 'assistant') this.sonido.reproducir()
      if (m.role === 'agent' && this.ticketAbierto) this.marcarLeida(this.ticketAbierto.id)
    },
    async marcarLeida(id) {
      const c = this.consultas.find((x) => x.id === id)
      if (c && c.no_leidos_cliente > 0) {
        c.no_leidos_cliente = 0
        soporte.marcarLeidoCliente(id)
      } else if (this.ticketAbierto?.id === id && this.ticketAbierto.no_leidos_cliente > 0) {
        soporte.marcarLeidoCliente(id)
      }
      if (this.ticketAbierto?.id === id) this.ticketAbierto.no_leidos_cliente = 0
    },
    async responder({ texto, archivos = [] }) {
      this.enviandoRespuesta = true
      let adjuntos = []
      if (archivos.length) {
        const subida = await adjuntosServicio.subirAdjuntos(this.ticketAbierto.id, archivos)
        if (subida.error) {
          this.enviandoRespuesta = false
          this.errorHilo = subida.error
          return
        }
        adjuntos = subida.data
      }
      const { data, error } = await soporte.responderComoCliente(this.ticketAbierto.id, texto, adjuntos.length ? { adjuntos } : undefined)
      this.enviandoRespuesta = false
      if (error) {
        this.errorHilo = error
        return
      }
      this.errorHilo = ''
      this.alLlegarMensaje(data)
      if (this.ticketAbierto.estado_ticket === 'resuelto' || this.ticketAbierto.estado_ticket === 'esperando_cliente') {
        this.ticketAbierto.estado_ticket = 'en_curso'
      }
    },
    async resolver() {
      const { error } = await soporte.marcarResuelta(this.ticketAbierto.id)
      if (error) this.errorHilo = error
      else this.ticketAbierto.estado_ticket = 'resuelto'
    },
    async calificarTicket(valor) {
      const { error } = await soporte.calificar(this.ticketAbierto.id, valor)
      if (error) this.errorHilo = error
      else this.ticketAbierto.calificacion = valor
    },

    // ─── Tiempo real de la lista (no leídos, estado) ───
    suscribirConsultas() {
      const id = this.currentUser?.id
      if (!this.isCliente || !id || this.suscritoA === id) return
      this.cancelarConsultas?.()
      this.suscritoA = id
      this.refrescarConsultas()
      this.cancelarConsultas = soporte.suscribirMisConsultas(id, (c) => this.alCambiarConsulta(c))
    },
    alCambiarConsulta(c) {
      if (!c || c.mode !== 'human') return
      const i = this.consultas.findIndex((x) => x.id === c.id)
      const abierta = this.ticketAbierto?.id === c.id
      // El equipo respondió: subió el contador de no leídos (también con el chat cerrado).
      const antes = i >= 0 ? this.consultas[i].no_leidos_cliente || 0 : 0
      if ((c.no_leidos_cliente || 0) > antes) this.sonido.reproducir()
      const fusion = { ...(i >= 0 ? this.consultas[i] : {}), ...c }
      // Con el hilo a la vista, lo nuevo ya se está leyendo.
      if (abierta && this.isChatOpen) fusion.no_leidos_cliente = 0
      if (i >= 0) this.consultas.splice(i, 1, fusion)
      else this.consultas.unshift(fusion)
      if (abierta) {
        this.ticketAbierto = { ...this.ticketAbierto, ...fusion }
        if (c.no_leidos_cliente > 0) soporte.marcarLeidoCliente(c.id)
      }
    },
  },
}
</script>

<style scoped>
.support-chat-wrapper { font-family: 'Montserrat', sans-serif; }

.chat-fab {
  position: fixed !important;
  bottom: 24px;
  right: 24px;
  z-index: 1500;
}
.fab-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-on-error));
  border: 2px solid rgb(var(--v-theme-surface));
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  /* Al llegar un mensaje (cambia el número) late suave 2 veces para llamar la atención. */
  animation: fabLatido 0.6s ease-out 2;
}
@keyframes fabLatido { 0% { transform: scale(0.6); } 50% { transform: scale(1.25); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .fab-badge { animation: none; } }
.fab-bounce-enter-active { animation: fabIn 0.25s ease-out; }
.fab-bounce-leave-active { animation: fabIn 0.15s ease-in reverse; }
@keyframes fabIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.chat-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 400px;
  height: 640px;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1500;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-background));
  border-radius: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.22);
}
.chat-panel--mobile {
  bottom: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  border-radius: 0;
  border: 0;
}
.chat-panel-enter-active { animation: panelIn 0.22s ease-out; }
.chat-panel-leave-active { animation: panelIn 0.15s ease-in reverse; }
@keyframes panelIn { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 18px;
  background: rgb(var(--v-theme-surface));
}
.chat-header__title { margin: 0; flex: 1; font-size: 1.25rem; font-weight: 700; }

.chat-tabs {
  display: flex;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}
.chat-tab {
  position: relative;
  flex: 1;
  min-height: 48px;
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  color: rgba(var(--v-theme-on-surface), 0.75);
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
}
.chat-tab--activa {
  color: rgb(var(--v-theme-on-surface));
  border-bottom-color: rgb(var(--v-theme-primary));
}
.chat-tab:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.chat-tab__punto {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-left: 6px;
  vertical-align: middle;
  border-radius: 50%;
  background: rgb(var(--v-theme-error));
}

.chat-cuerpo { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; }

@media (max-width: 599px) {
  .chat-fab { bottom: 16px; right: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .fab-bounce-enter-active, .fab-bounce-leave-active, .chat-panel-enter-active, .chat-panel-leave-active { animation: none; }
}
</style>
