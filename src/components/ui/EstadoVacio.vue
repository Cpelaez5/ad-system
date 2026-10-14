<template>
  <div class="estado-vacio">
    <v-empty-state
      :icon="icono"
      :title="titulo"
      :text="mensaje"
      :action-text="textoAccion"
      color="secondary"
      @click:action="$emit('accion')"
    />
    <!-- Segunda salida opcional (ej. "Agregar producto" + "Subir lista de Excel"):
         v-empty-state solo admite un botón, así que la segunda acción va debajo,
         en bajo énfasis para no competir con la principal. -->
    <div v-if="textoAccionSecundaria" class="estado-vacio__secundaria">
      <v-btn
        variant="text"
        color="secondary"
        class="text-none"
        :prepend-icon="iconoAccionSecundaria || undefined"
        @click="$emit('accionSecundaria')"
      >
        {{ textoAccionSecundaria }}
      </v-btn>
    </div>
  </div>
</template>

<script>
/**
 * EstadoVacio — envoltorio delgado sobre <v-empty-state> (nativo de Vuetify
 * 3.5+) con props en español para las pantallas "todavía no tienes nada
 * aquí" (sin movimientos, sin proveedores, sin documentos...). Úsalo en vez
 * de armar un ícono + texto + botón a mano.
 */
export default {
  name: 'EstadoVacio',

  props: {
    icono: {
      type: String,
      default: 'mdi-text-box-search-outline',
    },
    titulo: {
      type: String,
      required: true,
    },
    mensaje: {
      type: String,
      default: '',
    },
    /** Texto del botón de acción. Si está vacío, v-empty-state no muestra botón. */
    textoAccion: {
      type: String,
      default: '',
    },
    /** Texto de una segunda salida opcional (bajo énfasis), ej. "Subir lista de Excel". */
    textoAccionSecundaria: {
      type: String,
      default: '',
    },
    iconoAccionSecundaria: {
      type: String,
      default: '',
    },
  },

  emits: ['accion', 'accionSecundaria'],
}
</script>

<style scoped>
.estado-vacio__secundaria {
  display: flex;
  justify-content: center;
  margin-top: -8px;
}
</style>
