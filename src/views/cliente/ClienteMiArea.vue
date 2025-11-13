<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-account</v-icon>
            Mi Área - Cliente
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 mb-4">
              Bienvenido, <strong>{{ currentUser?.firstName }} {{ currentUser?.lastName }}</strong>
            </p>
            <p class="text-body-2 text-grey">
              Aquí puedes ver y gestionar únicamente tus propios datos: facturas, documentos y información personal.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estadísticas del Cliente -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #02254d;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Mis Facturas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.totalInvoices" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #961112;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Pendientes</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.pendingInvoices" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f2b648;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Pagadas</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.paidInvoices" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f0d29b;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Mis Documentos</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.totalDocuments" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs para Facturas y Documentos -->
    <v-card>
      <v-tabs v-model="tab" bg-color="primary">
        <v-tab value="invoices">
          <v-icon left>mdi-receipt</v-icon>
          Mis Facturas
        </v-tab>
        <v-tab value="documents">
          <v-icon left>mdi-file-document</v-icon>
          Mis Documentos
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab">
        <!-- Tab de Facturas -->
        <v-tabs-window-item value="invoices">
          <v-card-text>
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
                <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openNewInvoiceDialog">
                  Nueva Factura
                </v-btn>
              </v-col>
            </v-row>

            <v-data-table :headers="invoiceHeaders" :items="filteredInvoices" :loading="loading" class="elevation-1" :items-per-page="10">
              <template v-slot:item.invoiceNumber="{ item }">
                <v-chip color="primary" variant="tonal">{{ item.invoiceNumber }}</v-chip>
              </template>
              <template v-slot:item.issueDate="{ item }">{{ formatDate(item.issueDate) }}</template>
              <template v-slot:item.total="{ item }">{{ formatCurrency(item.financial?.totalSales || 0) }}</template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="getStatusColor(item.status)" variant="tonal" size="small">{{ item.status }}</v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn icon="mdi-eye" size="small" color="info" variant="text" @click="viewInvoice(item)"></v-btn>
                <v-btn icon="mdi-pencil" size="small" color="warning" variant="text" @click="editInvoice(item)"></v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Tab de Documentos -->
        <v-tabs-window-item value="documents">
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="documentSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar documento..."
                  variant="outlined"
                  clearable
                  hide-details
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6" class="text-right">
                <v-btn color="primary" size="large" prepend-icon="mdi-upload" @click="uploadDocument">
                  Subir Documento
                </v-btn>
              </v-col>
            </v-row>

            <v-data-table :headers="documentHeaders" :items="documents" :loading="loadingDocuments" class="elevation-1" :items-per-page="10">
              <template v-slot:item.nombre="{ item }">
                <v-icon left>mdi-file-document</v-icon>
                {{ item.nombre || item.file_name }}
              </template>
              <template v-slot:item.tipo="{ item }">
                {{ item.tipo || item.file_type }}
              </template>
              <template v-slot:item.tamaño="{ item }">
                {{ formatFileSize(item.tamaño || item.file_size) }}
              </template>
              <template v-slot:item.fechaSubida="{ item }">
                {{ formatDate(item.fechaSubida || item.created_at) }}
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn icon="mdi-download" size="small" color="info" variant="text" @click="downloadDocument(item)"></v-btn>
                <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="deleteDocument(item)"></v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- Dialog para Factura -->
    <v-dialog v-model="invoiceDialog" max-width="1200px" scrollable>
      <InvoiceForm :invoice="editingInvoice" :flow="'VENTA'" :auto-party-mode="true" @submit="handleInvoiceSubmit" @cancel="closeInvoiceDialog" />
    </v-dialog>
  </v-container>
</template>

<script>
import InvoiceForm from '../components/forms/InvoiceForm.vue';
import invoiceService from '../services/invoiceService.js';
import documentService from '../services/documentService.js';
import userService from '../services/userService.js';
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

