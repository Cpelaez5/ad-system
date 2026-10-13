<template>
  <div v-if="terminoValido" class="d-inline-flex align-center">
    <!-- Móvil: v-bottom-sheet -->
    <v-bottom-sheet v-if="$vuetify.display.mobile" v-model="isOpen">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          variant="text"
          icon="mdi-help-circle-outline"
          size="small"
          :aria-label="'Qué significa ' + terminoData.termino"
          class="ayuda-termino-btn"
        ></v-btn>
      </template>
      <v-card class="rounded-t-xl pb-4">
        <v-card-text class="pt-6">
          <div class="text-body-1 font-weight-bold mb-2">{{ terminoData.simple }}</div>
          <div class="text-body-2 mb-2">{{ terminoData.explicacion }}</div>
          <div v-if="terminoData.ejemplo" class="text-caption text-grey-darken-1 mb-3">Ejemplo: {{ terminoData.ejemplo }}</div>
          <div class="text-caption text-grey mt-4">Término oficial: {{ terminoData.termino }}</div>
        </v-card-text>
      </v-card>
    </v-bottom-sheet>

    <!-- Escritorio: v-menu -->
    <v-menu v-else v-model="isOpen" :close-on-content-click="false" location="top" open-on-click max-width="320">
      <template v-slot:activator="{ props }">
        <v-btn
          v-bind="props"
          variant="text"
          icon="mdi-help-circle-outline"
          size="small"
          :aria-label="'Qué significa ' + terminoData.termino"
          class="ayuda-termino-btn"
        ></v-btn>
      </template>
      <v-card class="pa-4 rounded-xl">
        <div class="text-body-1 font-weight-bold mb-2">{{ terminoData.simple }}</div>
        <div class="text-body-2 mb-2">{{ terminoData.explicacion }}</div>
        <div v-if="terminoData.ejemplo" class="text-caption text-grey-darken-1 mb-3">Ejemplo: {{ terminoData.ejemplo }}</div>
        <div class="text-caption text-grey mt-4">Término oficial: {{ terminoData.termino }}</div>
      </v-card>
    </v-menu>
  </div>
</template>

<script>
import GLOSARIO from '@/constants/glosario.js';

/**
 * Componente que muestra una ayuda en línea para términos contables/fiscales.
 * @prop {string} clave - La clave del término en el glosario (ej: 'iva').
 */
export default {
  name: 'AyudaTermino',
  props: {
    clave: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isOpen: false
    };
  },
  computed: {
    terminoData() {
      return GLOSARIO[this.clave];
    },
    terminoValido() {
      return !!this.terminoData;
    }
  }
};
</script>

<style scoped>
.ayuda-termino-btn {
  /* Área táctil mínima de 44px según sistema de diseño */
  min-width: 44px !important;
  min-height: 44px !important;
}
</style>
