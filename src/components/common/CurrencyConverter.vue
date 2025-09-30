<template>
  <v-card variant="outlined" class="currency-converter">
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-currency-usd</v-icon>
      Conversor de Monedas (BCV)
    </v-card-title>
    
    <v-card-text>
      <!-- Tasa actual del BCV -->
      <div class="mb-4">
        <BCVRateDisplay />
      </div>
      
      <v-row>
        <!-- Monto en USD -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="usdAmount"
            label="Monto en USD"
            type="number"
            variant="outlined"
            prepend-inner-icon="mdi-currency-usd"
            :rules="[v => v >= 0 || 'El monto debe ser positivo']"
            @input="convertUSDToVES"
            :loading="converting"
          ></v-text-field>
        </v-col>
        
        <!-- Monto en VES -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="vesAmount"
            label="Monto en VES"
            type="number"
            variant="outlined"
            prepend-inner-icon="mdi-currency-ves"
            :rules="[v => v >= 0 || 'El monto debe ser positivo']"
            @input="convertVESToUSD"
            :loading="converting"
          ></v-text-field>
        </v-col>
      </v-row>
      
      <!-- Información de conversión -->
      <v-alert
        v-if="conversionInfo"
        :type="conversionInfo.success ? 'success' : 'error'"
        variant="tonal"
        class="mt-3"
      >
        <div v-if="conversionInfo.success">
          <strong>Tasa utilizada:</strong> {{ formatRate(conversionInfo.data.rate) }}<br>
          <strong>Fecha:</strong> {{ formatDate(conversionInfo.data.date) }}<br>
          <strong>Fuente:</strong> {{ conversionInfo.data.source }}
        </div>
        <div v-else>
          <strong>Error:</strong> {{ conversionInfo.error }}
        </div>
      </v-alert>
      
      <!-- Botones de acción -->
      <div class="d-flex justify-space-between mt-4">
        <v-btn
          color="primary"
          variant="outlined"
          @click="clearFields"
          :disabled="converting"
        >
          <v-icon left>mdi-refresh</v-icon>
          Limpiar
        </v-btn>
        
        <v-btn
          color="primary"
          @click="useVESAmount"
          :disabled="!vesAmount || converting"
        >
          <v-icon left>mdi-check</v-icon>
          Usar Monto VES
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import { bcvService } from '../../services/bcvService.js';
import BCVRateDisplay from './BCVRateDisplay.vue';

export default {
  name: 'CurrencyConverter',
  components: {
    BCVRateDisplay
  },
  props: {
    modelValue: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'VES'
    }
  },
  emits: ['update:modelValue', 'currency-change'],
  data() {
    return {
      usdAmount: 0,
      vesAmount: 0,
      converting: false,
      conversionInfo: null
    };
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(newValue) {
        if (newValue && this.currency === 'VES') {
          this.vesAmount = newValue;
          this.convertVESToUSD();
        } else if (newValue && this.currency === 'USD') {
          this.usdAmount = newValue;
          this.convertUSDToVES();
        }
      }
    }
  },
  methods: {
    async convertUSDToVES() {
      if (!this.usdAmount || this.usdAmount <= 0) {
        this.vesAmount = 0;
        this.conversionInfo = null;
        return;
      }
      
      try {
        this.converting = true;
        const response = await bcvService.convertUSDToVES(this.usdAmount);
        
        if (response.success) {
          this.vesAmount = response.data.vesAmount;
          this.conversionInfo = response;
          this.$emit('update:modelValue', this.vesAmount);
          this.$emit('currency-change', { amount: this.vesAmount, currency: 'VES' });
        } else {
          this.conversionInfo = response;
        }
      } catch (error) {
        console.error('Error en conversión USD a VES:', error);
        this.conversionInfo = {
          success: false,
          error: error.message
        };
      } finally {
        this.converting = false;
      }
    },
    
    async convertVESToUSD() {
      if (!this.vesAmount || this.vesAmount <= 0) {
        this.usdAmount = 0;
        this.conversionInfo = null;
        return;
      }
      
      try {
        this.converting = true;
        const response = await bcvService.convertVESToUSD(this.vesAmount);
        
        if (response.success) {
          this.usdAmount = response.data.usdAmount;
          this.conversionInfo = response;
          this.$emit('update:modelValue', this.vesAmount);
          this.$emit('currency-change', { amount: this.vesAmount, currency: 'VES' });
        } else {
          this.conversionInfo = response;
        }
      } catch (error) {
        console.error('Error en conversión VES a USD:', error);
        this.conversionInfo = {
          success: false,
          error: error.message
        };
      } finally {
        this.converting = false;
      }
    },
    
    clearFields() {
      this.usdAmount = 0;
      this.vesAmount = 0;
      this.conversionInfo = null;
      this.$emit('update:modelValue', 0);
    },
    
    useVESAmount() {
      this.$emit('update:modelValue', this.vesAmount);
      this.$emit('currency-change', { amount: this.vesAmount, currency: 'VES' });
    },
    
    formatRate(rate) {
      return bcvService.formatRate(rate);
    },
    
    formatDate(dateString) {
      return bcvService.formatDate(dateString);
    }
  }
};
</script>

<style scoped>
.currency-converter {
  border-radius: 12px;
}

.v-text-field {
  margin-bottom: 8px;
}

.v-alert {
  border-radius: 8px;
}
</style>
