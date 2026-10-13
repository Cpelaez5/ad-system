<template>
  <v-card variant="flat" color="surface" class="resumen-monto">
    <v-card-item>
      <p class="resumen-monto__etiqueta text-medium-emphasis">{{ etiqueta }}</p>
      <p class="resumen-monto__monto" :class="`text-${color}`">
        {{ montoFormateado }}
      </p>
      <p v-if="montoBs !== null" class="resumen-monto__bs text-medium-emphasis">
        {{ bsFormateado }}
      </p>
    </v-card-item>
  </v-card>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney'

/**
 * ResumenMonto — envoltorio delgado sobre <v-card> para mostrar un monto
 * destacado con su etiqueta y, debajo, el equivalente pequeño en bolívares.
 * Usa formatMoney (src/utils/formatMoney.js) para el formato venezolano
 * (miles con punto, decimales con coma). No reimplementa formato de moneda.
 */
export default {
  name: 'ResumenMonto',

  props: {
    etiqueta: {
      type: String,
      required: true,
    },
    monto: {
      type: Number,
      required: true,
    },
    moneda: {
      type: String,
      default: 'USD',
    },
    /** Equivalente en bolívares. Si es null, no se muestra la línea pequeña. */
    montoBs: {
      type: Number,
      default: null,
    },
    /** Token de color del tema para el monto grande (ej. "primary", "success", "error"). */
    color: {
      type: String,
      default: 'primary',
    },
  },

  computed: {
    montoFormateado() {
      return formatMoney(this.monto, this.moneda)
    },
    bsFormateado() {
      if (this.montoBs === null) return ''
      return formatMoney(this.montoBs, 'VES', { abreviar: this.montoBs >= 1000000 })
    },
  },
}
</script>

<style scoped>
.resumen-monto__etiqueta {
  font-size: 0.875rem;
  margin: 0 0 4px 0;
}

.resumen-monto__monto {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  font-size: 2rem;
  line-height: 1.2;
  margin: 0;
}

.resumen-monto__bs {
  font-size: 0.875rem;
  margin: 4px 0 0 0;
}
</style>
