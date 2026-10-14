<template>
  <v-chip-group
    :model-value="modelValue"
    mandatory
    selected-class="filtro-chips__activo"
    class="filtro-chips"
    :aria-label="etiqueta"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-chip
      v-for="op in opciones"
      :key="op.valor"
      :value="op.valor"
      variant="outlined"
      size="large"
      :disabled="op.deshabilitado"
    >
      {{ op.texto }}<template v-if="op.cantidad !== undefined && op.cantidad !== null"> · {{ op.cantidad }}</template>
    </v-chip>
  </v-chip-group>
</template>

<script setup>
/**
 * FiltroChips — filtros de un toque con su cantidad ("Por resolver · 3").
 * Sobre <v-chip-group mandatory>. El activo va en negro sólido (contraste
 * alto, no compite con el granate de las acciones).
 */
defineProps({
  modelValue: { type: [String, Number], default: null },
  /** [{ valor, texto, cantidad?, deshabilitado? }] */
  opciones: { type: Array, default: () => [] },
  etiqueta: { type: String, default: 'Filtrar' },
})
defineEmits(['update:modelValue'])
</script>

<style scoped>
.filtro-chips :deep(.v-chip) {
  font-weight: 600;
}

.filtro-chips :deep(.filtro-chips__activo) {
  background: rgb(var(--v-theme-on-surface)) !important;
  color: rgb(var(--v-theme-surface)) !important;
  border-color: rgb(var(--v-theme-on-surface)) !important;
}
</style>
