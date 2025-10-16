<template>
  <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-receipt-long</v-icon>
        {{ isEditing ? 'Editar Factura' : 'Nueva Factura' }}
      </v-card-title>
      
      <!-- Stepper para navegación por pasos -->
      <v-stepper v-model="currentStep" class="elevation-0">
        <v-stepper-header>
          <v-stepper-item
            :complete="currentStep > 1"
            :value="1"
            title="Información Básica"
            subtitle="Datos generales de la factura"
          ></v-stepper-item>
          
          <v-divider></v-divider>
          
          <v-stepper-item
            :complete="currentStep > 2"
            :value="2"
            title="Emisor y Cliente"
            subtitle="Datos de las partes"
          ></v-stepper-item>
          
          <v-divider></v-divider>
          
          <v-stepper-item
            :complete="currentStep > 3"
            :value="3"
            title="Detalles Financieros"
            subtitle="Montos e impuestos"
          ></v-stepper-item>
          
          <v-divider></v-divider>
          
          <v-stepper-item
            :complete="currentStep > 4"
            :value="4"
            title="Items y Notas"
            subtitle="Productos y observaciones"
          ></v-stepper-item>
        </v-stepper-header>
        
        <v-stepper-window style="max-height: 500px; overflow-y: auto;">
          <!-- Paso 1: Información Básica -->
          <v-stepper-window-item :value="1">
            <v-card-text style="padding: 24px;">
              <!-- Sección de carga de archivo - Compacta -->
              <v-card variant="outlined" class="mb-4 file-upload-card">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center mb-2">
                    <v-icon left color="primary">mdi-file-upload</v-icon>
                    <span class="text-subtitle-2 text-primary">Cargar y Autocompletar desde Archivo</span>
                  </div>
                  
                  <v-row no-gutters>
                    <v-col cols="12" md="8">
                      <v-file-input
                        v-model="uploadedFile"
                        label="Seleccionar archivo (PDF o imagen)"
                        accept=".pdf,.jpg,.jpeg,.png"
                        prepend-icon="mdi-file"
                        show-size
                        @change="handleFileUpload"
                        :disabled="extracting"
                        variant="outlined"
                        density="compact"
                        hide-details
                      ></v-file-input>
                    </v-col>
                    <v-col cols="12" md="4" class="pl-md-2">
                      <v-btn
                        v-if="uploadedFile"
                        color="primary"
                        :loading="extracting"
                        :disabled="extracting"
                        @click="extractDataFromFile"
                        size="small"
                        block
                      >
                        <v-icon left>mdi-auto-fix</v-icon>
                        Extraer
                      </v-btn>
                    </v-col>
                  </v-row>
                  
                  <v-alert
                    v-if="extractionResult"
                    :type="extractionResult.success ? 'success' : 'error'"
                    class="mt-2"
                    density="compact"
                    variant="tonal"
                  >
                    {{ extractionResult.message }}
                    <div v-if="extractionResult.success && extractionResult.data.confidence">
                      <small>Confianza: {{ Math.round(extractionResult.data.confidence * 100) }}%</small>
                    </div>
                  </v-alert>
                </v-card-text>
              </v-card>

              <!-- Información básica de la factura -->
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.invoiceNumber"
                    label="Número de Factura"
                    :rules="[v => !!v || 'El número de factura es requerido']"
                    required
                    variant="outlined"
                    class="animated-field"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.controlNumber"
                    label="Número de Control"
                    variant="outlined"
                    class="animated-field"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="formData.documentType"
                    :items="documentTypes"
                    label="Tipo de Documento"
                    :rules="[v => !!v || 'El tipo de documento es requerido']"
                    required
                    variant="outlined"
                    class="animated-field"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.issueDate"
                    label="Fecha de Emisión"
                    type="date"
                    :rules="[v => !!v || 'La fecha de emisión es requerida']"
                    required
                    variant="outlined"
                    class="animated-field"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.dueDate"
                    label="Fecha de Vencimiento"
                    type="date"
                    variant="outlined"
                    class="animated-field"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-stepper-window-item>

          <!-- Paso 2: Emisor y Cliente -->
          <v-stepper-window-item :value="2">
            <v-card-text style="padding: 24px;">
              <!-- Información del emisor -->
              <v-card variant="outlined" class="mb-4 animated-card">
                <v-card-title>
                  <v-icon left>mdi-domain</v-icon>
                  Información del Emisor
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.companyName"
                        label="Nombre de la Empresa"
                        :rules="[v => !!v || 'El nombre de la empresa es requerido']"
                        required
                        variant="outlined"
                        class="animated-field"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.rif"
                        label="RIF"
                        :rules="[v => !!v || 'El RIF es requerido']"
                        required
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formData.issuer.taxpayerType"
                        :items="taxpayerTypes"
                        label="Tipo de Contribuyente"
                        variant="outlined"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.phone"
                        label="Teléfono"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.email"
                        label="Email"
                        type="email"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.website"
                        label="Sitio Web"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="formData.issuer.address"
                        label="Dirección"
                        rows="2"
                        variant="outlined"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Información del cliente -->
              <v-card variant="outlined">
                <v-card-title>
                  <v-icon left>mdi-account</v-icon>
                  Información del Cliente
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.companyName"
                        label="Nombre de la Empresa"
                        :rules="[v => !!v || 'El nombre de la empresa es requerido']"
                        required
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.rif"
                        label="RIF"
                        :rules="[v => !!v || 'El RIF es requerido']"
                        required
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formData.client.taxpayerType"
                        :items="taxpayerTypes"
                        label="Tipo de Contribuyente"
                        variant="outlined"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.phone"
                        label="Teléfono"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.email"
                        label="Email"
                        type="email"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.website"
                        label="Sitio Web"
                        variant="outlined"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="formData.client.address"
                        label="Dirección"
                        rows="2"
                        variant="outlined"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-stepper-window-item>

          <!-- Paso 3: Detalles Financieros -->
          <v-stepper-window-item :value="3">
            <v-card-text style="padding: 24px;">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.totalSales"
                    label="Total de Ventas"
                    type="number"
                    step="0.01"
                    :rules="[v => v > 0 || 'El total debe ser mayor a 0']"
                    required
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.nonTaxableSales"
                    label="Ventas No Gravadas"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.taxableSales"
                    label="Ventas Gravadas"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.taxDebit"
                    label="IVA Débito"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.ivaRetention"
                    label="Retención IVA"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.islrRetention"
                    label="Retención ISLR"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.municipalRetention"
                    label="Retención Municipal"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.igtf"
                    label="IGTF"
                    type="number"
                    step="0.01"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.financial.currency"
                    :items="currencies"
                    label="Moneda"
                    variant="outlined"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.exchangeRate"
                    label="Tasa de Cambio"
                    type="number"
                    step="0.0001"
                    variant="outlined"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-stepper-window-item>

          <!-- Paso 4: Items y Notas -->
          <v-stepper-window-item :value="4">
            <v-card-text style="padding: 24px;">
              <!-- Items de la factura - Opcional -->
              <v-card variant="outlined" class="mb-4 items-card">
                <v-card-text class="pa-3">
                  <div class="d-flex align-center justify-space-between mb-1">
                    <div class="d-flex align-center">
                      <v-icon left color="primary">mdi-format-list-bulleted</v-icon>
                      <span class="text-subtitle-1 text-primary font-weight-medium">Items de la Factura</span>
                      <v-chip size="small" color="grey" variant="tonal" class="ml-2">Opcional</v-chip>
                    </div>
                    <v-btn
                      v-if="!showItems"
                      color="primary"
                      variant="outlined"
                      size="small"
                      @click="showItems = true"
                      prepend-icon="mdi-plus"
                    >
                      Agregar Items
                    </v-btn>
                  </div>
                  
                  <transition name="expand" appear>
                    <div v-if="showItems" class="items-content">
                      <transition-group name="item-list" tag="div">
                        <div v-for="(item, index) in formData.items" :key="`item-${index}`" class="mb-3 item-row">
                          <v-row no-gutters>
                            <v-col cols="12" md="5" class="pr-md-1">
                              <v-text-field
                                v-model="item.description"
                                label="Descripción"
                                variant="outlined"
                                density="compact"
                                hide-details
                                class="animated-field"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="4" md="2" class="px-1">
                              <v-text-field
                                v-model.number="item.quantity"
                                label="Cant."
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="compact"
                                hide-details
                                class="animated-field"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="4" md="2" class="px-1">
                              <v-text-field
                                v-model.number="item.unitPrice"
                                label="Precio"
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="compact"
                                hide-details
                                class="animated-field"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="4" md="2" class="pl-1">
                              <v-text-field
                                v-model.number="item.total"
                                label="Total"
                                type="number"
                                step="0.01"
                                variant="outlined"
                                density="compact"
                                hide-details
                                readonly
                                class="animated-field"
                              ></v-text-field>
                            </v-col>
                            <v-col cols="12" md="1" class="d-flex align-center justify-center">
                              <v-btn
                                v-if="formData.items.length > 1"
                                icon="mdi-delete"
                                color="error"
                                variant="text"
                                size="small"
                                @click="removeItem(index)"
                                title="Eliminar item"
                                class="animated-btn"
                              ></v-btn>
                            </v-col>
                          </v-row>
                        </div>
                      </transition-group>
                      
                      <div class="d-flex gap-2 mt-3">
                        <v-btn
                          color="primary"
                          variant="outlined"
                          size="small"
                          @click="addItem"
                          prepend-icon="mdi-plus"
                          class="animated-btn"
                        >
                          Agregar Item
                        </v-btn>
                        <v-btn
                          color="grey"
                          variant="text"
                          size="small"
                          @click="showItems = false"
                          prepend-icon="mdi-close"
                          class="animated-btn"
                        >
                          Ocultar
                        </v-btn>
                      </div>
                    </div>
                  </transition>
                </v-card-text>
              </v-card>

              <!-- Notas -->
              <v-card variant="outlined">
                <v-card-title>
                  <v-icon left>mdi-note-text</v-icon>
                  Notas y Observaciones
                </v-card-title>
                <v-card-text>
                  <v-textarea
                    v-model="formData.notes"
                    label="Notas adicionales"
                    rows="4"
                    variant="outlined"
                    placeholder="Ingrese cualquier información adicional relevante..."
                  ></v-textarea>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
      
      <!-- Botones de navegación -->
      <v-card-actions class="pa-4">
        <v-btn
          v-if="currentStep > 1"
          color="grey"
          variant="text"
          @click="currentStep--"
          prepend-icon="mdi-chevron-left"
        >
          Anterior
        </v-btn>
        
        <v-spacer></v-spacer>
        
        <v-btn
          v-if="currentStep < 4"
          color="primary"
          @click="currentStep++"
          append-icon="mdi-chevron-right"
        >
          Siguiente
        </v-btn>
        
        <v-btn
          v-if="currentStep === 4"
          color="success"
          :loading="loading"
          @click="handleSubmit"
          prepend-icon="mdi-check"
        >
          {{ isEditing ? 'Actualizar Factura' : 'Crear Factura' }}
        </v-btn>
        
        <v-btn
          color="grey"
          variant="text"
          @click="$emit('cancel')"
        >
          Cancelar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-form>
