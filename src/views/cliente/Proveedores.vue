<template>
  <div class="proveedores">
    <!-- ═════════════ CARGANDO ═════════════ -->
    <template v-if="loading">
      <v-skeleton-loader type="heading, text" class="mb-6 bg-transparent" max-width="420" />
      <v-skeleton-loader type="image" height="110" class="rounded-xl mb-4" />
      <v-skeleton-loader type="list-item-avatar-two-line@6" class="rounded-xl" />
    </template>

    <!-- ═════════════ CONTENIDO ═════════════ -->
    <template v-else>
      <EncabezadoPagina
        titulo="Mis proveedores"
        subtitulo="Directorio con los parámetros fiscales para compras y retenciones"
      >
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" class="text-none" @click="openCreateModal">
          Nuevo proveedor
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable" min-width="220">
            <v-list-item prepend-icon="mdi-refresh" title="Actualizar" @click="loadData" />
            <v-list-item prepend-icon="mdi-file-excel-outline" title="Exportar a Excel" :disabled="exporting" @click="exportToExcel" />
          </v-list>
        </v-menu>
      </EncabezadoPagina>

      <!-- RESUMEN + SIGUIENTE PASO -->
      <div class="proveedores__panel">
        <section class="proveedores__resumen" aria-label="Resumen de tus proveedores">
          <p v-if="fraseResumen" class="proveedores__frase">{{ fraseResumen }}</p>
          <v-text-field
            v-model="searchQuery"
            placeholder="Buscar por nombre, RIF o municipio"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            class="proveedores__buscador"
          />
        </section>

        <PanelSiguientePaso
          :listo="proveedoresIncompletos.length === 0"
          titulo="Completa el RIF"
          :detalle="`${proveedoresIncompletos.length} proveedor${proveedoresIncompletos.length === 1 ? '' : 'es'} ${proveedoresIncompletos.length === 1 ? 'no tiene' : 'no tienen'} un RIF válido. Complétalo para poder aplicarle las retenciones correctas.`"
          texto-boton="Completar ahora"
          icono-boton="mdi-card-account-details-outline"
          titulo-listo="¡Tu directorio está completo!"
          detalle-listo="Todos tus proveedores tienen su RIF registrado y listo para retenciones."
          @accion="irAIncompletos"
        />
      </div>

      <!-- FILTROS -->
      <FiltroChips v-model="activeFilter" :opciones="opcionesFiltro" etiqueta="Filtrar proveedores" class="mb-4" />

      <!-- ESTADO VACÍO -->
      <EstadoVacio
        v-if="filteredProveedores.length === 0"
        :icono="(searchQuery || activeFilter !== 'ALL') ? 'mdi-filter-remove-outline' : 'mdi-domain-off'"
        :titulo="(searchQuery || activeFilter !== 'ALL') ? 'No hay resultados con estos filtros' : 'Todavía no tienes proveedores'"
        :mensaje="(searchQuery || activeFilter !== 'ALL')
          ? 'Prueba con otra búsqueda o quita algún filtro.'
          : 'Registra tus proveedores con sus parámetros fiscales para automatizar compras y comprobantes de retención.'"
        :texto-accion="(searchQuery || activeFilter !== 'ALL') ? 'Limpiar filtros' : 'Registrar primer proveedor'"
        @accion="(searchQuery || activeFilter !== 'ALL') ? limpiarFiltros() : openCreateModal()"
      />

      <!-- LISTA -->
      <template v-else>
        <SeccionLista :meta="`${filteredProveedores.length} proveedor${filteredProveedores.length === 1 ? '' : 'es'}`">
          <div
            v-for="prov in paginatedProveedores"
            :key="prov.id"
            class="fila-proveedor"
            role="button"
            tabindex="0"
            @click="openDetailModal(prov)"
            @keydown.enter.self="openDetailModal(prov)"
          >
            <span
              class="fila-proveedor__icono"
              :class="prov.tipo_persona === 'JURIDICA' ? 'fila-proveedor__icono--empresa' : 'fila-proveedor__icono--persona'"
              aria-hidden="true"
            >
              <v-icon :icon="prov.tipo_persona === 'JURIDICA' ? 'mdi-domain' : 'mdi-account'" size="22" />
            </span>

            <div class="fila-proveedor__texto">
              <div class="fila-proveedor__nombre">{{ prov.nombre }}</div>
              <div class="fila-proveedor__rif">
                <span class="font-mono">{{ prov.rif }}</span>
                <v-btn
                  icon="mdi-content-copy"
                  variant="text"
                  density="compact"
                  size="x-small"
                  aria-label="Copiar RIF"
                  @click.stop="copyRif(prov.rif)"
                />
                <span v-if="esIncompleto(prov)" class="text-error font-weight-medium">· Falta un RIF válido</span>
              </div>
              <div v-if="tieneChipsFiscales(prov)" class="fila-proveedor__chips">
                <v-chip v-if="Number(prov.iva_retention_rate) > 0" size="small" variant="tonal" color="secondary">
                  Ret. IVA {{ prov.iva_retention_rate }}%
                </v-chip>
                <v-chip v-if="prov.islr_codigo || prov.islr_concept_id" size="small" variant="tonal" color="secondary">
                  ISLR {{ prov.islr_codigo || '—' }}
                </v-chip>
                <v-chip v-if="Number(prov.municipal_rate) > 0" size="small" variant="tonal" color="secondary">
                  Municipal {{ prov.municipal_rate }}%
                </v-chip>
              </div>
            </div>

            <div class="fila-proveedor__derecha">
              <div class="fila-proveedor__valor">{{ formatMoney(prov.total_compras || 0, 'VES') }}</div>
              <div class="fila-proveedor__valor-secundario">{{ prov.total_facturas || 0 }} compra{{ (prov.total_facturas || 0) === 1 ? '' : 's' }}</div>
            </div>

            <div class="fila-proveedor__acciones" @click.stop>
              <v-btn variant="tonal" color="secondary" prepend-icon="mdi-eye-outline" class="text-none fila-proveedor__accion" @click="openDetailModal(prov)">
                Ver
              </v-btn>
              <v-menu location="bottom end">
                <template #activator="{ props: menuProps }">
                  <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" aria-label="Más opciones" />
                </template>
                <v-list density="comfortable">
                  <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" @click="openEditModal(prov)" />
                  <v-list-item prepend-icon="mdi-delete-outline" base-color="error" title="Eliminar" @click="confirmDelete(prov)" />
                </v-list>
              </v-menu>
            </div>
          </div>
        </SeccionLista>

        <div v-if="pageCount > 1" class="d-flex justify-center mt-4">
          <v-pagination
            v-model="page"
            :length="pageCount"
            density="comfortable"
            size="small"
            total-visible="5"
            color="secondary"
          />
        </div>
      </template>
    </template>

    <!-- ═════════════ MODALES ═════════════ -->
    <ProveedorModalForm
      v-model="formModalOpen"
      :proveedor="selectedProveedor"
      @saved="onProveedorSaved"
    />

    <ProveedorDetailModal
      v-model="detailModalOpen"
      :proveedor-id="selectedProveedor?.id"
      @edit="openEditModal"
    />

    <DialogoAdaptable
      v-model="deleteDialogOpen"
      titulo="¿Eliminar proveedor?"
      icono="mdi-alert-circle-outline"
      max-width="460"
      persistent
      :cargando="deleting"
    >
      <p class="mb-2">
        ¿Estás seguro de que deseas eliminar a <strong>{{ providerToDelete?.nombre }}</strong> (RIF: {{ providerToDelete?.rif }})?
      </p>
      <p class="text-caption text-medium-emphasis mb-0">
        Si este proveedor tiene compras o retenciones registradas, se archivará de forma segura para preservar la integridad de tus libros fiscales.
      </p>

      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="deleting" @click="deleteDialogOpen = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="deleting" @click="executeDelete">Confirmar</v-btn>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script>
