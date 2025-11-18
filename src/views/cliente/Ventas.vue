<template>
  <v-container fluid class="pa-4">
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #02254d;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Total Ventas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.total" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #961112;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Emitidas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.byStatus?.EMITIDA || 0" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f2b648;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Pagadas</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.byStatus?.PAGADA || 0" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f0d29b;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="text-body-2" style="color: #010101;">Monto Total</div>
              <v-btn :color="currencyDisplay === 'VES' ? 'primary' : 'success'" variant="tonal" size="x-small" @click="toggleCurrency" class="currency-toggle-btn" :class="{ 'currency-changing': isChangingCurrency }">{{ currencyDisplay }}</v-btn>
            </div>
            <div class="text-h4 amount-display" :class="{ 'amount-changing': isChangingCurrency }" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="displayTotalAmount" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" :formatter="v => formatCurrency(v, currencyDisplay)" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Buscar factura de venta..."
          variant="outlined"
          clearable
          hide-details
          @input="applyFilters"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" @click="openNewInvoiceDialog">
          Nueva Venta
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-card-title>
        <v-icon left>mdi-cash-plus</v-icon>
        Mis Ventas ({{ filteredInvoices.length }})
      </v-card-title>
      <v-data-table :headers="headers" :items="filteredInvoices" :loading="loading" class="elevation-1" :items-per-page="10">
        <template v-slot:item.invoiceNumber="{ item }">
          <v-chip color="success" variant="tonal">{{ item.invoiceNumber }}</v-chip>
        </template>
        <template v-slot:item.client="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.client_info?.companyName || item.clients?.company_name || 'N/A' }}</div>
            <div class="text-caption text-grey">{{ item.client_info?.rif || item.clients?.rif || '' }}</div>
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
          <v-btn icon="mdi-delete" size="small" color="error" variant="text" @click="deleteInvoice(item)"></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="invoiceDialog" max-width="1200px" scrollable>
      <InvoiceForm :invoice="editingInvoice" :flow="'VENTA'" :auto-party-mode="true" @submit="handleInvoiceSubmit" @cancel="closeInvoiceDialog" />
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Confirmar Eliminación</v-card-title>
        <v-card-text>
          ¿Eliminar la venta <strong>{{ invoiceToDelete?.invoiceNumber }}</strong>?
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="deleteDialog = false">Cancelar</v-btn>
          <v-btn color="error" @click="confirmDelete">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import InvoiceForm from '@/components/forms/InvoiceForm.vue';
import invoiceService from '@/services/invoiceService.js';
import userService from '@/services/userService.js';
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import bcvService from '@/services/bcvService.js'

