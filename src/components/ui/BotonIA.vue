<template>
  <span class="ad-ia boton-ia" :class="{ 'ad-ia--bloque': block }" data-testid="boton-ia">
    <v-btn
      v-bind="$attrs"
      :block="block"
      class="text-none boton-ia__btn"
      prepend-icon="mdi-creation"
    >
      <slot />
    </v-btn>
  </span>
</template>

<script setup>
/**
 * BotonIA — botón de cualquier función que usa IA. Envuelve un v-btn con el
 * ícono de destellos (`mdi-creation`) y el borde animado de la IA (.ad-ia).
 * Todo atributo (variant, size, loading, disabled, @click...) pasa al v-btn.
 * Ver docs/mvp/diseno/identidad-ia.md.
 */
defineOptions({ name: 'BotonIA', inheritAttrs: false })

defineProps({
  /** Ocupa todo el ancho. */
  block: { type: Boolean, default: false },
})
</script>

<style scoped>
.boton-ia { --ad-ia-radio: 8px; vertical-align: middle; }
.boton-ia__btn { min-height: 44px; }
</style>
