<template>
  <v-chip-group
    :model-value="modelValue"
    mandatory
    color="primary"
    filter
    class="selector-periodo"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-chip
      v-for="opcion in OPCIONES"
      :key="opcion.value"
      :value="opcion.value"
      variant="outlined"
      class="selector-periodo__chip ad-move-press"
      filter
    >
      {{ opcion.titulo }}
    </v-chip>
  </v-chip-group>
</template>

<script>
/**
 * SelectorPeriodo — envoltorio delgado sobre <v-chip-group> para elegir
 * "Este mes" / "Mes pasado" / "Este año" con v-model (string). Las tres
 * opciones son fijas a propósito: es el único período que entiende la
 * pantalla "¿Cómo voy?" del cliente (ver docs/mvp/PLAN-MVP.md §2).
 * Combina con `src/utils/resumenFinanciero.js` (`obtenerRangoPeriodo`),
 * que acepta los mismos tres valores.
 */
const OPCIONES = [
  { value: 'este_mes', titulo: 'Este mes' },
  { value: 'mes_pasado', titulo: 'Mes pasado' },
  { value: 'este_anio', titulo: 'Este año' },
]

export default {
  name: 'SelectorPeriodo',

  props: {
    modelValue: {
      type: String,
      default: 'este_mes',
      validator: (v) => ['este_mes', 'mes_pasado', 'este_anio'].includes(v),
    },
  },

  emits: ['update:modelValue'],

  data() {
    return { OPCIONES }
  },
}
</script>

<style scoped>
.selector-periodo {
  gap: 8px;
}

.selector-periodo__chip {
  font-size: 0.9375rem;
  min-height: 40px;
}

/* El feedback de presión (.ad-move-press, ver animations.css) ya cubre el
   :active; aquí solo evitamos que el toque quede por debajo de 40px en la
   fuente de tamaño "small" que usa Vuetify para v-chip por defecto. */
</style>
