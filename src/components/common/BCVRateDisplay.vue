<template>
  <v-card class="bcv-rate-card" :class="{ 'loading': loading }">
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon 
            :color="rateData ? 'success' : 'error'" 
            class="mr-3"
            size="24"
          >
            {{ rateData ? 'mdi-trending-up' : 'mdi-alert-circle' }}
          </v-icon>
          <div>
            <div class="text-caption text-grey-darken-1">
              Tasa BCV
            </div>
            <div class="text-h6 font-weight-bold">
              {{ rateData ? formatRate(rateData.dollar) : 'N/A' }}
            </div>
          </div>
        </div>
        
        <div class="text-right">
          <div class="text-caption text-grey-darken-1">
            {{ rateData ? formatDate(rateData.date) : 'Sin datos' }}
          </div>
          <div class="text-caption">
            <v-chip 
              :color="getChipColor(rateData)" 
              size="x-small" 
              variant="tonal"
            >
              {{ getChipText(rateData) }}
            </v-chip>
          </div>
        </div>
      </div>
      
      <!-- Indicador de carga -->
      <div v-if="loading" class="loading-overlay">
        <v-progress-circular
          indeterminate
          size="20"
          color="primary"
        ></v-progress-circular>
      </div>
      
      <!-- Botones de acción -->
      <div class="mt-2 d-flex gap-2">
        <v-btn
          size="x-small"
          variant="text"
          color="primary"
          @click="refreshRate"
          :loading="loading"
          :disabled="loading"
        >
          <v-icon size="16" class="mr-1">mdi-refresh</v-icon>
          Actualizar
        </v-btn>
        
        <v-btn
          size="x-small"
          variant="text"
          color="secondary"
          @click="testConnection"
          :loading="testing"
          :disabled="testing"
        >
          <v-icon size="16" class="mr-1">mdi-test-tube</v-icon>
          Probar
        </v-btn>
        
        <v-btn
          size="x-small"
          variant="text"
          color="info"
          @click="testAPI"
          :loading="testingBoth"
          :disabled="testingBoth"
        >
          <v-icon size="16" class="mr-1">mdi-api</v-icon>
          Test API
        </v-btn>
        
        <v-btn
          size="x-small"
          variant="text"
          color="warning"
          @click="toggleSimulation"
        >
          <v-icon size="16" class="mr-1">mdi-toggle-switch</v-icon>
          {{ isSimulated ? 'Real' : 'Sim' }}
        </v-btn>
      </div>
      
      <!-- Información de debug -->
      <div v-if="debugInfo" class="mt-2">
        <v-alert
          :type="debugInfo.success ? 'success' : 'error'"
          variant="tonal"
          density="compact"
          class="text-caption"
        >
          {{ debugInfo.message }}
        </v-alert>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import bcvService from '@/services/bcvService.js';

export default {
  name: 'BCVRateDisplay',
  data() {
    return {
      loading: false,
      testing: false,
      testingBoth: false,
      rateData: null,
      error: null,
      debugInfo: null,
      refreshInterval: null,
      isSimulated: true
    };
  },
  async mounted() {
    // Sincronizar estado inicial
    this.isSimulated = bcvService.useSimulatedData;
    await this.loadRate();
    // Actualizar cada 5 minutos
    this.refreshInterval = setInterval(() => {
      this.loadRate();
    }, 5 * 60 * 1000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async loadRate() {
      try {
        this.loading = true;
        this.error = null;
        
        const response = await bcvService.getCurrentRate();
        
        if (response.success) {
          this.rateData = response.data;
        } else {
          this.error = response.error;
          this.rateData = null;
        }
      } catch (error) {
        console.error('Error al cargar tasa del BCV:', error);
        this.error = error.message;
        this.rateData = null;
      } finally {
        this.loading = false;
      }
    },
    
    async refreshRate() {
      // Limpiar cache y recargar
      bcvService.clearCache();
      this.debugInfo = null;
      await this.loadRate();
    },
    
    async testConnection() {
      try {
        this.testing = true;
        this.debugInfo = null;
        
        console.log('🧪 Iniciando prueba de conexión...');
        const result = await bcvService.testConnection();
        
        if (result.success) {
          this.debugInfo = {
            success: true,
            message: `✅ Conexión exitosa. Tasa: ${result.data.dollar} VES/USD`
          };
          this.rateData = result.data;
        } else {
          this.debugInfo = {
            success: false,
            message: `❌ Error: ${result.error}`
          };
        }
      } catch (error) {
        console.error('Error en prueba de conexión:', error);
        this.debugInfo = {
          success: false,
          message: `❌ Error inesperado: ${error.message}`
        };
      } finally {
        this.testing = false;
      }
    },
    
    async testAPI() {
      try {
        this.testingBoth = true;
        this.debugInfo = null;
        
        console.log('🧪 Probando API del BCV...');
        const result = await bcvService.testAPI();
        
        if (result.success) {
          this.debugInfo = {
            success: true,
            message: `✅ API del BCV funciona: ${result.data.dollar} VES/USD`
          };
          this.rateData = result.data;
        } else {
          this.debugInfo = {
            success: false,
            message: `❌ Error: ${result.error}`
          };
        }
      } catch (error) {
        console.error('Error en prueba de API:', error);
        this.debugInfo = {
          success: false,
          message: `❌ Error inesperado: ${error.message}`
        };
      } finally {
        this.testingBoth = false;
      }
    },
    
    formatRate(rate) {
      return bcvService.formatRate(rate);
    },
    
    formatDate(dateString) {
      return bcvService.formatDate(dateString);
    },
    
    getChipColor(rateData) {
      if (!rateData) return 'error';
      if (rateData.source === 'SIMULATED') return 'warning';
      if (rateData.source === 'BCV') return 'success';
      return 'info';
    },
    
    getChipText(rateData) {
      if (!rateData) return 'Error';
      if (rateData.source === 'SIMULATED') return 'Simulado';
      if (rateData.source === 'BCV') return 'Actualizado';
      return 'Cargado';
    },
    
    toggleSimulation() {
      this.isSimulated = bcvService.toggleSimulation();
      this.clearCache();
      this.loadRate();
    },
    
    clearCache() {
      bcvService.clearCache();
      this.debugInfo = null;
    }
  }
};
</script>

<style scoped>
.bcv-rate-card {
  border-radius: 12px;
  position: relative;
  transition: all 0.3s ease;
}

.bcv-rate-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.bcv-rate-card.loading {
  opacity: 0.7;
}

.loading-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.text-caption {
  font-size: 0.75rem;
  line-height: 1.2;
}

.text-h6 {
  font-size: 1.1rem;
  line-height: 1.2;
}
</style>
