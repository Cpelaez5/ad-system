<template>
  <!-- Modal Rápido de Cuotas Cashea -->
  <v-dialog
    :model-value="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
    max-width="480px"
    persistent
    @keydown.esc="cancel"
  >
    <v-card class="cashea-modal rounded-xl" style="overflow: hidden;">

      <!-- ── Header ─────────────────────────────────────────────── -->
      <div class="cashea-header d-flex align-center px-4 py-4">
        <!-- Badge con ícono Cashea (amarillo sobre azul) -->
        <div class="cashea-icon-badge flex-shrink-0">
          <img src="/Cashea-black-icon.svg" alt="Cashea" width="20" height="20" />
        </div>
        <!-- Título y subtítulo -->
        <div class="ml-3 flex-grow-1" style="min-width: 0;">
          <div class="cashea-header-title">Gestión de Cuotas Cashea</div>
          <div class="cashea-header-sub text-truncate">
            {{ invoice?.invoiceNumber }} &middot; {{ invoice?.client?.companyName || invoice?.issuer?.companyName || '—' }}
          </div>
        </div>
        <!-- Botón cerrar (blanco sobre azul) -->
        <v-btn icon="mdi-close" variant="text" size="small" color="white" style="opacity: 0.7;" class="ml-2 flex-shrink-0" @click="cancel" />
      </div>
      <v-divider style="border-color: rgba(255,255,255,0.15);" />

      <!-- ── Body ────────────────────────────────────────────────── -->
      <v-card-text class="px-4 pb-4 pt-3" style="max-height: 68vh; overflow-y: auto;">

        <!-- Resumen -->
        <div class="cashea-summary-row mb-4 pa-3 rounded-lg d-flex justify-space-between align-center">
          <div>
            <div class="text-caption text-grey mb-1">Total de la venta</div>
            <div class="text-h6 font-weight-bold text-grey-darken-3">
              {{ formatCurrency(credit.totalSales, credit.currency) }}
            </div>
          </div>
          <div class="text-right">
            <div class="text-caption text-grey mb-1">Estado general</div>
            <v-chip :color="statusChipColor" size="small" variant="tonal" class="font-weight-bold">
              {{ localStatus }}
            </v-chip>
          </div>
        </div>

        <!-- Pago Inicial -->
        <div class="cashea-section-label mb-2">Pago Inicial</div>
        <div class="cashea-installment-row rounded-lg mb-4 px-3 py-2 d-flex align-center justify-space-between"
             :class="{ 'cashea-installment-row--paid': localInitialStatus === 'PAGADA' }">
          <div style="min-width: 0;">
            <div class="text-body-2 font-weight-bold text-grey-darken-3">
              {{ formatCurrency(credit.initialAmount, credit.currency) }}
              <span class="text-caption text-grey ml-1">{{ credit.initialPercentage }}%</span>
            </div>
            <div class="text-caption text-grey">Al momento de la venta</div>
          </div>
          <v-btn-toggle
            v-model="localInitialStatus"
            mandatory
            density="compact"
            rounded="lg"
            :color="localInitialStatus === 'PAGADA' ? 'success' : 'warning'"
            class="cashea-toggle flex-shrink-0 ml-3"
            @update:modelValue="syncOverallStatus"
          >
            <v-btn value="POR_COBRAR" size="x-small" class="cashea-toggle-btn">
              <v-icon size="11" class="mr-1">mdi-clock-outline</v-icon>
              Por Cobrar
            </v-btn>
            <v-btn value="PAGADA" size="x-small" class="cashea-toggle-btn">
              <v-icon size="11" class="mr-1">mdi-check-circle</v-icon>
              Pagada
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Cuotas -->
        <div class="cashea-section-label mb-2">Cuotas ({{ localInstallments.length }})</div>
        <div
          v-for="(inst, idx) in localInstallments"
          :key="inst.id"
          class="cashea-installment-row rounded-lg mb-2 px-3 py-2 d-flex align-center justify-space-between"
          :class="{ 'cashea-installment-row--paid': inst.status === 'PAGADA' }"
        >
          <div style="min-width: 0;">
            <div class="text-body-2 font-weight-bold text-grey-darken-3">
              Cuota {{ idx + 1 }}
              <span class="text-caption text-grey ml-1">{{ formatCurrency(inst.amount, credit.currency) }}</span>
            </div>
            <div class="text-caption text-grey">{{ formatFriendlyDate(inst.date) }}</div>
          </div>
          <v-btn-toggle
            v-model="inst.status"
            mandatory
            density="compact"
            rounded="lg"
            :color="inst.status === 'PAGADA' ? 'success' : 'warning'"
            class="cashea-toggle flex-shrink-0 ml-3"
            @update:modelValue="syncOverallStatus"
          >
            <v-btn value="POR_COBRAR" size="x-small" class="cashea-toggle-btn">
              <v-icon size="11" class="mr-1">mdi-clock-outline</v-icon>
              Por Cobrar
            </v-btn>
            <v-btn value="PAGADA" size="x-small" class="cashea-toggle-btn">
              <v-icon size="11" class="mr-1">mdi-check-circle</v-icon>
              Pagada
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Resumen financiero -->
        <div class="cashea-financial mt-5 rounded-lg overflow-hidden d-flex flex-column gap-1">
          <div class="d-flex justify-space-between align-center px-4 py-2 rounded-t-lg" style="background-color: #fffbeb;">
            <div class="d-flex align-center gap-2">
              <v-icon size="16" color="#d97706">mdi-clock-outline</v-icon>
              <span class="text-caption font-weight-bold" style="color: #b45309;">Pendiente por Cobrar</span>
            </div>
            <span class="text-body-2 font-weight-bold" style="color: #b45309;">{{ formatCurrency(pendingAmount, credit.currency) }}</span>
          </div>
          <div class="d-flex justify-space-between align-center px-4 py-2 rounded-b-lg" style="background-color: #f0fdf4;">
            <div class="d-flex align-center gap-2">
              <v-icon size="16" color="#16a34a">mdi-check-circle</v-icon>
              <span class="text-caption font-weight-bold text-success">Total Cobrado</span>
            </div>
            <span class="text-body-2 font-weight-bold text-success">{{ formatCurrency(collectedAmount, credit.currency) }}</span>
          </div>
        </div>

      </v-card-text>

      <!-- ── Footer ──────────────────────────────────────────────── -->
      <v-divider />
      <v-card-actions class="px-4 py-3">
        <v-btn variant="text" color="grey" size="small" @click="cancel">Cancelar</v-btn>
        <v-spacer />
        <v-btn
          variant="flat"
          size="small"
          :loading="saving"
          :disabled="!hasChanges"
          class="cashea-save-btn px-4"
          @click="save"
        >
          <img src="/Cashea-black-icon.svg" alt="" width="12" height="12" class="mr-1" />
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

    /** Formatea fecha ISO a un formato más amigable (Ej: 15 Jun 2026) */
    formatFriendlyDate(dateStr) {
      if (!dateStr) return '—';
      const date = new Date(dateStr + 'T00:00:00'); // Evitar timezone issues
      return date.toLocaleDateString('es-VE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).replace('.', ''); // quitar punto del mes abreviado si lo hay
    }
  }
};
</script>

