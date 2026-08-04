<template>
  <v-bottom-sheet v-model="internalValue" max-width="500" persistent>
    <v-card class="text-center pa-6">
      <div class="mb-4">
        <v-avatar color="success-lighten-4" size="80">
          <v-icon color="success" size="48">mdi-check-decagram</v-icon>
        </v-avatar>
      </div>
      
      <h2 class="text-h5 font-weight-bold mb-2">Compra Registrada</h2>
      <p class="text-body-1 text-grey-darken-1 mb-6">
        Se han generado exitosamente los comprobantes de retención.
      </p>

      <v-card variant="tonal" color="primary" class="mb-6 pa-4 text-left">
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="font-weight-medium">Comprobante IVA:</span>
          <span class="font-weight-bold">{{ retenciones.iva?.comprobante || 'N/A' }}</span>
        </div>
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="font-weight-medium">Comprobante ISLR:</span>
          <span class="font-weight-bold">{{ retenciones.islr?.comprobante || 'N/A' }}</span>
        </div>
        <div class="d-flex align-center justify-space-between">
          <span class="font-weight-medium">Comprobante Municipal:</span>
          <span class="font-weight-bold">{{ retenciones.municipal?.comprobante || 'N/A' }}</span>
        </div>
      </v-card>

      <div class="d-flex flex-column gap-3">
        <v-btn
          color="primary"
          size="large"
          block
          prepend-icon="mdi-share-variant"
          @click="shareReceipts"
        >
          Compartir Comprobantes
        </v-btn>
        <v-btn
          variant="outlined"
          color="primary"
          size="large"
          block
          class="mt-3"
          @click="close"
        >
          Registrar Otra Compra
        </v-btn>
        <v-btn
          variant="text"
          size="large"
          block
          class="mt-1"
          @click="goToDashboard"
        >
          Volver al Inicio
        </v-btn>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
export default {
  name: 'PurchaseSuccessSheet',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    retenciones: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'reset', 'dashboard'],
  data() {
    return {
      internalValue: this.modelValue
    }
  },
  watch: {
    modelValue(val) {
      this.internalValue = val
    },
    internalValue(val) {
      this.$emit('update:modelValue', val)
    }
  },
  methods: {
    close() {
      this.internalValue = false
      this.$emit('reset')
    },
    goToDashboard() {
      this.internalValue = false
      this.$emit('dashboard')
    },
    shareReceipts() {
      // Usar Web Share API si está disponible
      const text = `Se han emitido sus comprobantes de retención:\n` +
                   `IVA: ${this.retenciones.iva?.comprobante || 'N/A'}\n` +
                   `ISLR: ${this.retenciones.islr?.comprobante || 'N/A'}\n` +
                   `Municipal: ${this.retenciones.municipal?.comprobante || 'N/A'}`;
                   
      if (navigator.share) {
        navigator.share({
          title: 'Comprobantes de Retención',
          text: text
        }).catch(err => console.error('Error sharing:', err))
      } else {
        // Fallback: Copiar al portapapeles
        navigator.clipboard.writeText(text).then(() => {
          alert('Información copiada al portapapeles. Puede pegarla en WhatsApp u otra aplicación.')
        })
      }
    }
  }
}
</script>
