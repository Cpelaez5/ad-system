<template>
  <v-container fluid class="pa-6">
    <!-- Header Section -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold mb-2">Facturación</h1>
        <p class="text-subtitle-1 text-medium-emphasis">
          Gestiona todas tus facturas de ventas, compras y gastos en un solo lugar
        </p>
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center justify-end">
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus"
          @click="openNewInvoiceDialog"
          class="mr-2"
        >
          Nuevo Registro
        </v-btn>
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              color="success"
              variant="outlined"
              size="large"
              prepend-icon="mdi-download"
              v-bind="props"
              :disabled="filteredInvoices.length === 0"
            >
              Exportar
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list>
            <!-- Libros Fiscales (SENIAT) -->
            <v-list-subheader class="text-primary font-weight-bold">
              <v-icon start size="small">mdi-gavel</v-icon>
              Libros Fiscales (SENIAT)
            </v-list-subheader>
            
            <v-list-item @click="exportFiscal('COMPRA')">
              <template v-slot:prepend>
                <v-icon color="blue">mdi-book-open-variant</v-icon>
              </template>
              <v-list-item-title>Libro de Compras</v-list-item-title>
              <v-list-item-subtitle>Solo facturas fiscales (compras y gastos)</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item @click="exportFiscal('VENTA')">
              <template v-slot:prepend>
                <v-icon color="green">mdi-book-open-variant</v-icon>
              </template>
              <v-list-item-title>Libro de Ventas</v-list-item-title>
              <v-list-item-subtitle>Solo facturas fiscales de ventas</v-list-item-subtitle>
            </v-list-item>
            
            <v-divider class="my-2"></v-divider>
            
            <!-- Reportes Generales -->
            <v-list-subheader class="text-grey-darken-1 font-weight-bold">
              <v-icon start size="small">mdi-file-chart</v-icon>
              Reportes Generales
            </v-list-subheader>
            
            <v-list-item @click="exportGeneral('COMPRA')">
              <template v-slot:prepend>
                <v-icon color="orange">mdi-file-excel</v-icon>
              </template>
              <v-list-item-title>Compras General</v-list-item-title>
              <v-list-item-subtitle>Facturas + Recibos de compras y gastos</v-list-item-subtitle>
            </v-list-item>
            
            <v-list-item @click="exportGeneral('VENTA')">
              <template v-slot:prepend>
                <v-icon color="teal">mdi-file-excel</v-icon>
              </template>
              <v-list-item-title>Ventas General</v-list-item-title>
              <v-list-item-subtitle>Facturas + Recibos de ventas</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <!-- Estadísticas rápidas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Total de documentos"
          :value="stats.total"
          bg-color="#02254d"
          text-color="white"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Emitidas"
          :value="stats.byStatus?.EMITIDA || 0"
          bg-color="#961112"
          text-color="white"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <StatsCard
          title="Pagadas"
          :value="stats.byStatus?.PAGADA || 0"
          bg-color="#f2b648"
          text-color="#010101"
        />
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <CurrencyStatsCard
          :title="currentTab === 'all' ? 'Rentabilidad' : 'Monto Total'"
          :value="convertedStatsTotal"
          bg-color="#f0d29b"
          text-color="#010101"
          :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
          @toggle-currency="toggleCurrency"
        />
      </v-col>
    </v-row>

    <!-- Tabs de navegación por tipo de factura -->
    <v-card class="mb-4" elevation="2">
      <v-tabs
        v-model="currentTab"
        bg-color="white"
        color="primary"
        grow
        height="64"
      >
        <v-tab value="all" class="text-none font-weight-medium">
          <v-icon start size="24">mdi-view-list</v-icon>
          Todas
          <v-chip size="small" class="ml-2" color="primary" variant="tonal">
            {{ invoices.length }}
          </v-chip>
        </v-tab>
        
        <v-tab value="ventas" class="text-none font-weight-medium">
          <v-icon start size="24" color="success">mdi-cash-plus</v-icon>
          Ventas
          <v-chip size="small" class="ml-2" color="success" variant="tonal">
            {{ ventasCount }}
          </v-chip>
        </v-tab>
        
        <v-tab value="compras" class="text-none font-weight-medium">
          <v-icon start size="24" color="orange">mdi-cart</v-icon>
          Compras
          <v-chip size="small" class="ml-2" color="orange" variant="tonal">
            {{ comprasCount }}
          </v-chip>
        </v-tab>
        
        <v-tab value="gastos" class="text-none font-weight-medium">
          <v-icon start size="24" color="error">mdi-cash-minus</v-icon>
          Gastos
          <v-chip size="small" class="ml-2" color="error" variant="tonal">
            {{ gastosCount }}
          </v-chip>
        </v-tab>

        <v-tab value="trash" class="text-none font-weight-medium">
          <v-icon start size="24" color="grey">mdi-delete</v-icon>
          Papelera
          <v-chip size="small" class="ml-2" color="grey" variant="tonal">
            {{ trashCount }}
          </v-chip>
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Filtros colapsables con búsqueda -->
    <v-expansion-panels class="mb-4" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex align-center">
            <v-icon start>mdi-filter-variant</v-icon>
            <span class="font-weight-medium">Filtros</span>
            <v-chip 
              v-if="activeFiltersCount > 0" 
              size="small" 
              color="primary" 
              variant="tonal"
              class="ml-3"
            >
              {{ activeFiltersCount }} activo{{ activeFiltersCount > 1 ? 's' : '' }}
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row class="mt-2">
            <!-- Búsqueda -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                prepend-inner-icon="mdi-magnify"
                label="Buscar por número o cliente/proveedor"
                variant="outlined"
                clearable
                hide-details
                @input="applyFilters"
              ></v-text-field>
            </v-col>

            <!-- Estado (con opción 'Todos' por defecto) -->
            <v-col cols="12" md="2">
              <v-select
                v-model="statusFilter"
                :items="statusFilterOptions"
                item-title="text"
                item-value="value"
                prepend-inner-icon="mdi-tag-outline"
                label="Estado"
                variant="outlined"
                hide-details
                @update:model-value="applyFilters"
              ></v-select>
            </v-col>

            <!-- Moneda -->
            <v-col cols="12" md="2">
              <v-select
                v-model="currencyFilter"
                :items="currencyFilterOptions"
                item-title="text"
                item-value="value"
                prepend-inner-icon="mdi-currency-usd"
                label="Moneda"
                variant="outlined"
                hide-details
                @update:model-value="applyFilters"
              ></v-select>
            </v-col>

            <!-- Fecha Inicio (CustomDatePicker) -->
            <v-col cols="12" md="2">
              <CustomDatePicker
                v-model="dateFromFilter"
                label="Fecha Inicio"
                placeholder="Seleccionar"
                @update:model-value="applyFilters"
              />
            </v-col>

            <!-- Fecha Fin (CustomDatePicker) -->
            <v-col cols="12" md="2">
              <CustomDatePicker
                v-model="dateToFilter"
                label="Fecha Fin"
                placeholder="Seleccionar"
                @update:model-value="applyFilters"
              />
            </v-col>

            <!-- Botón Limpiar -->
            <v-col cols="12" md="1" class="d-flex align-center">
              <v-btn
                color="secondary"
                variant="outlined"
                icon="mdi-filter-off"
                @click="clearFilters"
                title="Limpiar Filtros"
              ></v-btn>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

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
        v-model:sort-by="sortBy"
      >
        <!-- Columna de número de factura -->
        <template v-slot:item.invoiceNumber="{ item }">
          <v-chip color="primary" variant="tonal">
            {{ item.invoiceNumber }}
          </v-chip>
        </template>

        <!-- Columna de cliente/proveedor -->
        <template v-slot:item.client="{ item }">
          <div>
            <!-- Si es VENTA, mostrar Cliente. Si es COMPRA, mostrar Emisor (Proveedor) -->
            <div class="font-weight-medium">
              {{ item.flow === 'VENTA' ? item.client.companyName : item.issuer.companyName }}
            </div>
            <div class="text-caption text-grey">
              {{ item.flow === 'VENTA' ? item.client.rif : item.issuer.rif }}
            </div>
          </div>
        </template>

        <!-- Columna de fecha -->
        <template v-slot:item.issueDate="{ item }">
          {{ formatDate(item.issueDate) }}
        </template>



        <!-- Columna de total -->
        <template v-slot:item.total="{ item }">
          <div 
            class="total-amount-display d-flex align-center"
            :class="{ 'amount-changing': isChangingCurrency }"
          >
            <v-icon
              :icon="item.flow === 'VENTA' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
              :color="item.flow === 'VENTA' ? 'success' : 'error'"
              size="small"
              class="mr-2"
            ></v-icon>
            {{ getFormattedDisplayAmount(item) }}
          </div>
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


        <template v-slot:item.actions="{ item }">
          <!-- Acciones para items NORMALES -->
          <div v-if="currentTab !== 'trash'" class="d-flex">
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
              @click="exportInvoice(item)"
              title="Exportar factura"
            ></v-btn>
            <v-btn
              icon="mdi-delete"
              size="small"
              color="error"
              variant="text"
              @click="deleteInvoice(item)"
              title="Mover a papelera"
            ></v-btn>
          </div>

          <!-- Acciones para PAPELERA -->
          <div v-else class="d-flex">
             <v-btn
              icon="mdi-refresh"
              size="small"
              color="success"
              variant="text"
              @click="restoreInvoice(item)"
              title="Restaurar"
            ></v-btn>
            <v-btn
              icon="mdi-delete-forever"
              size="small"
              color="error"
              variant="text"
              @click="deleteInvoice(item)"
              title="Eliminar definitivamente"
            ></v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo para nueva/editar factura -->
    <v-dialog v-model="invoiceDialog" max-width="1200px" scrollable>
      <ClientInvoiceForm
        :invoice="editingInvoice"
        :flow="defaultFlow"
        @submit="handleInvoiceSubmit"
        @cancel="closeInvoiceDialog"
      />
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title>Confirmar Eliminación</v-card-title>
        <v-card-text>
          <div v-if="currentTab === 'trash'" class="text-error font-weight-bold mb-2">
            ⚠️ Atención: Borrado Definitivo
          </div>
          ¿Está seguro de que desea {{ currentTab === 'trash' ? 'eliminar DEFINITIVAMENTE' : 'enviar a la papelera' }} la factura <strong>{{ invoiceToDelete?.invoiceNumber }}</strong>?
          {{ currentTab === 'trash' ? 'Esta acción NO se puede deshacer.' : 'Podrá restaurarla luego desde la papelera.' }}
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

    <!-- Diálogo de opciones avanzadas de exportación -->
    <v-dialog v-model="showExportDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <v-icon left>mdi-download</v-icon>
          Opciones de Exportación
        </v-card-title>
        <v-card-text>
          <v-form>
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.format"
                  :items="['XLSX', 'CSV']"
                  label="Formato de archivo"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.scope"
                  :items="[
                    { title: 'Todos los registros', value: 'all' },
                    { title: 'Solo registros filtrados', value: 'filtered' }
                  ]"
                  label="Alcance de exportación"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="exportOptions.currency"
                  :items="[
                    { title: 'Bolívares (VES)', value: 'VES' },
                    { title: 'Dólares (USD)', value: 'USD' }
                  ]"
                  label="Moneda para exportación"
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="exportOptions.includeItems"
                  label="Incluir items detallados"
                  color="primary"
                  ></v-checkbox>
              </v-col>
              <v-col cols="12">
                <v-checkbox
                  v-model="exportOptions.includeMetadata"
                  label="Incluir metadatos (fechas de creación, etc.)"
                  color="primary"
                ></v-checkbox>
              </v-col>
            </v-row>
          </v-form>
          
          <v-alert
            type="info"
            variant="tonal"
            class="mt-4"
          >
            <strong>Resumen de exportación:</strong><br>
            • Registros a exportar: {{ getExportRecordCount() }}<br>
            • Moneda: {{ exportOptions.currency }}<br>
            • Formato: {{ exportOptions.format }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="showExportDialog = false">
            Cancelar
          </v-btn>
          <v-btn color="success" @click="exportWithOptions">
            <v-icon left>mdi-download</v-icon>
            Exportar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de filtros de fecha para exportación (UX Mejorado) -->
    <v-dialog v-model="exportDateDialog" max-width="520px" persistent>
      <v-card class="export-date-dialog">
        <!-- Header con contexto claro -->
        <v-card-title class="d-flex align-center pa-4 bg-primary">
          <v-icon color="white" class="mr-3">mdi-file-export-outline</v-icon>
          <div>
            <div class="text-h6 text-white">Exportar Registros</div>
            <div class="text-caption text-white-50">
              {{ pendingExportType === 'fiscal' ? 'Libro Fiscal SENIAT' : 'Reporte General' }}
              - {{ pendingExportFlow === 'COMPRA' ? 'Compras/Gastos' : 'Ventas' }}
            </div>
          </div>
        </v-card-title>

        <v-card-text class="pa-5">
          <!-- Error Alert -->
          <v-alert
            v-if="exportDateError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="exportDateError = ''"
          >
            <v-icon start>mdi-alert-circle</v-icon>
            {{ exportDateError }}
          </v-alert>

          <!-- Instrucciones claras -->
          <p class="text-body-2 text-medium-emphasis mb-4">
            <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
            Selecciona el período que deseas incluir en la exportación:
          </p>

          <!-- Selector de modo con tarjetas visuales -->
          <v-row class="mb-4">
            <v-col cols="6">
              <v-card
                :variant="exportDateMode === 'month' ? 'elevated' : 'outlined'"
                :color="exportDateMode === 'month' ? 'primary' : undefined"
                :class="{ 'border-primary': exportDateMode === 'month' }"
                class="pa-3 cursor-pointer text-center mode-card"
                @click="exportDateMode = 'month'"
                elevation="0"
              >
                <v-icon 
                  :color="exportDateMode === 'month' ? 'white' : 'primary'" 
                  size="32" 
                  class="mb-2"
                >
                  mdi-calendar-month
                </v-icon>
                <div 
                  class="text-subtitle-2 font-weight-medium"
                  :class="exportDateMode === 'month' ? 'text-white' : ''"
                >
                  Mes Específico
                </div>
                <div 
                  class="text-caption"
                  :class="exportDateMode === 'month' ? 'text-white-50' : 'text-medium-emphasis'"
                >
                  Ej: Enero 2026
                </div>
              </v-card>
            </v-col>
            <v-col cols="6">
              <v-card
                :variant="exportDateMode === 'range' ? 'elevated' : 'outlined'"
                :color="exportDateMode === 'range' ? 'primary' : undefined"
                :class="{ 'border-primary': exportDateMode === 'range' }"
                class="pa-3 cursor-pointer text-center mode-card"
                @click="exportDateMode = 'range'"
                elevation="0"
              >
                <v-icon 
                  :color="exportDateMode === 'range' ? 'white' : 'primary'" 
                  size="32" 
                  class="mb-2"
                >
                  mdi-calendar-range
                </v-icon>
                <div 
                  class="text-subtitle-2 font-weight-medium"
                  :class="exportDateMode === 'range' ? 'text-white' : ''"
                >
                  Rango de Fechas
                </div>
                <div 
                  class="text-caption"
                  :class="exportDateMode === 'range' ? 'text-white-50' : 'text-medium-emphasis'"
                >
                  Desde - Hasta
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Contenedor de inputs con transición suave -->
          <v-expand-transition>
            <div v-if="exportDateMode === 'month'" key="month-input" class="pa-2">
              <CustomDatePicker
                v-model="exportMonthDate"
                label="¿Qué mes deseas exportar?"
                placeholder="Seleccionar mes y año"
                format="MMMM yyyy"
                preview-format="MMMM yyyy"
                hint="Haz clic para abrir el calendario"
                :clearable="false"
                month-picker
              />
            </div>
          </v-expand-transition>

          <v-expand-transition>
            <div v-if="exportDateMode === 'range'" key="range-inputs" class="pa-2">
              <!-- Selector de rango de fechas -->
              <CustomDatePicker
                v-model="exportDateRange"
                label="Selecciona el rango de fechas"
                placeholder="Desde - Hasta"
                format="dd/MM/yyyy"
                preview-format="dd/MM/yyyy"
                hint="Haz clic para seleccionar el rango"
                :range="true"
                :multi-calendars="true"
                :clearable="true"
                :error-message="exportDateError"
              />
            </div>
          </v-expand-transition>

          <!-- Preview de resultados con mejor visual -->
          <v-card 
            variant="tonal" 
            :color="filteredExportPreviewCount > 0 ? 'success' : 'warning'"
            class="mt-4 pa-4"
          >
            <div class="d-flex align-center">
              <v-avatar 
                :color="filteredExportPreviewCount > 0 ? 'success' : 'warning'" 
                size="48"
                class="mr-4"
              >
                <v-icon color="white" size="24">
                  {{ filteredExportPreviewCount > 0 ? 'mdi-file-document-multiple' : 'mdi-file-question' }}
                </v-icon>
              </v-avatar>
              <div>
                <div class="text-h5 font-weight-bold">
                  {{ filteredExportPreviewCount }}
                </div>
                <div class="text-body-2">
                  {{ filteredExportPreviewCount === 1 ? 'registro encontrado' : 'registros encontrados' }}
                </div>
              </div>
            </div>
            <div v-if="filteredExportPreviewCount === 0" class="text-caption mt-2 text-warning-darken-2">
              <v-icon size="small" class="mr-1">mdi-lightbulb-outline</v-icon>
              Prueba seleccionar otro período con datos disponibles
            </div>
          </v-card>
        </v-card-text>

        <!-- Acciones con botones claros -->
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-btn 
            variant="text" 
            color="grey-darken-1"
            @click="cancelExportDateDialog"
            prepend-icon="mdi-close"
          >
            Cancelar
          </v-btn>
          <v-spacer></v-spacer>
          <v-btn
            color="success"
            variant="elevated"
            size="large"
            :disabled="filteredExportPreviewCount === 0 || !!exportDateError"
            @click="confirmExportWithDateFilter"
            prepend-icon="mdi-download"
          >
            Exportar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import StatsCard from '@/components/common/StatsCard.vue'
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import CustomDatePicker from '@/components/common/CustomDatePicker.vue'
import invoiceService from '@/services/invoiceService.js';
import bcvService from '@/services/bcvService.js';
import exportService from '@/services/exportService.js';
import ClientInvoiceForm from '@/components/forms/client/ClientInvoiceForm.vue';
import userService from '@/services/userService.js';
import dayjs from 'dayjs';

export default {
  name: 'FacturacionCliente',
  components: {
    ClientInvoiceForm,
    AnimatedNumber,
    StatsCard,
    CurrencyStatsCard,
    CustomDatePicker
  },
  data() {
    return {
      loading: false,
      invoices: [],
      trashInvoices: [], 
      filteredInvoices: [],
      stats: {
        total: 0,
        byStatus: {},
        totalAmount: 0
      },
      currencyDisplay: 'VES',
      isChangingCurrency: false,
      // Conversiones y cacheo
      convertedStatsTotal: 0,
      convertedAmounts: {},
      cachedRate: null,
      
      // Tab actual
      currentTab: 'all', // 'all', 'ventas', 'compras', 'gastos'
      
      // Ordenamiento por defecto
      sortBy: [{ key: 'invoiceNumber', order: 'asc' }],
            
      // Filtros
      searchQuery: '',
      statusFilter: 'all', // 'all' = Todos (predeterminado)
      currencyFilter: 'all', // 'all' = Todas las monedas (predeterminado)
      dateFromFilter: null, // Ahora es Date object o null
      dateToFilter: null, // Ahora es Date object o null
      
      // Estados de diálogos
      invoiceDialog: false,
      deleteDialog: false,
      viewDialog: false,
      showExportDialog: false,
      
      // Datos para edición/eliminación
      editingInvoice: null,
      invoiceToDelete: null,
      viewingInvoice: null,
      
      // Opciones de exportación
      exportOptions: {
        format: 'XLSX',
        scope: 'filtered',
        currency: 'VES',
        mode: 'SENIAT',
        includeItems: true,
        includeMetadata: true
      },
      
      // Opciones de exportación con filtro de fecha
      exportDateDialog: false,
      exportDateMode: 'month', // 'month' o 'range'
      exportMonthDate: null, // Date object para month picker { month: 0-11, year: YYYY }
      exportDateRange: null, // Array [startDate, endDate] para range picker
      exportMonth: '', // Mantener para compatibilidad
      exportDateFrom: '',
      exportDateTo: '',
      exportDateError: '',
      pendingExportType: null, // 'fiscal' o 'general'
      pendingExportFlow: null, // 'COMPRA' o 'VENTA'
      
      // Configuración de la tabla
      currentUser: null,
      headers: [
        { title: 'Número', key: 'invoiceNumber', sortable: true },

        { title: 'Cliente/Proveedor', key: 'client', sortable: true },
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
      ],
      
      /** Opciones para filtro de estado con 'Todos' como predeterminado */
      statusFilterOptions: [
        { text: 'Todos', value: 'all' },
        { text: 'Borrador', value: 'BORRADOR' },
        { text: 'Emitida', value: 'EMITIDA' },
        { text: 'Enviada', value: 'ENVIADA' },
        { text: 'Pagada', value: 'PAGADA' },
        { text: 'Vencida', value: 'VENCIDA' },
        { text: 'Anulada', value: 'ANULADA' }
      ],
      
      /** Opciones para filtro de moneda */
      currencyFilterOptions: [
        { text: 'Todas', value: 'all' },
        { text: 'Bolívares (VES)', value: 'VES' },
        { text: 'Dólares (USD)', value: 'USD' },
        { text: 'Euros (EUR)', value: 'EUR' }
      ]
    };
  },
  computed: {
    // displayTotalAmount removed; use `convertedStatsTotal` instead
    
    ventasCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => inv.flow === 'VENTA').length;
    },
    
    comprasCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => 
        inv.flow === 'COMPRA' && (inv.expense_type === 'COMPRA' || !inv.expense_type)
      ).length;
    },
    
    gastosCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => 
        inv.flow === 'COMPRA' && inv.expense_type === 'GASTO'
      ).length;
    },

    trashCount() {
       return this.trashInvoices ? this.trashInvoices.length : 0;
    },

    activeFiltersCount() {
      let count = 0;
      if (this.searchQuery) count++;
      if (this.statusFilter && this.statusFilter !== 'all') count++;
      if (this.currencyFilter && this.currencyFilter !== 'all') count++;
      if (this.dateFromFilter) count++;
      if (this.dateToFilter) count++;
      return count;
    },

    defaultFlow() {
      if (this.currentTab === 'compras' || this.currentTab === 'gastos') {
        return 'COMPRA';
      }
      return 'VENTA';
    },
    
    // Titulo dinámico para el botón de borrar
    deleteButtonText() {
       return this.currentTab === 'trash' ? 'Eliminar Definitivamente' : 'Mover a Papelera';
    },
    
    // Preview de facturas para exportación con filtro de fecha
    filteredExportPreviewCount() {
      if (!this.pendingExportFlow) return 0;
      
      // Obtener facturas base según tipo y flow
      let baseInvoices = this.invoices.filter(inv => {
        const flowMatch = this.pendingExportFlow === 'COMPRA' 
          ? inv.flow === 'COMPRA' 
          : inv.flow === 'VENTA';
        
        if (this.pendingExportType === 'fiscal') {
          return flowMatch && inv.documentType === 'FACTURA';
        }
        return flowMatch;
      });
      
      // Aplicar filtro de fecha
      return this.applyDateFilterToInvoices(baseInvoices).length;
    }
  },
  watch: {
    currentTab() {
      this.applyFilters();
      if (this.$route.query.tab !== this.currentTab) {
        this.$router.replace({ 
          query: { ...this.$route.query, tab: this.currentTab } 
        }).catch(() => {});
      }
    }
    ,
    currencyDisplay: {
      async handler(newCurrency) {
        this.isChangingCurrency = true;

        if (newCurrency === 'USD') {
          // 1) Obtener la tasa UNA sola vez
          if (!this.cachedRate) {
            try {
              const rate = await bcvService.getCurrentRate();
              if (rate && rate.success && rate.data) {
                this.cachedRate = parseFloat(rate.data.dollar);
                console.log('Tasa cacheada:', this.cachedRate);
              } else {
                console.warn('No se pudo obtener la tasa del BCV');
                this.cachedRate = 0;
              }
            } catch (error) {
              console.error('Error obteniendo tasa:', error);
              this.cachedRate = 0; // fallback
            }
          }

          // 2) Calcular total de stats SÍNCRONAMENTE
          this.convertedStatsTotal = (this.stats.totalAmount || 0) / (this.cachedRate || 1);

          // 3) Calcular todos los montos de la tabla en un loop síncrono
          const map = {};
          for (const invoice of this.filteredInvoices) {
            const amountVES = invoice.financial?.totalSales || 0;
            map[invoice.id] = amountVES / (this.cachedRate || 1);
          }
          this.convertedAmounts = map;
          console.log('Conversiones calculadas para', Object.keys(this.convertedAmounts).length, 'facturas');
        } else {
          // Resetea a VES
          this.convertedStatsTotal = this.stats.totalAmount;
          this.convertedAmounts = {};
          this.cachedRate = null; // opcional: limpia cache para refrescar en el próximo cambio
        }

        setTimeout(() => {
          this.isChangingCurrency = false;
        }, 300);
      },
      immediate: true
    }
  },
  async mounted() {
    if (this.$route.query.tab) {
      this.currentTab = this.$route.query.tab;
    }
    
    // Cargar tasa inmediatamente para cálculos correctos
    try {
        const rate = await bcvService.getCurrentRate();
        if (rate?.data?.dollar) {
            this.cachedRate = parseFloat(rate.data.dollar);
        }
    } catch (e) { console.error('Error cargando tasa inicial:', e); }

    await this.loadUser();
    await this.loadInvoices();
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser();
        // Permitir acceso a clientes
        if (!this.currentUser || this.currentUser.role !== 'cliente') {
          // Si es admin/contador, tal vez debería ver la otra vista, pero por ahora permitimos si está probando
          console.warn('⚠️ Usuario no es cliente:', this.currentUser?.role);
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error);
        this.$router.push('/login');
      }
    },
    
    async loadInvoices() {
      if (!this.currentUser) return;
      
      try {
        this.loading = true;
        console.log('🔄 Cargando facturas del cliente...');
        
        // 1. Cargar Ventas (donde yo soy el emisor - aproximación por frontend filter)
        // Nota: getInvoices({ flow: 'VENTA' }) trae todas las ventas de la org.
        // Debemos filtrar por mi RIF o ID si es posible.
        const allSales = await invoiceService.getInvoices({ flow: 'VENTA' });
        const mySales = allSales.filter(inv => {
          // Filtrar donde el emisor soy yo
          // Asumimos que currentUser tiene RIF o nombre de empresa
          if (!this.currentUser.rif) return true; // Si no tengo RIF, mostrar todo (fallback)
          return inv.issuer?.rif === this.currentUser.rif;
        });
        
        // 2. Cargar Compras (donde yo soy el cliente)
        // Aquí sí podemos usar el filtro clientId del servicio
        const myPurchases = await invoiceService.getInvoices({ 
          flow: 'COMPRA', 
          clientId: this.currentUser.client_id || this.currentUser.id 
        });
        
        this.invoices = [...mySales, ...myPurchases];
        
        // 3. Cargar Papelera (trashed=true)
        const trashSales = await invoiceService.getInvoices({ flow: 'VENTA' }, { trashed: true });
        const trashPurchases = await invoiceService.getInvoices({ 
           flow: 'COMPRA', 
           clientId: this.currentUser.client_id || this.currentUser.id 
        }, { trashed: true });
        this.trashInvoices = [...trashSales, ...trashPurchases];
        
        console.log('📋 Facturas activas:', this.invoices.length);
        console.log('🗑️ Facturas en papelera:', this.trashInvoices.length);
        
        // Recalcular stats localmente
        this.calculateStats();
        
        this.applyFilters();
        // Si la vista está en USD, convertir montos recién cargados (obtener tasa UNA vez)
        if (this.currencyDisplay === 'USD') {
          if (!this.cachedRate) {
            try {
              const rate = await bcvService.getCurrentRate();
              this.cachedRate = parseFloat(rate.data.dollar);
              console.log('Tasa cacheada:', this.cachedRate);
            } catch (error) {
              console.error('Error obteniendo tasa:', error);
              this.cachedRate = 0;
            }
          }

          this.convertedStatsTotal = (this.stats.totalAmount || 0) / (this.cachedRate || 1);
          const map = {};
          for (const invoice of this.filteredInvoices) {
            const amountVES = invoice.financial?.totalSales || 0;
            map[invoice.id] = amountVES / (this.cachedRate || 1);
          }
          this.convertedAmounts = map;
        } else {
          this.convertedStatsTotal = this.stats.totalAmount;
          this.convertedAmounts = {};
        }
      } catch (error) {
        console.error('❌ Error al cargar facturas:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async calculateStats() {
      const sourceData = this.filteredInvoices;
      
      // Asegurar que tenemos tasa para cálculos
      let currentRate = this.cachedRate;
      if (!currentRate) {
          try {
             // Intentar recuperar de cache síncrono o esperar la promesa si fuese necesario (aquí asumimos disponibilidad o fallback)
             // Si el componente ya montó, deberíamos tener la tasa. Sino, intentamos pedirla rápido.
             const rateData = await bcvService.getCurrentRate();
             if (rateData?.data?.dollar) {
                currentRate = parseFloat(rateData.data.dollar);
                this.cachedRate = currentRate;
             }
          } catch(e) { console.error('Error fetching rate for stats:', e); }
      }
      currentRate = currentRate || 1; // Fallback to 1 to avoid NaN

      this.stats = {
        total: sourceData.length,
        byStatus: {},
        totalAmount: 0
      };
      
      sourceData.forEach(inv => {
        this.stats.byStatus[inv.status] = (this.stats.byStatus[inv.status] || 0) + 1;
        
        let amount = inv.financial?.totalSales || 0;
        const currency = inv.financial?.currency || 'VES';

        // NORMALIZAR A VES (Moneda Base del Sistema)
        if (currency === 'USD') {
             amount = amount * currentRate;
        } 
        // TODO: Agregar soporte EUR cuando exista API
        // else if (currency === 'EUR') { ... }

        // LOGICA DE NETEO (Solo para vista global 'all')
        // Si estamos viendo "Todas", restamos los egresos (Compras/Gastos)
        // Si estamos viendo pestañas específicas, sumamos el valor absoluto (Total de Compras, Total de Ventas)
        if (this.currentTab === 'all' && inv.flow === 'COMPRA') {
            this.stats.totalAmount -= amount;
        } else {
            this.stats.totalAmount += amount;
        }
      });
      
      // Actualizar el total visual convertido
      if (this.currencyDisplay === 'USD' && currentRate) {
         this.convertedStatsTotal = this.stats.totalAmount / currentRate;
      } else {
         this.convertedStatsTotal = this.stats.totalAmount;
      }
    },
    
    // loadStats() eliminado porque calculamos localmente
    
    applyFilters() {
      // Seleccionar lista origen segun tab
      let sourceList = this.currentTab === 'trash' ? this.trashInvoices : this.invoices;
      let filtered = [...sourceList];
      
      // Filtro por tab
      switch(this.currentTab) {
        case 'ventas':
          filtered = filtered.filter(inv => inv.flow === 'VENTA');
          break;
        case 'compras':
          // Default: Si no tiene expense_type, asumimos que es una COMPRA estándar (legacy support)
          filtered = filtered.filter(inv => 
            inv.flow === 'COMPRA' && (inv.expense_type === 'COMPRA' || !inv.expense_type)
          );
          break;
        case 'gastos':
          // Solo mostrar explícitamente marcados como GASTO
          filtered = filtered.filter(inv => 
            inv.flow === 'COMPRA' && inv.expense_type === 'GASTO'
          );
          break;
        // caso trash ya está cubierto por sourceList, pero si quisiéramos filtrar trash por tipo...
      }
      
      // Filtro por búsqueda
      if (this.searchQuery) {
        const searchLower = this.searchQuery.toLowerCase();
        filtered = filtered.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.client.companyName.toLowerCase().includes(searchLower) ||
          invoice.issuer.companyName.toLowerCase().includes(searchLower)
        );
      }
      
      // Filtro por estado (solo aplicar si no es 'all')
      if (this.statusFilter && this.statusFilter !== 'all') {
        filtered = filtered.filter(invoice => invoice.status === this.statusFilter);
      }
      
      // Filtro por moneda (solo aplicar si no es 'all')
      if (this.currencyFilter && this.currencyFilter !== 'all') {
        filtered = filtered.filter(invoice => {
          const invoiceCurrency = invoice.financial?.currency || 'VES';
          return invoiceCurrency === this.currencyFilter;
        });
      }
      
      // Filtro por fecha desde (CustomDatePicker devuelve Date object o string YYYY-MM-DD)
      if (this.dateFromFilter) {
        const fromDate = this.dateFromFilter instanceof Date 
          ? this.dateFromFilter.toISOString().slice(0, 10) 
          : this.dateFromFilter;
        filtered = filtered.filter(invoice => invoice.issueDate >= fromDate);
      }

      // Filtro por fecha hasta
      if (this.dateToFilter) {
        const toDate = this.dateToFilter instanceof Date 
          ? this.dateToFilter.toISOString().slice(0, 10) 
          : this.dateToFilter;
        filtered = filtered.filter(invoice => invoice.issueDate <= toDate);
      }

      this.filteredInvoices = filtered;
      
      // IMPORTANTE: Recalcular estadísticas basadas en los datos filtrados
      this.calculateStats();
      
      // Actualizar conversiones de items individuales si es necesario
      if (this.currencyDisplay === 'USD' && this.cachedRate) {
           const map = {};
           for (const invoice of this.filteredInvoices) {
             const amountVES = invoice.financial?.totalSales || 0;
             map[invoice.id] = amountVES / this.cachedRate;
           }
           this.convertedAmounts = map;
      }
    },

    
    clearFilters() {
      this.searchQuery = '';
      this.statusFilter = 'all'; // Reset to default
      this.currencyFilter = 'all'; // Reset to default
      this.dateFromFilter = null;
      this.dateToFilter = null;
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
        if (this.currentTab === 'trash') {
            await invoiceService.hardDeleteInvoice(this.invoiceToDelete.id);
        } else {
            await invoiceService.deleteInvoice(this.invoiceToDelete.id);
        }
        
        await this.loadInvoices(); // Recarga todo (invoices y trashInvoices)
        this.deleteDialog = false;
        this.invoiceToDelete = null;
      } catch (error) {
        console.error('❌ Error al eliminar factura:', error);
      }
    },

    async restoreInvoice(invoice) {
        try {
            await invoiceService.restoreInvoice(invoice.id);
            await this.loadInvoices(); // Mueve de trash a active
        } catch (error) {
            console.error('❌ Error al restaurar factura:', error);
        }
    },
    
    closeInvoiceDialog() {
      this.invoiceDialog = false;
      this.editingInvoice = null;
    },
    
    async handleInvoiceSubmit(result) {
      if (result.success) {
        this.closeInvoiceDialog();
        await this.loadInvoices();
      }
    },
    
    // Helpers de formato
    formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString('es-VE');
    },
    
    formatCurrency(amount, currency = 'VES') {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency
      }).format(amount || 0);
    },
    
    getStatusColor(status) {
      const colors = {
        'BORRADOR': 'grey',
        'EMITIDA': 'primary',
        'ENVIADA': 'info',
        'PAGADA': 'success',
        'VENCIDA': 'error',
        'ANULADA': 'grey-darken-3'
      };
      return colors[status] || 'grey';
    },

    getFormattedDisplayAmount(invoice) {
        // 1. Si el usuario activó la vista global en USD (toggle activado)
        if (this.currencyDisplay === 'USD') {
            // Si la factura YA es en USD, mostrarla directa
            if (invoice.financial?.currency === 'USD') {
                return this.formatCurrency(invoice.financial.totalSales || 0, 'USD');
            }
            // Si es VES, usar el monto convertido
            const converted = this.convertedAmounts[invoice.id] !== undefined ? this.convertedAmounts[invoice.id] : 0;
            return this.formatCurrency(converted, 'USD');
        }

        // 2. Si estamos en vista por defecto (VES), respetar la moneda original de cada factura
        const originalCurrency = invoice.financial?.currency || 'VES';
        const amount = invoice.financial?.totalSales || 0;
        
        return this.formatCurrency(amount, originalCurrency);
    },
    
    getDisplayAmount(invoice) {
      if (this.currencyDisplay === 'USD') {
        return this.convertedAmounts[invoice.id] != null ? this.convertedAmounts[invoice.id] : 0;
      }
      return invoice.financial?.totalSales || 0;
    },
    
    async convertAmountToUSD(amountInVES) {
      try {
        if (!this.cachedRate) {
          const rate = await bcvService.getCurrentRate();
          this.cachedRate = parseFloat(rate.data.dollar);
        }
        const result = (amountInVES || 0) / (this.cachedRate || 1);
        console.log('>>>>>>>>>>>>>>>>>>.Tasa de cambio: ', this.cachedRate);
        console.log('Monto en VES (amountInVES):', amountInVES);
        console.log('Resultado de conversión:', result);
        return result;
      } catch (error) {
        console.error('Error en conversión:', error);
        return 0;
      }
    },

    async convertAllAmounts() {
      const map = {};
      try {
        const invoices = Array.isArray(this.filteredInvoices) ? this.filteredInvoices : [];
        const promises = invoices.map(inv => this.convertAmountToUSD(inv.financial?.totalSales || 0));
        const results = await Promise.all(promises);
        invoices.forEach((inv, idx) => {
          map[inv.id] = results[idx];
        });
      } catch (e) {
        console.error('Error convirtiendo montos de facturas:', e);
      }
      this.convertedAmounts = map;
    },
    
    toggleCurrency() {
      this.isChangingCurrency = true;
      setTimeout(() => {
        this.currencyDisplay = this.currencyDisplay === 'VES' ? 'USD' : 'VES';
        this.isChangingCurrency = false;
      }, 300);
    },
    
    // Helper para ordenar facturas según la UI
    getSortedInvoices(invoices) {
      if (!this.sortBy || this.sortBy.length === 0) return invoices;
      
      const { key, order } = this.sortBy[0];
      const factor = order === 'desc' ? -1 : 1;
      
      return [...invoices].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Si ordenamos por monto (total), puede requerir manejo especial si usamos display amounts, 
        // pero aquí usaremos el valor crudo del objeto.
        if (key === 'total') {
             valA = a.financial?.totalSales || 0;
             valB = b.financial?.totalSales || 0;
        }
        else if (key === 'client') {
             // Ordenar por nombre de cliente/emisor
             const nameA = a.flow === 'VENTA' ? (a.client?.companyName || '') : (a.issuer?.companyName || '');
             const nameB = b.flow === 'VENTA' ? (b.client?.companyName || '') : (b.issuer?.companyName || '');
             valA = nameA.toLowerCase();
             valB = nameB.toLowerCase();
        }

        if (valA < valB) return -1 * factor;
        if (valA > valB) return 1 * factor;
        return 0;
      });
    },

    // Exportación
    getExportRecordCount() {
      return this.exportOptions.scope === 'all' ? this.invoices.length : this.filteredInvoices.length;
    },
    
    async exportWithOptions() {
      const invoicesToExport = this.exportOptions.scope === 'all' ? this.invoices : this.filteredInvoices;
      
      try {
        // Preparar información de la empresa para el encabezado
        const clientProfile = this.currentUser?.client || {};
        const orgProfile = Array.isArray(this.currentUser?.organization) 
          ? this.currentUser.organization[0] 
          : (this.currentUser?.organization || {});

        const companyInfo = {
          name: clientProfile.company_name || orgProfile.name || this.currentUser?.companyName || 'Mi Empresa',
          rif: clientProfile.rif || orgProfile.rif || this.currentUser?.rif || 'J-00000000-0',
          period: dayjs().format('MMM YY').toLowerCase()
        };

        // Aplicar ordenamiento seleccionado
        const sortedInvoices = this.getSortedInvoices(invoicesToExport);

        await exportService.exportTable(
          sortedInvoices, 
          this.exportOptions.currency, 
          this.exportOptions.format.toLowerCase(),
          this.exportOptions.mode,
          companyInfo
        );
        this.showExportDialog = false;
      } catch (error) {
        console.error('Error al exportar:', error);
      }
    },
    
    exportTable(format, scope, mode = 'SENIAT') {
      this.exportOptions.format = format.toUpperCase();
      this.exportOptions.scope = scope;
      this.exportOptions.mode = mode;
      this.showExportDialog = true;
    },
    
    // Exportar solo facturas fiscales (para libros SENIAT)
    exportFiscal(flowType) {
      // Verificar si hay facturas antes de mostrar el diálogo
      const fiscalInvoices = this.invoices.filter(inv => 
        inv.documentType === 'FACTURA' && 
        (flowType === 'COMPRA' ? inv.flow === 'COMPRA' : inv.flow === 'VENTA')
      );
      
      if (fiscalInvoices.length === 0) {
        alert(`No hay facturas fiscales de ${flowType === 'COMPRA' ? 'compras/gastos' : 'ventas'} para exportar.`);
        return;
      }
      
      // Abrir diálogo de filtros de fecha
      this.pendingExportType = 'fiscal';
      this.pendingExportFlow = flowType;
      this.resetExportDateFilters();
      this.exportDateDialog = true;
    },
    
    // Exportar todo (facturas + recibos)
    exportGeneral(flowType) {
      // Verificar si hay registros antes de mostrar el diálogo
      const allRecords = this.invoices.filter(inv => 
        flowType === 'COMPRA' ? inv.flow === 'COMPRA' : inv.flow === 'VENTA'
      );
      
      if (allRecords.length === 0) {
        alert(`No hay registros de ${flowType === 'COMPRA' ? 'compras/gastos' : 'ventas'} para exportar.`);
        return;
      }
      
      // Abrir diálogo de filtros de fecha
      this.pendingExportType = 'general';
      this.pendingExportFlow = flowType;
      this.resetExportDateFilters();
      this.exportDateDialog = true;
    },
    
    // Resetear filtros de fecha para nueva exportación
    resetExportDateFilters() {
      this.exportDateMode = 'month';
      // Por defecto, seleccionar el mes actual usando formato de CustomDatePicker
      const now = new Date();
      this.exportMonthDate = { month: now.getMonth(), year: now.getFullYear() };
      this.exportDateRange = null;
      // Mantener compatibilidad con formato string
      this.exportMonth = dayjs().format('YYYY-MM');
      this.exportDateFrom = '';
      this.exportDateTo = '';
      this.exportDateError = '';
    },
    
    // Cancelar diálogo de exportación con fecha
    cancelExportDateDialog() {
      this.exportDateDialog = false;
      this.pendingExportType = null;
      this.pendingExportFlow = null;
    },
    
    /**
     * Aplicar filtro de fecha a un array de facturas
     * Soporta tanto formato month picker {month, year} como range picker [Date, Date]
     * @param {Array} invoices - Array de facturas a filtrar
     * @returns {Array} - Facturas filtradas por fecha
     */
    applyDateFilterToInvoices(invoices) {
      if (!invoices || invoices.length === 0) return [];
      
      this.exportDateError = '';
      
      if (this.exportDateMode === 'month') {
        // Modo mes: usar exportMonthDate {month: 0-11, year: YYYY}
        if (!this.exportMonthDate) return invoices;
        
        const targetYear = this.exportMonthDate.year;
        const targetMonth = this.exportMonthDate.month; // 0-indexed
        
        return invoices.filter(inv => {
          if (!inv.issueDate) return false;
          const invoiceDate = new Date(inv.issueDate);
          return invoiceDate.getFullYear() === targetYear && 
                 invoiceDate.getMonth() === targetMonth;
        });
      } else {
        // Modo rango: usar exportDateRange [startDate, endDate]
        if (!this.exportDateRange || this.exportDateRange.length < 2) {
          // Sin rango seleccionado, devolver todas
          return invoices;
        }
        
        const [startDate, endDate] = this.exportDateRange;
        
        if (!startDate || !endDate) return invoices;
        
        // Validar que el rango sea válido
        if (startDate > endDate) {
          this.exportDateError = 'La fecha de inicio no puede ser posterior a la fecha fin.';
          return [];
        }
        
        // Normalizar fechas para comparación (inicio del día)
        const startNormalized = new Date(startDate);
        startNormalized.setHours(0, 0, 0, 0);
        
        const endNormalized = new Date(endDate);
        endNormalized.setHours(23, 59, 59, 999);
        
        return invoices.filter(inv => {
          if (!inv.issueDate) return false;
          const invoiceDate = new Date(inv.issueDate);
          return invoiceDate >= startNormalized && invoiceDate <= endNormalized;
        });
      }
    },
    
    // Confirmar exportación con filtro de fecha aplicado
    async confirmExportWithDateFilter() {
      if (!this.pendingExportFlow) return;
      
      // Obtener facturas base según tipo y flow
      let baseInvoices = this.invoices.filter(inv => {
        const flowMatch = this.pendingExportFlow === 'COMPRA' 
          ? inv.flow === 'COMPRA' 
          : inv.flow === 'VENTA';
        
        if (this.pendingExportType === 'fiscal') {
          return flowMatch && inv.documentType === 'FACTURA';
        }
        return flowMatch;
      });
      
      // Aplicar filtro de fecha
      const filteredInvoices = this.applyDateFilterToInvoices(baseInvoices);
      
      // Log de depuración para verificar el filtrado
      console.log('📊 Export Debug Info:');
      console.log(`   - Mode: ${this.exportDateMode}`);
      console.log(`   - Base invoices: ${baseInvoices.length}`);
      console.log(`   - Filtered invoices: ${filteredInvoices.length}`);
      if (this.exportDateMode === 'month' && this.exportMonthDate) {
        console.log(`   - Month filter: ${this.exportMonthDate.month + 1}/${this.exportMonthDate.year}`);
      } else if (this.exportDateRange) {
        console.log(`   - Range filter: ${this.exportDateRange[0]} to ${this.exportDateRange[1]}`);
      }
      
      if (filteredInvoices.length === 0) {
        alert('No hay registros que coincidan con el filtro de fecha seleccionado.');
        return;
      }
      
      // Determinar modo de exportación
      const mode = this.pendingExportType === 'fiscal' ? 'SENIAT' : 'GENERAL';
      
      // Generar período para el nombre del archivo
      let periodSuffix = '';
      if (this.exportDateMode === 'month' && this.exportMonthDate) {
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        periodSuffix = `${monthNames[this.exportMonthDate.month]}_${this.exportMonthDate.year}`;
      } else if (this.exportDateRange && this.exportDateRange.length >= 2) {
        const from = dayjs(this.exportDateRange[0]).format('DDMMYY');
        const to = dayjs(this.exportDateRange[1]).format('DDMMYY');
        periodSuffix = `${from}-${to}`;
      }
      
      console.log(`   - Period suffix: ${periodSuffix}`);
      console.log(`   - Invoices to export:`, filteredInvoices.map(i => ({ num: i.invoiceNumber, date: i.issueDate })));
      
      try {
        await this.startExport(filteredInvoices, this.pendingExportFlow, mode, periodSuffix);
        this.exportDateDialog = false;
        this.pendingExportType = null;
        this.pendingExportFlow = null;
      } catch (error) {
        console.error('Error al exportar con filtro de fecha:', error);
      }
    },
    
    // Iniciar exportación con los datos preparados
    async startExport(invoicesToExport, flowType, mode, periodSuffix = '') {
      try {
        // Preparar información de la empresa
        const clientProfile = this.currentUser?.client || {};
        const orgProfile = Array.isArray(this.currentUser?.organization) 
          ? this.currentUser.organization[0] 
          : (this.currentUser?.organization || {});
        
        // Usar el período proporcionado o el mes actual como fallback
        const periodDisplay = periodSuffix || dayjs().format('YYYY-MM');
        
        const companyInfo = {
          name: clientProfile.company_name || orgProfile.name || this.currentUser?.companyName || 'Mi Empresa',
          rif: clientProfile.rif || orgProfile.rif || this.currentUser?.rif || 'J-00000000-0',
          period: periodSuffix || dayjs().format('MMM YY').toLowerCase()
        };
        
        const filename = mode === 'SENIAT' 
          ? `Libro_${flowType === 'VENTA' ? 'Ventas' : 'Compras'}_${periodDisplay}.xlsx`
          : `Reporte_${flowType}_General_${periodDisplay}.xlsx`;
        
        // Aplicar ordenamiento seleccionado antes de enviar al servicio de exportación
        const sortedInvoices = this.getSortedInvoices(invoicesToExport);

        await exportService.exportTable(sortedInvoices, 'VES', filename, mode, companyInfo);

        
        console.log(`✅ Exportación exitosa: ${filename} (${invoicesToExport.length} registros)`);
      } catch (error) {
        console.error('Error en startExport:', error);
        throw error;
      }
    },
    
    exportInvoice(invoice) {
      // Exportar una sola factura
      this.filteredInvoices = [invoice];
      this.exportOptions.scope = 'filtered';
      this.showExportDialog = true;
    }
  }
};
</script>

<style scoped>
.total-amount-display {
  font-weight: 600;
  transition: all 0.3s ease;
}

.amount-changing {
  opacity: 0.5;
  transform: scale(0.95);
}

/* Export Date Dialog Styles */
.export-date-dialog {
  overflow: hidden;
}

.mode-card {
  transition: all 0.2s ease;
  min-height: 100px;
}

.mode-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.cursor-pointer {
  cursor: pointer;
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7) !important;
}

.border-primary {
  border: 2px solid rgb(var(--v-theme-primary)) !important;
}

/* Date input clickable styles */
.date-input-clickable {
  cursor: pointer;
}

.date-input-clickable :deep(.v-field) {
  cursor: pointer;
}

.date-input-clickable :deep(.v-field__input) {
  cursor: pointer;
  min-height: 56px;
}

.date-input-clickable :deep(input[type="date"]),
.date-input-clickable :deep(input[type="month"]) {
  cursor: pointer;
  font-size: 16px;
}

/* Hide the native date picker icon since we have our own button */
.date-input-clickable :deep(input[type="date"]::-webkit-calendar-picker-indicator),
.date-input-clickable :deep(input[type="month"])::-webkit-calendar-picker-indicator {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  cursor: pointer;
}
</style>
