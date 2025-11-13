<template>
  <v-container fluid class="pa-4">
    <!-- Barra de acciones -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Buscar factura..."
          variant="outlined"
          clearable
          hide-details
          @input="applyFilters"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn
          color="warning"
          variant="outlined"
          size="small"
          prepend-icon="mdi-bug"
          @click="debugLocalStorage"
          class="mr-2"
        >
          Debug
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          size="large"
          prepend-icon="mdi-refresh"
          @click="resetData"
          class="mr-2"
        >
          Reset Datos
        </v-btn>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              color="success"
              variant="outlined"
              size="large"
              prepend-icon="mdi-download"
              v-bind="props"
              class="mr-2"
              :disabled="filteredInvoices.length === 0"
            >
              Exportar Tabla
              <v-icon right>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="exportTable('csv', 'all')">
              <v-list-item-title>
                <v-icon left>mdi-file-delimited</v-icon>
                Exportar Todo (CSV)
              </v-list-item-title>
              <v-list-item-subtitle>{{ filteredInvoices.length }} registros</v-list-item-subtitle>
            </v-list-item>
            <v-list-item @click="exportTable('csv', 'filtered')">
              <v-list-item-title>
                <v-icon left>mdi-file-delimited</v-icon>
                Solo Filtrados (CSV)
              </v-list-item-title>
              <v-list-item-subtitle>{{ filteredInvoices.length }} registros</v-list-item-subtitle>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="showExportDialog = true">
              <v-list-item-title>
                <v-icon left>mdi-cog</v-icon>
                Opciones Avanzadas
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus"
          @click="openNewInvoiceDialog"
        >
          Nueva Factura
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="statusFilter"
          :items="invoiceStatuses"
          label="Estado"
          clearable
          variant="outlined"
          hide-details
          @update:model-value="applyFilters"
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="dateFromFilter"
          label="Fecha Inicio"
          type="date"
          variant="outlined"
          hide-details
          @update:model-value="applyFilters"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="dateToFilter"
          label="Fecha Fin"
          type="date"
          variant="outlined"
          hide-details
          @update:model-value="applyFilters"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-btn
          color="secondary"
          variant="outlined"
          @click="clearFilters"
        >
          Limpiar Filtros
        </v-btn>
      </v-col>
    </v-row>

    <!-- Estadísticas rápidas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #02254d;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Total Facturas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="stats.total"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #961112;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Emitidas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="stats.byStatus?.EMITIDA || 0"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #f2b648;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Pagadas</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="stats.byStatus?.PAGADA || 0"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #f0d29b;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="text-body-2" style="color: #010101;">Monto Total</div>
              <v-btn
                :color="currencyDisplay === 'VES' ? 'primary' : 'success'"
                variant="tonal"
                size="x-small"
                @click="toggleCurrency"
                class="currency-toggle-btn"
                :class="{ 'currency-changing': isChangingCurrency }"
              >
                <div class="currency-icon-container">
                  <svg 
                    class="currency-icon"
                    :class="{ 'ves-mode': currencyDisplay === 'VES', 'usd-mode': currencyDisplay === 'USD' }"
                    width="16" 
                    height="16" 
                    viewBox="0 0 48 48"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M44,7.1V14a2,2,0,0,1-2,2H35a2,2,0,0,1-2-2.3A2.1,2.1,0,0,1,35.1,12h2.3A18,18,0,0,0,6.1,22.2a2,2,0,0,1-2,1.8h0a2,2,0,0,1-2-2.2A22,22,0,0,1,40,8.9V7a2,2,0,0,1,2.3-2A2.1,2.1,0,0,1,44,7.1Z"/>
                    <path d="M4,40.9V34a2,2,0,0,1,2-2h7a2,2,0,0,1,2,2.3A2.1,2.1,0,0,1,12.9,36H10.6A18,18,0,0,0,41.9,25.8a2,2,0,0,1,2-1.8h0a2,2,0,0,1,2,2.2A22,22,0,0,1,8,39.1V41a2,2,0,0,1-2.3,2A2.1,2.1,0,0,1,4,40.9Z"/>
                    <path d="M24.7,22c-3.5-.7-3.5-1.3-3.5-1.8s.2-.6.5-.9a3.4,3.4,0,0,1,1.8-.4,6.3,6.3,0,0,1,3.3.9,1.8,1.8,0,0,0,2.7-.5,1.9,1.9,0,0,0-.4-2.8A9.1,9.1,0,0,0,26,15.3V13a2,2,0,0,0-4,0v2.2c-3,.5-5,2.5-5,5.2s3.3,4.9,6.5,5.5,3.3,1.3,3.3,1.8-1.1,1.4-2.5,1.4h0a6.7,6.7,0,0,1-4.1-1.3,2,2,0,0,0-2.8.6,1.8,1.8,0,0,0,.3,2.6A10.9,10.9,0,0,0,22,32.8V35a2,2,0,0,0,4,0V32.8a6.3,6.3,0,0,0,3-1.3,4.9,4.9,0,0,0,2-4h0C31,23.8,27.6,22.6,24.7,22Z"/>
                  </svg>
                </div>
              </v-btn>
            </div>
            <div 
              class="text-h4 amount-display" 
              :class="{ 'amount-changing': isChangingCurrency }"
              style="color: #010101; font-size: 2.6rem !important;"
            >
              <AnimatedNumber
                :value="displayTotalAmount"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                :formatter="v => formatCurrency(v, currencyDisplay)"
              />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabla de facturas -->
    <v-card>
      <v-card-title>
        <v-icon left>mdi-receipt-long</v-icon>
        Lista de Facturas ({{ filteredInvoices.length }})
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="filteredInvoices"
        :loading="loading"
        class="elevation-1"
        :items-per-page="10"
      >
        <!-- Columna de número de factura -->
        <template v-slot:item.invoiceNumber="{ item }">
          <v-chip color="primary" variant="tonal">
            {{ item.invoiceNumber }}
          </v-chip>
        </template>

        <!-- Columna de cliente -->
        <template v-slot:item.client="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.client.companyName }}</div>
            <div class="text-caption text-grey">{{ item.client.rif }}</div>
          </div>
        </template>

        <!-- Columna de fecha -->
        <template v-slot:item.issueDate="{ item }">
          {{ formatDate(item.issueDate) }}
        </template>

        <!-- Columna de total -->
        <template v-slot:item.total="{ item }">
          <div 
            class="total-amount-display"
            :class="{ 'amount-changing': isChangingCurrency }"
          >
            {{ formatCurrency(getDisplayAmount(item.financial.totalSales), currencyDisplay) }}
          </div>
        </template>

        <!-- Columna de estado -->
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="getStatusColor(item.status)"
            variant="tonal"
            size="small"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <!-- Columna de acciones -->
        <template v-slot:item.actions="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            color="info"
            variant="text"
            @click="viewInvoice(item)"
            title="Ver detalles"
          ></v-btn>
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="warning"
            variant="text"
            @click="editInvoice(item)"
            title="Editar"
          ></v-btn>
          <v-btn
            icon="mdi-download"
            size="small"
            color="success"
            variant="text"
            @click="exportInvoice(item)"
            title="Exportar factura"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="text"
            @click="deleteInvoice(item)"
            title="Eliminar"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo para nueva/editar factura -->
    <v-dialog v-model="invoiceDialog" max-width="1200px" scrollable>
      <InvoiceForm
        :invoice="editingInvoice"
        @submit="handleInvoiceSubmit"
        @cancel="closeInvoiceDialog"
      />
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Confirmar Eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro de que desea eliminar la factura <strong>{{ invoiceToDelete?.invoiceNumber }}</strong>?
          Esta acción no se puede deshacer.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="deleteDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="error" @click="confirmDelete">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de vista de factura -->
    <v-dialog v-model="viewDialog" max-width="800px">
      <v-card v-if="viewingInvoice">
        <v-card-title>
          <v-icon left>mdi-receipt-long</v-icon>
          Factura {{ viewingInvoice.invoiceNumber }}
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <h4>Emisor</h4>
              <p><strong>{{ viewingInvoice.issuer.companyName }}</strong></p>
              <p>RIF: {{ viewingInvoice.issuer.rif }}</p>
              <p>{{ viewingInvoice.issuer.address }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <h4>Cliente</h4>
              <p><strong>{{ viewingInvoice.client.companyName }}</strong></p>
              <p>RIF: {{ viewingInvoice.client.rif }}</p>
              <p>{{ viewingInvoice.client.address }}</p>
            </v-col>
          </v-row>
          
          <v-divider class="my-4"></v-divider>
          
          <v-row>
            <v-col cols="12" md="6">
              <p><strong>Fecha:</strong> {{ formatDate(viewingInvoice.issueDate) }}</p>
              <p><strong>Vencimiento:</strong> {{ formatDate(viewingInvoice.dueDate) }}</p>
            </v-col>
            <v-col cols="12" md="6">
              <p><strong>Total:</strong> {{ formatCurrency(viewingInvoice.financial.totalSales) }}</p>
              <p><strong>IVA:</strong> {{ formatCurrency(viewingInvoice.financial.taxDebit) }}</p>
            </v-col>
          </v-row>
          
          <div v-if="viewingInvoice.notes">
            <v-divider class="my-4"></v-divider>
            <h4>Notas</h4>
            <p>{{ viewingInvoice.notes }}</p>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="viewDialog = false">
            Cerrar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de opciones avanzadas de exportación -->
    <v-dialog v-model="showExportDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-download</v-icon>
          Opciones de Exportación
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.format"
                  :items="['CSV', 'Excel (Próximamente)']"
                  label="Formato de archivo"
                  variant="outlined"
                  readonly
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.scope"
                  :items="[
                    { title: 'Todos los registros', value: 'all' },
                    { title: 'Solo registros filtrados', value: 'filtered' }
                  ]"
                  label="Alcance de exportación"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.currency"
                  :items="[
                    { title: 'Bolívares (VES)', value: 'VES' },
                    { title: 'Dólares (USD)', value: 'USD' }
                  ]"
                  label="Moneda para exportación"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="exportOptions.includeItems"
                  label="Incluir items detallados"
                  color="primary"
                ></v-checkbox>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="exportOptions.includeMetadata"
                  label="Incluir metadatos (fechas de creación, etc.)"
                  color="primary"
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
          
          <v-alert
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <strong>Resumen de exportación:</strong><br>
            • Registros a exportar: {{ getExportRecordCount() }}<br>
            • Moneda: {{ exportOptions.currency }}<br>
            • Formato: {{ exportOptions.format }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showExportDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="success" @click="exportWithOptions">
            <v-icon left>mdi-download</v-icon>
            Exportar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import invoiceService from '@/services/invoiceService.js';
import bcvService from '@/services/bcvService.js';
import exportService from '@/services/exportService.js';
import InvoiceForm from '@/components/forms/InvoiceForm.vue';
import userService from '@/services/userService.js';

export default {
  name: 'Facturacion',
  components: {
    InvoiceForm,
    AnimatedNumber
  },
  data() {
    return {
      loading: false,
      invoices: [],
      filteredInvoices: [],
      stats: {
        total: 0,
        byStatus: {},
        totalAmount: 0
      },
      currencyDisplay: 'VES', // Moneda de visualización por defecto
      isChangingCurrency: false, // Estado de cambio de moneda
      
      // Filtros
      searchQuery: '',
      statusFilter: null,
      dateFromFilter: '',
      dateToFilter: '',
      
      // Estados de diálogos
      invoiceDialog: false,
      deleteDialog: false,
      viewDialog: false,
      showExportDialog: false,
      
      // Datos para edición/eliminación
      editingInvoice: null,
      invoiceToDelete: null,
      viewingInvoice: null,
      
      // Opciones de exportación
      exportOptions: {
        format: 'CSV',
        scope: 'filtered',
        currency: 'VES',
        includeItems: true,
        includeMetadata: true
      },
      
      // Configuración de la tabla
      currentUser: null,
      headers: [
        { title: 'Número', key: 'invoiceNumber', sortable: true },
        { title: 'Cliente', key: 'client', sortable: true },
        { title: 'Fecha', key: 'issueDate', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
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
    displayTotalAmount() {
      if (this.currencyDisplay === 'USD') {
        // Convertir VES a USD usando la tasa del BCV
        return this.convertAmountToUSD(this.stats.totalAmount);
      }
      return this.stats.totalAmount;
    }
  },
  async mounted() {
    await this.loadUser();
    await this.loadInvoices();
    await this.loadStats();
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser();
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.role !== 'contador')) {
          console.warn('⚠️ Usuario sin permisos para esta vista');
          this.$router.push('/dashboard');
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error);
        this.$router.push('/login');
      }
    },
    async loadInvoices() {
      console.log('🔄 Cargando facturas de la organización...');
      try {
        this.loading = true;
        console.log('🔄 Cargando facturas...');
        
        const response = await invoiceService.getInvoices();
        console.log('📊 Respuesta del servicio:', response);
        
        this.invoices = response || [];
        console.log('📋 Facturas cargadas:', this.invoices.length);
        
        this.applyFilters();
      } catch (error) {
        console.error('❌ Error al cargar facturas:', error);
        // Mostrar notificación de error
      } finally {
        this.loading = false;
      }
    },
    
    async loadStats() {
      try {
        console.log('📊 Cargando estadísticas...');
        const response = await invoiceService.getInvoiceStats();
        console.log('📈 Respuesta de estadísticas:', response);
        this.stats = response || { total: 0, byStatus: {}, totalAmount: 0 };
        console.log('📊 Estadísticas cargadas:', this.stats);
      } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error);
      }
    },
    
    applyFilters() {
      let filtered = [...this.invoices];
      
      // Filtro por búsqueda
      if (this.searchQuery) {
        const searchLower = this.searchQuery.toLowerCase();
        filtered = filtered.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.client.companyName.toLowerCase().includes(searchLower) ||
          invoice.issuer.companyName.toLowerCase().includes(searchLower)
        );
      }
      
      // Filtro por estado
      if (this.statusFilter) {
        filtered = filtered.filter(invoice => invoice.status === this.statusFilter);
      }
      
      // Filtro por fecha desde
      if (this.dateFromFilter) {
        filtered = filtered.filter(invoice => invoice.issueDate >= this.dateFromFilter);
      }
      
      // Filtro por fecha hasta
      if (this.dateToFilter) {
        filtered = filtered.filter(invoice => invoice.issueDate <= this.dateToFilter);
      }
      
      this.filteredInvoices = filtered;
    },
    
    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = null;
      this.dateFromFilter = '';
      this.dateToFilter = '';
      this.applyFilters();
    },
    
    openNewInvoiceDialog() {
      this.editingInvoice = null;
      this.invoiceDialog = true;
    },
    
    editInvoice(invoice) {
      this.editingInvoice = { ...invoice };
      this.invoiceDialog = true;
    },
    
    viewInvoice(invoice) {
      this.viewingInvoice = { ...invoice };
      this.viewDialog = true;
    },
    
    deleteInvoice(invoice) {
      this.invoiceToDelete = invoice;
      this.deleteDialog = true;
    },
    
    async confirmDelete() {
      if (!this.invoiceToDelete) return;
      
      try {
        const response = await invoiceService.deleteInvoice(this.invoiceToDelete.id);
        
        if (response.success) {
          await this.loadInvoices();
          await this.loadStats();
          this.deleteDialog = false;
          this.invoiceToDelete = null;
          console.log('✅ Factura eliminada exitosamente:', response.message);
          // Mostrar notificación de éxito
        } else {
          console.error('❌ Error al eliminar factura:', response.message);
          // Mostrar notificación de error
        }
      } catch (error) {
        console.error('❌ Error inesperado al eliminar factura:', error);
        // Mostrar notificación de error
      }
    },
    
    async handleInvoiceSubmit(result) {
      console.log('📨 Respuesta recibida en Facturacion.vue:', result);
      
      if (result.success) {
        console.log('✅ Factura guardada exitosamente, recargando datos...');
        await this.loadInvoices();
        await this.loadStats();
        this.closeInvoiceDialog();
        console.log('✅ Datos recargados y diálogo cerrado');
        // Mostrar notificación de éxito
      } else {
        console.error('❌ Error al guardar factura:', result.message);
        // Mostrar notificación de error
      }
    },
    
    closeInvoiceDialog() {
      this.invoiceDialog = false;
      this.editingInvoice = null;
    },
    
    exportInvoice(invoice) {
      try {
        console.log('📤 Exportando factura individual:', invoice.invoiceNumber);
        const result = exportService.exportInvoice(invoice, 'csv');
        
        if (result.success) {
          console.log('✅ Factura exportada exitosamente:', result.filename);
          // Aquí podrías mostrar una notificación de éxito
        } else {
          console.error('❌ Error al exportar factura:', result.message);
          // Aquí podrías mostrar una notificación de error
        }
      } catch (error) {
        console.error('❌ Error al exportar factura:', error);
      }
    },
    
    exportTable(format = 'csv', scope = 'filtered') {
      try {
        console.log('📤 Exportando tabla...', { format, scope });
        
        // Determinar qué datos exportar
        const dataToExport = scope === 'all' ? this.invoices : this.filteredInvoices;
        const currency = this.currencyDisplay;
        
        const result = exportService.exportTable(dataToExport, currency, format.toLowerCase());
        
        if (result.success) {
          console.log('✅ Tabla exportada exitosamente:', result.filename);
          console.log('📊 Registros exportados:', result.recordCount);
          
          // Generar resumen de exportación
          const summary = exportService.generateExportSummary(dataToExport, currency);
          console.log('📈 Resumen de exportación:', summary);
          
          // Aquí podrías mostrar una notificación de éxito con el resumen
        } else {
          console.error('❌ Error al exportar tabla:', result.message);
          // Aquí podrías mostrar una notificación de error
        }
      } catch (error) {
        console.error('❌ Error al exportar tabla:', error);
      }
    },
    
    exportWithOptions() {
      try {
        console.log('📤 Exportando con opciones avanzadas...', this.exportOptions);
        
        // Determinar qué datos exportar
        const dataToExport = this.exportOptions.scope === 'all' ? this.invoices : this.filteredInvoices;
        const currency = this.exportOptions.currency;
        
        const result = exportService.exportTable(dataToExport, currency, this.exportOptions.format.toLowerCase());
        
        if (result.success) {
          console.log('✅ Exportación avanzada exitosa:', result.filename);
          console.log('📊 Registros exportados:', result.recordCount);
          
          // Generar resumen de exportación
          const summary = exportService.generateExportSummary(dataToExport, currency);
          console.log('📈 Resumen de exportación:', summary);
          
          // Cerrar diálogo
          this.showExportDialog = false;
          
          // Aquí podrías mostrar una notificación de éxito con el resumen
        } else {
          console.error('❌ Error al exportar con opciones:', result.message);
          // Aquí podrías mostrar una notificación de error
        }
      } catch (error) {
        console.error('❌ Error al exportar con opciones:', error);
      }
    },
    
    getExportRecordCount() {
      return this.exportOptions.scope === 'all' ? this.invoices.length : this.filteredInvoices.length;
    },
    
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-ES');
    },
    
    formatCurrency(amount, currency = 'VES') {
      if (!amount) return '0,00';
      
      if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(amount);
      }
      
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
      }).format(amount);
    },
    
    getStatusColor(status) {
      const colors = {
        'BORRADOR': 'grey',
        'EMITIDA': 'info',
        'ENVIADA': 'warning',
        'PAGADA': 'success',
        'VENCIDA': 'error',
        'ANULADA': 'error'
      };
      return colors[status] || 'grey';
    },
    
    async resetData() {
      try {
        console.log('🔄 Reseteando datos...');
        
        // Verificar estado actual del localStorage
        const currentInvoices = localStorage.getItem('sistema_contabilidad_invoices');
        const currentClients = localStorage.getItem('sistema_contabilidad_clients');
        
        console.log('📋 Facturas actuales en localStorage:', currentInvoices ? JSON.parse(currentInvoices).length : 0);
        console.log('👥 Clientes actuales en localStorage:', currentClients ? JSON.parse(currentClients).length : 0);
        
        // Limpiar localStorage
        localStorage.removeItem('sistema_contabilidad_invoices');
        localStorage.removeItem('sistema_contabilidad_clients');
        
        console.log('✅ localStorage limpiado');
        
        // Recargar la página para reinicializar los servicios
        location.reload();
      } catch (error) {
        console.error('❌ Error al resetear datos:', error);
      }
    },
    
    debugLocalStorage() {
      console.log('🔍 DEBUG - Estado del localStorage:');
      console.log('📋 Facturas:', localStorage.getItem('sistema_contabilidad_invoices'));
      console.log('👥 Clientes:', localStorage.getItem('sistema_contabilidad_clients'));
      console.log('📊 Estado actual de la vista:');
      console.log('- Invoices:', this.invoices);
      console.log('- Filtered Invoices:', this.filteredInvoices);
      console.log('- Stats:', this.stats);
    },
    
    async toggleCurrency() {
      try {
        console.log('🔄 Cambiando moneda de visualización...');
        
        // Activar animación de cambio
        this.isChangingCurrency = true;
        
        // Pequeña pausa para mostrar la animación
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (this.currencyDisplay === 'VES') {
          // Cambiar a USD - necesitamos obtener la tasa del BCV
          const bcvResponse = await bcvService.getCurrentRate();
          if (bcvResponse.success && bcvResponse.data.dollar) {
            this.currencyDisplay = 'USD';
            console.log('✅ Cambiado a USD con tasa:', bcvResponse.data.dollar);
          } else {
            console.warn('⚠️ No se pudo obtener la tasa del BCV, manteniendo VES');
          }
        } else {
          // Cambiar a VES
          this.currencyDisplay = 'VES';
          console.log('✅ Cambiado a VES');
        }
        
        // Desactivar animación después de un breve momento
        setTimeout(() => {
          this.isChangingCurrency = false;
        }, 200);
        
      } catch (error) {
        console.error('❌ Error al cambiar moneda:', error);
        // En caso de error, mantener VES
        this.currencyDisplay = 'VES';
        this.isChangingCurrency = false;
      }
    },
    
    convertAmountToUSD(amountVES) {
      try {
        // Obtener la tasa del BCV desde el cache (más eficiente)
        const cachedRate = bcvService.getCachedRate();
        if (cachedRate && cachedRate.dollar) {
          return amountVES / cachedRate.dollar;
        }
        
        // Si no hay tasa en cache, usar tasa por defecto
        const defaultRate = bcvService.getConfiguredDefaultRate();
        return amountVES / defaultRate;
      } catch (error) {
        console.error('Error al convertir a USD:', error);
        return amountVES;
      }
    },
    
    getDisplayAmount(amountVES) {
      if (this.currencyDisplay === 'USD') {
        return this.convertAmountToUSD(amountVES);
      }
      return amountVES;
    },
    
    async convertToUSD(amountVES) {
      try {
        const bcvResponse = await bcvService.getCurrentRate();
        if (bcvResponse.success && bcvResponse.data.dollar) {
          const rate = bcvResponse.data.dollar;
          return amountVES / rate;
        }
        return amountVES; // Si no hay tasa, devolver el monto original
      } catch (error) {
        console.error('Error al convertir a USD:', error);
        return amountVES;
      }
    }
  }
};
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-btn {
  margin: 0 2px;
}

