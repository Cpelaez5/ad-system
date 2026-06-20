<template>
  <!-- ════════════════════════════════════════════════════════════════
       Modal Rápido de Cuotas Cashea
       Permite actualizar el estado de la inicial y cada cuota sin
       abrir el formulario de factura completo.
  ════════════════════════════════════════════════════════════════ -->
  <v-dialog :model-value="modelValue" @update:modelValue="$emit('update:modelValue', $event)" max-width="480px" persistent @keydown.esc="cancel">
    <v-card class="cashea-modal rounded-xl elevation-10" style="overflow: hidden;">

      <!-- ── Header con branding Cashea ──────────────────────────── -->
      <div class="cashea-modal__header px-5 py-4 d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-3">
          <div class="cashea-logo-badge">
            <img src="/Cashea-black-icon.svg" alt="Cashea" width="20" height="20" />
          </div>
          <div>
            <div class="text-subtitle-1 font-weight-bold text-black">Cuotas Cashea</div>
            <div class="text-caption text-black" style="opacity: 0.6;">
              {{ invoice?.invoiceNumber }} · {{ invoice?.client?.companyName || invoice?.issuer?.companyName || '—' }}
            </div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" color="black" @click="cancel" />
      </div>

      <!-- ── Body ────────────────────────────────────────────────── -->
      <v-card-text class="px-5 py-4">

        <!-- Resumen de la factura -->
        <div class="cashea-summary mb-4 pa-3 rounded-lg d-flex justify-space-between align-center">
          <div>
            <div class="text-caption text-grey-darken-1">Total de la venta</div>
            <div class="text-h6 font-weight-bold">
              {{ formatCurrency(credit.totalSales, credit.currency) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-caption text-grey-darken-1">Estado general</div>
            <v-chip :color="statusChipColor" size="small" variant="tonal" class="font-weight-bold">
              {{ localStatus }}
            </v-chip>
          </div>
        </div>

        <!-- Fila: Inicial ──────────────────────────────────────── -->
        <div class="text-caption font-weight-bold text-grey-darken-2 text-uppercase mb-2" style="letter-spacing: .06em;">
          Pago Inicial
        </div>
        <div class="cashea-row pa-3 rounded-lg mb-3 d-flex align-center justify-space-between">
          <div>
            <div class="text-body-2 font-weight-medium">
              {{ formatCurrency(credit.initialAmount, credit.currency) }}
              <span class="text-caption text-grey">({{ credit.initialPercentage }}%)</span>
            </div>
            <div class="text-caption text-grey-darken-1">Pago inicial</div>
          </div>
          <v-btn-toggle
            v-model="localInitialStatus"
            mandatory
            density="compact"
            color="success"
            rounded="lg"
            class="cashea-toggle"
            @update:modelValue="syncOverallStatus"
          >
            <v-btn value="POR_COBRAR" size="small" style="font-size: 0.7rem; min-width: 80px;">
              <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
              Por Cobrar
            </v-btn>
            <v-btn value="PAGADA" size="small" style="font-size: 0.7rem; min-width: 80px;">
              <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
              Pagada
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Cuotas ─────────────────────────────────────────────── -->
        <div class="text-caption font-weight-bold text-grey-darken-2 text-uppercase mb-2" style="letter-spacing: .06em;">
          Cuotas ({{ localInstallments.length }})
        </div>

        <div
          v-for="(inst, idx) in localInstallments"
          :key="inst.id"
          class="cashea-row pa-3 rounded-lg mb-2 d-flex align-center justify-space-between"
          :class="{ 'cashea-row--paid': inst.status === 'PAGADA' }"
        >
          <div>
            <div class="text-body-2 font-weight-medium">
              Cuota {{ idx + 1 }}
              <span class="text-caption text-grey ml-1">· {{ formatCurrency(inst.amount, credit.currency) }}</span>
            </div>
            <div class="text-caption text-grey-darken-1">{{ formatDate(inst.date) }}</div>
          </div>
          <v-btn-toggle
            v-model="inst.status"
            mandatory
            density="compact"
            color="success"
            rounded="lg"
            class="cashea-toggle"
            @update:modelValue="syncOverallStatus"
          >
            <v-btn value="POR_COBRAR" size="small" style="font-size: 0.7rem; min-width: 80px;">
              <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
              Por Cobrar
            </v-btn>
            <v-btn value="PAGADA" size="small" style="font-size: 0.7rem; min-width: 80px;">
              <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
              Pagada
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Resumen pendiente -->
        <div class="cashea-pending-row mt-4 pa-3 rounded-lg d-flex justify-space-between align-center">
          <div class="d-flex align-center gap-2">
            <v-icon size="16" color="warning">mdi-currency-usd-off</v-icon>
            <span class="text-caption font-weight-bold text-warning-darken-2">Por Cobrar</span>
          </div>
          <span class="text-body-2 font-weight-bold">{{ formatCurrency(pendingAmount, credit.currency) }}</span>
        </div>
        <div class="cashea-collected-row mt-1 pa-3 rounded-lg d-flex justify-space-between align-center">
          <div class="d-flex align-center gap-2">
            <v-icon size="16" color="success">mdi-check-all</v-icon>
            <span class="text-caption font-weight-bold text-success">Cobrado</span>
          </div>
          <span class="text-body-2 font-weight-bold text-success">{{ formatCurrency(collectedAmount, credit.currency) }}</span>
        </div>

      </v-card-text>

      <!-- ── Footer ──────────────────────────────────────────────── -->
      <v-divider />
      <v-card-actions class="pa-4">
        <v-btn variant="text" color="grey-darken-1" @click="cancel">Cancelar</v-btn>
        <v-spacer />
        <v-btn
          color="black"
          style="background-color: #fdfa3d; color: #000;"
          variant="flat"
          :loading="saving"
          :disabled="!hasChanges"
          class="font-weight-bold px-6"
          @click="save"
        >
          <img src="/Cashea-black-icon.svg" alt="" width="14" height="14" class="mr-2" />
          Guardar Cambios
        </v-btn>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<script>
import invoiceService from '@/services/invoiceService.js';

export default {
  name: 'CasheaInstallmentsModal',

  props: {
    /** Controla la visibilidad del modal (v-model) */
    modelValue: {
      type: Boolean,
      default: false
    },
    /** Factura completa con financial.credit */
    invoice: {
      type: Object,
      default: null
    }
  },

  emits: ['update:modelValue', 'saved'],

  data() {
    return {
      saving: false,
      // Copias locales para edición
      localInstallments: [],
      localInitialStatus: 'POR_COBRAR',
      localStatus: 'CRÉDITO',
      // Snapshot inicial para detectar cambios
      _originalSnapshot: ''
    };
  },

  computed: {
    /** Datos del crédito Cashea de la factura activa */
    credit() {
      return {
        totalSales: this.invoice?.financial?.totalSales || 0,
        currency: this.invoice?.financial?.currency || 'VES',
        initialAmount: this.invoice?.financial?.credit?.initialAmount || 0,
        initialPercentage: this.invoice?.financial?.credit?.initialPercentage || 0,
        installments: this.invoice?.financial?.credit?.installments || []
      };
    },

    /** Total aún pendiente de cobrar */
    pendingAmount() {
      let pending = this.localInitialStatus === 'POR_COBRAR' ? this.credit.initialAmount : 0;
      this.localInstallments.forEach(inst => {
        if (inst.status === 'POR_COBRAR') pending += inst.amount;
      });
      return pending;
    },

    /** Total ya cobrado */
    collectedAmount() {
      return this.credit.totalSales - this.pendingAmount;
    },

    /** Color del chip de estatus general */
    statusChipColor() {
      if (this.localStatus === 'PAGADA') return 'success';
      if (this.localStatus === 'CRÉDITO') return 'warning';
      return 'grey';
    },

    /** Detecta si el usuario cambió algo respecto al estado original */
    hasChanges() {
      const currentSnapshot = JSON.stringify({
        initialStatus: this.localInitialStatus,
        installments: this.localInstallments.map(i => ({ id: i.id, status: i.status }))
      });
      return currentSnapshot !== this._originalSnapshot;
    }
  },

  watch: {
    /** Al abrir el modal, clonar los datos de la factura para edición local */
    modelValue(isOpen) {
      if (isOpen && this.invoice) {
        this.initLocalData();
      }
    }
  },

  methods: {
    /** Inicializa copias locales de los datos de la factura */
    initLocalData() {
      const credit = this.invoice?.financial?.credit;
      // Clonar cuotas profundamente
      this.localInstallments = JSON.parse(
        JSON.stringify(credit?.installments || [])
      );
      // Leer initialStatus (nuevo campo) o inferir desde el status general
      this.localInitialStatus = credit?.initialStatus || 'PAGADA'; // Default: inicial ya pagada
      this.localStatus = this.invoice?.status || 'CRÉDITO';

      // Guardar snapshot para detectar cambios
      this._originalSnapshot = JSON.stringify({
        initialStatus: this.localInitialStatus,
        installments: this.localInstallments.map(i => ({ id: i.id, status: i.status }))
      });
    },

    /** Recalcula el estatus general de la factura según el estado de todas las cuotas */
    syncOverallStatus() {
      const allPaid =
        this.localInitialStatus === 'PAGADA' &&
        this.localInstallments.every(i => i.status === 'PAGADA');
      this.localStatus = allPaid ? 'PAGADA' : 'CRÉDITO';
    },

    /** Guarda los cambios de cuotas en Supabase */
    async save() {
      if (!this.invoice?.id || !this.hasChanges) return;
      this.saving = true;
      try {
        // Construir el objeto credit actualizado
        const updatedCredit = {
          ...this.invoice.financial.credit,
          initialStatus: this.localInitialStatus,
          installments: this.localInstallments
        };

        // Construir payload para el servicio — solo modificamos financial
        const updatedInvoiceData = {
          ...this.invoice,
          status: this.localStatus,
          financial: {
            ...this.invoice.financial,
            credit: updatedCredit
          }
        };

        const result = await invoiceService.updateInvoice(this.invoice.id, updatedInvoiceData);

        if (result?.success === false) {
          throw new Error(result.message || 'Error al guardar');
        }

        // Emitir el objeto actualizado al padre para que actualice la lista
        this.$emit('saved', {
          ...this.invoice,
          status: this.localStatus,
          financial: {
            ...this.invoice.financial,
            credit: updatedCredit
          }
        });

        this.$emit('update:modelValue', false);
      } catch (err) {
        console.error('❌ [CasheaInstallmentsModal] Error al guardar:', err);
        // El snackbar de error lo manejará el componente padre si lo desea
      } finally {
        this.saving = false;
      }
    },

    /** Cancela sin guardar */
    cancel() {
      this.$emit('update:modelValue', false);
    },

    /** Formatea montos monetarios */
    formatCurrency(amount, currency = 'VES') {
      if (amount == null || isNaN(amount)) return '0,00';
      const formatted = Number(amount).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return currency === 'USD' ? `$ ${formatted}` : `Bs ${formatted}`;
    },

    /** Formatea fecha ISO a formato legible */
    formatDate(dateStr) {
      if (!dateStr) return '—';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
  }
};
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────── */
.cashea-modal__header {
  background: #fdfa3d;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.cashea-logo-badge {
  width: 36px;
  height: 36px;
  background: #000;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Filas de cuota ──────────────────────────────────────────── */
.cashea-summary {
  background: #f8f9ff;
  border: 1px solid #e8eaf6;
}

.cashea-row {
  background: #fafafa;
  border: 1px solid #eeeeee;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.cashea-row--paid {
  background: #f1faf5;
  border-color: #c8e6c9;
}

.cashea-pending-row {
  background: #fff8e1;
  border: 1px solid #ffe082;
}

.cashea-collected-row {
  background: #f1faf5;
  border: 1px solid #c8e6c9;
}

/* ── Toggle de estado ────────────────────────────────────────── */
.cashea-toggle {
  border: 1px solid #e0e0e0;
}

.cashea-toggle :deep(.v-btn) {
  height: 30px !important;
}

.cashea-toggle :deep(.v-btn--active) {
  font-weight: 600;
}
</style>
