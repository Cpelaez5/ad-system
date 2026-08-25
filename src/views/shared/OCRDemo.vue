<template>
  <v-container class="pa-4 pa-sm-6">
    <v-row class="mb-2">
      <v-col cols="12">
        <h1 class="text-h5 text-sm-h4 mb-1 font-weight-bold text-white d-flex align-center">
          <v-icon color="#e0b04f" class="mr-2" size="large">mdi-robot-outline</v-icon>
          Demo: OCR de Facturas
        </h1>
        <p class="text-body-2 text-sm-body-1 text-grey-lighten-1 mb-0">
          Sube un comprobante para probar el sistema Multi-Proveedor (Gemini/Deepseek).
        </p>
      </v-col>
    </v-row>

    <v-row>
      <!-- Upload Zone -->
      <v-col cols="12" md="5" class="d-flex flex-column gap-4">
        <FileUploadZone
          :loading="isExtracting"
          :loading-message="loadingMessage"
          @file-selected="onFileSelected"
          @extract-data="extractInvoiceData"
          @file-removed="onFileRemoved"
        />
        
        <!-- Error Segregado (S.O.L.I.D) -->
        <OcrErrorAlert 
          v-if="errorState" 
          :error="errorState" 
          @manual-entry="onManualEntry" 
        />
      </v-col>

      <!-- Resultados -->
      <v-col cols="12" md="7">
        
        <!-- Resultado Segregado (S.O.L.I.D) -->
        <OcrResultCard 
          v-if="extractedData"
          :data="extractedData"
          @clear="extractedData = null"
          @save="onSimulateSave"
        />

        <!-- Placeholder (Empty State) -->
        <v-card v-else class="text-center pa-6 pa-sm-10 bg-surface-dark border-thin rounded-lg d-flex flex-column align-center justify-center h-100" theme="dark">
          <v-icon size="48" color="grey-darken-2" class="mb-3">mdi-file-search-outline</v-icon>
          <h3 class="text-subtitle-1 text-sm-h6 text-grey-lighten-1 mb-1 font-weight-bold">Listo para extraer</h3>
          <p class="text-caption text-sm-body-2 text-grey mb-0 px-2">
            Sube un comprobante a la izquierda y el resultado aparecerá aquí.<br class="d-none d-sm-block">
            Asegúrate de tener un Perfil IA activo configurado.
          </p>
        </v-card>

      </v-col>
    </v-row>

    <!-- Snackbar para simulaciones -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
    />
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import FileUploadZone from '@/components/common/FileUploadZone.vue';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import OcrErrorAlert from '@/components/ocr/OcrErrorAlert.vue';
import OcrResultCard from '@/components/ocr/OcrResultCard.vue';
import { procesarComprobanteOCR } from '@/services/gemini/geminiOcrService.js';

const isExtracting = ref(false);
const loadingMessage = ref('Subiendo documento... ☁️');
const extractedData = ref(null);
const errorState = ref(null);
const snackbar = ref({ show: false, type: 'info', message: '' });

function showSnackbar(type, message) {
  snackbar.value = { show: true, type, message };
}

function onFileSelected(file) {
  errorState.value = null;
}

async function extractInvoiceData(file) {
  isExtracting.value = true;
  extractedData.value = null;
  errorState.value = null;
  loadingMessage.value = 'Subiendo documento... ☁️';
  
  try {
    const data = await procesarComprobanteOCR(file, null, (msg) => {
      if (msg) loadingMessage.value = msg;
    });
    
    extractedData.value = data;
    showSnackbar('success', '¡Datos extraídos con éxito!');
    
  } catch (error) {
    console.error('❌ Error OCR:', error);
    errorState.value = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'Error desconocido al procesar el archivo',
      suggestManualEntry: !!error.suggestManualEntry
    };
  } finally {
    isExtracting.value = false;
  }
}

function onFileRemoved() {
  extractedData.value = null;
  errorState.value = null;
}

function onManualEntry() {
  showSnackbar('info', '🚜 Simulación: Redirigiendo al formulario de ingreso manual de compras...');
}

function onSimulateSave() {
  showSnackbar('success', '💾 Simulación: Guardando factura en base de datos...');
}
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
.bg-surface-dark {
  background-color: #121212 !important;
}
.border-thin {
  border: 1px dashed rgba(255, 255, 255, 0.15) !important;
}
</style>