</template>

<script>
import invoiceService from '../../services/invoiceService.js';

export default {
  name: 'InvoiceForm',
  props: {
    invoice: {
      type: Object,
      default: null
    }
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      valid: false,
      loading: false,
      currentStep: 1,
      showItems: false, // Controla si se muestran los items
      
      // Archivo subido
      uploadedFile: null,
      extracting: false,
      extractionResult: null,
      
      // Datos del formulario
      formData: {
        invoiceNumber: '',
        controlNumber: '',
        documentType: 'FACTURA',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'BORRADOR',
        
        issuer: {
          companyName: '',
          rif: '',
          taxpayerType: '',
          phone: '',
          email: '',
          website: '',
          address: ''
        },
        
        client: {
          companyName: '',
          rif: '',
          taxpayerType: '',
          phone: '',
          email: '',
          website: '',
          address: ''
        },
        
        financial: {
          totalSales: 0,
          nonTaxableSales: 0,
          taxableSales: 0,
          taxDebit: 0,
          ivaRetention: 0,
          islrRetention: 0,
          municipalRetention: 0,
          igtf: 0,
          currency: 'VES',
          exchangeRate: 1
        },
        
        items: [
          {
            description: '',
            quantity: 1,
            unitPrice: 0,
            total: 0
          }
        ],
        
        notes: '',
        attachments: []
      },
      
      // Opciones para selects
      documentTypes: [
        'FACTURA',
        'NOTA DE CRÉDITO',
        'NOTA DE DÉBITO',
        'RECIBO',
        'COMPROBANTE'
      ],
      
      taxpayerTypes: [
        'PERSONA NATURAL',
        'PERSONA JURÍDICA',
        'GUBERNAMENTAL',
        'EXTRANJERO'
      ],
      
      currencies: [
        'VES',
        'USD',
        'EUR'
      ]
    };
  },
  computed: {
    isEditing() {
      return !!this.invoice;
    }
  },
  watch: {
    invoice: {
      handler(newInvoice) {
        if (newInvoice) {
          this.formData = { ...newInvoice };
        }
      },
      immediate: true
    }
  },
  methods: {
    handleFileUpload() {
      if (this.uploadedFile) {
        console.log('Archivo seleccionado:', this.uploadedFile);
      }
    },
    
    async extractDataFromFile() {
      if (!this.uploadedFile) return;
      
      this.extracting = true;
      this.extractionResult = null;
      
      try {
        const response = await invoiceService.extractDataFromFile(this.uploadedFile);
        this.extractionResult = response;
        
        if (response.success && response.data) {
          // Autocompletar campos con datos extraídos
          const data = response.data;
          if (data.invoiceNumber) this.formData.invoiceNumber = data.invoiceNumber;
          if (data.issueDate) this.formData.issueDate = data.issueDate;
          if (data.totalSales) this.formData.financial.totalSales = data.totalSales;
          if (data.issuer) {
            Object.assign(this.formData.issuer, data.issuer);
          }
          if (data.client) {
            Object.assign(this.formData.client, data.client);
          }
        }
      } catch (error) {
        console.error('Error al extraer datos:', error);
        this.extractionResult = {
          success: false,
          message: 'Error al procesar el archivo'
        };
      } finally {
        this.extracting = false;
      }
    },
    
    addItem() {
      this.formData.items.push({
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      });
    },
    
    removeItem(index) {
      if (this.formData.items.length > 1) {
        this.formData.items.splice(index, 1);
      }
    },
    
    async handleSubmit() {
      if (!this.$refs.form.validate()) return;
      
      this.loading = true;
      
      try {
        let response;
        if (this.isEditing) {
          response = await invoiceService.updateInvoice(this.invoice.id, this.formData);
        } else {
          response = await invoiceService.createInvoice(this.formData);
        }
        
        this.$emit('submit', response);
      } catch (error) {
        console.error('Error al guardar factura:', error);
        this.$emit('submit', {
          success: false,
          message: 'Error al guardar la factura'
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.v-stepper {
  box-shadow: none !important;
}

.v-stepper-header {
  box-shadow: none !important;
  border-bottom: 1px solid #e0e0e0;
}

.v-stepper-item {
  padding: 16px;
}

.v-stepper-window {
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc #f5f5f5;
  margin-bottom: 20px;
}

/* Estilos para el scrollbar en WebKit (Chrome, Safari, Edge) */
.v-stepper-window::-webkit-scrollbar {
  width: 8px;
}

.v-stepper-window::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.v-stepper-window::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.v-stepper-window::-webkit-scrollbar-thumb:hover {
  background: #999;
}

.v-card {
  border-radius: 12px;
  border: 1px solid #e0e0e0 !important;
}

.v-card-title {
  background-color: #f5f5f5;
  border-radius: 12px 12px 0 0;
}

/* Quitar bordes negros y usar colores más suaves */
.v-text-field .v-field,
.v-select .v-field,
.v-textarea .v-field,
.v-file-input .v-field {
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
}

.v-text-field .v-field:hover,
.v-select .v-field:hover,
.v-textarea .v-field:hover,
.v-file-input .v-field:hover {
  border: 1px solid #bdbdbd !important;
}

.v-text-field .v-field--focused,
.v-select .v-field--focused,
.v-textarea .v-field--focused,
.v-file-input .v-field--focused {
  border: 2px solid #1976d2 !important;
  box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.1) !important;
}

/* Estilos para la sección de carga de archivo compacta */
.file-upload-card {
  border: 1px solid #e3f2fd !important;
  background-color: #fafafa;
}

.file-upload-card .v-card-text {
  padding: 16px !important;
}

/* Estilos para la sección de items compacta */
.items-card {
  border: 1px solid #e3f2fd !important;
  background-color: #fafafa;
  min-height: 60px; /* Altura mínima cuando está colapsada */
}

.items-card .v-card-text {
  padding: 16px !important;
  min-height: 60px; /* Altura mínima del contenido */
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.items-card .v-text-field {
  margin-bottom: 0 !important;
}

/* Estilos para el chip "Opcional" */
.v-chip--size-small {
  font-size: 0.75rem !important;
  height: 22px !important;
}

.v-btn {
  border-radius: 8px;
  text-transform: none;
  font-weight: 500;
  border: 1px solid transparent !important;
}

.v-btn--variant-outlined {
  border: 1px solid #e0e0e0 !important;
  background-color: #ffffff !important;
}

.v-btn--variant-outlined:hover {
  border: 1px solid #bdbdbd !important;
  background-color: #f5f5f5 !important;
}

.v-text-field,
.v-select,
.v-textarea {
  margin-bottom: 8px;
}

/* Animaciones suaves */
.v-stepper-window-item {
  transition: all 0.3s ease;
}

/* Estilos para los campos requeridos */
.v-text-field[required] .v-label::after,
.v-select[required] .v-label::after {
  content: ' *';
  color: #f44336;
}

/* Indicador de scroll */
.v-stepper-window::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(transparent, rgba(250,250,250,0.9));
  pointer-events: none;
  z-index: 1;
}

/* Mejorar el padding para evitar que el contenido se corte */
.v-stepper-window-item .v-card-text {
  padding-bottom: 80px !important;
}

/* Asegurar que los botones no tapen el contenido */
.v-card-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #fafafa;
}

/* ===== ANIMACIONES ===== */

/* Animación de expansión para la sección de items */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.expand-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
  transform: translateY(0);
}

/* Animación para la lista de items */
.item-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.item-list-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  width: 100%;
}

.item-list-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}

