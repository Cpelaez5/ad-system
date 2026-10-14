<template>
  <div class="foto-producto" :class="[`foto-producto--${tipo}`, { 'foto-producto--vacia': !src || fallo }]">
    <img
      v-if="src && !fallo"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="foto-producto__img"
      @error="fallo = true"
    >
    <v-icon v-else :icon="icono" :size="tamanoIcono" class="foto-producto__icono" aria-hidden="true" />
  </div>
</template>

<script setup>
/**
 * FotoProducto — foto cuadrada de un producto o servicio (URL ya firmada), o un
 * espacio con el ícono del tipo cuando no hay foto. Mi mercancía: miniatura de la
 * lista, tarjeta de la cuadrícula y vista previa del formulario.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: null },
  tipo: { type: String, default: 'producto' },
  alt: { type: String, default: '' },
  tamanoIcono: { type: [Number, String], default: 28 },
})

const fallo = ref(false)
watch(() => props.src, () => { fallo.value = false })

const icono = computed(() => (props.tipo === 'servicio' ? 'mdi-briefcase-outline' : 'mdi-package-variant-closed'))
</script>

<style scoped>
.foto-producto {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.foto-producto__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.foto-producto__icono {
  color: rgba(var(--v-theme-on-surface), 0.45);
}
</style>
