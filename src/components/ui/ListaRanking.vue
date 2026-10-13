<template>
  <div class="lista-ranking">
    <p v-if="items.length === 0" class="text-medium-emphasis text-body-2 mb-0">
      {{ vacioTexto }}
    </p>
    <div
      v-for="(item, i) in items"
      :key="item.nombre + '-' + i"
      class="lista-ranking__item ad-move-entrada"
      :style="{ animationDelay: `${i * ESCALON_LISTA_MS}ms` }"
      :class="{ 'mb-3': i < items.length - 1 }"
    >
      <div class="d-flex justify-space-between mb-1 ga-2">
        <span class="text-body-2 lista-ranking__nombre">{{ item.nombre }}</span>
        <span class="text-body-2 font-weight-medium lista-ranking__monto">{{ formatMoney(item.monto, moneda) }}</span>
      </div>
      <v-progress-linear
        :model-value="crecida ? porcentajeRelativo(item) : 0"
        :color="color"
        bg-color="rgba(0,0,0,0.06)"
        height="8"
        rounded
      />
    </div>
  </div>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney'
import { ESCALON_LISTA_MS } from './movimiento.js'

/**
 * ListaRanking — top N (categorías de gasto, clientes...) como lista con
 * nombre, monto (formatMoney) y una barra horizontal relativa al primer
 * ítem (que siempre es el más grande: ordena `items` antes de pasarlo).
 * Las barras crecen desde 0 al aparecer y cada ítem entra con un pequeño
 * escalón (ver `movimiento.js`) en vez de aparecer todos de golpe.
 *
 * `items`: Array<{ nombre: String, monto: Number }>, ya ordenado
 * descendente por el llamador (ej. `topCategorias`/`topClientes` de
 * `src/utils/resumenFinanciero.js`).
 */
export default {
  name: 'ListaRanking',

  props: {
    items: { type: Array, required: true },
    /** Color del token de tema para la barra (ej. "error", "secondary"). */
    color: { type: String, default: 'primary' },
    moneda: { type: String, default: 'USD' },
    /** Texto cuando no hay ítems en el período. */
    vacioTexto: { type: String, default: 'Sin datos en este período.' },
  },

  data() {
    return {
      crecida: false,
      ESCALON_LISTA_MS,
    }
  },

  watch: {
    items() {
      this.reiniciarCrecimiento()
    },
  },

  mounted() {
    this.reiniciarCrecimiento()
  },

  methods: {
    formatMoney,
    porcentajeRelativo(item) {
      const max = this.items[0]?.monto || 0
      if (max <= 0) return 0
      return Math.min(100, (item.monto / max) * 100)
    },
    reiniciarCrecimiento() {
      this.crecida = false
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          this.crecida = true
        })
      })
    },
  },
}
</script>

<style scoped>
.lista-ranking__nombre {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lista-ranking__monto {
  flex-shrink: 0;
}
</style>
