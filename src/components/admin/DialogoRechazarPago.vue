<template>
  <DialogoConfirmar
    :model-value="modelValue" titulo="Rechazar pago" icono="mdi-close-circle-outline"
    mensaje="Cuéntale al cliente por qué lo rechazas: él podrá verlo."
    texto-confirmar="Rechazar pago" color="error" :cargando="cargando" :deshabilitado="!motivo.trim()"
    @update:model-value="$emit('update:modelValue', $event)" @confirmar="$emit('confirmar')"
  >
    <v-textarea
      :model-value="motivo" label="Motivo del rechazo" variant="outlined" rows="3" auto-grow class="mt-3"
      :rules="[v => !!(v || '').trim() || 'Escribe el motivo']" data-testid="rechazo-motivo"
      @update:model-value="$emit('update:motivo', $event)"
    />
  </DialogoConfirmar>
</template>

<script setup>
import DialogoConfirmar from '@/components/ui/DialogoConfirmar.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  motivo: { type: String, default: '' },
  cargando: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'update:motivo', 'confirmar'])
</script>
