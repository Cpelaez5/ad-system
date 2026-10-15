<template>
  <section class="hilo" aria-label="Consulta abierta">
    <header class="hilo__cabecera">
      <v-btn v-if="mostrarVolver" variant="text" class="text-none" prepend-icon="mdi-arrow-left" @click="$emit('volver')">Volver a la bandeja</v-btn>
      <h2 class="hilo__titulo">Consulta #{{ numeroTicket(consulta.ticket_numero) }} · {{ textoTema(consulta.categoria) }}</h2>

      <dl class="hilo__contexto">
        <div><dt>Negocio</dt><dd>{{ consulta.negocio || 'Sin nombre' }}</dd></div>
        <div><dt>Cliente</dt><dd>{{ consulta.cliente_nombre || 'Sin nombre' }}</dd></div>
        <div><dt>Plan</dt><dd>{{ consulta.plan || 'Sin plan' }}</dd></div>
        <div><dt>Pantalla</dt><dd>{{ consulta.current_route_title || 'No se sabe' }}</dd></div>
      </dl>

      <div class="hilo__controles">
        <v-select
          :model-value="consulta.estado_ticket"
          :items="itemsEstado"
          label="Estado"
          density="comfortable"
          variant="outlined"
          hide-details
          @update:model-value="$emit('cambiar-estado', $event)"
        />
        <v-select
          :model-value="consulta.prioridad"
          :items="itemsPrioridad"
          label="Prioridad"
          density="comfortable"
          variant="outlined"
          hide-details
          @update:model-value="$emit('cambiar-prioridad', $event)"
        />
        <v-btn
          :variant="asignadaAMi ? 'tonal' : 'outlined'"
          size="large"
          class="text-none"
          :prepend-icon="asignadaAMi ? 'mdi-account-check' : 'mdi-account-plus-outline'"
          :disabled="asignadaAMi"
          @click="$emit('asignarme')"
        >
          {{ asignadaAMi ? 'Asignada a mí' : consulta.asignado_a ? 'Asignármela a mí' : 'Asignármela' }}
        </v-btn>
      </div>
    </header>

    <div ref="contenedor" class="hilo__mensajes" aria-live="polite">
      <div v-if="resumen" class="hilo__resumen">
        <strong>Resumen del problema</strong>
        <p>{{ resumen }}</p>
      </div>
      <p v-if="cargando" class="hilo__nota">Cargando la conversación…</p>
      <p v-else-if="error" class="hilo__nota hilo__nota--error" role="alert">{{ error }}</p>
      <MensajeSoporte v-for="m in mensajes" :key="m.id || m.created_at" :mensaje="m" vista-equipo />
      <p v-if="consulta.calificacion" class="hilo__nota">
        El cliente calificó esta consulta: {{ consulta.calificacion === 1 ? '👍 quedó resuelto' : '👎 no quedó resuelto' }}.
      </p>
    </div>

    <form class="hilo__responder" @submit.prevent="enviar" @dragover="alArrastrar" @drop="alSoltar">
      <div class="hilo__modo" role="group" aria-label="Tipo de mensaje">
        <v-btn :variant="!nota ? 'flat' : 'outlined'" :color="!nota ? 'primary' : undefined" class="text-none" @click="nota = false">Responder al cliente</v-btn>
        <v-btn :variant="nota ? 'flat' : 'outlined'" :color="nota ? 'warning' : undefined" class="text-none" @click="nota = true">Nota interna</v-btn>
        <v-menu>
          <template #activator="{ props: act }">
            <v-btn v-bind="act" variant="text" class="text-none" prepend-icon="mdi-text-box-multiple-outline">Respuestas guardadas</v-btn>
          </template>
          <v-list>
            <v-list-item v-for="r in respuestas" :key="r.id || r.titulo" :title="r.titulo" @click="texto = r.texto">
              <template #append>
                <v-btn icon="mdi-delete-outline" size="small" variant="text" :aria-label="`Quitar ${r.titulo}`" @click.stop="$emit('quitar-respuesta', r)" />
              </template>
            </v-list-item>
            <v-list-item v-if="!respuestas.length" title="No hay respuestas guardadas" />
            <v-divider />
            <v-list-item prepend-icon="mdi-content-save-outline" title="Guardar lo que escribí como respuesta" :disabled="!texto.trim()" @click="$emit('guardar-respuesta', texto.trim())" />
            <v-list-item subtitle="Se guardan solo en este navegador." />
          </v-list>
        </v-menu>
      </div>
      <textarea
        v-model="texto"
        class="hilo__campo"
        :class="{ 'hilo__campo--nota': nota }"
        rows="3"
        maxlength="3000"
        :placeholder="nota ? 'Nota solo para el equipo' : 'Escribe la respuesta al cliente'"
        :aria-label="nota ? 'Nota interna' : 'Respuesta al cliente'"
        @paste="alPegar"
      ></textarea>
      <AdjuntosPendientes :pendientes="pendientes" :aviso="aviso" @quitar="quitar" />
      <div class="hilo__enviar">
        <BotonAdjuntar :deshabilitado="lleno || enviando" @archivos="agregar" />
        <v-btn type="submit" :color="nota ? 'warning' : 'primary'" size="large" class="text-none hilo__enviar-btn" :disabled="!puedeEnviar" :loading="enviando">
          {{ nota ? 'Guardar nota' : 'Enviar respuesta' }}
        </v-btn>
      </div>
    </form>
  </section>
