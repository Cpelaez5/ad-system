<template>
  <span class="ad-ia-marca marca-ia" data-testid="marca-ia">
    <v-icon icon="mdi-creation" size="16" class="marca-ia__icono" aria-hidden="true" />
    <span><slot>{{ texto }}</slot></span>
  </span>
</template>

<script setup>
/**
 * MarcaIA — etiqueta fina que dice qué llenó la IA y que hay que revisarlo.
 * Texto por defecto: "Llenado con IA · revisa". El texto siempre se muestra:
 * el color no es lo único que avisa.
 */
defineOptions({ name: 'MarcaIA' })

defineProps({
  texto: { type: String, default: 'Llenado con IA · revisa' },
})
</script>

<style scoped>
.marca-ia__icono { color: var(--ad-ia-1); }
</style>
