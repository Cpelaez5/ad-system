<template>
  <v-card class="sif-card" @submit.prevent="handleSubmit">
  <v-form ref="form" class="sif-form">

    <!-- ══════════════════════════════════════════════════════════════════
         MODO SIMPLE — pantalla de éxito (tras guardar, ver handleSubmit /
         onSaveSuccess). "Registrar otro" vuelve al paso 1 con form limpio;
         "Volver al inicio" solo emite 'cancel' (lo maneja Inicio.vue).
    ══════════════════════════════════════════════════════════════════ -->
    <div v-if="simple && simpleSuccess" class="sif-simple-success pa-6 text-center" data-testid="simple-success">
      <v-icon color="success" size="72" class="mb-4">mdi-check-circle</v-icon>
      <h2 class="text-h5 font-weight-bold mb-2">
        ¡Listo! Guardamos tu {{ formData.flow === 'VENTA' ? 'venta' : 'gasto' }}.
      </h2>
      <p class="text-body-1 text-medium-emphasis mb-6">
        Ya puedes verlo en Mis movimientos.
      </p>

      <div v-if="simpleMostrarAvisoRetencion" class="mb-3">
        <BotonAccion
          texto="Descargar comprobante"
          icono="mdi-file-download-outline"
          variante="secundaria"
          tamano="principal"
          :cargando="simpleDescargandoComprobante"
          @click="simpleDescargarComprobante"
        />
      </div>

      <BotonAccion
        texto="Registrar otro"
        icono="mdi-plus"
        variante="primaria"
        tamano="principal"
        class="mb-3"
        @click="simpleResetForm"
      />
      <BotonAccion
        texto="Volver al inicio"
        variante="terciaria"
        tamano="normal"
        @click="$emit('cancel')"
      />
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         MODO SIMPLE — Paso 1: ¿Tienes la factura? (fase2-spec.md §3.1-2)
         Reutiliza el FileUploadZone/handleExtractedData de siempre (ver
         simpleHandleFileSelect): no se duplica el flujo OCR.
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="simple && simpleStep === 1">
      <v-card-title class="sif-header pa-5 pb-4">
        <div class="d-flex align-center ga-3">
          <PasoGuiado
            :paso-actual="1"
            :total-pasos="2"
            titulo="¿Tienes la factura o el recibo?"
            subtitulo="Elige una opción para empezar"
            class="flex-grow-1"
          />
          <v-btn icon="mdi-close" variant="text" color="grey" aria-label="Cerrar" @click="$emit('cancel')" />
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-5">
        <template v-if="extracting">
          <TrabajandoIA :mensaje="simpleReadingMessage" class="py-6" data-testid="simple-leyendo">
            <v-progress-circular indeterminate color="primary" size="56" width="5" class="mb-4" />
            <v-skeleton-loader type="article" class="mx-auto mt-4" max-width="340" />
          </TrabajandoIA>
        </template>
        <template v-else>
          <TarjetaAccion
            icono="mdi-camera"
            titulo="Tomarle foto"
            subtitulo="Usa la cámara de tu teléfono"
            color="primary"
            class="mb-3"
            @click="simpleTomarFoto"
          />
          <TarjetaAccion
            icono="mdi-paperclip"
            titulo="Subir archivo"
            subtitulo="Un PDF o una imagen guardada"
            color="secondary"
            class="mb-3"
            @click="simpleSubirArchivo"
          />
          <TarjetaAccion
            icono="mdi-pencil-outline"
            titulo="No tengo factura"
            subtitulo="Registro los datos a mano"
            color="grey-darken-1"
            @click="simpleSinFactura"
          />
        </template>

        <!-- Inputs ocultos: mismo FileUploadZone/flujo OCR, solo cambia quién lo dispara -->
        <div style="display:none">
          <FileUploadZone
            ref="fileUploadZone"
            accept="application/pdf,image/jpeg,image/png,image/jpg"
            :max-size-m-b="10"
            @file-selected="simpleHandleFileSelect"
          />
        </div>
      </v-card-text>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════
         Paso 2 del modo simple, o formulario completo (simple=false, igual
         que siempre: lo usa Facturacion.vue sin ningún cambio de aspecto).
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else>

    <!-- ═══════════════════════════════════════════════════════╗
         HEADER
    ═══════════════════════════════════════════════════════════ -->
    <!-- HEADER fijo -->
    <v-card-title class="sif-header pa-5 pb-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center ga-3">
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
        <v-btn icon="mdi-close" variant="text" color="grey" aria-label="Cerrar" @click="$emit('cancel')" />
      </div>
    </v-card-title>

    <v-divider />

    <!-- CUERPO scrollable (v-card-text maneja el scroll automáticamente con scrollable en el dialog) -->
    <v-card-text class="sif-body pa-0">

      <!-- ══════════════════════════════════════════════════════════════════
           MODO SIMPLE — Paso 2: Confirma estos datos (fase2-spec.md §3.3)
           4 campos grandes; el resto del formulario (idéntico al de hoy)
           queda debajo, en "Ver detalles contables" (eager: siempre montado
           para que los cálculos/validaciones de siempre sigan funcionando).
      ══════════════════════════════════════════════════════════════════ -->
      <div v-if="simple" class="sif-section sif-simple-fields" data-testid="simple-paso2">
        <PasoGuiado
          :paso-actual="2"
          :total-pasos="2"
          titulo="Confirma estos datos"
          :subtitulo="simplePaso2Subtitulo"
          class="mb-4"
        />

        <v-row dense>
          <!-- COMPRA/GASTO: proveedor. VENTA: cliente -->
          <v-col cols="12">
            <p class="sif-section-label">
              {{ formData.flow === 'VENTA' ? '¿A quién le vendiste?' : '¿A quién le pagaste?' }}
            </p>
            <div v-if="mostrarProveedorPendienteOcr" class="sif-proveedor-pendiente" data-testid="proveedor-pendiente-ocr">
              <v-icon color="primary" size="22">mdi-domain-plus</v-icon>
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ proveedorPendienteOcr.nombre }}</div>
                <v-chip size="x-small" color="primary" variant="tonal" class="mt-1">
                  Nuevo proveedor — se guardará al registrar
                </v-chip>
              </div>
              <v-btn size="small" variant="text" color="primary" @click="cancelarProveedorPendienteOcr">
                Buscar otro
              </v-btn>
            </div>
            <!-- C2: con un proveedor pendiente, las retenciones se calculan con
                 valores por defecto (IVA 75%) — avisar para que la persona las
                 confirme en "Ver detalles" antes de guardar. -->
            <AvisoAmable
              v-if="mostrarProveedorPendienteOcr && clienteEsAgenteRetencion"
              tipo="info"
              mensaje="Proveedor nuevo: revisamos las retenciones con valores por defecto; confírmalas en Ver detalles."
              texto-accion="Ver detalles"
              class="mt-2"
              @accion="simpleDetailsOpen = true"
            />
            <ProveedorAutocomplete
              v-if="!mostrarProveedorPendienteOcr && formData.flow === 'COMPRA'"
              v-model="proveedor"
              @add-new="showProveedorModal = true"
            />
            <ClienteNegocioAutocomplete
              v-if="formData.flow !== 'COMPRA'"
              v-bind="propsClienteNegocio"
              v-model:rif="counterpartRif"
              v-model:telefono="clientePhone"
              v-on="eventosClienteNegocio"
            />
            <AvisoAmable
              v-if="formData.flow !== 'COMPRA' && clienteEspecial"
              tipo="info"
              mensaje="Este cliente te retiene IVA; pídele el comprobante."
              class="mt-2"
              data-testid="aviso-cliente-especial"
            />
          </v-col>

          <!-- ¿Cuánto? (total con impuesto incluido; reutiliza el motor fiscal
               de siempre en reversa, ver onSimpleTotalInput) -->
          <v-col cols="12" sm="6">
            <p class="sif-section-label">
              ¿Cuánto?
              <AyudaTermino clave="iva" />
            </p>
            <NumericInput
              :model-value="formData.financial.totalSales"
              @update:model-value="onSimpleTotalInput"
              :prefix="currencySymbol"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>

          <!-- ¿Cuándo? -->
          <v-col cols="12" sm="6">
            <p class="sif-section-label">¿Cuándo?</p>
            <CustomDatePicker
              v-model="formData.issueDate"
              :rules="[v => !!v || 'La fecha es requerida']"
            />
          </v-col>

          <!-- COMPRA/GASTO: ¿En qué? · VENTA: ¿Cómo te pagaron? -->
          <v-col cols="12" v-if="formData.flow === 'COMPRA'">
            <p class="sif-section-label">
              ¿En qué?
              <v-chip v-if="categoriaSugerida" size="x-small" color="info" variant="tonal" class="ml-1">
                Sugerido
              </v-chip>
            </p>
            <ExpenseCategorySelector
              v-model="formData.expense_category_id"
              :client-id="currentUser?.client?.id"
              :rules="[v => !!v || 'La categoría es requerida']"
              @category-selected="categoriaSugerida = false"
            />
          </v-col>
          <v-col cols="12" v-else>
            <p class="sif-section-label">¿Cómo te pagaron?</p>
            <v-select
              v-model="formData.financial.paymentMethod"
              :items="paymentMethods"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
            />
          </v-col>
        </v-row>

        <!-- Retenciones: solo si el cliente es agente de retención (ver
             clienteEsAgenteRetencion) y hay algo que retener en esta compra. -->
        <div v-if="simpleMostrarAvisoRetencion" class="d-flex align-center ga-1 mt-3 text-body-2 text-medium-emphasis" data-testid="simple-aviso-retencion">
          <v-icon size="18" color="primary">mdi-file-certificate-outline</v-icon>
          <span>También preparamos tu comprobante de retención.</span>
          <AyudaTermino clave="comprobante_de_retencion" />
        </div>
      </div>

      <EnvolturaDetallesContables
        :simple="simple"
        :abierto="simpleDetailsOpen"
        @update:abierto="v => { simpleDetailsOpen = v }"
      >
      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 0: ESCANEAR CON IA (siempre visible arriba)
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section sif-ocr-banner ad-ia ad-ia--contenedor" :class="{ 'sif-ocr-active': ocrPanelOpen }">
        <div
          class="d-flex align-center justify-space-between cursor-pointer"
          @click="ocrPanelOpen = !ocrPanelOpen"
        >
          <div class="d-flex align-center ga-2">
            <v-icon size="22" class="sif-ia-icono">mdi-creation</v-icon>
            <span class="font-weight-medium text-body-2">
              ¿Tienes la factura en papel o PDF? <strong>Deja que la IA la lea por ti</strong>
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
                      class="d-flex align-center ga-1 text-caption mb-1"
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
          <v-col cols="12" sm="5" ref="simpleDetalleInvoiceNumber">
            <v-text-field
              v-model="formData.invoiceNumber"
              label="Número de factura o recibo"
              placeholder="Ej: FAC-2024-001"
              variant="outlined"
              density="comfortable"
              :rules="invoiceNumberRules"
              :loading="checkingDuplicate"
              :append-inner-icon="isDuplicate ? 'mdi-alert-circle' : (getAiIcon('invoiceNumber') || (formData.invoiceNumber && !checkingDuplicate ? 'mdi-check-circle' : undefined))"
              :color="isDuplicate ? 'error' : (getAiColor('invoiceNumber') || 'primary')"
              hide-details="auto"
              class="mb-2"
            />
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
              :append-inner-icon="getAiIcon('controlNumber')"
              :color="getAiColor('controlNumber') || 'primary'"
            />
          </v-col>

          <!-- Fecha -->
          <v-col cols="12" sm="3">
            <CustomDatePicker
              v-model="formData.issueDate"
              label="Fecha"
              class="mb-2"
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
              :append-inner-icon="getAiIcon('documentType')"
              :color="getAiColor('documentType') || 'primary'"
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

          <!-- Categoría del Gasto -->
          <v-col cols="12" sm="6" v-if="formData.flow === 'COMPRA' && formData.expense_type === 'GASTO'">
            <div class="d-flex align-center ga-1 mb-1">
              <span class="text-caption text-medium-emphasis">Categoría del Gasto</span>
              <v-chip v-if="categoriaSugerida" size="x-small" color="info" variant="tonal">Sugerido</v-chip>
            </div>
            <ExpenseCategorySelector
              v-model="formData.expense_category_id"
              :client-id="currentUser?.client?.id"
              label="Categoría del Gasto"
              class="mb-2"
              :rules="[v => !!v || 'La categoría es requerida']"
              @category-selected="categoriaSugerida = false"
            />
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
              :append-inner-icon="getAiIcon('status')"
              :color="getAiColor('status') || 'primary'"
            />
          </v-col>

          <!-- Moneda -->
          <v-col cols="12" sm="6" md="4">
            <div class="moneda-selector mb-2" role="radiogroup" aria-label="Moneda de la factura" data-testid="moneda-selector">
              <div class="moneda-selector__etiqueta">
                Moneda
                <v-icon v-if="getAiIcon('currency')" :icon="getAiIcon('currency')" size="16" :color="getAiColor('currency') || 'primary'" />
              </div>
              <div class="moneda-selector__botones">
                <v-btn
                  v-for="cod in monedasVista"
                  :key="cod"
                  role="radio"
                  :aria-checked="formData.financial.currency === cod ? 'true' : 'false'"
                  :variant="formData.financial.currency === cod ? 'flat' : 'outlined'"
                  :color="formData.financial.currency === cod ? 'primary' : undefined"
                  class="text-none moneda-selector__boton"
                  :data-testid="`moneda-${cod}`"
                  @click="elegirMoneda(cod)"
                >
                  {{ currencyLabel(cod) }}
                </v-btn>
                <v-menu>
                  <template #activator="{ props: menuProps }">
                    <v-btn
                      v-bind="menuProps"
                      role="radio"
                      :aria-checked="esOtraMoneda ? 'true' : 'false'"
                      :variant="esOtraMoneda ? 'flat' : 'outlined'"
                      :color="esOtraMoneda ? 'primary' : undefined"
                      append-icon="mdi-menu-down"
                      class="text-none moneda-selector__boton"
                      data-testid="moneda-otra"
                    >
                      {{ esOtraMoneda ? currencyLabel(formData.financial.currency) : 'Otra moneda' }}
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item
                      v-for="cod in monedasOtras"
                      :key="cod"
                      :title="`${MONEDAS[cod].nombre} (${cod})`"
                      :data-testid="`moneda-opcion-${cod}`"
                      @click="elegirMoneda(cod)"
                    />
                  </v-list>
                </v-menu>
              </div>
            </div>
          </v-col>

          <!-- Método de pago -->
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="formData.financial.paymentMethod"
              :items="paymentMethods"
              label="Método de pago (Opc.)"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              class="mb-2"
              :append-inner-icon="getAiIcon('paymentMethod')"
              :color="getAiColor('paymentMethod') || 'primary'"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <img v-if="item.raw.customIcon" :src="item.raw.customIcon" width="18" height="18" class="mr-3" />
                    <v-icon v-else :color="item.raw.color" size="small" class="mr-2">{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
              <template v-slot:selection="{ item }">
                <div class="d-flex align-center">
                  <v-chip v-if="item.raw.value === 'CASHEA'" color="#000000" style="background-color: #fdfa3d;" size="small" class="font-weight-bold px-2 py-0">
                    <img :src="item.raw.customIcon" width="14" height="14" class="mr-1" />
                    Cashea
                  </v-chip>
                  <template v-else>
                    <v-icon :color="item.raw.color" size="small" class="mr-2">{{ item.raw.icon }}</v-icon>
                    <span>{{ item.title }}</span>
                  </template>
                </div>
              </template>
            </v-select>
          </v-col>

        <!-- Referencia -->
          <v-col cols="12" sm="6" md="3" v-if="formData.financial.paymentMethod">
            <v-text-field
              v-model="formData.financial.paymentReference"
              :label="formData.financial.paymentMethod === 'CASHEA' ? 'Referencia Cashea' : 'Referencia (Opc.)'"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mb-2"
              :append-inner-icon="getAiIcon('paymentReference')"
              :color="getAiColor('paymentReference') || 'primary'"
            />
          </v-col>
        </v-row>

        <!-- Panel de Crédito / Cashea -->
        <v-expand-transition>
          <div v-if="formData.financial.paymentMethod === 'CASHEA'" class="mt-4 px-4 py-3 bg-grey-lighten-4 rounded-lg border">
            <div class="text-subtitle-2 font-weight-bold mb-3 d-flex align-center">
              <v-icon color="black" class="mr-2">mdi-calendar-month</v-icon>
              Cronograma de Pagos Cashea
            </div>
            
            <v-row dense>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="formData.financial.credit.initialPercentage"
                  label="% Inicial"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @input="onInitialPercentageChange"
                  suffix="%"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="formData.financial.credit.initialAmount"
                  label="Monto Inicial"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @input="onInitialAmountChange"
                  :prefix="formData.financial.currency === 'USD' ? '$' : 'Bs'"
                />
              </v-col>
              <v-col cols="12" sm="4">
                <v-select
                  v-model.number="formData.financial.credit.installmentsCount"
                  :items="[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]"
                  label="Cant. Cuotas"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:modelValue="generateInstallments"
                />
              </v-col>
            </v-row>

            <div class="mt-4" v-if="formData.financial.credit && formData.financial.credit.installments && formData.financial.credit.installments.length">
              <div class="text-caption text-grey-darken-1 mb-2">Detalle de cuotas:</div>
              <v-table density="compact" class="bg-transparent">
                <thead>
                  <tr>
                    <th class="text-left" style="width: 50px">#</th>
                    <th class="text-left">Fecha</th>
                    <th class="text-right">Monto</th>
                    <th class="text-center" style="width: 140px">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(inst, idx) in formData.financial.credit.installments" :key="inst.id">
                    <td>{{ idx + 1 }}</td>
                    <td>
                      <input type="date" v-model="inst.date" class="date-input-naked" />
                    </td>
                    <td class="text-right font-weight-medium">
                      {{ formatNumber(inst.amount) }} {{ formData.financial.currency }}
                    </td>
                    <td class="text-center">
                      <v-select
                        v-model="inst.status"
                        :items="['POR_COBRAR', 'PAGADA']"
                        density="compact"
                        variant="underlined"
                        hide-details
                        @update:modelValue="checkAllInstallmentsPaid"
                        class="status-select-naked"
                      >
                        <template v-slot:selection="{ item }">
                          <v-chip size="x-small" :color="item.value === 'PAGADA' ? 'success' : 'error'" class="font-weight-bold">
                            {{ item.value === 'PAGADA' ? 'Pagada' : 'Por Cobrar' }}
                          </v-chip>
                        </template>
                      </v-select>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </div>
        </v-expand-transition>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 3: ¿A QUIÉN?
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <p class="sif-section-label">
          {{ formData.flow === 'VENTA' ? '¿A quién le estás vendiendo?' : '¿De quién es esta factura?' }}
        </p>
        <v-row dense>
          <!-- COMPRA: Selector de Proveedor -->
          <v-col cols="12" v-if="formData.flow === 'COMPRA'">
            <div v-if="mostrarProveedorPendienteOcr" class="sif-proveedor-pendiente" data-testid="proveedor-pendiente-ocr-detalle">
              <v-icon color="primary" size="22">mdi-domain-plus</v-icon>
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ proveedorPendienteOcr.nombre }}</div>
                <v-chip size="x-small" color="primary" variant="tonal" class="mt-1">
                  Nuevo proveedor — se guardará al registrar
                </v-chip>
              </div>
              <v-btn size="small" variant="text" color="primary" @click="cancelarProveedorPendienteOcr">
                Buscar otro
              </v-btn>
            </div>
            <ProveedorAutocomplete
              v-else
              ref="proveedorAutocomplete"
              v-model="proveedor"
              @add-new="showProveedorModal = true"
            />
          </v-col>

          <!-- VENTA: Campos de Cliente -->
          <template v-else>
            <v-col cols="12">
              <ClienteNegocioAutocomplete
                v-bind="propsClienteNegocio"
                label="¿A quién le vendiste?"
                v-model:rif="counterpartRif"
                v-model:telefono="clientePhone"
                v-on="eventosClienteNegocio"
                class="mb-2"
              />
              <AvisoAmable
                v-if="clienteEspecial"
                tipo="info"
                mensaje="Este cliente te retiene IVA; pídele el comprobante."
                class="mb-2"
                data-testid="aviso-cliente-especial"
              />
            </v-col>
          </template>

          <!-- Mis datos (pre-llenados, colapsables) -->
          <v-col cols="12">
            <div
              class="d-flex align-center ga-1 cursor-pointer text-caption text-primary mb-1"
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
      <div class="sif-section" ref="simpleDetalleItems">
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
                <div v-if="item.code && !item.product_id" class="d-flex align-center ga-1 mb-1">
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
              <v-col cols="6" sm="2">
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
                  v-if="item.product && showProductSearch && item.product.tipo !== 'servicio'"
                  class="text-caption mt-0 pl-1"
                  :class="isStockError(item) ? 'text-error font-weight-bold' : 'text-grey'"
                >
                  Disponible: {{ item.product.stock }} {{ item.product.unit || 'und' }}
                </div>
              </v-col>

              <!-- Precio -->
              <v-col cols="6" sm="2">
                <NumericInput
                  v-model="item.unitPrice"
                  label="Precio"
                  :prefix="currencySymbol"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="updateItemTotal(index)"
                />
              </v-col>

              <!-- Total (calculado automáticamente) -->
              <v-col cols="10" sm="2">
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
              <v-col cols="2" sm="1" class="d-flex justify-end justify-sm-center">
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
            <NumericInput
              v-model="formData.financial.taxableSales"
              label="Subtotal (base)"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
              :append-inner-icon="getAiIcon('taxableSales')"
              :color="getAiColor('taxableSales')"
              @update:model-value="onTaxableSalesChange"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <NumericInput
              v-model="formData.financial.taxDebit"
              label="IVA (16%)"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
              :append-inner-icon="getAiIcon('taxDebit')"
              :color="getAiColor('taxDebit')"
              @update:model-value="onTaxDebitChange"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <NumericInput
              v-model="formData.financial.nonTaxableSales"
              label="Monto exento"
              :prefix="currencySymbol"
              variant="outlined"
              density="compact"
              hide-details
              :readonly="!manualMode"
              :bg-color="manualMode ? 'white' : 'grey-lighten-4'"
              :append-inner-icon="getAiIcon('nonTaxableSales')"
              :color="getAiColor('nonTaxableSales')"
              @update:model-value="onNonTaxableSalesChange"
            />
          </v-col>
          <v-col cols="12" sm="6" md="3" class="d-flex">
            <!-- Display personalizado para el TOTAL con Vuetify -->
            <v-sheet 
              class="rounded-lg px-4 py-2 d-flex flex-column justify-center w-100 position-relative" 
              :class="{ 'elevation-2': !manualMode, 'elevation-0 border': manualMode }"
              color="blue-darken-4"
              min-height="64"
              :border="getAiColor('totalSales') ? getAiColor('totalSales') : (manualMode ? 'info' : false)"
            >
              <div class="d-flex align-center justify-space-between mb-0 pb-0">
                <span class="text-overline text-white opacity-70" style="line-height: 1.2;">
                  TOTAL
                  <v-icon v-if="getAiIcon('totalSales')" :color="getAiColor('totalSales')" size="12" class="ml-1" :title="getAiTooltip('totalSales')">{{ getAiIcon('totalSales') }}</v-icon>
                  <v-icon v-if="manualMode" size="10" class="ml-1 opacity-70">mdi-pencil</v-icon>
                </span>
                <v-btn
                  v-if="hasManualTotalDiscrepancy"
                  size="x-small"
                  variant="flat"
                  color="warning"
                  density="compact"
                  class="font-weight-bold ml-1 px-1 text-none"
                  style="font-size: 10px; height: 20px;"
                  title="El total difiere de la suma de Base + IVA + Exento. Clic para volver a sumar automáticamente."
                  @click="recalculateTotalFromParts"
                >
                  <v-icon start size="10">mdi-refresh</v-icon>
                  Auto-sumar
                </v-btn>
              </div>

              <div class="d-flex align-baseline mb-1">
                <span class="text-caption font-weight-bold text-white opacity-80 mr-1">{{ currencySymbol }}</span>
                <input 
                  v-if="manualMode"
                  type="text"
                  inputmode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  :value="formData.financial.totalSales"
                  @input="onManualTotalInput($event.target.value)"
                  class="text-h6 font-weight-bold text-white flex-grow-1"
                  style="background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.3); outline: none;"
                />
                <span v-else class="text-h6 font-weight-bold text-white">{{ formatNumber(formData.financial.totalSales) }}</span>
              </div>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- Tasa de cambio — USD y EUR (Multi-Moneda First-Mobile) -->
        <div v-if="esMonedaExtranjera" class="mt-3 pa-3 bg-grey-lighten-5 rounded-lg border" data-testid="tasa-factura">
          <div class="d-flex flex-wrap align-center justify-space-between ga-2">
            <!-- Tasa y Fuente -->
            <div class="d-flex align-center flex-wrap ga-2">
              <v-icon :color="formData.financial.currency === 'EUR' ? 'warning' : 'info'" size="18">
                {{ iconoMoneda }}
              </v-icon>
              
              <span class="text-caption font-weight-medium">
                Tasa de cambio:
              </span>

              <!-- Vista / Edición de Tasa -->
              <div v-if="!isEditingExchangeRate" class="d-flex align-center ga-1">
                <v-chip size="small" variant="flat" :color="formData.financial.currency === 'USD' ? 'blue-lighten-5' : 'amber-lighten-5'" class="font-weight-bold text-body-2">
                  {{ formatExchangeRate(currentExchangeRateValue) }} Bs/{{ formData.financial.currency }}
                </v-chip>
                <v-btn
                  icon="mdi-pencil"
                  size="x-small"
                  variant="text"
                  color="primary"
                  title="Editar tasa manualmente"
                  @click="isEditingExchangeRate = true"
                />
              </div>
              <div v-else class="d-flex align-center ga-1" style="width: 210px; max-width: 100%;">
                <NumericInput
                  v-model="activeExchangeRateModel"
                  placeholder="0,0000"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :max-decimals="4"
                  class="flex-grow-1"
                  @update:model-value="onManualExchangeRateChange"
                />
                <v-btn
                  icon="mdi-check"
                  size="small"
                  color="success"
                  variant="flat"
                  title="Guardar tasa"
                  @click="isEditingExchangeRate = false"
                />
              </div>

              <!-- Indicador de fecha/origen de la tasa -->
              <span class="text-caption text-grey font-italic">
                ({{ rateSourceLabel }})
              </span>
            </div>

            <!-- Accesos rápidos de Tasa (First Mobile) -->
            <div class="d-flex align-center ga-1 flex-wrap">
              <v-btn
                size="x-small"
                variant="outlined"
                color="secondary"
                prepend-icon="mdi-calendar"
                title="Aplicar tasa oficial BCV de la fecha de la factura"
                @click="applyInvoiceDateRate"
              >
                Tasa Fecha Factura
              </v-btn>
              <v-btn
                size="x-small"
                variant="outlined"
                color="info"
                prepend-icon="mdi-clock-outline"
                title="Aplicar tasa oficial BCV del día actual de registro"
                @click="applyTodayRate"
              >
                Tasa de Hoy
              </v-btn>
            </div>
          </div>

          <!-- Equivalente en Bolívares -->
          <div class="mt-2 text-caption d-flex align-center">
            <span class="text-grey mr-1">Equivalente en Bolívares:</span>
            <strong class="text-primary text-body-2 font-weight-bold">
              ≈ Bs. {{ formatNumber(equivalentInBs) }}
            </strong>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN: RETENCIONES
      ══════════════════════════════════════════════════════════ -->
      <!-- Resumen de Retenciones (solo COMPRA) -->
      <div v-if="formData.flow === 'COMPRA'" class="mt-4 mx-3">
        <!-- Fecha de Emisión del Comprobante de Retención.
             W20: antes solo se mostraba con retencionesResult (cálculo en vivo), que
             queda null al editar una factura ya guardada (el proveedor no se
             recarga). Ahora también se muestra si la factura YA TIENE montos de
             retención guardados, para poder corregir la fecha del comprobante. -->
        <v-row dense class="mb-1" v-if="hasRetencionesRegistradas">
          <v-col cols="12" sm="6" md="4">
            <CustomDatePicker
              v-model="formData.financial.retentionDate"
              label="Fecha de Emisión de Retención"
              :min="formData.issueDate"
              :max="todayDate"
              hint="Fecha de emisión del comprobante (no puede ser futura ni anterior a la factura). Editable también al corregir una compra ya guardada."
              persistent-hint
            />
          </v-col>
        </v-row>

        <!-- C1: Fecha fiscal (mes en que se declara esta compra en el Libro de
             Compras). Solo COMPRA. Se prellena con la fecha del comprobante de
             retención de IVA si existe, o con la fecha de emisión si no; el
             usuario puede corregirla manualmente. -->
        <v-row dense class="mb-1">
          <v-col cols="12" sm="6" md="4">
            <CustomDatePicker
              :model-value="formData.fecha_fiscal"
              @update:model-value="val => { formData.fecha_fiscal = val; fechaFiscalManuallyEdited = true; }"
              label="Fecha fiscal (mes en que declaras esta compra)"
              hint="Determina en qué Libro de Compras (mes) aparece esta operación. Por defecto usa la fecha del comprobante de retención de IVA; si no hay retención, usa la fecha de emisión."
              persistent-hint
            />
          </v-col>
        </v-row>

        <RetentionSummaryCard
          :proveedor="proveedor"
          :aplicarIva="retentionConfig.aplicarIva"
          :aplicarIslr="retentionConfig.aplicarIslr"
          :aplicarMunicipal="retentionConfig.aplicarMunicipal"
          :conceptoIslrNombre="retentionConfig.conceptoIslrNombre"
          :conceptoMunicipalNombre="retentionConfig.conceptoMunicipalNombre"
          @adjust="showAdjustSheet = true"
        />

        <!-- C7: advertencia de municipio distinto (no bloquea, se puede confirmar) -->
        <v-alert
          v-if="municipalMismatch.detected"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mt-2 mb-2"
        >
          <div class="text-body-2">
            Tu proveedor está en <strong>{{ municipalMismatch.issuerNombre }}</strong> y tu empresa en
            <strong>{{ municipalMismatch.tenantNombre }}</strong>. Normalmente no corresponde retener
            impuesto municipal en este caso.
          </div>
          <v-btn
            v-if="!municipalMismatchConfirmed"
            size="small"
            color="warning"
            variant="flat"
            class="mt-2"
            @click="confirmMunicipalMismatch"
          >
            Continuar igual
          </v-btn>
          <div v-else class="text-caption mt-1">
            Confirmaste continuar con la retención municipal pese a la diferencia de municipio.
          </div>
        </v-alert>

        <!-- Números de Comprobante de Retención (COMPRA) -->
        <v-card v-if="hasRetencionesRegistradas" ref="simpleDetalleRetenciones" class="mt-4 pa-4 rounded-lg" variant="outlined" color="grey-lighten-2">
          <p class="sif-section-label text-black">Comprobantes de Retención</p>
          <div class="text-caption text-grey-darken-1 mb-3">
            Números auto-generados. Activa la edición manual si necesitas modificarlos.
          </div>
          <v-row dense class="mx-0 mt-1">
            <!-- IVA comprobante -->
            <v-col cols="12" sm="4" v-if="showIvaComprobante">
              <v-text-field
                v-model="formData.financial.ivaRetentionNumber"
                label="Nro. Comprobante IVA"
                variant="outlined"
                density="comfortable"
                :class="{'text-black': editarComprobanteIva}"
                :readonly="!editarComprobanteIva"
                :error="comprobanteDuplicado.iva"
                :error-messages="comprobanteDuplicado.iva ? 'Este número ya existe' : ''"
                @update:model-value="checkComprobanteDuplicado('iva', $event)"
              >
                <template v-slot:append-inner>
                  <v-tooltip location="top" text="Editar manualmente">
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        :color="editarComprobanteIva ? 'black' : 'grey'"
                        size="small"
                        @mousedown.stop.prevent="editarComprobanteIva = !editarComprobanteIva; retentionCorrelativoManuallyEdited = true;"
                        style="cursor: pointer; pointer-events: auto;"
                      >
                        {{ editarComprobanteIva ? 'mdi-pencil' : 'mdi-pencil-off' }}
                      </v-icon>
                    </template>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>
            <!-- ISLR comprobante -->
            <v-col cols="12" sm="4" v-if="showIslrComprobante">
              <v-text-field
                v-model="formData.financial.islrRetentionNumber"
                label="Nro. Comprobante ISLR"
                variant="outlined"
                density="comfortable"
                :class="{'text-black': editarComprobanteIslr}"
                :readonly="!editarComprobanteIslr"
                :error="comprobanteDuplicado.islr"
                :error-messages="comprobanteDuplicado.islr ? 'Este número ya existe' : ''"
                @update:model-value="checkComprobanteDuplicado('islr', $event)"
              >
                <template v-slot:append-inner>
                  <v-tooltip location="top" text="Editar manualmente">
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        :color="editarComprobanteIslr ? 'black' : 'grey'"
                        size="small"
                        @mousedown.stop.prevent="editarComprobanteIslr = !editarComprobanteIslr; retentionCorrelativoManuallyEdited = true;"
                        style="cursor: pointer; pointer-events: auto;"
                      >
                        {{ editarComprobanteIslr ? 'mdi-pencil' : 'mdi-pencil-off' }}
                      </v-icon>
                    </template>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>
            <!-- Municipal comprobante -->
            <v-col cols="12" sm="4" v-if="showMunicipalComprobante">
              <v-text-field
                v-model="formData.financial.municipalRetentionNumber"
                label="Nro. Comprobante Municipal"
                variant="outlined"
                density="comfortable"
                :class="{'text-black': editarComprobanteMunicipal}"
                :readonly="!editarComprobanteMunicipal"
                :error="comprobanteDuplicado.municipal"
                :error-messages="comprobanteDuplicado.municipal ? 'Este número ya existe' : ''"
                @update:model-value="checkComprobanteDuplicado('municipal', $event)"
              >
                <template v-slot:append-inner>
                  <v-tooltip location="top" text="Editar manualmente">
                    <template v-slot:activator="{ props }">
                      <v-icon
                        v-bind="props"
                        :color="editarComprobanteMunicipal ? 'black' : 'grey'"
                        size="small"
                        @mousedown.stop.prevent="editarComprobanteMunicipal = !editarComprobanteMunicipal; retentionCorrelativoManuallyEdited = true;"
                        style="cursor: pointer; pointer-events: auto;"
                      >
                        {{ editarComprobanteMunicipal ? 'mdi-pencil' : 'mdi-pencil-off' }}
                      </v-icon>
                    </template>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </v-card>
      </div>

      <!-- Ingreso Manual de Retenciones (solo VENTA) -->
      <div v-else-if="formData.flow === 'VENTA'" class="sif-section">
        <p class="sif-section-label">Retenciones aplicadas por tu cliente (Opcional)</p>
        <div class="text-caption text-grey-darken-1 mb-3">
          Si tu cliente es Contribuyente Especial y te aplicó retenciones, regístralas aquí para que se deduzcan de tu total a pagar de impuestos.
        </div>
        <v-row dense>
          <v-col cols="12" sm="4">
            <NumericInput
              v-model="formData.financial.ivaRetention"
              label="Retención IVA"
              prefix="Bs."
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
            <v-text-field
              v-if="formData.financial.ivaRetention > 0"
              v-model="formData.financial.ivaRetentionNumber"
              label="Nro. Comprobante IVA"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mt-2"
              placeholder="Ej: 20260800000001"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <NumericInput
              v-model="formData.financial.islrRetention"
              label="Retención ISLR"
              prefix="Bs."
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
            <v-text-field
              v-if="formData.financial.islrRetention > 0"
              v-model="formData.financial.islrRetentionNumber"
              label="Nro. Comprobante ISLR"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mt-2"
              placeholder="Ej: ISLR-2026-00000001"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <NumericInput
              v-model="formData.financial.municipalRetention"
              label="Retención Municipal"
              prefix="Bs."
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
            <v-text-field
              v-if="formData.financial.municipalRetention > 0"
              v-model="formData.financial.municipalRetentionNumber"
              label="Nro. Comprobante Municipal"
              variant="outlined"
              density="comfortable"
              hide-details
              class="mt-2"
              placeholder="Ej: MUN-2026-00000001"
            />
          </v-col>
        </v-row>
      </div>

      <!-- ══════════════════════════════════════════════════════
           SECCIÓN 6: NOTAS (colapsable)
      ══════════════════════════════════════════════════════════ -->
      <div class="sif-section">
        <div
          class="d-flex align-center ga-1 cursor-pointer mb-2"
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
      </EnvolturaDetallesContables>
    </v-card-text><!-- /sif-body -->

    <v-divider />

    <!-- FOOTER fijo -->
    <v-card-actions class="sif-footer pa-4 flex-column align-stretch">

      <!-- Barra de progreso de guardado -->
      <v-expand-transition>
        <div v-if="saving" class="mb-3 w-100">
          <div class="d-flex align-center ga-2 mb-1">
            <v-progress-circular size="16" width="2" indeterminate color="primary" />
            <span class="text-caption text-primary font-weight-medium">{{ savingStep }}</span>
          </div>
          <v-progress-linear indeterminate color="primary" rounded height="3" />
        </div>
      </v-expand-transition>

      <!-- Modo simple: un solo botón "Guardar" fijo de 56px (BotonAccion) -->
      <div v-if="simple" class="w-100" data-testid="simple-guardar">
        <BotonAccion
          texto="Guardar"
          icono="mdi-content-save"
          variante="primaria"
          tamano="principal"
          :cargando="saving"
          :deshabilitado="saving"
          @click="simpleHandleSubmit"
        />
      </div>

      <div v-else class="d-flex align-center ga-3 w-100">
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

    </template>
    <!-- /v-else: Paso 2 del modo simple, o formulario completo -->

    <!-- Snackbar: siempre presente, sin importar el paso del modo simple -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />

  </v-form>
  </v-card>

  <!-- Modal completo del Directorio de Proveedores para crear/editar con parámetros fiscales -->
  <ProveedorModalForm
    v-model="showProveedorModal"
    :initial-data="proveedorInitialData"
    @saved="onNewProveedorSaved"
  />

  <!-- Sheet para ajustar retenciones manualmente -->
  <RetentionAdjustSheet
    v-if="formData.flow === 'COMPRA'"
    v-model="showAdjustSheet"
    :config="retentionConfig"
    :municipio="formData.client?.municipio_id || formData.client?.municipio || ''"
    :estado="formData.client?.estado || ''"
    :licencia="formData.issuer?.licencia_actividad_economica || ''"
    @update:config="cfg => { retentionConfig = cfg; calcularRetenciones(); }"
  />
