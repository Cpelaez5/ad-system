<template>
  <span class="adjuntar">
    <v-btn
      icon="mdi-paperclip"
      variant="text"
      size="large"
      :disabled="deshabilitado"
      aria-label="Adjuntar una captura de pantalla"
      title="Adjuntar una captura de pantalla"
      data-test="boton-adjuntar"
      @click="entrada?.click()"
    />
    <input
      ref="entrada"
      type="file"
      class="adjuntar__input"
      accept="image/png,image/jpeg,image/webp"
      multiple
      tabindex="-1"
      aria-hidden="true"
      data-test="entrada-adjuntar"
      @change="elegidos"
    />
  </span>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ deshabilitado: { type: Boolean, default: false } })
const emit = defineEmits(['archivos'])
const entrada = ref(null)

function elegidos(e) {
  const lista = Array.from(e.target.files || [])
  if (lista.length) emit('archivos', lista)
  e.target.value = '' // permite elegir la misma captura otra vez
}
</script>

<style scoped>
.adjuntar { display: inline-flex; flex: none; }
.adjuntar__input { display: none; }
</style>
