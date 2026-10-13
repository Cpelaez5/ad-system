<template>
  <v-card variant="flat" color="surface" class="resumen-monto">
    <v-card-item>
      <p class="resumen-monto__etiqueta text-medium-emphasis">{{ etiqueta }}</p>
      <p class="resumen-monto__monto" :class="`text-${color}`">
        <AnimatedNumber v-if="animar" :value="monto" :duration="600" :formatter="formatearAnimado" />
        <template v-else>{{ montoFormateado }}</template>
      </p>
      <p v-if="montoBs !== null" class="resumen-monto__bs text-medium-emphasis">
        {{ bsFormateado }}
      </p>
      <slot />
    </v-card-item>
  </v-card>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

/**
 * ResumenMonto — envoltorio delgado sobre <v-card> para mostrar un monto
 * destacado con su etiqueta y, debajo, el equivalente pequeño en bolívares.
 * Usa formatMoney (src/utils/formatMoney.js) para el formato venezolano
 * (miles con punto, decimales con coma). No reimplementa formato de moneda.
 * Admite contenido extra (ej. una comparación con flecha) a través del slot
 * por defecto, debajo del monto en bolívares — ver `TarjetaKPI`, que lo
 * extiende para el dashboard del cliente en vez de duplicar el formato.
 *
 * Con `animar` en true, el monto grande cuenta con `AnimatedNumber` (ya
 * respeta `prefers-reduced-motion` por su cuenta) en vez de pintarse
 * estático. Solo tiene sentido porque `monto` ya es un Number, nunca un
 * string pre-formateado.
 */
export default {
  name: 'ResumenMonto',

  components: { AnimatedNumber },

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
    /** Si es true, el monto cuenta con AnimatedNumber en vez de pintarse fijo. */
    animar: {
      type: Boolean,
      default: false,
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

  methods: {
    formatearAnimado(valor) {
      return formatMoney(valor, this.moneda)
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
