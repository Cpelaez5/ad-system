<template>
  <v-container fluid class="pa-4 pa-md-6 bg-background min-vh-100">
    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 1. CABECERA & ACCIONES PRINCIPALES                     -->
    <!-- ══════════════════════════════════════════════════════ -->
    <div class="d-flex flex-column flex-sm-row align-start align-sm-center justify-space-between mb-6" style="gap: 16px;">
      <div>
        
      </div>

      <!-- Botones de Acción Superiores -->
      <div class="d-flex align-center flex-wrap" style="gap: 10px;">
        <v-btn
          icon="mdi-refresh"
          variant="tonal"
          color="secondary"
          density="comfortable"
          :loading="loading"
          @click="loadData"
          title="Actualizar datos"
        ></v-btn>

        <v-btn
          color="white"
          variant="elevated"
          prepend-icon="mdi-file-excel-outline"
          class="text-secondary font-weight-bold elevation-1"
          @click="exportToExcel"
          :loading="exporting"
        >
          Exportar Excel
        </v-btn>

        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          class="elevation-2 font-weight-bold"
          @click="openCreateModal"
        >
          Nuevo Proveedor
        </v-btn>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 2. TARJETAS DE KPIS Y MÉTRICAS FINANCIERAS (RESPONSIVE)-->
    <!-- ══════════════════════════════════════════════════════ -->
    <v-row class="mb-6">
      <!-- KPI 1: Total Proveedores -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="custom-kpi-card pa-4 rounded-xl elevation-1" style="background-color: #02254d; color: white;">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-medium text-grey-lighten-2 text-uppercase letter-spacing-1">
              Directorio Activo
            </span>
            <v-avatar size="32" color="rgba(255,255,255,0.15)">
              <v-icon size="18" color="white">mdi-domain</v-icon>
            </v-avatar>
          </div>
          <div class="kpi-value text-white mb-1">
            <AnimatedNumber :value="kpis.total" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
          </div>
          <div class="text-caption text-grey-lighten-2">
            Total Proveedores Registrados
          </div>
        </v-card>
      </v-col>

      <!-- KPI 2: Empresas / Naturales -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="custom-kpi-card pa-4 rounded-xl elevation-1" style="background-color: #f2b648; color: #1a1a1a;">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-uppercase letter-spacing-1 text-black">
              Distribución Fiscal
            </span>
            <v-avatar size="32" color="rgba(0,0,0,0.1)">
              <v-icon size="18" color="black">mdi-account-group-outline</v-icon>
            </v-avatar>
          </div>
          <div class="kpi-value text-black mb-1">
            <AnimatedNumber :value="kpis.juridicas" :minimum-fraction-digits="0" :maximum-fraction-digits="0" /> <span class="text-body-1 font-weight-medium text-grey-darken-3">Jurídicas</span> • <AnimatedNumber :value="kpis.naturales" :minimum-fraction-digits="0" :maximum-fraction-digits="0" /> <span class="text-body-1 font-weight-medium text-grey-darken-3">Nat.</span>
          </div>
          <div class="text-caption text-grey-darken-4 font-weight-medium">
            Empresas vs Personas Naturales
          </div>
        </v-card>
      </v-col>

      <!-- KPI 3: Compras Acumuladas -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="custom-kpi-card pa-4 rounded-xl elevation-1" style="background-color: #f0d29b; color: #1a1a1a;">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-bold text-uppercase letter-spacing-1 text-black">
              Compras Acumuladas
            </span>
            <v-avatar size="32" color="rgba(0,0,0,0.1)">
              <v-icon size="18" color="black">mdi-cash-multiple</v-icon>
            </v-avatar>
          </div>
          <div class="kpi-value text-black mb-1">
            Bs. <AnimatedNumber :value="kpis.totalComprasPeriodo" :minimum-fraction-digits="2" :maximum-fraction-digits="2" />
          </div>
          <div class="text-caption text-grey-darken-4 font-weight-medium">
            Volumen de Egresos Registrados
          </div>
        </v-card>
      </v-col>

      <!-- KPI 4: Retenciones Practicadas -->
      <v-col cols="12" sm="6" md="3">
        <v-card class="custom-kpi-card pa-4 rounded-xl elevation-1" style="background-color: #961112; color: white;">
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="text-caption font-weight-medium text-grey-lighten-2 text-uppercase letter-spacing-1">
              Impuesto Retenido
            </span>
            <v-avatar size="32" color="rgba(255,255,255,0.15)">
              <v-icon size="18" color="white">mdi-shield-check</v-icon>
            </v-avatar>
          </div>
          <div class="kpi-value text-white mb-1">
            Bs. <AnimatedNumber :value="kpis.totalRetenidoPeriodo" :minimum-fraction-digits="2" :maximum-fraction-digits="2" />
          </div>
          <div class="text-caption text-grey-lighten-2">
            IVA, ISLR y Municipalidad
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 3. BARRA DE HERRAMIENTAS, BÚSQUEDA Y FILTROS           -->
    <!-- ══════════════════════════════════════════════════════ -->
    <v-card class="rounded-xl pa-3 pa-md-4 mb-6 elevation-1 border-subtle">
      <v-row dense align="center">
        <!-- Buscador Reactivo -->
        <v-col cols="12" lg="4" md="5">
          <v-text-field
            v-model="searchQuery"
            placeholder="Buscar por RIF, Razón Social o Municipio..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            class="search-input"
          ></v-text-field>
        </v-col>

        <!-- Pills de Filtro con Flechas de Navegación (v-slide-group) -->
        <v-col cols="12" lg="8" md="7">
          <v-slide-group
            v-model="activeFilter"
            show-arrows
            mandatory
            class="filter-slide-group"
          >
            <v-slide-group-item
              v-for="f in filterOptions"
              :key="f.value"
              :value="f.value"
              v-slot="{ isSelected, toggle }"
            >
              <v-chip
                :color="isSelected ? 'secondary' : 'default'"
                :variant="isSelected ? 'flat' : 'outlined'"
                size="small"
                class="font-weight-medium ma-1 cursor-pointer flex-shrink-0"
                @click="toggle"
              >
                <v-icon start size="14">{{ f.icon }}</v-icon>
                {{ f.label }}
                <span class="ml-1 opacity-70">({{ getFilterCount(f.value) }})</span>
              </v-chip>
            </v-slide-group-item>
          </v-slide-group>
        </v-col>
      </v-row>
    </v-card>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 4. CONTENIDO PRINCIPAL: DUAL LAYOUT (MOBILE / DESKTOP)  -->
    <!-- ══════════════════════════════════════════════════════ -->

    <!-- Skeleton Loading -->
    <div v-if="loading">
      <v-row v-if="isMobile">
        <v-col v-for="n in 3" :key="'sk-m-' + n" cols="12">
          <v-skeleton-loader type="card" height="150" class="rounded-xl mb-3" />
        </v-col>
      </v-row>
      <v-card v-else class="rounded-xl pa-4 elevation-1">
        <v-skeleton-loader type="table-thead, table-tbody@5" />
      </v-card>
    </div>

    <!-- Estado Vacío (Empty State) -->
    <div v-else-if="filteredProveedores.length === 0" class="text-center py-12">
      <v-avatar size="76" color="grey-lighten-3" class="mb-4">
        <v-icon size="38" color="grey-darken-1">mdi-domain-off</v-icon>
      </v-avatar>
      <h3 class="text-h6 font-weight-bold text-secondary mb-1">
        {{ searchQuery ? 'No hay resultados para tu búsqueda' : 'No se encontraron proveedores' }}
      </h3>
      <p class="text-body-2 text-grey-darken-1 mb-4" style="max-width: 460px; margin: 0 auto;">
        {{ searchQuery
          ? 'Intenta con otro término de búsqueda o limpia los filtros activos.'
          : 'Registra tus proveedores con sus parámetros fiscales para automatizar compras y comprobantes de retención.' }}
      </p>
      <v-btn
        v-if="searchQuery"
        variant="outlined"
        color="secondary"
        prepend-icon="mdi-filter-remove-outline"
        @click="searchQuery = ''; activeFilter = 'ALL'"
      >
        Limpiar Filtros
      </v-btn>
      <v-btn
        v-else
        color="primary"
        variant="flat"
        prepend-icon="mdi-plus"
        @click="openCreateModal"
      >
        Registrar Primer Proveedor
      </v-btn>
    </div>

    <!-- A. VISTA MÓVIL: FEED DE TARJETAS TÁCTILES FIRST MOBILE -->
    <div v-else-if="isMobile">
      <v-row dense>
        <v-col
          v-for="prov in filteredProveedores"
          :key="prov.id"
          cols="12"
          class="mb-3"
        >
          <v-card
            class="rounded-xl pa-4 elevation-1 border-subtle mobile-provider-card"
            @click="openDetailModal(prov)"
          >
            <!-- Cabecera de la Tarjeta Móvil -->
            <div class="d-flex align-start justify-space-between mb-2">
              <div class="d-flex align-center flex-grow-1 overflow-hidden mr-2">
                <v-avatar
                  size="40"
                  :color="prov.tipo_persona === 'JURIDICA' ? 'secondary' : 'accent'"
                  class="mr-3 text-white font-weight-bold flex-shrink-0"
                >
                  <v-icon size="20" color="white">
                    {{ prov.tipo_persona === 'JURIDICA' ? 'mdi-domain' : 'mdi-account' }}
                  </v-icon>
                </v-avatar>

                <div class="overflow-hidden">
                  <div class="text-subtitle-2 font-weight-bold text-truncate text-secondary">
                    {{ prov.nombre }}
                  </div>
                  <div class="d-flex align-center">
                    <span class="text-caption font-mono text-grey-darken-2 font-weight-bold">
                      {{ prov.rif }}
                    </span>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      density="compact"
                      size="x-small"
                      color="secondary"
                      class="ml-1"
                      @click.stop="copyRif(prov.rif)"
                    ></v-btn>
                  </div>
                </div>
              </div>

              <!-- Menú de Acciones Rápidas -->
              <v-menu location="bottom end">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon="mdi-dots-vertical"
                    variant="text"
                    density="comfortable"
                    v-bind="props"
                    @click.stop
                  ></v-btn>
                </template>
                <v-list density="compact" class="rounded-lg elevation-3">
                  <v-list-item prepend-icon="mdi-eye-outline" title="Ver Ficha 360" @click="openDetailModal(prov)" />
                  <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" @click="openEditModal(prov)" />
                  <v-divider></v-divider>
                  <v-list-item prepend-icon="mdi-delete-outline" title="Eliminar / Archivar" class="text-primary" @click="confirmDelete(prov)" />
                </v-list>
              </v-menu>
            </div>

            <!-- Chips de Configuración Fiscal -->
            <div class="d-flex flex-wrap my-2" style="gap: 6px;">
              <v-chip size="x-small" color="secondary" variant="flat">
                IVA: {{ prov.iva_retention_rate || 0 }}%
              </v-chip>

              <v-chip
                v-if="prov.islr_codigo || prov.islr_porcentaje"
                size="x-small"
                color="primary"
                variant="flat"
              >
                ISLR: {{ prov.islr_codigo || 'Cód.' }} ({{ prov.islr_porcentaje || 0 }}%)
              </v-chip>

              <v-chip
                v-if="prov.municipal_rate"
                size="x-small"
                color="accent"
                variant="flat"
                class="text-black font-weight-bold"
              >
                Mun: {{ prov.municipal_rate }}%
              </v-chip>

              <v-chip
                v-if="prov.municipio_nombre"
                size="x-small"
                color="grey-lighten-2"
                variant="flat"
                class="text-grey-darken-3"
              >
                {{ prov.municipio_nombre }}
              </v-chip>
            </div>

            <!-- Resumen Financiero y Contacto Rápido -->
            <div class="d-flex align-center justify-space-between pt-2 border-t-subtle mt-2">
              <div class="text-caption text-grey-darken-1">
                Compras: <strong class="text-secondary">Bs. {{ formatMoney(prov.total_compras || 0) }}</strong>
                <span class="text-grey ml-1">({{ prov.total_facturas || 0 }} fac.)</span>
              </div>

              <div class="d-flex align-center" style="gap: 4px;">
                <v-btn
                  v-if="prov.telefono"
                  icon="mdi-phone"
                  size="small"
                  variant="tonal"
                  color="secondary"
                  :href="'tel:' + prov.telefono"
                  @click.stop
                ></v-btn>

                <v-btn
                  v-if="prov.email"
                  icon="mdi-email-outline"
                  size="small"
                  variant="tonal"
                  color="secondary"
                  :href="'mailto:' + prov.email"
                  @click.stop
                ></v-btn>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- B. VISTA DESKTOP: DATA TABLE MODERNA -->
    <v-card v-else class="rounded-xl elevation-1 border-subtle overflow-hidden">
      <v-table hover density="comfortable">
        <thead>
          <tr class="bg-grey-lighten-4">
            <th class="text-left font-weight-bold text-secondary">Proveedor / RIF</th>
            <th class="text-left font-weight-bold text-secondary">Tipo</th>
            <th class="text-left font-weight-bold text-secondary">Configuración Fiscal</th>
            <th class="text-left font-weight-bold text-secondary">Municipio / Licencia</th>
            <th class="text-right font-weight-bold text-secondary">Compras Acumuladas</th>
            <th class="text-right font-weight-bold text-secondary">Total Retenido</th>
            <th class="text-center font-weight-bold text-secondary" style="width: 130px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="prov in paginatedProveedores"
            :key="prov.id"
            class="cursor-pointer provider-table-row"
            @click="openDetailModal(prov)"
          >
            <!-- Columna Proveedor -->
            <td class="py-3">
              <div class="d-flex align-center">
                <v-avatar
                  size="36"
                  :color="prov.tipo_persona === 'JURIDICA' ? 'secondary' : 'accent'"
                  class="mr-3 text-white font-weight-bold flex-shrink-0"
                >
                  <v-icon size="18" color="white">
                    {{ prov.tipo_persona === 'JURIDICA' ? 'mdi-domain' : 'mdi-account' }}
                  </v-icon>
                </v-avatar>
                <div>
                  <div class="font-weight-bold text-body-2 text-secondary">
                    {{ prov.nombre }}
                  </div>
                  <div class="d-flex align-center">
                    <span class="text-caption font-mono text-grey-darken-1">
                      {{ prov.rif }}
                    </span>
                    <v-btn
                      icon="mdi-content-copy"
                      variant="text"
                      density="compact"
                      size="x-small"
                      color="grey"
                      class="ml-1"
                      @click.stop="copyRif(prov.rif)"
                    ></v-btn>
                  </div>
                </div>
              </div>
            </td>

            <!-- Tipo de Persona -->
            <td>
              <v-chip
                size="x-small"
                :color="prov.tipo_persona === 'JURIDICA' ? 'blue-lighten-4' : 'amber-lighten-4'"
                class="text-secondary font-weight-bold"
              >
                {{ prov.tipo_persona === 'JURIDICA' ? 'JURÍDICA' : 'NATURAL' }}
              </v-chip>
            </td>

            <!-- Configuración Fiscal -->
            <td>
              <div class="d-flex flex-wrap" style="gap: 4px;">
                <v-chip size="x-small" color="secondary" variant="flat">
                  IVA: {{ prov.iva_retention_rate || 0 }}%
                </v-chip>
                <v-chip
                  v-if="prov.islr_codigo || prov.islr_porcentaje"
                  size="x-small"
                  color="primary"
                  variant="flat"
                >
                  ISLR: {{ prov.islr_codigo || 'Cód.' }} ({{ prov.islr_porcentaje || 0 }}%)
                </v-chip>
                <v-chip
                  v-if="prov.municipal_rate"
                  size="x-small"
                  color="accent"
                  variant="flat"
                  class="text-black font-weight-bold"
                >
                  Mun: {{ prov.municipal_rate }}%
                </v-chip>
              </div>
            </td>

            <!-- Municipio y Licencia -->
            <td>
              <div class="text-body-2 font-weight-medium text-grey-darken-3">
                {{ prov.municipio_nombre || 'No asignado' }}
              </div>
              <div v-if="prov.licencia_actividad_economica" class="text-caption text-grey">
                Lic: {{ prov.licencia_actividad_economica }}
              </div>
            </td>

            <!-- Compras Acumuladas -->
            <td class="text-right">
              <div class="font-weight-bold text-body-2 text-secondary">
                Bs. {{ formatMoney(prov.total_compras || 0) }}
              </div>
              <div class="text-caption text-grey">
                {{ prov.total_facturas || 0 }} facturas
              </div>
            </td>

            <!-- Total Retenido -->
            <td class="text-right font-weight-bold text-body-2 text-primary">
              Bs. {{ formatMoney(prov.total_retenido || 0) }}
            </td>

            <!-- Acciones -->
            <td class="text-center" @click.stop>
              <div class="d-flex align-center justify-center" style="gap: 4px;">
                <v-btn
                  icon="mdi-eye-outline"
                  variant="text"
                  size="small"
                  color="secondary"
                  @click="openDetailModal(prov)"
                ></v-btn>
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="secondary"
                  @click="openEditModal(prov)"
                ></v-btn>
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="primary"
                  @click="confirmDelete(prov)"
                ></v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <!-- Paginador Desktop -->
      <v-divider></v-divider>
      <div class="d-flex align-center justify-space-between pa-4">
        <div class="text-caption text-grey">
          Mostrando {{ (page - 1) * itemsPerPage + 1 }} a {{ Math.min(page * itemsPerPage, filteredProveedores.length) }} de {{ filteredProveedores.length }} proveedores
        </div>
        <v-pagination
          v-if="pageCount > 1"
          v-model="page"
          :length="pageCount"
          density="comfortable"
          size="small"
          total-visible="5"
          color="secondary"
        ></v-pagination>
      </div>
    </v-card>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 5. FLOATING ACTION BUTTON (MÓVIL)                      -->
    <!-- ══════════════════════════════════════════════════════ -->
    <v-btn
      v-if="isMobile"
      color="primary"
      icon="mdi-plus"
      size="large"
      elevation="4"
      class="mobile-fab"
      @click="openCreateModal"
    ></v-btn>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- 6. MODALES Y DIÁLOGOS (FORMULARIO, DETALLE, DELETE)    -->
    <!-- ══════════════════════════════════════════════════════ -->
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

    <!-- Diálogo de Confirmación de Borrado / Desactivación -->
    <v-dialog v-model="deleteDialogOpen" max-width="460" persistent>
      <v-card class="rounded-xl pa-2">
        <v-card-title class="d-flex align-center text-h6 font-weight-bold text-primary">
          <v-icon color="primary" class="mr-2">mdi-alert-circle-outline</v-icon>
          ¿Eliminar Proveedor?
        </v-card-title>
        <v-card-text class="text-body-2 text-grey-darken-2">
          ¿Estás seguro de que deseas eliminar a <strong>{{ providerToDelete?.nombre }}</strong> (RIF: {{ providerToDelete?.rif }})?
          <p class="mt-2 text-caption text-grey">
            Si este proveedor tiene compras o retenciones registradas, se archivará de forma segura para preservar la integridad de tus libros fiscales.
          </p>
        </v-card-text>
        <v-card-actions class="pa-3">
          <v-spacer></v-spacer>
          <v-btn variant="text" color="grey-darken-1" @click="deleteDialogOpen = false">
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="deleting"
            @click="executeDelete"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import ProveedorModalForm from '@/components/forms/ProveedorModalForm.vue'