export default {
  name: 'ClienteVentas',
  components: { InvoiceForm, AnimatedNumber },
  data() {
    return {
      loading: false,
      invoices: [],
      filteredInvoices: [],
      searchQuery: '',
      statusFilter: null,
      currentUser: null,
      clientId: null,
      invoiceDialog: false,
      deleteDialog: false,
      editingInvoice: null,
      invoiceToDelete: null,
      headers: [
        { title: 'Número', key: 'invoiceNumber', sortable: true },
        { title: 'Cliente', key: 'client', sortable: true },
        { title: 'Fecha', key: 'issueDate', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      stats: { total: 0, byStatus: {}, totalAmount: 0 },
      currencyDisplay: 'VES',
      isChangingCurrency: false
    }
  },
  async mounted() {
    await this.loadUser()
    await this.reloadData()
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser()
        if (this.currentUser && this.currentUser.client_id) {
          this.clientId = this.currentUser.client_id
        } else {
          console.error('❌ Usuario cliente no tiene client_id')
        }
      } catch (e) {
        console.error('❌ Error al cargar usuario:', e)
      }
    },
    async reloadData() {
      await this.loadInvoices()
      this.applyFilters()
    },
    async loadInvoices() {
      this.loading = true
      try {
        // Filtrar por client_id del usuario actual
        const resp = await invoiceService.getInvoices({ flow: 'VENTA', clientId: this.clientId })
        this.invoices = resp || []
        this.computeStats()
      } catch (e) {
        console.error('❌ Error al cargar ventas:', e)
        this.invoices = []
        this.computeStats()
      } finally {
        this.loading = false
      }
    },
    computeStats() {
      const stats = { total: 0, byStatus: {}, totalAmount: 0 }
      stats.total = this.invoices.length
      for (const inv of this.invoices) {
        const st = inv.status
        stats.byStatus[st] = (stats.byStatus[st] || 0) + 1
        const amt = parseFloat(inv?.financial?.totalSales || 0)
        stats.totalAmount += isNaN(amt) ? 0 : amt
      }
      this.stats = stats
    },
    applyFilters() {
      let filtered = [...this.invoices]
      if (this.searchQuery) {
        const s = this.searchQuery.toLowerCase()
        filtered = filtered.filter(i =>
          i.invoiceNumber?.toLowerCase().includes(s) ||
          (i.client_info?.companyName || i.clients?.company_name || '').toLowerCase().includes(s)
        )
      }
      if (this.statusFilter) {
        filtered = filtered.filter(i => i.status === this.statusFilter)
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
    deleteInvoice(inv) {
      this.invoiceToDelete = inv
      this.deleteDialog = true
    },
    async confirmDelete() {
      if (!this.invoiceToDelete) return
      const res = await invoiceService.deleteInvoice(this.invoiceToDelete.id)
      if (res.success) {
        await this.reloadData()
        this.deleteDialog = false
        this.invoiceToDelete = null
      }
    },
    async handleInvoiceSubmit(result) {
      if (result.success) {
        await this.reloadData()
        this.invoiceDialog = false
        this.editingInvoice = null
      }
    },
    closeInvoiceDialog() {
      this.invoiceDialog = false
      this.editingInvoice = null
    },
    formatDate(d) { return d ? new Date(d).toLocaleDateString('es-ES') : '' },
    formatCurrency(a, currency = 'VES') {
      if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(a || 0)
      }
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 }).format(a || 0)
    },
    getStatusColor(status) {
      const colors = { BORRADOR: 'grey', EMITIDA: 'info', ENVIADA: 'warning', PAGADA: 'success', VENCIDA: 'error', ANULADA: 'error' }
      return colors[status] || 'grey'
    },
    async toggleCurrency() {
      try {
        this.isChangingCurrency = true
        await new Promise(r => setTimeout(r, 200))
        if (this.currencyDisplay === 'VES') {
          const r = await bcvService.getCurrentRate()
          if (r.success && r.data.dollar) this.currencyDisplay = 'USD'
        } else {
          this.currencyDisplay = 'VES'
        }
      } finally {
        setTimeout(() => { this.isChangingCurrency = false }, 150)
      }
    },
    convertAmountToUSD(amountVES) {
      try {
        const cachedRate = bcvService.getCachedRate()
        if (cachedRate && cachedRate.dollar) return amountVES / cachedRate.dollar
        const defaultRate = bcvService.getConfiguredDefaultRate()
        return amountVES / defaultRate
      } catch {
        return amountVES
      }
    }
  },
  computed: {
    displayTotalAmount() {
      if (this.currencyDisplay === 'USD') {
        return this.convertAmountToUSD(this.stats.totalAmount)
      }
      return this.stats.totalAmount
    }
  }
}
</script>

<style scoped>
.v-data-table { border-radius: 8px; }
.stats-card { border-radius: 20px !important; box-shadow: none !important; padding: 20px !important; }
.currency-toggle-btn { min-width: 50px !important; height: 28px !important; font-size: 0.7rem !important; font-weight: 600 !important; border-radius: 14px !important; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important; position: relative; overflow: hidden; }
.amount-display { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); transform-origin: center; }
.amount-changing { animation: amountChange 0.5s ease-in-out; }
@keyframes amountChange { 0% { transform: scale(1) translateY(0); opacity: 1; } 50% { transform: scale(1.02) translateY(-2px); opacity: 0.9; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
</style>