export default {
  name: 'ClienteMiArea',
  components: { InvoiceForm, AnimatedNumber },
  data() {
    return {
      tab: 'invoices',
      loading: false,
      loadingDocuments: false,
      currentUser: null,
      invoices: [],
      filteredInvoices: [],
      documents: [],
      searchQuery: '',
      documentSearchQuery: '',
      invoiceDialog: false,
      editingInvoice: null,
      invoiceHeaders: [
        { title: 'Número', key: 'invoiceNumber', sortable: true },
        { title: 'Fecha', key: 'issueDate', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      documentHeaders: [
        { title: 'Nombre', key: 'nombre', sortable: true },
        { title: 'Tipo', key: 'tipo', sortable: true },
        { title: 'Tamaño', key: 'tamaño', sortable: true },
        { title: 'Fecha', key: 'fechaSubida', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      stats: {
        totalInvoices: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        totalDocuments: 0
      }
    }
  },
  async mounted() {
    await this.loadUser()
    await this.loadData()
  },
  methods: {
    async loadUser() {
      this.currentUser = await userService.getCurrentUser()
      if (!this.currentUser || this.currentUser.role !== 'cliente') {
        this.$router.push('/dashboard')
      }
    },
    async loadData() {
      await Promise.all([
        this.loadInvoices(),
        this.loadDocuments()
      ])
      this.computeStats()
    },
    async loadInvoices() {
      this.loading = true
      try {
        // Cliente solo ve sus facturas (filtradas por su client_id)
        const resp = await invoiceService.getInvoices({ flow: 'VENTA' })
        this.invoices = resp || []
        this.applyFilters()
      } catch (e) {
        console.error('Error cargando facturas:', e)
        this.invoices = []
      } finally {
        this.loading = false
      }
    },
    async loadDocuments() {
      this.loadingDocuments = true
      try {
        const resp = await documentService.getDocuments()
        this.documents = resp || []
      } catch (e) {
        console.error('Error cargando documentos:', e)
        this.documents = []
      } finally {
        this.loadingDocuments = false
      }
    },
    computeStats() {
      this.stats.totalInvoices = this.invoices.length
      this.stats.pendingInvoices = this.invoices.filter(i => i.status !== 'PAGADA').length
      this.stats.paidInvoices = this.invoices.filter(i => i.status === 'PAGADA').length
      this.stats.totalDocuments = this.documents.length
    },
    applyFilters() {
      let filtered = [...this.invoices]
      if (this.searchQuery) {
        const s = this.searchQuery.toLowerCase()
        filtered = filtered.filter(i =>
          i.invoiceNumber?.toLowerCase().includes(s)
        )
      }
      this.filteredInvoices = filtered
    },
    openNewInvoiceDialog() {
      this.editingInvoice = null
      this.invoiceDialog = true
    },
    editInvoice(inv) {
      this.editingInvoice = { ...inv, flow: 'VENTA' }
      this.invoiceDialog = true
    },
    viewInvoice(inv) {
      this.editingInvoice = { ...inv }
      this.invoiceDialog = true
    },
    async handleInvoiceSubmit(result) {
      if (result.success) {
        await this.loadInvoices()
        this.invoiceDialog = false
        this.editingInvoice = null
        this.computeStats()
      }
    },
    closeInvoiceDialog() {
      this.invoiceDialog = false
      this.editingInvoice = null
    },
    uploadDocument() {
      // Implementar subida de documentos
      alert('Funcionalidad de subida de documentos en desarrollo')
    },
    downloadDocument(doc) {
      // Implementar descarga de documentos
      const url = doc.url || doc.file_url
      if (url) {
        window.open(url, '_blank')
      } else {
        alert('URL del documento no disponible')
      }
    },
    async deleteDocument(doc) {
      if (confirm('¿Eliminar este documento?')) {
        try {
          await documentService.deleteDocument(doc.id)
          await this.loadDocuments()
          this.computeStats()
        } catch (e) {
          alert('Error al eliminar documento')
        }
      }
    },
    formatDate(d) {
      return d ? new Date(d).toLocaleDateString('es-ES') : ''
    },
    formatCurrency(a) {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(a || 0)
    },
    formatFileSize(bytes) {
      if (!bytes) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    },
    getStatusColor(status) {
      const colors = { BORRADOR: 'grey', EMITIDA: 'info', ENVIADA: 'warning', PAGADA: 'success', VENCIDA: 'error', ANULADA: 'error' }
      return colors[status] || 'grey'
    }
  }
}
</script>

<style scoped>
.stats-card {
  border-radius: 20px !important;
  box-shadow: none !important;
  padding: 20px !important;
}
</style>

