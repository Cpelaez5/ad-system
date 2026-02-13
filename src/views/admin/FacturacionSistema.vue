<template>
  <v-container fluid class="billing-admin pa-4 pa-md-6">
    <!-- Encabezado -->
    <div class="d-flex flex-column flex-md-row align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold" style="color: #1F355C;">
          <v-icon class="mr-2" color="#1F355C">mdi-receipt-text-outline</v-icon>
          Facturación del Sistema
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Gestión de facturas de suscripción, pagos y métodos de cobro.
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
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #E0B04F; color: #1F355C;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Pendiente</div>
          <div class="text-h5 font-weight-bold">${{ formatMoney(balance.totalPendiente) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card rounded="xl" class="pa-4 stat-card" style="background: #A81C22; color: white;">
          <div class="text-caption text-uppercase opacity-80 mb-1">Vencido</div>
          <div class="text-h5 font-weight-bold">${{ formatMoney(balance.totalVencido) }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-card rounded="xl">
      <v-tabs v-model="activeTab" color="#A81C22" slider-color="#A81C22" class="px-4 pt-2" density="comfortable">
        <v-tab value="invoices">
          <v-icon start size="18">mdi-file-document-multiple</v-icon>
          Facturas
          <v-badge v-if="invoices.length" :content="invoices.length" color="primary" inline class="ml-1"></v-badge>
        </v-tab>
        <v-tab value="reports">
          <v-icon start size="18">mdi-clipboard-check-outline</v-icon>
          Pagos Reportados
          <v-badge v-if="pendingReportsCount" :content="pendingReportsCount" color="warning" inline class="ml-1"></v-badge>
        </v-tab>
        <v-tab value="payment-methods">
          <v-icon start size="18">mdi-credit-card-settings-outline</v-icon>
          Métodos de Pago
        </v-tab>
      </v-tabs>

      <v-divider></v-divider>

      <v-tabs-window v-model="activeTab">
        <!-- ==================== TAB 1: FACTURAS ==================== -->
        <v-tabs-window-item value="invoices">
          <div class="pa-4">
            <!-- Toolbar -->
            <div class="d-flex flex-wrap gap-3 align-center mb-4">
              <v-text-field
                v-model="invoiceSearch"
                variant="outlined"
                density="compact"
                placeholder="Buscar por número o cliente..."
                prepend-inner-icon="mdi-magnify"
                clearable
                hide-details
                style="max-width: 350px;"
              ></v-text-field>
              <v-spacer></v-spacer>
              <v-btn color="#A81C22" variant="flat" class="text-none font-weight-bold" @click="openInvoiceDialog">
                <v-icon start>mdi-plus</v-icon>
                Emitir Factura
              </v-btn>
            </div>

            <!-- Tabla de facturas -->
            <v-data-table
              v-if="!loadingInvoices"
              :headers="invoiceHeaders"
              :items="filteredInvoices"
              :items-per-page="10"
              density="comfortable"
              class="billing-table"
              no-data-text="No hay facturas emitidas aún."
            >
              <template v-slot:item.invoice_number="{ item }">
                <span class="font-weight-bold">{{ item.invoice_number }}</span>
              </template>
              <template v-slot:item.client="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.client?.company_name || '—' }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.client?.rif || '' }}</div>
                </div>
              </template>
              <template v-slot:item.amount="{ item }">
                <span class="font-weight-bold">${{ formatMoney(item.amount) }}</span>
                <span class="text-caption ml-1">{{ item.currency }}</span>
              </template>
              <template v-slot:item.period="{ item }">
                <span class="text-body-2">{{ formatDate(item.period_start) }} — {{ formatDate(item.period_end) }}</span>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="statusColor(item.status)" size="small" variant="tonal" class="font-weight-bold">
                  <v-icon start size="14">{{ statusIcon(item.status) }}</v-icon>
                  {{ statusLabel(item.status) }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn v-if="item.status === 'pending'" icon="mdi-cancel" size="small" variant="text" color="error"
                  @click="confirmCancelInvoice(item)" title="Anular factura">
                </v-btn>
              </template>
            </v-data-table>
            <div v-else class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            </div>
          </div>
        </v-tabs-window-item>

        <!-- ==================== TAB 2: PAGOS REPORTADOS ==================== -->
        <v-tabs-window-item value="reports">
          <div class="pa-4">
            <!-- Filtro por estado -->
            <v-chip-group v-model="reportFilter" selected-class="text-white bg-primary" mandatory class="mb-4">
              <v-chip value="all" variant="outlined" filter>Todos</v-chip>
              <v-chip value="pending_review" variant="outlined" color="warning" filter>Pendientes</v-chip>
              <v-chip value="approved" variant="outlined" color="success" filter>Aprobados</v-chip>
              <v-chip value="rejected" variant="outlined" color="error" filter>Rechazados</v-chip>
            </v-chip-group>

            <!-- Tabla de reportes -->
            <v-data-table
              v-if="!loadingReports"
              :headers="reportHeaders"
              :items="filteredReports"
              :items-per-page="10"
              density="comfortable"
              class="billing-table"
              no-data-text="No hay reportes de pago."
            >
              <template v-slot:item.invoice="{ item }">
                <span class="font-weight-bold">{{ item.invoice?.invoice_number || '—' }}</span>
              </template>
              <template v-slot:item.client="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.invoice?.client?.company_name || '—' }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.invoice?.client?.rif || '' }}</div>
                </div>
              </template>
              <template v-slot:item.method="{ item }">
                <v-chip size="small" variant="tonal" :color="methodColor(item.payment_method?.type)">
                  {{ item.payment_method?.name || '—' }}
                </v-chip>
              </template>
              <template v-slot:item.reference="{ item }">
                <span class="font-weight-bold text-body-2">{{ item.reference }}</span>
              </template>
              <template v-slot:item.amount="{ item }">
                <div>
                  <div class="font-weight-bold text-success" title="Monto Reportado">${{ formatMoney(item.amount) }}</div>
                  <div class="text-caption text-grey" title="Monto Factura">${{ formatMoney(item.invoice?.amount || 0) }}</div>
                </div>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="reportStatusColor(item.status)" size="small" variant="tonal" class="font-weight-bold">
                  {{ reportStatusLabel(item.status) }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex gap-1">
                  <v-btn icon="mdi-eye" size="small" variant="text" color="info" @click="viewReportDetails(item)"
                    title="Ver detalles"></v-btn>
                  <v-btn v-if="item.status === 'pending_review'" icon="mdi-check-circle" size="small" variant="text"
                    color="success" @click="confirmApprovePayment(item)" title="Aprobar pago"></v-btn>
                  <v-btn v-if="item.status === 'pending_review'" icon="mdi-close-circle" size="small" variant="text"
                    color="error" @click="confirmRejectPayment(item)" title="Rechazar pago"></v-btn>
                </div>
              </template>
            </v-data-table>
            <div v-else class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            </div>
          </div>
        </v-tabs-window-item>

        <!-- ==================== TAB 3: MÉTODOS DE PAGO ==================== -->
        <v-tabs-window-item value="payment-methods">
          <div class="pa-4">
            <div class="d-flex align-center mb-4">
              <span class="text-body-1 text-medium-emphasis">Configura los métodos de cobro disponibles para tus clientes.</span>
              <v-spacer></v-spacer>
              <v-btn color="#A81C22" variant="flat" class="text-none font-weight-bold" @click="openMethodDialog()">
                <v-icon start>mdi-plus</v-icon>
                Agregar Método
              </v-btn>
            </div>

            <div v-if="loadingMethods" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
            </div>

            <!-- Lista de métodos de pago como cards -->
            <v-row v-else>
              <v-col v-if="paymentMethods.length === 0" cols="12">
                <div class="text-center py-12">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-credit-card-off-outline</v-icon>
                  <h3 class="text-h6 text-grey-darken-1 mb-2">Sin métodos de pago</h3>
                  <p class="text-body-2 text-medium-emphasis">Agrega un método de pago para que tus clientes puedan pagar.</p>
                </div>
              </v-col>
              <v-col v-for="pm in paymentMethods" :key="pm.id" cols="12" md="6">
                <v-card rounded="xl" :class="{ 'border-opacity-25': !pm.is_enabled }" :style="pm.is_enabled ? '' : 'opacity: 0.6;'" variant="outlined" class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <v-icon :color="methodColor(pm.type)" size="28" class="mr-3">{{ methodIcon(pm.type) }}</v-icon>
                    <div class="flex-grow-1">
                      <div class="font-weight-bold text-body-1">{{ pm.name }}</div>
                      <div class="text-caption text-medium-emphasis">{{ methodTypeLabel(pm.type) }}</div>
                    </div>
                    <v-switch v-model="pm.is_enabled" color="success" hide-details density="compact"
                      @change="toggleMethod(pm)" class="flex-grow-0"></v-switch>
                  </div>

                  <div v-if="pm.description" class="text-body-2 text-medium-emphasis mb-3">{{ pm.description }}</div>

                  <div class="d-flex flex-wrap gap-2 mb-3">
                    <v-chip v-if="pm.require_proof" size="small" color="primary" variant="tonal">
                      <v-icon start size="14">mdi-camera-document</v-icon>
                      Comprobante obligatorio
                    </v-chip>
                    <v-chip v-if="pm.charge_igtf" size="small" color="warning" variant="tonal">
                      <v-icon start size="14">mdi-percent-outline</v-icon>
                      IGTF 3%
                    </v-chip>
                    <v-chip v-if="pm.support_phone" size="small" color="info" variant="tonal">
                      <v-icon start size="14">mdi-phone</v-icon>
                      {{ pm.support_phone_prefix }}-{{ pm.support_phone }}
                    </v-chip>
                  </div>

                  <v-divider class="mb-2"></v-divider>

                  <div class="d-flex justify-end gap-1">
                    <v-btn icon="mdi-pencil" size="small" variant="text" color="primary"
                      @click="openMethodDialog(pm)" title="Editar"></v-btn>
                    <v-btn icon="mdi-delete" size="small" variant="text" color="error"
                      @click="confirmDeleteMethod(pm)" title="Eliminar"></v-btn>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- ==================== DIALOGS ==================== -->

    <!-- Dialog: Emitir Factura -->
    <v-dialog v-model="showInvoiceDialog" max-width="600" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-4 d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-file-document-plus</v-icon>
          <span class="font-weight-bold">Emitir Factura</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showInvoiceDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-form ref="invoiceForm" @submit.prevent="createInvoice">
            <v-autocomplete
              v-model="invoiceFormData.client_id"
              :items="clientsForBilling"
              item-title="label"
              item-value="id"
              label="Cliente"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-search"
              placeholder="Buscar cliente..."
              :rules="[v => !!v || 'Selecciona un cliente']"
              class="mb-3"
            ></v-autocomplete>
            <v-text-field
              v-model="invoiceFormData.invoice_number"
              label="Nº de Factura"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-pound"
              readonly
              class="mb-3"
            ></v-text-field>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model.number="invoiceFormData.amount" label="Monto" variant="outlined"
                  density="comfortable" type="number" prepend-inner-icon="mdi-currency-usd"
                  :rules="[v => v > 0 || 'El monto debe ser mayor a 0']" class="mb-3"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select v-model="invoiceFormData.currency" :items="['USD', 'VES']" label="Moneda"
                  variant="outlined" density="comfortable" class="mb-3"></v-select>
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field v-model="invoiceFormData.period_start" label="Inicio del periodo" variant="outlined"
                  density="comfortable" type="date" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field v-model="invoiceFormData.period_end" label="Fin del periodo" variant="outlined"
                  density="comfortable" type="date" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              </v-col>
            </v-row>
            <v-text-field v-model="invoiceFormData.due_date" label="Fecha de vencimiento" variant="outlined"
              density="comfortable" type="date" prepend-inner-icon="mdi-calendar-clock"
              :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
            <v-textarea v-model="invoiceFormData.notes" label="Notas (opcional)" variant="outlined"
              density="comfortable" rows="2" class="mb-3"></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showInvoiceDialog = false">Cancelar</v-btn>
          <v-btn color="#A81C22" variant="flat" class="text-none font-weight-bold" :loading="creatingInvoice"
            @click="createInvoice">
            <v-icon start>mdi-check</v-icon>
            Emitir Factura
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Método de Pago -->
    <v-dialog v-model="showMethodDialog" max-width="650" persistent>
      <v-card rounded="xl">
        <v-card-title class="pa-4 d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-credit-card-settings</v-icon>
          <span class="font-weight-bold">{{ editingMethod ? 'Editar' : 'Agregar' }} Método de Pago</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showMethodDialog = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-form ref="methodForm">
            <!-- Tipo de método -->
            <v-select
              v-model="methodFormData.type"
              :items="methodTypes"
              item-title="label"
              item-value="value"
              label="Tipo de método"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-credit-card-outline"
              :rules="[v => !!v || 'Selecciona un tipo']"
              class="mb-3"
              :disabled="!!editingMethod"
            ></v-select>
            <!-- Nombre visible -->
            <v-text-field v-model="methodFormData.name" label="Nombre (visible para el cliente)" variant="outlined"
              density="comfortable" prepend-inner-icon="mdi-tag" placeholder="Ej: Pago Móvil Venezuela"
              :rules="[v => !!v || 'El nombre es requerido']" class="mb-3"></v-text-field>
            <!-- Descripción -->
            <v-textarea v-model="methodFormData.description" label="Descripción / Instrucciones (opcional)"
              variant="outlined" density="comfortable" rows="2"
              placeholder="Instrucciones que verá el cliente a la hora de pagar" class="mb-3"></v-textarea>

            <v-divider class="mb-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-3" style="color: #1F355C;">Datos del Método</p>

            <!-- Campos dinámicos según tipo -->
            <!-- Pago Móvil -->
            <template v-if="methodFormData.type === 'mobile_payment'">
              <v-text-field v-model="methodFormData.details.phone" label="Teléfono del receptor" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-phone" placeholder="0412-1234567"
                :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.document" label="Documento del receptor (Cédula o RIF)"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-card-account-details"
                placeholder="V-12345678" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.bank" label="Banco del receptor" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-bank" placeholder="Ej: Banesco"
                :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
            </template>

            <!-- Transferencia Bancaria -->
            <template v-if="methodFormData.type === 'bank_transfer'">
              <v-text-field v-model="methodFormData.details.bank" label="Banco" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-bank" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.account_number" label="Número de cuenta" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-numeric" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.beneficiary_name" label="Nombre del beneficiario"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-account"
                :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.beneficiary_document" label="Documento del beneficiario"
                variant="outlined" density="comfortable" prepend-inner-icon="mdi-card-account-details"
                :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.email" label="Email" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-email" type="email" class="mb-3"></v-text-field>
            </template>

            <!-- Zelle -->
            <template v-if="methodFormData.type === 'zelle'">
              <v-text-field v-model="methodFormData.details.email" label="Email de Zelle" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-email" type="email"
                :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.full_name" label="Nombre completo" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-account" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
            </template>

            <!-- Binance -->
            <template v-if="methodFormData.type === 'binance'">
              <v-text-field v-model="methodFormData.details.email" label="Email / ID de Binance" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-email" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
              <v-text-field v-model="methodFormData.details.full_name" label="Nombre completo" variant="outlined"
                density="comfortable" prepend-inner-icon="mdi-account" :rules="[v => !!v || 'Requerido']" class="mb-3"></v-text-field>
            </template>

            <v-divider class="mb-4"></v-divider>

            <!-- Soporte -->
            <p class="text-subtitle-2 font-weight-bold mb-3" style="color: #1F355C;">Soporte (contacto de asistencia)</p>
            <v-row>
              <v-col cols="12" sm="4">
                <v-select v-model="methodFormData.support_phone_prefix"
                  :items="['0412', '0414', '0416', '0422', '0424', '0426']"
                  label="Prefijo" variant="outlined" density="comfortable" class="mb-3"></v-select>
              </v-col>
              <v-col cols="12" sm="8">
                <v-text-field v-model="methodFormData.support_phone" label="Teléfono de asistencia" variant="outlined"
                  density="comfortable" prepend-inner-icon="mdi-headset" placeholder="1234567" class="mb-3"></v-text-field>
              </v-col>
            </v-row>

            <v-divider class="mb-4"></v-divider>

            <!-- Opciones -->
            <div class="d-flex flex-column gap-2">
              <v-checkbox v-model="methodFormData.is_enabled" label="Método habilitado" color="success"
                hide-details density="compact">
                <template v-slot:label>
                  <span class="text-body-2">Método habilitado <span class="text-medium-emphasis">(visible para los clientes)</span></span>
                </template>
              </v-checkbox>
              <v-checkbox v-model="methodFormData.charge_igtf" color="warning" hide-details density="compact">
                <template v-slot:label>
                  <div>
                    <span class="text-body-2">Cobrar impuesto IGTF</span>
                    <div class="text-caption text-medium-emphasis">Se cobrará al cliente un 3.00% adicional sobre el total del pedido.</div>
                  </div>
                </template>
              </v-checkbox>
              <v-checkbox v-model="methodFormData.require_proof" color="primary" hide-details density="compact">
                <template v-slot:label>
                  <div>
                    <span class="text-body-2">Comprobante de pago obligatorio</span>
                    <div class="text-caption text-medium-emphasis">El cliente deberá adjuntar captura o PDF del comprobante al reportar su pago.</div>
                  </div>
                </template>
              </v-checkbox>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showMethodDialog = false">Cancelar</v-btn>
          <v-btn color="#A81C22" variant="flat" class="text-none font-weight-bold" :loading="savingMethod"
            @click="saveMethod">
            <v-icon start>mdi-check</v-icon>
            {{ editingMethod ? 'Guardar Cambios' : 'Agregar Método' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Ver Detalles del Reporte de Pago -->
    <v-dialog v-model="showReportDetail" max-width="600">
      <v-card v-if="selectedReport" rounded="xl">
        <v-card-title class="pa-4 d-flex align-center">
          <v-icon color="info" class="mr-2">mdi-file-eye</v-icon>
          <span class="font-weight-bold">Detalles del Pago Reportado</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" size="small" @click="showReportDetail = false"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <v-row dense>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Factura</div><div class="font-weight-bold">{{ selectedReport.invoice?.invoice_number }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Cliente</div><div class="font-weight-bold">{{ selectedReport.invoice?.client?.company_name }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Monto Reportado</div><div class="font-weight-bold text-success">${{ formatMoney(selectedReport.amount) }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Monto Factura</div><div class="font-weight-bold">${{ formatMoney(selectedReport.invoice?.amount || 0) }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Método</div><div class="font-weight-bold">{{ selectedReport.payment_method?.name }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Referencia</div><div class="font-weight-bold">{{ selectedReport.reference }}</div></v-col>
            <v-col cols="6"><div class="text-caption text-medium-emphasis">Fecha</div><div class="font-weight-bold">{{ formatDateTime(selectedReport.created_at) }}</div></v-col>
          </v-row>

          <!-- Datos del emisor -->
          <template v-if="selectedReport.sender_details && Object.keys(selectedReport.sender_details).length">
            <v-divider class="my-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-2" style="color: #1F355C;">Datos del Emisor</p>
            <v-row dense>
              <v-col v-if="selectedReport.sender_details.sender_phone" cols="6"><div class="text-caption text-medium-emphasis">Teléfono</div><div>{{ selectedReport.sender_details.sender_phone }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_document" cols="6"><div class="text-caption text-medium-emphasis">Documento</div><div>{{ selectedReport.sender_details.sender_document }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_bank" cols="6"><div class="text-caption text-medium-emphasis">Banco</div><div>{{ selectedReport.sender_details.sender_bank }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_email" cols="6"><div class="text-caption text-medium-emphasis">Correo</div><div>{{ selectedReport.sender_details.sender_email }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_name" cols="6"><div class="text-caption text-medium-emphasis">Nombre</div><div>{{ selectedReport.sender_details.sender_name }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_binance_id" cols="6"><div class="text-caption text-medium-emphasis">Binance ID</div><div>{{ selectedReport.sender_details.sender_binance_id }}</div></v-col>
              <v-col v-if="selectedReport.sender_details.sender_amount" cols="6"><div class="text-caption text-medium-emphasis">Monto enviado</div><div>${{ formatMoney(selectedReport.sender_details.sender_amount) }}</div></v-col>
            </v-row>
          </template>

          <!-- Comprobante -->
          <template v-if="selectedReport.proof_url">
            <v-divider class="my-4"></v-divider>
            <p class="text-subtitle-2 font-weight-bold mb-2" style="color: #1F355C;">Comprobante</p>
            <div v-if="!selectedReportSignedUrl" class="text-caption text-grey">Cargando comprobante...</div>
            <template v-else>
              <v-img v-if="isImage(selectedReport.proof_url)" :src="selectedReportSignedUrl" max-height="300"
                class="rounded-lg border" cover></v-img>
              <v-btn v-else :href="selectedReportSignedUrl" target="_blank" variant="outlined" color="primary"
                class="text-none">
                <v-icon start>mdi-file-pdf-box</v-icon>
                Ver comprobante (PDF)
              </v-btn>
            </template>
          </template>
        </v-card-text>
        <v-card-actions v-if="selectedReport.status === 'pending_review'" class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="outlined" color="error" class="text-none" @click="confirmRejectPayment(selectedReport)">
            <v-icon start>mdi-close-circle</v-icon>
            Rechazar
          </v-btn>
          <v-btn color="success" variant="flat" class="text-none font-weight-bold" @click="confirmApprovePayment(selectedReport)">
            <v-icon start>mdi-check-circle</v-icon>
            Aprobar Pago
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Aprobación -->
    <v-dialog v-model="showApproveConfirm" max-width="400">
      <v-card rounded="xl" class="pa-4">
        <div class="text-center mb-4">
          <v-icon size="48" color="success">mdi-check-circle</v-icon>
        </div>
        <h3 class="text-h6 text-center font-weight-bold mb-2">¿Aprobar este pago?</h3>
        <p class="text-body-2 text-center text-medium-emphasis mb-4">
          La factura será marcada como <strong>pagada</strong> y el cliente será notificado.
        </p>
        <div class="d-flex justify-center gap-3">
          <v-btn variant="text" @click="showApproveConfirm = false">Cancelar</v-btn>
          <v-btn color="success" variant="flat" class="text-none font-weight-bold" :loading="processingAction"
            @click="approvePayment">
            <v-icon start>mdi-check</v-icon>
            Confirmar Aprobación
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog: Confirmar Rechazo -->
    <v-dialog v-model="showRejectConfirm" max-width="450">
      <v-card rounded="xl">
        <v-card-title class="pa-4 font-weight-bold">
          <v-icon color="error" class="mr-2">mdi-close-circle</v-icon>
          Rechazar Pago
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-5">
          <p class="text-body-2 mb-3">Indica el motivo del rechazo. El cliente podrá verlo.</p>
          <v-textarea v-model="rejectionReason" label="Motivo del rechazo" variant="outlined"
            density="comfortable" rows="3" :rules="[v => !!v || 'Indica el motivo']"></v-textarea>
        </v-card-text>
        <v-card-actions class="px-5 pb-5">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showRejectConfirm = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" class="text-none font-weight-bold" :loading="processingAction"
            :disabled="!rejectionReason?.trim()" @click="rejectPayment">
            <v-icon start>mdi-close</v-icon>
            Confirmar Rechazo
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
import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'FacturacionSistema',
  data() {
    return {
      activeTab: 'invoices',
      loadingInvoices: true,
      loadingReports: true,
      loadingMethods: true,

      // Data
      invoices: [],
      paymentReports: [],
      paymentMethods: [],
      clientsForBilling: [],
      balance: { totalFacturado: 0, totalPagado: 0, totalPendiente: 0, totalVencido: 0 },

      // Filtros
      invoiceSearch: '',
      reportFilter: 'all',

      // Tabla headers
      invoiceHeaders: [
        { title: 'Nº Factura', key: 'invoice_number', sortable: true },
        { title: 'Cliente', key: 'client', sortable: false },
        { title: 'Monto', key: 'amount', sortable: true },
        { title: 'Periodo', key: 'period', sortable: false },
        { title: 'Estado', key: 'status', sortable: true },
        { title: '', key: 'actions', sortable: false, width: 60 }
      ],
      reportHeaders: [
        { title: 'Factura', key: 'invoice', sortable: false },
        { title: 'Cliente', key: 'client', sortable: false },
        { title: 'Método', key: 'method', sortable: false },
        { title: 'Referencia', key: 'reference', sortable: true },
        { title: 'Montos (Rep/Fac)', key: 'amount', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false, width: 130 }
      ],

      // Dialog factura
      showInvoiceDialog: false,
      creatingInvoice: false,
      invoiceFormData: this.getEmptyInvoiceForm(),

      // Dialog método de pago
      showMethodDialog: false,
      savingMethod: false,
      editingMethod: null,
      methodFormData: this.getEmptyMethodForm(),
      methodTypes: [
        { label: '📱 Pago Móvil', value: 'mobile_payment' },
        { label: '🏦 Transferencia Bancaria', value: 'bank_transfer' },
        { label: '💵 Zelle', value: 'zelle' },
        { label: '🪙 Binance', value: 'binance' }
      ],

      // Dialog reporte
      // Dialog reporte
      showReportDetail: false,
      selectedReport: null,
      selectedReportSignedUrl: null,

      // Dialog aprobar/rechazar

      // Dialog confirmaciones
      showApproveConfirm: false,
      showRejectConfirm: false,
      actionReport: null,
      rejectionReason: '',
      processingAction: false,

      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  computed: {
    filteredInvoices() {
      if (!this.invoiceSearch) return this.invoices;
      const q = this.invoiceSearch.toLowerCase();
      return this.invoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.client?.company_name?.toLowerCase().includes(q) ||
        inv.client?.rif?.toLowerCase().includes(q)
      );
    },
    filteredReports() {
      if (this.reportFilter === 'all') return this.paymentReports;
      return this.paymentReports.filter(r => r.status === this.reportFilter);
    },
    pendingReportsCount() {
      return this.paymentReports.filter(r => r.status === 'pending_review').length;
    }
  },
  async mounted() {
    await this.loadAllData();
  },
  methods: {
    // -- Datos iniciales vacíos para formularios --
    getEmptyInvoiceForm() {
      return { client_id: null, invoice_number: '', amount: 0, currency: 'USD', period_start: '', period_end: '', due_date: '', notes: '' };
    },
    getEmptyMethodForm() {
      return { type: null, name: '', description: '', is_enabled: true, charge_igtf: false, require_proof: false, details: {}, support_phone_prefix: '', support_phone: '' };
    },

    async loadAllData() {
      await Promise.all([this.loadInvoices(), this.loadReports(), this.loadMethods(), this.loadBalance(), this.loadClients()]);
    },

    async loadInvoices() {
      this.loadingInvoices = true;
      const result = await billingService.getAllInvoices();
      if (result.success) this.invoices = result.data || [];
      this.loadingInvoices = false;
    },

    async loadReports() {
      this.loadingReports = true;
      const result = await billingService.getPaymentReports('all');
      if (result.success) this.paymentReports = result.data || [];
      this.loadingReports = false;
    },

    async loadMethods() {
      this.loadingMethods = true;
      const result = await billingService.getPaymentMethods();
      if (result.success) this.paymentMethods = result.data || [];
      this.loadingMethods = false;
    },

    async loadBalance() {
      const result = await billingService.getBalance(null);
      if (result.success) this.balance = result.data;
    },

    async loadClients() {
      const result = await billingService.getClientsForBilling();
      if (result.success) {
        this.clientsForBilling = (result.data || []).map(c => ({
          id: c.id,
          label: `${c.company_name} (${c.rif})`
        }));
      }
    },

    // ---- FACTURAS ----
    async openInvoiceDialog() {
      this.invoiceFormData = this.getEmptyInvoiceForm();
      const numResult = await billingService.getNextInvoiceNumber();
      if (numResult.success) this.invoiceFormData.invoice_number = numResult.data;
      this.showInvoiceDialog = true;
    },

    async createInvoice() {
      const { valid } = await this.$refs.invoiceForm.validate();
      if (!valid) return;
      this.creatingInvoice = true;
      try {
        const result = await billingService.createInvoice(this.invoiceFormData);
        if (result.success) {
          this.showSnackbar('Factura emitida correctamente', 'success');
          this.showInvoiceDialog = false;
          await Promise.all([this.loadInvoices(), this.loadBalance()]);
        } else throw result.error;
      } catch (e) {
        this.showSnackbar('Error al emitir factura', 'error');
      } finally {
        this.creatingInvoice = false;
      }
    },

    async confirmCancelInvoice(invoice) {
      if (!confirm(`¿Anular la factura ${invoice.invoice_number}?`)) return;
      const result = await billingService.updateInvoiceStatus(invoice.id, 'canceled');
      if (result.success) {
        this.showSnackbar('Factura anulada', 'success');
        await Promise.all([this.loadInvoices(), this.loadBalance()]);
      }
    },

    // ---- MÉTODOS DE PAGO ----
    openMethodDialog(method = null) {
      this.editingMethod = method;
      this.methodFormData = method
        ? { ...method, details: { ...(method.details || {}) } }
        : this.getEmptyMethodForm();
      this.showMethodDialog = true;
    },

    async saveMethod() {
      const { valid } = await this.$refs.methodForm.validate();
      if (!valid) return;
      this.savingMethod = true;
      try {
        const result = this.editingMethod
          ? await billingService.updatePaymentMethod(this.editingMethod.id, this.methodFormData)
          : await billingService.createPaymentMethod(this.methodFormData);

        if (result.success) {
          this.showSnackbar(this.editingMethod ? 'Método actualizado' : 'Método creado', 'success');
          this.showMethodDialog = false;
          await this.loadMethods();
        } else throw result.error;
      } catch (e) {
        this.showSnackbar('Error al guardar método de pago', 'error');
      } finally {
        this.savingMethod = false;
      }
    },

    async toggleMethod(method) {
      await billingService.togglePaymentMethod(method.id, method.is_enabled);
    },

    async confirmDeleteMethod(method) {
      if (!confirm(`¿Eliminar el método "${method.name}"?`)) return;
      const result = await billingService.deletePaymentMethod(method.id);
      if (result.success) {
        this.showSnackbar('Método eliminado', 'success');
        await this.loadMethods();
      }
    },

    // ---- REPORTES ----
    async viewReportDetails(report) {
      this.selectedReport = report;
      this.selectedReportSignedUrl = null;
      if (report.proof_url) {
        this.selectedReportSignedUrl = await billingService.getProofSignedUrl(report.proof_url);
      }
      this.showReportDetail = true;
    },

    confirmApprovePayment(report) {
      this.actionReport = report;
      this.showApproveConfirm = true;
      this.showReportDetail = false;
    },

    confirmRejectPayment(report) {
      this.actionReport = report;
      this.rejectionReason = '';
      this.showRejectConfirm = true;
      this.showReportDetail = false;
    },

    async approvePayment() {
      this.processingAction = true;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const result = await billingService.approvePayment(this.actionReport.id, user.id);
        if (result.success) {
          this.showSnackbar('¡Pago aprobado exitosamente!', 'success');
          this.showApproveConfirm = false;
          await Promise.all([this.loadReports(), this.loadInvoices(), this.loadBalance()]);
        } else throw result.error;
      } catch (e) {
        this.showSnackbar('Error al aprobar pago', 'error');
      } finally {
        this.processingAction = false;
      }
    },

    async rejectPayment() {
      if (!this.rejectionReason?.trim()) return;
      this.processingAction = true;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const result = await billingService.rejectPayment(this.actionReport.id, user.id, this.rejectionReason.trim());
        if (result.success) {
          this.showSnackbar('Pago rechazado', 'warning');
          this.showRejectConfirm = false;
          await this.loadReports();
        } else throw result.error;
      } catch (e) {
        this.showSnackbar('Error al rechazar pago', 'error');
      } finally {
        this.processingAction = false;
      }
    },

    // ---- HELPERS ----
    formatMoney(val) { return parseFloat(val || 0).toFixed(2); },
    formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    },
    formatDateTime(d) {
      if (!d) return '—';
      return new Date(d).toLocaleString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    statusLabel(s) { return { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida', canceled: 'Anulada' }[s] || s; },
    statusColor(s) { return { pending: 'warning', paid: 'success', overdue: 'error', canceled: 'grey' }[s] || 'grey'; },
    statusIcon(s) { return { pending: 'mdi-clock-outline', paid: 'mdi-check-circle', overdue: 'mdi-alert-circle', canceled: 'mdi-close-circle' }[s] || 'mdi-help-circle'; },
    reportStatusLabel(s) { return { pending_review: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[s] || s; },
    reportStatusColor(s) { return { pending_review: 'warning', approved: 'success', rejected: 'error' }[s] || 'grey'; },
    methodColor(t) { return { mobile_payment: '#4CAF50', bank_transfer: '#1976D2', zelle: '#6D28D9', binance: '#F0B90B' }[t] || 'grey'; },
    methodIcon(t) { return { mobile_payment: 'mdi-cellphone', bank_transfer: 'mdi-bank', zelle: 'mdi-lightning-bolt', binance: 'mdi-bitcoin' }[t] || 'mdi-credit-card'; },
    methodTypeLabel(t) { return { mobile_payment: 'Pago Móvil', bank_transfer: 'Transferencia Bancaria', zelle: 'Zelle', binance: 'Binance' }[t] || t; },
    isImage(url) { return url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url); },
    showSnackbar(text, color) { this.snackbar = { show: true, text, color }; }
  }
};
</script>

<style scoped>
.billing-admin { max-width: 1400px; margin: 0 auto; }
.stat-card { transition: transform 0.2s ease; }
.stat-card:hover { transform: translateY(-3px); }
.billing-table :deep(th) { font-weight: 700 !important; color: #1F355C !important; font-size: 0.8rem !important; text-transform: uppercase; }
</style>
