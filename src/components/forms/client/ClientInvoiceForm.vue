<template>
  <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-receipt-long</v-icon>
        {{ isEditing ? 'Editar Documento' : 'Nuevo Documento' }}
      </v-card-title>
      
      <!-- Stepper para navegación por pasos -->
      <v-stepper v-model="currentStep" flat>
        <v-stepper-header>
          <v-stepper-item
            :complete="currentStep > 1"
            :value="1"
            title="Información Básica"
            subtitle="Datos generales del documento"
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
        
        <v-stepper-window style="max-height: calc(100vh - 320px); overflow-y: auto;">
          <!-- Paso 1: Información Básica -->
          <v-stepper-window-item :value="1">
            <v-container fluid class="pa-6">
              <!-- Aviso de verificación de datos OCR -->
              <v-alert
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
                icon="mdi-information"
              >
                <strong>💡 Tip:</strong> Puedes escanear tu factura con IA, pero <strong>verifica siempre los datos</strong> ya que el escaneo puede no ser 100% exacto.
              </v-alert>

              <!-- Sección de carga de archivo - Colapsable -->
              <v-expansion-panels class="mb-4">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <div class="d-flex align-center">
                      <v-icon class="mr-2" color="primary">mdi-file-upload</v-icon>
                      <span class="font-weight-medium">Escanear Documento con IA</span>
                      <v-chip size="x-small" color="success" variant="tonal" class="ml-2">Opcional</v-chip>
                    </div>
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <FileUploadZone
                      accept="application/pdf,image/jpeg,image/png,image/jpg"
                      :max-size-m-b="10"
                      :loading="extracting"
                      loading-message="Analizando factura con IA..."
                      @file-selected="handleFileSelect"
                      @extract-data="handleExtractedData"
                    />
                    
                    <v-alert
                      v-if="extractionResult"
                      :type="extractionResult.success ? 'success' : 'error'"
                      class="mt-3"
                      density="compact"
                      variant="tonal"
                      closable
                    >
                      {{ extractionResult.message }}
                      <div v-if="extractionResult.success && extractionResult.data.confidence">
                        <small>Confianza: {{ Math.round(extractionResult.data.confidence * 100) }}%</small>
                      </div>
                    </v-alert>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
              
              <!-- Archivo Seleccionado (Pendiente de Subir) -->
              <v-fade-transition>
                <v-card v-if="uploadedFile" class="mb-6 border-dashed" variant="outlined" color="primary">
                  <v-card-text class="d-flex align-center py-3">
                    <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
                      <v-icon>mdi-file-document-outline</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-subtitle-2 font-weight-bold text-primary">Documento listo para subir</div>
                      <div class="text-caption text-medium-emphasis">{{ uploadedFile.name }} ({{ (uploadedFile.size / 1024).toFixed(0) }} KB)</div>
                    </div>
                    <v-spacer></v-spacer>
                    <v-tooltip text="Eliminar archivo">
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-close" variant="text" color="error" size="small" @click="uploadedFile = null"></v-btn>
                      </template>
                    </v-tooltip>
                  </v-card-text>
                </v-card>
              </v-fade-transition>

              <!-- Archivos Ya Guardados (Modo Edición) -->
              <v-card v-if="formData.attachments && formData.attachments.length > 0" class="mb-6 bg-grey-lighten-4" variant="flat">
                <v-card-title class="text-subtitle-2 py-2 px-4 d-flex align-center">
                  <v-icon size="small" class="mr-2">mdi-paperclip</v-icon>
                  Documentos Adjuntos
                </v-card-title>
                <v-divider></v-divider>
                <v-list density="compact" class="bg-transparent py-0">
                  <v-list-item 
                    v-for="(file, i) in formData.attachments" 
                    :key="i"
                    :prepend-icon="file.fileType === 'application/pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image'"
                    lines="one"
                  >
                    <v-list-item-title>
                      <a :href="file.url" target="_blank" class="text-decoration-none text-primary font-weight-medium">
                        {{ file.fileName || 'Ver Documento' }}
                      </a>
                    </v-list-item-title>
                    <template v-slot:append>
                       <v-icon color="success" size="small" class="mr-2">mdi-check-circle</v-icon>
                       <v-tooltip text="Eliminar archivo">
                          <template v-slot:activator="{ props }">
                            <v-btn
                              v-bind="props"
                              icon="mdi-delete"
                              variant="text"
                              color="error"
                              size="small"
                              :loading="deletingAttachmentIndex === i"
                              @click="confirmDeleteAttachment(i)"
                            ></v-btn>
                          </template>
                       </v-tooltip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>

              <!-- Selector de Tipo de Flujo -->
              <v-sheet variant="outlined" class="mb-6 rounded-lg border-2 pa-4">
                <div class="d-flex align-center mb-4">
                  <v-icon color="primary" size="24" class="mr-2">mdi-swap-horizontal-circle</v-icon>
                  <span class="text-h6 font-weight-medium">Tipo de Registro</span>
                  <v-chip size="small" color="primary" variant="tonal" class="ml-2">Requerido</v-chip>
                </div>
                
                <v-radio-group
                  v-model="formData.flow"
                  inline
                  :rules="[v => !!v || 'Debe seleccionar el tipo de factura']"
                  required
                  hide-details="auto"
                  @update:model-value="handleFlowChange"
                >
                  <v-radio
                    value="VENTA"
                    color="success"
                  >
                    <template v-slot:label>
                      <div class="d-flex align-center pa-3 border-2 rounded-lg bg-green-lighten-5" style="min-width: 200px; border-color: #4caf50;">
                        <v-icon color="success" size="32" class="mr-3">mdi-cash-plus</v-icon>
                          <div>
                            <div class="text-subtitle-1 font-weight-bold" style="color: #2e7d32;">Venta</div>
                            <div class="text-caption" style="color: #558b5f;">Factura emitida a cliente</div>
                          </div>
                        </div>
                      </template>
                    </v-radio>
                    
                    <v-radio
                      value="COMPRA"
                      color="primary"
                      class="ml-4"
                    >
                      <template v-slot:label>
                        <div class="d-flex align-center pa-3" style="border: 2px solid #2196f3; border-radius: 8px; min-width: 200px; background: #e3f2fd;">
                          <v-icon color="primary" size="32" class="mr-3">mdi-cash-minus</v-icon>
                          <div>
                            <div class="text-subtitle-1 font-weight-bold" style="color: #1565c0;">Compra</div>
                            <div class="text-caption" style="color: #1976d2;">Factura recibida de proveedor</div>
                          </div>
                        </div>
                      </template>
                    </v-radio>
                  </v-radio-group>
                </v-sheet>

              <!-- Selector de Tipo de Egreso - Solo para COMPRA -->
              <v-card 
                v-if="formData.flow === 'COMPRA'" 
                variant="outlined" 
                class="mb-4" 
                style="border: 2px solid #ff9800; border-radius: 12px;"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <v-icon color="orange" size="24" class="mr-2">mdi-tag-outline</v-icon>
                    <span class="text-h6 font-weight-medium">Tipo de Egreso</span>
                    <v-chip size="small" color="orange" variant="tonal" class="ml-2">Requerido</v-chip>
                  </div>
                  
                  <v-radio-group
                    v-model="formData.expense_type"
                    inline
                    :rules="[v => !!v || 'Debe seleccionar el tipo de egreso']"
                    required
                    hide-details="auto"
                  >
                    <v-radio
                      value="COMPRA"
                      color="info"
                    >
                      <template v-slot:label>
                        <div class="d-flex align-center pa-3" style="border: 2px solid #2196f3; border-radius: 8px; min-width: 220px; background: #e3f2fd;">
                          <v-icon color="info" size="28" class="mr-3">mdi-cart</v-icon>
                          <div>
                            <div class="text-subtitle-1 font-weight-bold" style="color: #1565c0;">Compra</div>
                            <div class="text-caption" style="color: #1976d2;">Mercancía, productos, servicios</div>
                          </div>
                        </div>
                      </template>
                    </v-radio>
                    
                    <v-radio
                      value="GASTO"
                      color="warning"
                      class="ml-4"
                    >
                      <template v-slot:label>
                        <div class="d-flex align-center pa-3" style="border: 2px solid #ff9800; border-radius: 8px; min-width: 220px; background: #fff3e0;">
                          <v-icon color="warning" size="28" class="mr-3">mdi-receipt</v-icon>
                          <div>
                            <div class="text-subtitle-1 font-weight-bold" style="color: #e65100;">Gasto</div>
                            <div class="text-caption" style="color: #f57c00;">Servicios recurrentes (luz, agua, etc.)</div>
                          </div>
                        </div>
                      </template>
                    </v-radio>
                  </v-radio-group>
                </v-card-text>
              </v-card>

              <!-- Información básica de la factura -->
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.invoiceNumber"
                    label="Número de Documento"
                    :rules="[v => !!v || 'El número de documento es requerido']"
                    required
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-receipt-text"
                    hint="Ej: F-2024-001 o R-2024-001"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.controlNumber"
                    label="Número de Control"
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-barcode"
                    hint="Opcional"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="8">
                  <v-select
                    v-model="formData.documentType"
                    :items="availableDocumentTypes"
                    label="Tipo de Documento"
                    :rules="[v => !!v || 'El tipo de documento es requerido']"
                    required
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-file-document"
                    item-title="title"
                    item-value="type"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" :subtitle="item.raw.subtitle">
                        <template v-slot:prepend>
                          <v-icon :color="item.raw.color" class="mr-2">{{ item.raw.icon }}</v-icon>
                        </template>
                      </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                      <v-icon :color="item.raw.color" class="mr-2" size="small">{{ item.raw.icon }}</v-icon>
                      {{ item.raw.title }}
                    </template>
                  </v-select>
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
                    prepend-inner-icon="mdi-calendar"
                    hint="Fecha del documento"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.dueDate"
                    label="Fecha de Vencimiento"
                    type="date"
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-calendar-clock"
                    hint="Opcional - Fecha límite de pago"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="formData.status"
                    :items="invoiceStatuses"
                    label="Estado del Documento"
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-flag"
                    hint="Selecciona el estado actual"
                    persistent-hint
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props" title="">
                        <template v-slot:prepend>
                          <v-icon :color="getStatusColor(item.value)">mdi-circle</v-icon>
                        </template>
                        <v-list-item-title>
                          <v-chip :color="getStatusColor(item.value)" size="small">
                            {{ item.value }}
                          </v-chip>
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-select>
                </v-col>
              </v-row>
            </v-container>
          </v-stepper-window-item>

          <!-- Paso 2: Emisor y Cliente -->
          <v-stepper-window-item :value="2">
            <v-container fluid class="pa-6">
              
              <!-- Información del Emisor -->
              <v-card variant="outlined" class="mb-4 animated-card" :class="{'bg-grey-lighten-4': formData.flow === 'VENTA'}">
                <v-card-title class="d-flex justify-space-between align-center">
                  <div>
                    <v-icon left>mdi-domain</v-icon>
                    Información del Emisor
                    <span v-if="formData.flow === 'VENTA'" class="text-caption text-grey ml-2">(Usted)</span>
                    <span v-else class="text-caption text-grey ml-2">(Proveedor)</span>
                  </div>
                  <v-chip v-if="formData.flow === 'VENTA'" size="small" color="info">Autocompletado</v-chip>
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
                        :readonly="issuerFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.rif"
                        label="RIF"
                        :rules="[v => !!v || 'El RIF es requerido']"
                        required
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formData.issuer.taxpayerType"
                        :items="taxpayerTypes"
                        label="Tipo de Contribuyente"
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.phone"
                        label="Teléfono"
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.email"
                        label="Email"
                        type="email"
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.issuer.website"
                        label="Sitio Web"
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="formData.issuer.address"
                        label="Dirección"
                        rows="2"
                        variant="outlined"
                        :readonly="issuerFieldsReadonly"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Información del Cliente -->
              <v-card variant="outlined" :class="{'bg-grey-lighten-4': formData.flow === 'COMPRA'}">
                <v-card-title class="d-flex justify-space-between align-center">
                  <div>
                    <v-icon left>mdi-account</v-icon>
                    Información del Cliente
                    <span v-if="formData.flow === 'COMPRA'" class="text-caption text-grey ml-2">(Usted)</span>
                    <span v-else class="text-caption text-grey ml-2">(Su Cliente)</span>
                  </div>
                  <v-chip v-if="formData.flow === 'COMPRA'" size="small" color="info">Autocompletado</v-chip>
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
                        :readonly="clientFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.rif"
                        label="RIF"
                        :rules="[v => !!v || 'El RIF es requerido']"
                        required
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formData.client.taxpayerType"
                        :items="taxpayerTypes"
                        label="Tipo de Contribuyente"
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-select>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.phone"
                        label="Teléfono"
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.email"
                        label="Email"
                        type="email"
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.client.website"
                        label="Sitio Web"
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12">
                      <v-textarea
                        v-model="formData.client.address"
                        label="Dirección"
                        rows="2"
                        variant="outlined"
                        :readonly="clientFieldsReadonly"
                      ></v-textarea>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-container>
          </v-stepper-window-item>

          <!-- Paso 3: Detalles Financieros -->
          <v-stepper-window-item :value="3">
            <v-container fluid class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.totalSales"
                    label="Monto Total del Documento"
                    type="number"
                    step="0.01"
                    :rules="[v => v > 0 || 'El monto total debe ser mayor a 0']"
                    required
                    variant="outlined"
                    :prefix="currencySymbol"
                    hint="Ingresa el monto total y el IVA se calculará automáticamente"
                    persistent-hint
                    @update:model-value="autoCalculateFinancials"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.nonTaxableSales"
                    label="Base Exenta (No Gravada)"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    hint="Monto exento de IVA"
                    persistent-hint
                    @update:model-value="autoCalculateFinancials"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.taxableSales"
                    label="Base Imponible (Gravada)"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    hint="Se calcula automáticamente: Total - Exento"
                    persistent-hint
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.financial.taxDebit"
                    label="IVA (16%)"
                    type="number"
                    step="0.01"
                    variant="outlined"
                    hint="Se calcula automáticamente: 16% de la Base Imponible"
                    persistent-hint
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
            </v-container>
          </v-stepper-window-item>

          <!-- Paso 4: Items y Notas -->
          <v-stepper-window-item :value="4">
            <v-container fluid class="pa-6">
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
            </v-container>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
      
      <!-- Botones de navegación -->
      <v-card-actions class="pa-6 bg-grey-lighten-4 border-t">
        <v-btn
          v-if="currentStep > 1"
          color="grey-darken-1"
          variant="outlined"
          @click="previousStep"
          prepend-icon="mdi-chevron-left"
          size="large"
        >
          Anterior
        </v-btn>
        
        <v-spacer></v-spacer>
        
        <v-btn
          v-if="currentStep < 4"
          color="primary"
          @click="nextStep"
          append-icon="mdi-chevron-right"
          size="large"
          variant="elevated"
        >
          Siguiente
        </v-btn>
        
        <v-btn
          v-if="currentStep === 4"
          color="success"
          :loading="loading"
          @click="handleSubmit"
          prepend-icon="mdi-check-circle"
          size="large"
          variant="elevated"
          class="px-6"
        >
          {{ isEditing ? 'Actualizar Factura' : 'Crear Factura' }}
        </v-btn>
        
        <v-btn
          color="grey"
          variant="text"
          @click="$emit('cancel')"
          size="large"
        >
          Cancelar
        </v-btn>
      </v-card-actions>
    </v-card>
    
    <!-- Snackbar reutilizable para mensajes -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />

    <!-- Dialogo de confirmación eliminar archivo -->
    <v-dialog v-model="showDeleteAttachmentDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">¿Eliminar archivo?</v-card-title>
        <v-card-text>
          Esta acción eliminará el archivo PDF adjunto pero mantendrá el resto de la factura. ¿Desea continuar?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey-darken-1" variant="text" @click="showDeleteAttachmentDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" @click="deleteAttachment">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-form>
