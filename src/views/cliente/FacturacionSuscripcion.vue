<template>
  <v-container fluid class="billing-page pa-4 pa-md-6">
    <!-- Encabezado -->
    <div class="d-flex flex-column flex-md-row align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold" style="color: #1F355C;">
          <v-icon class="mr-2" color="#1F355C">mdi-receipt-text-outline</v-icon>
          Facturación
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Historial de pagos de tu suscripción al sistema.
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #02254d; color: white;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Total Facturado</div>
          <div class="text-h5 font-weight-bold">${{ formatMoney(balance.totalFacturado) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #4CAF50; color: white;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Pagado</div>
          <div class="text-h5 font-weight-bold">${{ formatMoney(balance.totalPagado) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #A81C22; color: white;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Pendiente</div>
          <div class="text-h5 font-weight-bold">${{ formatMoney(balance.totalPendiente) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #E0B04F; color: #1F355C;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Próx. Vencimiento</div>
          <div class="text-h6 font-weight-bold">
            {{ balance.proximoVencimiento ? formatDate(balance.proximoVencimiento) : 'Sin pendientes' }}
          </div>
        </v-card>
      </v-col>
      <!-- Saldo a favor (Nuevo) -->
      <v-col cols="12" sm="6" md="3" v-if="balance.saldoAFavor > 0">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #4CAF50; color: white;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Saldo a favor</div>
          <div class="text-h6 font-weight-bold">+${{ formatMoney(balance.saldoAFavor) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs: Facturas / Mis Reportes -->
    <v-card rounded="xl">
      <v-tabs v-model="activeTab" color="#A81C22" density="comfortable">
        <v-tab value="invoices">
          <v-icon start size="18">mdi-receipt-text-outline</v-icon>
          Facturas
          <v-chip size="x-small" class="ml-2" variant="tonal" color="primary">{{ invoices.length }}</v-chip>
        </v-tab>
        <v-tab value="reports">
          <v-icon start size="18">mdi-file-document-check-outline</v-icon>
          Mis Reportes
          <v-chip size="x-small" class="ml-2" variant="tonal" color="info">{{ clientReports.length }}</v-chip>
        </v-tab>
      </v-tabs>
      <v-divider></v-divider>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
        <p class="text-body-2 text-medium-emphasis mt-3">Cargando...</p>
      </div>

      <v-tabs-window v-else v-model="activeTab">
        <!-- ==================== TAB: FACTURAS ==================== -->
        <v-tabs-window-item value="invoices">
          <div v-if="invoices.length === 0" class="text-center py-12 px-4">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-receipt-text-check-outline</v-icon>
            <h3 class="text-h6 text-grey-darken-1 mb-2">No hay facturas aún</h3>
            <p class="text-body-2 text-medium-emphasis">
              Las facturas de tu suscripción aparecerán aquí cuando se generen.
            </p>
          </div>
          <v-data-table v-else :headers="tableHeaders" :items="invoices" :items-per-page="10"
            class="billing-table" density="comfortable">
            <template v-slot:item.invoice_number="{ item }">
              <span class="font-weight-bold text-body-2">{{ item.invoice_number }}</span>
            </template>
            <template v-slot:item.period="{ item }">
              <span class="text-body-2">{{ formatDate(item.period_start) }} — {{ formatDate(item.period_end) }}</span>
            </template>
            <template v-slot:item.amount="{ item }">
              <span class="font-weight-bold text-body-2">${{ formatMoney(item.amount) }}</span>
              <span class="text-caption text-medium-emphasis ml-1">{{ item.currency }}</span>
            </template>
            <template v-slot:item.due_date="{ item }">
              <span class="text-body-2">{{ formatDate(item.due_date) }}</span>
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="statusColor(item.status)" size="small" variant="tonal" class="font-weight-bold">
                <v-icon start size="14">{{ statusIcon(item.status) }}</v-icon>
                {{ statusLabel(item.status) }}
              </v-chip>
            </template>
            <template v-slot:item.actions="{ item }">
              <!-- Reporte pendiente de revisión -->
              <v-chip v-if="invoiceReportStatus(item.id) === 'pending_review'" size="small" color="info" variant="tonal">
                <v-icon start size="14">mdi-clock-check-outline</v-icon>
                En revisión
              </v-chip>
              <!-- Pagada -->
              <v-chip v-else-if="item.status === 'paid'" size="small" color="success" variant="text">
                <v-icon start size="14">mdi-check</v-icon>
                Pagada
              </v-chip>
              <!-- Rechazado: permite reintentar -->
              <div v-else-if="invoiceReportStatus(item.id) === 'rejected'" class="d-flex align-center ga-1">
                <v-chip size="small" color="error" variant="tonal">
                  <v-icon start size="14">mdi-close-circle</v-icon>
                  Rechazado
                </v-chip>
                <v-btn size="x-small" color="primary" variant="tonal" class="text-none"
                  @click="openPaymentDialog(item)">
                  Reintentar
                </v-btn>
              </div>
              <!-- Sin reporte: permitir reportar -->
              <v-btn v-else-if="item.status === 'pending'" size="small" color="primary" variant="tonal" class="text-none"
                @click="openPaymentDialog(item)">
                <v-icon start size="16">mdi-cash-register</v-icon>
                Reportar Pago
              </v-btn>
            </template>
          </v-data-table>
        </v-tabs-window-item>

        <!-- ==================== TAB: MIS REPORTES ==================== -->
        <v-tabs-window-item value="reports">
          <div v-if="clientReports.length === 0" class="text-center py-12 px-4">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-file-document-outline</v-icon>
            <h3 class="text-h6 text-grey-darken-1 mb-2">No tienes reportes de pago</h3>
            <p class="text-body-2 text-medium-emphasis">
              Cuando reportes un pago desde la pestaña "Facturas", aparecerá aquí.
            </p>
          </div>
          <v-data-table v-else :headers="reportHeaders" :items="clientReports" :items-per-page="10"
            class="billing-table" density="comfortable">
            <template v-slot:item.invoice="{ item }">
              <span class="font-weight-bold text-body-2">{{ item.invoice?.invoice_number || '—' }}</span>
            </template>
            <template v-slot:item.method="{ item }">
              <v-chip size="x-small" :color="methodColor(item.payment_method?.type)" variant="tonal">
                <v-icon start size="12">{{ methodIcon(item.payment_method?.type) }}</v-icon>
                {{ item.payment_method?.name || '—' }}
              </v-chip>
            </template>
            <template v-slot:item.reference="{ item }">
              <span class="text-body-2 font-weight-medium">{{ item.reference }}</span>
            </template>
            <template v-slot:item.amounts="{ item }">
              <div>
                <div class="font-weight-bold text-success" title="Monto Reportado">${{ formatMoney(item.amount) }}</div>
                <div class="text-caption text-grey" title="Monto Factura">${{ formatMoney(item.invoice?.amount || 0) }}</div>
              </div>
            </template>
            <template v-slot:item.created_at="{ item }">
              <span class="text-body-2">{{ formatDate(item.created_at) }}</span>
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="reportStatusColor(item.status)" size="small" variant="tonal" class="font-weight-bold">
                <v-icon start size="14">{{ reportStatusIcon(item.status) }}</v-icon>
                {{ reportStatusLabel(item.status) }}
              </v-chip>
            </template>
            <template v-slot:item.actions="{ item }">
              <div class="d-flex align-center ga-1">
                <!-- Ver detalle (siempre) -->
                <v-btn icon size="x-small" variant="text" color="primary" @click="openReportDetail(item)">
                  <v-icon size="18">mdi-eye-outline</v-icon>
                  <v-tooltip activator="parent" location="top">Ver detalle</v-tooltip>
                </v-btn>
                <!-- Editar (solo pending_review) -->
                <v-btn v-if="item.status === 'pending_review'" icon size="x-small" variant="text" color="info" @click="openEditReport(item)">
                  <v-icon size="18">mdi-pencil-outline</v-icon>
                  <v-tooltip activator="parent" location="top">Editar reporte</v-tooltip>
                </v-btn>
                <!-- Eliminar (solo pending_review) -->
                <v-btn v-if="item.status === 'pending_review'" icon size="x-small" variant="text" color="error" @click="confirmDeleteReport(item)">
                  <v-icon size="18">mdi-delete-outline</v-icon>
                  <v-tooltip activator="parent" location="top">Eliminar reporte</v-tooltip>
                </v-btn>
                <!-- Motivo de rechazo -->
                <v-tooltip v-if="item.status === 'rejected' && item.rejection_reason" location="top">
                  <template v-slot:activator="{ props }">
                    <v-icon v-bind="props" color="error" size="20">mdi-information-outline</v-icon>
                  </template>
                  <span><strong>Motivo:</strong> {{ item.rejection_reason }}</span>
                </v-tooltip>
              </div>
            </template>
          </v-data-table>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- ==================== DIALOG: REPORTAR / EDITAR PAGO ==================== -->
    <v-dialog v-model="showPaymentDialog" max-width="650" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center">
          <v-icon color="primary" class="mr-2">{{ isEditingReport ? 'mdi-pencil' : 'mdi-cash-register' }}</v-icon>
          {{ isEditingReport ? 'Editar Reporte de Pago' : 'Reportar Pago' }}
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closePaymentDialog"></v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-card-text class="pa-5">
          <!-- Info de la factura -->
          <v-alert variant="tonal" color="info" border="start" class="mb-5 text-body-2" density="compact">
            <strong>Factura:</strong> {{ selectedInvoice?.invoice_number }}<br>
            <strong>Monto:</strong> ${{ formatMoney(selectedInvoice?.amount) }} {{ selectedInvoice?.currency }}
            <template v-if="selectedMethodIgtf">
              <br><strong>+ IGTF (3%):</strong> ${{ formatMoney(igtfAmount) }}
              <br><strong>Total a pagar:</strong> ${{ formatMoney(totalWithIgtf) }}
            </template>
            <template v-if="bcvRate">
               / <strong>Bs. {{ formatMoney(totalWithIgtf * bcvRate.dollar) }}</strong>
               <div class="text-caption mt-1 opacity-80">Tasa BCV: {{ bcvRate.dollar.toFixed(4) }} Bs/$ ({{ formatDate(bcvRate.date) }})</div>
            </template>
          </v-alert>

          <v-form ref="paymentForm" @submit.prevent="submitPayment">
            <!-- Paso 1: Seleccionar método de pago -->
            <p class="text-subtitle-2 font-weight-bold mb-2" style="color: #1F355C;">
              1. ¿Cómo deseas pagar?
            </p>
            <v-select
              v-model="paymentFormData.payment_method_id"
              :items="availableMethods"
              item-title="name"
              item-value="id"
              label="Selecciona un método de pago"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-credit-card-outline"
              :rules="[v => !!v || 'Selecciona un método']"
              class="mb-1"
              @update:modelValue="onMethodSelected"
            >
              <template v-slot:item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template v-slot:prepend>
                    <v-icon :color="methodColor(item.raw.type)">{{ methodIcon(item.raw.type) }}</v-icon>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Descripción/instrucciones del método -->
            <v-alert v-if="selectedMethodDescription" variant="tonal" color="primary" density="compact"
              class="mb-4 text-body-2" border="start">
              <v-icon start size="16">mdi-information-outline</v-icon>
              {{ selectedMethodDescription }}
            </v-alert>

            <!-- Datos del receptor -->
            <v-card v-if="selectedMethodDetails && Object.keys(selectedMethodDetails).length" variant="outlined"
              rounded="lg" class="pa-3 mb-4" style="background: #f9f9f9;">
              <p class="text-caption text-uppercase font-weight-bold mb-2">Datos para realizar el pago</p>
              <div v-for="(val, key) in selectedMethodDetails" :key="key" class="d-flex mb-1">
                <span class="text-caption text-medium-emphasis mr-2" style="min-width: 120px;">{{ detailLabel(key) }}:</span>
                <span class="text-body-2 font-weight-medium">{{ val }}</span>
              </div>
              <!-- Mostrar equivalente en Bs para transferencias/pago móvil -->
              <template v-if="(selectedMethodType === 'bank_transfer' || selectedMethodType === 'mobile_payment') && bcvRate">
                <v-divider class="my-2"></v-divider>
                <div class="d-flex align-center justify-space-between text-caption font-weight-bold text-primary">
                  <span>Monto en Bolívares:</span>
                  <span>Bs. {{ formatMoney(totalWithIgtf * bcvRate.dollar) }}</span>
                </div>
              </template>
            </v-card>

            <!-- ============ Paso 2: Comprobante de pago (PRIORIZADO) ============ -->
            <p class="text-subtitle-2 font-weight-bold mb-1 mt-4" style="color: #1F355C;">
              2. Comprobante de pago
              <v-chip v-if="selectedMethodRequireProof" size="x-small" color="error" variant="tonal" class="ml-1">Obligatorio</v-chip>
              <span v-else class="text-caption text-medium-emphasis font-weight-regular"> (recomendado)</span>
            </p>
            <p class="text-caption text-medium-emphasis mb-3">
              <v-icon size="14" color="primary" class="mr-1">mdi-robot-outline</v-icon>
              Sube la captura del comprobante y nuestra <strong>IA</strong> intentará extraer automáticamente la referencia y datos del emisor.
            </p>

            <!-- Comprobante actual (modo edición) -->
            <v-alert v-if="isEditingReport && editingReportProofUrl && !replaceProof" variant="tonal" color="success"
              density="compact" class="mb-3">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <v-icon start size="16">mdi-file-check-outline</v-icon>
                  Comprobante adjuntado
                </div>
                <div class="d-flex ga-1">
                  <v-btn size="x-small" variant="text" color="primary" :href="editingReportProofUrl" target="_blank" class="text-none">
                    <v-icon start size="14">mdi-eye-outline</v-icon>
                    Ver
                  </v-btn>
                  <v-btn size="x-small" variant="text" color="warning" class="text-none" @click="replaceProof = true">
                    <v-icon start size="14">mdi-swap-horizontal</v-icon>
                    Reemplazar
                  </v-btn>
                  <v-btn size="x-small" variant="text" color="error" class="text-none" @click="removeExistingProof">
                    <v-icon start size="14">mdi-delete-outline</v-icon>
                    Quitar
                  </v-btn>
                </div>
              </div>
            </v-alert>

            <!-- Zona de upload estilo drag & drop -->
            <v-card
              v-if="!isEditingReport || replaceProof || !editingReportProofUrl"
              variant="outlined"
              rounded="lg"
              class="proof-upload-zone mb-3"
              :class="{ 'proof-has-file': proofFile, 'proof-loading': ocrProcessing }"
              @click="$refs.proofFileInput?.click()"
              style="cursor: pointer; border-style: dashed; border-width: 2px;"
            >
              <!-- Loading OCR -->
              <div v-if="ocrProcessing" class="text-center pa-5">
                <v-progress-circular indeterminate color="primary" size="40" width="3" class="mb-3"></v-progress-circular>
                <v-progress-linear indeterminate color="primary" class="mb-3" rounded></v-progress-linear>
                <div class="text-subtitle-2 text-primary font-weight-bold">
                  <v-icon start size="18">mdi-robot-outline</v-icon>
                  Analizando comprobante con IA...
                </div>
                <div class="text-caption text-grey mt-1">Esto puede tomar unos segundos...</div>
              </div>

              <!-- File selected preview -->
              <div v-else-if="proofFile" class="text-center pa-4">
                <div class="d-flex align-center justify-center mb-2">
                  <v-icon :icon="proofFile.type?.startsWith('image/') ? 'mdi-image' : 'mdi-file-pdf-box'" size="36" color="primary" class="mr-3"></v-icon>
                  <div class="text-left">
                    <div class="text-subtitle-2 font-weight-bold">{{ proofFile.name }}</div>
                    <div class="text-caption text-grey">{{ (proofFile.size / 1024).toFixed(1) }} KB</div>
                  </div>
                </div>
                <!-- Vista previa de imagen -->
                <v-img v-if="proofPreviewUrl" :src="proofPreviewUrl" max-height="180" contain class="rounded-lg mb-3 mx-auto" style="max-width: 300px; border: 1px solid #e0e0e0;" @click.stop></v-img>
                <div class="d-flex justify-center gap-2">
                  <v-btn prepend-icon="mdi-refresh" variant="tonal" color="primary" size="x-small" class="text-none" @click.stop="$refs.proofFileInput?.click()">
                    Reemplazar
                  </v-btn>
                  <v-btn prepend-icon="mdi-delete-outline" variant="tonal" color="error" size="x-small" class="text-none" @click.stop="removeProofFile">
                    Quitar
                  </v-btn>
                </div>
              </div>

              <!-- Empty state: invite to upload -->
              <div v-else class="text-center pa-5">
                <v-icon icon="mdi-camera-plus-outline" size="40" color="grey-lighten-1" class="mb-2"></v-icon>
                <div class="text-body-2 font-weight-bold mb-1">Sube la captura o PDF del comprobante</div>
                <div class="text-caption text-grey mb-2">Haz clic aquí o arrastra el archivo</div>
                <div class="d-flex justify-center gap-2 mb-1">
                  <v-chip variant="outlined" size="x-small" color="grey">JPG</v-chip>
                  <v-chip variant="outlined" size="x-small" color="grey">PNG</v-chip>
                  <v-chip variant="outlined" size="x-small" color="grey">PDF</v-chip>
                </div>
              </div>

              <!-- Hidden file input -->
              <input
                ref="proofFileInput"
                type="file"
                accept="image/*,.pdf"
                style="display: none"
                @change="onProofInputChange"
              />
            </v-card>

            <!-- OCR result alert -->
            <v-fade-transition>
              <v-alert v-if="ocrCompleted" variant="tonal" color="success" density="compact" class="mb-3" closable>
                <v-icon start size="16">mdi-check-circle</v-icon>
                <strong>¡IA completó los datos!</strong>
                <div class="text-caption">Se extrajeron campos automáticamente. Verifica que sean correctos abajo.</div>
              </v-alert>
            </v-fade-transition>

            <!-- ============ Paso 3: Datos del pago ============ -->
            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-2" style="color: #1F355C;">
              3. Datos de tu pago
              <v-chip v-if="ocrCompleted" size="x-small" color="success" variant="tonal" class="ml-1">
                <v-icon start size="12">mdi-robot-outline</v-icon>
                Auto-completado
              </v-chip>
            </p>

            <v-text-field v-model="paymentFormData.reference" label="Número de referencia / comprobante"
              variant="outlined" density="comfortable" prepend-inner-icon="mdi-pound"
              placeholder="Ej: 00012345678" :rules="[v => !!v || 'Ingresa la referencia']" class="mb-3"></v-text-field>

            <!-- Monto Reportado Universal (Editable) -->
            <v-text-field 
              v-model.number="paymentFormData.amount" 
              label="Monto Reportado (USD)" 
              variant="outlined" 
              density="comfortable" 
              type="number" 
              step="0.01" 
              prepend-inner-icon="mdi-currency-usd"
              :rules="[v => v > 0 || 'El monto debe ser mayor a 0']" 
              class="mb-3"
              hint="Si el pago fue en Bolívares, el sistema calcula el equivalente. Ajusta si es necesario."
              persistent-hint
            ></v-text-field>

            <!-- Validaciones de pago -->
            <v-alert v-if="paymentStatusMessage" :type="paymentStatusMessage.type" variant="tonal" density="compact" class="mb-4 text-caption">
              {{ paymentStatusMessage.text }}
            </v-alert>

            <!-- Campos dinámicos: Pago Móvil -->
            <template v-if="selectedMethodType === 'mobile_payment'">
              <v-text-field v-model="paymentFormData.sender_details.sender_phone" label="Tu teléfono (desde donde pagaste)"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-phone"
                placeholder="0412-1234567" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="paymentFormData.sender_details.sender_document" label="Tu documento (cédula)"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-card-account-details"
                placeholder="V-12345678" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="paymentFormData.sender_details.sender_bank" label="Tu banco"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-bank"
                placeholder="Ej: Banesco" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
            </template>

            <!-- Campos dinámicos: Zelle -->
            <template v-if="selectedMethodType === 'zelle'">
              <v-text-field v-model="paymentFormData.sender_details.sender_email" label="Tu correo de Zelle (desde donde enviaste)"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-email"
                placeholder="tu-email@ejemplo.com" type="email" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="paymentFormData.sender_details.sender_name" label="Nombre del titular de la cuenta Zelle"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-account"
                placeholder="Ej: John Doe" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>

            </template>

            <!-- Campos dinámicos: Binance -->
            <template v-if="selectedMethodType === 'binance'">
              <v-text-field v-model="paymentFormData.sender_details.sender_email" label="Tu correo de Binance"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-email"
                placeholder="tu-email@ejemplo.com" type="email" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="paymentFormData.sender_details.sender_binance_id" label="Tu Binance ID / Pay ID"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-identifier"
                placeholder="Ej: 123456789" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>

            </template>

            <!-- Soporte -->
            <v-alert v-if="selectedMethodSupport" variant="tonal" color="grey" density="compact" class="mt-2 text-body-2">
              <v-icon start size="16">mdi-headset</v-icon>
              <strong>¿Problemas con el pago?</strong> Llama al {{ selectedMethodSupport }}
            </v-alert>
          </v-form>
          
           <!-- Botón de Ayuda Flotante (en el dialog) -->
           <div class="d-flex justify-center mt-2">
             <v-btn variant="text" size="small" color="primary" class="text-caption text-none" prepend-icon="mdi-whatsapp" href="https://wa.me/584241234567" target="_blank">
               ¿Necesitas ayuda con este pago?
             </v-btn>
           </div>
        </v-card-text>

        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey-darken-1" @click="closePaymentDialog" class="mr-2">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="submittingPayment" :disabled="!paymentFormValid"
            @click="submitPayment" class="text-none font-weight-bold">
            <v-icon start>mdi-check-circle</v-icon>
            {{ isEditingReport ? 'Guardar Cambios' : 'Confirmar Pago' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ==================== DIALOG: DETALLE DE REPORTE ==================== -->
    <v-dialog v-model="showDetailDialog" max-width="550">
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pa-4 d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-file-document-outline</v-icon>
          Detalle del Reporte
          <v-spacer></v-spacer>
          <v-chip :color="reportStatusColor(detailReport?.status)" size="small" variant="tonal" class="font-weight-bold">
            {{ reportStatusLabel(detailReport?.status) }}
          </v-chip>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text v-if="detailReport" class="pa-5">
          <v-list density="compact" class="bg-transparent">
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="primary">mdi-receipt-text-outline</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Factura</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">{{ detailReport.invoice?.invoice_number || '—' }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="primary">mdi-credit-card-outline</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Método de Pago</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">{{ detailReport.payment_method?.name || '—' }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="primary">mdi-pound</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Referencia</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">{{ detailReport.reference }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="primary">mdi-currency-usd</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Monto Reportado</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">${{ formatMoney(detailReport.amount) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="grey">mdi-file-document-outline</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Monto Factura</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">${{ formatMoney(detailReport.invoice?.amount || 0) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <template v-slot:prepend><v-icon size="18" color="primary">mdi-calendar</v-icon></template>
              <v-list-item-title class="text-caption text-medium-emphasis">Fecha de Reporte</v-list-item-title>
              <v-list-item-subtitle class="font-weight-bold">{{ formatDateTime(detailReport.created_at) }}</v-list-item-subtitle>
            </v-list-item>

            <!-- Datos del emisor -->
            <template v-if="detailReport.sender_details && Object.keys(detailReport.sender_details).length">
              <v-divider class="my-3"></v-divider>
              <p class="text-caption text-uppercase font-weight-bold mb-2 text-medium-emphasis">Datos del Emisor</p>
              <v-list-item v-for="(val, key) in detailReport.sender_details" :key="key">
                <template v-slot:prepend><v-icon size="16" color="grey">mdi-account-outline</v-icon></template>
                <v-list-item-title class="text-caption text-medium-emphasis">{{ senderLabel(key) }}</v-list-item-title>
                <v-list-item-subtitle class="font-weight-bold">{{ val }}</v-list-item-subtitle>
              </v-list-item>
            </template>

            <!-- Motivo de rechazo -->
            <template v-if="detailReport.status === 'rejected' && detailReport.rejection_reason">
              <v-divider class="my-3"></v-divider>
              <v-alert variant="tonal" color="error" density="compact" border="start">
                <strong>Motivo de rechazo:</strong> {{ detailReport.rejection_reason }}
              </v-alert>
            </template>
          </v-list>

          <!-- Comprobante -->
          <template v-if="detailReport.proof_url">
            <v-divider class="my-3"></v-divider>
            <p class="text-caption text-uppercase font-weight-bold mb-2 text-medium-emphasis">Comprobante</p>
            <div v-if="!detailReportSignedUrl" class="text-caption text-grey">Cargando comprobante...</div>
            <template v-else>
              <v-img v-if="isImage(detailReport.proof_url)" :src="detailReportSignedUrl" max-height="300"
                class="rounded-lg" contain></v-img>
              <v-btn v-else :href="detailReportSignedUrl" target="_blank" variant="tonal" color="primary" class="text-none">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Ver comprobante
              </v-btn>
            </template>
          </template>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDetailDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ==================== DIALOG: CONFIRMAR ELIMINAR ==================== -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="xl">
        <v-card-title class="text-h6 font-weight-bold pa-4">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          Eliminar Reporte
        </v-card-title>
        <v-card-text class="pa-4">
          ¿Estás seguro de que deseas eliminar este reporte de pago?
          <br><br>
          <strong>Referencia:</strong> {{ deleteTarget?.reference }}<br>
          <strong>Monto:</strong> ${{ formatMoney(deleteTarget?.amount) }}
          <br><br>
          <span class="text-caption text-medium-emphasis">Esta acción no se puede deshacer. El comprobante adjuntado también será eliminado.</span>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false" class="mr-2">Cancelar</v-btn>
          <v-btn variant="flat" color="error" :loading="deletingReport" @click="deleteReport" class="text-none font-weight-bold">
            <v-icon start>mdi-delete</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top right" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </v-container>
</template>

<script>
import billingService from '@/services/billingService';
import paymentOcrService from '@/services/paymentOcrService';
import userService from '@/services/userService';
import bcvService from '@/services/bcvService';

export default {
  name: 'FacturacionSuscripcion',
  data() {
    return {
      loading: true,
      activeTab: 'invoices',
      invoices: [],
      clientReports: [],
      balance: { totalFacturado: 0, totalPagado: 0, totalPendiente: 0, saldoAFavor: 0, proximoVencimiento: null },
      currentUser: null,
      availableMethods: [],
      bcvRate: null,

      // Dialog de pago (crear o editar)
      showPaymentDialog: false,
      isEditingReport: false,
      editingReportId: null,
      editingReportProofUrl: null,
      replaceProof: false,
      removeProofFlag: false,
      selectedInvoice: null,
      submittingPayment: false,
      proofFile: null,
      proofPreviewUrl: null,
      ocrProcessing: false,
      ocrCompleted: false,

      paymentFormData: {
        payment_method_id: null,
        reference: '',
        amount: 0,
        sender_details: {}
      },

      // Dialog de detalle
      showDetailDialog: false,
      detailReport: null,

      // Dialog de eliminar
      showDetailDialog: false,
      detailReport: null,
      detailReportSignedUrl: null,

      // Dialog de eliminar
      showDeleteDialog: false,
      deleteTarget: null,
      deletingReport: false,

      tableHeaders: [
        { title: 'Nº Factura', key: 'invoice_number', sortable: true },
        { title: 'Periodo', key: 'period', sortable: false },
        { title: 'Monto', key: 'amount', sortable: true },
        { title: 'Vencimiento', key: 'due_date', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, align: 'center', width: '200px' }
      ],

      reportHeaders: [
        { title: 'Factura', key: 'invoice', sortable: false },
        { title: 'Método', key: 'method', sortable: false },
        { title: 'Referencia', key: 'reference', sortable: true },
        { title: 'Montos (Rep/Fac)', key: 'amounts', sortable: false },
        { title: 'Fecha', key: 'created_at', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, width: '120px' }
      ],

      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  computed: {
    paymentFormValid() {
      const hasMethod = !!this.paymentFormData.payment_method_id;
      const hasRef = !!this.paymentFormData.reference?.trim();
      const hasAmount = this.paymentFormData.amount > 0;

      // Global check basics
      if (!hasMethod || !hasRef || !hasAmount) return false;

      // Validar comprobante si es obligatorio
      if (this.selectedMethodRequireProof) {
        const hasProof = !!this.proofFile || (this.isEditingReport && this.editingReportProofUrl && !this.removeProofFlag);
        if (!hasProof) return false;
      }

      // Validar campos específicos por tipo de método
      if (this.selectedMethodType === 'mobile_payment') {
        const sd = this.paymentFormData.sender_details;
        return sd.sender_phone && sd.sender_document && sd.sender_bank;
      }
      if (this.selectedMethodType === 'zelle') {
        const sd = this.paymentFormData.sender_details;
        return sd.sender_email && sd.sender_name;
      }
      if (this.selectedMethodType === 'binance') {
        const sd = this.paymentFormData.sender_details;
        return sd.sender_email && sd.sender_binance_id;
      }
      return true;
    },
    selectedMethod() {
      return this.availableMethods.find(m => m.id === this.paymentFormData.payment_method_id);
    },
    selectedMethodType() { return this.selectedMethod?.type || null; },
    selectedMethodDescription() { return this.selectedMethod?.description || null; },
    selectedMethodDetails() { return this.selectedMethod?.details || {}; },
    selectedMethodIgtf() { return this.selectedMethod?.charge_igtf || false; },
    selectedMethodRequireProof() { return this.selectedMethod?.require_proof || false; },
    selectedMethodSupport() {
      const m = this.selectedMethod;
      if (!m?.support_phone) return null;
      return `${m.support_phone_prefix || ''}-${m.support_phone}`;
    },
    igtfAmount() {
      if (!this.selectedMethodIgtf || !this.selectedInvoice) return 0;
      return parseFloat(this.selectedInvoice.amount) * 0.03;
    },
    totalWithIgtf() {
      return parseFloat(this.selectedInvoice?.amount || 0) + this.igtfAmount;
    },
    amountInBs() {
      if (!this.bcvRate?.dollar || !this.totalWithIgtf) return 0;
      return this.totalWithIgtf * this.bcvRate.dollar;
    },
    paymentDiff() {
      // Diferencia entre lo que reporta y lo que debe pagar
      if (!this.totalWithIgtf) return 0;
      return parseFloat(this.paymentFormData.amount || 0) - this.totalWithIgtf;
    },
    paymentStatusMessage() {
      const diff = this.paymentDiff;
      // Tolerancia de 0.01
      if (Math.abs(diff) < 0.01) return { type: 'success', text: 'Monto exacto. ¡Gracias!' };
      if (diff > 0) return { type: 'info', text: `ℹ️ Pago Excedente: Estás pagando $${diff.toFixed(2)} de más. Se abonará a tu saldo a favor una vez aprobado.` };
      return { type: 'warning', text: `⚠️ Pago Parcial: Quedarán pendientes $${Math.abs(diff).toFixed(2)}.` };
    }
  },
  watch: {
    // Sincronizar monto reportado con monto de factura al abrir
    selectedInvoice: {
      handler(val) {
        if (val && !this.isEditingReport) {
           // Calcular IGTF si aplica el método seleccionado (pero selectedMethod puede cambiar después)
           // Mejor lo hacemos reactivo al método
           this.updateDefaultAmount();
        }
      },
      immediate: true
    },
    'paymentFormData.payment_method_id'() {
       if (!this.isEditingReport) this.updateDefaultAmount();
    },
    // Sincronizar input de Zelle/Binance con el monto principal
    'paymentFormData.sender_details.sender_amount'(val) {
      if ((this.selectedMethodType === 'zelle' || this.selectedMethodType === 'binance') && val) {
        this.paymentFormData.amount = val;
      }
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      this.loading = true;
      try {
        this.currentUser = await userService.getCurrentUser();
        if (!this.currentUser?.client_id) { this.loading = false; return; }

        const [invoicesResult, balanceResult, methodsResult, reportsResult] = await Promise.all([
          billingService.getInvoices(this.currentUser.client_id),
          billingService.getBalance(this.currentUser.client_id),
          billingService.getActivePaymentMethods(),
          billingService.getClientReports(this.currentUser.client_id)
        ]);

        if (invoicesResult.success) this.invoices = invoicesResult.data || [];
        if (balanceResult.success) this.balance = balanceResult.data;
        if (methodsResult.success) this.availableMethods = methodsResult.data || [];
        if (reportsResult.success) this.clientReports = reportsResult.data || [];

        // Cargar tasa BCV
        const rateRes = await bcvService.getCurrentRate();
        if (rateRes.success) this.bcvRate = rateRes.data;

      } catch (error) {
        console.error('Error cargando facturación:', error);
        this.showSnackbar('Error cargando datos', 'error');
      } finally {
        this.loading = false;
      }
    },

    // --- Helpers de estado de facturas ---
    statusLabel(s) { return { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida', canceled: 'Anulada' }[s] || s; },
    statusColor(s) { return { pending: 'warning', paid: 'success', overdue: 'error', canceled: 'grey' }[s] || 'grey'; },
    statusIcon(s) { return { pending: 'mdi-clock-outline', paid: 'mdi-check-circle', overdue: 'mdi-alert-circle', canceled: 'mdi-close-circle' }[s] || 'mdi-help-circle'; },
    methodColor(t) { return { mobile_payment: '#4CAF50', bank_transfer: '#1976D2', zelle: '#6D28D9', binance: '#F0B90B' }[t] || 'grey'; },
    methodIcon(t) { return { mobile_payment: 'mdi-cellphone', bank_transfer: 'mdi-bank', zelle: 'mdi-lightning-bolt', binance: 'mdi-bitcoin' }[t] || 'mdi-credit-card'; },

    // Helpers para reportes
    reportStatusLabel(s) { return { pending_review: 'En revisión', approved: 'Aprobado', rejected: 'Rechazado' }[s] || s; },
    reportStatusColor(s) { return { pending_review: 'info', approved: 'success', rejected: 'error' }[s] || 'grey'; },
    reportStatusIcon(s) { return { pending_review: 'mdi-clock-check-outline', approved: 'mdi-check-decagram', rejected: 'mdi-close-circle' }[s] || 'mdi-help-circle'; },

    invoiceReportStatus(invoiceId) {
      const report = this.clientReports.find(r => r.invoice_id === invoiceId);
      return report?.status || null;
    },

    formatMoney(val) { return parseFloat(val || 0).toFixed(2); },
    formatDate(dateStr) {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatDateTime(dateStr) {
      if (!dateStr) return '—';
      return new Date(dateStr).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },


    
    updateDefaultAmount() {
      if (this.selectedInvoice) {
        this.paymentFormData.amount = this.totalWithIgtf;
      }
    },

    detailLabel(key) {
      const labels = { phone: 'Teléfono', document: 'Documento', bank: 'Banco', account_number: 'Nº Cuenta', beneficiary_name: 'Beneficiario', beneficiary_document: 'Documento', email: 'Email', full_name: 'Nombre' };
      return labels[key] || key;
    },
    senderLabel(key) {
      const labels = { sender_phone: 'Teléfono', sender_document: 'Documento', sender_bank: 'Banco', sender_email: 'Correo', sender_name: 'Nombre', sender_binance_id: 'Binance ID', sender_amount: 'Monto enviado' };
      return labels[key] || key;
    },
    isImage(url) {
      return url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    },

    // --- Dialog de pago (CREAR) ---
    openPaymentDialog(invoice) {
      this.selectedInvoice = invoice;
      this.isEditingReport = false;
      this.editingReportId = null;
      this.editingReportProofUrl = null;
      this.replaceProof = false;
      this.removeProofFlag = false;
      this.paymentFormData = { payment_method_id: null, reference: '', amount: this.totalWithIgtf, sender_details: {} };
      this.proofFile = null;
      this.proofPreviewUrl = null;
      this.ocrCompleted = false;
      this.showPaymentDialog = true;
    },

    // --- Dialog de pago (EDITAR) ---
    openEditReport(report) {
      // Buscar la factura asociada para mostrar info
      const invoice = this.invoices.find(i => i.id === report.invoice_id);
      this.selectedInvoice = invoice || { invoice_number: report.invoice?.invoice_number, amount: report.invoice?.amount, currency: report.invoice?.currency || 'USD' };

      this.isEditingReport = true;
      this.editingReportId = report.id;
      // Obtener signed URL para el comprobante existente
      this.editingReportProofUrl = null;
      if (report.proof_url) {
        billingService.getProofSignedUrl(report.proof_url).then(url => {
          this.editingReportProofUrl = url;
        });
      }
      
      this.replaceProof = false;
      this.removeProofFlag = false;

      this.paymentFormData = {
        payment_method_id: report.payment_method_id,
        reference: report.reference,
        amount: report.amount, // Al editar, mantener el monto reportado
        sender_details: { ...(report.sender_details || {}) }
      };
      this.proofFile = null;
      this.proofPreviewUrl = null;
      this.ocrCompleted = false;
      this.showPaymentDialog = true;
    },

    closePaymentDialog() {
      this.showPaymentDialog = false;
      this.selectedInvoice = null;
      this.isEditingReport = false;
      this.editingReportId = null;
      if (this.proofPreviewUrl) { URL.revokeObjectURL(this.proofPreviewUrl); this.proofPreviewUrl = null; }
    },

    onMethodSelected() {
      this.paymentFormData.sender_details = {};
    },

    removeExistingProof() {
      this.editingReportProofUrl = null;
      this.removeProofFlag = true;
    },

    // --- Upload zone: nuevo input oculto ---
    onProofInputChange(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      this.proofFile = file;
      // Crear preview URL para imágenes
      if (this.proofPreviewUrl) URL.revokeObjectURL(this.proofPreviewUrl);
      if (file.type?.startsWith('image/')) {
        this.proofPreviewUrl = URL.createObjectURL(file);
      } else {
        this.proofPreviewUrl = null;
      }
      // Lanzar OCR
      this.processProofOcr(file);
    },

    removeProofFile() {
      this.proofFile = null;
      if (this.proofPreviewUrl) { URL.revokeObjectURL(this.proofPreviewUrl); this.proofPreviewUrl = null; }
      this.ocrCompleted = false;
      // Resetear el input oculto
      if (this.$refs.proofFileInput) this.$refs.proofFileInput.value = '';
    },

    // --- OCR ---
    async processProofOcr(file) {
      if (!file) return;
      this.ocrProcessing = true;
      this.ocrCompleted = false;
      try {
        // Pasar el tipo de método para usar el prompt correcto
        const ocrData = await paymentOcrService.extractPaymentData(file, this.selectedMethodType);
        
        if (ocrData && ocrData.confidence >= 0.3) {
          // Referencia universal
          if (ocrData.reference && !this.paymentFormData.reference) {
            this.paymentFormData.reference = ocrData.reference;
          }

          // Mapeo específico según método
          if (this.selectedMethodType === 'mobile_payment' && ocrData.sender) {
            if (ocrData.sender.phone && !this.paymentFormData.sender_details.sender_phone) {
              this.paymentFormData.sender_details.sender_phone = ocrData.sender.phone;
            }
            if (ocrData.sender.document && !this.paymentFormData.sender_details.sender_document) {
              this.paymentFormData.sender_details.sender_document = ocrData.sender.document;
            }
            if (ocrData.sender.bank && !this.paymentFormData.sender_details.sender_bank) {
              this.paymentFormData.sender_details.sender_bank = ocrData.sender.bank;
            }
          } else if (this.selectedMethodType === 'zelle' && ocrData.sender) {
             if (ocrData.sender.email && !this.paymentFormData.sender_details.sender_email) {
               this.paymentFormData.sender_details.sender_email = ocrData.sender.email;
             }
             if (ocrData.sender.name && !this.paymentFormData.sender_details.sender_name) {
               this.paymentFormData.sender_details.sender_name = ocrData.sender.name;
             }
             // Monto en USD (ya no sender_amount, sino main amount)
             if (ocrData.amount && (ocrData.currency === 'USD' || ocrData.currency === 'USDT')) {
               // Solo actualizar si no ha sido modificado manual (podría chequear dirty flag, pero simple: si es igual al default)
               // Mejor: Update paymentFormData.amount directamente si es un monto válido extraído
               this.paymentFormData.amount = ocrData.amount;
             }
          } else if (this.selectedMethodType === 'binance' && ocrData.sender) {
             if (ocrData.sender.email && !this.paymentFormData.sender_details.sender_email) {
               this.paymentFormData.sender_details.sender_email = ocrData.sender.email;
             }
             if (ocrData.sender.binance_id && !this.paymentFormData.sender_details.sender_binance_id) {
               this.paymentFormData.sender_details.sender_binance_id = ocrData.sender.binance_id;
             }
             // Monto en USDT -> Main amount
             if (ocrData.amount && (ocrData.currency === 'USD' || ocrData.currency === 'USDT')) {
               this.paymentFormData.amount = ocrData.amount;
             }
          }

          this.ocrCompleted = true;
        }
      } catch (error) {
        console.error('Error OCR comprobante:', error);
      } finally {
        this.ocrProcessing = false;
      }
    },

    // --- Enviar o actualizar reporte ---
    async submitPayment() {
      if (!this.paymentFormValid || !this.selectedInvoice) return;

      this.submittingPayment = true;
      try {
        let result;

        if (this.isEditingReport) {
          // Modo edición
          result = await billingService.updatePaymentReport(this.editingReportId, {
            payment_method_id: this.paymentFormData.payment_method_id,
            reference: this.paymentFormData.reference.trim(),
            amount: parseFloat(this.paymentFormData.amount),
            sender_details: this.paymentFormData.sender_details,
            removeProof: this.removeProofFlag
          }, this.proofFile);

          if (result.success) {
            this.showSnackbar('Reporte actualizado exitosamente.', 'success');
          }
        } else {
          // Modo creación
          result = await billingService.submitPaymentReport({
            invoice_id: this.selectedInvoice.id,
            client_id: this.currentUser.client_id,
            payment_method_id: this.paymentFormData.payment_method_id,
            payment_method_type: this.selectedMethodType,
            reference: this.paymentFormData.reference.trim(),
            amount: parseFloat(this.paymentFormData.amount),
            sender_details: this.paymentFormData.sender_details
          }, this.proofFile);

          if (result.success) {
            this.showSnackbar('¡Pago reportado exitosamente! Será validado por el administrador.', 'success');
          }
        }

        if (result.success) {
          this.closePaymentDialog();
          await this.loadData();
        } else {
          this.showSnackbar(result.error?.message || 'Error al procesar el reporte.', 'error');
        }
      } catch (error) {
        console.error('Error reportando pago:', error);
        this.showSnackbar('Error al reportar el pago. Inténtalo de nuevo.', 'error');
      } finally {
        this.submittingPayment = false;
      }
    },

    // --- Detalle de reporte ---
    async openReportDetail(report) {
      this.detailReport = report;
      this.detailReportSignedUrl = null;
      if (report.proof_url) {
        this.detailReportSignedUrl = await billingService.getProofSignedUrl(report.proof_url);
      }
      this.showDetailDialog = true;
    },

    // --- Eliminar reporte ---
    confirmDeleteReport(report) {
      this.deleteTarget = report;
      this.showDeleteDialog = true;
    },

    async deleteReport() {
      if (!this.deleteTarget) return;
      this.deletingReport = true;
      try {
        const result = await billingService.deletePaymentReport(this.deleteTarget.id);
        if (result.success) {
          this.showSnackbar('Reporte eliminado exitosamente.', 'success');
          this.showDeleteDialog = false;
          this.deleteTarget = null;
          await this.loadData();
        } else {
          this.showSnackbar(result.error?.message || 'Error al eliminar el reporte.', 'error');
        }
      } catch (error) {
        console.error('Error eliminando reporte:', error);
        this.showSnackbar('Error al eliminar el reporte.', 'error');
      } finally {
        this.deletingReport = false;
      }
    },

    showSnackbar(text, color) { this.snackbar = { show: true, text, color }; }
  }
};
</script>

<style scoped>
.billing-page { max-width: 1200px; margin: 0 auto; }
.stat-card { transition: transform 0.2s ease; }
.stat-card:hover { transform: translateY(-3px); }
.billing-table :deep(th) { font-weight: 700 !important; color: #1F355C !important; font-size: 0.8rem !important; text-transform: uppercase; }

/* Zona de upload de comprobante */
.proof-upload-zone {
  border-color: #ccc !important;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}
.proof-upload-zone:hover {
  border-color: #A81C22 !important;
  background-color: #fdf2f2;
}
.proof-upload-zone.proof-has-file {
  border-color: #4CAF50 !important;
  border-style: solid !important;
  background-color: #f8fdf8;
}
.proof-upload-zone.proof-loading {
  border-color: #1976D2 !important;
  background-color: #f0f7ff;
}
</style>