/* Estilos específicos para las tarjetas de estadísticas */
.stats-card {
  border-radius: 20px !important;
  box-shadow: none !important;
  padding: 20px !important;
}

.stats-card .d-flex {
  text-align: left;
  align-items: flex-start;
}

.stats-card .text-body-2 {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.25;
}

.stats-card .text-h4 {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1.2;
}

/* Estilos para el botón de cambio de moneda */
.currency-toggle-btn {
  min-width: 50px !important;
  height: 28px !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  border-radius: 14px !important;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
  position: relative;
  overflow: hidden;
}

.currency-toggle-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.currency-toggle-btn:active {
  transform: scale(0.95);
}

/* Contenedor del icono */
.currency-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  position: relative;
  transform: translateY(-2px); /* Mover el icono hacia arriba */
}

/* Icono SVG personalizado */
.currency-icon {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  fill: currentColor;
  transform-origin: center;
}

/* Modo VES - icono normal */
.currency-icon.ves-mode {
  transform: scale(1) rotate(0deg);
}

.currency-icon.ves-mode:hover {
  transform: rotate(180deg) scale(1.05);
}

/* Modo USD - icono rotado */
.currency-icon.usd-mode {
  transform: scale(1) rotate(180deg);
}

.currency-icon.usd-mode:hover {
  transform: rotate(360deg) scale(1.05);
}

/* Animación durante el cambio de moneda */
.currency-changing {
  animation: currencyPulse 0.4s ease-in-out;
}

.currency-changing .currency-icon {
  animation: currencySpin 0.4s ease-in-out;
}

/* Animación para los números */
.amount-display {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.amount-changing {
  animation: amountChange 0.5s ease-in-out;
}

/* Keyframes para las animaciones */
@keyframes currencyPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.2);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.1);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
}

@keyframes currencySpin {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg) scale(0.95);
    opacity: 0.8;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}

@keyframes amountChange {
  0% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
  50% {
    transform: scale(1.02) translateY(-2px);
    opacity: 0.9;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Efecto de brillo al hacer hover */
.currency-toggle-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.4s ease;
}

.currency-toggle-btn:hover::before {
  left: 100%;
}

/* Estilos para los totales en la tabla */
.total-amount-display {
  transition: all 0.3s ease;
  transform-origin: center;
}

.total-amount-display.amount-changing {
  animation: tableAmountChange 0.4s ease-in-out;
}

@keyframes tableAmountChange {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
