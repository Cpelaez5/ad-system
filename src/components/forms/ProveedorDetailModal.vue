<template>
  <!-- Renderizado: Fullscreen en Móvil (100% de pantalla) / Dialog en Desktop -->
  <v-dialog
    v-model="internalValue"
    :fullscreen="isMobile"
    :max-width="isMobile ? undefined : '780'"
    scrollable
    transition="dialog-bottom-transition"
  >
    <v-card class="proveedor-detail-card d-flex flex-column h-100" :class="{ 'rounded-0': isMobile, 'rounded-xl': !isMobile }">
      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 1. CABECERA INTEGRADA Y RESUMEN FINANCIERO SUPERIOR    -->
      <!-- ══════════════════════════════════════════════════════ -->
      <div class="flex-shrink-0 bg-secondary text-white">
        <!-- Barra de título y perfil -->
        <div class="pa-4 pa-md-5">
          <div class="d-flex align-start justify-space-between">
            <div class="d-flex align-center flex-grow-1 overflow-hidden mr-3">
              <v-avatar
                size="50"
                :color="detail?.tipo_persona === 'JURIDICA' ? 'primary' : 'accent'"
                class="mr-3 elevation-2 text-white font-weight-bold flex-shrink-0"
              >
                <v-icon size="26" color="white">
                  {{ detail?.tipo_persona === 'JURIDICA' ? 'mdi-domain' : 'mdi-account-tie' }}
                </v-icon>
              </v-avatar>

              <div class="overflow-hidden">
                <div class="d-flex align-center flex-wrap" style="gap: 8px;">
                  <h2 class="text-subtitle-1 text-md-h6 font-weight-bold text-truncate mb-0">
                    {{ detail?.nombre || 'Cargando proveedor...' }}
                  </h2>
                  <v-chip
                    size="x-small"
                    :color="detail?.tipo_persona === 'JURIDICA' ? 'blue-lighten-4' : 'amber-lighten-4'"
                    class="text-secondary font-weight-bold"
                  >
                    {{ detail?.tipo_persona === 'JURIDICA' ? 'JURÍDICA' : 'NATURAL' }}
                  </v-chip>
                </div>

                <div class="d-flex align-center mt-1 flex-wrap" style="gap: 8px;">
                  <span class="text-caption text-grey-lighten-2 font-mono">
                    RIF: {{ detail?.rif }}
                  </span>
                  <v-btn
                    size="x-small"
                    variant="tonal"
                    color="white"
                    prepend-icon="mdi-content-copy"
                    class="text-caption"
                    @click="copyRif(detail?.rif)"
                  >
                    {{ copied ? '¡Copiado!' : 'Copiar' }}
                  </v-btn>
                </div>
              </div>
            </div>

            <v-btn
              icon="mdi-close"
              variant="text"
              density="comfortable"
              color="white"
              @click="close"
            ></v-btn>
          </div>

          <!-- Resumen de Métricas Superiores -->
          <v-row dense class="mt-3 pt-3 border-t-subtle">
            <v-col cols="4" class="text-center">
              <div class="text-caption text-grey-lighten-2">Total Compras</div>
              <div class="text-body-2 text-sm-subtitle-2 font-weight-bold text-accent">
                Bs. {{ formatMoney(detail?.metricas?.totalCompras || 0) }}
              </div>
            </v-col>
            <v-col cols="4" class="text-center border-l-subtle border-r-subtle">
              <div class="text-caption text-grey-lighten-2">Total Retenido</div>
              <div class="text-body-2 text-sm-subtitle-2 font-weight-bold text-white">
                Bs. {{ formatMoney(detail?.metricas?.totalRetenido || 0) }}
              </div>
            </v-col>
            <v-col cols="4" class="text-center">
              <div class="text-caption text-grey-lighten-2">Operaciones</div>
              <div class="text-body-2 text-sm-subtitle-2 font-weight-bold text-white">
                {{ detail?.metricas?.totalFacturas || 0 }} facturas
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Pestañas Integradas -->
        <v-tabs
          v-model="activeTab"
          color="accent"
          bg-color="rgba(0, 0, 0, 0.2)"
          grow
          height="48"
          slider-color="accent"
        >
          <v-tab value="fiscal" class="font-weight-bold text-white">
            <v-icon start size="18" color="white">mdi-shield-account-outline</v-icon>
            Perfil Fiscal
          </v-tab>
          <v-tab value="compras" class="font-weight-bold text-white">
            <v-icon start size="18" color="white">mdi-receipt-text-outline</v-icon>
            Compras ({{ detail?.facturasRecientes?.length || 0 }})
          </v-tab>
          <v-tab value="retenciones" class="font-weight-bold text-white">
            <v-icon start size="18" color="white">mdi-file-percent-outline</v-icon>
            Retenciones ({{ detail?.retencionesRecientes?.length || 0 }})
          </v-tab>
        </v-tabs>
      </div>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 2. CONTENIDO SCROLLABLE DE CADA PESTAÑA                -->
      <!-- ══════════════════════════════════════════════════════ -->
      <v-card-text class="flex-grow-1 pa-4 pa-md-5 bg-grey-lighten-5 overflow-y-auto">
        <div v-if="loading" class="py-8 text-center">
          <v-progress-circular indeterminate color="secondary" size="40" />
          <div class="text-caption text-grey mt-2">Cargando ficha 360 del proveedor...</div>
        </div>

        <v-window v-else v-model="activeTab">
          <!-- PESTAÑA A: PERFIL FISCAL Y CONTACTO -->
          <v-window-item value="fiscal">
            <v-row dense>
              <!-- Tarjeta 1: Contacto Directo -->
              <v-col cols="12" md="6">
                <v-card class="pa-4 rounded-xl elevation-1 mb-3 bg-white h-100">
                  <div class="text-caption font-weight-bold text-secondary text-uppercase mb-3 d-flex align-center">
                    <v-icon start size="16" color="secondary">mdi-card-account-phone</v-icon>
                    Contacto Directo
                  </div>

                  <div class="mb-2">
                    <span class="text-caption text-grey">Teléfono:</span>
                    <div class="text-body-2 font-weight-medium">
                      <a v-if="detail?.telefono" :href="'tel:' + detail.telefono" class="text-secondary text-decoration-none">
                        {{ detail.telefono }}
                      </a>
                      <span v-else class="text-grey">No registrado</span>
                    </div>
                  </div>

                  <div class="mb-2">
                    <span class="text-caption text-grey">Email:</span>
                    <div class="text-body-2 font-weight-medium">
                      <a v-if="detail?.email" :href="'mailto:' + detail.email" class="text-secondary text-decoration-none">
                        {{ detail.email }}
                      </a>
                      <span v-else class="text-grey">No registrado</span>
                    </div>
                  </div>

                  <div>
                    <span class="text-caption text-grey">Contacto:</span>
                    <div class="text-body-2 font-weight-medium text-grey-darken-3">
                      {{ detail?.contacto_nombre || 'General' }}
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- Tarjeta 2: Ubicación Fiscal -->
              <v-col cols="12" md="6">
                <v-card class="pa-4 rounded-xl elevation-1 mb-3 bg-white h-100">
                  <div class="text-caption font-weight-bold text-secondary text-uppercase mb-3 d-flex align-center">
                    <v-icon start size="16" color="secondary">mdi-map-marker-radius</v-icon>
                    Ubicación Fiscal
                  </div>

                  <div class="mb-2">
                    <span class="text-caption text-grey">Municipio:</span>
                    <div class="text-body-2 font-weight-bold text-grey-darken-3">
                      {{ detail?.municipio?.nombre || 'No asignado' }}
                    </div>
                  </div>

                  <div>
                    <span class="text-caption text-grey">Dirección:</span>
                    <div class="text-body-2 text-grey-darken-3">
                      {{ detail?.direccion || 'Sin dirección fiscal registrada' }}
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- Tarjeta 3: Parámetros Tributarios Configurados -->
              <v-col cols="12">
                <v-card class="pa-4 rounded-xl elevation-1 bg-white">
                  <div class="text-caption font-weight-bold text-secondary text-uppercase mb-3 d-flex align-center">
                    <v-icon start size="16" color="secondary">mdi-calculator-variant</v-icon>
                    Retenciones Fiscales Configuradas
                  </div>

                  <div class="d-flex flex-wrap align-center mb-3" style="gap: 8px;">
                    <v-chip color="secondary" variant="flat" size="small" class="font-weight-bold">
                      <v-icon start size="14">mdi-receipt</v-icon>
                      IVA Retención: {{ detail?.iva_retention_rate || 0 }}%
                    </v-chip>

                    <v-chip
                      v-if="detail?.concepto_islr"
                      color="primary"
                      variant="flat"
                      size="small"
                      class="font-weight-bold"
                    >
                      <v-icon start size="14">mdi-file-percent</v-icon>
                      ISLR: {{ detail.concepto_islr.nombre }} ({{ detail.concepto_islr.porcentaje_retencion }}%)
                    </v-chip>

                    <v-chip
                      v-if="detail?.municipal_rate"
                      color="accent"
                      variant="flat"
                      size="small"
                      class="text-black font-weight-bold"
                    >
                      <v-icon start size="14">mdi-city</v-icon>
                      Municipal: {{ detail.municipal_rate }}%
                    </v-chip>
                  </div>

                  <div v-if="detail?.licencia_actividad_economica" class="text-caption text-grey-darken-2">
                    <strong>N° Licencia Económica:</strong> {{ detail.licencia_actividad_economica }}
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- PESTAÑA B: HISTORIAL DE COMPRAS -->
          <v-window-item value="compras">
            <div v-if="!detail?.facturasRecientes || detail.facturasRecientes.length === 0" class="text-center py-8">
              <v-icon size="40" color="grey-lighten-1">mdi-receipt-text-arrow-right</v-icon>
              <div class="text-caption text-grey mt-2">Aún no hay compras registradas con este proveedor</div>
            </div>

            <v-table v-else density="comfortable" class="rounded-xl elevation-1 bg-white">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="text-left font-weight-bold text-secondary">N° Factura</th>
                  <th class="text-left font-weight-bold text-secondary">Fecha</th>
                  <th class="text-right font-weight-bold text-secondary">Monto Total</th>
                  <th class="text-center font-weight-bold text-secondary">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in detail.facturasRecientes" :key="f.id">
                  <td class="font-weight-bold font-mono text-secondary">
                    {{ f.invoice_number }}
                    <span v-if="f.control_number" class="text-caption text-grey ml-1">({{ f.control_number }})</span>
                  </td>
                  <td class="text-body-2">{{ formatDate(f.issue_date) }}</td>
                  <td class="text-right font-weight-bold text-secondary">
                    Bs. {{ formatMoney(f.financial?.totalSales || 0) }}
                  </td>
                  <td class="text-center">
                    <v-chip size="x-small" :color="f.status === 'PAGADA' ? 'success' : 'info'" variant="flat">
                      {{ f.status }}
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>

          <!-- PESTAÑA C: RETENCIONES HISTÓRICAS -->
          <v-window-item value="retenciones">
            <div v-if="!detail?.retencionesRecientes || detail.retencionesRecientes.length === 0" class="text-center py-8">
              <v-icon size="40" color="grey-lighten-1">mdi-shield-check-outline</v-icon>
              <div class="text-caption text-grey mt-2">No se han emitido comprobantes de retención a este proveedor</div>
            </div>

            <v-table v-else density="comfortable" class="rounded-xl elevation-1 bg-white">
              <thead>
                <tr class="bg-grey-lighten-4">
                  <th class="text-left font-weight-bold text-secondary">Comprobante</th>
                  <th class="text-left font-weight-bold text-secondary">Tipo</th>
                  <th class="text-left font-weight-bold text-secondary">Factura</th>
                  <th class="text-right font-weight-bold text-secondary">Retenido</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in detail.retencionesRecientes" :key="r.id">
                  <td class="font-mono font-weight-bold text-secondary">
                    {{ r.numero_comprobante }}
                  </td>
                  <td>
                    <v-chip
                      size="x-small"
                      :color="r.tipo === 'IVA' ? 'secondary' : (r.tipo === 'ISLR' ? 'primary' : 'accent')"
                      :class="{ 'text-black font-weight-bold': r.tipo === 'MUNICIPAL' }"
                      variant="flat"
                    >
                      {{ r.tipo }}
                    </v-chip>
                  </td>
                  <td class="text-body-2 text-grey-darken-2">
                    {{ r.factura_numero || '-' }}
                  </td>
                  <td class="text-right font-weight-bold text-primary">
                    Bs. {{ formatMoney(r.monto_retenido || 0) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-window-item>
        </v-window>
      </v-card-text>

      <!-- ══════════════════════════════════════════════════════ -->
      <!-- 3. PIE DE PÁGINA (ACCIONES)                            -->
      <!-- ══════════════════════════════════════════════════════ -->
      <v-card-actions class="flex-shrink-0 pa-4 bg-white border-t d-flex justify-space-between align-center">
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-pencil"
          height="42"
          class="font-weight-bold px-4 rounded-lg"
          @click="onEditClick"
        >
          Editar Proveedor
        </v-btn>

        <v-btn
          variant="flat"
          color="grey-darken-2"
          height="42"
          class="font-weight-bold px-6 rounded-lg text-white"
          @click="close"
        >
          Cerrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import proveedorService from '@/services/proveedorService.js'

export default {
  name: 'ProveedorDetailModal',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    proveedorId: {
      type: String,
      default: null
    }
  },
  emits: ['update:modelValue', 'edit'],
  data() {
    return {
      internalValue: this.modelValue,
      activeTab: 'fiscal',
      loading: false,
      detail: null,
      copied: false
    }
  },
  computed: {
    isMobile() {
      return this.$vuetify?.display?.smAndDown || false
    }
  },
  watch: {
    modelValue(val) {
      this.internalValue = val
      if (val && this.proveedorId) {
        this.loadDetail()
      }
    },
    internalValue(val) {
      this.$emit('update:modelValue', val)
    },
    proveedorId(newId) {
      if (newId && this.internalValue) {
        this.loadDetail()
      }
    }
  },
  methods: {
    async loadDetail() {
      if (!this.proveedorId) return
      this.loading = true
      this.activeTab = 'fiscal'
      try {
        const data = await proveedorService.getProveedorById(this.proveedorId)
        this.detail = data
      } catch (e) {
        console.error('Error cargando detalle de proveedor:', e)
      } finally {
        this.loading = false
      }
    },
    copyRif(rif) {
      if (!rif) return
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rif)
        this.copied = true
        setTimeout(() => { this.copied = false }, 2000)
      }
    },
    onEditClick() {
      this.$emit('edit', this.detail)
      this.close()
    },
    close() {
      this.internalValue = false
    },
    formatMoney(val) {
      const num = Number(val || 0)
      return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    formatDate(dateStr) {
      if (!dateStr) return '-'
      const parts = dateStr.split('-')
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
      return dateStr
    }
  }
}
</script>

<style scoped>
.proveedor-detail-card {
  overflow: hidden;
}

.border-t-subtle {
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.border-l-subtle {
  border-left: 1px solid rgba(255, 255, 255, 0.15);
}

.border-r-subtle {
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}

.font-mono {
  font-family: monospace;
}

.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}
</style>