.item-list-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.item-list-move {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animaciones para campos de entrada */
.animated-field {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animated-field:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.animated-field:focus-within {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(25, 118, 210, 0.15);
}

/* Animaciones para botones */
.animated-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.animated-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.animated-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Animación para las tarjetas */
.v-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.animated-card {
  animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animación para el stepper */
.v-stepper-window-item {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animación de entrada para elementos del formulario */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animated-field {
  animation: slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animación de pulso para elementos importantes */
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

.v-text-field[required] .v-field--focused {
  animation: pulse 0.3s ease-in-out;
}

/* Animación de shake para errores */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-5px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(5px);
  }
}

.v-text-field.error--text .v-field {
  animation: shake 0.5s ease-in-out;
}

/* Animación de fade para alertas */
.v-alert {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-alert-enter-active,
.v-alert-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-alert-enter-from,
.v-alert-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Animación para el contenido de items */
.items-content {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animación de entrada escalonada para campos */
.animated-field:nth-child(1) { animation-delay: 0.1s; }
.animated-field:nth-child(2) { animation-delay: 0.2s; }
.animated-field:nth-child(3) { animation-delay: 0.3s; }
.animated-field:nth-child(4) { animation-delay: 0.4s; }
.animated-field:nth-child(5) { animation-delay: 0.5s; }
.animated-field:nth-child(6) { animation-delay: 0.6s; }
</style>