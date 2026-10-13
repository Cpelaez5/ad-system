<template>
  <v-card variant="flat" color="surface" rounded="xl" class="seccion-panel ad-move-entrada" :style="{ animationDelay: retraso }">
    <v-card-item>
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <h2 class="seccion-panel__titulo text-h6">
            <v-icon v-if="icono" :icon="icono" size="20" class="mr-1" color="secondary" />
            {{ titulo }}
          </h2>
          <p v-if="subtitulo" class="seccion-panel__subtitulo text-medium-emphasis text-body-2 mb-0">
            {{ subtitulo }}
          </p>
        </div>
        <div v-if="$slots.accion"><slot name="accion" /></div>
      </div>
    </v-card-item>
    <v-card-text class="pt-0">
      <slot />
    </v-card-text>
  </v-card>
</template>

<script>
/**
 * SeccionPanel — envoltorio delgado sobre <v-card> para una sección con
 * título (h2) + subtítulo opcional + contenido (slot por defecto) + acción
 * opcional en la cabecera (slot `accion`, ej. un botón "Ver todo"). Úsalo
 * para cualquier bloque con nombre propio de un dashboard o pantalla de
 * resumen ("Últimos 6 meses", "¿En qué gasto más?", "¿A quién le vendo
 * más?") en vez de armar un <v-card><v-card-title> a mano cada vez.
 */
export default {
  name: 'SeccionPanel',

  props: {
    titulo: { type: String, required: true },
    subtitulo: { type: String, default: '' },
    /** Ícono MDI opcional junto al título. */
    icono: { type: String, default: '' },
    /** Retraso de entrada en ms, para escalonar varias secciones en una fila. */
    retrasoMs: { type: Number, default: 0 },
  },

  computed: {
    retraso() {
      return `${this.retrasoMs}ms`
    },
  },
}
</script>

<style scoped>
.seccion-panel__titulo {
  display: flex;
  align-items: center;
  margin: 0;
}

.seccion-panel__subtitulo {
  margin-top: 2px;
}
</style>
