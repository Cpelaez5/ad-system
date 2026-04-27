<template>
  <v-tooltip location="bottom" :text="tooltipText">
    <template v-slot:activator="{ props }">
      <v-chip
        v-bind="props"
        :color="color"
        :variant="variant"
        :size="size"
        class="bcv-chip px-4 cursor-pointer transition-all hover-scale elevation-3"
        @click="$emit('click')"
        :disabled="loading"
        :style="customStyle"
      >
        <!-- Loading State -->
        <template v-if="loading">
          <v-icon size="small" class="animate-spin mr-2">mdi-loading</v-icon>
          <span class="text-body-2">Actualizando...</span>
        </template>

        <!-- Data State -->
        <template v-else>
          <!-- Icono Moneda -->
          <v-icon size="20" class="mr-2" :class="iconClass">{{ currencyIcon }}</v-icon>

          <!-- Valor Numérico -->
          <span
            class="font-weight-bold text-subtitle-1 mr-2"
            style="font-family: 'Roboto Mono', monospace; letter-spacing: 0.5px; color: white;"
          >
            {{ displayValue }}
          </span>

          <!-- Icono de Tendencia -->
          <v-icon
            v-if="showTrend && trend"
            size="22"
            :color="trendColor"
            :icon="trendIcon"
          ></v-icon>
        </template>
      </v-chip>
    </template>

    <!-- Tooltip Content -->
    <div class="text-center" v-if="showTrend && trend">
      <div class="font-weight-bold">{{ trendTitle }}</div>
      <div class="text-caption text-grey-lighten-2 mt-1">Click para forzar actualización</div>
    </div>
    <div class="text-center" v-else>
      <div class="font-weight-bold">Tasa Oficial {{ currency }}</div>
      <div class="text-caption text-grey-lighten-2 mt-1">Click para forzar actualización</div>
    </div>
  </v-tooltip>
</template>

<script>
export default {
  name: 'ExchangeRateChip',
  props: {
    currency: {
      type: String,
      required: true,
      validator: (v) => ['USD', 'EUR'].includes(v)
    },
    rateValue: {
      type: Number,
      default: null
    },
    trend: {
      type: String,
      default: null // 'up', 'down', 'stable'
    },
    previousRate: {
      type: Number,
      default: null
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: Boolean,
      default: false
    },
    color: {
      type: String,
      default: 'secondary'
    },
    variant: {
      type: String,
      default: 'flat'
    },
    size: {
      type: String,
      default: 'default'
    },
    showTrend: {
      type: Boolean,
      default: true
    },
    iconClass: {
      type: String,
      default: 'text-accent'
    },
    customStyle: {
      type: String,
      default: 'border: 1px solid rgba(255,255,255,0.1)'
    }
  },
  emits: ['click'],
  computed: {
    currencyIcon() {
      return this.currency === 'USD' ? 'mdi-currency-usd' : 'mdi-currency-eur';
    },
    displayValue() {
      if (this.error) return 'Error';
      if (!this.rateValue) return '---';
      return this.rateValue;
    },
    trendColor() {
      if (this.trend === 'up') return 'red-accent-2';
      if (this.trend === 'down') return 'green-accent-3';
      return 'grey-lighten-1';
    },
    trendIcon() {
      if (this.trend === 'up') return 'mdi-arrow-up-bold';
      if (this.trend === 'down') return 'mdi-arrow-down-bold';
      return 'mdi-minus';
    },
    trendTitle() {
      if (!this.previousRate) return 'Calculando tendencia...';
      if (this.trend === 'up') return `Subió (Anterior: ${this.previousRate})`;
      if (this.trend === 'down') return `Bajó (Anterior: ${this.previousRate})`;
      return `Se mantiene (Anterior: ${this.previousRate})`;
    },
    tooltipText() {
      return ''; // Empty because we are using custom HTML tooltip slots
    }
  }
}
</script>

<style scoped>
.hover-scale {
  transition: all 0.3s ease;
}
.hover-scale:hover {
  transform: scale(1.05);
}
.cursor-pointer {
  cursor: pointer;
}
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
