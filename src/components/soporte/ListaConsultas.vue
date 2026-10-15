<template>
  <div class="consultas">
    <div v-if="cargando" class="consultas__cargando" aria-busy="true">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" />
    </div>

    <div v-else-if="error" class="consultas__error" role="alert">
      <p>{{ error }}</p>
      <v-btn variant="tonal" class="text-none" @click="$emit('reintentar')">Reintentar</v-btn>
    </div>

    <EstadoVacio
      v-else-if="!consultas.length"
      icono="mdi-message-text-outline"
      titulo="Aún no le has escrito al equipo"
      mensaje="Cuando lo hagas, tus consultas y sus respuestas aparecen aquí."
      texto-accion="Escribirle al equipo"
      @accion="$emit('escribir')"
    />

    <ul v-else class="consultas__lista">
      <li v-for="c in consultas" :key="c.id">
        <button type="button" class="fila" @click="$emit('abrir', c)">
          <span class="fila__icono" :class="`fila__icono--${c.estado_ticket}`">
            <v-icon :icon="iconoEstado(c.estado_ticket)" size="24" />
          </span>
          <span class="fila__texto">
            <span class="fila__titulo">Consulta #{{ numeroTicket(c.ticket_numero) }} · {{ textoTema(c.categoria) }}</span>
            <span class="fila__estado">{{ ESTADOS_PARA_CLIENTE[c.estado_ticket] || 'Recibida' }} · {{ haceCuanto(c.ultimo_mensaje_en || c.created_at) }}</span>
          </span>
          <span v-if="c.no_leidos_cliente > 0" class="fila__punto" :aria-label="`${c.no_leidos_cliente} mensajes sin leer`">{{ c.no_leidos_cliente }}</span>
          <v-icon icon="mdi-chevron-right" size="22" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
/** ListaConsultas — "Mis consultas": los tickets del cliente con número, tema, estado y no leídos. */
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import { ESTADOS_PARA_CLIENTE, haceCuanto, numeroTicket, textoTema } from '@/utils/soporte.js'

defineProps({
  consultas: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
defineEmits(['abrir', 'escribir', 'reintentar'])

const ICONOS = {
  nuevo: 'mdi-email-outline',
  en_curso: 'mdi-progress-clock',
  esperando_cliente: 'mdi-message-reply-text-outline',
  resuelto: 'mdi-check-circle-outline',
}
const iconoEstado = (e) => ICONOS[e] || ICONOS.nuevo
</script>

<style scoped>
.consultas { padding: 12px 14px; }
.consultas__error { padding: 16px; text-align: center; color: rgb(var(--v-theme-error)); }
.consultas__lista { list-style: none; margin: 0; padding: 0; border-radius: 16px; overflow: hidden; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), 0.14); }
.consultas__lista li + li { border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.fila {
  display: flex; align-items: center; gap: 12px; width: 100%;
  min-height: 72px; padding: 10px 12px; text-align: left; cursor: pointer;
  font: inherit; color: inherit; background: transparent; border: 0;
}
.fila:hover, .fila:focus-visible { background: rgba(var(--v-theme-on-surface), 0.05); }
.fila__icono {
  flex: none; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.fila__icono--resuelto { color: rgb(var(--v-theme-success)); background: rgba(var(--v-theme-success), 0.14); }
.fila__icono--esperando_cliente { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.12); }
.fila__texto { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.fila__titulo { font-weight: 700; font-size: 1rem; }
.fila__estado { font-size: 0.9375rem; color: rgba(var(--v-theme-on-surface), 0.72); }
.fila__punto {
  flex: none; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px;
  display: grid; place-items: center; font-size: 0.8125rem; font-weight: 700;
  color: #fff; background: rgb(var(--v-theme-error));
}
</style>
