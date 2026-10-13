<template>
  <v-alert
    :type="tipoVuetify"
    :icon="icono || undefined"
    variant="tonal"
    density="comfortable"
    :closable="cerrable"
    :title="titulo || undefined"
    role="status"
    @click:close="$emit('cerrar')"
  >
    {{ mensaje }}
    <template v-if="textoAccion" #append>
      <v-btn variant="text" size="small" :color="colorBoton" @click="$emit('accion')">
        {{ textoAccion }}
      </v-btn>
    </template>
  </v-alert>
</template>

<script>
/**
 * AvisoAmable — envoltorio delgado sobre <v-alert> para mensajes en
 * lenguaje llano (info / advertencia / error) con una acción opcional.
 * El contraste del texto de "advertencia" (dorado) se corrige a nivel de
 * tokens globales en src/styles/vuetify-overrides.css (el dorado nunca se
 * usa como color de texto, solo de ícono/fondo) — este componente no hace
 * ningún ajuste de color a mano.
 */
export default {
  name: 'AvisoAmable',

  props: {
    tipo: {
      type: String,
      default: 'info',
      validator: (v) => ['info', 'advertencia', 'error'].includes(v),
    },
    titulo: {
      type: String,
      default: '',
    },
    mensaje: {
      type: String,
      required: true,
    },
    icono: {
      type: String,
      default: '',
    },
    textoAccion: {
      type: String,
      default: '',
    },
    cerrable: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['accion', 'cerrar'],

  computed: {
    tipoVuetify() {
      // v-alert acepta 'success' | 'info' | 'warning' | 'error'.
      return this.tipo === 'advertencia' ? 'warning' : this.tipo;
    },
    colorBoton() {
      return this.tipoVuetify === 'warning' ? 'secondary' : this.tipoVuetify;
    },
  },
}
</script>