import ProveedorDetailModal from '@/components/forms/ProveedorDetailModal.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import proveedorService from '@/services/proveedorService.js'

export default {
  name: 'ProveedoresView',
  components: {
    ProveedorModalForm,
    ProveedorDetailModal,
    AnimatedNumber
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
      providerToDelete: null,

      // KPIs
      kpis: {
        total: 0,
        juridicas: 0,
        naturales: 0,
        conRetencionIva: 0,
        conRetencionIslr: 0,
        totalComprasPeriodo: 0,
        totalRetenidoPeriodo: 0
      },

      filterOptions: [
        { label: 'Todos', value: 'ALL', icon: 'mdi-view-grid' },
        { label: 'Empresas (Jurídicas)', value: 'JURIDICA', icon: 'mdi-domain' },
        { label: 'Personas Naturales', value: 'NATURAL', icon: 'mdi-account' },
        { label: 'Retención IVA', value: 'CON_IVA', icon: 'mdi-receipt' },
        { label: 'Retención ISLR', value: 'CON_ISLR', icon: 'mdi-file-percent' },
        { label: 'Con Municipio', value: 'CON_MUN', icon: 'mdi-city' }
      ]
    }
  },
  computed: {
    isMobile() {
      return this.$vuetify?.display?.smAndDown || false
    },
    filteredProveedores() {
      let list = this.proveedores

      // Filtro por categoría segmentada
      if (this.activeFilter === 'JURIDICA') {
        list = list.filter(p => p.tipo_persona === 'JURIDICA')
      } else if (this.activeFilter === 'NATURAL') {
        list = list.filter(p => p.tipo_persona === 'NATURAL')
      } else if (this.activeFilter === 'CON_IVA') {
        list = list.filter(p => Number(p.iva_retention_rate || 0) > 0)
      } else if (this.activeFilter === 'CON_ISLR') {
        list = list.filter(p => Boolean(p.islr_concept_id))
      } else if (this.activeFilter === 'CON_MUN') {
        list = list.filter(p => Boolean(p.municipio_id || p.municipal_rate))
      }

      // Filtro de búsqueda
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
        this.kpis = proveedorService.getKPIs(this.proveedores)
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
    getFilterCount(filterValue) {
      if (filterValue === 'ALL') return this.proveedores.length
      if (filterValue === 'JURIDICA') return this.proveedores.filter(p => p.tipo_persona === 'JURIDICA').length
      if (filterValue === 'NATURAL') return this.proveedores.filter(p => p.tipo_persona === 'NATURAL').length
      if (filterValue === 'CON_IVA') return this.proveedores.filter(p => Number(p.iva_retention_rate || 0) > 0).length
      if (filterValue === 'CON_ISLR') return this.proveedores.filter(p => Boolean(p.islr_concept_id)).length
      if (filterValue === 'CON_MUN') return this.proveedores.filter(p => Boolean(p.municipio_id || p.municipal_rate)).length
      return 0
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

        // Configurar columnas
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

        // Estilo de encabezados
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F355C' } }

        // Agregar filas
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
    formatMoney(val) {
      const num = Number(val || 0)
      return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }
}
</script>

<style scoped>
/* ─── KPI Cards Estilizadas y Responsivas ─────────────────── */
.custom-kpi-card {
  min-height: 125px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.custom-kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08) !important;
}

.kpi-value {
  font-size: clamp(1.35rem, 1.8vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: -0.02em;
}

.letter-spacing-1 {
  letter-spacing: 0.06em !important;
}

.border-subtle {
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.border-t-subtle {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.font-mono {
  font-family: monospace;
}

.mobile-provider-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mobile-provider-card:active {
  transform: scale(0.98);
}

.provider-table-row:hover {
  background-color: rgba(31, 53, 92, 0.03) !important;
}

.mobile-fab {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  z-index: 99 !important;
}

/* Estilos para el carrusel de filtros segmentados */
.filter-slide-group :deep(.v-slide-group__prev),
.filter-slide-group :deep(.v-slide-group__next) {
  min-width: 32px !important;
  flex: 0 0 32px !important;
}

.filter-slide-group :deep(.v-slide-group__prev .v-icon),
.filter-slide-group :deep(.v-slide-group__next .v-icon) {
  color: #1F355C !important;
  font-size: 22px !important;
}
</style>
