<template>
  <div
    class="fila-lista"
    :class="{ 'fila-lista--clicable': clicable }"
    :role="clicable ? 'button' : undefined"
    :tabindex="clicable ? 0 : undefined"
    :aria-label="clicable ? titulo : undefined"
    @click="clicable && $emit('click', $event)"
    @keydown.enter="clicable && $emit('click', $event)"
    @keydown.space.prevent="clicable && $emit('click', $event)"
  >
    <v-avatar v-if="icono" :color="colorIcono" size="40" class="mr-3 flex-shrink-0">
      <v-icon :icon="icono" size="20" color="white" aria-hidden="true" />
    </v-avatar>

    <div class="fila-lista__texto">
      <div class="fila-lista__titulo">{{ titulo }}</div>
      <div v-if="subtitulo" class="fila-lista__subtitulo">{{ subtitulo }}</div>
    </div>

    <div v-if="valor || estado" class="fila-lista__derecha">
      <div v-if="valor" class="fila-lista__valor">{{ valor }}</div>
      <div v-if="valorSecundario" class="fila-lista__valor-secundario">{{ valorSecundario }}</div>
      <v-chip v-if="estado" size="small" :color="colorEstado" variant="flat" class="mt-1">
        {{ estado }}
      </v-chip>
    </div>

    <div v-if="$slots.acciones" class="fila-lista__acciones" @click.stop>
      <slot name="acciones" />
    </div>
  </div>
</template>

<script>
/**
 * FilaLista — fila de lista genérica para mostrar en móvil (xs) en vez de una
 * tabla: título + subtítulo a la izquierda, valor + chip de estado a la
 * derecha, y un slot de acciones (botones icon) al final. Pensado para
 * directorios y listados simples (proveedores, productos, facturas del
 * plan...) que en escritorio siguen usando <v-data-table>/<v-table>.
 *
 * Para movimientos de dinero (ventas, compras, gastos) usa `FilaMovimiento`
 * en su lugar — no dupliques ese caso con este componente.
 */
export default {
  name: 'FilaLista',

  props: {
    titulo: {
      type: String,
      required: true,
    },
    subtitulo: {
      type: String,
      default: '',
    },
    /** Texto ya formateado (ej. con formatMoney) a mostrar a la derecha. */
    valor: {
      type: String,
      default: '',
    },
    /** Línea pequeña opcional debajo de `valor` (ej. equivalente en otra moneda). */
    valorSecundario: {
      type: String,
      default: '',
    },
    /** Texto del chip de estado (ej. "Stock bajo", "Vencido"). Vacío = sin chip. */
    estado: {
      type: String,
      default: '',
    },
    colorEstado: {
      type: String,
      default: 'secondary',
    },
    /** Ícono MDI opcional en un avatar a la izquierda. */
    icono: {
      type: String,
      default: '',
    },
    colorIcono: {
      type: String,
      default: 'primary',
    },
    /** Si true, toda la fila es tocable (role="button", Enter/Espacio, emite "click"). */
    clicable: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['click'],
}
</script>

<style scoped>
.fila-lista {
  display: flex;
  align-items: center;
  min-height: 72px;
  padding: 10px 12px;
  gap: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.fila-lista:last-child {
  border-bottom: none;
}

.fila-lista--clicable {
  cursor: pointer;
  transition: transform 160ms ease-out, background-color 160ms ease-out;
}

.fila-lista--clicable:active {
  transform: scale(0.99);
  background-color: rgba(0, 0, 0, 0.02);
}

.fila-lista--clicable:focus-visible {
  outline: 3px solid #1F355C;
  outline-offset: -2px;
}

.fila-lista__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.fila-lista__titulo {
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fila-lista__subtitulo {
  font-size: 0.8125rem;
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fila-lista__derecha {
  flex: 0 0 auto;
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.fila-lista__valor {
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
}

.fila-lista__valor-secundario {
  font-size: 0.75rem;
  opacity: 0.7;
  white-space: nowrap;
}

.fila-lista__acciones {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

@media (prefers-reduced-motion: reduce) {
  .fila-lista--clicable {
    transition: none;
  }
  .fila-lista--clicable:active {
    transform: none;
  }
}
</style>
