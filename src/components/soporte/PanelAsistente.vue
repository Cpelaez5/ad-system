<template>
  <div class="asistente">
    <div ref="contenedor" class="asistente__mensajes" aria-live="polite">
      <MensajeSoporte :mensaje="{ role: 'assistant', content: bienvenida }" />

      <template v-for="(m, i) in mensajes" :key="i">
        <MensajeSoporte :mensaje="m" />
        <OfertaEscalar
          v-if="m.ofrecer && ofertaVigente === i"
          @aceptar="escalar"
          @rechazar="ofertaVigente = -1"
        />
      </template>

      <p v-if="escribiendo" class="asistente__escribiendo">El asistente está escribiendo…</p>

      <AvisoSinIa
        v-if="aviso"
        :mensaje="aviso.mensaje"
        :guias="guiasDelAviso"
        @abrir-guia="$emit('abrir-guia', $event)"
        @escribir-equipo="escalar"
      />
    </div>

    <div class="asistente__pie">
      <SugerenciasGuias v-if="!aviso" :guias="guiasMientrasEscribe" @abrir="$emit('abrir-guia', $event)" />

      <v-btn
        variant="outlined"
        color="primary"
        block
        size="large"
        class="text-none asistente__equipo"
        prepend-icon="mdi-message-text-outline"
        @click="escalar"
      >
        Escribirle al equipo
      </v-btn>

      <form class="asistente__form" @submit.prevent="enviar">
        <input
          v-model="texto"
          type="text"
          class="asistente__campo"
          :placeholder="iaApagada ? 'El asistente no está disponible' : 'Escribe tu pregunta'"
          :disabled="escribiendo || iaApagada"
          maxlength="500"
          aria-label="Tu pregunta al asistente"
        />
        <v-btn type="submit" icon="mdi-send" color="primary" aria-label="Enviar" :disabled="!texto.trim() || escribiendo || iaApagada" />
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * PanelAsistente — capas 1 y 2 del soporte: guías mientras escribe y asistente IA.
 * La capa 3 ("Escribirle al equipo") la resuelve el padre con el evento `escribir-equipo`.
 * Si la IA no responde (sin créditos, sin plan o fallo) siempre queda una salida.
 */
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import chatService from '@/services/chatService'
import { cargarArticulos } from '@/services/ayudaService'
import { evaluarRespuestaIa, avisoDeErrorIa, MENSAJE_SIN_PLAN, sugerirGuias, temaSugerido } from '@/utils/soporte.js'
import MensajeSoporte from './MensajeSoporte.vue'
import SugerenciasGuias from './SugerenciasGuias.vue'
import OfertaEscalar from './OfertaEscalar.vue'
import AvisoSinIa from './AvisoSinIa.vue'

const props = defineProps({
  usuario: { type: Object, default: () => ({}) },
  /** { name, title, query } de la pantalla desde la que escribe */
  ruta: { type: Object, default: () => ({}) },
  iaDisponible: { type: Boolean, default: true },
  limiteAlcanzado: { type: Boolean, default: false },
  mensajeLimite: { type: String, default: '' },
})
const emit = defineEmits(['escribir-equipo', 'abrir-guia'])

const mensajes = ref([])
const historial = ref([])
const preguntas = ref([])
const texto = ref('')
const escribiendo = ref(false)
const aviso = ref(null)
const ofertaVigente = ref(-1)
const articulos = ref([])
const contenedor = ref(null)
let conversationId = null

const bienvenida = computed(() =>
  chatService.getWelcomeMessage(props.ruta.name, props.ruta.title, props.usuario?.firstName || props.usuario?.first_name || ''),
)

const iaApagada = computed(() => !props.iaDisponible || props.limiteAlcanzado || aviso.value?.tipo === 'sin_creditos')
const guiasMientrasEscribe = computed(() => sugerirGuias(articulos.value, texto.value))
const guiasDelAviso = computed(() => sugerirGuias(articulos.value, preguntas.value[preguntas.value.length - 1] || '', 3))