</template>

<script>
import invoiceService from '@/services/invoiceService.js';
import userService from '@/services/userService.js';
import clientOcrService from '@/services/clientOcrService.js';
import bcvService from '@/services/bcvService.js';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import FileUploadZone from '@/components/common/FileUploadZone.vue';

import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'ClientInvoiceForm',
  components: {
    AppSnackbar,
    FileUploadZone
  },
  props: {
    invoice: {
      type: Object,
      default: null
    },
    flow: {
      type: String,
      default: 'VENTA' // 'VENTA' | 'COMPRA'
    }
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      valid: false,
      loading: false,
      currentStep: 1,
      showItems: false,
      
      // Eliminar archivo
      showDeleteAttachmentDialog: false,
      attachmentToDeleteIndex: -1,
      deletingAttachmentIndex: -1,
      
      // Archivo subido
      uploadedFile: null,
      extracting: false,
      extractionResult: null,
      
      // Flag para indicar si el IVA fue extraído por IA
      ivaFromAI: false,
      
      // Usuario actual (Cliente)
      currentUser: null,
      
      // Snackbar
      snackbar: {
        show: false,
        message: '',
        type: 'info',
        timeout: 4000
      },
      
      // Datos del formulario
      formData: {
        invoiceNumber: '',
        controlNumber: '',
        documentType: 'FACTURA',
        documentCategory: 'FACTURA', // FACTURA (fiscal) or RECIBO (delivery note)
        flow: 'VENTA',
        expense_type: 'COMPRA',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'BORRADOR',
        
        issuer: {
          companyName: '',
          rif: '',
          taxpayerType: 'PERSONA JURÍDICA',
          phone: '',
          email: '',
          website: '',
          address: ''
        },
        
        client: {
          companyName: '',
          rif: '',
          taxpayerType: 'PERSONA JURÍDICA',
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
      
      documentTypes: [
        'FACTURA',
        'NOTA DE CRÉDITO',
        'NOTA DE DÉBITO',
        'RECIBO',
        'COMPROBANTE'
      ],
      
      documentCategories: [
        'FACTURA',
        'RECIBO'
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
      ],
      
      invoiceStatuses: [
        'BORRADOR',
        'EMITIDA',
        'ENVIADA',
        'PAGADA',
        'VENCIDA',
        'ANULADA'
      ]
    };
  },
  computed: {
    isEditing() {
      return !!this.invoice;
    },
    
    // Campos del emisor son readonly cuando es VENTA (el cliente es el emisor)
    issuerFieldsReadonly() {
      return this.formData.flow === 'VENTA';
    },
    
    // Campos del cliente son readonly cuando es COMPRA o GASTO (el cliente es el receptor)
    clientFieldsReadonly() {
      return this.formData.flow === 'COMPRA' || this.formData.flow === 'GASTO';
    },
    
    availableDocumentTypes() {
      if (this.formData.flow === 'VENTA') {
        return [
          { title: 'Factura de Venta', type: 'FACTURA', category: 'FACTURA', icon: 'mdi-file-document-check', color: 'success', subtitle: 'Para declarar ingresos (Fiscal)' },
          { title: 'Nota de Entrega', type: 'RECIBO', category: 'RECIBO', icon: 'mdi-file-document-outline', color: 'info', subtitle: 'Recibo simple (No Fiscal)' },
          { title: 'Nota de Crédito', type: 'NOTA DE CRÉDITO', category: 'FACTURA', icon: 'mdi-credit-card-refund', color: 'warning', subtitle: 'Devolución al cliente (Fiscal)' }
        ];
      } else {
        return [
          { title: 'Factura de Compra', type: 'FACTURA', category: 'FACTURA', icon: 'mdi-file-document-check', color: 'success', subtitle: 'Para declarar gastos (Fiscal)' },
          { title: 'Nota de Entrega', type: 'RECIBO', category: 'RECIBO', icon: 'mdi-file-document-outline', color: 'info', subtitle: 'Recibo simple (No Fiscal)' },
          { title: 'Nota de Débito', type: 'NOTA DE DÉBITO', category: 'FACTURA', icon: 'mdi-cash-plus', color: 'error', subtitle: 'Cargo adicional (Fiscal)' }
        ];
      }
    },
    
    // Símbolo de moneda dinámico según la selección
    currencySymbol() {
      const symbols = {
        'VES': 'Bs',
        'USD': '$',
        'EUR': '€'
      };
      return symbols[this.formData.financial.currency] || 'Bs';
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
    },
    'formData.issueDate': {
      handler(newDate) {
        if (newDate) {
          this.fetchExchangeRate(newDate);
        }
      }
    },
    'formData.documentType': {
      handler(newType) {
        if (!newType) return;
        // Auto-set category based on type
        // RECIBO is the only non-fiscal type currently
        if (newType === 'RECIBO') {
          this.formData.documentCategory = 'RECIBO';
        } else {
          this.formData.documentCategory = 'FACTURA';
        }
      },
      immediate: true
    }
  },
  async mounted() {
    // Si es una nueva factura, generar número automáticamente
    if (!this.isEditing) {
      try {
        const nextNumber = await invoiceService.getNextInvoiceNumber();
        this.formData.invoiceNumber = nextNumber;
      } catch (error) {
        console.error('❌ Error al generar número de factura:', error);
        this.formData.invoiceNumber = 'F-2024-001';
      }
      
      // Establecer flujo inicial desde prop
      this.formData.flow = this.flow;
    }
    
    // Cargar datos del usuario actual (Cliente)
    await this.loadCurrentUser();
    console.log('✅ ClientInvoiceForm mounted. Checks:', {
        hasDelete: typeof this.confirmDeleteAttachment === 'function',
        methods: this.$options.methods
    });
  },
  methods: {
    async loadCurrentUser() {
      try {
        let user = await userService.getCurrentUser();
        
        // Verificación robusta: Si es cliente y faltan datos, intentar recargar directamente
        if (user && user.role === 'cliente' && !user.client) {
          console.warn('⚠️ [ClientInvoiceForm] Usuario cliente sin datos de perfil, intentando recuperar...');
          try {
            // 1. Verificar client_id en tabla users
            const { data: userProfile } = await supabase
              .from('users')
              .select('client_id')
              .eq('id', user.id)
              .maybeSingle();
              
            if (userProfile && userProfile.client_id) {
              // 2. Obtener datos del cliente
              const { data: clientData } = await supabase
                .from('clients')
                .select('*')
                .eq('id', userProfile.client_id)
                .maybeSingle();
                
              if (clientData) {
                console.log('✅ [ClientInvoiceForm] Datos de cliente recuperados manualmente:', clientData);
                user.client = clientData;
                user.client_id = userProfile.client_id;
              }
            }
          } catch (err) {
            console.error('❌ Error recuperando datos de cliente:', err);
          }
        }
        
        console.log('👤 [ClientInvoiceForm] Usuario cargado:', user);
        this.currentUser = user;
        
        if (user) {
          // Pre-llenar datos según el flujo
          this.handleFlowChange();
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario actual:', error);
      }
    },

    async fetchExchangeRate(date) {
      if (!date) return;
      
      try {
        console.log(`💱 Buscando tasa de cambio para: ${date}`);
        const result = await bcvService.getRateForDate(date);
        
        if (result.success && result.data && result.data.dollar) {
          this.formData.financial.exchangeRate = result.data.dollar;
          this.showSnackbar(`Tasa actualizada: ${result.data.dollar.toFixed(4)} VES/USD`, 'success');
        } else {
          console.warn('⚠️ No se encontró tasa para la fecha, usando actual...');
          // Fallback a tasa actual si falla la histórica
          const currentRate = await bcvService.getCurrentRate();
          if (currentRate.success && currentRate.data && currentRate.data.dollar) {
            this.formData.financial.exchangeRate = currentRate.data.dollar;
            this.showSnackbar(`Usando tasa actual: ${currentRate.data.dollar.toFixed(4)} VES/USD`, 'info');
          }
        }
      } catch (error) {
        console.error('❌ Error al obtener tasa de cambio:', error);
      }
    },
    
    handleFlowChange() {
      console.log('🔄 [ClientInvoiceForm] Cambio de flujo:', this.formData.flow);
      if (!this.currentUser) {
        console.warn('⚠️ [ClientInvoiceForm] No hay usuario actual para auto-llenar datos');
        return;
      }
      
      // Mapear datos del usuario a la estructura de factura
      // Priorizar datos del perfil de cliente si existen
      const clientProfile = this.currentUser.client || {};
      console.log('🏢 [ClientInvoiceForm] Perfil de cliente:', clientProfile);
      
      const userData = {
        companyName: clientProfile.company_name || this.currentUser.companyName || this.currentUser.name,
        rif: clientProfile.rif || this.currentUser.rif || '',
        taxpayerType: clientProfile.taxpayer_type || this.currentUser.taxpayerType || 'PERSONA JURÍDICA',
        phone: clientProfile.phone || this.currentUser.phone || '',
        email: clientProfile.email || this.currentUser.email || '',
        website: clientProfile.website || this.currentUser.website || '',
        address: clientProfile.address || this.currentUser.address || ''
      };
      
      console.log('📋 [ClientInvoiceForm] Datos mapeados para auto-llenado:', userData);
      
      if (this.formData.flow === 'VENTA') {
        // En VENTA, yo soy el Emisor
        this.formData.issuer = { ...userData };
        // Limpiar cliente si es nueva factura
        if (!this.isEditing) {
          this.clearClientData();
        }
      } else {
        // En COMPRA, yo soy el Cliente
        this.formData.client = { ...userData };
        // Limpiar emisor si es nueva factura
        if (!this.isEditing) {
          this.clearIssuerData();
        }
      }
    },
    
    clearClientData() {
      this.formData.client = {
        companyName: '',
        rif: '',
        taxpayerType: 'PERSONA JURÍDICA',
        phone: '',
        email: '',
        website: '',
        address: ''
      };
    },
    
    clearIssuerData() {
      this.formData.issuer = {
        companyName: '',
        rif: '',
        taxpayerType: 'PERSONA JURÍDICA',
        phone: '',
        email: '',
        website: '',
        address: ''
      };
    },
    
    getStatusColor(status) {
      const colors = {
        'BORRADOR': 'grey',
        'EMITIDA': 'blue',
        'ENVIADA': 'cyan',
        'PAGADA': 'green',
        'VENCIDA': 'red',
        'ANULADA': 'black'
      };
      return colors[status] || 'grey';
    },
    
    // Auto-calcular campos financieros
    autoCalculateFinancials() {
      const total = parseFloat(this.formData.financial.totalSales) || 0;
      const exento = parseFloat(this.formData.financial.nonTaxableSales) || 0;
      
      // Base Imponible = Total - Exento
      const baseImponible = Math.max(0, total - exento);
      this.formData.financial.taxableSales = parseFloat(baseImponible.toFixed(2));
      
      // IVA = 16% de la Base Imponible (solo si no fue extraído por IA)
      if (!this.ivaFromAI) {
        const iva = baseImponible * 0.16;
        this.formData.financial.taxDebit = parseFloat(iva.toFixed(2));
      }
      
      console.log('📊 Auto-cálculo financiero:', {
        total,
        exento,
        baseImponible: this.formData.financial.taxableSales,
        iva: this.formData.financial.taxDebit,
        ivaFromAI: this.ivaFromAI
      });
    },
    
    validateStep(step) {
      switch(step) {
        case 1:
          return !!this.formData.invoiceNumber && 
                 !!this.formData.documentType && 
                 !!this.formData.issueDate &&
                 !!this.formData.flow;
        case 2:
          return !!this.formData.issuer.companyName && 
                 !!this.formData.issuer.rif &&
                 !!this.formData.client.companyName && 
                 !!this.formData.client.rif;
        case 3:
          return this.formData.financial.totalSales > 0;
        case 4:
          return true;
        default:
          return true;
      }
    },
    
    async nextStep() {
      const isValid = this.validateStep(this.currentStep);
      
      if (!isValid) {
        let message = 'Por favor complete todos los campos obligatorios';
        
        if (this.currentStep === 1 && !this.formData.flow) {
          message = 'Por favor seleccione el tipo de factura';
        } else if (this.currentStep === 1 && !this.formData.issueDate) {
          message = 'Por favor ingrese la fecha de emisión';
        } else if (this.currentStep === 2) {
          message = 'Por favor complete la información del emisor y cliente';
        } else if (this.currentStep === 3) {
          message = 'Por favor ingrese el monto total';
        }
        
        this.showSnackbar(message, 'error');
        return;
      }
      
      this.currentStep++;
    },
    
    previousStep() {
      this.currentStep--;
    },
    
    showSnackbar(message, type = 'info', timeout = 4000) {
      this.snackbar = {
        show: true,
        message,
        type,
        timeout
      };
    },
    
    handleFileSelect(file) {
      this.uploadedFile = file;
    },
    
    async handleExtractedData(file) {
      if (!file) return;
      
      this.extracting = true;
      this.extractionResult = null;
      
      try {
        // Preparar contexto del usuario para auto-detección
        const userContext = {
            companyName: this.currentUser?.companyName || this.currentUser?.name,
            rif: this.currentUser?.rif
        };

        // Pasar el tipo de flujo (si existe) y contexto al servicio OCR
        const data = await clientOcrService.extractInvoiceData(file, this.formData.flow || null, userContext);
        
        // Si se detectó un flujo y no estaba seleccionado (o era diferente), actualizarlo
        if (data.detectedFlow) {
            console.log(`🤖 Flujo detectado por IA: ${data.detectedFlow}`);
            
            if (!this.formData.flow || this.formData.flow !== data.detectedFlow) {
                this.formData.flow = data.detectedFlow;
                // Actualizar UI y datos según el nuevo flujo
                this.handleFlowChange();
                this.showSnackbar(`Tipo de factura detectado: ${data.detectedFlow}`, 'success');
            }
        }
        
        this.extractionResult = {
          success: true,
          message: 'Datos extraídos correctamente',
          data: data
        };
        
        this.mapExtractedDataToForm(data);
        this.showSnackbar('Datos extraídos exitosamente', 'success');
        
      } catch (error) {
        console.error('❌ Error al extraer datos:', error);
        this.extractionResult = {
          success: false,
          message: `Error: ${error.message}`
        };
        this.showSnackbar('Error al procesar el archivo', 'error');
      } finally {
        this.extracting = false;
      }
    },

    mapExtractedDataToForm(data) {
      console.log('🔄 Mapeando datos extraídos al formulario:', data);
      
      // Reset ivaFromAI flag
      this.ivaFromAI = false;
      
      // 1. Información Básica y Documento
      if (data.invoiceNumber) this.formData.invoiceNumber = data.invoiceNumber;
      if (data.controlNumber) this.formData.controlNumber = data.controlNumber;
      if (data.issueDate) this.formData.issueDate = data.issueDate;
      if (data.dueDate) this.formData.dueDate = data.dueDate;
      
      // Mapeo Inteligente de Document Type
      if (data.documentCategory) {
        this.formData.documentCategory = data.documentCategory; // FACTURA vs RECIBO
        
        // Si detectó tipo específico, tratar de mapearlo
        if (data.documentType) {
          const typeMap = {
            'FACTURA': 'FACTURA',
            'NOTA DE CRÉDITO': 'NOTA DE CRÉDITO',
            'NOTA DE DÉBITO': 'NOTA DE DÉBITO',
            'RECIBO': 'RECIBO',
            'COMPROBANTE': 'RECIBO'
          };
          // Solo asignar si es un tipo conocido, sino dejar default
          if (typeMap[data.documentType?.toUpperCase()]) {
             this.formData.documentType = typeMap[data.documentType.toUpperCase()];
          }
        }
      }

      // 2. Mapeo Inteligente de Flujo (Si se detectó con alta confianza)
      // Solo cambiamos el flujo si el usuario no ha avanzado mucho o explícitamente aceptamos recomendaciones
      if (data.detectedFlow && data.confidence > 0.8) {
        console.log(`🤖 Flujo sugerido por IA: ${data.detectedFlow}`);
        // Nota: Cambiar el flijo programáticamente puede ser intrusivo, 
        // idealmente deberíamos preguntar, pero por ahora lo asignamos si coincide con lógica simple
        this.formData.flow = data.detectedFlow;
      }
      
      // 3. Datos de Partes (Emisor/Cliente)
      const targetParty = this.formData.flow === 'VENTA' ? 'client' : 'issuer';
      const sourceParty = this.formData.flow === 'VENTA' ? data.client : data.issuer;
      
      if (sourceParty) {
         if (sourceParty.companyName) this.formData[targetParty].companyName = sourceParty.companyName;
         if (sourceParty.rif) this.formData[targetParty].rif = sourceParty.rif;
         if (sourceParty.address) this.formData[targetParty].address = sourceParty.address;
         if (sourceParty.phone) this.formData[targetParty].phone = sourceParty.phone;
         if (sourceParty.email) this.formData[targetParty].email = sourceParty.email;
         if (sourceParty.website) this.formData[targetParty].website = sourceParty.website;
         // Taxpayer Type si viene
         if (sourceParty.taxpayerType) this.formData[targetParty].taxpayerType = sourceParty.taxpayerType;
      }

      // 4. Items
      if (data.items && data.items.length > 0) {
        this.formData.items = data.items.map(item => ({
          description: item.description || 'Item sin descripción',
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          total: parseFloat(item.amount) || ((parseFloat(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0))
        }));
        this.showItems = true;
      }
      
      // 5. Financiero (Mapeo Completo)
      if (data.financial) {
        if (data.financial.total !== undefined) this.formData.financial.totalSales = parseFloat(data.financial.total);
        if (data.financial.exemptAmount !== undefined) this.formData.financial.nonTaxableSales = parseFloat(data.financial.exemptAmount);
        if (data.financial.taxableAmount !== undefined) this.formData.financial.taxableSales = parseFloat(data.financial.taxableAmount);
        if (data.financial.igtf !== undefined) this.formData.financial.igtf = parseFloat(data.financial.igtf);
        
        // Retenciones
        if (data.financial.ivaRetention !== undefined) this.formData.financial.ivaRetention = parseFloat(data.financial.ivaRetention);
        if (data.financial.islrRetention !== undefined) this.formData.financial.islrRetention = parseFloat(data.financial.islrRetention);
        
        // IVA (manejo especial flag)
        if (data.financial.taxAmount !== undefined) {
           this.formData.financial.taxDebit = parseFloat(data.financial.taxAmount);
           this.ivaFromAI = true;
        }
      } else {
        // Fallback a estructura plana antigua si no viene 'financial' (retrocompatibilidad)
        if (data.total) this.formData.financial.totalSales = data.total;
        if (data.subtotal) this.formData.financial.taxableSales = data.subtotal;
        if (data.tax) {
            this.formData.financial.taxDebit = data.tax;
            this.ivaFromAI = true;
        }
      }
      
      // Moneda
      if (data.currency) this.formData.financial.currency = data.currency;

      // 6. Notas
      if (data.notes) this.formData.notes = data.notes;
      
      // Notificar éxito
      this.showSnackbar('Datos extraídos con IA correctamente', 'success');
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
    
    async confirmDeleteAttachment(index) {
        this.attachmentToDeleteIndex = index;
        this.showDeleteAttachmentDialog = true;
    },

    async deleteAttachment() {
        if (this.attachmentToDeleteIndex === -1) return;
        
        const index = this.attachmentToDeleteIndex;
        const attachment = this.formData.attachments[index];
        
        this.showDeleteAttachmentDialog = false; // Cerrar dialogo
        this.deletingAttachmentIndex = index; // Mostrar spinner en el item específico
        
        try {
            // 1. Eliminar de Supabase Storage
            if (attachment.path) {
                const res = await invoiceService.deleteAttachment(attachment.path);
                if (!res.success) {
                    throw new Error(res.message);
                }
            }
            
            // 2. Eliminar del array local
            this.formData.attachments.splice(index, 1);
            
            // 3. Si estamos en modo EDICIÓN, actualizar el registro inmediatamente para que persista
            if (this.isEditing && this.invoice && this.invoice.id) {
               // IMPORTANTE: Enviar TODO el formData, no solo attachments, para evitar sobrescribir con nulls
               // si el servicio espera un objeto completo o rellena con defaults.
               await invoiceService.updateInvoice(this.invoice.id, { 
                   ...this.formData,
                   attachments: this.formData.attachments 
               });
            }
            
            this.showSnackbar('Archivo eliminado correctamente', 'success');
            
        } catch (error) {
            console.error('Error eliminando archivo:', error);
            this.showSnackbar('Error al eliminar el archivo: ' + error.message, 'error');
        } finally {
             this.deletingAttachmentIndex = -1;
             this.attachmentToDeleteIndex = -1;
        }
    },

    async handleSubmit() {
      if (!this.$refs.form.validate()) {
        this.showSnackbar('Por favor complete todos los campos obligatorios', 'error');
        return;
      }
      
      this.loading = true;
      
      try {
        // Para clientes, el clientId es su propio ID (que el backend debería manejar o extraer del token/contexto)
        // Pero para mantener compatibilidad con el servicio existente:
        // Si es VENTA: client_id es el ID del cliente al que le vendo (pero aquí no tengo IDs, solo texto)
        // Si es COMPRA: client_id soy YO.
        
        // IMPORTANTE: El backend actual probablemente espera un clientId válido de la tabla de clientes.
        // Si el sistema permite "clientes ocasionales" (sin ID), esto funcionará.
        // Si no, tendremos un problema. Asumiremos que el backend maneja la creación de factura
        // asociándola al usuario autenticado como "dueño" de la factura.
        
        const invoiceData = {
          ...this.formData,
          // No enviamos clientId explícito porque:
          // 1. Si es Venta, el cliente es un string (nombre), no un ID de base de datos.
          // 2. Si es Compra, yo soy el cliente, y el backend sabe quién soy por el token.
          clientId: this.currentUser?.id || null, 
          flow: this.formData.flow
        };

        // SUBIR ARCHIVO ADJUNTO SI EXISTE
        if (this.uploadedFile) {
           this.loading = true; // Asegurar loading
           try {
             const uploadRes = await invoiceService.uploadAttachment(this.uploadedFile);
             if (uploadRes.success) {
                // Agregar a adjuntos. Mantenemos array por si en futuro son múltiples
                invoiceData.attachments = [uploadRes]; 
             } else {
                throw new Error('Error al subir el archivo: ' + uploadRes.message);
             }
           } catch (uploadError) {
             console.error('Error subiendo archivo:', uploadError);
             this.showSnackbar('Error al subir el documento: ' + uploadError.message, 'error');
             this.loading = false;
             return; // Detener guardado si falla subida
           }
        }
        
        let response;
        if (this.isEditing) {
          response = await invoiceService.updateInvoice(this.invoice.id, invoiceData);
        } else {
          response = await invoiceService.createInvoice(invoiceData);
        }
        
        if (response.success) {
          this.$emit('submit', {
            success: true,
            data: response.data,
            message: response.message
          });
        } else {
          this.$emit('submit', {
            success: false,
            message: response.message || 'Error al guardar la factura'
          });
        }
      } catch (error) {
        console.error('❌ Error inesperado:', error);
        this.$emit('submit', {
          success: false,
          message: 'Error inesperado al guardar la factura'
        });
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
/* Copia de estilos de InvoiceForm.vue */
.v-stepper { box-shadow: none !important; }
.v-stepper-header { box-shadow: none !important; border-bottom: 1px solid #e0e0e0; }
.v-stepper-item { padding: 16px; }
.v-stepper-window {
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #ccc #f5f5f5;
  margin-bottom: 20px;
}
.v-card { border-radius: 12px; border: 1px solid #e0e0e0 !important; }
.v-card-title { background-color: #f5f5f5; border-radius: 12px 12px 0 0; }
.v-text-field .v-field, .v-select .v-field, .v-textarea .v-field {
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
}
.v-text-field .v-field:hover, .v-select .v-field:hover { border: 1px solid #bdbdbd !important; }
.v-text-field .v-field--focused, .v-select .v-field--focused {
  border: 2px solid #1976d2 !important;
  box-shadow: 0 0 0 1px rgba(25, 118, 210, 0.1) !important;
}
.items-card { border: 1px solid #e3f2fd !important; background-color: #fafafa; min-height: 60px; }
.v-btn { border-radius: 8px; text-transform: none; font-weight: 500; }
.v-btn--variant-outlined { border: 1px solid #e0e0e0 !important; background-color: #ffffff !important; }
.v-card-actions { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; background-color: #fafafa; }
.animated-field { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.animated-field:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.animated-field:focus-within { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(25, 118, 210, 0.15); }
.expand-enter-active, .expand-leave-active { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden; }
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; transform: translateY(-10px); }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 1000px; transform: translateY(0); }
.item-list-enter-active, .item-list-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.item-list-enter-from { opacity: 0; transform: translateX(-30px) scale(0.95); }
.item-list-leave-to { opacity: 0; transform: translateX(30px) scale(0.95); }
</style>
