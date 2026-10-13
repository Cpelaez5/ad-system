<template>
  <v-empty-state
    :icon="icono"
    :title="titulo"
    :text="mensaje"
    :action-text="textoAccion"
    color="secondary"
    @click:action="$emit('accion')"
  />
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
  },

  emits: ['accion'],
}
</script>