</template>

<script>
import invoiceService from '@/services/invoiceService.js';
import userService from '@/services/userService.js';
import { procesarComprobanteOCR } from '@/services/gemini/geminiOcrService.js';
import inventoryService from '@/services/inventoryService.js';
import { excedeStock } from '@/utils/stockVenta';
import bcvService from '@/services/bcvService.js';
import { tasasVigentes } from '@/services/tasaService.js';
import { MONEDAS, MONEDAS_VISTA, MONEDAS_OTRAS, normalizarTasas } from '@/utils/monedas.js';
import proveedorService from '@/services/proveedorService.js';
import TrabajandoIA from '@/components/ui/TrabajandoIA.vue';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import FileUploadZone from '@/components/common/FileUploadZone.vue';
import CustomDatePicker from '@/components/common/CustomDatePicker.vue';
import ProductAutocomplete from '@/components/common/ProductAutocomplete.vue';
import ExpenseCategorySelector from '@/components/common/ExpenseCategorySelector.vue';
import ClienteNegocioAutocomplete from '@/components/forms/ClienteNegocioAutocomplete.vue'
import ProveedorAutocomplete from '@/components/forms/ProveedorAutocomplete.vue';
import ProveedorModalForm from '@/components/forms/ProveedorModalForm.vue';
import RetentionSummaryCard from '@/components/forms/RetentionSummaryCard.vue';
import RetentionAdjustSheet from '@/components/forms/RetentionAdjustSheet.vue';
import NumericInput from '@/components/common/NumericInput.vue';
import { supabase } from '@/lib/supabaseClient';
import { municipalConceptsService } from '@/services/municipalConceptsService.js';
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js';
import BotonAccion from '@/components/ui/BotonAccion.vue';
import PasoGuiado from '@/components/ui/PasoGuiado.vue';
import TarjetaAccion from '@/components/ui/TarjetaAccion.vue';
import AyudaTermino from '@/components/ui/AyudaTermino.vue';
import AvisoAmable from '@/components/ui/AvisoAmable.vue';
import EnvolturaDetallesContables from './EnvolturaDetallesContables.vue';
import { hoyISO } from '@/utils/fechas';
import GLOSARIO from '@/constants/glosario.js';
import retentionPdfService from '@/services/retention-pdf-service.js';
import { normalizarRif, tipoPersonaPorLetra } from '@/utils/rif.js';
import { decidirMatchProveedor, construirProveedorPendiente } from '@/utils/matchProveedorOcr.js';
import { sugerirCategoria, resolverCategoriaPorNombre } from '@/utils/sugerirCategoria.js';
import expenseCategoryService from '@/services/expenseCategoryService.js';

