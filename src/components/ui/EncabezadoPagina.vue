<template>
  <div class="encabezado-pagina">
    <div class="encabezado-pagina__texto">
      <h1 ref="h1" class="encabezado-pagina__titulo">{{ titulo }}</h1>
      <p v-if="subtitulo" class="encabezado-pagina__subtitulo">{{ subtitulo }}</p>
    </div>
    <div v-if="$slots.default" class="encabezado-pagina__acciones">
      <slot />
    </div>
  </div>
</template>

<script>
import { observarTitulo } from '@/composables/useTituloEnVista'

/**
 * EncabezadoPagina — título h1 + subtítulo opcional + slot de acciones a la
 * derecha, para usar DENTRO del contenido de cada vista (no es parte del
 * shell: el app bar ya muestra el título de la ruta; este encabezado es el
 * título "editorial" de la pantalla, con el estándar tipográfico de
 * docs/mvp/diseno/sistema-diseno.md §2.5 — H1 32px móvil/40px escritorio).
 *
 * Responsive: en móvil el título y las acciones se apilan (ancho completo);
 * en escritorio (≥600px) las acciones quedan a la derecha del título.
 */
export default {
  name: 'EncabezadoPagina',

  props: {
    titulo: {
      type: String,
      required: true,
    },
    subtitulo: {
      type: String,
      default: '',
    },
  },

  // Mientras este h1 se ve, la barra superior no repite el título (useTituloEnVista).
  mounted() {
    this.dejarDeObservar = observarTitulo(this.$refs.h1)
  },

  beforeUnmount() {
    this.dejarDeObservar?.()
  },
}
</script>

<style scoped>
.encabezado-pagina {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: var(--spacing-lg, 24px);
}

.encabezado-pagina__titulo {
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  font-size: 2rem; /* 32px móvil */
  line-height: 1.2;
  margin: 0;
}

.encabezado-pagina__subtitulo {
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
  margin: 4px 0 0;
}

.encabezado-pagina__acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (min-width: 600px) {
  .encabezado-pagina {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .encabezado-pagina__titulo {
    font-size: 2.5rem; /* 40px escritorio */
  }

  .encabezado-pagina__acciones {
    flex-shrink: 0;
  }
}
</style>
