<template>
  <v-tooltip location="bottom" :text="tituloTooltip">
    <template #activator="{ props: tooltipProps }">
      <v-chip
        v-bind="tooltipProps"
        :class="['chip-tasa', { 'chip-tasa--pulso': pulso }]"
        :color="aviso ? 'warning' : 'secondary'"
        variant="flat"
        :size="size"
        :disabled="loading"
        :aria-label="ariaLabel"
        @click="$emit('click')"
      >
        <v-icon v-if="loading" size="14" class="mr-1 chip-tasa__spin">mdi-loading</v-icon>
        <span class="chip-tasa__valor" aria-hidden="true">{{ texto }}</span>
        <span v-if="manual" class="chip-tasa__marca" aria-hidden="true">Manual</span>
      </v-chip>
    </template>
  </v-tooltip>
</template>

<script>
import { formatTasa } from '@/utils/formatMoney.js'

/** Nombre llano de cada moneda cotizada, para el tooltip y el aria-label. */
const NOMBRE_MONEDA = {
  USD: 'dólar',
  EUR: 'euro',
  CNY: 'yuan',
  TRY: 'lira turca',
  RUB: 'rublo',
}

/**
 * ChipTasa — chip compacto de tasa de cambio (BCV) SIN etiqueta larga.
 * Reutilizado en el app bar (escritorio/tablet, ≥600px) y en la sección
 * "Tasas del día" de la hoja "Más" del cliente en móvil.
 *
 * Reemplaza, para este caso de uso compacto, a `ExchangeRateChip` (que sigue
 * existiendo para cualquier otro lugar que necesite la etiqueta larga
 * "Dólar BCV hoy: Bs 36,50" + flecha de tendencia).
 *
 * Corrección (revisión del shell, hallazgo #3 Importante): el valor SIEMPRE
 * son bolívares por unidad de `currency` — nunca se formatea con el símbolo
 * de esa moneda (`formatMoney(rate, 'USD')` mostraba "$ 36,50", como si 36,50
 * fueran dólares). Se usa `formatTasa` (siempre "Bs ...", igual que
 * `HojaMas.vue`) precedido del código de moneda ("USD Bs 36,50"), y un
 * `aria-label` descriptivo porque el texto visible no alcanza por sí solo
 * para un lector de pantalla.
 */
export default {
  name: 'ChipTasa',

  props: {
    /** Moneda cotizada: USD/EUR/CNY/TRY/RUB (el valor mostrado siempre es en bolívares). */
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
    /** La tasa la definió el cliente (muestra la marca "Manual"). */
    manual: {
      type: Boolean,
      default: false,
    },
    /** Se ve en ámbar: la tasa está desactualizada o la automática falló. */
    aviso: {
      type: Boolean,
      default: false,
    },
    /** Frase extra para el tooltip y el lector de pantalla (p. ej. "Es del 10/10"). */
    nota: {
      type: String,
      default: '',
    },
  },

  emits: ['click'],

  data() {
    return {
      pulso: false,
    }
  },

  computed: {
    nombreMoneda() {
      return NOMBRE_MONEDA[this.currency] || this.currency
    },
    texto() {
      if (this.error) return '—'
      if (this.rateValue === null || this.rateValue === undefined) return '···'
      // "USD Bs 36,50", "EUR Bs 39,10": código de la moneda cotizada + el
      // valor en bolívares (siempre con `formatTasa`, nunca el símbolo de
      // la moneda cotizada — esto NO son dólares/euros, son bolívares).
      return `${this.currency} ${formatTasa(this.rateValue)}`
    },
    origen() {
      return this.manual ? `Tu tasa del ${this.nombreMoneda}` : `Tasa oficial BCV del ${this.nombreMoneda}`
    },
    tituloTooltip() {
      return [this.origen, this.nota].filter(Boolean).join('. ')
    },
    ariaLabel() {
      if (this.error) return `${this.origen}: no disponible. Pulsa para reintentar.`
      if (this.rateValue === null || this.rateValue === undefined) {
        return `${this.origen}: cargando.`
      }
      const accion = this.manual || this.aviso ? 'Pulsa para cambiarla en Mi negocio.' : 'Pulsa para actualizar.'
      return [`${this.origen}: ${formatTasa(this.rateValue)}.`, this.nota ? `${this.nota}.` : '', accion].filter(Boolean).join(' ')
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

.chip-tasa__marca {
  margin-left: 6px;
  padding-left: 6px;
  border-left: 1px solid currentColor;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.chip-tasa__spin {
  animation: chip-tasa-spin 1s linear infinite;
}

@keyframes chip-tasa-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
