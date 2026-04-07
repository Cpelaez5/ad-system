<template>
  <v-card class="sif-card" @submit.prevent="handleSubmit">
  <v-form ref="form">

    <!-- ═══════════════════════════════════════════════════════╗
         HEADER                                               
    ═══════════════════════════════════════════════════════════ -->
    <!-- HEADER fijo -->
    <v-card-title class="sif-header pa-5 pb-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-3">
          <v-avatar color="primary" size="44">
            <v-icon color="white" size="24">mdi-receipt-text-plus</v-icon>
          </v-avatar>
          <div>
            <div class="text-h6 font-weight-bold text-grey-darken-3">
              {{ isEditing ? 'Editar Registro' : 'Nuevo Registro' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Completa los datos de tu factura, recibo o comprobante
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="grey" @click="$emit('cancel')" />
      </div>
    </v-card-title>

    <v-divider />

    <!-- CUERPO scrollable (v-card-text maneja el scroll automáticamente con scrollable en el dialog) -->
    <v-card-text class="sif-body pa-0">

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 0: ESCANEAR CON IA (siempre visible arriba)
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section sif-ocr-banner" :class="{ 'sif-ocr-active': ocrPanelOpen }">
        <div
          class="d-flex align-center justify-space-between cursor-pointer"
          @click="ocrPanelOpen = !ocrPanelOpen"
        >
          <div class="d-flex align-center gap-2">
            <v-icon color="primary" size="22">mdi-robot-outline</v-icon>
            <span class="font-weight-medium text-body-2">
              📄 ¿Tienes la factura en papel o PDF? <strong>Deja que la IA la lea por ti</strong>
            </span>
            <v-chip size="x-small" color="success" variant="tonal">Opcional</v-chip>
          </div>
          <v-icon :class="ocrPanelOpen ? 'sif-chevron-up' : ''">mdi-chevron-down</v-icon>
        </div>

        <!-- Panel OCR expandible -->
        <v-expand-transition>
          <div v-if="ocrPanelOpen" class="mt-4">
            <FileUploadZone
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              :max-size-m-b="10"
              :loading="extracting"
              loading-message="Leyendo tu documento..."
              @file-selected="handleFileSelect"
              @extract-data="handleExtractedData"
            />

            <!-- Preview del archivo -->
            <v-fade-transition>
              <v-card v-if="uploadedFile" class="mt-3 border" variant="outlined" color="primary">
                <v-card-text class="py-2 px-3 d-flex align-center">
                  <v-icon color="primary" class="mr-2">mdi-file-document-outline</v-icon>
                  <span class="text-body-2 font-weight-medium">{{ uploadedFile.name }}</span>
                  <v-spacer />
                  <v-btn icon="mdi-close" size="x-small" variant="text" color="error" @click="uploadedFile = null" />
                </v-card-text>
              </v-card>
            </v-fade-transition>

            <!-- Resultado OCR por etapas -->
            <v-fade-transition>
              <v-card v-if="ocrResult" class="mt-3" :color="ocrResult.success ? 'green-lighten-5' : 'red-lighten-5'" flat>
                <v-card-text class="pa-3">
                  <div class="d-flex align-center mb-2">
                    <v-icon :color="ocrResult.success ? 'success' : 'error'" class="mr-2">
                      {{ ocrResult.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                    </v-icon>
                    <span class="font-weight-medium text-body-2">
                      {{ ocrResult.success ? 'Documento leído con éxito' : 'No se pudo leer el documento' }}
                    </span>
                  </div>
                  <!-- Resumen de lo extraído -->
                  <div v-if="ocrResult.success && ocrResult.summary" class="pl-2">
                    <div
                      v-for="(item, i) in ocrResult.summary"
                      :key="i"
                      class="d-flex align-center gap-1 text-caption mb-1"
                    >
                      <v-icon :color="item.found ? 'success' : 'warning'" size="14">
                        {{ item.found ? 'mdi-check' : 'mdi-alert' }}
                      </v-icon>
                      <span :class="item.found ? 'text-success' : 'text-warning'">{{ item.label }}:</span>
                      <span class="text-grey-darken-2">{{ item.value }}</span>
                    </div>
                  </div>
                  <div v-if="!ocrResult.success" class="text-caption text-error pl-2">
                    {{ ocrResult.message }}
                  </div>
                </v-card-text>
              </v-card>
            </v-fade-transition>
          </div>
        </v-expand-transition>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 1: TIPO DE REGISTRO
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <p class="sif-section-label">¿Qué tipo de registro es?</p>
        <v-row dense>
          <v-col
            v-for="opt in flowOptions"
            :key="opt.value + (opt.expenseType || '')"
            cols="12" sm="4"
          >
            <div
              class="sif-flow-card"
              :class="{ 'sif-flow-card--active': isFlowActive(opt) }"
              :style="isFlowActive(opt) ? `border-color: ${opt.color}; background: ${opt.bg}` : ''"
              @click="selectFlow(opt)"
              role="button"
              :tabindex="0"
              @keydown.enter="selectFlow(opt)"
            >
              <v-icon :color="isFlowActive(opt) ? opt.color : 'grey'" size="30" class="mb-1">
                {{ opt.icon }}
              </v-icon>
              <div class="font-weight-bold text-body-2" :style="isFlowActive(opt) ? `color: ${opt.color}` : ''">
                {{ opt.label }}
              </div>
              <div class="text-caption text-grey">{{ opt.subtitle }}</div>
            </div>
          </v-col>
        </v-row>
        <div v-if="showFlowError" class="text-error text-caption mt-1 ml-1">
          Por favor selecciona el tipo de registro
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 2: DATOS DEL DOCUMENTO
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <p class="sif-section-label">Datos del documento</p>
        <v-row dense>
          <!-- Número de factura -->
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="formData.invoiceNumber"
              label="Número de factura o recibo"
              placeholder="Ej: FAC-2024-001"
              variant="outlined"
              density="comfortable"
              :rules="invoiceNumberRules"
              :loading="checkingDuplicate"
              :append-inner-icon="isDuplicate ? 'mdi-alert-circle' : (formData.invoiceNumber && !checkingDuplicate ? 'mdi-check-circle' : undefined)"
              :color="isDuplicate ? 'error' : 'primary'"
              hide-details="auto"
              class="mb-2"
            >
              <template v-if="isDuplicate" v-slot:details>
                <span class="text-error text-caption">⚠️ Ya existe una factura con este número</span>
              </template>
            </v-text-field>
          </v-col>

          <!-- Número de control (opcional) -->
          <v-col cols="12" sm="4">
            <v-text-field
              v-model="formData.controlNumber"
              label="N° Control (opcional)"
              placeholder="Ej: 00-000001"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-2"
            />
          </v-col>

          <!-- Fecha -->
          <v-col cols="12" sm="3">
            <CustomDatePicker
              v-model="formData.issueDate"
              label="Fecha"
              :rules="[v => !!v || 'La fecha es requerida']"
            />
          </v-col>

          <!-- Tipo de documento -->
          <v-col cols="12" sm="6">
            <v-select
              v-model="formData.documentType"
              :items="availableDocumentTypes"
              item-title="title"
              item-value="type"
              label="Tipo de documento"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-2"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                  </template>
                  <template v-slot:subtitle>{{ item.raw.subtitle }}</template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- Estado -->
          <v-col cols="12" sm="3">
            <v-select
              v-model="formData.status"
              :items="invoiceStatuses"
              label="Estado"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-2"
            />
          </v-col>

          <!-- Moneda -->
          <v-col cols="12" sm="3">
            <v-select
              v-model="formData.financial.currency"
              :items="currencies"
              label="Moneda"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
        </v-row>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 3: ¿A QUIÉN?
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <p class="sif-section-label">
          {{ formData.flow === 'VENTA' ? '¿A quién le estás vendiendo?' : '¿De quién es esta factura?' }}
        </p>
        <v-row dense>
          <v-col cols="12" sm="7">
            <v-text-field
              v-model="counterpartName"
              :label="formData.flow === 'VENTA' ? 'Nombre o empresa del cliente' : 'Nombre o empresa del proveedor'"
              :placeholder="formData.flow === 'VENTA' ? 'Ej: Distribuidora López' : 'Ej: Proveedor ABC'"
              variant="outlined"
              density="comfortable"
              :rules="[v => !!v || 'Este campo es obligatorio']"
              hide-details="auto"
              class="mb-2"
            />
          </v-col>
          <v-col cols="12" sm="5">
            <v-text-field
              v-model="counterpartRif"
              label="RIF (opcional)"
              placeholder="J-12345678-9"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-2"
            />
          </v-col>

          <!-- Mis datos (pre-llenados, colapsables) -->
          <v-col cols="12">
            <div
              class="d-flex align-center gap-1 cursor-pointer text-caption text-primary mb-1"
              @click="myDataExpanded = !myDataExpanded"
            >
              <v-icon size="14">{{ myDataExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              {{ myDataExpanded ? 'Ocultar mis datos (emisor)' : 'Ver/editar mis datos (emisor)' }}
            </div>
            <v-expand-transition>
              <v-row v-if="myDataExpanded" dense>
                <v-col cols="12" sm="7">
                  <v-text-field
                    v-model="myName"
                    label="Mi empresa / nombre"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mb-1"
                  />
                </v-col>
                <v-col cols="12" sm="5">
                  <v-text-field
                    v-model="myRif"
                    label="Mi RIF"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mb-1"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="myAddress"
                    label="Mi dirección (opcional)"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="myPhone"
                    label="Mi teléfono (opcional)"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
              </v-row>
            </v-expand-transition>
          </v-col>
        </v-row>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 4: PRODUCTOS / ÍTEMS
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <div class="d-flex align-center justify-space-between mb-3">
          <p class="sif-section-label ma-0">Productos o servicios</p>
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="addItem"
          >
            Añadir línea
          </v-btn>
        </div>

        <!-- Cabecera de columnas (solo escritorio) -->
        <div class="sif-items-header d-none d-sm-flex">
          <span style="flex:3">Descripción / Producto</span>
          <span style="flex:1; text-align:center">Cantidad</span>
          <span style="flex:1; text-align:center">Precio</span>
          <span style="flex:1; text-align:center">Total</span>
          <span style="width:36px"></span>
        </div>

        <!-- Lista de ítems -->
        <transition-group name="sif-item" tag="div">
          <div v-for="(item, index) in formData.items" :key="item._key" class="sif-item-row mb-2">
            <v-row dense align="center">
              <!-- Descripción / producto -->
              <v-col cols="12" sm="5">
                <!-- Indicador de código/SKU si viene del OCR y no es producto de inventario -->
                <div v-if="item.code && !item.product_id" class="d-flex align-center gap-1 mb-1">
                  <v-chip size="x-small" color="info" variant="tonal">
                    <v-icon start size="12">mdi-barcode</v-icon>
                    {{ item.code }}
                  </v-chip>
                  <span class="text-caption text-grey">Detectado del documento</span>
                </div>
                <ProductAutocomplete
                  v-if="showProductSearch"
                  v-model="item.product"
                  :flow="formData.flow"
                  :client-id="currentUser?.client?.id"
                  label="Buscar producto o escribe uno nuevo"
                  @product-selected="(p) => onProductSelected(index, p)"
                />
                <v-text-field
                  v-else
                  v-model="item.description"
                  label="Descripción"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </v-col>

              <!-- Cantidad -->
              <v-col cols="4" sm="2">
                <v-text-field
                  v-model.number="item.quantity"
                  label="Cant."
                  type="number"
                  step="1"
                  min="1"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  :error="isStockError(item)"
                  @update:model-value="updateItemTotal(index)"
                />
                <div
                  v-if="item.product && showProductSearch"
                  class="text-caption mt-0 pl-1"
                  :class="isStockError(item) ? 'text-error font-weight-bold' : 'text-grey'"
                >
                  Disponible: {{ item.product.stock }} {{ item.product.unit || 'und' }}
                </div>
              </v-col>

              <!-- Precio -->
              <v-col cols="4" sm="2">
                <v-text-field
                  v-model.number="item.unitPrice"
                  label="Precio"
                  type="number"
                  step="0.01"
                  :prefix="currencySymbol"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="updateItemTotal(index)"
                />
              </v-col>

              <!-- Total (calculado automáticamente) -->
              <v-col cols="4" sm="2">
                <v-text-field
                  :model-value="formatNumber(item.total)"
                  label="Total"
                  :prefix="currencySymbol"
                  variant="outlined"
                  density="compact"
                  hide-details
                  readonly
                  bg-color="grey-lighten-4"
                />
              </v-col>

              <!-- Borrar -->
              <v-col cols="12" sm="1" class="d-flex justify-end justify-sm-center">
                <v-btn
                  v-if="formData.items.length > 1"
                  icon="mdi-delete-outline"
                  size="small"
                  color="error"
                  variant="text"
                  @click="removeItem(index)"
                />
              </v-col>
            </v-row>
          </div>
        </transition-group>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 5: TOTALES
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section sif-totals">
        <div class="d-flex align-center justify-space-between mb-3">
          <p class="sif-section-label ma-0">Totales</p>
          <v-btn
            size="x-small"
            variant="text"
            color="grey"
            :prepend-icon="manualMode ? 'mdi-pencil-lock' : 'mdi-pencil'"
            @click="manualMode = !manualMode"
          >
            {{ manualMode ? 'Cálculo manual activo' : 'Editar manualmente' }}
          </v-btn>
        </div>

        <v-row dense align="stretch">
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="formData.financial.taxableSales"
              label="Subtotal (base)"
              type="number"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="formData.financial.taxDebit"
              label="IVA (16%)"
              type="number"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model.number="formData.financial.nonTaxableSales"
              label="Monto exento"
              type="number"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3" class="d-flex">
            <!-- Display personalizado para el TOTAL -->
            <div class="sif-total-box" :class="{ 'sif-total-box--editable': manualMode }">
              <span class="sif-total-box__label">
                TOTAL
                <v-icon v-if="manualMode" size="10" class="ml-1 opacity-70">mdi-pencil</v-icon>
              </span>
              <div class="sif-total-box__value">
                <span class="sif-total-box__prefix">{{ currencySymbol }}</span>
                <input 
                  v-if="manualMode"
                  type="number"
                  step="0.01"
                  v-model.number="formData.financial.totalSales"
                  class="sif-total-box__input"
                />
                <span v-else class="sif-total-box__amount">{{ formatNumber(formData.financial.totalSales) }}</span>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Tasa de cambio (sólo muestra equivalente para USD, ya que EUR no tiene API aún) -->
        <div v-if="formData.financial.currency === 'USD'" class="mt-2 d-flex align-center gap-2">
          <v-icon color="info" size="16">mdi-swap-horizontal</v-icon>
          <span class="text-caption">
            Tasa de cambio: <strong>{{ formData.financial.exchangeRate }} Bs/USD</strong>
          </span>
          <span class="text-caption text-grey ml-2">
            Equivalente: ≈ <strong class="text-info">{{ formatNumber(formData.financial.totalSales * formData.financial.exchangeRate) }} Bs.</strong>
          </span>
        </div>
        <div v-else-if="formData.financial.currency === 'EUR'" class="mt-2 d-flex align-center gap-2">
          <v-icon color="warning" size="16">mdi-alert-circle-outline</v-icon>
          <span class="text-caption text-grey">
            Conversión a Bolívares para Euros no disponible automáticamente.
          </span>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 6: NOTAS (colapsable)
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <div
          class="d-flex align-center gap-1 cursor-pointer mb-2"
          @click="notesExpanded = !notesExpanded"
        >
          <v-icon size="18" color="grey">mdi-note-text-outline</v-icon>
          <span class="text-body-2 text-grey-darken-1">
            {{ notesExpanded ? 'Ocultar notas' : 'Agregar notas u observaciones (opcional)' }}
          </span>
          <v-icon size="16" color="grey">{{ notesExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </div>
        <v-expand-transition>
          <v-textarea
            v-if="notesExpanded"
            v-model="formData.notes"
            placeholder="Ej: Pago recibido en efectivo. Sin cambio."
            variant="outlined"
            density="compact"
            rows="3"
            auto-grow
            hide-details
          />
        </v-expand-transition>
      </div>

    </v-card-text><!-- /sif-body -->

    <v-divider />

    <!-- FOOTER fijo -->
    <v-card-actions class="sif-footer pa-4 flex-column align-stretch">

      <!-- Barra de progreso de guardado -->
      <v-expand-transition>
        <div v-if="saving" class="mb-3 w-100">
          <div class="d-flex align-center gap-2 mb-1">
            <v-progress-circular size="16" width="2" indeterminate color="primary" />
            <span class="text-caption text-primary font-weight-medium">{{ savingStep }}</span>
          </div>
          <v-progress-linear indeterminate color="primary" rounded height="3" />
        </div>
      </v-expand-transition>

      <div class="d-flex align-center gap-3 w-100">
        <v-btn variant="text" color="grey-darken-1" @click="$emit('cancel')" :disabled="saving">
          Cancelar
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          size="large"
          variant="elevated"
          :loading="saving"
          :disabled="saving"
          prepend-icon="mdi-content-save"
          @click="handleSubmit"
          class="px-6"
        >
          {{ isEditing ? 'Guardar Cambios' : 'Guardar Factura' }}
        </v-btn>
      </div>
    </v-card-actions>

    <!-- Snackbar -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />

  </v-form>
  </v-card>
</template>

<script>
import invoiceService from '@/services/invoiceService.js';
import userService from '@/services/userService.js';
import clientOcrService from '@/services/clientOcrService.js';
import inventoryService from '@/services/inventoryService.js';
import bcvService from '@/services/bcvService.js';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import FileUploadZone from '@/components/common/FileUploadZone.vue';
import CustomDatePicker from '@/components/common/CustomDatePicker.vue';
import ProductAutocomplete from '@/components/common/ProductAutocomplete.vue';
import { supabase } from '@/lib/supabaseClient';

let _itemKey = 0;

export default {
  name: 'SimpleInvoiceForm',
  components: { AppSnackbar, FileUploadZone, CustomDatePicker, ProductAutocomplete },

  props: {
    invoice: { type: Object, default: null },
    flow:    { type: String, default: 'VENTA' }
  },

  emits: ['submit', 'cancel', 'saved'],

  // ─── DATA ────────────────────────────────────────────────────────────────────
  data() {
    return {
      // UI state
      ocrPanelOpen:   false,
      myDataExpanded: false,
      notesExpanded:  false,
      manualMode:     false,
      saving:         false,
      savingStep:     '',
      showFlowError:  false,

      // OCR
      extracting:  false,
      uploadedFile: null,
      ocrResult:   null,

      // Duplicate check
      isDuplicate:      false,
      checkingDuplicate: false,
      duplicateError:   '',
      invoiceCheckTimer: null,

      // Usuario actual
      currentUser: null,

      // Snackbar
      snackbar: { show: false, message: '', type: 'info', timeout: 4000 },

      // ──── Opciones de flujo (lenguaje humano) ────────────────────────────────
      flowOptions: [
        {
          value: 'VENTA', expenseType: null,
          label: 'Venta',
          subtitle: 'Le vendí algo a un cliente',
          icon: 'mdi-cash-plus',
          color: '#2e7d32', bg: '#f1f8e9'
        },
        {
          value: 'COMPRA', expenseType: 'COMPRA',
          label: 'Compra de mercancía',
          subtitle: 'Compré productos para revender',
          icon: 'mdi-store-plus',
          color: '#1565c0', bg: '#e3f2fd'
        },
        {
          value: 'COMPRA', expenseType: 'GASTO',
          label: 'Otro gasto',
          subtitle: 'Luz, alquiler, servicio...',
          icon: 'mdi-receipt',
          color: '#e65100', bg: '#fff3e0'
        }
      ],

      // Catálogos
      documentTypes: [],
      invoiceStatuses: ['BORRADOR','EMITIDA','PAGADA','ANULADA'],
      currencies: ['VES','USD','EUR'],

      // ──── Datos del formulario ────────────────────────────────────────────────
      formData: {
        invoiceNumber:   '',
        controlNumber:   '',
        documentType:    'FACTURA',
        documentCategory:'FACTURA',
        flow:            'VENTA',
        expense_type:    null,
        issueDate:       new Date().toISOString().split('T')[0],
        dueDate:         '',
        status:          'BORRADOR',

        issuer: { companyName:'', rif:'', taxpayerType:'PERSONA JURÍDICA', phone:'', email:'', website:'', address:'' },
        client: { companyName:'', rif:'', taxpayerType:'PERSONA JURÍDICA', phone:'', email:'', website:'', address:'' },

        financial: {
          totalSales: 0, nonTaxableSales: 0, taxableSales: 0,
          taxDebit: 0, ivaRetention: 0, islrRetention: 0,
          municipalRetention: 0, igtf: 0,
          currency: 'VES', exchangeRate: 1
        },

        items: [ this.newItem() ],
        notes: '',
        attachments: [],
        manualEdits: []
      }
    };
  },

  // ─── COMPUTED ────────────────────────────────────────────────────────────────
  computed: {
    isEditing() { return !!this.invoice; },

    // Símbolo de moneda dinámico
    currencySymbol() {
      const cur = this.formData.financial.currency;
      if (cur === 'USD') return '$';
      if (cur === 'EUR') return '€';
      return 'Bs';
    },

    // Muestra el buscador de productos si es VENTA o COMPRA de mercancía
    showProductSearch() {
      return (
        this.formData.flow === 'VENTA' ||
        (this.formData.flow === 'COMPRA' && this.formData.expense_type === 'COMPRA')
      );
    },

    // Datos del la contraparte (cliente o proveedor) según el flujo
    counterpartName: {
      get() {
        return this.formData.flow === 'VENTA'
          ? this.formData.client.companyName
          : this.formData.issuer.companyName;
      },
      set(v) {
        if (this.formData.flow === 'VENTA') this.formData.client.companyName = v;
        else this.formData.issuer.companyName = v;
      }
    },
    counterpartRif: {
      get() {
        return this.formData.flow === 'VENTA'
          ? this.formData.client.rif
          : this.formData.issuer.rif;
      },
      set(v) {
        if (this.formData.flow === 'VENTA') this.formData.client.rif = v;
        else this.formData.issuer.rif = v;
      }
    },

    // Mis datos (el usuario autenticado)
    myName: {
      get() { return this.formData.flow === 'VENTA' ? this.formData.issuer.companyName : this.formData.client.companyName; },
      set(v) { if (this.formData.flow === 'VENTA') this.formData.issuer.companyName = v; else this.formData.client.companyName = v; }
    },
    myRif: {
      get() { return this.formData.flow === 'VENTA' ? this.formData.issuer.rif : this.formData.client.rif; },
      set(v) { if (this.formData.flow === 'VENTA') this.formData.issuer.rif = v; else this.formData.client.rif = v; }
    },
    myAddress: {
      get() { return this.formData.flow === 'VENTA' ? this.formData.issuer.address : this.formData.client.address; },
      set(v) { if (this.formData.flow === 'VENTA') this.formData.issuer.address = v; else this.formData.client.address = v; }
    },
    myPhone: {
      get() { return this.formData.flow === 'VENTA' ? this.formData.issuer.phone : this.formData.client.phone; },
      set(v) { if (this.formData.flow === 'VENTA') this.formData.issuer.phone = v; else this.formData.client.phone = v; }
    },

    availableDocumentTypes() {
      if (this.formData.flow === 'VENTA') return [
        { title: 'Factura de Venta',  type: 'FACTURA', icon: 'mdi-file-document-check', color: 'success', subtitle: 'Documento fiscal' },
        { title: 'Nota de Entrega',   type: 'RECIBO',  icon: 'mdi-file-document-outline', color: 'info', subtitle: 'Recibo simple' },
        { title: 'Nota de Crédito',   type: 'NOTA DE CRÉDITO', icon: 'mdi-credit-card-refund', color: 'warning', subtitle: 'Devolución' }
      ];
      return [
        { title: 'Factura de Compra', type: 'FACTURA', icon: 'mdi-file-document-check', color: 'success', subtitle: 'Documento fiscal' },
        { title: 'Nota de Entrega',   type: 'RECIBO',  icon: 'mdi-file-document-outline', color: 'info', subtitle: 'Recibo simple' },
        { title: 'Nota de Débito',    type: 'NOTA DE DÉBITO', icon: 'mdi-cash-plus', color: 'error', subtitle: 'Cargo adicional' }
      ];
    },

    invoiceNumberRules() {
      const rules = [v => !!v || 'El número es requerido'];
      if (this.isDuplicate) rules.push(() => 'Este número ya está registrado');
      return rules;
    }
  },

  // ─── WATCH ───────────────────────────────────────────────────────────────────
  watch: {
    'formData.invoiceNumber'(v) {
      if (!v) { this.isDuplicate = false; return; }
      if (this.invoiceCheckTimer) clearTimeout(this.invoiceCheckTimer);
      this.invoiceCheckTimer = setTimeout(() => this.checkDuplicateInvoice(), 600);
    },
    'formData.issueDate'(date) {
      if (date) this.fetchExchangeRate(date);
    },
    'formData.documentType'(t) {
      this.formData.documentCategory = t === 'RECIBO' ? 'RECIBO' : 'FACTURA';
    },
    'formData.financial.taxableSales'() {
      if (!this.manualMode && !this.isMappingOcr) this.calculateFromBase();
    },
    'formData.financial.nonTaxableSales'() {
      if (!this.manualMode && !this.isMappingOcr) this.calculateTotals();
    },
    'formData.financial.taxDebit'() {
      if (!this.manualMode && !this.isMappingOcr) this.calculateTotals();
    },
    manualMode(val) {
      if (!val) {
        // Al salir del modo manual, recalcular todo autmáticamente
        this.calculateFromBase();
      } else {
        this.showSnackbar('Modo manual: Ahora puedes editar los totales directamente.', 'info');
      }
    },
    invoice: {
      immediate: true,
      handler(inv) {
        if (inv) {
          this.formData = {
            ...inv,
            expense_type: inv.expense_type || (inv.flow === 'COMPRA' ? 'COMPRA' : null),
            items: (inv.items || []).map(it => ({ ...it, _key: ++_itemKey }))
          };
        }
      }
    }
  },

  // ─── LIFECYCLE ───────────────────────────────────────────────────────────────
  async mounted() {
    if (!this.isEditing) {
      this.formData.flow = this.flow;
      this.formData.items = [ this.newItem() ];
    }
    await this.loadCurrentUser();
    this.fetchExchangeRate(this.formData.issueDate);
  },

  // ─── METHODS ─────────────────────────────────────────────────────────────────
  methods: {

    // ── Helpers ──────────────────────────────────────────────────────────────
    newItem() {
      return {
        _key: ++_itemKey,
        code: null,           // SKU/Código del producto (si existe en inventario o viene del OCR)
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        unit: null,           // Unidad de medida
        isInventory: false,
        product: null,
        product_id: null
      };
    },

    formatNumber(n) {
      if (n == null || isNaN(n)) return '0,00';
      return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    isFlowActive(opt) {
      return this.formData.flow === opt.value && this.formData.expense_type === opt.expenseType;
    },

    isStockError(item) {
      return this.formData.flow === 'VENTA' && item.product && item.quantity > item.product.stock;
    },

    // ── Selección de flujo ────────────────────────────────────────────────────
    selectFlow(opt) {
      this.formData.flow        = opt.value;
      this.formData.expense_type = opt.expenseType;
      this.showFlowError = false;
      this.syncItemsInventoryMode();
      this.prefillUserData();
    },

    // ── Sincroniza isInventory en TODOS los ítems ─────────────────────────────
    syncItemsInventoryMode() {
      const isInventoryFlow = (
        this.formData.flow === 'VENTA' ||
        (this.formData.flow === 'COMPRA' && this.formData.expense_type === 'COMPRA')
      );
      this.formData.items.forEach(item => {
        if (!item.product_id) item.isInventory = isInventoryFlow;
      });
    },

    // ── Pre-llenado de datos del usuario ────────────────────────────────────
    prefillUserData() {
      if (!this.currentUser) return;
      const c = this.currentUser.client || {};
      const userData = {
        companyName:  c.company_name || this.currentUser.companyName || this.currentUser.name || '',
        rif:          c.rif || this.currentUser.rif || '',
        taxpayerType: c.taxpayer_type || 'PERSONA JURÍDICA',
        phone:        c.phone || this.currentUser.phone || '',
        email:        c.email || this.currentUser.email || '',
        address:      c.address || ''
      };
      if (this.formData.flow === 'VENTA') {
        this.formData.issuer = { ...this.formData.issuer, ...userData };
      } else {
        this.formData.client = { ...this.formData.client, ...userData };
      }
    },

    // ── Cargar usuario actual ─────────────────────────────────────────────────
    async loadCurrentUser() {
      try {
        const user = await userService.getCurrentUser();
        if (user) {
          // Cargar perfil de cliente si existe
          const { data: profile } = await supabase.auth.getUser();
          if (profile?.user) {
            const { data: userProfile } = await supabase
              .from('users').select('*, client:clients(*)').eq('id', profile.user.id).maybeSingle();
            if (userProfile) {
              this.currentUser = { ...user, ...userProfile, client: userProfile.client };
            } else {
              this.currentUser = user;
            }
          } else {
            this.currentUser = user;
          }
          this.prefillUserData();
        }
      } catch (e) {
        console.error('❌ [SimpleInvoiceForm] Error cargando usuario:', e);
      }
    },

    // ── Tasa de cambio ────────────────────────────────────────────────────────
    async fetchExchangeRate(date) {
      if (!date) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        let r;
        
        // Si la factura es de hoy, usamos la tasa EN VIVO, de lo contrario la histórica
        if (date === today) {
          r = await bcvService.getCurrentRate();
        } else {
          r = await bcvService.getRateForDate(date);
          
          // Fallback robusto si la API para fecha específica falla
          if (!r.success) {
            console.warn(`⚠️ No se encontró la tasa para la fecha ${date}. Aplicando tasa actual.`);
            r = await bcvService.getCurrentRate();
          }
        }

        if (r.success && r.data?.dollar) {
          this.formData.financial.exchangeRate = r.data.dollar;
        }
      } catch (e) {
        console.warn('⚠️ No se pudo obtener tasa BCV:', e);
      }
    },

    // ── Verificar duplicado ────────────────────────────────────────────────────
    async checkDuplicateInvoice() {
      if (!this.formData.invoiceNumber) return;
      if (this.isEditing && this.formData.invoiceNumber === this.invoice?.invoiceNumber) {
        this.isDuplicate = false; return;
      }
      this.checkingDuplicate = true;
      try {
        const isUnique = await invoiceService.validateUniqueInvoiceNumber(
          this.formData.invoiceNumber,
          this.isEditing ? this.invoice?.id : null
        );
        this.isDuplicate = !isUnique;
      } catch { this.isDuplicate = false; }
      finally { this.checkingDuplicate = false; }
    },

    // ── Cálculos financieros ──────────────────────────────────────────────────
    calculateFromBase() {
      const base = parseFloat(this.formData.financial.taxableSales) || 0;
      this.formData.financial.taxDebit = parseFloat((base * 0.16).toFixed(2));
      this.calculateTotals();
    },

    calculateFromItems() {
      if (this.manualMode) return;
      const itemsTotal = this.formData.items.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
      // El total de ítems = base imponible (simplificado, sin separar exento por ahora)
      this.formData.financial.taxableSales = parseFloat(itemsTotal.toFixed(2));
      // calculateFromBase se activa por el watcher de taxableSales
    },

    calculateTotals() {
      if (this.manualMode) return;
      const base   = parseFloat(this.formData.financial.taxableSales) || 0;
      const exento = parseFloat(this.formData.financial.nonTaxableSales) || 0;
      const iva    = parseFloat(this.formData.financial.taxDebit) || 0;
      const igtf   = parseFloat(this.formData.financial.igtf) || 0;
      this.formData.financial.totalSales = parseFloat((base + exento + iva + igtf).toFixed(2));
    },

    // ── Ítems ─────────────────────────────────────────────────────────────────
    addItem() {
      const item = this.newItem();
      item.isInventory = this.showProductSearch;
      this.formData.items.push(item);
    },

    removeItem(index) {
      this.formData.items.splice(index, 1);
      this.calculateFromItems();
    },

    updateItemTotal(index) {
      const item = this.formData.items[index];
      item.total = parseFloat(((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2));
      this.calculateFromItems();
    },

    onProductSelected(index, product) {
      if (!product) return;
      const item = this.formData.items[index];
      if (typeof product === 'string') {
        // El usuario escribió texto libre
        item.description = product;
        item.code = null;
        item.product = null;
        item.product_id = null;
        item.unit = null;
        const isCompra = this.formData.flow === 'COMPRA' && this.formData.expense_type === 'COMPRA';
        item.isInventory = isCompra;
      } else {
        // El usuario seleccionó un producto del inventario
        item.product     = product;
        item.product_id  = product.id;
        item.code         = product.code || null;  // Código/SKU del inventario
        item.description = product.name;
        item.unit         = product.unit || null;
        item.unitPrice   = this.formData.flow === 'COMPRA' ? (product.cost_price || 0) : (product.sale_price || 0);
        item.total       = parseFloat((item.quantity * item.unitPrice).toFixed(2));
        item.isInventory = true;
      }
      this.calculateFromItems();
    },

    // ── OCR ──────────────────────────────────────────────────────────────────
    handleFileSelect(file) {
      this.uploadedFile = file;
      this.ocrResult    = null;
    },

    async handleExtractedData(file) {
      if (!file) return;
      this.extracting = true;
      this.ocrResult  = null;

      try {
        const userContext = {
          companyName: this.currentUser?.companyName || this.currentUser?.name || this.currentUser?.client?.company_name || '',
          rif:         this.currentUser?.rif || this.currentUser?.client?.rif || ''
        };

        console.log('🤖 [OCR] Enviando contexto del usuario:', userContext);

        const data = await clientOcrService.extractInvoiceData(file, this.formData.flow || null, userContext);

        console.log('🤖 [OCR] Respuesta recibida:', {
          detectedFlow: data.detectedFlow,
          flowConfidence: data.flowConfidence,
          flowReason: data.flowReason,
          documentType: data.documentType
        });

        // Evitar que los watchers financieros re-escriban la data de la IA inmediatamente
        this.isMappingOcr = true;

        // ═══════════════════════════════════════════════════════════════
        // PASO 1: APLICAR FLUJO DETECTADO
        // ═══════════════════════════════════════════════════════════════
        if (data.detectedFlow) {
          let targetFlow = data.detectedFlow;
          let targetExpense = data.detectedFlow === 'GASTO' ? 'GASTO' : (data.detectedFlow === 'COMPRA' ? 'COMPRA' : null);

          // GASTO se guarda como COMPRA con expense_type='GASTO'
          if (data.detectedFlow === 'GASTO') {
            targetFlow = 'COMPRA';
            targetExpense = 'GASTO';
          }

          const matchingOpt = this.flowOptions.find(o =>
            o.value === targetFlow &&
            (targetFlow === 'VENTA' || o.expenseType === targetExpense)
          );

          if (matchingOpt) {
            this.selectFlow(matchingOpt);
            console.log('✅ [OCR] Flujo aplicado:', matchingOpt.label);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 2: MAPEAR DOCUMENTO
        // ═══════════════════════════════════════════════════════════════
        if (data.invoiceNumber)  this.formData.invoiceNumber = data.invoiceNumber;
        if (data.controlNumber)  this.formData.controlNumber = data.controlNumber;
        if (data.issueDate)      this.formData.issueDate     = data.issueDate;
        if (data.documentType)   this.formData.documentType  = data.documentType;
        if (data.documentCategory) this.formData.documentCategory = data.documentCategory;

        // ═══════════════════════════════════════════════════════════════
        // PASO 3: MAPEAR CONTRAPARTE (LA PARTE MÁS IMPORTANTE)
        // ═══════════════════════════════════════════════════════════════
        // En VENTA: el usuario es el EMISOR, la contraparte es el CLIENTE del documento
        // En COMPRA/GASTO: el usuario es el CLIENTE, la contraparte es el EMISOR del documento

        console.log('🤖 [OCR] Flujo actual:', this.formData.flow);
        console.log('🤖 [OCR] Issuer extraído:', data.issuer);
        console.log('🤖 [OCR] Client extraído:', data.client);

        if (this.formData.flow === 'VENTA') {
          // En VENTA: Yo soy el emisor, la contraparte es el cliente que aparece en el documento
          // El campo "client" del documento es quien me compró
          if (data.client?.companyName) {
            this.counterpartName = data.client.companyName;
            this.counterpartRif = data.client.rif || '';
            console.log('✅ [OCR] VENTA - Contraparte (cliente):', data.client.companyName);
          }
          // Mis datos como emisor (pre-llenados, pero actualizamos si hay datos nuevos)
          if (data.issuer?.address) this.myAddress = data.issuer.address;
          if (data.issuer?.phone) this.myPhone = data.issuer.phone;

        } else {
          // En COMPRA o GASTO: Yo soy el cliente, la contraparte es el emisor/proveedor
          // El campo "issuer" del documento es quien me vendió
          if (data.issuer?.companyName) {
            this.counterpartName = data.issuer.companyName;
            this.counterpartRif = data.issuer.rif || '';
            console.log('✅ [OCR] COMPRA/GASTO - Contraparte (proveedor):', data.issuer.companyName);
          }
          // Mis datos como cliente (pre-llenados, pero actualizamos si hay datos nuevos)
          if (data.client?.address) this.myAddress = data.client.address;
          if (data.client?.phone) this.myPhone = data.client.phone;
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 4: MAPEAR FINANCIEROS
        // ═══════════════════════════════════════════════════════════════
        if (data.financial) {
          // Usar los campos del documento que vienen del OCR
          if (data.financial.total) {
            this.formData.financial.totalSales = parseFloat(data.financial.total) || 0;
          }
          if (data.financial.taxableAmount !== undefined) {
            this.formData.financial.taxableSales = parseFloat(data.financial.taxableAmount) || 0;
          }
          if (data.financial.taxAmount !== undefined) {
            this.formData.financial.taxDebit = parseFloat(data.financial.taxAmount) || 0;
          }
          if (data.financial.exemptAmount !== undefined) {
            this.formData.financial.nonTaxableSales = parseFloat(data.financial.exemptAmount) || 0;
          }
          if (data.financial.subtotal !== undefined) {
            this.formData.financial.taxableSales = parseFloat(data.financial.subtotal) || 0;
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 5: MAPEAR PRODUCTOS con matching automático + auto-create
        // ═══════════════════════════════════════════════════════════════
        if (data.items && data.items.length > 0) {
          const isInventoryFlow = this.showProductSearch;
          const isPurchase = this.formData.flow === 'COMPRA';
          const docCurrency = data.currency || 'VES';
          let matchedCount = 0;
          let createdCount = 0;

          // Obtener tasa de cambio BCV SOLO si el documento o algún ítem usa USD
          // (hacemos una sola petición para todos los ítems, no una por cada producto)
          const hasUsdItems = data.items.some(it =>
            (it.currency || docCurrency) === 'USD'
          );
          let usdRate = 1;
          if (hasUsdItems) {
            try {
              const rateRes = await import('@/services/bcvService').then(m => m.default.getCurrentRate());
              if (rateRes?.success) usdRate = parseFloat(rateRes.data.dollar) || 1;
              console.log(`💱 [OCR] Tasa BCV obtenida: 1 USD = ${usdRate} VES`);
            } catch { /* usar 1:1 si falla */ }
          }

          // Helper: convertir precio a VES para almacenar en inventario
          const toVES = (price, currency) => {
            if (currency === 'USD') return parseFloat((price * usdRate).toFixed(2));
            if (currency === 'EUR') return price; // Sin tasa EUR → guardar como está, user puede editar
            return price; // VES
          };

          // Procesar items secuencialmente para evitar condiciones de carrera
          // (ej. el mismo producto aparece 2 veces en la misma factura, si es en paralelo se crearía 2 veces)
          const mappedItems = [];
          for (const it of data.items || []) {
            const qty      = parseFloat(it.quantity) || 1;
            const itemCur  = it.currency || docCurrency;
            const price    = parseFloat(it.unitPrice) || 0;
            const total    = parseFloat(it.amount) || parseFloat((qty * price).toFixed(2));

             const baseItem = {
              _key:        ++_itemKey,
              code:        it.code || null,
              description: it.description ? it.description.replace(/\s+/g, ' ').trim() : '',
              quantity:    qty,
              unitPrice:   price,
              currency:    itemCur,
              total:       parseFloat(total.toFixed(2)),
              unit:        it.unit || null,
              isInventory: isInventoryFlow,
              product:     null,
              product_id:  null
            };

            if (!isInventoryFlow) {
              mappedItems.push(baseItem);
              continue;
            }

            let foundMatch = null;

            // ── 1. Intentar match con inventario existente ───────────────
            try {
              const searchTerm = it.code || baseItem.description;
              const match = await inventoryService.findProductByNameOrCode(searchTerm);

              if (match) {
                matchedCount++;
                console.log(`✅ [OCR Match] "${baseItem.description}" → ${match.name} (ID: ${match.id})`);
                foundMatch = {
                  ...baseItem,
                  code:        match.code || it.code || null,
                  description: match.name,
                  unit:        match.unit || it.unit || null,
                  unitPrice:   isPurchase ? (match.cost_price || price) : (match.sale_price || price),
                  total:       parseFloat((qty * (isPurchase ? (match.cost_price || price) : (match.sale_price || price))).toFixed(2)),
                  product:     match,
                  product_id:  match.id
                };
              }
            } catch (matchErr) {
              console.warn('[OCR Match] Error buscando producto:', matchErr);
            }

            if (foundMatch) {
              mappedItems.push(foundMatch);
              continue;
            }

            // ── 2. No existe: auto-crear en inventario (solo en COMPRA) ──
            let createdMatch = null;
            if (isPurchase && baseItem.description) {
              try {
                console.log(`🆕 [OCR Auto-Create] Creando producto: "${baseItem.description}" (${price} ${itemCur})`);

                const nativePrice = parseFloat(price);
                let autoCode = it.code || null;
                if (!autoCode) {
                  try { autoCode = await inventoryService.getNextProductSku(); }
                  catch { autoCode = `PROD-${Date.now().toString().slice(-5)}`; }
                }

                const newProduct = await inventoryService.createProduct({
                  name:       baseItem.description,
                  code:       autoCode,
                  currency:   itemCur,          
                  cost_price: nativePrice,       
                  sale_price: parseFloat((nativePrice * 1.30).toFixed(2)), 
                  stock:      0,                 
                  unit:       it.unit || 'UND',
                  min_stock:  0,
                  status:     'ACTIVE'
                });

                const newId = newProduct?.data?.[0]?.id || newProduct?.id;
                if (newId) {
                  createdCount++;
                  console.log(`✅ [OCR Auto-Create] Producto creado: ${baseItem.description} → ID ${newId} (SKU: ${autoCode})`);
                  createdMatch = {
                    ...baseItem,
                    code:       autoCode,
                    unit:       it.unit || 'UND',
                    product_id: newId,
                    product:    { id: newId, name: baseItem.description, code: autoCode, currency: itemCur, cost_price: nativePrice, sale_price: parseFloat((nativePrice * 1.3).toFixed(2)) }
                  };
                }
              } catch (createErr) {
                console.error(`❌ [OCR Auto-Create] Error creando "${baseItem.description}":`, createErr);
              }
            }

            if (createdMatch) {
              mappedItems.push(createdMatch);
            } else {
              // Fallback: ítem como texto libre si todo falla
              mappedItems.push(baseItem);
            }
          }

          this.formData.items = mappedItems;
          this.calculateFromItems();

          this._ocrMatchedCount = matchedCount;
          this._ocrCreatedCount = createdCount;
          console.log(`✅ [OCR] ${mappedItems.length} ítems: ${matchedCount} vinculados, ${createdCount} auto-creados en inventario`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 6: MONEDA Y NOTAS
        // ═══════════════════════════════════════════════════════════════
        if (data.currency) {
          this.formData.financial.currency = data.currency;
        }
        if (data.notes) {
          this.formData.notes = data.notes;
          this.notesExpanded = true;
        }

        // ═══════════════════════════════════════════════════════════════
        // RESUMEN PARA EL USUARIO
        // ═══════════════════════════════════════════════════════════════
        const flowLabel = this.flowOptions.find(o =>
          o.value === this.formData.flow && o.expenseType === this.formData.expense_type
        )?.label || this.formData.flow;

        const summary = [
          { label: 'Tipo', found: true, value: flowLabel },
          { label: 'Documento', found: !!data.invoiceNumber, value: data.invoiceNumber || 'No encontrado' },
          { label: 'Fecha', found: !!data.issueDate, value: data.issueDate || 'No encontrada' },
          { label: 'Contraparte', found: !!(data.issuer?.companyName || data.client?.companyName), value: this.counterpartName || 'No encontrada' },
          { label: 'Total', found: !!(data.financial?.total), value: data.financial?.total ? `${data.currency || 'Bs'} ${this.formatNumber(data.financial.total)}` : 'No encontrado' },
          {
            label: 'Productos',
            found: !!(data.items?.length),
            value: (() => {
              if (!data.items?.length) return 'No detectados';
              const parts = [`${data.items.length} detectado(s)`];
              if (this._ocrMatchedCount > 0) parts.push(`${this._ocrMatchedCount} vinculado(s)`);
              if (this._ocrCreatedCount > 0) parts.push(`${this._ocrCreatedCount} creado(s) en inventario`);
              return parts.join(' · ');
            })()
          }
        ];

        // Mostrar razón del flujo detectado si está disponible
        if (data.flowReason) {
          console.log('🤖 [OCR] Razón del flujo:', data.flowReason);
        }

        // Mensaje contextual según resultado
        let matchMsg = '✅ Documento leído. Revisa los datos antes de guardar.';
        const mc = this._ocrMatchedCount || 0;
        const cc = this._ocrCreatedCount || 0;
        if (mc > 0 && cc > 0) {
          matchMsg = `✅ ${mc} producto(s) vinculados y ${cc} registrado(s) automáticamente en inventario.`;
        } else if (cc > 0) {
          matchMsg = `✅ ${cc} producto(s) registrado(s) automáticamente en inventario. ¡Verifica los precios!`;
        } else if (mc > 0) {
          matchMsg = `✅ ${mc} producto(s) vinculados al inventario correctamente.`;
        }

        this.ocrResult = { success: true, summary };
        this.showSnackbar(matchMsg, 'success');

      } catch (err) {
        console.error('❌ [OCR] Error:', err);
        this.ocrResult = { success: false, message: 'No se pudo leer el documento. Por favor, ingresa los datos manualmente.' };
        this.showSnackbar('No se pudo leer el documento', 'error');
      } finally {
        this.$nextTick(() => { this.isMappingOcr = false; });
        this.extracting = false;
      }
    },

    // ── Validación ────────────────────────────────────────────────────────────
    validate() {
      // 1. Tipo de registro
      if (!this.formData.flow) {
        this.showFlowError = true;
        this.showSnackbar('Por favor selecciona si es una venta, compra u otro gasto', 'error');
        return false;
      }
      // 2. Número de factura
      if (!this.formData.invoiceNumber) {
        this.showSnackbar('Por favor ingresa el número de factura o recibo', 'error');
        return false;
      }
      if (this.isDuplicate) {
        this.showSnackbar('El número de factura ya está registrado. Por favor usa uno diferente.', 'error');
        return false;
      }
      // 3. Fecha
      if (!this.formData.issueDate) {
        this.showSnackbar('Por favor selecciona la fecha', 'error');
        return false;
      }
      // 4. Total
      if (this.formData.financial.totalSales <= 0) {
        this.showSnackbar('El total de la factura debe ser mayor a 0. Agrega al menos un producto o ajusta los montos.', 'error');
        return false;
      }
      // 5. Stock suficiente (solo en VENTA)
      if (this.formData.flow === 'VENTA') {
        const overflow = this.formData.items.find(i => i.product && i.quantity > i.product.stock);
        if (overflow) {
          this.showSnackbar(`Sin stock suficiente para: ${overflow.product.name} (quedan ${overflow.product.stock})`, 'error');
          return false;
        }
      }
      return true;
    },

    // ── Guardar ───────────────────────────────────────────────────────────────
    async handleSubmit() {
      if (!this.validate()) return;

      this.saving = true;
      this.savingStep = 'Verificando datos...';

      try {
        // Clonar para no mutar el original en caso de error
        const payload = JSON.parse(JSON.stringify(this.formData));

        // Limpiar _key interno (no persistir)
        payload.items = payload.items.map(({ _key, ...rest }) => rest);

        // Subir archivo adjunto si existe
        if (this.uploadedFile) {
           this.savingStep = 'Subiendo documento adjunto...';
           const uploadRes = await invoiceService.uploadAttachment(this.uploadedFile);
           if (uploadRes.success) {
              payload.attachments = [uploadRes]; 
           } else {
              throw new Error('Error al subir el archivo: ' + uploadRes.message);
           }
        }

        this.savingStep = 'Guardando factura...';

        // Emitir al padre — el padre (Facturacion.vue) es quien llama a invoiceService
        // para mantener la responsabilidad separada (S de SOLID)
        this.$emit('submit', payload);

      } catch (err) {
        console.error('❌ [SimpleInvoiceForm] Error al guardar:', err);
        this.showSnackbar('Ocurrió un error al guardar. Por favor intenta de nuevo.', 'error');
        this.saving = false;
        this.savingStep = '';
      }
    },

    // Llamado desde el padre cuando el guardado en el backend falla
    onSaveFailed(errorMsg) {
      this.saving = false;
      this.savingStep = '';
      this.showSnackbar(errorMsg || 'Error al guardar. Los datos no se perdieron.', 'error');
    },

    // Llamado desde el padre cuando el guardado termina con éxito
    onSaveSuccess() {
      this.saving = false;
      this.savingStep = '';
    },

    // ── Snackbar ──────────────────────────────────────────────────────────────
    showSnackbar(message, type = 'info', timeout = 5000) {
      this.snackbar = { show: true, message, type, timeout };
    }
  }
};
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────── */

/* v-card ocupa toda la altura disponible del diálogo */
.sif-card {
  display: flex;
  flex-direction: column;
  max-height: 92vh;
}

/* v-card-text: Vuetify agrega overflow-y:auto automáticamente cuando scrollable=true en el dialog */
.sif-body {
  flex: 1;
  /* NO establecer max-height aquí — lo maneja Vuetify con scrollable */
}

.sif-header { background: #fafafa; white-space: normal; }
.sif-footer { background: #fafafa; }


/* ─── Secciones ──────────────────────────────────────────── */
.sif-section {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}
.sif-section:last-child { border-bottom: none; }

.sif-section-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9e9e9e;
  margin-bottom: 12px;
}

/* ─── OCR Banner ─────────────────────────────────────────── */
.sif-ocr-banner {
  background: linear-gradient(135deg, #f3f4ff 0%, #fafafa 100%);
  border-left: 3px solid #5c6bc0;
}
.sif-ocr-active {
  border-left-color: #3949ab;
  background: linear-gradient(135deg, #e8eaf6 0%, #f3f4ff 100%);
}

/* ─── Flow cards ─────────────────────────────────────────── */
.sif-flow-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 14px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
  user-select: none;
}
.sif-flow-card:hover { border-color: #bdbdbd; background: #fff; transform: translateY(-1px); }
.sif-flow-card--active { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

/* ─── Items ──────────────────────────────────────────────── */
.sif-items-header {
  display: flex;
  padding: 4px 8px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.sif-item-row {
  padding: 8px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}
.sif-item-row:hover { background: #f5f5f5; }

/* Animación entrada/salida de ítems */
.sif-item-enter-active, .sif-item-leave-active { transition: all 0.25s ease; }
.sif-item-enter-from { opacity: 0; transform: translateY(-8px); }
.sif-item-leave-to   { opacity: 0; transform: translateX(8px);  }

/* ─── Totales ─────────────────────────────────────────────── */
.sif-totals { background: #f8f9ff; }

/* Box personalizado para el TOTAL — sin problema de label flotante */
.sif-total-box {
  background: #1F355C;
  border-radius: 8px;
  padding: 0 14px;
  width: 100%;        /* ocupa todo el v-col */
  min-height: 40px;   /* mínimo igual a density=compact */
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(31, 53, 92, 0.3);
}

.sif-total-box__label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1;
  margin-bottom: 2px;
}

.sif-total-box__value {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.sif-total-box__prefix {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.sif-total-box__amount {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.01em;
}

.sif-total-box__input {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 1.05rem;
  font-weight: 700;
  width: 100%;
  outline: none;
  padding: 0;
}
.sif-total-box__input:focus {
  border-bottom-color: white;
}
/* Ocultar flechas del input number nativo */
.sif-total-box__input::-webkit-outer-spin-button,
.sif-total-box__input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.sif-total-box__input[type=number] {
  -moz-appearance: textfield;
}

/* ─── Chevron animado ─────────────────────────────────────── */
.sif-chevron-up { transform: rotate(180deg); }

.cursor-pointer { cursor: pointer; }
</style>
