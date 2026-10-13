<template>
  <v-bottom-sheet
    v-if="$vuetify.display.mobile"
    :model-value="modelValue"
    :persistent="persistent"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title v-if="titulo" class="d-flex align-center justify-space-between">
        {{ titulo }}
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Cerrar" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions v-if="$slots.acciones">
        <slot name="acciones" />
      </v-card-actions>
    </v-card>
  </v-bottom-sheet>

  <v-dialog
    v-else
    :model-value="modelValue"
    :persistent="persistent"
    :max-width="maxWidth"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title v-if="titulo" class="d-flex align-center justify-space-between">
        {{ titulo }}
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Cerrar" @click="$emit('update:modelValue', false)" />
      </v-card-title>
      <v-card-text>
        <slot />
      </v-card-text>
      <v-card-actions v-if="$slots.acciones">
        <slot name="acciones" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * HojaInferior — misma API (v-model, slot por defecto, slot "acciones",
 * prop "titulo") sobre dos componentes de Vuetify distintos según el
 * tamaño de pantalla: <v-bottom-sheet> en móvil, <v-dialog> en escritorio.
 * Así cada formulario/flujo solo escribe el contenido una vez y se adapta
 * sin lógica propia de breakpoints.
 */
export default {
  name: 'HojaInferior',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    titulo: {
      type: String,
      default: '',
    },
    maxWidth: {
      type: [String, Number],
      default: 560,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue'],
}
</script>
