<template>
  <v-tooltip location="bottom" text="Tasa oficial BCV de hoy">
    <template #activator="{ props: tooltipProps }">
      <v-chip
        v-bind="tooltipProps"
        :class="['chip-tasa', { 'chip-tasa--pulso': pulso }]"
        color="secondary"
        variant="flat"
        :size="size"
        :disabled="loading"
        @click="$emit('click')"
      >
        <v-icon v-if="loading" size="14" class="mr-1 chip-tasa__spin">mdi-loading</v-icon>
        <span class="chip-tasa__valor">{{ texto }}</span>
      </v-chip>
    </template>
  </v-tooltip>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney.js'

/**
 * ChipTasa — chip compacto de tasa de cambio (BCV) SIN etiqueta larga, con
 * tooltip fijo "Tasa oficial BCV de hoy" (en Configuración ya se aclara el
 * origen). Reutilizado en el app bar (escritorio/tablet, ≥600px) y en la
 * sección "Tasas del día" de la hoja "Más" del cliente en móvil.
 *
 * Reemplaza, para este caso de uso compacto, a `ExchangeRateChip` (que sigue
 * existiendo para cualquier otro lugar que necesite la etiqueta larga
 * "Dólar BCV hoy: Bs 36,50" + flecha de tendencia).
 */
export default {
  name: 'ChipTasa',

  props: {
    /** Moneda cotizada: define el símbolo mostrado ("$", "€"...). */
    currency: {
      type: String,
      required: true,
      validator: (v) => ['USD', 'EUR', 'CNY', 'TRY', 'RUB'].includes(v),
    },
    /** Valor de la tasa (bolívares por unidad de `currency`). */
    rateValue: {
      type: Number,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'small',
    },
  },

  emits: ['click'],

  data() {
    return {
      pulso: false,
    }
  },

  computed: {
    texto() {
      if (this.error) return '—'
      if (this.rateValue === null || this.rateValue === undefined) return '···'
      // "$ 36,50", "€ 39,10": símbolo de la moneda cotizada + el valor en Bs.
      return formatMoney(this.rateValue, this.currency)
    },
  },

  watch: {
    rateValue(nuevo, anterior) {
      // Pulso sutil cuando la tasa cambia (no en la primera carga ni al perderse).
      if (anterior === null || anterior === undefined) return
      if (nuevo === null || nuevo === undefined || nuevo === anterior) return
      this.pulso = false
      this.$nextTick(() => {
        this.pulso = true
        clearTimeout(this._pulsoTimeout)
        this._pulsoTimeout = setTimeout(() => {
          this.pulso = false
        }, 420)
      })
    },
  },

  beforeUnmount() {
    clearTimeout(this._pulsoTimeout)
  },
}
</script>

<style scoped>
.chip-tasa {
  font-family: 'Roboto Mono', monospace;
  font-weight: 700;
  cursor: pointer;
  transition: transform var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.chip-tasa:hover {
  transform: scale(1.05);
}

.chip-tasa--pulso {
  animation: chip-tasa-pulso 420ms var(--ad-move-curva-entrada);
}

@keyframes chip-tasa-pulso {
  0% { transform: scale(1); }
  40% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.chip-tasa__spin {
  animation: chip-tasa-spin 1s linear infinite;
}

@keyframes chip-tasa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
