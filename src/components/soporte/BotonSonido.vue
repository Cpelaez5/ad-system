<template>
  <v-btn
    :icon="silenciado ? 'mdi-bell-off-outline' : 'mdi-bell-outline'"
    variant="text"
    :aria-label="silenciado ? 'Activar el sonido de mensajes nuevos' : 'Silenciar el sonido de mensajes nuevos'"
    :title="silenciado ? 'Sonido apagado. Toca para activarlo' : 'Sonido encendido. Toca para silenciarlo'"
    :aria-pressed="!silenciado"
    data-test="boton-sonido"
    @click="$emit('alternar')"
  />
</template>

<script setup>
/** Campanita para encender o apagar el sonido de mensajes nuevos. */
defineProps({ silenciado: { type: Boolean, default: false } })
defineEmits(['alternar'])
</script>
