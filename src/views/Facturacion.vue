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
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ stats.total }}</div>
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
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ stats.byStatus?.EMITIDA || 0 }}</div>
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
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">{{ stats.byStatus?.PAGADA || 0 }}</div>
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
            <div class="text-body-2 mb-4" style="color: #010101;">Monto Total</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">{{ formatCurrency(stats.totalAmount) }}</div>
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
          {{ formatCurrency(item.financial.totalSales) }}
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
            @click="downloadInvoice(item)"
            title="Descargar"
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
  </v-container>
</template>

<script>
import { invoiceService } from '../services/invoiceService.js';
import InvoiceForm from '../components/forms/InvoiceForm.vue';

export default {
  name: 'Facturacion',
  components: {
    InvoiceForm
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
      
      // Filtros
      searchQuery: '',
      statusFilter: null,
      dateFromFilter: '',
      dateToFilter: '',
      
      // Estados de diálogos
      invoiceDialog: false,
      deleteDialog: false,
      viewDialog: false,
      
      // Datos para edición/eliminación
      editingInvoice: null,
      invoiceToDelete: null,
      viewingInvoice: null,
      
      // Configuración de la tabla
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
  async mounted() {
    await this.loadInvoices();
    await this.loadStats();
  },
  methods: {
    async loadInvoices() {
      try {
        this.loading = true;
        const response = await invoiceService.getInvoices();
        this.invoices = response.data || [];
        this.applyFilters();
      } catch (error) {
        console.error('Error al cargar facturas:', error);
        // Mostrar notificación de error
      } finally {
        this.loading = false;
      }
    },
    
    async loadStats() {
      try {
        const response = await invoiceService.getInvoiceStats();
        this.stats = response.data || { total: 0, byStatus: {}, totalAmount: 0 };
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
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
        await invoiceService.deleteInvoice(this.invoiceToDelete.id);
        await this.loadInvoices();
        await this.loadStats();
        this.deleteDialog = false;
        this.invoiceToDelete = null;
        // Mostrar notificación de éxito
      } catch (error) {
        console.error('Error al eliminar factura:', error);
        // Mostrar notificación de error
      }
    },
    
    async handleInvoiceSubmit(result) {
      if (result.success) {
        await this.loadInvoices();
        await this.loadStats();
        this.closeInvoiceDialog();
        // Mostrar notificación de éxito
      }
    },
    
    closeInvoiceDialog() {
      this.invoiceDialog = false;
      this.editingInvoice = null;
    },
    
    downloadInvoice(invoice) {
      // Implementar descarga de factura
      console.log('Descargar factura:', invoice);
      // Aquí se podría generar un PDF o descargar el archivo original
    },
    
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-ES');
    },
    
    formatCurrency(amount) {
      if (!amount) return '0,00';
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
</style>
