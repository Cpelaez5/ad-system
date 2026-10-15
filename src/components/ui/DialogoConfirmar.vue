<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="titulo"
    :icono="icono"
    :max-width="440"
    :cargando="cargando"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <p class="dialogo-confirmar__mensaje" data-testid="confirmar-mensaje">{{ mensaje }}</p>
    <slot />
    <template #acciones>
      <v-btn variant="text" class="text-none" :disabled="cargando" data-testid="confirmar-cancelar" @click="$emit('update:modelValue', false)">{{ textoCancelar }}</v-btn>
      <v-btn
        :color="color" variant="flat" size="large" class="text-none font-weight-bold"
        :loading="cargando" :disabled="deshabilitado" data-testid="confirmar-aceptar"
        @click="$emit('confirmar')"
      >{{ textoConfirmar }}</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'

/**
 * DialogoConfirmar — confirmación de una acción irreversible (anular, eliminar,
 * aprobar, rechazar). Dice QUÉ pasará, deja "Cancelar" a la mano y marca el
 * botón de confirmar con el color de la acción (`error` para destructivas).
 * El slot por defecto admite campos extra (p. ej. el motivo de un rechazo).
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  titulo: { type: String, required: true },
  mensaje: { type: String, default: '' },
  icono: { type: String, default: '' },
  textoConfirmar: { type: String, default: 'Confirmar' },
  textoCancelar: { type: String, default: 'Cancelar' },
  color: { type: String, default: 'primary' },
  cargando: { type: Boolean, default: false },
  deshabilitado: { type: Boolean, default: false },
})
defineEmits(['update:modelValue', 'confirmar'])
</script>

<style scoped>
.dialogo-confirmar__mensaje { font-size: 1rem; line-height: 1.5; margin: 0 0 8px; }
</style>
