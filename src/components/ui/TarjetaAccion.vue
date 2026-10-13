<template>
  <v-card
    class="tarjeta-accion"
    :to="to || undefined"
    :href="href || undefined"
    :disabled="deshabilitada"
    role="button"
    tabindex="0"
    :aria-label="titulo"
    @click="$emit('click', $event)"
    @keydown.enter="$emit('click', $event)"
    @keydown.space.prevent="$emit('click', $event)"
  >
    <v-card-item>
      <template #prepend>
        <v-avatar :color="color" size="48" rounded="lg">
          <v-icon :icon="icono" size="26" color="white" aria-hidden="true" />
        </v-avatar>
      </template>
      <v-card-title class="tarjeta-accion__titulo">{{ titulo }}</v-card-title>
      <v-card-subtitle v-if="subtitulo" class="tarjeta-accion__subtitulo">{{ subtitulo }}</v-card-subtitle>
      <template v-if="mostrarFlecha" #append>
        <v-icon icon="mdi-chevron-right" color="medium-emphasis" aria-hidden="true" />
      </template>
    </v-card-item>
  </v-card>
</template>

<script>
/**
 * TarjetaAccion — envoltorio delgado sobre <v-card> para los menús grandes
 * de inicio ("Vendí algo", "Gasté o compré algo", "¿Cómo voy?"). Fija:
 *   - alto táctil cómodo (72px mínimo, ver estilo scoped),
 *   - ícono en avatar de color + título + subtítulo opcional,
 *   - accesible por teclado (role="button", Enter/Espacio) además de clic/tap.
 * Usa `to`/`href` para navegación (igual que v-card) o escucha "click".
 */
export default {
  name: 'TarjetaAccion',

  props: {
    icono: {
      type: String,
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
    /** Color del avatar del ícono (token de tema: "primary", "secondary", "success"...). */
    color: {
      type: String,
      default: 'primary',
    },
    to: {
      type: [String, Object],
      default: null,
    },
    href: {
      type: String,
      default: '',
    },
    deshabilitada: {
      type: Boolean,
      default: false,
    },
    mostrarFlecha: {
      type: Boolean,
      default: true,
    },
  },

  emits: ['click'],
}
</script>

<style scoped>
.tarjeta-accion {
  min-height: 72px;
  cursor: pointer;
  transition: transform 160ms ease-out, box-shadow 160ms ease-out;
}

.tarjeta-accion:focus-visible {
  outline: 3px solid #2A2A2E;
  outline-offset: 2px;
}

.tarjeta-accion:active {
  transform: scale(0.98);
}

.tarjeta-accion__titulo {
  font-size: 1.0625rem;
  font-weight: 600;
  white-space: normal;
}

.tarjeta-accion__subtitulo {
  font-size: 0.875rem;
  opacity: 0.8;
}

@media (prefers-reduced-motion: reduce) {
  .tarjeta-accion {
    transition: none;
  }
  .tarjeta-accion:active {
    transform: none;
  }
}
</style>