onMounted(async () => {
  try { articulos.value = await cargarArticulos() } catch { articulos.value = [] }
  if (!props.iaDisponible) aviso.value = { tipo: 'sin_plan', mensaje: MENSAJE_SIN_PLAN }
  else if (props.limiteAlcanzado) aviso.value = { tipo: 'limite', mensaje: props.mensajeLimite }
})

function alFondo() {
  nextTick(() => { if (contenedor.value) contenedor.value.scrollTop = contenedor.value.scrollHeight })
}

async function asegurarConversacion() {
  if (conversationId || !props.usuario?.id) return conversationId
  const c = await chatService.createConversation({
    userId: props.usuario.id,
    organizationId: props.usuario.organization_id,
    clientId: props.usuario.client_id,
    routeName: props.ruta.name,
    routeTitle: props.ruta.title,
  })
  conversationId = c?.id || null
  return conversationId
}

async function enviar() {
  const pregunta = texto.value.trim()
  if (!pregunta || escribiendo.value || iaApagada.value) return
  texto.value = ''
  aviso.value = null
  ofertaVigente.value = -1
  mensajes.value.push({ role: 'user', content: pregunta, created_at: new Date().toISOString() })
  historial.value.push({ role: 'user', content: pregunta })
  preguntas.value.push(pregunta)
  alFondo()
  escribiendo.value = true

  const id = await asegurarConversacion()
  chatService.saveMessage(id, 'user', pregunta, { route: props.ruta.name })

  try {
    const cruda = await chatService.sendMessage(pregunta, historial.value, {
      routeName: props.ruta.name,
      routeTitle: props.ruta.title,
      queryParams: props.ruta.query || {},
    })
    const ev = evaluarRespuestaIa(pregunta, cruda)
    mensajes.value.push({ role: 'assistant', content: ev.texto, created_at: new Date().toISOString(), ofrecer: ev.ofrecer })
    historial.value.push({ role: 'assistant', content: ev.texto })
    if (ev.ofrecer) ofertaVigente.value = mensajes.value.length - 1
    chatService.saveMessage(id, 'assistant', ev.texto, { route: props.ruta.name })
  } catch (e) {
    aviso.value = avisoDeErrorIa(e)
  } finally {
    escribiendo.value = false
    alFondo()
  }
}

async function escalar() {
  const id = await asegurarConversacion()
  emit('escribir-equipo', {
    conversationId: id,
    preguntas: [...preguntas.value],
    borrador: texto.value.trim() || preguntas.value[preguntas.value.length - 1] || '',
    tema: temaSugerido([texto.value, ...preguntas.value].join(' ')) || '',
  })
}

/** Después de enviar el ticket: el asistente vuelve a empezar con una conversación nueva. */
function reiniciar() {
  mensajes.value = []
  historial.value = []
  preguntas.value = []
  texto.value = ''
  aviso.value = null
  ofertaVigente.value = -1
  conversationId = null
}

// Si navega con la conversación abierta, el equipo ve desde qué pantalla escribe.
watch(() => props.ruta.name, () => {
  if (conversationId) chatService.updateConversationRoute(conversationId, props.ruta.name, props.ruta.title)
})

watch(() => props.limiteAlcanzado, (v) => { if (v && !aviso.value) aviso.value = { tipo: 'limite', mensaje: props.mensajeLimite } })

defineExpose({ reiniciar, mensajes, aviso })
</script>

<style scoped>
.asistente { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.asistente__mensajes { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.asistente__escribiendo { margin: 0; font-size: 0.9375rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.asistente__pie {
  display: flex; flex-direction: column; gap: 8px; padding: 10px 12px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
}
.asistente__equipo { min-height: 48px; }
.asistente__form { display: flex; align-items: center; gap: 8px; }
.asistente__campo {
  flex: 1; min-height: 48px; padding: 0 14px; border-radius: 24px;
  font: inherit; font-size: 1rem; color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.25);
}
.asistente__campo:focus { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 1px; }
.asistente__campo:disabled { opacity: 0.6; }
</style>
