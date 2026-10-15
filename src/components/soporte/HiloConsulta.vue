<template>
  <div class="hilo">
    <div class="hilo__cabecera">
      <v-btn variant="text" class="text-none" prepend-icon="mdi-arrow-left" @click="$emit('volver')">Mis consultas</v-btn>
      <div class="hilo__titulo">
        <strong>Consulta #{{ numeroTicket(consulta.ticket_numero) }}</strong>
        <span>{{ textoTema(consulta.categoria) }} · {{ ESTADOS_PARA_CLIENTE[consulta.estado_ticket] || 'Recibida' }}</span>
      </div>
    </div>

    <div ref="contenedor" class="hilo__mensajes" aria-live="polite">
      <p v-if="consulta.estado_ticket === 'nuevo'" class="hilo__promesa">
        <v-icon icon="mdi-clock-outline" size="20" /> {{ textoConfirmacion(consulta.ticket_numero) }}
      </p>
      <p v-if="cargando" class="hilo__nota">Cargando la conversación…</p>
      <p v-else-if="error" class="hilo__nota hilo__nota--error" role="alert">{{ error }}</p>
      <MensajeSoporte v-for="m in mensajes" :key="m.id || m.created_at" :mensaje="m" />

      <div v-if="resuelta" class="hilo__cierre">
        <template v-if="!calificacion">
          <p class="hilo__cierre-titulo">¿Quedó resuelto?</p>
          <div class="hilo__cierre-botones">
            <v-btn variant="outlined" size="large" class="text-none" prepend-icon="mdi-thumb-up-outline" @click="$emit('calificar', 1)">Sí</v-btn>
            <v-btn variant="outlined" size="large" class="text-none" prepend-icon="mdi-thumb-down-outline" @click="$emit('calificar', -1)">No</v-btn>
          </div>
        </template>
        <p v-else class="hilo__cierre-titulo">
          {{ calificacion === 1 ? '¡Gracias! Nos alegra haberte ayudado.' : 'Gracias por contarnos. Si aún necesitas ayuda, escríbenos de nuevo aquí.' }}
        </p>
      </div>
    </div>

    <div class="hilo__entrada">
      <v-btn
        v-if="!resuelta && mensajes.length"
        variant="tonal"
        class="text-none hilo__resuelto"
        prepend-icon="mdi-check"
        @click="$emit('resolver')"
      >
        Ya se resolvió
      </v-btn>
      <AdjuntosPendientes :pendientes="pendientes" :aviso="aviso" @quitar="quitar" />
      <form class="hilo__form" @submit.prevent="enviar" @dragover="alArrastrar" @drop="alSoltar">
        <BotonAdjuntar :deshabilitado="lleno || enviando" @archivos="agregar" />
        <textarea
          v-model="texto"
          class="hilo__campo"
          rows="1"
          maxlength="1500"
          :placeholder="resuelta ? 'Escribe aquí si necesitas algo más' : 'Escribe tu respuesta'"
          aria-label="Tu mensaje al equipo"
          @keydown.enter.exact.prevent="enviar"
          @paste="alPegar"
        ></textarea>
        <v-btn type="submit" icon="mdi-send" color="primary" aria-label="Enviar" :disabled="!puedeEnviar" :loading="enviando" />
      </form>
    </div>
  </div>
</template>

<script setup>
/**
 * HiloConsulta — una consulta abierta: el hilo completo (incluida la IA), la
 * respuesta del cliente, "Ya se resolvió" y "¿Quedó resuelto? 👍/👎".
 * Es presentación: el padre llama a los servicios y mantiene los mensajes en tiempo real.
 */
import { computed, nextTick, ref, watch } from 'vue'
import MensajeSoporte from './MensajeSoporte.vue'
import AdjuntosPendientes from './AdjuntosPendientes.vue'
import BotonAdjuntar from './BotonAdjuntar.vue'
import { useAdjuntosPendientes } from '@/composables/useAdjuntosPendientes'
import { ESTADOS_PARA_CLIENTE, numeroTicket, textoConfirmacion, textoTema } from '@/utils/soporte.js'

const props = defineProps({
  consulta: { type: Object, required: true },
  mensajes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' },
  enviando: { type: Boolean, default: false },
})
const emit = defineEmits(['volver', 'enviar', 'resolver', 'calificar'])

const texto = ref('')
const contenedor = ref(null)
const resuelta = computed(() => props.consulta.estado_ticket === 'resuelto')
const calificacion = computed(() => props.consulta.calificacion || 0)

const { pendientes, archivos, aviso, lleno, agregar, quitar, limpiar, alPegar, alArrastrar, alSoltar } = useAdjuntosPendientes()
const puedeEnviar = computed(() => (!!texto.value.trim() || pendientes.value.length > 0) && !props.enviando)

/** Emite { texto, archivos }: el padre sube las imágenes y guarda el mensaje. */
function enviar() {
  if (!puedeEnviar.value) return
  emit('enviar', { texto: texto.value.trim(), archivos: [...archivos.value] })
}

// Se vacía el cuadro solo si el envío salió bien: si falla, no se pierde lo escrito ni las imágenes.
watch(() => props.enviando, (ahora, antes) => {
  if (antes && !ahora && !props.error) {
    texto.value = ''
    limpiar()
  }
})

watch(() => props.mensajes.length, async () => {
  await nextTick()
  if (contenedor.value) contenedor.value.scrollTop = contenedor.value.scrollHeight
}, { immediate: true, flush: 'post' })
</script>

<style scoped>
.hilo { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.hilo__cabecera { padding: 4px 8px 8px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.hilo__titulo { display: flex; flex-direction: column; padding: 0 8px; }
.hilo__titulo span { font-size: 0.9375rem; color: rgba(var(--v-theme-on-surface), 0.72); }
.hilo__mensajes { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.hilo__promesa {
  display: flex; align-items: center; gap: 8px; margin: 0; padding: 10px 12px; border-radius: 12px;
  font-size: 1rem; font-weight: 600; background: rgba(var(--v-theme-success), 0.14);
}
.hilo__nota { margin: 0; text-align: center; color: rgba(var(--v-theme-on-surface), 0.7); }
.hilo__nota--error { color: rgb(var(--v-theme-error)); font-weight: 600; }
.hilo__cierre { padding: 12px; border-radius: 16px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), 0.14); }
.hilo__cierre-titulo { margin: 0 0 8px; font-weight: 700; }
.hilo__cierre-botones { display: flex; gap: 8px; }
.hilo__entrada { padding: 8px 12px 12px; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); display: flex; flex-direction: column; gap: 8px; }
.hilo__resuelto { align-self: flex-start; }
.hilo__form { display: flex; align-items: flex-end; gap: 8px; }
.hilo__campo {
  flex: 1; resize: none; padding: 10px 12px; border-radius: 14px; max-height: 120px;
  font: inherit; font-size: 1rem; line-height: 1.4;
  color: rgb(var(--v-theme-on-surface)); background: rgb(var(--v-theme-surface));
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.3);
}
.hilo__campo:focus { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 1px; }
</style>
