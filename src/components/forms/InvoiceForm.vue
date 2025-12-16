<template>
  <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-receipt-long</v-icon>
        {{ isEditing ? 'Editar Factura' : 'Nueva Factura' }}
      </v-card-title>
      
      <!-- Stepper para navegación por pasos -->
      <v-stepper v-model="currentStep" flat class="elevation-0">
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
                      <span class="font-weight-medium">Escanear Factura con IA</span>
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

              <!-- Selector de Tipo de Flujo - Destacado -->
              <!-- Selector de Tipo de Flujo -->
              <v-sheet variant="outlined" class="mb-6 rounded-lg border-2 pa-4">
                <div class="d-flex align-center mb-4">
                  <v-icon color="primary" size="24" class="mr-2">mdi-swap-horizontal-circle</v-icon>
                  <span class="text-h6 font-weight-medium">Tipo de Factura</span>
                  <v-chip size="small" color="primary" variant="tonal" class="ml-2">Requerido</v-chip>
                </div>
                
                <v-radio-group
                  v-model="formData.flow"
                  inline
                  :rules="[v => !!v || 'Debe seleccionar el tipo de factura']"
                  required
                  hide-details="auto"
                >
                  <v-radio
                    value="VENTA"
                    color="success"
                  >
                    <template v-slot:label>
                      <div class="d-flex align-center pa-3 border-2 rounded-lg bg-green-lighten-5" style="min-width: 200px; border-color: #4caf50;">
                        <v-icon color="success" size="32" class="mr-3">mdi-cash-plus</v-icon>
                        <div>
                          <div class="text-subtitle-1 font-weight-bold text-green-darken-3">Venta</div>
                          <div class="text-caption text-green-darken-1">Factura emitida a cliente</div>
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
                      <div class="d-flex align-center pa-3 border-2 rounded-lg bg-blue-lighten-5" style="min-width: 200px; border-color: #2196f3;">
                        <v-icon color="primary" size="32" class="mr-3">mdi-cash-minus</v-icon>
                        <div>
                          <div class="text-subtitle-1 font-weight-bold text-blue-darken-3">Compra</div>
                          <div class="text-caption text-blue-darken-1">Factura recibida de proveedor</div>
                        </div>
                      </div>
                    </template>
                  </v-radio>
                </v-radio-group>
              </v-sheet>

              <!-- Selector de Tipo de Egreso - Solo para COMPRA -->
              <v-sheet 
                v-if="formData.flow === 'COMPRA'" 
                variant="outlined" 
                class="mb-6 rounded-lg border-2 pa-4"
                style="border-color: #ff9800 !important;"
              >
                <div class="d-flex align-center mb-4">
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
                      <div class="d-flex align-center pa-3 border-2 rounded-lg bg-blue-lighten-5" style="min-width: 220px; border-color: #2196f3;">
                        <v-icon color="info" size="28" class="mr-3">mdi-cart</v-icon>
                        <div>
                          <div class="text-subtitle-1 font-weight-bold text-blue-darken-3">Compra</div>
                          <div class="text-caption text-blue-darken-1">Mercancía, productos, servicios</div>
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
                      <div class="d-flex align-center pa-3 border-2 rounded-lg bg-orange-lighten-5" style="min-width: 220px; border-color: #ff9800;">
                        <v-icon color="warning" size="28" class="mr-3">mdi-receipt</v-icon>
                        <div>
                          <div class="text-subtitle-1 font-weight-bold text-orange-darken-4">Gasto</div>
                          <div class="text-caption text-orange-darken-3">Servicios recurrentes (luz, agua, etc.)</div>
                        </div>
                      </div>
                    </template>
                  </v-radio>
                </v-radio-group>
              </v-sheet>

              <!-- Estado de la Factura -->
              <v-select
                v-model="formData.status"
                :items="invoiceStatuses"
                label="Estado de la Factura"
                variant="outlined"
                class="mb-6"
                prepend-inner-icon="mdi-list-status"
                hide-details="auto"
              >
                <template v-slot:selection="{ item }">
                  <v-chip :color="getStatusColor(item.raw)" size="small" class="font-weight-bold">
                    {{ item.raw }}
                  </v-chip>
                </template>
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon :color="getStatusColor(item.raw)" size="small">mdi-circle</v-icon>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

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
                    prepend-inner-icon="mdi-receipt-text"
                    hint="Ej: F-2024-001"
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
                <v-col cols="12" md="4">
                  <v-select
                    v-model="formData.documentType"
                    :items="documentTypes"
                    label="Tipo de Documento"
                    :rules="[v => !!v || 'El tipo de documento es requerido']"
                    required
                    variant="outlined"
                    class="animated-field"
                    prepend-inner-icon="mdi-file-document"
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
                    prepend-inner-icon="mdi-calendar"
                    hint="Fecha en que se emite la factura"
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
              </v-row>
            </v-container>
          </v-stepper-window-item>

          <!-- Paso 2: Emisor y Cliente -->
          <v-stepper-window-item :value="2">
            <v-container fluid class="pa-6">
              <!-- Selector de Cliente -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title>
                  <v-icon left>mdi-account-multiple</v-icon>
                  Seleccionar Cliente
                  <v-spacer></v-spacer>
                  <v-chip 
                    v-if="currentUser" 
                    :color="canSelectClients ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ currentUser.name }} ({{ currentUser.role }})
                  </v-chip>
                </v-card-title>
                <v-card-text>
                  <v-select
                    v-if="canSelectClients"
                    v-model="selectedClientId"
                    :items="clients"
                    item-title="companyName"
                    item-value="id"
                    label="Cliente"
                    :loading="loadingClients"
                    :rules="[v => !!v || 'Debe seleccionar un cliente']"
                    required
                    variant="outlined"
                    @update:model-value="onClientChange"
                    prepend-icon="mdi-account-search"
                  >
                    <template v-slot:item="{ props, item }">
                      <v-list-item v-bind="props">
                        <template v-slot:title>
                          {{ item.raw.companyName }}
                        </template>
                        <template v-slot:subtitle>
                          RIF: {{ item.raw.rif }} | {{ item.raw.email }}
                        </template>
                      </v-list-item>
                    </template>
                    <template v-slot:selection="{ item }">
                      <span>{{ item.raw.companyName }}</span>
                    </template>
                  </v-select>
                  
                  <v-alert
                    v-else
                    type="info"
                    variant="tonal"
                    class="mt-2"
                  >
                    <v-icon left>mdi-information</v-icon>
                    Solo usuarios con rol de Administrador o Contador pueden seleccionar clientes.
                    Su rol actual: {{ currentUser?.role || 'No identificado' }}
                  </v-alert>
                  
                  <v-alert
                    v-if="clients.length === 0 && !loadingClients && canSelectClients"
                    type="warning"
                    variant="tonal"
                    class="mt-2"
                  >
                    <v-icon left>mdi-alert</v-icon>
                    No hay clientes registrados. Debe crear al menos un cliente antes de crear facturas.
                  </v-alert>
                </v-card-text>
              </v-card>

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
            </v-container>
          </v-stepper-window-item>

          <!-- Paso 3: Detalles Financieros -->
          <v-stepper-window-item :value="3">
            <v-container fluid class="pa-6">
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
  </v-form>
