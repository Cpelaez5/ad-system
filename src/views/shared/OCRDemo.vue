<template>
  <v-container class="pa-6">
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-2">🤖 Demo: OCR de Facturas con IA</h1>
        <p class="text-body-1 text-grey mb-6">
          Prueba la extracción automática de datos usando DeepSeek Vision API
        </p>
      </v-col>
    </v-row>

    <v-row>
      <!-- Upload Zone -->
      <v-col cols="12" md="6">
        <FileUploadZone
          :loading="isExtracting"
          loading-message="Extrayendo datos con IA... 🧠"
          @file-selected="onFileSelected"
          @extract-data="extractInvoiceData"
          @file-removed="onFileRemoved"
        />
      </v-col>

      <!-- Resultados -->
      <v-col cols="12" md="6">
        <v-card v-if="extractedData">
          <v-card-title class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
            Datos Extraídos
            <v-spacer />
            <v-chip :color="confidenceColor" variant="tonal">
              Confianza: {{ Math.round(extractedData.confidence * 100) }}%
            </v-chip>
          </v-card-title>

          <v-card-text>
            <!-- Información básica -->
            <v-list density="compact">
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-file-document</v-icon>
                </template>
                <v-list-item-title>Número de Factura</v-list-item-title>
                <v-list-item-subtitle>{{ extractedData.invoiceNumber || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-calendar</v-icon>
                </template>
                <v-list-item-title>Fecha de Emisión</v-list-item-title>
                <v-list-item-subtitle>{{ extractedData.issueDate || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-office-building</v-icon>
                </template>
                <v-list-item-title>Cliente</v-list-item-title>
                <v-list-item-subtitle>{{ extractedData.client?.companyName || 'N/A' }}</v-list-item-subtitle>
              </v-list-item>

              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-cash</v-icon>
                </template>
                <v-list-item-title>Total</v-list-item-title>
                <v-list-item-subtitle>
                  {{ extractedData.currency || 'VES' }} {{ formatNumber(extractedData.total) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-4" />

            <!-- Items -->
            <h4 class="text-subtitle-1 mb-2">Items ({{ extractedData.items?.length || 0 }})</h4>
            <v-list density="compact">
              <v-list-item
                v-for="(item, index) in extractedData.items"
                :key="index"
              >
                <v-list-item-title>{{ item.description }}</v-list-item-title>
                <v-list-item-subtitle>
                  Cant: {{ item.quantity }} × {{ formatNumber(item.unitPrice) }} = {{ formatNumber(item.amount) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>

            <v-divider class="my-4" />

            <!-- JSON completo -->
            <v-expansion-panels>
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon class="mr-2">mdi-code-json</v-icon>
                  Ver JSON Completo
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <pre class="json-display">{{ JSON.stringify(extractedData, null, 2) }}</pre>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>

          <v-card-actions>
            <v-btn color="primary" variant="elevated" @click="useData">
              <v-icon start>mdi-check</v-icon>
              Usar Estos Datos
            </v-btn>
            <v-btn variant="text" @click="extractedData = null">
              Limpiar
            </v-btn>
          </v-card-actions>
        </v-card>

        <!-- Placeholder -->
        <v-card v-else class="text-center pa-8" variant="outlined">
          <v-icon size="64" color="grey-lighten-1">mdi-file-search</v-icon>
          <p class="text-body-1 text-grey mt-4">
            Los datos extraídos aparecerán aquí
          </p>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
    />
  </v-container>
</template>

<script>
import FileUploadZone from '@/components/common/FileUploadZone.vue'
import AppSnackbar from '@/components/common/AppSnackbar.vue'
import ocrService from '@/services/ocrService.js'

export default {
  name: 'OCRDemo',
  components: {
    FileUploadZone,
    AppSnackbar
  },
  data() {
    return {
      isExtracting: false,
      extractedData: null,
      snackbar: {
        show: false,
        type: 'info',
        message: ''
      }
    }
  },
  computed: {
    confidenceColor() {
      const confidence = this.extractedData?.confidence || 0
      if (confidence >= 0.8) return 'success'
      if (confidence >= 0.5) return 'warning'
      return 'error'
    }
  },
  methods: {
    onFileSelected(file) {
      console.log('📄 Archivo seleccionado:', file.name)
      this.showSnackbar('info', `Archivo cargado: ${file.name}`)
    },
    
    async extractInvoiceData(file) {
      try {
        this.isExtracting = true
        this.extractedData = null
        
        console.log('🤖 Iniciando extracción...')
        const data = await ocrService.extractInvoiceData(file)
        
        this.extractedData = data
        this.showSnackbar('success', '¡Datos extraídos exitosamente!')
        
      } catch (error) {
        console.error('❌ Error:', error)
        this.showSnackbar('error', error.message || 'Error al extraer datos')
      } finally {
        this.isExtracting = false
      }
    },
    
    onFileRemoved() {
      this.extractedData = null
      this.showSnackbar('info', 'Archivo removido')
    },
    
    useData() {
      console.log('✅ Usando datos:', this.extractedData)
      this.showSnackbar('success', 'Datos listos para usar en el formulario')
      // Aquí podrías navegar al formulario con los datos
      // this.$router.push({ name: 'InvoiceForm', params: { data: this.extractedData } })
    },
    
    showSnackbar(type, message) {
      this.snackbar = { show: true, type, message }
    },
    
    formatNumber(value) {
      if (!value) return '0.00'
      return parseFloat(value).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
  }
}
</script>

<style scoped>
.json-display {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}
</style>
