<template>
  <div class="facturacion-sa">
    <EncabezadoPagina titulo="Facturación" subtitulo="Cobra las suscripciones, aprueba pagos y configura cómo te pagan.">
      <v-btn color="primary" variant="flat" size="large" class="text-none font-weight-bold" prepend-icon="mdi-plus" data-testid="emitir-factura" @click="openInvoiceDialog">
        Emitir factura
      </v-btn>
    </EncabezadoPagina>

    <PanelSiguientePaso
      class="mb-6"
      :cargando="cargandoInicial"
      :listo="!cargandoInicial && !siguiente"
      :titulo="siguiente ? siguiente.titulo : ''"
      :detalle="siguiente ? siguiente.detalle : ''"
      :texto-boton="siguiente ? siguiente.boton : 'Abrir'"
      titulo-listo="Todo al día"
      detalle-listo="No hay pagos por aprobar ni facturas vencidas."
      @accion="seguirSiguiente"
    />

    <SeccionLista titulo="Cómo va el cobro" icono="mdi-cash-multiple" class="mb-6">
      <CifrasEnLinea :cifras="cifras" :cargando="cargandoInicial" />
    </SeccionLista>

    <FiltroChips v-model="activeTab" :opciones="secciones" etiqueta="Sección de facturación" class="mb-4" />

    <FacturasSistemaLista
      v-if="activeTab === 'invoices'"
      :key="`f${filtroFacturas.n}`"
      :facturas="invoices" :cargando="loadingInvoices" :estado-inicial="filtroFacturas.estado"
      @emitir="openInvoiceDialog" @anular="confirmCancelInvoice"
    />

    <PagosReportadosLista
      v-else-if="activeTab === 'reports'"
      :key="`r${filtroReportes.n}`"
      :reportes="paymentReports" :cargando="loadingReports" :estado-inicial="filtroReportes.estado"
      @ver="viewReportDetails" @aprobar="confirmApprovePayment" @rechazar="confirmRejectPayment"
    />

    <template v-else>
      <div class="d-flex justify-end mb-3">
        <v-btn variant="outlined" class="text-none font-weight-bold" prepend-icon="mdi-plus" data-testid="agregar-metodo" @click="openMethodDialog()">Agregar método</v-btn>
      </div>
      <MetodosPagoLista
        :metodos="paymentMethods" :cargando="loadingMethods"
        @agregar="openMethodDialog()" @editar="openMethodDialog" @eliminar="confirmDeleteMethod" @alternar="toggleMethod"
      />
    </template>

    <!-- Diálogos -->
    <DialogoEmitirFactura v-model="showInvoiceDialog" :clientes="clientsForBilling" :numero="numeroSugerido" :cargando="creatingInvoice" @guardar="createInvoice" />

    <DialogoMetodoPago v-model="showMethodDialog" :metodo="editingMethod" :cargando="savingMethod" @guardar="saveMethod" />

    <DialogoDetallePago
      v-model="showReportDetail" :reporte="selectedReport" :url-comprobante="selectedReportSignedUrl"
      @aprobar="confirmApprovePayment" @rechazar="confirmRejectPayment"
    />

    <DialogoAprobarPago
      v-model="showApproveConfirm" :es-suscripcion="isSubscriptionPayment" :planes="availablePlans"
      v-model:plan-id="subscriptionForm.plan_id" v-model:trial-end="subscriptionForm.trial_end"
      :cargando="processingAction" @confirmar="approvePayment"
    />

    <DialogoRechazarPago v-model="showRejectConfirm" v-model:motivo="rejectionReason" :cargando="processingAction" @confirmar="rejectPayment" />

    <DialogoConfirmar
      v-model="showCancelInvoice" titulo="¿Anular esta factura?" icono="mdi-cancel" color="error"
      :mensaje="invoiceToCancel ? `Anularás la factura ${invoiceToCancel.invoice_number}. Esto no se puede deshacer.` : ''"
      texto-confirmar="Anular factura" :cargando="processingAction" @confirmar="cancelInvoice"
    />

    <DialogoConfirmar
      v-model="showDeleteMethod" titulo="¿Eliminar este método?" icono="mdi-delete-outline" color="error"
      :mensaje="methodToDelete ? `Eliminarás «${methodToDelete.name}». Los clientes dejarán de verlo.` : ''"
      texto-confirmar="Eliminar método" :cargando="processingAction" @confirmar="deleteMethod"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="bottom" timeout="3500">
      {{ snackbar.text }}
      <template #actions><v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn></template>
    </v-snackbar>
  </div>
