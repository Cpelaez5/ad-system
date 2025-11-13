<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-4">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-calculator</v-icon>
            Área de Contador
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 mb-4">
              Bienvenido, <strong>{{ currentUser?.firstName }} {{ currentUser?.lastName }}</strong>
            </p>
            <p class="text-body-2 text-grey">
              Aquí puedes ver y gestionar los datos de todos los clientes de tu organización. 
              Todas las operaciones están filtradas automáticamente por tu organización.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Estadísticas Generales -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #02254d;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Total Clientes</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.totalClients" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #961112;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Total Facturas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.totalInvoices" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f2b648;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Facturas Pagadas</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.paidInvoices" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f0d29b;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Monto Total</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.totalAmount" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" :formatter="v => formatCurrency(v)" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Tabs para Clientes y Facturas -->
    <v-card>
      <v-tabs v-model="tab" bg-color="primary">
        <v-tab value="clients">
          <v-icon left>mdi-account-multiple</v-icon>
          Todos los Clientes
        </v-tab>
        <v-tab value="invoices">
          <v-icon left>mdi-receipt</v-icon>
          Todas las Facturas
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="tab">
        <!-- Tab de Clientes -->
        <v-tabs-window-item value="clients">
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clientSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar cliente..."
                  variant="outlined"
                  clearable
                  hide-details
                ></v-text-field>
              </v-col>
            </v-row>

            <v-data-table :headers="clientHeaders" :items="filteredClients" :loading="loadingClients" class="elevation-1" :items-per-page="10">
              <template v-slot:item.companyName="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.companyName }}</div>
                  <div class="text-caption text-grey">{{ item.rif }}</div>
                </div>
              </template>
              <template v-slot:item.status="{ item }">
                <v-chip :color="item.status === 'ACTIVO' ? 'success' : 'error'" variant="tonal" size="small">
                  {{ item.status }}
                </v-chip>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn icon="mdi-eye" size="small" color="info" variant="text" @click="viewClient(item)"></v-btn>
                <v-btn icon="mdi-receipt" size="small" color="primary" variant="text" @click="viewClientInvoices(item)"></v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-tabs-window-item>

        <!-- Tab de Facturas -->
        <v-tabs-window-item value="invoices">
          <v-card-text>
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="invoiceSearchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar factura..."
                  variant="outlined"
                  clearable
                  hide-details
                  @input="applyInvoiceFilters"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6" class="text-right">
                <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openNewInvoiceDialog">
                  Nueva Factura
                </v-btn>
              </v-col>
            </v-row>

            <v-data-table :headers="invoiceHeaders" :items="filteredInvoices" :loading="loadingInvoices" class="elevation-1" :items-per-page="10">
              <template v-slot:item.invoiceNumber="{ item }">
                <v-chip color="primary" variant="tonal">{{ item.invoiceNumber }}</v-chip>
              </template>
              <template v-slot:item.client="{ item }">
                <div>
                  <div class="font-weight-medium">{{ item.client?.companyName || item.client_info?.companyName || 'N/A' }}</div>
                  <div class="text-caption text-grey">{{ item.client?.rif || item.client_info?.rif || '' }}</div>
                </div>
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
      </v-tabs-window>
    </v-card>

    <!-- Dialog para Factura -->
    <v-dialog v-model="invoiceDialog" max-width="1200px" scrollable>
      <InvoiceForm :invoice="editingInvoice" :flow="'VENTA'" :auto-party-mode="true" @submit="handleInvoiceSubmit" @cancel="closeInvoiceDialog" />
    </v-dialog>

    <!-- Dialog para ver cliente -->
    <v-dialog v-model="clientDialog" max-width="800px">
      <v-card v-if="selectedClient">
        <v-card-title>
          <v-icon left>mdi-account</v-icon>
          {{ selectedClient.companyName }}
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <strong>RIF:</strong> {{ selectedClient.rif }}
            </v-col>
            <v-col cols="12" md="6">
              <strong>Estado:</strong> 
              <v-chip :color="selectedClient.status === 'ACTIVO' ? 'success' : 'error'" variant="tonal" size="small">
                {{ selectedClient.status }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <strong>Email:</strong> {{ selectedClient.email || 'N/A' }}
            </v-col>
            <v-col cols="12" md="6">
              <strong>Teléfono:</strong> {{ selectedClient.phone || 'N/A' }}
            </v-col>
            <v-col cols="12">
              <strong>Dirección:</strong> {{ selectedClient.address || 'N/A' }}
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="viewClientInvoices(selectedClient)">Ver Facturas</v-btn>
          <v-btn color="grey" variant="text" @click="clientDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import InvoiceForm from '@/components/forms/InvoiceForm.vue';
import invoiceService from '@/services/invoiceService.js';
import clientService from '@/services/clientService.js';
import userService from '@/services/userService.js';
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

export default {
  name: 'ContadorArea',
  components: { InvoiceForm, AnimatedNumber },
  data() {
    return {
      tab: 'clients',
      loadingClients: false,
      loadingInvoices: false,
      currentUser: null,
      clients: [],
      filteredClients: [],
      invoices: [],
      filteredInvoices: [],
      clientSearchQuery: '',
      invoiceSearchQuery: '',
      invoiceDialog: false,
      clientDialog: false,
      editingInvoice: null,
      selectedClient: null,
      clientHeaders: [
        { title: 'Cliente', key: 'companyName', sortable: true },
        { title: 'Email', key: 'email', sortable: true },
        { title: 'Teléfono', key: 'phone', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      invoiceHeaders: [
        { title: 'Número', key: 'invoiceNumber', sortable: true },
        { title: 'Cliente', key: 'client', sortable: true },
        { title: 'Fecha', key: 'issueDate', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      stats: {
        totalClients: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        totalAmount: 0
      }
    }
  },
  async mounted() {
    await this.loadUser()
    await this.loadData()
  },
  watch: {
    clientSearchQuery() {
      this.applyClientFilters()
    }
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser()
        if (!this.currentUser) {
          console.error('❌ No se pudo obtener usuario actual')
          this.$router.push('/login')
          return
        }
        // Verificar que sea contador o admin
        if (this.currentUser.role !== 'contador' && this.currentUser.role !== 'admin') {
          console.warn('⚠️ Usuario sin permisos para esta vista:', this.currentUser.role)
          this.$router.push('/dashboard')
          return
        }
        console.log('✅ Usuario contador/admin cargado:', this.currentUser.role)
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error)
        this.$router.push('/login')
      }
    },
    async loadData() {
      await Promise.all([
        this.loadClients(),
        this.loadInvoices()
      ])
      this.computeStats()
    },
    async loadClients() {
      this.loadingClients = true
      try {
        console.log('🔄 Cargando clientes de la organización...')
        const clients = await clientService.getClients()
        this.clients = clients || []
        console.log('✅ Clientes cargados:', this.clients.length)
        this.applyClientFilters()
      } catch (e) {
        console.error('❌ Error cargando clientes:', e)
        this.clients = []
      } finally {
        this.loadingClients = false
      }
    },
    async loadInvoices() {
      this.loadingInvoices = true
      try {
        console.log('🔄 Cargando facturas de la organización...')
        // Cargar facturas de VENTA de todos los clientes de la organización
        const resp = await invoiceService.getInvoices({ flow: 'VENTA' })
        this.invoices = resp || []
        console.log('✅ Facturas cargadas:', this.invoices.length)
        this.applyInvoiceFilters()
      } catch (e) {
        console.error('❌ Error cargando facturas:', e)
        this.invoices = []
      } finally {
        this.loadingInvoices = false
      }
    },
    computeStats() {
      this.stats.totalClients = this.clients.length
      this.stats.totalInvoices = this.invoices.length
      this.stats.paidInvoices = this.invoices.filter(i => i.status === 'PAGADA').length
      this.stats.totalAmount = this.invoices.reduce((sum, inv) => {
        return sum + (parseFloat(inv?.financial?.totalSales || 0))
      }, 0)
    },
    applyClientFilters() {
      let filtered = [...this.clients]
      if (this.clientSearchQuery) {
        const s = this.clientSearchQuery.toLowerCase()
        filtered = filtered.filter(c =>
          c.companyName?.toLowerCase().includes(s) ||
          c.rif?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s)
        )
      }
      this.filteredClients = filtered
    },
    applyInvoiceFilters() {
      let filtered = [...this.invoices]
      if (this.invoiceSearchQuery) {
        const s = this.invoiceSearchQuery.toLowerCase()
        filtered = filtered.filter(i =>
          i.invoiceNumber?.toLowerCase().includes(s) ||
          (i.client?.companyName || i.client_info?.companyName || '').toLowerCase().includes(s)
        )
      }
      this.filteredInvoices = filtered
    },
    viewClient(client) {
      this.selectedClient = client
      this.clientDialog = true
    },
    viewClientInvoices(client) {
      this.selectedClient = client
      this.clientDialog = false
      this.tab = 'invoices'
      this.invoiceSearchQuery = client.companyName
      this.applyInvoiceFilters()
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
    formatDate(d) {
      return d ? new Date(d).toLocaleDateString('es-ES') : ''
    },
    formatCurrency(a) {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(a || 0)
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