export function normalizeDateToYMD(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(dateInput).trim();
  if (str.includes('T')) return str.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
}

let _itemKey = 0;

export default {
  name: 'SimpleInvoiceForm',
  components: { TrabajandoIA, EnvolturaDetallesContables,
    AppSnackbar, FileUploadZone, CustomDatePicker, ProductAutocomplete,
    ExpenseCategorySelector, ProveedorAutocomplete, ClienteNegocioAutocomplete, ProveedorModalForm,
    RetentionSummaryCard, RetentionAdjustSheet, NumericInput,
    BotonAccion, PasoGuiado, TarjetaAccion, AyudaTermino, AvisoAmable
  },

  props: {
    invoice: { type: Object, default: null },
    flow:    { type: String, default: 'VENTA' },
    // Fase 2 — modo simple (ver docs/mvp/diseno/fase2-spec.md §3).
    // false (por defecto): el formulario se ve y funciona EXACTAMENTE igual que
    // hoy (lo usa Facturacion.vue). true: presenta un asistente de 2 pasos
    // (¿Tienes la factura? → Confirma 4 datos) con el resto del formulario
    // disponible, sin cambios de lógica, dentro de "Ver detalles contables".
    simple:  { type: Boolean, default: false },
    // Mis clientes: cliente (fila de clientes_negocio) con el que se abre una venta nueva
    // ("Registrar venta a este cliente"). Solo aplica al crear, no al editar.
    clienteInicial: { type: Object, default: null }
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
      manualTotalOverride: false,
      isEditingExchangeRate: false,
      rateSourceLabel: 'BCV oficial',
      // Tasas vigentes del negocio (automáticas o definidas por el cliente), ver tasaService
      tasasHoy: {},
      modoTasa: 'automatica',
      MONEDAS,
      monedasVista: MONEDAS_VISTA,
      monedasOtras: MONEDAS_OTRAS,
      saving:         false,
      savingStep:     '',
      showFlowError:  false,
      snackbar: {
        show: false,
        message: '',
        type: 'info',
        timeout: 4000
      },

      // OCR
      extracting:  false,
      uploadedFile: null,
      ocrResult:   null,
      aiFieldsStatus: {}, // Guarda el estado de la extracción por campo: 'success', 'warning', 'not-found'

      // Duplicate check
      isDuplicate:      false,
      checkingDuplicate: false,
      duplicateError:   '',
      invoiceCheckTimer: null,

      // Usuario actual
      currentUser: null,

      // Mis clientes: el cliente elegido retiene IVA (aviso amable)
      clienteEspecial: false,

      // Retenciones
      proveedor: null,
      retentionConfig: {
        aplicarIva: false, porcentajeIva: 75, baseIva: 0,
        aplicarIslr: false, conceptoIslr: null, baseIslr: 0, conceptoIslrNombre: '', tipoPersona: 'JURIDICA',
        aplicarMunicipal: false, porcentajeMunicipal: 0, baseMunicipal: 0, concepto_municipal_id: null, conceptoMunicipalNombre: ''
      },
      retencionesResult: null,
      // C6: valor de la Unidad Tributaria vigente (configuracion_fiscal_global), para
      // replicar en la vista previa el sustraendo que aplica el RPC registrar_compra_con_retenciones.
      valorUT: null,
      // C7: advertencia de municipio distinto entre proveedor y empresa (no bloquea, se puede confirmar)
      municipalMismatch: { detected: false, tenantNombre: '', issuerNombre: '' },
      municipalMismatchConfirmed: false,
      // C1: si el usuario edita manualmente "Fecha fiscal", dejar de sobrescribirla automáticamente.
      fechaFiscalManuallyEdited: false,
      showProveedorModal: false,
      proveedorInitialData: null,
      showAdjustSheet: false,
      loadingRetentionConfig: false,

      // Categoría de gasto sugerida automáticamente a partir del OCR (Tarea C,
      // punto 2). Se limpia en cuanto el usuario toca el selector a mano.
      // Solo se prellena con confianza ALTA (historial del proveedor o
      // palabra clave fuerte). Con confianza MEDIA se deja en
      // `categoriaSugerenciaPendiente` y se muestra un chip "¿Es «X»?" que
      // el usuario debe tocar para aceptarla (I9).
      categoriaSugerida: false,
      categoriaSugerenciaPendiente: null,

      // Números de comprobante de retención — edición manual
      editarComprobanteIva: false,
      editarComprobanteIslr: false,
      editarComprobanteMunicipal: false,
      retentionCorrelativoManuallyEdited: false,
      comprobanteDuplicado: { iva: false, islr: false, municipal: false },
      comprobanteCheckTimers: { iva: null, islr: null, municipal: null },

      // Snackbar
      snackbar: { show: false, message: '', type: 'info', timeout: 4000 },

      // ──── Modo simple (Fase 2) ────────────────────────────────────────────────
      // Paso del asistente (1 = ¿Tienes la factura?, 2 = Confirma estos datos).
      simpleStep: 1,
      // true tras un guardado exitoso en modo simple: muestra la pantalla de éxito.
      simpleSuccess: false,
      // true/false: si el acordeón "Ver detalles contables" está abierto.
      simpleDetailsOpen: false,
      // Mensajes humanos rotativos mientras se lee el documento (sin jerga de OCR).
      simpleReadingMessages: [
        'Leyendo tu documento...',
        'Buscando el total...',
        'Revisando los datos...',
        'Ya casi está...'
      ],
      simpleReadingMsgIndex: 0,
      simpleReadingTimer: null,
      // true si en algún momento se registró una retención (para ofrecer "Descargar comprobante").
      simpleHuboRetencion: false,
      simpleDescargandoComprobante: false,

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
      invoiceStatuses: ['BORRADOR','EMITIDA','CRÉDITO','PAGADA','ANULADA'],
      currencies: ['VES','USD','EUR','CNY','TRY','RUB'],
      paymentMethods: [
        { title: 'Efectivo', value: 'EFECTIVO', icon: 'mdi-cash', color: 'green' },
        { title: 'Pago Móvil', value: 'PAGO_MOVIL', icon: 'mdi-cellphone', color: 'blue' },
        { title: 'Transferencia', value: 'TRANSFERENCIA', icon: 'mdi-bank', color: 'indigo' },
        { title: 'Zelle', value: 'ZELLE', icon: 'mdi-alpha-z-box', color: 'deep-purple' },
        { title: 'Punto de Venta', value: 'PUNTO_VENTA', icon: 'mdi-credit-card', color: 'orange' },
        { title: 'Cashea', value: 'CASHEA', customIcon: '/Cashea-black-icon.svg', color: '#000000', bg: '#fdfa3d' },
        { title: 'Otro', value: 'OTRO', icon: 'mdi-wallet', color: 'grey' }
      ],

      // ──── Datos del formulario ────────────────────────────────────────────────
      formData: {
        invoiceNumber:   '',
        controlNumber:   '',
        documentType:    'FACTURA',
        documentCategory:'FACTURA',
        flow:            'VENTA',
        expense_type:    null,
        expense_category_id: null,
        issueDate:       hoyISO(),
        // C1: mes en que se declara esta compra en el Libro de Compras (solo
        // COMPRA; se prellena en prefillFechaFiscal() con la fecha del
        // comprobante de retención de IVA, o con issueDate si no hay retención).
        fecha_fiscal:    hoyISO(),
        dueDate:         '',
        status:          'BORRADOR',

        cliente_negocio_id: null,
        issuer: { companyName:'', rif:'', taxpayerType:'PERSONA JURÍDICA', phone:'', email:'', website:'', address:'' },
        client: { companyName:'', rif:'', taxpayerType:'PERSONA JURÍDICA', phone:'', email:'', website:'', address:'' },

        financial: {
          totalSales: 0, nonTaxableSales: 0, taxableSales: 0,
          taxDebit: 0, ivaRetention: 0, islrRetention: 0,
          municipalRetention: 0, igtf: 0,
          ivaRetentionNumber: '', islrRetentionNumber: '', municipalRetentionNumber: '',
          retentionDate: hoyISO(),
          currency: 'VES', exchangeRate: 1, exchangeRateEur: null, tasas: {},
          paymentMethod: null, paymentReference: '',
          credit: null
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
      return MONEDAS[cur]?.simbolo || 'Bs';
    },

    // Moneda extranjera (cualquiera distinta del bolívar): pide tasa de cambio
    esMonedaExtranjera() {
      const cur = this.formData.financial.currency;
      return !!cur && cur !== 'VES' && !!MONEDAS[cur];
    },
    esOtraMoneda() {
      return MONEDAS_OTRAS.includes(this.formData.financial.currency);
    },
    iconoMoneda() {
      const cur = this.formData.financial.currency;
      return { USD: 'mdi-currency-usd', EUR: 'mdi-currency-eur', CNY: 'mdi-currency-cny', TRY: 'mdi-currency-try', RUB: 'mdi-currency-rub' }[cur] || 'mdi-cash';
    },

    // Muestra el buscador de productos si es VENTA o COMPRA de mercancía
    showProductSearch() {
      return (
        this.formData.flow === 'VENTA' ||
        (this.formData.flow === 'COMPRA' && this.formData.expense_type === 'COMPRA')
      );
    },

    // Tarea C (OCR), punto 1: el OCR leyó un proveedor (RIF/nombre) que no
    // está en el directorio del cliente. En vez del autocompletar normal se
    // muestra su nombre con una marca "Nuevo proveedor"; se crea de verdad
    // recién al guardar (ver registroService.guardarRegistro).
    proveedorPendienteOcr() {
      return this.formData?.issuer?._proveedorPendiente || null;
    },
    mostrarProveedorPendienteOcr() {
      return this.formData.flow === 'COMPRA' && !this.proveedor && !!this.proveedorPendienteOcr;
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

    // Mis clientes (VENTA): teléfono del cliente y conexión con el autocompletado
    clientePhone: {
      get() { return this.formData.client.phone; },
      set(v) { this.formData.client.phone = v; }
    },
    propsClienteNegocio() {
      return {
        clienteId: this.formData.cliente_negocio_id || null,
        nombre: this.formData.client.companyName || '',
        rif: this.formData.client.rif || '',
        telefono: this.formData.client.phone || ''
      };
    },
    eventosClienteNegocio() {
      return {
        seleccionar: this.elegirClienteNegocio,
        nuevo: ({ nombre }) => this.usarClienteNuevo(nombre),
        'consumidor-final': () => this.usarClienteNuevo('Consumidor final'),
        limpiar: () => this.usarClienteNuevo(''),
        'cliente-cargado': (c) => { this.clienteEspecial = !!c.es_contribuyente_especial; }
      };
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
    },

    todayDate() {
      return hoyISO();
    },

    currentExchangeRateValue() {
      if (this.formData.financial.currency === 'USD') {
        return this.formData.financial.exchangeRate || 1;
      }
      if (this.formData.financial.currency === 'EUR') {
        return this.formData.financial.exchangeRateEur || 1;
      }
      if (this.esOtraMoneda) {
        return this.formData.financial.tasas?.[this.formData.financial.currency] || 1;
      }
      return 1;
    },

    activeExchangeRateModel: {
      get() {
        return this.currentExchangeRateValue;
      },
      set(val) {
        this.guardarTasaDeMonedaActual(parseFloat(val) || 0);
      }
    },

    equivalentInBs() {
      const total = parseFloat(this.formData.financial.totalSales) || 0;
      const directRate = this.formData.financial.currency === 'USD'
        ? this.formData.financial.exchangeRate
        : this.formData.financial.currency === 'EUR'
          ? this.formData.financial.exchangeRateEur
          : this.esOtraMoneda
            ? this.formData.financial.tasas?.[this.formData.financial.currency]
            : 1;
      const rate = parseFloat(this.currentExchangeRateValue ?? directRate) || directRate || 1;
      return total * rate;
    },

    hasManualTotalDiscrepancy() {
      if (!this.manualMode) return false;
      const base = parseFloat(this.formData.financial.taxableSales) || 0;
      const exento = parseFloat(this.formData.financial.nonTaxableSales) || 0;
      const iva = parseFloat(this.formData.financial.taxDebit) || 0;
      const igtf = parseFloat(this.formData.financial.igtf) || 0;
      const calculated = parseFloat((base + exento + iva + igtf).toFixed(2));
      const current = parseFloat(Number(this.formData.financial.totalSales || 0).toFixed(2));
      return Math.abs(calculated - current) >= 0.01;
    },

    // W20: antes esta sección dependía SOLO de retencionesResult (cálculo en
    // vivo), que queda en null al editar una factura ya guardada porque el
    // proveedor no se recarga automáticamente. Ahora también cuenta lo que ya
    // está guardado en formData.financial, para poder corregir la fecha/número
    // del comprobante de una compra ya registrada.
    hasRetencionesRegistradas() {
      const r = this.retencionesResult;
      const f = this.formData.financial || {};
      return !!(
        (r && (r.iva > 0 || r.islr > 0 || r.municipal > 0)) ||
        (Number(f.ivaRetention) > 0 || Number(f.islrRetention) > 0 || Number(f.municipalRetention) > 0)
      );
    },
    showIvaComprobante() {
      return !!((this.retencionesResult && this.retencionesResult.iva > 0) || Number(this.formData.financial.ivaRetention) > 0);
    },
    showIslrComprobante() {
      return !!((this.retencionesResult && this.retencionesResult.islr > 0) || Number(this.formData.financial.islrRetention) > 0);
    },
    showMunicipalComprobante() {
      return !!((this.retencionesResult && this.retencionesResult.municipal > 0) || Number(this.formData.financial.municipalRetention) > 0);
    },

    // ──── Modo simple (Fase 2) ──────────────────────────────────────────────
    // Mensaje humano que se muestra mientras se lee el documento (rota cada
    // ~1.8s, ver iniciarMensajesLectura()). Nunca jerga de OCR.
    simpleReadingMessage() {
      const msgs = this.simpleReadingMessages;
      return msgs[this.simpleReadingMsgIndex % msgs.length];
    },

    // Perfil fiscal del cliente (el perfil del NEGOCIO que usa el sistema, no
    // el del proveedor): si ninguno de estos tres está activo, el cliente
    // nunca está obligado a retener impuestos, así que en modo simple no vale
    // la pena mostrarle nada sobre retenciones (ver fase2-spec.md §3.4).
    clienteEsAgenteRetencion() {
      const c = this.currentUser?.client || {};
      return !!(c.es_contribuyente_especial || c.es_agente_retencion_municipal || c.retains_islr);
    },

    // En modo simple: si corresponde mostrar la línea "También preparamos tu
    // comprobante de retención" en el paso 2 (COMPRA, cliente agente de
    // retención y hay algo que retener).
    simpleMostrarAvisoRetencion() {
      return this.simple && this.formData.flow === 'COMPRA' && this.clienteEsAgenteRetencion && this.hasRetencionesRegistradas;
    },

    // Subtítulo humano del paso 2 (igual para compra/gasto y venta).
    simplePaso2Subtitulo() {
      return 'Solo necesitamos estos 4 datos. El resto lo calculamos nosotros.';
    }
  },

  // ─── WATCH ───────────────────────────────────────────────────────────────────
  watch: {
    proveedor: {
      async handler(nuevoProveedor) {
        // C7: cambiar de proveedor invalida cualquier confirmación previa de municipio distinto
        this.municipalMismatchConfirmed = false;
        this.municipalMismatch = { detected: false, tenantNombre: '', issuerNombre: '' };
        // Si había un proveedor "nuevo" pendiente de crear (OCR sin match), al
        // elegir uno real (o volver a vaciar el campo) ya no aplica.
        if (this.formData.issuer) delete this.formData.issuer._proveedorPendiente;

        if (!nuevoProveedor) {
          // I3: al vaciar el campo, limpiar también issuer.id — si no, un
          // escaneo posterior de OTRO proveedor (sin match) deja el id del
          // proveedor anterior, y la compra se enlaza mal.
          if (this.formData.issuer) this.formData.issuer.id = '';
          this.retentionConfig = { aplicarIva: false, porcentajeIva: 75, aplicarIslr: false, conceptoIslr: null, tipoPersona: 'JURIDICA', aplicarMunicipal: false, porcentajeMunicipal: 0 };
          this.calcularRetenciones();
          return;
        }

        this.loadingRetentionConfig = true;
        try {
          const id = nuevoProveedor.id;
          const { data, error } = await supabase.from('proveedores').select('*').eq('id', id).single();
          if (error) throw error;

          const ivaRate = data.iva_retention_rate ? parseFloat(data.iva_retention_rate) : 0;
          const municipalRate = data.municipal_rate ? parseFloat(data.municipal_rate) : 0;

          this.retentionConfig = {
            aplicarIva: ivaRate > 0,
            porcentajeIva: ivaRate > 0 ? ivaRate : 75,
            aplicarIslr: !!data.islr_concept_id,
            conceptoIslr: data.islr_concept_id || null,
            conceptoIslrNombre: '',
            // C6: tipo_persona del proveedor, necesario para aplicar el sustraendo ISLR
            // (persona natural) igual que lo hace el RPC registrar_compra_con_retenciones.
            tipoPersona: data.tipo_persona || 'JURIDICA',
            aplicarMunicipal: municipalRate > 0,
            porcentajeMunicipal: municipalRate,
            concepto_municipal_id: null,
            conceptoMunicipalNombre: ''
          };

          this.formData.issuer.id = data.id || '';
          this.formData.issuer.companyName = data.nombre || '';
          this.formData.issuer.rif = data.rif || '';
          this.formData.issuer.address = data.direccion || data.address || '';
          this.formData.issuer.phone = data.telefono || data.phone || '';
          this.formData.issuer.licencia_actividad_economica = data.licencia_actividad_economica || '';
          this.formData.issuer.municipio_id = data.municipio_id || '';
          
          await this.calcularRetenciones();
        } catch (err) {
          console.error("Error al cargar config de retenciones del proveedor:", err);
        } finally {
          this.loadingRetentionConfig = false;
        }
      }
    },
    'formData.invoiceNumber'(v) {
      if (!v) { this.isDuplicate = false; return; }
      if (this.invoiceCheckTimer) clearTimeout(this.invoiceCheckTimer);
      this.invoiceCheckTimer = setTimeout(() => this.checkDuplicateInvoice(), 600);
    },
    'formData.issueDate'(date) {
      if (date) this.fetchExchangeRate(date);
      this.prefillFechaFiscal();
    },
    'formData.financial.retentionDate'(newDate) {
      if (newDate && this.retencionesResult && !this.retentionCorrelativoManuallyEdited) {
        this.sugerirCorrelativosRetencion(
          this.retencionesResult.iva,
          this.retencionesResult.islr,
          this.retencionesResult.municipal
        );
      }
      this.prefillFechaFiscal();
    },
    'formData.documentType'(t) {
      this.formData.documentCategory = t === 'RECIBO' ? 'RECIBO' : 'FACTURA';
    },
    'formData.financial.paymentMethod'(method) {
      if (method === 'CASHEA') {
        if (this.formData.status !== 'PAGADA') {
            this.formData.status = 'CRÉDITO';
        }
        if (!this.formData.financial.credit) {
          this.formData.financial.credit = {
            initialAmount: 0,
            initialPercentage: 40,
            initialStatus: 'POR_COBRAR', // Fix inconsistencia #4: la inicial también se rastrea
            installmentsCount: 3,
            installments: []
          };
          if (this.formData.financial.totalSales > 0) {
            this.onInitialPercentageChange();
          }
        }
      } else {
        if (this.formData.status === 'CRÉDITO') {
            this.formData.status = 'EMITIDA';
        }
      }
    },
    'formData.financial.totalSales'(newTotal) {
      if (this.formData.financial.paymentMethod === 'CASHEA' && this.formData.financial.credit) {
        this.onInitialPercentageChange();
      }
    },
    'formData.financial.taxableSales'() {
      if (!this.manualMode && !this.isMappingOcr) {
        this.calculateFromBase();
      } else if (this.manualMode && !this.isMappingOcr) {
        this.calculateTotals();
      }
    },
    'formData.financial.nonTaxableSales'() {
      if (!this.isMappingOcr) this.calculateTotals();
    },
    'formData.financial.taxDebit'() {
      if (!this.isMappingOcr) this.calculateTotals();
    },
    'formData.financial.currency'(cur) {
      if (cur && cur !== 'VES' && MONEDAS[cur]) {
        this.fetchExchangeRate(this.formData.issueDate);
      }
    },
    // Modo simple: arranca/detiene los mensajes humanos rotativos ("Leyendo tu
    // documento...") exactamente mientras el OCR está trabajando (`extracting`),
    // sin tocar la lógica del OCR en sí.
    extracting(val) {
      if (val) this.iniciarMensajesLectura();
      else this.detenerMensajesLectura();
    },
    manualMode(val) {
      this.manualTotalOverride = false;
      if (!val) {
        // Al salir del modo manual, recalcular todo automáticamente
        this.calculateFromBase();
      } else {
        this.showSnackbar('Modo manual activo: los totales se sumarán automáticamente a menos que edites el total directamente.', 'info');
      }
    },
    invoice: {
      immediate: true,
      handler(inv) {
        if (inv) {
          const today = hoyISO();
          // C1: al editar, si la factura ya trae fecha_fiscal (guardada en BD) se
          // respeta; si no (registros previos a la migración), se recalcula abajo.
          this.fechaFiscalManuallyEdited = !!inv.fecha_fiscal;
          this.formData = {
            ...inv,
            expense_type: inv.expense_type || (inv.flow === 'COMPRA' ? 'COMPRA' : null),
            expense_category_id: inv.expense_category_id || null,
            fecha_fiscal: inv.fecha_fiscal || inv.issueDate || today,
            financial: {
              ...(inv.financial || {}),
              retentionDate: inv.financial?.retentionDate || today
            },
            items: (inv.items || []).map(it => ({
              ...it,
              _key: ++_itemKey,
              // Reconstruir el objeto product para que el combobox lo muestre correctamente
              // en modo edición. Solo necesitamos los campos mínimos que usa ProductAutocomplete.
              product: it.product_id
                ? { id: it.product_id, name: it.description, code: it.code, unit: it.unit, stock: it.product?.stock ?? 0, tipo: it.product?.tipo }
                : (typeof it.product === 'string' ? it.product : null)
            }))
          };
          if (!inv.fecha_fiscal) {
            this.$nextTick(() => this.prefillFechaFiscal());
          }
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
    // Modo simple: la pantalla "¿En qué?" (ExpenseCategorySelector) solo se ve
    // hoy cuando expense_type === 'GASTO'. En modo simple no le pedimos al
    // usuario distinguir "mercancía" de "otro gasto" en la primera capa, así
    // que toda COMPRA se trata como un gasto por categoría salvo que la IA
    // detecte lo contrario al leer el documento (ver handleExtractedData).
    if (this.simple && !this.isEditing && this.formData.flow === 'COMPRA' && !this.formData.expense_type) {
      this.formData.expense_type = 'GASTO';
    }
    await this.loadCurrentUser();
    if (this.clienteInicial && !this.isEditing && this.formData.flow === 'VENTA') {
      this.elegirClienteNegocio(this.clienteInicial);
    }
    this.fetchExchangeRate(this.formData.issueDate);
    // Modo simple: guarda una foto del formulario ya pre-llenado (mis datos,
    // flow, expense_type) para que "Registrar otro" (simpleResetForm) vuelva
    // a este mismo punto de partida en vez de a un formulario vacío de cero.
    if (this.simple && !this.isEditing) {
      this._simpleInitialFormData = JSON.parse(JSON.stringify(this.formData));
    }
  },

  beforeUnmount() {
    this.detenerMensajesLectura();
  },

  // ─── METHODS ─────────────────────────────────────────────────────────────────
  methods: {

    // ── Mis clientes (VENTA) ─────────────────────────────────────────────────
    // Un cliente guardado llena client_info como siempre (compatibilidad con
    // PDF y libros) y enlaza la venta por cliente_negocio_id.
    elegirClienteNegocio(c) {
      this.formData.cliente_negocio_id = c.id;
      this.formData.client = {
        ...this.formData.client,
        companyName: c.nombre || '',
        rif: c.rif || '',
        phone: c.telefono || '',
        email: c.correo || '',
        address: c.direccion || '',
        taxpayerType: c.tipo_persona === 'natural' ? 'PERSONA NATURAL' : 'PERSONA JURÍDICA'
      };
      this.clienteEspecial = !!c.es_contribuyente_especial;
    },
    // Cliente nuevo, "Consumidor final" o vacío: no hay vínculo; el cliente
    // nuevo se crea al guardar la venta (registroService), nunca al escribirlo.
    usarClienteNuevo(nombre) {
      this.formData.cliente_negocio_id = null;
      this.formData.client = {
        ...this.formData.client,
        companyName: nombre,
        rif: '',
        phone: '',
        email: '',
        address: ''
      };
      this.clienteEspecial = false;
    },

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

    formatExchangeRate(n) {
      if (n == null || isNaN(n)) return '0,00';
      return Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    },

    normalizeDateToYMD(dateInput) {
      return normalizeDateToYMD(dateInput);
    },

    formatDateReadable(dateInput) {
      if (!dateInput) return '';
      const ymd = this.normalizeDateToYMD ? this.normalizeDateToYMD(dateInput) : normalizeDateToYMD(dateInput);
      const parts = ymd.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return String(dateInput);
    },

    showSnackbar(message, type = 'info', timeout = 4000) {
      this.snackbar = { show: true, message, type, timeout };
    },

    // ── Cashea y Cuotas ────────────────────────────────────────────────────────
    onInitialPercentageChange() {
      const total = this.formData.financial.totalSales || 0;
      const perc = this.formData.financial.credit?.initialPercentage || 0;
      if (this.formData.financial.credit) {
        this.formData.financial.credit.initialAmount = parseFloat((total * (perc / 100)).toFixed(2));
        this.generateInstallments();
      }
    },

    onInitialAmountChange() {
      const total = this.formData.financial.totalSales || 0;
      const amt = this.formData.financial.credit?.initialAmount || 0;
      if (this.formData.financial.credit && total > 0) {
        this.formData.financial.credit.initialPercentage = parseFloat(((amt / total) * 100).toFixed(2));
        this.generateInstallments();
      }
    },

    generateInstallments() {
      if (!this.formData.financial.credit) return;
      const total = this.formData.financial.totalSales || 0;
      const initial = this.formData.financial.credit.initialAmount || 0;
      const count = this.formData.financial.credit.installmentsCount || 3;
      
      const remaining = total - initial;
      if (remaining < 0) return;
      
      const amountPerInst = parseFloat((remaining / count).toFixed(2));
      const issueDate = new Date(this.formData.issueDate || hoyISO());
      
      const oldInstallments = this.formData.financial.credit.installments || [];
      const newInstallments = [];
      
      for (let i = 0; i < count; i++) {
        const instDate = new Date(issueDate);
        instDate.setDate(instDate.getDate() + (14 * (i + 1)));
        
        let status = 'POR_COBRAR';
        if (oldInstallments[i] && oldInstallments[i].status) {
            status = oldInstallments[i].status;
        }

        newInstallments.push({
          id: i + 1,
          date: instDate.toISOString().split('T')[0],
          amount: amountPerInst,
          status: status
        });
      }
      
      const totalInstallments = newInstallments.reduce((sum, inst) => sum + inst.amount, 0);
      if (totalInstallments !== remaining && newInstallments.length > 0) {
        const diff = remaining - totalInstallments;
        newInstallments[newInstallments.length - 1].amount = parseFloat((newInstallments[newInstallments.length - 1].amount + diff).toFixed(2));
      }
      
      this.formData.financial.credit.installments = newInstallments;
      this.checkAllInstallmentsPaid();
    },

    checkAllInstallmentsPaid() {
      if (this.formData.financial.paymentMethod === 'CASHEA' && this.formData.financial.credit) {
        const allPaid = this.formData.financial.credit.installments.every(inst => inst.status === 'PAGADA');
        if (allPaid && this.formData.status === 'CRÉDITO') {
          this.formData.status = 'PAGADA';
          this.showSnackbar('Todas las cuotas pagadas. Estatus general cambiado a PAGADA', 'success');
        } else if (!allPaid && this.formData.status === 'PAGADA') {
          this.formData.status = 'CRÉDITO';
        }
      }
    },

    isFlowActive(opt) {
      return this.formData.flow === opt.value && this.formData.expense_type === opt.expenseType;
    },

    isStockError(item) {
      return excedeStock(item, this.formData.flow);
    },

    // ── Modo simple (Fase 2) ───────────────────────────────────────────────────
    // Paso 1, botón "Tomarle foto": reutiliza el input de cámara que ya vive
    // dentro de FileUploadZone (misma ref que el panel OCR de siempre), solo
    // cambiamos quién lo dispara.
    simpleTomarFoto() {
      this.$refs.fileUploadZone?.triggerCameraInput?.();
    },
    // Paso 1, botón "Subir archivo" (PDF o imagen).
    simpleSubirArchivo() {
      this.$refs.fileUploadZone?.triggerFileInput?.();
    },
    // Paso 1, al elegir foto/archivo: dispara el mismo flujo OCR de siempre
    // (handleExtractedData, sin duplicarlo) pero sin esperar un segundo toque
    // en "Extraer automáticamente" — en modo simple la lectura arranca sola.
    // Al terminar (con o sin éxito) avanza al paso 2 para que la usuaria
    // confirme/corrija los 4 datos; si el OCR falló, los deja vacíos para
    // llenarlos a mano, pero nunca la deja atascada en el paso 1.
    async simpleHandleFileSelect(file) {
      this.uploadedFile = file;
      this.ocrResult = null;
      await this.handleExtractedData(file);
      this.simpleIrAPaso2();
    },
    // Paso 1, botón "No tengo factura": documento tipo RECIBO, sin pasar por el OCR.
    simpleSinFactura() {
      this.formData.documentType = 'RECIBO';
      this.simpleIrAPaso2();
    },
    // Avanza al paso 2 asegurando que el formulario tenga un número de
    // factura/recibo válido (en modo simple el usuario nunca lo escribe a
    // mano salvo que abra "Ver detalles contables").
    simpleIrAPaso2() {
      this.ensureInvoiceNumberForSimple();
      this.simpleStep = 2;
    },
    // Genera un número de recibo interno cuando el usuario no tiene uno (o el
    // OCR no lo detectó), para que la validación de siempre (que exige
    // invoiceNumber) nunca le pida ese dato en la primera capa.
    ensureInvoiceNumberForSimple() {
      if (!this.simple || this.formData.invoiceNumber) return;
      const sello = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
      const azar = Math.floor(100 + Math.random() * 900);
      this.formData.invoiceNumber = `REC-${sello}${azar}`;
    },
    // Mensajes humanos rotativos mientras se lee el documento (watcher de
    // `extracting` más abajo los arranca/detiene; nunca jerga de OCR).
    iniciarMensajesLectura() {
      this.simpleReadingMsgIndex = 0;
      this.detenerMensajesLectura();
      this.simpleReadingTimer = setInterval(() => {
        this.simpleReadingMsgIndex++;
      }, 1800);
    },
    detenerMensajesLectura() {
      if (this.simpleReadingTimer) {
        clearInterval(this.simpleReadingTimer);
        this.simpleReadingTimer = null;
      }
    },
    // Paso 2, campo "¿Cuánto?": el usuario solo ve el total (con impuesto
    // incluido). Reutilizamos el mismo cálculo de siempre (16% de IVA sobre la
    // base) en reversa para no duplicar la lógica fiscal: fijamos la base
    // imponible y dejamos que los watchers existentes (calculateFromBase →
    // calculateTotals → calcularRetenciones) hagan el resto.
    onSimpleTotalInput(val) {
      const total = parseFloat(val);
      const totalValido = isNaN(total) ? 0 : total;
      this.manualTotalOverride = false;
      this.formData.financial.taxableSales = parseFloat((totalValido / 1.16).toFixed(2));
    },
    // Determina si un error de validación corresponde a un campo que vive
    // dentro de "Ver detalles contables" (no a los 4 campos del paso 2). Si es
    // así, hay que abrir el acordeón y llevar la vista hasta ese campo.
    simpleCampoDeDetalleConError() {
      if (this.isDuplicate) return 'invoiceNumber';
      if (this.formData.flow === 'VENTA') {
        const overflow = this.formData.items.find(i => excedeStock(i, 'VENTA'));
        if (overflow) return 'items';
      }
      if (this.formData.flow === 'COMPRA') {
        if (this.comprobanteDuplicado.iva || this.comprobanteDuplicado.islr || this.comprobanteDuplicado.municipal) {
          return 'retenciones';
        }
      }
      return null;
    },
    // Abre el acordeón de detalles y hace scroll al campo problemático.
    simpleAbrirDetallesYScroll(campo) {
      this.simpleDetailsOpen = true;
      this.$nextTick(() => {
        const refs = {
          invoiceNumber: 'simpleDetalleInvoiceNumber',
          items: 'simpleDetalleItems',
          retenciones: 'simpleDetalleRetenciones'
        };
        const el = this.$refs[refs[campo]];
        const nodo = el?.$el || el;
        if (nodo && typeof nodo.scrollIntoView === 'function') {
          nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    // Botón "Guardar" del modo simple: valida igual que siempre, pero si la
    // causa del error vive dentro de "Ver detalles contables", abre el
    // acordeón y hace scroll en vez de dejar al usuario buscando a ciegas.
    async simpleHandleSubmit() {
      this.ensureInvoiceNumberForSimple();
      if (!this.validate()) {
        const campo = this.simpleCampoDeDetalleConError();
        if (campo) this.simpleAbrirDetallesYScroll(campo);
        return;
      }
      await this.handleSubmit();
    },
    // "Registrar otro": vuelve al paso 1 con un formulario en blanco, sin
    // perder la pestaña/flow (VENTA o COMPRA) con la que se abrió el diálogo.
    simpleResetForm() {
      if (this._simpleInitialFormData) {
        this.formData = JSON.parse(JSON.stringify(this._simpleInitialFormData));
      }
      this.formData.items = [ this.newItem() ];
      this.formData.flow = this.flow;
      if (this.formData.flow === 'COMPRA' && !this.formData.expense_type) {
        this.formData.expense_type = 'GASTO';
      }
      this.proveedor = null;
      this.uploadedFile = null;
      this.ocrResult = null;
      this.aiFieldsStatus = {};
      this.isDuplicate = false;
      this.manualTotalOverride = false;
      this.fechaFiscalManuallyEdited = false;
      this.retentionCorrelativoManuallyEdited = false;
      this.editarComprobanteIva = false;
      this.editarComprobanteIslr = false;
      this.editarComprobanteMunicipal = false;
      this.simpleDetailsOpen = false;
      this.simpleHuboRetencion = false;
      this.simpleSuccess = false;
      this.simpleStep = 1;
      this.categoriaSugerida = false;
      this.categoriaSugerenciaPendiente = null;
      this.fetchExchangeRate(this.formData.issueDate);
    },
    // Datos de la empresa del cliente para los PDF de comprobante — mismo
    // criterio que Facturacion.vue → _buildCompanyInfo(), para no inventar un
    // formato nuevo de comprobante.
    simpleBuildCompanyInfo() {
      const clientProfile = this.currentUser?.client || {};
      const orgProfile = Array.isArray(this.currentUser?.organization)
        ? this.currentUser.organization[0]
        : (this.currentUser?.organization || {});
      return {
        name: clientProfile.company_name || orgProfile.name || this.currentUser?.companyName || 'Mi Empresa',
        rif: clientProfile.rif || orgProfile.rif || this.currentUser?.rif || 'J-00000000-0',
        address: clientProfile.address || orgProfile.address || 'DIRECCIÓN NO REGISTRADA',
        phone: clientProfile.phone || orgProfile.phone || '',
        licencia_actividad_economica: clientProfile.licencia_actividad_economica || '',
        municipio: clientProfile.municipio_id || clientProfile.municipio || '',
        estado: clientProfile.estado || '',
        activity_type: clientProfile.activity_type || ''
      };
    },
    // Pantalla de éxito, botón "Descargar comprobante": reutiliza el mismo
    // servicio de PDF que ya usa Facturacion.vue (retention-pdf-service), no
    // genera un documento nuevo.
    async simpleDescargarComprobante() {
      this.simpleDescargandoComprobante = true;
      try {
        const companyInfo = this.simpleBuildCompanyInfo();
        if (this.showIvaComprobante) await retentionPdfService.generarComprobanteIVA(this.formData, companyInfo);
        if (this.showIslrComprobante) await retentionPdfService.generarComprobanteISLR(this.formData, companyInfo);
        if (this.showMunicipalComprobante) await retentionPdfService.generarComprobanteMunicipal(this.formData, companyInfo);
        this.showSnackbar('¡Listo! Descargamos tu comprobante de retención.', 'success');
      } catch (err) {
        console.error('❌ [SimpleInvoiceForm] Error al descargar comprobante:', err);
        this.showSnackbar('No pudimos generar el comprobante. Puedes descargarlo luego desde "Mis movimientos".', 'error');
      } finally {
        this.simpleDescargandoComprobante = false;
      }
    },
    // Término del glosario (src/constants/glosario.js) para los (?) de ayuda
    // de la primera capa del modo simple. Nunca crea un término nuevo.
    simpleGlosario(clave) {
      return GLOSARIO[clave] || null;
    },

    // ── Selección de flujo ────────────────────────────────────────────────────
    selectFlow(opt) {
      // I3: cambiar de flujo (Gasté ↔ Vendí) descarta cualquier proveedor
      // pendiente de un escaneo anterior — en VENTA el campo `issuer` pasa a
      // ser "yo" (el emisor), no tiene sentido arrastrar ahí un proveedor
      // que se iba a crear para una COMPRA.
      if (this.formData.issuer) delete this.formData.issuer._proveedorPendiente;
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
        id:           c.id || this.currentUser.client_id || this.currentUser.id || '',
        companyName:  c.company_name || this.currentUser.companyName || this.currentUser.name || '',
        rif:          c.rif || this.currentUser.rif || '',
        taxpayerType: c.taxpayer_type || 'PERSONA JURÍDICA',
        phone:        c.phone || this.currentUser.phone || '',
        email:        c.email || this.currentUser.email || '',
        address:      c.address || '',
        licencia_actividad_economica: c.licencia_actividad_economica || '',
        activity_type: c.activity_type || '',
        estado:       c.estado || '',
        municipio_id: c.municipio_id || c.municipio || ''
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
    async fetchExchangeRate(rawDate, isManualToday = false, isUserClick = false) {
      if (!rawDate) return;
      const date = this.normalizeDateToYMD ? this.normalizeDateToYMD(rawDate) : normalizeDateToYMD(rawDate);
      if (!date) return;
      try {
        const today = hoyISO();
        let r;

        // Un cliente con tasas definidas por él las usa al registrar (aunque la factura sea de otro día),
        // salvo que pida a propósito la oficial de la fecha ("Tasa Fecha Factura") o esté editando.
        const usarVigente = isManualToday || date === today || (this.modoTasa === 'manual' && !isUserClick && !this.isEditing);

        // Si se fuerza hoy o la fecha de la factura es de hoy, usamos la tasa VIGENTE (automática o la del cliente)
        if (usarVigente) {
          r = await this.obtenerTasaVigente();
          if (isUserClick) {
            this.showSnackbar(
              this.modoTasa === 'manual' ? 'Tu tasa de hoy aplicada' : 'Tasa oficial BCV del día de hoy aplicada',
              'success'
            );
          }
        } else {
          r = await bcvService.getRateForDate(date);
          
          if (r && r.success && r.data) {
            this.isEditingExchangeRate = false;
            if (r.data.approximate) {
              const fechaCercana = this.formatDateReadable(r.data.closestDate);
              const fechaSolicitada = this.formatDateReadable(date);
              this.rateSourceLabel = `BCV al ${fechaCercana}`;
              this.showSnackbar(
                `No hubo actualización del BCV el ${fechaSolicitada} (fin de semana o feriado). Se aplicó la tasa vigente de esa semana (${fechaCercana}).`,
                'info',
                6000
              );
            } else {
              const fechaFormateada = this.formatDateReadable(date);
              this.rateSourceLabel = `BCV al ${fechaFormateada}`;
              if (isUserClick) {
                this.showSnackbar(`Tasa oficial del BCV aplicada para el ${fechaFormateada}`, 'success');
              }
            }
          } else {
            // No se encontró tasa para esa fecha ni en la semana en la BD
            const fechaFormateada = this.formatDateReadable(date);
            this.showSnackbar(
              `No se encontró tasa oficial registrada para el ${fechaFormateada} ni en su semana. Puedes ingresar la tasa manualmente con el lápiz ✏️.`,
              'warning',
              6000
            );
            this.rateSourceLabel = 'Sin registro oficial para esta fecha';
            this.isEditingExchangeRate = true;
            return;
          }
        }

        if (r && r.success && r.data) {
          // Guardar tasa USD (siempre disponible)
          if (r.data.dollar) {
            this.formData.financial.exchangeRate = r.data.dollar;
          }
          // Guardar tasa EUR si está disponible
          if (r.data.euro) {
            this.formData.financial.exchangeRateEur = r.data.euro;
          }
          // Todas las tasas de ese día (USD, EUR, CNY, TRY, RUB): se guardan con la factura
          this.formData.financial.tasas = { ...normalizarTasas(r.data) };
        }
      } catch (e) {
        console.warn('⚠️ No se pudo obtener tasa BCV:', e);
        this.rateSourceLabel = 'Tasa no disponible';
      }
    },

    async applyInvoiceDateRate() {
      await this.fetchExchangeRate(this.formData.issueDate, false, true);
    },

    async applyTodayRate() {
      const today = hoyISO();
      await this.fetchExchangeRate(today, true, true);
      this.isEditingExchangeRate = false;
    },

    onManualExchangeRateChange(val) {
      this.guardarTasaDeMonedaActual(parseFloat(val) || 0);
      this.rateSourceLabel = 'Tasa manual personalizada';
    },

    /** Escribe la tasa (Bs por unidad) de la moneda elegida en los campos de la factura. */
    guardarTasaDeMonedaActual(num) {
      const cur = this.formData.financial.currency;
      if (cur === 'USD') {
        this.formData.financial.exchangeRate = num;
      } else if (cur === 'EUR') {
        this.formData.financial.exchangeRateEur = num;
      }
      if (cur && cur !== 'VES') {
        this.formData.financial.tasas = { ...(this.formData.financial.tasas || {}), [cur]: num };
      }
    },

    /** "$ Dólar", "€ Euro", "Bs Bolívar": símbolo + nombre en español. */
    currencyLabel(cod) {
      const m = MONEDAS[cod];
      return m ? `${m.simbolo} ${m.nombre}` : cod;
    },

    /** Elige la moneda de la factura (VES/USD/EUR a la vista, el resto en "Otra moneda"). */
    elegirMoneda(cod) {
      this.formData.financial.currency = cod;
    },

    /**
     * Tasas vigentes del negocio (automáticas o definidas por el cliente), con la forma de
     * bcvService para reutilizar el resto del flujo. Falla suave: { success: false }.
     */
    async obtenerTasaVigente() {
      try {
        const v = await tasasVigentes();
        this.tasasHoy = v.tasas || {};
        this.modoTasa = v.modo || 'automatica';
        if (v.modo === 'manual') this.rateSourceLabel = 'Tu tasa (manual)';
        else if (v.fallo) this.rateSourceLabel = 'Última tasa conocida del BCV';
        else this.rateSourceLabel = 'BCV oficial hoy';
        if (!v.tasas?.USD) return { success: false };
        return {
          success: true,
          data: {
            dollar: v.tasas.USD,
            euro: v.tasas.EUR || null,
            yuan: v.tasas.CNY || null,
            lira: v.tasas.TRY || null,
            rublo: v.tasas.RUB || null,
          },
        };
      } catch {
        return { success: false };
      }
    },

    /** Todas las tasas que se guardan con la factura: las del día (vigentes si es de hoy) + las editadas. */
    construirTasasFactura() {
      const f = this.formData.financial;
      const esHoy = this.normalizeDateToYMD
        ? this.normalizeDateToYMD(this.formData.issueDate) === hoyISO()
        : this.formData.issueDate === hoyISO();
      const tasas = { ...(esHoy ? this.tasasHoy : {}), ...normalizarTasas(f.tasas) };
      const usd = Number(f.exchangeRate);
      const eur = Number(f.exchangeRateEur);
      if (usd > 1) tasas.USD = usd;
      if (eur > 1) tasas.EUR = eur;
      return tasas;
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

    // ── helpers visuales para IA ──────────────────────────────────────────────
    getAiIcon(field) {
      const status = this.aiFieldsStatus[field];
      if (status === 'success') return 'mdi-robot-outline';
      if (status === 'warning') return 'mdi-robot-dead-outline';
      if (status === 'not-found') return 'mdi-help-circle-outline';
      return null;
    },
    getAiColor(field) {
      const status = this.aiFieldsStatus[field];
      if (status === 'success') return 'success';
      if (status === 'warning') return 'warning';
      if (status === 'not-found') return 'grey';
      return null;
    },
    getAiTooltip(field) {
      const status = this.aiFieldsStatus[field];
      if (status === 'success') return 'Dato extraído con éxito por la IA';
      if (status === 'warning') return 'La IA extrajo este dato pero tiene dudas. Por favor, verifícalo.';
      if (status === 'not-found') return 'La IA no pudo encontrar este dato en el documento.';
      return null;
    },
    trackAiField(field, value, doubtfulFields = []) {
      if (value !== null && value !== undefined && value !== '') {
        this.aiFieldsStatus[field] = (doubtfulFields || []).includes(field) ? 'warning' : 'success';
      } else {
        this.aiFieldsStatus[field] = 'not-found';
      }
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
      const base   = parseFloat(this.formData.financial.taxableSales) || 0;
      const exento = parseFloat(this.formData.financial.nonTaxableSales) || 0;
      const iva    = parseFloat(this.formData.financial.taxDebit) || 0;
      const igtf   = parseFloat(this.formData.financial.igtf) || 0;
      
      if (!this.manualTotalOverride) {
        this.formData.financial.totalSales = parseFloat((base + exento + iva + igtf).toFixed(2));
      }
      
      this.calcularRetenciones();
    },

    recalculateTotalFromParts() {
      this.manualTotalOverride = false;
      this.calculateTotals();
    },

    onManualTotalInput(val) {
      this.manualTotalOverride = true;
      const parsed = parseFloat(val);
      this.formData.financial.totalSales = isNaN(parsed) ? 0 : parsed;
      this.calcularRetenciones();
    },

    onTaxableSalesChange(val) {
      this.formData.financial.taxableSales = val;
      this.calculateTotals();
    },

    onTaxDebitChange(val) {
      this.formData.financial.taxDebit = val;
      this.calculateTotals();
    },

    onNonTaxableSalesChange(val) {
      this.formData.financial.nonTaxableSales = val;
      this.calculateTotals();
    },
    
    // C6: obtiene (y cachea en memoria) el valor vigente de la Unidad Tributaria
    // desde configuracion_fiscal_global, igual que lo consulta el RPC SQL
    // registrar_compra_con_retenciones, para aplicar el mismo sustraendo en la vista previa.
    async getValorUT() {
      if (this.valorUT !== null && this.valorUT !== undefined) return this.valorUT;
      try {
        const { data } = await supabase
          .from('configuracion_fiscal_global')
          .select('valor_unidad_tributaria')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        this.valorUT = parseFloat(data?.valor_unidad_tributaria) || 0;
      } catch (e) {
        console.warn('No se pudo obtener el valor de la Unidad Tributaria:', e);
        this.valorUT = 0;
      }
      return this.valorUT;
    },

    // C7: el usuario confirma que quiere aplicar la retención municipal aunque el
    // proveedor esté en un municipio distinto. Se recalcula para que el monto
    // vuelva a incluirse (ver aviso en el template, sección de retenciones COMPRA).
    confirmMunicipalMismatch() {
      this.municipalMismatchConfirmed = true;
      this.calcularRetenciones();
    },

    // C1: prellena "Fecha fiscal" (solo COMPRA) con la fecha del comprobante de
    // retención de IVA si existe, o con la fecha de emisión si no hay retención
    // de IVA — misma regla que el backfill/trigger de la migración
    // 20261013100000_fecha_fiscal.sql. No sobrescribe si el usuario ya la editó
    // manualmente (fechaFiscalManuallyEdited).
    prefillFechaFiscal() {
      if (this.formData.flow !== 'COMPRA' || this.fechaFiscalManuallyEdited) return;
      const tieneRetencionIva = (this.retencionesResult && this.retencionesResult.iva > 0) || Number(this.formData.financial.ivaRetention) > 0;
      this.formData.fecha_fiscal = tieneRetencionIva
        ? (this.formData.financial.retentionDate || this.formData.issueDate)
        : this.formData.issueDate;
    },

    // C2: valores por defecto de retención para un proveedor pendiente del
    // OCR (aún no existe en el directorio, se crea recién al guardar). La
    // decisión del orquestador: IVA 75% (el porcentaje legal por defecto,
    // igual que cualquier proveedor creado con el botón "Nuevo"), tipo de
    // persona deducido de la letra del RIF, y sin concepto ISLR salvo que la
    // persona lo elija a mano. El proveedor se crea después con estos
    // mismos valores (ver registroService.resolverProveedorPendiente).
    _configRetencionPorDefectoPendiente(pendiente) {
      return {
        aplicarIva: true, porcentajeIva: 75, baseIva: 0,
        aplicarIslr: false, conceptoIslr: null, baseIslr: 0, conceptoIslrNombre: '',
        tipoPersona: tipoPersonaPorLetra(normalizarRif(pendiente?.rif)),
        aplicarMunicipal: false, porcentajeMunicipal: 0, baseMunicipal: 0,
        concepto_municipal_id: null, conceptoMunicipalNombre: ''
      };
    },

    // ── Retenciones ───────────────────────────────────────────────────────────
    async calcularRetenciones() {
      // C2: con un proveedor pendiente del OCR (sin match en el directorio),
      // calculamos la retención igual que con un proveedor existente, con
      // valores por defecto — antes `calcularRetenciones` solo miraba
      // `this.proveedor` (null en este caso) y ponía todo en 0 sin avisar,
      // así que la compra se guardaba sin retención ni comprobante.
      const pendiente = this.proveedorPendienteOcr;
      const usaPendiente = this.formData.flow === 'COMPRA' && !this.proveedor && !!pendiente;

      if (this.formData.flow !== 'COMPRA' || (!this.proveedor && !usaPendiente)) {
        this.retencionesResult = null;
        this.formData.financial.ivaRetention = 0;
        this.formData.financial.islrRetention = 0;
        this.formData.financial.municipalRetention = 0;
        this.formData.financial.ivaRetentionNumber = '';
        this.formData.financial.islrRetentionNumber = '';
        this.formData.financial.municipalRetentionNumber = '';
        return;
      }

      const config = usaPendiente ? this._configRetencionPorDefectoPendiente(pendiente) : this.retentionConfig;
      const amount = parseFloat(this.formData.financial.taxableSales) || 0;
      const tax = parseFloat(this.formData.financial.taxDebit) || 0;
      
      let iva = 0;
      let islr = 0;
      if (config.aplicarIva && tax > 0) {
        iva = parseFloat((tax * (config.porcentajeIva / 100)).toFixed(2));
      }
      
      if (config.aplicarIslr && config.conceptoIslr && amount > 0) {
        try {
          const concepts = await proveedorService.getISLRConcepts();
          const concepto = (concepts || []).find(c => c.id === config.conceptoIslr);
          if (concepto) {
             this.retentionConfig.conceptoIslrNombre = concepto.nombre;
             const baseAplicable = parseFloat(concepto.porcentaje_base) || 100;
             const baseMonto = amount * (baseAplicable / 100);
             const rate = parseFloat(concepto.porcentaje_retencion) || 0;
             islr = parseFloat((baseMonto * (rate / 100)).toFixed(2));

             // C6 (2026-10-13): igualar la vista previa a la regla del RPC SQL
             // registrar_compra_con_retenciones: para proveedores PERSONA NATURAL se
             // resta el sustraendo en UT (si el concepto ISLR define uno), con piso en 0.
             const sustraendoUt = parseFloat(concepto.sustraendo_ut) || 0;
             if (config.tipoPersona === 'NATURAL' && sustraendoUt > 0) {
               const valorUT = await this.getValorUT();
               const sustraendoBs = Math.round(sustraendoUt * valorUT * 100) / 100;
               islr = Math.max(0, parseFloat((islr - sustraendoBs).toFixed(2)));
             }
          }
        } catch(e) { console.error("Error calculando ISLR", e); }
      }

      let municipal = 0;
      if (config.aplicarMunicipal && amount > 0) {
        try {
          const mConcepts = await municipalConceptsService.getConcepts();
          if (mConcepts.success && config.concepto_municipal_id) {
             const mConcepto = mConcepts.data.find(c => c.id === config.concepto_municipal_id);
             if (mConcepto) {
                 this.retentionConfig.porcentajeMunicipal = parseFloat(mConcepto.porcentaje) || 0;
                 this.retentionConfig.conceptoMunicipalNombre = mConcepto.descripcion;
             }
          } else if (!config.concepto_municipal_id) {
             this.retentionConfig.conceptoMunicipalNombre = '';
          }
        } catch(e) { console.error("Error calculando Municipal", e); }

        if (this.retentionConfig.porcentajeMunicipal > 0) {
           municipal = parseFloat((amount * (this.retentionConfig.porcentajeMunicipal / 100)).toFixed(2));
        }
      }

      // C7 (2026-10-13): advertir (no bloquear) si proveedor y empresa están en
      // municipios distintos. Mientras el usuario no confirme explícitamente
      // ("Continuar igual"), el monto NO se aplica (queda en 0) para que el RPC no
      // lo registre por accidente (financial.municipalRetention > 0 => p_aplicar_municipal=true).
      this.municipalMismatch = { detected: false, tenantNombre: '', issuerNombre: '' };
      if (municipal > 0) {
        const tenantMun = this.formData.client?.municipio_id || this.formData.client?.municipio || '';
        const issuerMun = this.formData.issuer?.municipio_id || this.formData.issuer?.municipio || '';
        if (tenantMun && issuerMun && !venezuelaLocationsService.areSameMunicipality(tenantMun, issuerMun)) {
          this.municipalMismatch = {
            detected: true,
            tenantNombre: venezuelaLocationsService.getCleanMunicipalityName(tenantMun),
            issuerNombre: venezuelaLocationsService.getCleanMunicipalityName(issuerMun)
          };
          if (!this.municipalMismatchConfirmed) {
            municipal = 0;
          }
        }
      }

      this.retencionesResult = { iva, islr, municipal };
      this.formData.financial.ivaRetention = iva;
      this.formData.financial.islrRetention = islr;
      this.formData.financial.municipalRetention = municipal;
      this.prefillFechaFiscal();

      // Sugerir números de comprobante (solo si no se editó manualmente)
      await this.sugerirCorrelativosRetencion(iva, islr, municipal);
    },

    // ── Sugerir correlativos de retención ──────────────────────────────────────
    async sugerirCorrelativosRetencion(iva, islr, municipal) {
      try {
        const clientId = this.currentUser?.client?.id || this.currentUser?.client_id;
        const fecha = this.formData.financial.retentionDate || this.formData.issueDate || hoyISO();
        if (!clientId) return;

        // Solo sugerir si el campo no fue editado manualmente
        if (iva > 0 && !this.editarComprobanteIva && !this.retentionCorrelativoManuallyEdited) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: this.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'IVA',
            p_fecha: fecha
          });
          if (data) this.formData.financial.ivaRetentionNumber = data;
        } else if (iva === 0) {
          this.formData.financial.ivaRetentionNumber = '';
        }

        if (islr > 0 && !this.editarComprobanteIslr && !this.retentionCorrelativoManuallyEdited) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: this.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'ISLR',
            p_fecha: fecha
          });
          if (data) this.formData.financial.islrRetentionNumber = data;
        } else if (islr === 0) {
          this.formData.financial.islrRetentionNumber = '';
        }

        if (municipal > 0 && !this.editarComprobanteMunicipal && !this.retentionCorrelativoManuallyEdited) {
          const { data } = await supabase.rpc('sugerir_correlativo_retencion', {
            p_org_id: this.currentUser?.organization_id,
            p_client_id: clientId,
            p_tipo: 'MUNICIPAL',
            p_fecha: fecha
          });
          if (data) this.formData.financial.municipalRetentionNumber = data;
        } else if (municipal === 0) {
          this.formData.financial.municipalRetentionNumber = '';
        }
      } catch (e) {
        console.warn('No se pudieron sugerir correlativos de retención:', e);
      }
    },

    // ── Validar duplicado de comprobante (debounced) ───────────────────────────
    checkComprobanteDuplicado(tipo, numero) {
      this.retentionCorrelativoManuallyEdited = true;
      // Limpiar timer anterior
      if (this.comprobanteCheckTimers[tipo]) {
        clearTimeout(this.comprobanteCheckTimers[tipo]);
      }

      if (!numero || numero.trim() === '') {
        this.comprobanteDuplicado[tipo] = false;
        return;
      }

      // Debounce de 500ms
      this.comprobanteCheckTimers[tipo] = setTimeout(async () => {
        try {
          const clientId = this.currentUser?.client?.id || this.currentUser?.client_id;
          const tipoDb = tipo === 'iva' ? 'IVA' : tipo === 'islr' ? 'ISLR' : 'MUNICIPAL';
          const { data, error } = await supabase.rpc('validar_comprobante_unico', {
            p_org_id: this.currentUser?.organization_id,
            p_client_id: clientId || null,
            p_tipo: tipoDb,
            p_numero: numero.trim()
          });
          if (error) throw error;
          // data = true si es único, false si ya existe
          this.comprobanteDuplicado[tipo] = !data;
        } catch (e) {
          console.warn('Error validando comprobante duplicado:', e);
          this.comprobanteDuplicado[tipo] = false;
        }
      }, 500);
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
      this.aiFieldsStatus = {}; // Resetear estado visual de IA
      // M8: un escaneo nuevo siempre empieza limpio. Si el escaneo anterior
      // dejó un proveedor pendiente sin resolver (el usuario volvió a
      // escanear sin guardar), no debe arrastrarse al nuevo documento.
      if (this.formData.issuer) delete this.formData.issuer._proveedorPendiente;
      this.categoriaSugerida = false;
      this.categoriaSugerenciaPendiente = null;

      try {
        const userContext = {
          companyName: this.currentUser?.companyName || this.currentUser?.name || this.currentUser?.client?.company_name || '',
          rif:         this.currentUser?.rif || this.currentUser?.client?.rif || ''
        };
        console.log('[OCR] Enviando contexto del usuario:', userContext);

        const data = await procesarComprobanteOCR(file, { 
          userContext, 
          flowType: this.formData.flow || null, 
          onProgress: (msg) => { this.extracting = msg !== null; } 
        });

        console.log('[OCR] Respuesta recibida:', {
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
            console.log('[OCR] Flujo aplicado:', matchingOpt.label);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 2: MAPEAR DOCUMENTO
        // ═══════════════════════════════════════════════════════════════
        const df = data.doubtfulFields || [];

        if (data.invoiceNumber) { this.formData.invoiceNumber = data.invoiceNumber; this.trackAiField('invoiceNumber', data.invoiceNumber, df); }
        if (data.controlNumber) { this.formData.controlNumber = data.controlNumber; this.trackAiField('controlNumber', data.controlNumber, df); }
        if (data.issueDate)     { this.formData.issueDate     = data.issueDate;     this.trackAiField('issueDate', data.issueDate, df); }
        if (data.dueDate)       { this.formData.dueDate       = data.dueDate;       this.trackAiField('dueDate', data.dueDate, df); }
        if (data.documentType)  { this.formData.documentType  = data.documentType;  this.trackAiField('documentType', data.documentType, df); }
        if (data.status)        { this.formData.status        = data.status;        this.trackAiField('status', data.status, df); }
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
          // En COMPRA o GASTO: Yo soy el CLIENTE, la contraparte es el EMISOR/proveedor
          // IMPORTANTE: data.issuer = proveedor (quien vendió), data.client = nosotros (quien compró)
          if (data.issuer?.companyName) {
            this.counterpartName = data.issuer.companyName;
            this.counterpartRif = data.issuer.rif || '';
            console.log('[OCR] COMPRA/GASTO - Contraparte (proveedor):', data.issuer.companyName);

            // Auto-vincular proveedor existente o sugerir crear uno nuevo
            await this.matchProveedorFromOcr(data.issuer);
          }
          // Mis datos como cliente (pre-llenados, pero actualizamos si hay datos nuevos)
          // NOTA: Usamos data.client (nosotros), NO data.issuer (el proveedor)
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
            this.trackAiField('totalSales', data.financial.total, df);
          }
          if (data.financial.taxableAmount !== undefined) {
            this.formData.financial.taxableSales = parseFloat(data.financial.taxableAmount) || 0;
            this.trackAiField('taxableSales', data.financial.taxableAmount, df);
          }
          if (data.financial.taxAmount !== undefined) {
            this.formData.financial.taxDebit = parseFloat(data.financial.taxAmount) || 0;
            this.trackAiField('taxDebit', data.financial.taxAmount, df);
          }
          if (data.financial.exemptAmount !== undefined) {
            this.formData.financial.nonTaxableSales = parseFloat(data.financial.exemptAmount) || 0;
            this.trackAiField('nonTaxableSales', data.financial.exemptAmount, df);
          }
          if (data.financial.igtfAmount !== undefined) {
            this.formData.financial.igtf = parseFloat(data.financial.igtfAmount) || 0;
            this.trackAiField('igtf', data.financial.igtfAmount, df);
          }
          if (data.financial.ivaRetention !== undefined) {
            this.formData.financial.ivaRetention = parseFloat(data.financial.ivaRetention) || 0;
            this.trackAiField('ivaRetention', data.financial.ivaRetention, df);
          }
          if (data.financial.islrRetention !== undefined) {
            this.formData.financial.islrRetention = parseFloat(data.financial.islrRetention) || 0;
            this.trackAiField('islrRetention', data.financial.islrRetention, df);
          }
          if (data.financial.municipalRetention !== undefined) {
            this.formData.financial.municipalRetention = parseFloat(data.financial.municipalRetention) || 0;
            this.trackAiField('municipalRetention', data.financial.municipalRetention, df);
          }
          if (data.financial.exchangeRate !== undefined) {
            this.formData.financial.exchangeRate = parseFloat(data.financial.exchangeRate) || 1;
            this.trackAiField('exchangeRate', data.financial.exchangeRate, df);
          }
          if (data.financial.paymentMethod) {
            this.formData.financial.paymentMethod = data.financial.paymentMethod;
            this.trackAiField('paymentMethod', data.financial.paymentMethod, df);
          }
          if (data.financial.paymentReference) {
            this.formData.financial.paymentReference = data.financial.paymentReference;
            this.trackAiField('paymentReference', data.financial.paymentReference, df);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 4.5: CASHEA
        // ═══════════════════════════════════════════════════════════════
        if (data.es_cashea) {
          this.formData.financial.paymentMethod = 'CASHEA';
          this.trackAiField('paymentMethod', 'CASHEA', df);
          this.formData.financial.credit = this.formData.financial.credit || {};
          if (data.numero_cuota !== null) {
            this.formData.financial.credit.numero_cuota = data.numero_cuota;
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
                // I6: en VENTA no se reemplaza el precio leído de la factura
                // por el del inventario (eso descuadraba base/IVA/total,
                // porque calculateFromItems() sumaba el precio nuevo pero el
                // resto de los montos financieros seguían siendo los del
                // OCR). En COMPRA sí usamos el costo del inventario como
                // antes, porque ahí no hay base/IVA ya calculados por ítem.
                const precioAplicado = isPurchase ? (match.cost_price || price) : price;
                foundMatch = {
                  ...baseItem,
                  code:        match.code || it.code || null,
                  description: match.name,
                  unit:        match.unit || it.unit || null,
                  unitPrice:   precioAplicado,
                  total:       parseFloat((qty * precioAplicado).toFixed(2)),
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

            // ── 2. No existe: marcar para crear en inventario SOLO al guardar
            // (I7). Antes se creaba aquí mismo con stock 0, así que escanear y
            // cancelar (o volver a intentar) dejaba productos fantasma en el
            // inventario. Ahora solo se deja la marca `_productoPendiente`
            // (mismo patrón que el proveedor pendiente, I3); el producto real
            // se crea en registroService.guardarRegistro, y nunca se guarda
            // dentro de la factura.
            let pendingMatch = null;
            if (isPurchase && baseItem.description) {
              const nativePrice = parseFloat(price) || 0;
              pendingMatch = {
                ...baseItem,
                code:       it.code || null,
                unit:       it.unit || 'UND',
                product_id: null,
                product:    null,
                _productoPendiente: {
                  name:       baseItem.description,
                  code:       it.code || null,
                  currency:   itemCur,
                  cost_price: nativePrice,
                  sale_price: parseFloat((nativePrice * 1.30).toFixed(2)),
                  stock:      0,
                  unit:       it.unit || 'UND',
                  min_stock:  0,
                  status:     'ACTIVE'
                }
              };
              createdCount++;
            }

            if (pendingMatch) {
              mappedItems.push(pendingMatch);
            } else {
              // Fallback: ítem como texto libre si todo falla
              mappedItems.push(baseItem);
            }
          }

          this.formData.items = mappedItems;
          this.syncItemsInventoryMode(); // Asegurar isInventory según el flujo detectado

          // I6: si el OCR ya trajo la base imponible, los ítems son solo
          // detalle — no se recalcula la base a partir de su suma (eso
          // duplicaba los exentos y descuadraba base/IVA/total). Si la suma
          // de los ítems no coincide con la base leída, se avisa en vez de
          // corregirla en silencio.
          const baseYaLeidaDelOcr = data.financial && data.financial.taxableAmount !== undefined;
          this._avisoBaseItemsNoCoincide = false;
          if (!baseYaLeidaDelOcr) {
            this.calculateFromItems();
          } else {
            const sumaItems = mappedItems.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);
            const baseOcr = parseFloat(this.formData.financial.taxableSales) || 0;
            if (Math.abs(sumaItems - baseOcr) > 0.5) {
              this._avisoBaseItemsNoCoincide = true;
              console.warn(`[OCR] La suma de los ítems (${sumaItems.toFixed(2)}) no coincide con la base imponible leída (${baseOcr.toFixed(2)}).`);
            }
          }

          this._ocrMatchedCount = matchedCount;
          this._ocrCreatedCount = createdCount;
          console.log(`✅ [OCR] ${mappedItems.length} ítems: ${matchedCount} vinculados, ${createdCount} auto-creados en inventario`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 6: MONEDA Y NOTAS
        // ═══════════════════════════════════════════════════════════════
        if (data.currency) {
          // Yuan por OCR (Amazon/Alibaba): "RMB" y "¥" son el CNY. El cambio de moneda dispara
          // la búsqueda de su tasa (ver el watcher de formData.financial.currency).
          const alias = { RMB: 'CNY', '¥': 'CNY', '€': 'EUR', '$': 'USD', 'BS': 'VES', 'BS.': 'VES' };
          const codigo = alias[String(data.currency).trim().toUpperCase()] || String(data.currency).trim().toUpperCase();
          this.formData.financial.currency = MONEDAS[codigo] ? codigo : data.currency;
        }
        if (data.notes) {
          this.formData.notes = data.notes;
          this.notesExpanded = true;
        }

        // ═══════════════════════════════════════════════════════════════
        // PASO 6.5: SUGERIR CATEGORÍA DE GASTO (Tarea C, punto 2)
        // ═══════════════════════════════════════════════════════════════
        if (this.formData.flow === 'COMPRA') {
          await this.sugerirYPrellenarCategoria(data);
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
              if (this._ocrCreatedCount > 0) parts.push(`${this._ocrCreatedCount} nuevo(s) — se registran en inventario al guardar`);
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
          matchMsg = `✅ ${mc} producto(s) vinculados y ${cc} nuevo(s) que se registrarán en inventario al guardar.`;
        } else if (cc > 0) {
          matchMsg = `✅ ${cc} producto(s) nuevo(s) listos; se registrarán en inventario al guardar. ¡Verifica los precios!`;
        } else if (mc > 0) {
          matchMsg = `✅ ${mc} producto(s) vinculados al inventario correctamente.`;
        }

        // M8: el aviso de "proveedor nuevo" (ver _ofrecerCrearProveedor) ya se
        // mostró en su propio snackbar; si quedó pendiente, lo reforzamos acá
        // para que no se pierda entre los demás mensajes del resumen.
        if (this.formData.issuer?._proveedorPendiente) {
          matchMsg += ` Proveedor "${this.formData.issuer._proveedorPendiente.nombre}" nuevo — se registrará al guardar.`;
        }

        this.ocrResult = { success: true, summary };

        // I6: la base imponible y la suma de los ítems no coinciden — avisar
        // en vez de corregir en silencio (ver _avisoBaseItemsNoCoincide más
        // arriba). No bloquea el guardado: el usuario puede corregir a mano.
        // showSnackbar no encola mensajes (sobreescribe el anterior), así
        // que este aviso va en el MISMO snackbar que el resumen del OCR.
        if (this._avisoBaseItemsNoCoincide) {
          this.showSnackbar(
            `${matchMsg} ⚠️ La suma de los productos no coincide con la base imponible de la factura: revisa los montos antes de guardar.`,
            'warning',
            9000
          );
        } else {
          this.showSnackbar(matchMsg, 'success');
        }

      } catch (err) {
        console.error('❌ [OCR] Error:', err);
        const errMsg = err.message || 'No se pudo leer el documento. Por favor, ingresa los datos manualmente.';
        this.ocrResult = { success: false, message: errMsg };
        this.showSnackbar(errMsg, 'error');
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
      // 4. Total — Permitir monto 0 solo si la factura está ANULADA
      const esAnulada = this.formData.status === 'ANULADA';
      if (!esAnulada && this.formData.financial.totalSales <= 0) {
        this.showSnackbar('El total de la factura debe ser mayor a 0. Agrega al menos un producto o ajusta los montos.', 'error');
        return false;
      }
      // 4b. Moneda extranjera: la tasa del día de la factura es obligatoria. Con tasa 1
      //     los montos en bolívares (libros, retenciones) saldrían mal sin que nadie lo note.
      const moneda = this.formData.financial.currency;
      const tasa = Number(this.formData.financial.exchangeRate);
      // Yuan, lira y rublo: se exige la tasa de ESA moneda (la del dólar no sirve para convertirlas)
      if (MONEDAS_OTRAS.includes(moneda) && !esAnulada && !(Number(this.formData.financial.tasas?.[moneda]) > 0)) {
        this.isEditingExchangeRate = true;
        if (this.simple) this.simpleDetailsOpen = true;
        this.showSnackbar(
          `Falta la tasa del ${(MONEDAS[moneda]?.nombre || moneda).toLowerCase()} (${moneda}). Escríbela en "Tasa de cambio" o toca "Usar tasa de hoy".`,
          'error',
          8000
        );
        return false;
      }
      if (moneda && moneda !== 'VES' && !MONEDAS_OTRAS.includes(moneda) && !esAnulada && (!tasa || tasa <= 1)) {
        this.isEditingExchangeRate = true;
        if (this.simple) this.simpleDetailsOpen = true;
        this.showSnackbar(
          'Falta la tasa del dólar del día de la factura. Escríbela en "Tasa de cambio" (la encuentras en bcv.org.ve) o toca "Usar tasa de hoy".',
          'error',
          8000
        );
        return false;
      }
      // 5. Stock suficiente (solo en VENTA)
      if (this.formData.flow === 'VENTA') {
        const overflow = this.formData.items.find(i => excedeStock(i, 'VENTA'));
        if (overflow) {
          this.showSnackbar(`Sin stock suficiente para: ${overflow.product.name} (quedan ${overflow.product.stock})`, 'error');
          return false;
        }
      }
      // 6. Números de comprobante de retención no duplicados (solo COMPRA)
      if (this.formData.flow === 'COMPRA') {
        if (this.comprobanteDuplicado.iva || this.comprobanteDuplicado.islr || this.comprobanteDuplicado.municipal) {
          this.showSnackbar('Hay números de comprobante de retención duplicados. Corrígelos antes de guardar.', 'error');
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

        // Todas las tasas vigentes del día, para poder convertir la factura a cualquier moneda después
        payload.financial.tasas = this.construirTasasFactura();

        if (this.retentionConfig.aplicarIslr && this.retentionConfig.conceptoIslr) {
           payload.islr_concept_id = this.retentionConfig.conceptoIslr;
        }
        if (this.retentionConfig.aplicarMunicipal && this.retentionConfig.concepto_municipal_id) {
           payload.concepto_municipal_id = this.retentionConfig.concepto_municipal_id;
        }

        // Limpiar campos internos que no deben persistirse en la BD.
        // - _key: identificador temporal para v-for
        // - product: objeto completo del inventario (datos potencialmente obsoletos)
        //   Solo conservamos product_id como referencia limpia.
        payload.items = payload.items.map(({ _key, product, ...rest }) => ({
          ...rest,
          product_id: rest.product_id || (product?.id ?? null),
        }));

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
      // Modo simple: mostrar la pantalla de éxito propia del componente
      // ("Registrar otro" / "Volver al inicio"), ver fase2-spec.md §3.5.
      if (this.simple) {
        this.simpleHuboRetencion = this.hasRetencionesRegistradas;
        this.simpleSuccess = true;
      }
    },

    // Llamado al crear un nuevo proveedor desde el ProveedorModalForm
    onNewProveedorSaved(newProv) {
      if (newProv) {
        this.proveedor = newProv;
        this.proveedorInitialData = null; // Limpiar datos OCR pre-rellenados
        this.showSnackbar(`Proveedor "${newProv.nombre}" registrado y seleccionado`, 'success');
      }
    },

    /**
     * Busca un proveedor existente en el directorio a partir de los datos del EMISOR (issuer)
     * extraídos por el OCR. Solo aplica en flujo COMPRA/GASTO.
     *
     * IMPORTANTE: issuerData proviene de data.issuer (el proveedor que nos vendió),
     * NUNCA de data.client (que somos nosotros, el usuario).
     *
     * @param {Object} issuerData - { companyName, rif, address, phone, email } del emisor OCR
     */
    async matchProveedorFromOcr(issuerData) {
      if (!issuerData) return;

      // Esperar a que Vue renderice el ProveedorAutocomplete (tiene v-if="COMPRA")
      // El PASO 1 acaba de cambiar el flow, el componente aún no está en el DOM
      await this.$nextTick();
      await this.$nextTick(); // Doble nextTick para asegurar que el componente se montó

      let proveedores = [];

      // Intentar obtener proveedores del autocomplete (ya cargados en memoria)
      const autocomplete = this.$refs.proveedorAutocomplete;
      if (autocomplete) {
        proveedores = autocomplete.getProveedoresList?.() || [];
        // Si el autocomplete se acaba de montar, puede que aún no tenga datos
        if (proveedores.length === 0) {
          await autocomplete.fetchProveedores();
          proveedores = autocomplete.getProveedoresList() || [];
        }
      }

      // Fallback: si el ref no está disponible, cargar directo del servicio
      if (proveedores.length === 0) {
        console.log('[OCR] Autocomplete no disponible o vacío, cargando proveedores del servicio...');
        try {
          proveedores = await proveedorService.getProveedores({ onlyActive: true }) || [];
        } catch (err) {
          console.warn('[OCR] Error cargando proveedores para matching:', err);
          proveedores = [];
        }
      }

      console.log('[OCR] Proveedores disponibles para matching:', proveedores.length);

      // La DECISIÓN (match exacto por RIF / nombre / parcial, o pendiente) es
      // una función pura compartida y probada de verdad en
      // src/utils/__tests__/matchProveedorOcr.test.js (M10, ola F2b) — aquí
      // solo quedan los efectos: cargar la lista y aplicar el resultado.
      const { matched, confidence, pendiente } = decidirMatchProveedor(issuerData, proveedores);

      if (matched) {
        // Vincular proveedor encontrado (dispara el watcher que carga retenciones)
        this.proveedor = matched;
        const label = confidence === 'exact-rif'
          ? `Proveedor "${matched.nombre}" vinculado automáticamente (RIF: ${matched.rif})`
          : `Proveedor "${matched.nombre}" vinculado automáticamente por nombre`;
        this.showSnackbar(label, 'success');
        console.log(`[OCR] Proveedor vinculado (${confidence}):`, matched.nombre, matched.rif);
      } else {
        console.log('[OCR] Sin match para el proveedor leído:', issuerData);
        this._ofrecerCrearProveedor(issuerData, pendiente);
      }
    },

    /**
     * El OCR trajo un proveedor (RIF/nombre) que no está en el directorio del
     * cliente. Tarea C (OCR), punto 1:
     * - Si el RIF se pudo reconocer, prellena "¿A quién le pagaste?" con el
     *   nombre leído y una marca "Nuevo proveedor — se guardará al registrar"
     *   (`formData.issuer._proveedorPendiente`). El proveedor real recién se
     *   crea al guardar (ver registroService.guardarRegistro) — nada se crea
     *   si el usuario cancela.
     * - Si no hay RIF reconocible, no podemos crear el proveedor (es un campo
     *   obligatorio), así que solo dejamos los datos listos para el botón
     *   "Nuevo" y avisamos al usuario.
     *
     * NUNCA usa data.client (que es el usuario/comprador).
     *
     * @param {Object} issuerData - Datos del emisor del OCR: { companyName, rif, address, phone, email }
     * @param {{nombre:string, rif:string, direccion:string, telefono:string, email:string}|null} pendiente
     *   Ya construido por la función pura `construirProveedorPendiente`
     *   (src/utils/matchProveedorOcr.js), o `null` si el RIF no se pudo
     *   reconocer (no se puede autocrear sin RIF).
     */
    _ofrecerCrearProveedor(issuerData, pendiente = null) {
      const rifNormalizado = pendiente?.rif || null;

      // Guardar datos del EMISOR (proveedor) para pre-rellenar el modal "Nuevo"
      this.proveedorInitialData = {
        nombre: issuerData.companyName || '',
        rif: rifNormalizado || issuerData.rif || '',
        direccion: issuerData.address || '',
        telefono: issuerData.phone || '',
        email: issuerData.email || ''
      };

      console.log('[OCR] Proveedor no encontrado en directorio. Datos del EMISOR para pre-rellenar:', this.proveedorInitialData);

      // I3: si quedaba un issuer.id de un proveedor elegido antes (el usuario
      // lo vació o escaneó un documento de otro proveedor), hay que limpiarlo
      // ya — si no, registroService ve un issuer.id "viejo" y nunca crea el
      // proveedor nuevo, y la compra queda enlazada al proveedor equivocado.
      if (this.formData.issuer) this.formData.issuer.id = '';

      if (pendiente) {
        this.formData.issuer._proveedorPendiente = pendiente;
        this.showSnackbar(
          `"${issuerData.companyName}" no estaba en tu directorio: lo registraremos como proveedor nuevo al guardar.`,
          'info',
          6000
        );
        // C2: calcular la retención con los valores por defecto del
        // proveedor pendiente, igual que con uno ya existente (si no, la
        // vista previa se queda en 0 hasta que el usuario toque algún otro
        // campo, y un cliente agente de retención podría guardar sin darse
        // cuenta de que faltaba el comprobante).
        this.calcularRetenciones();
      } else {
        this.showSnackbar(
          `Proveedor "${issuerData.companyName || 'desconocido'}" no está en tu directorio. Haz clic en "Nuevo" para registrarlo.`,
          'warning',
          8000
        );
      }
    },

    // Tarea C (OCR): el usuario prefiere buscar un proveedor distinto al que
    // sugirió el OCR. Cancela el "nuevo proveedor" pendiente (no se crea
    // nada) y vuelve a mostrar el buscador normal.
    cancelarProveedorPendienteOcr() {
      if (this.formData.issuer) delete this.formData.issuer._proveedorPendiente;
    },

    /**
     * Tarea C (OCR), punto 2: sugiere y prellena la categoría de gasto a
     * partir de lo que leyó el OCR, usando la función pura
     * `sugerirCategoria` (src/utils/sugerirCategoria.js). Solo prellena el
     * campo cuando la categoría sugerida existe de verdad entre las
     * categorías del cliente (nunca crea una categoría nueva sola); el
     * usuario siempre puede cambiarla (chip "Sugerido").
     * @param {Object} data - Respuesta cruda del OCR (procesarComprobanteOCR).
     */
    async sugerirYPrellenarCategoria(data) {
      try {
        const clientId = this.currentUser?.client?.id;

        const proveedorInfo = this.proveedor
          ? { nombre: this.proveedor.nombre, rif: this.proveedor.rif }
          : (this.formData.issuer?._proveedorPendiente || (data.issuer ? { nombre: data.issuer.companyName, rif: data.issuer.rif } : null));

        const textoOcr = [data.notes, data.expenseCategoryHint].filter(Boolean).join(' ');
        const historial = await this._obtenerHistorialCategoriasProveedor(clientId);

        const sugerencia = sugerirCategoria({
          proveedor: proveedorInfo,
          items: this.formData.items,
          textoOcr,
          historial,
          categoriaIA: data.expenseCategoryHint || null
        });

        if (!sugerencia.categoria) return;

        const categoriaEncontrada = await this._buscarCategoriaPorNombre(sugerencia.categoria, clientId);
        if (!categoriaEncontrada) {
          console.log('[OCR] Categoría sugerida pero no existe en el directorio del cliente:', sugerencia.categoria);
          return;
        }

        // I9: confianza ALTA (historial del proveedor, 0.9+) se prellena
        // directo. Confianza MEDIA (palabra clave o pista de la IA) solo se
        // ofrece como chip "¿Es «X»?" que el usuario debe tocar para
        // aceptarla; nunca se prellena sola.
        if (sugerencia.confianza >= 0.9) {
          this.formData.expense_category_id = categoriaEncontrada.id;
          this.categoriaSugerida = true;
          this.categoriaSugerenciaPendiente = null;
          console.log('[OCR] Categoría sugerida (alta confianza):', sugerencia.motivo, '→', categoriaEncontrada.name);
        } else {
          this.categoriaSugerenciaPendiente = { id: categoriaEncontrada.id, nombre: categoriaEncontrada.name };
          console.log('[OCR] Categoría sugerida (confianza media, pendiente de confirmar):', sugerencia.motivo, '→', categoriaEncontrada.name);
        }
      } catch (err) {
        // Nunca bloquear el flujo de OCR por un problema al sugerir categoría
        console.warn('[OCR] No se pudo sugerir categoría:', err);
      }
    },

    /**
     * Historial de facturas de COMPRA del cliente con su categoría, para que
     * `sugerirCategoria` pueda aplicar la regla (a): "última categoría usada
     * con este proveedor". Nunca lanza (si falla, se sugiere sin historial).
     * @param {string} clientId
     * @returns {Promise<Array>}
     */
    async _obtenerHistorialCategoriasProveedor(clientId) {
      try {
        // M9: consulta ligera y con client_id OBLIGATORIO (si no se resolvió,
        // getHistorialCategoriasCompras devuelve [] en vez de traer compras
        // de otros clientes de la organización). Antes usaba getInvoices,
        // que trae TODAS las columnas (items, attachments, financial...) de
        // TODAS las compras del cliente en cada escaneo.
        return await invoiceService.getHistorialCategoriasCompras({ clientId });
      } catch (err) {
        console.warn('[OCR] No se pudo cargar el historial de categorías:', err);
        return [];
      }
    },

    /**
     * Busca, entre las categorías reales del cliente, una cuyo nombre
     * coincida (exacto o parcial, sin tildes) con la categoría sugerida.
     * Nunca crea una categoría nueva: si no existe, el campo se deja vacío
     * para que el usuario la elija o la cree a mano.
     * @param {string} nombreSugerido
     * @param {string} clientId
     * @returns {Promise<Object|null>}
     */
    async _buscarCategoriaPorNombre(nombreSugerido, clientId) {
      try {
        const categorias = await expenseCategoryService.getCategories({ clientId });
        // I9: la comparación (solo nombre EXACTO normalizado, sin tildes ni
        // mayúsculas, nunca una coincidencia parcial) es una función pura
        // compartida y probada de verdad (src/utils/sugerirCategoria.js).
        return resolverCategoriaPorNombre(nombreSugerido, categorias);
      } catch (err) {
        console.warn('[OCR] No se pudo cargar las categorías del cliente:', err);
        return null;
      }
    },

    // ── Snackbar ──────────────────────────────────────────────────────────────
    showSnackbar(message, type = 'info', timeout = 5000) {
      this.snackbar = { show: true, message, type, timeout };
    }
  }
};
</script>

<style scoped>
/* ─── Selector de moneda: VES/USD/EUR a la vista + "Otra moneda" ─────── */
.moneda-selector__etiqueta {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 4px;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.moneda-selector__botones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.moneda-selector__boton {
  min-height: 44px;
}

/* ─── Layout ─────────────────────────────────────────────── */

/* v-card ocupa toda la altura disponible del diálogo */
.sif-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
}

/* El <v-form> va entre la card y su contenido, así que el overflow automático de
   Vuetify (que exige .v-card > .v-card-text directo) no aplicaba: en el teléfono el
   formulario medía ~2500px y "Cancelar" quedaba fuera de alcance (E2E 2026-10-14).
   El form es una columna flexible; solo .sif-body hace scroll; cabecera y pie fijos. */
.sif-form {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.sif-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.sif-header { background: #fafafa; white-space: normal; }
.sif-footer { background: #fafafa; }


/* ─── Secciones ──────────────────────────────────────────── */
.date-input-naked {
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  font-family: inherit;
  font-size: 0.875rem;
  width: 110px;
}
:deep(.status-select-naked .v-field__input) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  min-height: 24px !important;
}

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

/* ─── Proveedor nuevo sugerido por OCR (Tarea C) ──────────── */
.sif-proveedor-pendiente {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  background: #f3f4ff;
  border: 1px dashed #5c6bc0;
}

/* ─── OCR Banner ─────────────────────────────────────────── */
.sif-ocr-banner {
  /* Identidad visual de la IA: borde animado (.ad-ia) y velo suave del token */
  --ad-ia-radio: 12px;
  background: var(--ad-ia-fondo-suave);
  border-radius: 12px;
}
.sif-ocr-active {
  background: var(--ad-ia-fondo-suave);
}
.sif-ia-icono { color: var(--ad-ia-1); }

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

/* Ocultar flechas del input number nativo */
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

/* ─── Chevron animado ─────────────────────────────────────── */
.sif-chevron-up { transform: rotate(180deg); }

.cursor-pointer { cursor: pointer; }
</style>