</template>

<script>
import billingService from '@/services/billingService'
import plansService from '@/services/plansService'
import { supabase } from '@/lib/supabaseClient'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import CifrasEnLinea from '@/components/ui/CifrasEnLinea.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import DialogoConfirmar from '@/components/ui/DialogoConfirmar.vue'
import FacturasSistemaLista from '@/components/admin/FacturasSistemaLista.vue'
import PagosReportadosLista from '@/components/admin/PagosReportadosLista.vue'
import MetodosPagoLista from '@/components/admin/MetodosPagoLista.vue'
import DialogoEmitirFactura from '@/components/admin/DialogoEmitirFactura.vue'
import DialogoMetodoPago from '@/components/admin/DialogoMetodoPago.vue'
import DialogoDetallePago from '@/components/admin/DialogoDetallePago.vue'
import DialogoAprobarPago from '@/components/admin/DialogoAprobarPago.vue'
import DialogoRechazarPago from '@/components/admin/DialogoRechazarPago.vue'
import { cifrasBalance, siguientePasoFacturacion, prellenarSuscripcion } from '@/utils/facturacionSistema'

const SECCIONES = ['invoices', 'reports', 'payment-methods']

export default {
  name: 'FacturacionSistema',
  components: {
    EncabezadoPagina, PanelSiguientePaso, SeccionLista, CifrasEnLinea, FiltroChips, DialogoConfirmar,
    FacturasSistemaLista, PagosReportadosLista, MetodosPagoLista,
    DialogoEmitirFactura, DialogoMetodoPago, DialogoDetallePago, DialogoAprobarPago, DialogoRechazarPago,
  },
  data() {
    return {
      activeTab: 'invoices',
      loadingInvoices: true,
      loadingReports: true,
      loadingMethods: true,
      loadingBalance: true,

      invoices: [],
      paymentReports: [],
      paymentMethods: [],
      clientsForBilling: [],
      availablePlans: [],
      balance: { totalFacturado: 0, totalPagado: 0, totalPendiente: 0, totalVencido: 0 },

      // Filtro con el que se abre cada lista (n fuerza a la lista a reiniciarse)
      filtroFacturas: { estado: 'all', n: 0 },
      filtroReportes: { estado: 'all', n: 0 },

      showInvoiceDialog: false,
      creatingInvoice: false,
      numeroSugerido: '',

      showMethodDialog: false,
      savingMethod: false,
      editingMethod: null,

      showReportDetail: false,
      selectedReport: null,
      selectedReportSignedUrl: null,

      showApproveConfirm: false,
      showRejectConfirm: false,
      actionReport: null,
      rejectionReason: '',
      processingAction: false,
      subscriptionForm: { plan_id: null, trial_end: '' },

      showCancelInvoice: false,
      invoiceToCancel: null,
      showDeleteMethod: false,
      methodToDelete: null,

      snackbar: { show: false, text: '', color: 'success' },
    }
  },
  computed: {
    isSubscriptionPayment() {
      return this.actionReport?.invoice?.notes?.toLowerCase().includes('suscripción a plan') || false
    },
    pendingReportsCount() {
      return this.paymentReports.filter((r) => r.status === 'pending_review').length
    },
    overdueInvoicesCount() {
      return this.invoices.filter((i) => i.status === 'overdue').length
    },
    cargandoInicial() {
      return this.loadingInvoices || this.loadingReports || this.loadingBalance
    },
    cifras() {
      return cifrasBalance(this.balance)
    },
    siguiente() {
      return siguientePasoFacturacion({ pagosPorRevisar: this.pendingReportsCount, facturasVencidas: this.overdueInvoicesCount })
    },
    secciones() {
      return [
        { valor: 'invoices', texto: 'Facturas', cantidad: this.invoices.length },
        { valor: 'reports', texto: 'Pagos reportados', cantidad: this.pendingReportsCount },
        { valor: 'payment-methods', texto: 'Métodos de pago' },
      ]
    },
  },
  async mounted() {
    const tab = this.$route?.query?.tab
    if (SECCIONES.includes(tab)) this.activeTab = tab
    if (tab === 'reports') this.filtroReportes = { estado: 'pending_review', n: 1 }
    await this.loadAllData()
    const reportId = this.$route?.query?.report_id
    if (reportId) {
      this.activeTab = 'reports'
      const targetReport = this.paymentReports.find((r) => r.id === reportId)
      if (targetReport) {
        this.viewReportDetails(targetReport)
      }
    }
  },
  methods: {
    async loadAllData() {
      await Promise.all([this.loadInvoices(), this.loadReports(), this.loadMethods(), this.loadBalance(), this.loadClients(), this.loadPlans()])
    },

    async loadPlans() {
      const res = await plansService.getPlans()
      if (res.success) {
        this.availablePlans = res.data
      }
    },

    async loadInvoices() {
      this.loadingInvoices = true
      const result = await billingService.getAllInvoices()
      if (result.success) this.invoices = result.data || []
      this.loadingInvoices = false
    },

    async loadReports() {
      this.loadingReports = true
      const result = await billingService.getPaymentReports('all')
      if (result.success) this.paymentReports = result.data || []
      this.loadingReports = false
    },

    async loadMethods() {
      this.loadingMethods = true
      const result = await billingService.getPaymentMethods()
      if (result.success) this.paymentMethods = result.data || []
      this.loadingMethods = false
    },

    async loadBalance() {
      this.loadingBalance = true
      const result = await billingService.getBalance(null)
      if (result.success) this.balance = result.data
      this.loadingBalance = false
    },

    async loadClients() {
      const result = await billingService.getClientsForBilling()
      if (result.success) {
        this.clientsForBilling = (result.data || []).map((c) => ({
          id: c.id,
          label: `${c.company_name} (${c.rif})`,
        }))
      }
    },

    // ---- SIGUIENTE PASO ----
    seguirSiguiente() {
      if (!this.siguiente) return
      if (this.siguiente.clave === 'pagos') {
        this.filtroReportes = { estado: 'pending_review', n: this.filtroReportes.n + 1 }
        this.activeTab = 'reports'
      } else {
        this.filtroFacturas = { estado: 'overdue', n: this.filtroFacturas.n + 1 }
        this.activeTab = 'invoices'
      }
    },

    // ---- FACTURAS ----
    async openInvoiceDialog() {
      this.numeroSugerido = ''
      const numResult = await billingService.getNextInvoiceNumber()
      if (numResult.success) this.numeroSugerido = numResult.data
      this.showInvoiceDialog = true
    },

    async createInvoice(datos) {
      this.creatingInvoice = true
      try {
        const result = await billingService.createInvoice(datos)
        if (result.success) {
          this.showSnackbar('Factura emitida', 'success')
          this.showInvoiceDialog = false
          await Promise.all([this.loadInvoices(), this.loadBalance()])
        } else throw result.error
      } catch (e) {
        this.showSnackbar('No pudimos emitir la factura. Inténtalo de nuevo.', 'error')
      } finally {
        this.creatingInvoice = false
      }
    },

    confirmCancelInvoice(invoice) {
      this.invoiceToCancel = invoice
      this.showCancelInvoice = true
    },

    async cancelInvoice() {
      if (!this.invoiceToCancel) return
      this.processingAction = true
      const result = await billingService.updateInvoiceStatus(this.invoiceToCancel.id, 'canceled')
      this.processingAction = false
      this.showCancelInvoice = false
      if (result.success) {
        this.showSnackbar('Factura anulada', 'success')
        await Promise.all([this.loadInvoices(), this.loadBalance()])
      } else {
        this.showSnackbar('No pudimos anular la factura.', 'error')
      }
    },

    // ---- MÉTODOS DE PAGO ----
    openMethodDialog(method = null) {
      this.editingMethod = method
      this.showMethodDialog = true
    },

    async saveMethod(datos) {
      this.savingMethod = true
      try {
        const result = this.editingMethod
          ? await billingService.updatePaymentMethod(this.editingMethod.id, datos)
          : await billingService.createPaymentMethod(datos)

        if (result.success) {
          this.showSnackbar(this.editingMethod ? 'Método actualizado' : 'Método creado', 'success')
          this.showMethodDialog = false
          await this.loadMethods()
        } else throw result.error
      } catch (e) {
        this.showSnackbar('No pudimos guardar el método de pago.', 'error')
      } finally {
        this.savingMethod = false
      }
    },

    async toggleMethod(method, habilitado) {
      const anterior = method.is_enabled
      method.is_enabled = habilitado
      const result = await billingService.togglePaymentMethod(method.id, habilitado)
      if (result && result.success === false) {
        method.is_enabled = anterior
        this.showSnackbar('No pudimos cambiar el método.', 'error')
      }
    },

    confirmDeleteMethod(method) {
      this.methodToDelete = method
      this.showDeleteMethod = true
    },

    async deleteMethod() {
      if (!this.methodToDelete) return
      this.processingAction = true
      const result = await billingService.deletePaymentMethod(this.methodToDelete.id)
      this.processingAction = false
      this.showDeleteMethod = false
      if (result.success) {
        this.showSnackbar('Método eliminado', 'success')
        await this.loadMethods()
      } else {
        this.showSnackbar('No pudimos eliminar el método.', 'error')
      }
    },

    // ---- REPORTES ----
    async viewReportDetails(report) {
      this.selectedReport = report
      this.selectedReportSignedUrl = null
      this.showReportDetail = true
      if (report.proof_url) {
        this.selectedReportSignedUrl = await billingService.getProofSignedUrl(report.proof_url)
      }
    },

    confirmApprovePayment(report) {
      this.actionReport = report
      this.showReportDetail = false
      this.showApproveConfirm = true
      // Pre-llena plan y vencimiento si es una suscripción
      this.subscriptionForm = prellenarSuscripcion(report, this.availablePlans)
    },

    confirmRejectPayment(report) {
      this.actionReport = report
      this.rejectionReason = ''
      this.showRejectConfirm = true
      this.showReportDetail = false
    },

    async approvePayment() {
      // Si es suscripción, debe haber un plan elegido
      if (this.isSubscriptionPayment && !this.subscriptionForm.plan_id) {
        this.showSnackbar('Elige el plan que se va a activar.', 'error')
        return
      }

      this.processingAction = true
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const options = {}
        if (this.isSubscriptionPayment) {
          options.plan_id = this.subscriptionForm.plan_id
          options.trial_end = this.subscriptionForm.trial_end ? new Date(this.subscriptionForm.trial_end).toISOString() : null
        }

        const result = await billingService.approvePayment(this.actionReport.id, user.id, options)
        if (result.success) {
          this.showSnackbar('Pago aprobado', 'success')
          this.showApproveConfirm = false

          // Avisa al cliente por correo
          const clientEmail = this.actionReport.invoice?.client?.email || this.actionReport.sender_details?.sender_email
          if (clientEmail) {
            supabase.functions.invoke('send-invoice-email', {
              body: {
                mode: 'payment_status_update',
                to: clientEmail,
                client_name: this.actionReport.invoice?.client?.company_name || 'Cliente',
                invoice_number: this.actionReport.invoice?.invoice_number || 'S/N',
                status: 'approved',
                amount: this.actionReport.amount,
              },
            }).catch((err) => console.warn('Error enviando notificación de aprobación:', err))
          }

          await Promise.all([this.loadReports(), this.loadInvoices(), this.loadBalance()])
        } else throw result.error
      } catch (e) {
        this.showSnackbar('No pudimos aprobar el pago. Inténtalo de nuevo.', 'error')
      } finally {
        this.processingAction = false
      }
    },

    async rejectPayment() {
      if (!this.rejectionReason?.trim()) return
      this.processingAction = true
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const result = await billingService.rejectPayment(this.actionReport.id, user.id, this.rejectionReason.trim())
        if (result.success) {
          this.showSnackbar('Pago rechazado', 'warning')
          this.showRejectConfirm = false

          const clientEmail = this.actionReport.invoice?.client?.email || this.actionReport.sender_details?.sender_email
          if (clientEmail) {
            supabase.functions.invoke('send-invoice-email', {
              body: {
                mode: 'payment_status_update',
                to: clientEmail,
                client_name: this.actionReport.invoice?.client?.company_name || 'Cliente',
                invoice_number: this.actionReport.invoice?.invoice_number || 'S/N',
                status: 'rejected',
                rejection_reason: this.rejectionReason.trim(),
                amount: this.actionReport.amount,
              },
            }).catch((err) => console.warn('Error enviando notificación de rechazo:', err))
          }

          await this.loadReports()
        } else throw result.error
      } catch (e) {
        this.showSnackbar('No pudimos rechazar el pago. Inténtalo de nuevo.', 'error')
      } finally {
        this.processingAction = false
      }
    },

    showSnackbar(text, color) { this.snackbar = { show: true, text, color } },
  },
}
</script>

<style scoped>
.facturacion-sa { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .facturacion-sa { padding: 32px 24px 40px; } }
</style>
