<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold mb-2">Facturación</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Gestiona todas tus facturas de ventas, compras y gastos en un solo lugar
        </p>
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center justify-end">
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus"
          @click="openNewInvoiceDialog"
          class="mr-2"
        >
          Nueva Factura
        </v-btn>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              color="success"
              variant="outlined"
              size="large"
              prepend-icon="mdi-download"
              v-bind="props"
              :disabled="filteredInvoices.length === 0"
            >
              Exportar
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item @click="exportTable('csv', 'all')">
              <v-list-item-title>
                <v-icon start>mdi-file-delimited</v-icon>
                Exportar Todo (CSV)
              </v-list-item-title>
              <v-list-item-subtitle>{{ filteredInvoices.length }} registros</v-list-item-subtitle>
            </v-list-item>
            <v-list-item @click="exportTable('csv', 'filtered')">
              <v-list-item-title>
                <v-icon start>mdi-file-delimited</v-icon>
                Solo Filtrados (CSV)
              </v-list-item-title>
              <v-list-item-subtitle>{{ filteredInvoices.length }} registros</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <!-- Estadísticas rápidas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Total Facturas"
          :value="stats.total"
          bg-color="#02254d"
          text-color="white"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Emitidas"
          :value="stats.byStatus?.EMITIDA || 0"
          bg-color="#961112"
          text-color="white"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Pagadas"
          :value="stats.byStatus?.PAGADA || 0"
          bg-color="#f2b648"
          text-color="#010101"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <CurrencyStatsCard
          title="Monto Total"
          :value="displayTotalAmount"
          bg-color="#f0d29b"
          text-color="#010101"
          :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
          @toggle-currency="toggleCurrency"
        />
      </v-col>
    </v-row>

    <!-- Tabs de navegación por tipo de factura -->
    <v-card class="mb-4" elevation="2">
      <v-tabs
        v-model="currentTab"
        bg-color="white"
        color="primary"
        grow
        height="64"
      >
        <v-tab value="all" class="text-none font-weight-medium">
          <v-icon start size="24">mdi-view-list</v-icon>
          Todas
          <v-chip size="small" class="ml-2" color="primary" variant="tonal">
            {{ invoices.length }}
          </v-chip>
        </v-tab>
        
        <v-tab value="ventas" class="text-none font-weight-medium">
          <v-icon start size="24" color="success">mdi-cash-plus</v-icon>
          Ventas
          <v-chip size="small" class="ml-2" color="success" variant="tonal">
            {{ ventasCount }}
          </v-chip>
        </v-tab>
        
        <v-tab value="compras" class="text-none font-weight-medium">
          <v-icon start size="24" color="orange">mdi-cart</v-icon>
          Compras
          <v-chip size="small" class="ml-2" color="orange" variant="tonal">
            {{ comprasCount }}
          </v-chip>
        </v-tab>
        
        <v-tab value="gastos" class="text-none font-weight-medium">
          <v-icon start size="24" color="error">mdi-cash-minus</v-icon>
          Gastos
          <v-chip size="small" class="ml-2" color="error" variant="tonal">
            {{ gastosCount }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Filtros colapsables con búsqueda -->
    <v-expansion-panels class="mb-4" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex align-center">
            <v-icon start>mdi-filter-variant</v-icon>
            <span class="font-weight-medium">Filtros</span>
            <v-chip 
              v-if="activeFiltersCount > 0" 
              size="small" 
              color="primary" 
              variant="tonal"
              class="ml-3"
            >
              {{ activeFiltersCount }} activo{{ activeFiltersCount > 1 ? 's' : '' }}
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row class="mt-2">
            <!-- Búsqueda -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                label="Buscar por número o cliente/proveedor"
                variant="outlined"
                clearable
                hide-details
                @input="applyFilters"
              ></v-text-field>
            </v-col>

            <!-- Estado -->
            <v-col cols="12" md="3">
              <v-select
                v-model="statusFilter"
                :items="invoiceStatuses"
                prepend-inner-icon="mdi-tag-outline"
                label="Estado"
                clearable
                variant="outlined"
                hide-details
                @update:model-value="applyFilters"
              ></v-select>
            </v-col>

            <!-- Fecha Inicio -->
            <v-col cols="12" md="2">
              <v-text-field
                v-model="dateFromFilter"
                prepend-inner-icon="mdi-calendar-start"
                label="Fecha Inicio"
                type="date"
                variant="outlined"
                hide-details
                @update:model-value="applyFilters"
              ></v-text-field>
            </v-col>

            <!-- Fecha Fin -->
            <v-col cols="12" md="2">
              <v-text-field
                v-model="dateToFilter"
                prepend-inner-icon="mdi-calendar-end"
                label="Fecha Fin"
                type="date"
                variant="outlined"
                hide-details
                @update:model-value="applyFilters"
              ></v-text-field>
            </v-col>

            <!-- Botón Limpiar -->
            <v-col cols="12" md="1" class="d-flex align-center">
              <v-btn
                color="secondary"
                variant="outlined"
                icon="mdi-filter-off"
                @click="clearFilters"
                title="Limpiar Filtros"
              ></v-btn>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

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

        <!-- Columna de cliente/proveedor -->
        <template v-slot:item.client="{ item }">
          <div>
            <!-- Si es VENTA, mostrar Cliente. Si es COMPRA, mostrar Emisor (Proveedor) -->
            <div class="font-weight-medium">
              {{ item.flow === 'VENTA' ? item.client.companyName : item.issuer.companyName }}
            </div>
            <div class="text-caption text-grey">
              {{ item.flow === 'VENTA' ? item.client.rif : item.issuer.rif }}
            </div>
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
      <ClientInvoiceForm
        :invoice="editingInvoice"
        :flow="defaultFlow"
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
import StatsCard from '@/components/common/StatsCard.vue'
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import invoiceService from '@/services/invoiceService.js';
import bcvService from '@/services/bcvService.js';
import exportService from '@/services/exportService.js';
import ClientInvoiceForm from '@/components/forms/client/ClientInvoiceForm.vue';
import userService from '@/services/userService.js';

export default {
  name: 'FacturacionCliente',
  components: {
    ClientInvoiceForm,
    AnimatedNumber,
    StatsCard,
    CurrencyStatsCard
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
      currencyDisplay: 'VES',
      isChangingCurrency: false,
      
      // Tab actual
      currentTab: 'all', // 'all', 'ventas', 'compras', 'gastos'
      
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
        { title: 'Cliente/Proveedor', key: 'client', sortable: true },
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
        return this.convertAmountToUSD(this.stats.totalAmount);
      }
      return this.stats.totalAmount;
    },
    
    ventasCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => inv.flow === 'VENTA').length;
    },
    
    comprasCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => 
        inv.flow === 'COMPRA' && inv.expense_type === 'COMPRA'
      ).length;
    },
    
    gastosCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => 
        inv.flow === 'COMPRA' && (inv.expense_type === 'GASTO' || !inv.expense_type)
      ).length;
    },
    
    activeFiltersCount() {
      let count = 0;
      if (this.searchQuery) count++;
      if (this.statusFilter) count++;
      if (this.dateFromFilter) count++;
      if (this.dateToFilter) count++;
      return count;
    },

    defaultFlow() {
      if (this.currentTab === 'compras' || this.currentTab === 'gastos') {
        return 'COMPRA';
      }
      return 'VENTA';
    }
  },
  watch: {
    currentTab() {
      this.applyFilters();
      if (this.$route.query.tab !== this.currentTab) {
        this.$router.replace({ 
          query: { ...this.$route.query, tab: this.currentTab } 
        }).catch(() => {});
      }
    }
  },
  async mounted() {
    if (this.$route.query.tab) {
      this.currentTab = this.$route.query.tab;
    }
    
    await this.loadUser();
    await this.loadInvoices();
    // await this.loadStats(); // Stats might need to be recalculated locally if API returns all org stats
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser();
        // Permitir acceso a clientes
        if (!this.currentUser || this.currentUser.role !== 'cliente') {
          // Si es admin/contador, tal vez debería ver la otra vista, pero por ahora permitimos si está probando
          console.warn('⚠️ Usuario no es cliente:', this.currentUser?.role);
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error);
        this.$router.push('/login');
      }
    },
    
    async loadInvoices() {
      if (!this.currentUser) return;
      
      try {
        this.loading = true;
        console.log('🔄 Cargando facturas del cliente...');
        
        // 1. Cargar Ventas (donde yo soy el emisor - aproximación por frontend filter)
        // Nota: getInvoices({ flow: 'VENTA' }) trae todas las ventas de la org.
        // Debemos filtrar por mi RIF o ID si es posible.
        const allSales = await invoiceService.getInvoices({ flow: 'VENTA' });
        const mySales = allSales.filter(inv => {
          // Filtrar donde el emisor soy yo
          // Asumimos que currentUser tiene RIF o nombre de empresa
          if (!this.currentUser.rif) return true; // Si no tengo RIF, mostrar todo (fallback)
          return inv.issuer?.rif === this.currentUser.rif;
        });
        
        // 2. Cargar Compras (donde yo soy el cliente)
        // Aquí sí podemos usar el filtro clientId del servicio
        const myPurchases = await invoiceService.getInvoices({ 
          flow: 'COMPRA', 
          clientId: this.currentUser.client_id || this.currentUser.id 
        });
        
        this.invoices = [...mySales, ...myPurchases];
        console.log('📋 Facturas cargadas:', this.invoices.length);
        
        // Recalcular stats localmente
        this.calculateStats();
        
        this.applyFilters();
      } catch (error) {
        console.error('❌ Error al cargar facturas:', error);
      } finally {
        this.loading = false;
      }
    },
    
    calculateStats() {
      this.stats = {
        total: this.invoices.length,
        byStatus: {},
        totalAmount: 0
      };
      
      this.invoices.forEach(inv => {
        this.stats.byStatus[inv.status] = (this.stats.byStatus[inv.status] || 0) + 1;
        this.stats.totalAmount += (inv.financial?.totalSales || 0);
      });
    },
    
    // loadStats() eliminado porque calculamos localmente
    
    applyFilters() {
      let filtered = [...this.invoices];
      
      // Filtro por tab
      switch(this.currentTab) {
        case 'ventas':
          filtered = filtered.filter(inv => inv.flow === 'VENTA');
          break;
        case 'compras':
          filtered = filtered.filter(inv => 
            inv.flow === 'COMPRA' && inv.expense_type === 'COMPRA'
          );
          break;
        case 'gastos':
          filtered = filtered.filter(inv => 
            inv.flow === 'COMPRA' && (inv.expense_type === 'GASTO' || !inv.expense_type)
          );
          break;
      }
      
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
        await invoiceService.deleteInvoice(this.invoiceToDelete.id);
        await this.loadInvoices();
        this.deleteDialog = false;
        this.invoiceToDelete = null;
      } catch (error) {
        console.error('❌ Error al eliminar factura:', error);
      }
    },
    
    closeInvoiceDialog() {
      this.invoiceDialog = false;
      this.editingInvoice = null;
    },
    
    async handleInvoiceSubmit(result) {
      if (result.success) {
        this.closeInvoiceDialog();
        await this.loadInvoices();
      }
    },
    
    // Helpers de formato
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('es-VE');
    },
    
    formatCurrency(amount, currency = 'VES') {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency
      }).format(amount || 0);
    },
    
    getStatusColor(status) {
      const colors = {
        'BORRADOR': 'grey',
        'EMITIDA': 'primary',
        'ENVIADA': 'info',
        'PAGADA': 'success',
        'VENCIDA': 'error',
        'ANULADA': 'grey-darken-3'
      };
      return colors[status] || 'grey';
    },
    
    getDisplayAmount(amount) {
      if (this.currencyDisplay === 'USD') {
        return this.convertAmountToUSD(amount);
      }
      return amount;
    },
    
    convertAmountToUSD(amountInVES) {
      // Tasa de cambio simulada o desde servicio
      const rate = 36.5; // Ejemplo
      return (amountInVES || 0) / rate;
    },
    
    toggleCurrency() {
      this.isChangingCurrency = true;
      setTimeout(() => {
        this.currencyDisplay = this.currencyDisplay === 'VES' ? 'USD' : 'VES';
        this.isChangingCurrency = false;
      }, 300);
    },
    
    // Exportación
    getExportRecordCount() {
      return this.exportOptions.scope === 'all' ? this.invoices.length : this.filteredInvoices.length;
    },
    
    async exportWithOptions() {
      const invoicesToExport = this.exportOptions.scope === 'all' ? this.invoices : this.filteredInvoices;
      
      try {
        await exportService.exportInvoices(invoicesToExport, this.exportOptions);
        this.showExportDialog = false;
      } catch (error) {
        console.error('Error al exportar:', error);
      }
    },
    
    exportTable(format, scope) {
      this.exportOptions.format = format.toUpperCase();
      this.exportOptions.scope = scope;
      this.showExportDialog = true;
    },
    
    exportInvoice(invoice) {
      // Exportar una sola factura
      this.filteredInvoices = [invoice];
      this.exportOptions.scope = 'filtered';
      this.showExportDialog = true;
    }
  }
};
</script>

<style scoped>
.total-amount-display {
  font-weight: 600;
  transition: all 0.3s ease;
}

.amount-changing {
  opacity: 0.5;
  transform: scale(0.95);
}
</style>