import ProveedorModalForm from '@/components/forms/ProveedorModalForm.vue'
import ProveedorDetailModal from '@/components/forms/ProveedorDetailModal.vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import proveedorService from '@/services/proveedorService.js'
import { normalizarRif } from '@/utils/rif.js'
import { formatMoney } from '@/utils/formatMoney.js'

export default {
  name: 'ProveedoresView',
  components: {
    ProveedorModalForm,
    ProveedorDetailModal,
    EncabezadoPagina,
    EstadoVacio,
    DialogoAdaptable,
    PanelSiguientePaso,
    FiltroChips,
    SeccionLista
  },
  data() {
    return {
      loading: true,
      exporting: false,
      deleting: false,
      proveedores: [],
      searchQuery: '',
      activeFilter: 'ALL',
      page: 1,
      itemsPerPage: 10,

      // Modales
      formModalOpen: false,
      detailModalOpen: false,
      deleteDialogOpen: false,
      selectedProveedor: null,
      providerToDelete: null
    }
  },
  computed: {
    // Un proveedor "incompleto" es aquel cuyo RIF no normaliza a un RIF
    // válido del SENIAT (p. ej. el placeholder "PROV-172633444" que se
    // autogenera al descubrir un proveedor desde una factura sin RIF
    // legible). Sin un RIF válido no se le puede aplicar una retención.
    proveedoresIncompletos() {
      return this.proveedores.filter(p => this.esIncompleto(p))
    },
    fraseResumen() {
      const total = this.proveedores.length
      if (total === 0) return ''
      const inc = this.proveedoresIncompletos.length
      let frase = `Tienes ${total} proveedor${total === 1 ? '' : 'es'}`
      if (inc > 0) frase += `; a ${inc} le${inc === 1 ? '' : 's'} falta el RIF`
      return frase + '.'
    },
    opcionesFiltro() {
      return [
        { valor: 'ALL', texto: 'Todos', cantidad: this.proveedores.length },
        { valor: 'JURIDICA', texto: 'Empresas', cantidad: this.contarFiltro('JURIDICA') },
        { valor: 'NATURAL', texto: 'Personas', cantidad: this.contarFiltro('NATURAL') },
        { valor: 'CON_RETENCION', texto: 'Con retención', cantidad: this.contarFiltro('CON_RETENCION') },
        { valor: 'INCOMPLETOS', texto: 'Datos incompletos', cantidad: this.proveedoresIncompletos.length, deshabilitado: this.proveedoresIncompletos.length === 0 }
      ]
    },
    filteredProveedores() {
      let list = this.proveedores.filter(p => this.cumpleFiltro(p, this.activeFilter))

      if (this.searchQuery && this.searchQuery.trim()) {
        const s = this.searchQuery.toLowerCase().trim()
        list = list.filter(p =>
          (p.nombre && p.nombre.toLowerCase().includes(s)) ||
          (p.rif && p.rif.toLowerCase().includes(s)) ||
          (p.licencia_actividad_economica && p.licencia_actividad_economica.toLowerCase().includes(s)) ||
          (p.municipio_nombre && p.municipio_nombre.toLowerCase().includes(s))
        )
      }

      return list
    },
    pageCount() {
      return Math.ceil(this.filteredProveedores.length / this.itemsPerPage) || 1
    },
    paginatedProveedores() {
      const start = (this.page - 1) * this.itemsPerPage
      return this.filteredProveedores.slice(start, start + this.itemsPerPage)
    }
  },
  watch: {
    searchQuery() {
      this.page = 1
    },
    activeFilter() {
      this.page = 1
    }
  },
  mounted() {
    this.loadData()
    window.addEventListener('ad-proveedor-changed', this.handleProviderChange)
  },
  beforeUnmount() {
    window.removeEventListener('ad-proveedor-changed', this.handleProviderChange)
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const list = await proveedorService.getProveedores({ onlyActive: true })
        this.proveedores = list || []
      } catch (e) {
        console.error('Error cargando proveedores:', e)
        this.$root?.showSnackbar?.('Error al cargar la lista de proveedores', 'error')
      } finally {
        this.loading = false
      }
    },
    handleProviderChange() {
      this.loadData()
    },
    esIncompleto(p) {
      return !normalizarRif(p.rif)
    },
    tieneChipsFiscales(p) {
      return Number(p.iva_retention_rate) > 0 || Boolean(p.islr_codigo || p.islr_concept_id) || Number(p.municipal_rate) > 0
    },
    cumpleFiltro(p, filtro) {
      if (filtro === 'JURIDICA') return p.tipo_persona === 'JURIDICA'
      if (filtro === 'NATURAL') return p.tipo_persona === 'NATURAL'
      if (filtro === 'CON_RETENCION') return this.tieneChipsFiscales(p)
      if (filtro === 'INCOMPLETOS') return this.esIncompleto(p)
      return true
    },
    contarFiltro(filtro) {
      return this.proveedores.filter(p => this.cumpleFiltro(p, filtro)).length
    },
    limpiarFiltros() {
      this.searchQuery = ''
      this.activeFilter = 'ALL'
    },
    irAIncompletos() {
      this.searchQuery = ''
      this.activeFilter = 'INCOMPLETOS'
      this.page = 1
    },
    openCreateModal() {
      this.selectedProveedor = null
      this.formModalOpen = true
    },
    openEditModal(prov) {
      this.selectedProveedor = { ...prov }
      this.formModalOpen = true
    },
    openDetailModal(prov) {
      this.selectedProveedor = { ...prov }
      this.detailModalOpen = true
    },
    onProveedorSaved() {
      this.$root?.showSnackbar?.('Proveedor guardado exitosamente', 'success')
      this.loadData()
    },
    confirmDelete(prov) {
      this.providerToDelete = prov
      this.deleteDialogOpen = true
    },
    async executeDelete() {
      if (!this.providerToDelete) return
      this.deleting = true
      try {
        const res = await proveedorService.deleteProveedor(this.providerToDelete.id, this.providerToDelete.rif)
        if (res.success) {
          this.$root?.showSnackbar?.(res.message || 'Operación completada', 'success')
          this.deleteDialogOpen = false
          this.loadData()
        } else {
          this.$root?.showSnackbar?.(res.error || 'Error al eliminar', 'error')
        }
      } catch (e) {
        console.error('Error eliminando:', e)
        this.$root?.showSnackbar?.('Error inesperado al eliminar', 'error')
      } finally {
        this.deleting = false
      }
    },
    copyRif(rif) {
      if (!rif) return
      if (navigator.clipboard) {
        navigator.clipboard.writeText(rif)
        this.$root?.showSnackbar?.(`RIF ${rif} copiado al portapapeles`, 'info')
      }
    },
    async exportToExcel() {
      this.exporting = true
      try {
        const ExcelJS = await import('exceljs')
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Directorio de Proveedores')

        worksheet.columns = [
          { header: 'Razón Social', key: 'nombre', width: 35 },
          { header: 'RIF', key: 'rif', width: 18 },
          { header: 'Tipo', key: 'tipo_persona', width: 15 },
          { header: 'Teléfono', key: 'telefono', width: 18 },
          { header: 'Email', key: 'email', width: 28 },
          { header: 'Retención IVA %', key: 'iva_retention_rate', width: 16 },
          { header: 'Concepto ISLR', key: 'islr_nombre', width: 32 },
          { header: 'Alícuota Municipal %', key: 'municipal_rate', width: 20 },
          { header: 'Municipio', key: 'municipio_nombre', width: 20 },
          { header: 'Compras Acumuladas (Bs)', key: 'total_compras', width: 25 },
          { header: 'Total Retenido (Bs)', key: 'total_retenido', width: 22 }
        ]

        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2A2E' } }

        this.filteredProveedores.forEach(p => {
          worksheet.addRow({
            nombre: p.nombre,
            rif: p.rif,
            tipo_persona: p.tipo_persona,
            telefono: p.telefono || '-',
            email: p.email || '-',
            iva_retention_rate: p.iva_retention_rate || 0,
            islr_nombre: p.islr_nombre || '-',
            municipal_rate: p.municipal_rate || 0,
            municipio_nombre: p.municipio_nombre || '-',
            total_compras: p.total_compras || 0,
            total_retenido: p.total_retenido || 0
          })
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Directorio_Proveedores_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)

        this.$root?.showSnackbar?.('Directorio exportado exitosamente', 'success')
      } catch (e) {
        console.error('Error exportando Excel:', e)
        this.$root?.showSnackbar?.('Error al exportar directorio', 'error')
      } finally {
        this.exporting = false
      }
    },
    formatMoney(val, moneda) {
      return formatMoney(val, moneda)
    }
  }
}
</script>

