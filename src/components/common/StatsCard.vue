<template>
  <v-card
    class="pa-6 stats-card"
    height="120"
    :style="{ backgroundColor: bgColor }"
  >
    <div class="d-flex flex-column justify-center h-100">
      <!-- Título -->
      <div class="text-body-2 mb-4" :style="{ color: textColor }">
        {{ title }}
      </div>
      
      <!-- Valor con AnimatedNumber -->
      <div class="text-h4" :style="{ color: textColor, fontSize: '2.6rem !important' }">
        <span v-if="isCurrency && !hideSymbol">{{ currencySymbol }}</span>
        <AnimatedNumber
          :value="value"
          :start="0"
          :duration="900"
          :adaptive="false"
          :min-duration="300"
          :max-duration="1000"
          easing="easeOutQuint"
          locale="es-VE"
          :minimum-fraction-digits="isCurrency ? 2 : 0"
          :maximum-fraction-digits="isCurrency ? 2 : 0"
        />
      </div>
    </div>
  </v-card>
</template>

<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

export default {
  name: 'StatsCard',
  components: {
    AnimatedNumber
  },
  props: {
    title: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    bgColor: {
      type: String,
      default: '#02254d'
    },
    textColor: {
      type: String,
      default: 'white'
    },
    isCurrency: {
      type: Boolean,
      default: false
    },
    currencySymbol: {
      type: String,
      default: '$'
    },
    hideSymbol: {
      type: Boolean,
      default: false
    },
    showCurrencyToggle: {
      type: Boolean,
      default: false
    },
    currentCurrency: {
      type: String,
      default: 'VES'
    },
    isChanging: {
      type: Boolean,
      default: false
    }
  },
  emits: ['toggle-currency']
}
</script>

<style scoped>
/* Estilos específicos para las tarjetas de estadísticas */
.stats-card {
  border-radius: 20px !important;
  box-shadow: none !important;
  padding: 20px !important;
  transition: transform 0.2s ease-in-out;
}

.stats-card:hover {
  transform: translateY(-2px);
}

.stats-card .d-flex {
  text-align: left;
  align-items: flex-start;
}

.stats-card .text-body-2 {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.25;
}

.stats-card .text-h4 {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1.2;
}
</style>
