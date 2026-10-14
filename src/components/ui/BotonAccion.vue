<template>
  <v-btn
    :type="type"
    :variant="varianteVuetify"
    :color="colorVuetify"
    :loading="cargando"
    :disabled="deshabilitado"
    :block="ancho === 'completo'"
    :min-height="alturaMinima"
    :prepend-icon="icono && !iconoAlFinal ? icono : undefined"
    :append-icon="icono && iconoAlFinal ? icono : undefined"
    :aria-label="ariaLabel || texto"
    class="boton-accion"
    :class="`boton-accion--${tamano}`"
    @click="$emit('click', $event)"
  >
    {{ texto }}
  </v-btn>
</template>

<script>
/**
 * BotonAccion — envoltorio delgado sobre <v-btn> que fija el estándar de
 * botones de AD System (ver docs/mvp/diseno/sistema-diseno.md §Botones):
 *   - variante "primaria": acción principal, relleno granate, texto blanco.
 *   - variante "secundaria": acción alternativa, contorno granate.
 *   - variante "terciaria": acción de bajo énfasis, solo texto.
 *   - variante "destructiva": SIEMPRE contorno (nunca relleno) en rojo de
 *     error — la pantalla que la usa debe pedir confirmación antes de
 *     ejecutar la acción (ver doc).
 *   - tamano "principal": alto mínimo 56px (acción principal de la pantalla).
 *   - tamano "normal": alto mínimo 48px (resto de botones táctiles).
 * No añade markup propio más allá de <v-btn>: solo decide variant/color/size.
 */
export default {
  name: 'BotonAccion',

  props: {
    /** Texto visible del botón. También se usa como aria-label por defecto. */
    texto: {
      type: String,
      required: true,
    },
    /** Ícono MDI (ej. "mdi-cart-outline"). Opcional. */
    icono: {
      type: String,
      default: '',
    },
    /** Si true, el ícono se dibuja después del texto en vez de antes. */
    iconoAlFinal: {
      type: Boolean,
      default: false,
    },
    variante: {
      type: String,
      default: 'primaria',
      validator: (v) => ['primaria', 'secundaria', 'terciaria', 'destructiva'].includes(v),
    },
    /** "principal" = 56px (la acción más importante de la pantalla). "normal" = 48px. */
    tamano: {
      type: String,
      default: 'normal',
      validator: (v) => ['principal', 'normal'].includes(v),
    },
    ancho: {
      type: String,
      default: 'completo',
      validator: (v) => ['completo', 'auto'].includes(v),
    },
    cargando: {
      type: Boolean,
      default: false,
    },
    deshabilitado: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'button',
    },
    ariaLabel: {
      type: String,
      default: '',
    },
  },

  emits: ['click'],

  computed: {
    varianteVuetify() {
      if (this.variante === 'primaria') return 'flat';
      if (this.variante === 'secundaria') return 'outlined';
      if (this.variante === 'terciaria') return 'text';
      // 'destructiva' siempre outlined: una acción que borra o anula algo
      // nunca debe verse como el botón "normal" de la pantalla.
      return 'outlined';
    },
    colorVuetify() {
      if (this.variante === 'destructiva') return 'error';
      if (this.variante === 'primaria' || this.variante === 'secundaria') return 'primary';
      return 'secondary';
    },
    alturaMinima() {
      return this.tamano === 'principal' ? 56 : 48;
    },
  },
}
</script>

<style scoped>
.boton-accion {
  font-size: 16px;
  transition: transform 150ms ease-out;
}

.boton-accion--principal {
  font-weight: 600;
  font-size: 1.0625rem;
}

/* Feedback táctil: el botón se "hunde" un poco al presionar (igual que
   TarjetaAccion), para que quede claro que el toque se registró. */
.boton-accion:active {
  transform: scale(0.98);
}

/* Foco visible en navegación por teclado (no en click/touch). */
.boton-accion:focus-visible {
  outline: 3px solid #2A2A2E;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .boton-accion {
    transition: none;
  }
  .boton-accion:active {
    transform: none;
  }
}
</style>
