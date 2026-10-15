<template>
  <div class="msg" :class="[`msg--${lado}`, { 'msg--nota': mensaje.interno }]">
    <div class="msg__burbuja">
      <span v-if="autor" class="msg__autor">{{ autor }}</span>
      <p v-if="tieneTexto" class="msg__texto">
        <template v-for="(p, i) in partes" :key="i">
          <strong v-if="p.negrita">{{ p.texto }}</strong>
          <template v-else>{{ p.texto }}</template>
        </template>
      </p>
      <AdjuntosMensaje :mensaje="mensaje" />
      <span v-if="mensaje.created_at" class="msg__hora">{{ hora }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * MensajeSoporte — una burbuja del chat de soporte (cliente, asistente IA,
 * equipo o nota interna). El texto se pinta sin v-html: solo **negritas**.
 */
import { computed } from 'vue'
import AdjuntosMensaje from './AdjuntosMensaje.vue'
import { NOMBRE_EQUIPO, partesTexto } from '@/utils/soporte.js'

const props = defineProps({
  /** { role: 'user'|'assistant'|'agent'|'system', content, created_at?, interno? } */
  mensaje: { type: Object, required: true },
  /** Desde el punto de vista del equipo, "user" es el cliente y "agent" es "Tú". */
  vistaEquipo: { type: Boolean, default: false },
})

const lado = computed(() => {
  const r = props.mensaje.role
  if (props.vistaEquipo) return r === 'agent' ? 'propio' : 'ajeno'
  return r === 'user' ? 'propio' : 'ajeno'
})

const autor = computed(() => {
  const m = props.mensaje
  if (m.interno) return 'Nota interna (el cliente no la ve)'
  if (m.role === 'agent') return props.vistaEquipo ? 'Tú (equipo)' : NOMBRE_EQUIPO
  if (m.role === 'assistant') return 'Asistente IA'
  if (m.role === 'user' && props.vistaEquipo) return 'Cliente'
  return ''
})

const tieneTexto = computed(() => !!String(props.mensaje.content || '').trim())
const partes = computed(() => partesTexto(props.mensaje.content))
const hora = computed(() =>
  new Date(props.mensaje.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
)
</script>

<style scoped>
.msg { display: flex; }
.msg--propio { justify-content: flex-end; }
.msg__burbuja {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 1rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.msg--ajeno .msg__burbuja {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-bottom-left-radius: 4px;
}
.msg--propio .msg__burbuja {
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
  border-bottom-right-radius: 4px;
}
.msg--nota .msg__burbuja {
  background: rgba(var(--v-theme-warning), 0.16);
  border: 1px dashed rgba(var(--v-theme-warning), 0.7);
  color: rgb(var(--v-theme-on-surface));
}
.msg__autor { display: block; font-size: 0.875rem; font-weight: 700; opacity: 0.8; margin-bottom: 2px; }
.msg__texto { margin: 0; white-space: pre-wrap; }
.msg__hora { display: block; font-size: 0.8125rem; opacity: 0.7; margin-top: 4px; }
</style>