<style scoped>
/* ── Header ──────────────────────────────────────────────────── */
.cashea-header {
  background: linear-gradient(135deg, #1F355C 0%, #2d4a7c 100%);
}

.cashea-icon-badge {
  width: 40px;
  height: 40px;
  min-width: 40px;
  background: #fdfa3d;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cashea-header-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
}

.cashea-header-sub {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 1px;
}

/* ── Etiqueta de sección ─────────────────────────────────────── */
.cashea-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9e9e9e;
}

/* ── Resumen de totales ──────────────────────────────────────── */
.cashea-summary-row {
  background: #f8f9ff;
  border: 1px solid #e8eaf6;
  border-radius: 10px;
}

/* ── Filas de cuota ──────────────────────────────────────────── */
.cashea-installment-row {
  background: #fafafa;
  border: 1px solid #eeeeee;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.cashea-installment-row--paid {
  background: #f1faf5;
  border-color: #c8e6c9;
}

/* ── Toggle de estado ────────────────────────────────────────── */
.cashea-toggle {
  border: 1px solid #e0e0e0!important;
  background: #fff;
}

.cashea-toggle-btn {
  font-size: 0.68rem !important;
  letter-spacing: 0 !important;
  min-width: 78px !important;
  height: 28px !important;
}

/* ── Resumen financiero (eliminamos bordes del CSS para usar el inline) ── */
.cashea-financial {
  border: none;
}


/* ── Botón guardar ───────────────────────────────────────────── */
.cashea-save-btn {
  background-color: #fdfa3d !important;
  color: #000 !important;
  font-weight: 700 !important;
  border-radius: 8px !important;
}
.cashea-save-btn:disabled {
  background-color: #f5f5f5 !important;
  color: #bdbdbd !important;
}
</style>
