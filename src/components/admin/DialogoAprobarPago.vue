<template>
  <DialogoConfirmar
    :model-value="modelValue" titulo="¿Aprobar este pago?" icono="mdi-check-circle-outline"
    mensaje="La factura se marcará como pagada y avisaremos al cliente. Esto no se puede deshacer."
    texto-confirmar="Aprobar pago" :cargando="cargando"
    @update:model-value="$emit('update:modelValue', $event)" @confirmar="$emit('confirmar')"
  >
    <div v-if="esSuscripcion" class="mt-4" data-testid="aprobar-suscripcion">
      <h3 class="aprobar__titulo">Plan que se activa</h3>
      <v-select
        :model-value="planId" :items="planes" item-title="name" item-value="id"
        label="Plan a activar" variant="outlined" prepend-inner-icon="mdi-crown-outline" class="mb-2"
        @update:model-value="$emit('update:planId', $event)"
      />
      <v-text-field
        :model-value="trialEnd" label="Vence el" type="datetime-local" variant="outlined"
        prepend-inner-icon="mdi-calendar-clock" hint="Déjalo vacío para acceso sin fecha de vencimiento" persistent-hint
        @update:model-value="$emit('update:trialEnd', $event)"
      />
    </div>
  </DialogoConfirmar>
</template>

<script setup>
import DialogoConfirmar from '@/components/ui/DialogoConfirmar.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  esSuscripcion: { type: Boolean, default: false },
  planes: { type: Array, default: () => [] },
  planId: { type: [String, Number], default: null },
  trialEnd: { type: String, default: '' },
  cargando: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'update:planId', 'update:trialEnd', 'confirmar'])
</script>

<style scoped>
.aprobar__titulo { font-size: 1rem; font-weight: 700; margin: 0 0 12px; }
</style>
