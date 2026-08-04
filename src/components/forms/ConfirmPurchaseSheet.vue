<template>
  <v-bottom-sheet v-model="internalValue" max-width="500">
    <v-card>
      <v-card-text class="text-center pa-6">
        <v-icon color="warning" size="64" class="mb-4">mdi-alert-circle-outline</v-icon>
        <h2 class="text-h6 font-weight-bold mb-2">¿Confirmar Registro?</h2>
        <p class="text-body-2 text-grey-darken-1 mb-6">
          Se generarán los comprobantes de retención fiscales de forma irreversible. Verifica que los montos sean correctos antes de continuar.
        </p>

        <div class="d-flex flex-column gap-3">
          <v-btn
            color="primary"
            size="large"
            block
            :loading="loading"
            @click="confirm"
          >
            Sí, registrar compra
          </v-btn>
          <v-btn
            variant="text"
            size="large"
            block
            :disabled="loading"
            @click="close"
            class="mt-2"
          >
            Revisar de nuevo
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
export default {
  name: 'ConfirmPurchaseSheet',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'confirm'],
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
      if (!this.loading) {
        this.internalValue = false
      }
    },
    confirm() {
      this.$emit('confirm')
    }
  }
}
</script>
