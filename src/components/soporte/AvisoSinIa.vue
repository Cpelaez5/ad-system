<template>
  <div class="aviso" role="status">
    <p class="aviso__texto">{{ mensaje }}</p>
    <SugerenciasGuias :guias="guias" titulo="Guías que pueden ayudarte" @abrir="$emit('abrir-guia', $event)" />
    <v-btn color="primary" size="large" block class="text-none aviso__boton" prepend-icon="mdi-message-text-outline" @click="$emit('escribir-equipo')">
      Escribirle al equipo
    </v-btn>
  </div>
</template>

<script setup>
/**
 * AvisoSinIa — cuando la IA no puede responder (sin créditos, sin plan o un fallo):
 * mensaje amable, guías y "Escribirle al equipo". El cliente nunca se queda sin salida.
 */
import SugerenciasGuias from './SugerenciasGuias.vue'

defineProps({
  mensaje: { type: String, required: true },
  guias: { type: Array, default: () => [] },
})
defineEmits(['abrir-guia', 'escribir-equipo'])
</script>

<style scoped>
.aviso {
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px; border-radius: 16px;
  background: rgba(var(--v-theme-warning), 0.14);
  border: 1px solid rgba(var(--v-theme-warning), 0.5);
}
.aviso__texto { margin: 0; font-size: 1rem; line-height: 1.5; }
.aviso__boton { min-height: 48px; }
</style>
