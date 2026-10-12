<template>
  <div class="paso-guiado" role="group" :aria-label="`Paso ${pasoActual} de ${totalPasos}`">
    <p class="paso-guiado__contador text-medium-emphasis">Paso {{ pasoActual }} de {{ totalPasos }}</p>
    <v-progress-linear
      :model-value="(pasoActual / totalPasos) * 100"
      color="primary"
      bg-color="metal"
      height="6"
      rounded
      aria-hidden="true"
    />
    <h2 class="paso-guiado__titulo">{{ titulo }}</h2>
    <p v-if="subtitulo" class="paso-guiado__subtitulo text-medium-emphasis">{{ subtitulo }}</p>
  </div>
</template>

<script>
/**
 * PasoGuiado — envoltorio delgado sobre <v-progress-linear> + un título,
 * usado como cabecera de los flujos tipo asistente ("Paso 1 de 3"). No es
 * un v-stepper completo a propósito: en móvil solo necesitamos la cabecera,
 * no un panel por paso.
 */
export default {
  name: 'PasoGuiado',

  props: {
    pasoActual: {
      type: Number,
      required: true,
    },
    totalPasos: {
      type: Number,
      required: true,
    },
    titulo: {
      type: String,
      required: true,
    },
    subtitulo: {
      type: String,
      default: '',
    },
  },
}
</script>

<style scoped>
.paso-guiado__contador {
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 8px 0;
}

.paso-guiado__titulo {
  margin: 12px 0 4px 0;
  font-size: 1.375rem;
}

.paso-guiado__subtitulo {
  font-size: 0.9375rem;
  margin: 0;
}
</style>
