<template>
  <v-alert
    type="error"
    variant="tonal"
    class="mt-4 border-error rounded-lg"
    icon="mdi-alert-circle"
  >
    <div class="font-weight-bold text-subtitle-1 mb-1">{{ error.code }}</div>
    <div class="text-body-2 mb-3">{{ error.message }}</div>
    
    <v-btn
      v-if="error.suggestManualEntry"
      variant="outlined"
      color="error"
      size="small"
      class="text-none w-100"
      style="white-space: normal; height: auto; min-height: 36px; padding: 8px;"
      @click="$emit('manual-entry')"
    >
      <v-icon start>mdi-keyboard</v-icon>
      Proceder al ingreso manual (Simulador)
    </v-btn>
  </v-alert>
</template>

<script setup>
defineProps({
  error: {
    type: Object,
    required: true
  }
});

defineEmits(['manual-entry']);
</script>

<style scoped>
.border-error {
  border: 1px solid rgba(var(--v-theme-error), 0.3) !important;
}
</style>
