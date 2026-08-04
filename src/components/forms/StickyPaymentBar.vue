<template>
  <div class="sticky-payment-bar bg-white border-t pa-4">
    <div class="d-flex justify-space-between align-end mb-3">
      <div>
        <div class="text-caption text-grey-darken-1 mb-1">Subtotal + IVA</div>
        <div class="text-subtitle-1 font-weight-medium">{{ formatCurrency(totalFactura) }}</div>
        
        <div class="text-caption text-error mt-1" v-if="totalRetenido > 0">
          - Retenciones (Est.): {{ formatCurrency(totalRetenido) }}
        </div>
      </div>
      
      <div class="text-right">
        <div class="text-caption text-grey-darken-1 font-weight-bold mb-1">Neto a Pagar</div>
        <div class="text-h5 font-weight-black text-primary">{{ formatCurrency(netoPagar) }}</div>
      </div>
    </div>
    
    <v-btn
      color="primary"
      size="x-large"
      block
      class="font-weight-bold elevation-2"
      :disabled="disabled"
      :loading="loading"
      @click="$emit('submit')"
    >
      <v-icon left class="mr-2">mdi-check-circle</v-icon>
      Registrar Compra
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'StickyPaymentBar',
  props: {
    totalFactura: {
      type: Number,
      default: 0
    },
    totalRetenido: {
      type: Number,
      default: 0
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit'],
  computed: {
    netoPagar() {
      return Math.max(0, this.totalFactura - this.totalRetenido)
    }
  },
  methods: {
    formatCurrency(value) {
      if (!value && value !== 0) return 'Bs. 0.00'
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES'
      }).format(value)
    }
  }
}
</script>

<style scoped>
.sticky-payment-bar {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 -4px 10px rgba(0,0,0,0.05);
}
</style>
