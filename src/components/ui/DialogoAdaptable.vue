<template>
  <v-dialog
    :model-value="modelValue"
    :persistent="persistent"
    :max-width="maxWidth"
    :fullscreen="$vuetify.display.xs"
    scrollable
    :transition="$vuetify.display.xs ? 'dialog-bottom-transition' : 'dialog-transition'"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="dialogo-adaptable">
      <v-card-title class="dialogo-adaptable__titulo">
        <v-icon v-if="icono" :icon="icono" color="primary" class="mr-2" />
        <span class="dialogo-adaptable__texto-titulo">{{ titulo }}</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          aria-label="Cerrar"
          :disabled="cargando"
          @click="$emit('update:modelValue', false)"
        />
      </v-card-title>

      <v-divider />

      <v-card-text class="dialogo-adaptable__contenido">
        <slot />
      </v-card-text>

      <template v-if="$slots.acciones">
        <v-divider />
        <v-card-actions class="dialogo-adaptable__acciones">
          <slot name="acciones" />
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script>
/**
 * DialogoAdaptable — diálogo estándar de AD System sobre <v-dialog>.
 *
 * Por qué existe: en el teléfono un formulario largo dentro de un v-dialog
 * normal queda más alto que la pantalla y los botones Guardar/Cancelar se
 * vuelven inalcanzables (hallazgo E2E 2026-10-13 en Mis papeles).
 *
 * - `scrollable`: solo el contenido hace scroll; título y acciones quedan fijos.
 * - Pantalla completa en xs (teléfono), entrando desde abajo.
 * - Título con ícono opcional y botón cerrar (deshabilitado mientras `cargando`).
 * - Slot por defecto = contenido; slot `acciones` = botones (fijos abajo).
 *
 * Para hojas cortas de opciones en móvil usar HojaInferior; para formularios
 * y cualquier cosa que pueda crecer, este.
 */
export default {
  name: 'DialogoAdaptable',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    titulo: {
      type: String,
      required: true,
    },
    icono: {
      type: String,
      default: '',
    },
    maxWidth: {
      type: [String, Number],
      default: 640,
    },
    persistent: {
      type: Boolean,
      default: false,
    },
    cargando: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue'],
}
</script>

<style scoped>
.dialogo-adaptable__titulo {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 12px 12px 20px;
  white-space: normal;
}

.dialogo-adaptable__texto-titulo {
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.3;
}

.dialogo-adaptable__contenido {
  padding: 20px;
}

.dialogo-adaptable__acciones {
  gap: 8px;
  padding: 12px 20px;
  /* Respeta la barra de gestos del teléfono en pantalla completa */
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