</template>

<script setup>
/**
 * HiloEquipo — la consulta abierta en la bandeja del super admin: contexto, hilo
 * completo (con lo que dijo la IA y las notas internas), respuesta, estado,
 * prioridad y asignación. Es presentación: Soporte.vue llama a los servicios.
 */
import { computed, nextTick, ref, watch } from 'vue'
import MensajeSoporte from './MensajeSoporte.vue'
import AdjuntosPendientes from './AdjuntosPendientes.vue'
import BotonAdjuntar from './BotonAdjuntar.vue'
import { useAdjuntosPendientes } from '@/composables/useAdjuntosPendientes'
import { ESTADOS_TICKET, ORDEN_ESTADOS, PRIORIDADES, numeroTicket, textoTema } from '@/utils/soporte.js'

const props = defineProps({
  consulta: { type: Object, required: true },
  mensajes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' },
  enviando: { type: Boolean, default: false },
  miId: { type: String, default: '' },
  respuestas: { type: Array, default: () => [] },
  mostrarVolver: { type: Boolean, default: false },
})
const emit = defineEmits(['volver', 'enviar', 'cambiar-estado', 'cambiar-prioridad', 'asignarme', 'guardar-respuesta', 'quitar-respuesta'])

const texto = ref('')
const nota = ref(false)
const contenedor = ref(null)

const itemsEstado = ORDEN_ESTADOS.map((v) => ({ title: ESTADOS_TICKET[v], value: v }))
const itemsPrioridad = Object.entries(PRIORIDADES).map(([value, title]) => ({ title, value }))
const asignadaAMi = computed(() => !!props.miId && props.consulta.asignado_a === props.miId)
const resumen = computed(() => props.consulta.metadata?.resumen || '')

const { pendientes, archivos, aviso, lleno, agregar, quitar, limpiar, alPegar, alArrastrar, alSoltar } = useAdjuntosPendientes()
const puedeEnviar = computed(() => (!!texto.value.trim() || pendientes.value.length > 0) && !props.enviando)

function enviar() {
  if (!puedeEnviar.value) return
  emit('enviar', { texto: texto.value.trim(), interno: nota.value, archivos: [...archivos.value] })
}

// Se vacía el cuadro solo si el envío salió bien.
watch(() => props.enviando, (ahora, antes) => {
  if (antes && !ahora && !props.error) {
    texto.value = ''
    limpiar()
  }
})

watch(() => props.consulta.id, () => { texto.value = ''; nota.value = false; limpiar() })
watch(() => props.mensajes.length, async () => {
  await nextTick()
  if (contenedor.value) contenedor.value.scrollTop = contenedor.value.scrollHeight
}, { immediate: true, flush: 'post' })
</script>

<style scoped>
.hilo { display: flex; flex-direction: column; min-height: 0; height: 100%; }
.hilo__cabecera { padding: 8px 14px 12px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.hilo__titulo { margin: 4px 0 8px; font-size: 1.25rem; font-weight: 700; }
.hilo__contexto { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: 0 0 12px; }
.hilo__contexto dt { font-size: 0.875rem; color: rgba(var(--v-theme-on-surface), 0.7); }
.hilo__contexto dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.hilo__controles { display: grid; grid-template-columns: 1fr; gap: 8px; }
@media (min-width: 720px) { .hilo__controles { grid-template-columns: 1fr 1fr auto; align-items: center; } }
.hilo__mensajes { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 160px; }
.hilo__resumen {
  padding: 12px; border-radius: 12px; background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14); white-space: pre-wrap;
}
.hilo__resumen p { margin: 4px 0 0; }
.hilo__nota { margin: 0; text-align: center; color: rgba(var(--v-theme-on-surface), 0.7); }
.hilo__nota--error { color: rgb(var(--v-theme-error)); font-weight: 600; }
.hilo__responder { display: flex; flex-direction: column; gap: 8px; padding: 10px 14px 14px; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.hilo__enviar { display: flex; align-items: center; gap: 8px; }
.hilo__enviar-btn { flex: 1; }
.hilo__modo { display: flex; flex-wrap: wrap; gap: 8px; }
.hilo__campo {
  width: 100%; padding: 10px 12px; border-radius: 12px; resize: vertical;
  font: inherit; font-size: 1rem; line-height: 1.5;
  color: rgb(var(--v-theme-on-surface)); background: rgb(var(--v-theme-surface));
  border: 1.5px solid rgba(var(--v-theme-on-surface), 0.3);
}
.hilo__campo--nota { border-style: dashed; border-color: rgb(var(--v-theme-warning)); }
.hilo__campo:focus { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 1px; }
</style>