</template>

<script>
import invoiceService from '@/services/invoiceService.js';
import clientService from '@/services/clientService.js';
import userService from '@/services/userService.js';
import adminOcrService from '@/services/adminOcrService.js';
import bcvService from '@/services/bcvService.js';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import FileUploadZone from '@/components/common/FileUploadZone.vue';

export default {
  name: 'InvoiceForm',
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
    },
    autoPartyMode: {
      type: Boolean,
      default: true
    },
    organizationOnly: {
      type: Boolean,
      default: false // Si es true, la factura es de la organización (sin client_id)
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
      
      // Clientes
      clients: [],
      selectedClientId: null,
      loadingClients: false,
      
      // Usuario actual
      currentUser: null,
      canSelectClients: false,
      
      // Snackbar para mensajes
      snackbar: {
        show: false,
        message: '',
        type: 'info', // 'success', 'error', 'warning', 'info'
        timeout: 4000
      },
      
      // Datos del formulario
      formData: {
        invoiceNumber: '',
        controlNumber: '',
        documentType: 'FACTURA',
        documentCategory: 'FACTURA', // FACTURA (fiscal) or RECIBO (delivery note)
        flow: 'VENTA', // Tipo de flujo: VENTA o COMPRA
        expense_type: 'COMPRA', // Tipo de egreso: COMPRA o GASTO (solo para flow=COMPRA)
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        status: 'BORRADOR',
        
        issuer: {
          companyName: 'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
          rif: 'J-12345678-9',
          taxpayerType: 'PERSONA JURÍDICA',
          phone: '+58 212 123-4567',
          email: 'info@empresa.com',
          website: 'www.empresa.com',
          address: 'Av. Principal, Edificio Empresarial, Piso 5, Caracas, Venezuela'
        },
        
        client: {
          companyName: 'CLÍNICA ESPECIALIZADA DEL CARIBE',
          rif: 'J-98765432-1',
          taxpayerType: 'PERSONA JURÍDICA',
          phone: '+58 212 987-6543',
          email: 'contacto@clinica.com',
          website: 'www.clinica.com',
          address: 'Av. Libertador, Centro Médico, Piso 3, Caracas, Venezuela'
        },
        
        financial: {
          totalSales: 100000,
          nonTaxableSales: 0,
          taxableSales: 100000,
          taxDebit: 16000,
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
          // Si es una factura existente, establecer el cliente seleccionado
          if (newInvoice.clientId) {
            this.selectedClientId = newInvoice.clientId;
          }
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
    }
  },
  async mounted() {
    // Si es una nueva factura, generar número automáticamente
    if (!this.isEditing) {
      try {
        const nextNumber = await invoiceService.getNextInvoiceNumber();
        this.formData.invoiceNumber = nextNumber;
        console.log('🔢 Número de factura generado:', nextNumber);
      } catch (error) {
        console.error('❌ Error al generar número de factura:', error);
        this.formData.invoiceNumber = 'F-2024-001';
      }
    }
    
    // Cargar lista de clientes
    await this.loadClients();
    
    // Cargar usuario actual y validar permisos
    await this.loadCurrentUser();

    // Ajustar modo auto party: ocultar edición de emisor/cliente y solo seleccionar cliente si corresponde
    if (this.autoPartyMode) {
      // Si organizationOnly es true, no seleccionar cliente (factura de la organización)
      if (this.organizationOnly) {
        this.selectedClientId = null
        this.canSelectClients = false
      } else if (!this.canSelectClients) {
        this.selectedClientId = null
      }
    }
  },
  methods: {
    async loadClients() {
      try {
        this.loadingClients = true;
        console.log('🔄 Cargando lista de clientes...');
        
        const clients = await clientService.getClients();
        this.clients = clients;
        
        console.log('✅ Clientes cargados:', clients.length);
        
        // Si hay clientes, seleccionar el primero por defecto (solo si puede elegir)
        if (this.canSelectClients && clients.length > 0 && !this.selectedClientId) {
          this.selectedClientId = clients[0].id;
          this.updateClientInfo(clients[0]);
          console.log('👤 Cliente seleccionado por defecto:', clients[0].companyName);
        }
      } catch (error) {
        console.error('❌ Error al cargar clientes:', error);
        this.clients = [];
      } finally {
        this.loadingClients = false;
      }
    },
    
    async loadCurrentUser() {
      try {
        console.log('🔄 Cargando usuario actual...');
        
        const user = await userService.getCurrentUser();
        this.currentUser = user;
        
        if (user) {
          // Verificar si el usuario puede seleccionar clientes (admin o contador)
          this.canSelectClients = user.role === 'admin' || user.role === 'contador';
          console.log('👤 Usuario actual:', user.name, 'Rol:', user.role);
          console.log('🔐 Puede seleccionar clientes:', this.canSelectClients);
        } else {
          console.warn('⚠️ No se pudo obtener el usuario actual');
          this.canSelectClients = false;
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario actual:', error);
        this.canSelectClients = false;
      }
    },
    
    updateClientInfo(client) {
      if (client) {
        this.formData.client = {
          companyName: client.companyName,
          rif: client.rif,
          taxpayerType: client.taxpayerType,
          phone: client.phone,
          email: client.email,
          website: client.website,
          address: client.address
        };
        console.log('📝 Información del cliente actualizada:', client.companyName);
      }
    },
    
    onClientChange() {
      const selectedClient = this.clients.find(client => client.id === this.selectedClientId);
      if (selectedClient) {
        this.updateClientInfo(selectedClient);
      }
    },
    
    // Métodos de navegación con validación
    validateStep(step) {
      switch(step) {
        case 1:
          // Validar información básica
          return !!this.formData.invoiceNumber && 
                 !!this.formData.documentType && 
                 !!this.formData.issueDate &&
                 !!this.formData.flow;
        case 2:
          // Validar emisor y cliente
          return !!this.formData.issuer.companyName && 
                 !!this.formData.issuer.rif &&
                 !!this.formData.client.companyName && 
                 !!this.formData.client.rif;
        case 3:
          // Validar financiero
          return this.formData.financial.totalSales > 0;
        case 4:
          // Paso final, siempre válido
          return true;
        default:
          return true;
      }
    },
    
    async nextStep() {
      const isValid = this.validateStep(this.currentStep);
      
      if (!isValid) {
        // Mostrar mensaje de error
        let message = 'Por favor complete todos los campos obligatorios';
        
        if (this.currentStep === 1 && !this.formData.flow) {
          message = 'Por favor seleccione el tipo de factura (Venta o Compra)';
        } else if (this.currentStep === 1 && !this.formData.issueDate) {
          message = 'Por favor ingrese la fecha de emisión';
        } else if (this.currentStep === 2) {
          message = 'Por favor complete la información del emisor y cliente';
        } else if (this.currentStep === 3) {
          message = 'Por favor ingrese el monto total de la factura';
        }
        
        // Mostrar snackbar con el error
        this.showSnackbar(message, 'error');
        console.warn('⚠️ Validación fallida en paso', this.currentStep, ':', message);
        return;
      }
      
      this.currentStep++;
      console.log('✅ Avanzando al paso', this.currentStep);
    },
    
    previousStep() {
      this.currentStep--;
      console.log('⬅️ Retrocediendo al paso', this.currentStep);
    },
    
    // Método helper para mostrar snackbar
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
      console.log('Archivo seleccionado:', file);
    },
    
    async handleExtractedData(file) {
      if (!file) return;
      
      this.extracting = true;
      this.extractionResult = null;
      
      try {
        console.log('🚀 Iniciando extracción de datos desde InvoiceForm...');
        const data = await ocrService.extractInvoiceData(file);
        
        this.extractionResult = {
          success: true,
          message: 'Datos extraídos correctamente',
          data: data
        };
        
        // Mapear datos extraídos al formulario
        this.mapExtractedDataToForm(data);
        
        this.showSnackbar('Datos extraídos correctamente. Por favor verifique la información.', 'success');
        
      } catch (error) {
        console.error('❌ Error en extracción:', error);
        this.extractionResult = {
          success: false,
          message: 'Error al procesar el archivo: ' + error.message
        };
        this.showSnackbar('Error al procesar el archivo', 'error');
      } finally {
        this.extracting = false;
      }
    },

    async fetchExchangeRate(date) {
      if (!date) return;
      
      try {
        console.log(`💱 Buscando tasa de cambio para: ${date}`);
        const result = await bcvService.getRateForDate(date);
        
        if (result && result.success && result.data && result.data.dollar) {
          this.formData.financial.exchangeRate = result.data.dollar;
          this.showSnackbar(`Tasa actualizada: ${result.data.dollar.toFixed(4)} VES/USD`, 'success');
        } else {
          console.warn('⚠️ No se encontró tasa para la fecha, usando actual...');
          // Fallback a tasa actual si falla la histórica
          const currentRate = await bcvService.getCurrentRate();
          if (currentRate && currentRate.success && currentRate.data && currentRate.data.dollar) {
            this.formData.financial.exchangeRate = currentRate.data.dollar;
            this.showSnackbar(`Usando tasa actual: ${currentRate.data.dollar.toFixed(4)} VES/USD`, 'info');
          } else {
             this.showSnackbar('No se pudo obtener la tasa de cambio. Ingrese manualmente.', 'warning');
          }
        }
      } catch (error) {
        console.error('❌ Error al obtener tasa de cambio:', error);
        this.showSnackbar('Error al obtener tasa. Ingrese manualmente.', 'warning');
      }
    },

    mapExtractedDataToForm(data) {
      console.log('🗺️ Mapeando datos extraídos al formulario...', data);
      
      // 1. Información Básica
      if (data.invoiceNumber) this.formData.invoiceNumber = data.invoiceNumber;
      if (data.issueDate) this.formData.issueDate = data.issueDate;
      if (data.dueDate) this.formData.dueDate = data.dueDate;
      if (data.currency) this.formData.financial.currency = data.currency;
      
      // 2. Cliente
      if (data.client) {
        // Intentar buscar cliente existente por RIF
        if (data.client.rif) {
          const existingClient = this.clients.find(c => 
            c.rif.replace(/\s/g, '').toUpperCase() === data.client.rif.replace(/\s/g, '').toUpperCase()
          );
          
          if (existingClient) {
            console.log('✅ Cliente existente encontrado:', existingClient.companyName);
            this.selectedClientId = existingClient.id;
            this.updateClientInfo(existingClient);
          } else {
            console.log('⚠️ Cliente no encontrado, llenando datos manualmente');
            // Llenar datos para nuevo cliente
            if (data.client.companyName) this.formData.client.companyName = data.client.companyName;
            if (data.client.rif) this.formData.client.rif = data.client.rif;
            if (data.client.address) this.formData.client.address = data.client.address;
            if (data.client.phone) this.formData.client.phone = data.client.phone;
            if (data.client.email) this.formData.client.email = data.client.email;
            
            // Limpiar selección de cliente existente
            this.selectedClientId = null;
          }
        }
      }
      
      // 3. Emisor (Proveedor)
      if (data.issuer) {
        if (data.issuer.companyName) this.formData.issuer.companyName = data.issuer.companyName;
        if (data.issuer.rif) this.formData.issuer.rif = data.issuer.rif;
      }
      
      // 4. Items
      if (data.items && data.items.length > 0) {
        this.formData.items = data.items.map(item => ({
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          total: item.amount || (item.quantity * item.unitPrice) || 0
        }));
        this.showItems = true;
      }
      
      // 5. Financiero
      if (data.total) this.formData.financial.totalSales = data.total;
      if (data.subtotal) this.formData.financial.taxableSales = data.subtotal;
      if (data.tax) this.formData.financial.taxDebit = data.tax;
      
      // 6. Notas
      if (data.notes) {
        this.formData.notes = data.notes;
      }
      
      console.log('✅ Mapeo completado. Formulario actualizado.');
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
      if (!this.$refs.form.validate()) {
        console.log('❌ Formulario no válido, no se puede enviar');
        this.showSnackbar('Por favor complete todos los campos obligatorios', 'error');
        return;
      }
      
      // Si organizationOnly es true, no requerir clientId
      if (!this.organizationOnly && this.canSelectClients && !this.selectedClientId) {
        // Si no hay cliente seleccionado, pero hay datos de cliente llenos manualmente (caso OCR nuevo cliente)
        // Podríamos permitirlo o requerir crear el cliente primero.
        // Por ahora, asumimos que si hay datos manuales es válido para "cliente ocasional" o similar,
        // pero la lógica original requería seleccionar un cliente de la lista.
        // Vamos a mantener la validación original pero con un warning si hay datos.
        
        console.log('❌ No se ha seleccionado un cliente');
        this.showSnackbar('Por favor seleccione un cliente antes de crear la factura', 'error');
        return;
      }
      
      console.log('📝 Datos del formulario a enviar:', this.formData);
      console.log('👤 Cliente seleccionado ID:', this.selectedClientId);
      console.log('🔐 Puede seleccionar clientes:', this.canSelectClients);
      console.log('🏢 Organización solamente:', this.organizationOnly);
      
      this.loading = true;
      
      try {
        let response;
        // Si organizationOnly es true, pasar null explícitamente para clientId
        const clientId = this.organizationOnly ? null : (this.canSelectClients ? this.selectedClientId : null);
        const invoiceData = {
          ...this.formData,
          clientId: clientId,
          flow: this.flow
        };
        
        if (this.isEditing) {
          console.log('🔄 Actualizando factura existente...');
          response = await invoiceService.updateInvoice(this.invoice.id, invoiceData);
        } else {
          console.log('🔄 Creando nueva factura...');
          response = await invoiceService.createInvoice(invoiceData);
        }
        
        console.log('📨 Respuesta del servicio:', response);
        
        // El servicio ahora devuelve { success: boolean, data: object, message: string }
        if (response.success) {
          console.log('✅ Factura guardada exitosamente');
          this.$emit('submit', {
            success: true,
            data: response.data,
            message: response.message
          });
        } else {
          console.error('❌ Error al guardar factura:', response.message);
          this.$emit('submit', {
            success: false,
            message: response.message || 'Error al guardar la factura'
          });
        }
      } catch (error) {
        console.error('❌ Error inesperado al guardar factura:', error);
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