<style scoped>
.proveedores {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

@media (min-width: 960px) {
  .proveedores { padding: 32px 32px 64px; }
}

/* ── Resumen + siguiente paso ── */
.proveedores__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 8px 0 24px;
}

@media (min-width: 960px) {
  .proveedores__panel { grid-template-columns: 7fr 5fr; }
}

.proveedores__resumen {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 20px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: center;
}

@media (max-width: 599px) {
  .proveedores__resumen { padding: 18px; }
}

.proveedores__frase {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.proveedores__buscador {
  max-width: 420px;
  flex: 0 0 auto;
}

/* ── Fila de proveedor ── */
.fila-proveedor {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-height: 72px;
  cursor: pointer;
  transition: background-color var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.fila-proveedor:hover {
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.fila-proveedor:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.fila-proveedor__icono {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fila-proveedor__icono--empresa { background: rgba(var(--v-theme-secondary), 0.1); color: rgb(var(--v-theme-secondary)); }
.fila-proveedor__icono--persona { background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); }

.fila-proveedor__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.fila-proveedor__nombre {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fila-proveedor__rif {
  margin-top: 2px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
  display: flex;
  align-items: center;
  gap: 2px;
}

.fila-proveedor__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.fila-proveedor__derecha {
  flex: 0 0 auto;
  text-align: right;
}

.fila-proveedor__valor {
  font-size: 0.9375rem;
  font-weight: 700;
  white-space: nowrap;
  color: rgb(var(--v-theme-on-surface));
}

.fila-proveedor__valor-secundario {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

.fila-proveedor__acciones {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.fila-proveedor__accion {
  min-width: 96px;
}

.font-mono {
  font-family: monospace;
}

/* Teléfono: valor y acción bajan a su propia línea, a todo el ancho */
@media (max-width: 599px) {
  .fila-proveedor {
    flex-wrap: wrap;
    row-gap: 10px;
  }
  .fila-proveedor__texto {
    flex: 1 1 calc(100% - 58px);
  }
  .fila-proveedor__derecha {
    flex: 1 1 100%;
    padding-left: 58px;
    text-align: left;
  }
  .fila-proveedor__acciones {
    flex: 1 1 100%;
    padding-left: 58px;
  }
  .fila-proveedor__acciones .fila-proveedor__accion,
  .fila-proveedor__acciones > .v-btn:first-child {
    flex: 1 1 auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fila-proveedor { transition: none; }
}
</style>
