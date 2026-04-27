<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center justify-end mb-6">
      <div class="d-flex" style="gap: 12px;">
         <v-btn
          color="secondary"
          variant="elevated"
          prepend-icon="mdi-file-document-outline"
          @click="adjustmentDialog = true"
        >
          Escanear Documento (IA)
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          prepend-icon="mdi-plus"
          @click="openProductDialog()"
        >
          Nuevo Producto
        </v-btn>
        <v-btn
          color="white"
          variant="elevated"
          class="text-secondary"
          prepend-icon="mdi-export"
        >
          Exportar
          
          <v-menu activator="parent">
            <v-list>
              <v-list-item 
                prepend-icon="mdi-cash-multiple" 
                title="Inventario Valorizado" 
                @click="downloadValuation" 
              />
              <v-list-item 
                prepend-icon="mdi-history" 
                title="Kardex Global" 
                @click="downloadKardex" 
              />
              <v-list-item 
                prepend-icon="mdi-table-arrow-right" 
                title="Resumen Horizontal" 
                @click="openExportDialog"
              />
            </v-list>
          </v-menu>
        </v-btn>
      </div>
    </div>

    <!-- Estadísticas rápidas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="4">
        <StatsCard
          title="Total Productos"
          :value="stats.totalProducts"
          bg-color="#02254d"
          text-color="white"
        />
      </v-col>
      
      <v-col cols="12" sm="6" md="4">
        <CurrencyStatsCard
          title="Valor en Inventario (Costo)"
          :value="convertedTotalValueCost"
          bg-color="#f0d29b"
          text-color="#010101"
          :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
          @toggle-currency="toggleCurrency"
        />
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <CurrencyStatsCard
          title="Valor Estimado (Venta)"
          :value="convertedTotalValueSale"
          bg-color="#f2b648"
          text-color="#010101"
          :currency-symbol="currencyDisplay === 'VES' ? 'Bs. ' : '$'"
          @toggle-currency="toggleCurrency"
        />
      </v-col>
    </v-row>

    <!-- Filtros Colapsables de Fecha -->
    <v-expansion-panels class="mb-6" variant="accordion">
      <v-expansion-panel>
        <v-expansion-panel-title>
          <div class="d-flex align-center">
            <v-icon start>mdi-filter-variant</v-icon>
            <span class="font-weight-medium">Filtros de Fecha</span>
            <v-chip 
              v-if="dateFromFilter || dateToFilter" 
              size="small" 
              color="primary" 
              variant="tonal"
              class="ml-3"
            >
              Filtro Activo
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-row class="mt-2">
            <!-- Selector Rápido -->
            <v-col cols="12" md="4">
              <v-select
                v-model="quickDateFilter"
                :items="quickDateOptions"
                item-title="title"
                item-value="value"
                prepend-inner-icon="mdi-clock-fast"
                label="Intervalos de tiempo"
                variant="outlined"
                hide-details
                @update:model-value="applyQuickDate"
              ></v-select>
            </v-col>
            
            <!-- Fecha Desde -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="dateFromFilter"
                label="Desde"
                type="date"
                variant="outlined"
                hide-details
              ></v-text-field>
            </v-col>

            <!-- Fecha Hasta -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="dateToFilter"
                label="Hasta"
                type="date"
                variant="outlined"
                hide-details
              ></v-text-field>
            </v-col>
            
            <v-col cols="12" class="d-flex justify-end mt-2 pt-0">
               <v-btn variant="text" color="error" class="mr-2" @click="resetDateFilters">Limpiar</v-btn>
            </v-col>
          </v-row>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Tabs de Navegación -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6 bg-white rounded-lg elevation-1">
      <v-tab value="dashboard" prepend-icon="mdi-view-dashboard">Tablero</v-tab>
      <v-tab value="products" prepend-icon="mdi-package-variant">Productos</v-tab>
      <v-tab value="movements" prepend-icon="mdi-history">Movimientos (Kardex)</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- DASHBOARD TAB -->
      <v-window-item value="dashboard">
        <v-row class="ma-0">
          <!-- Top Productos -->
          <v-col cols="12" md="6" class="pl-0 py-0 pr-md-2 mb-4 mb-md-0">
            <v-card class="h-100 rounded-xl" elevation="2">
              <v-card-title class="d-flex align-center">
                <v-icon color="secondary" class="mr-2">mdi-chart-line</v-icon>
                Top Productos Vendidos
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item
                     v-for="(product, i) in topSellingProducts"
                     :key="i"
                     :title="product.name"
                     :subtitle="product.totalSold + ' ' + product.unit"
                  >
                    <template v-slot:prepend>
                      <v-avatar color="secondary" size="32" class="text-caption">
                        {{ i + 1 }}
                      </v-avatar>
                    </template>
                    <template v-slot:append>
                      <div class="text-right">
                         <div class="text-caption text-grey">Ingresos Est.</div>
                         <div class="font-weight-bold text-success">{{ formatCurrency(product.totalRevenue) }}</div>
                      </div>
                    </template>
                  </v-list-item>
                  <div v-if="topSellingProducts.length === 0" class="text-center text-grey py-4">
                    No hay datos de ventas suficientes
                  </div>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        
          <!-- Listado de Stock Bajo -->
           <v-col cols="12" md="6" class="pr-0 py-0 pl-md-2">
             <v-card class="h-100 rounded-xl" elevation="2" title="Resumen de Stock Bajo" prepend-icon="mdi-alert-circle-outline">
               <v-data-table
                 :headers="productHeaders"
                 :items="lowStockProducts"
                 density="compact"
                 hide-default-footer
               >
                 <template v-slot:item.stock="{ item }">
                    <v-chip color="error" size="small">{{ item.stock }} {{ item.unit }}</v-chip>
                 </template>
                 <template v-slot:bottom></template>
               </v-data-table>
               <v-card-text v-if="lowStockProducts.length === 0" class="text-center text-grey pa-4">
                 Todo en orden. No hay productos con stock bajo.
               </v-card-text>
             </v-card>
           </v-col>
        </v-row>
      </v-window-item>

      <!-- PRODUCTS TAB -->
      <v-window-item value="products">
        <v-card>
          <v-card-title class="d-flex align-center py-3 px-4">
            <v-text-field
              v-model="productSearch"
              prepend-inner-icon="mdi-magnify"
              label="Buscar producto..."
              variant="outlined"
              density="compact"
              hide-details
              class="flex-grow-1 mr-4"
              style="max-width: 400px;"
            ></v-text-field>
            <v-checkbox
              v-model="showDeletedProducts"
              label="Incluir eliminados"
              density="compact"
              hide-details
              class="mr-4"
              @update:model-value="loadProducts"
            ></v-checkbox>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-refresh" variant="text" @click="loadProducts"></v-btn>
          </v-card-title>

          <v-data-table
            :headers="productHeaders"
            :items="filteredProducts"
            :loading="loadingProducts"
            :search="productSearch"
            hover
          >
            <!-- Indicador de producto eliminado -->
            <template v-slot:item.name="{ item }">
              <div class="d-flex align-center">
                <span :class="{ 'text-decoration-line-through text-grey': item.deleted_at }">
                  {{ item.name }}
                </span>
                <v-chip
                  v-if="item.deleted_at"
                  size="x-small"
                  color="error"
                  variant="tonal"
                  class="ml-2"
                >
                  Eliminado
                </v-chip>
              </div>
            </template>

            <!-- Stock con Color -->
            <template v-slot:item.stock="{ item }">
              <v-chip
                :color="getStockColor(item)"
                size="small"
                variant="flat"
                class="font-weight-bold"
              >
                {{ item.stock }} {{ item.unit }}
              </v-chip>
            </template>

            <!-- Precios con Multi-divisa -->
            <template v-slot:item.cost_price="{ item }">
              <div class="d-flex flex-column">
                <span>{{ formatCurrency(item.cost_price, item.currency) }}</span>
                <span v-if="item.currency && item.currency !== 'VES'" class="text-caption text-grey">
                  ≈ {{ formatCurrency(item.cost_price * exchangeRate, 'VES') }}
                </span>
              </div>
            </template>
            <template v-slot:item.sale_price="{ item }">
              <div class="d-flex flex-column">
                <span>{{ formatCurrency(item.sale_price, item.currency) }}</span>
                <span v-if="item.currency && item.currency !== 'VES'" class="text-caption text-grey">
                  ≈ {{ formatCurrency(item.sale_price * exchangeRate, 'VES') }}
                </span>
              </div>
            </template>

            <!-- Acciones -->
            <template v-slot:item.actions="{ item }">
              <div class="d-flex">
                <template v-if="!item.deleted_at">
                  <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="openProductDialog(item)"></v-btn>
                  <v-btn icon="mdi-history" size="small" variant="text" color="info" @click="viewMovements(item)" title="Ver Kardex"></v-btn>
                  <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="openDeleteDialog(item)"></v-btn>
                </template>
                <template v-else>
                  <v-btn
                    icon="mdi-restore"
                    size="small"
                    variant="text"
                    color="success"
                    @click="openRestoreDialog(item)"
                    title="Restaurar producto"
                  ></v-btn>
                  <v-btn icon="mdi-history" size="small" variant="text" color="info" @click="viewMovements(item)" title="Ver Kardex"></v-btn>
                </template>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- MOVEMENTS TAB -->
      <v-window-item value="movements">
        <v-card>
          <v-card-title>Historial de Movimientos</v-card-title>
          <!-- Filtros de Movimientos podría ir aquí -->
          <v-data-table
             :headers="movementHeaders"
             :items="filteredMovements"
             :loading="loadingMovements"
          >
            <template v-slot:item.movement_type="{ item }">
              <v-chip :color="getMovementColor(item.movement_type)" size="small">
                {{ translateMovementType(item.movement_type) }}
              </v-chip>
            </template>
            <template v-slot:item.created_at="{ item }">
              {{ formatDate(item.created_at) }}
            </template>
             <template v-slot:item.quantity="{ item }">
              <span :class="item.quantity >= 0 ? 'text-success' : 'text-error'">
                {{ item.quantity > 0 ? '+' : '' }}{{ item.quantity }}
              </span>
            </template>
            <!-- Numero de factura de referencia legible -->
            <template v-slot:item.invoice_number="{ item }">
              <v-chip
                v-if="item.invoice_number"
                size="x-small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-file-document-outline"
              >
                {{ item.invoice_number }}
              </v-chip>
              <span v-else class="text-caption text-disabled">N/A</span>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Dialogo Producto -->
    <v-dialog v-model="productDialog" max-width="600px">
      <v-card>
        <v-card-title>{{ editingProduct ? 'Editar Producto' : 'Nuevo Producto' }}</v-card-title>
        <v-card-text>
          <v-form ref="productForm" v-model="productValid" @submit.prevent="saveProduct">
            <v-row dense>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="productForm.code"
                  label="Código / SKU"
                  variant="outlined"
                  hint="Código de barras o interno"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="productForm.unit"
                  label="Unidad"
                  :items="['UND', 'KG', 'LTS', 'MTS', 'CAJA', 'BULTO']"
                  variant="outlined"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="productForm.name"
                  label="Nombre del Producto"
                  variant="outlined"
                  :rules="[v => !!v || 'Requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="productForm.description"
                  label="Descripción"
                  variant="outlined"
                  rows="2"
                ></v-textarea>
              </v-col>
              <!-- Moneda del producto -->
              <v-col cols="12" sm="4">
                <v-select
                  v-model="productForm.currency"
                  :items="[
                    { title: 'Bolívares (Bs)', value: 'VES' },
                    { title: 'Dólares (USD)', value: 'USD' },
                    { title: 'Euros (EUR)', value: 'EUR' }
                  ]"
                  item-title="title"
                  item-value="value"
                  label="Moneda del precio"
                  variant="outlined"
                  prepend-inner-icon="mdi-currency-usd"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                  v-model.number="productForm.cost_price"
                  :label="`Costo Unitario (${productForm.currency || 'VES'})`"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  :prefix="productForm.currency === 'USD' ? '$' : productForm.currency === 'EUR' ? '€' : 'Bs'"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="4">
                <v-text-field
                   v-model.number="productForm.sale_price"
                   :label="`Precio Venta (${productForm.currency || 'VES'})`"
                   type="number"
                   step="0.01"
                   variant="outlined"
                   :prefix="productForm.currency === 'USD' ? '$' : productForm.currency === 'EUR' ? '€' : 'Bs'"
                 ></v-text-field>
              </v-col>
              
              <!-- Ajuste de Stock Inicial (Solo al crear) -->
              <v-col cols="12" v-if="!editingProduct">
                <v-divider class="my-2"></v-divider>
                <div class="text-subtitle-2 mb-2">Inventario Inicial</div>
                <v-row dense>
                  <v-col cols="6">
                     <v-text-field
                        v-model.number="productForm.initial_stock"
                        label="Stock Inicial"
                        type="number"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                   <v-col cols="6">
                     <v-text-field
                        v-model.number="productForm.min_stock"
                        label="Stock Mínimo (Alerta)"
                        type="number"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                </v-row>
              </v-col>
              
              <!-- Stock Mínimo al editar -->
              <v-col cols="12" v-else>
                 <v-text-field
                    v-model.number="productForm.min_stock"
                    label="Stock Mínimo (Alerta)"
                    type="number"
                    variant="outlined"
                 ></v-text-field>
              </v-col>

            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="productDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="saveProduct">Guardar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialogo Kardex (Movimientos Producto) -->
    <v-dialog v-model="movementsDialog" max-width="900px">
      <v-card>
        <v-card-title>
           Movimientos: {{ selectedProductForMovements?.name }}
           <v-chip class="ml-2" size="small">{{ selectedProductForMovements?.stock }} {{ selectedProductForMovements?.unit }}</v-chip>
        </v-card-title>
        <v-card-text>
           <v-data-table
             :headers="movementHeaders"
             :items="productMovements"
             :loading="loadingProductMovements"
             item-value="id"
           >
              <template v-slot:item.movement_type="{ item }">
                <v-chip :color="getMovementColor(item.movement_type)" size="small">
                  {{ translateMovementType(item.movement_type) }}
                </v-chip>
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at, true) }}
              </template>
               <template v-slot:item.quantity="{ item }">
                <span :class="item.quantity >= 0 ? 'text-success font-weight-bold' : 'text-error font-weight-bold'">
                  {{ item.quantity > 0 ? '+' : '' }}{{ item.quantity }}
                </span>
              </template>
              <!-- Factura de referencia en el diálogo de Kardex por producto -->
              <template v-slot:item.invoice_number="{ item }">
                <v-chip
                  v-if="item.invoice_number"
                  size="x-small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-file-document-outline"
                >
                  {{ item.invoice_number }}
                </v-chip>
                <span v-else class="text-caption text-disabled">N/A</span>
              </template>
           </v-data-table>
        </v-card-text>
        <v-card-actions>
           <v-spacer></v-spacer>
           <v-btn color="primary" @click="movementsDialog = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <InventoryAdjustmentDialog
        v-model="adjustmentDialog"
        @saved="() => { loadDashboard(); loadProducts(); }"
    />

    <!-- Diálogo Confirmar Eliminación (Soft Delete) -->
    <v-dialog v-model="deleteConfirmDialog" max-width="500px">
      <v-card>
        <v-card-title class="text-h6 bg-error text-white">
          <v-icon start color="white">mdi-delete-alert</v-icon>
          Eliminar Producto
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">
            ¿Está seguro que desea eliminar el producto <strong>{{ productToDelete?.name }}</strong>?
          </p>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            <strong>Este producto se marcará como eliminado.</strong>
          </v-alert>
          <ul class="text-caption text-grey-darken-1 pl-4">
            <li>No afectará el historial de stock ni movimientos anteriores.</li>
            <li>No aparecerá en el buscador de ventas ni en listas de productos activos.</li>
            <li>Podrá restaurarlo posteriormente si es necesario.</li>
          </ul>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteConfirmDialog = false">Cancelar</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmDeleteProduct">
            <v-icon start>mdi-delete</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo Confirmar Restauración -->
    <v-dialog v-model="restoreConfirmDialog" max-width="450px">
      <v-card>
        <v-card-title class="text-h6 bg-success text-white">
          <v-icon start color="white">mdi-restore</v-icon>
          Restaurar Producto
        </v-card-title>
        <v-card-text class="pt-4">
          <p>
            ¿Desea restaurar el producto <strong>{{ productToRestore?.name }}</strong>?
          </p>
          <p class="text-caption text-grey mt-2">
            El producto volverá a estar activo y aparecerá en el buscador de ventas.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="restoreConfirmDialog = false">Cancelar</v-btn>
          <v-btn color="success" variant="elevated" @click="confirmRestoreProduct">
            <v-icon start>mdi-restore</v-icon>
            Restaurar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialogo Exportar Resumen -->
    <v-dialog v-model="exportDialog" max-width="400px">
      <v-card>
        <v-card-title>Exportar Resumen</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-text-field v-model="exportDates.start" label="Desde" type="date" variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="exportDates.end" label="Hasta" type="date" variant="outlined"></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="exportDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="confirmExportSummary">Exportar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script>
import inventoryService from '@/services/inventoryService'
import inventoryExportService from '@/services/inventoryExportService'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import InventoryAdjustmentDialog from '@/components/inventory/InventoryAdjustmentDialog.vue'
import StatsCard from '@/components/common/StatsCard.vue'
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, subMonths } from 'date-fns'

export default {
  name: 'ClienteInventario',
  components: { AnimatedNumber, InventoryAdjustmentDialog, StatsCard, CurrencyStatsCard },
  data() {
    return {
      activeTab: 'dashboard',
      
      // Date Filters
      dateFromFilter: null,
      dateToFilter: null,
      quickDateFilter: 'all',
      quickDateOptions: [
        { value: 'all', title: 'Todos los tiempos' },
        { value: 'thisMonth', title: 'Este Mes' },
        { value: 'lastMonth', title: 'Mes Pasado' },
        { value: 'thisQuarter', title: 'Este Trimestre' },
        { value: 'thisSemester', title: 'Este Semestre' },
        { value: 'thisYear', title: 'Este Año' }
      ],

      // Data
      products: [],
      movements: [], // Ultimos movimientos generales
      lowStockProducts: [],
      topSellingProducts: [],
      stats: {
        totalProducts: 0,
        totalValueCost: 0,
        totalValueSale: 0
      },
      
      adjustmentDialog: false,
      exportDialog: false,
      exportDates: { start: new Date().toISOString().substr(0, 10), end: new Date().toISOString().substr(0, 10) },

      // Loading states
      loadingProducts: false,
      loadingMovements: false,
      loadingProductMovements: false,

      // UI Config
      currencyDisplay: 'VES',
      exchangeRate: 1,      // Tasa USD/VES
      exchangeRateEur: 1,   // Tasa EUR/VES

      productSearch: '',
      productDialog: false,
      editingProduct: null,
      productValid: false,
      productForm: {
        code: '',
        name: '',
        description: '',
        unit: 'UND',
        cost_price: 0,
        sale_price: 0,
        min_stock: 5,
        initial_stock: 0
      },

      // Soft delete UI
      showDeletedProducts: false,
      deleteConfirmDialog: false,
      productToDelete: null,
      deletedProducts: [],
      restoreConfirmDialog: false,
      productToRestore: null,

      movementsDialog: false,
      selectedProductForMovements: null,
      productMovements: [],

      // Headers
      productHeaders: [
        { title: 'Código', key: 'code', width: '10%' },
        { title: 'Nombre', key: 'name', width: '30%' },
        { title: 'Stock', key: 'stock', width: '15%' },
        { title: 'Costo', key: 'cost_price', width: '15%' },
        { title: 'Precio Venta', key: 'sale_price', width: '15%' },
        { title: 'Acciones', key: 'actions', sortable: false, align: 'end' },
      ],
      movementHeaders: [
        { title: 'Fecha/Hora', key: 'created_at' },
        { title: 'Tipo', key: 'movement_type' },
        { title: 'Cantidad', key: 'quantity' },
        { title: 'Costo Unit.', key: 'cost_price' },
        { title: 'Factura Ref.', key: 'invoice_number' },
        { title: 'Descripción', key: 'description' },
      ]
    }
  },
  computed: {
    filteredProducts() {
      let result = this.products;
      if (this.dateFromFilter) {
        result = result.filter(p => new Date(p.created_at) >= new Date(this.dateFromFilter));
      }
      if (this.dateToFilter) {
        const toDate = new Date(this.dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter(p => new Date(p.created_at) <= toDate);
      }
      return result;
    },
    filteredMovements() {
      let result = this.movements;
      if (this.dateFromFilter) {
        result = result.filter(m => new Date(m.created_at) >= new Date(this.dateFromFilter));
      }
      if (this.dateToFilter) {
        const toDate = new Date(this.dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        result = result.filter(m => new Date(m.created_at) <= toDate);
      }
      return result;
    },
    convertedTotalValueCost() {
      // stats.totalValueCost is now an object: { VES: 100, USD: 20, EUR: 0 }
      const costVES = this.stats?.totalValueCost?.VES || 0;
      const costUSD = this.stats?.totalValueCost?.USD || 0;
      const costEUR = this.stats?.totalValueCost?.EUR || 0;
      
      if (this.currencyDisplay === 'VES') {
        // Todos los valores convertidos a Bs
        return costVES + (costUSD * this.exchangeRate) + (costEUR * this.exchangeRateEur);
      } else {
        // En USD: USD puros + VES convertidos + EUR convertido a USD via Bs
        const eurInUsd = this.exchangeRate > 0 ? (costEUR * this.exchangeRateEur) / this.exchangeRate : 0;
        return costUSD + (costVES / this.exchangeRate) + eurInUsd;
      }
    },
    convertedTotalValueSale() {
      const saleVES = this.stats?.totalValueSale?.VES || 0;
      const saleUSD = this.stats?.totalValueSale?.USD || 0;
      const saleEUR = this.stats?.totalValueSale?.EUR || 0;
      
      if (this.currencyDisplay === 'VES') {
        return saleVES + (saleUSD * this.exchangeRate) + (saleEUR * this.exchangeRateEur);
      } else {
        const eurInUsd = this.exchangeRate > 0 ? (saleEUR * this.exchangeRateEur) / this.exchangeRate : 0;
        return saleUSD + (saleVES / this.exchangeRate) + eurInUsd;
      }
    }
  },
  async mounted() {
    await this.loadDashboard()
    await this.fetchExchangeRate()
  },
  watch: {
    activeTab(val) {
      if (val === 'products') this.loadProducts()
      if (val === 'dashboard') this.loadDashboard()
      if (val === 'movements') this.loadMovements()
    }
  },
  methods: {
    applyQuickDate() {
      const today = new Date();
      switch (this.quickDateFilter) {
        case 'thisMonth':
          this.dateFromFilter = format(startOfMonth(today), 'yyyy-MM-dd');
          this.dateToFilter = format(endOfMonth(today), 'yyyy-MM-dd');
          break;
        case 'lastMonth':
          const lastM = subMonths(today, 1);
          this.dateFromFilter = format(startOfMonth(lastM), 'yyyy-MM-dd');
          this.dateToFilter = format(endOfMonth(lastM), 'yyyy-MM-dd');
          break;
        case 'thisQuarter':
          this.dateFromFilter = format(startOfQuarter(today), 'yyyy-MM-dd');
          this.dateToFilter = format(endOfQuarter(today), 'yyyy-MM-dd');
          break;
        case 'thisSemester':
          // Simplification for semester: approx by checking month
          const month = today.getMonth();
          if (month < 6) {
              this.dateFromFilter = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
              this.dateToFilter = format(new Date(today.getFullYear(), 5, 30), 'yyyy-MM-dd');
          } else {
              this.dateFromFilter = format(new Date(today.getFullYear(), 6, 1), 'yyyy-MM-dd');
              this.dateToFilter = format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd');
          }
          break;
        case 'thisYear':
          this.dateFromFilter = format(startOfYear(today), 'yyyy-MM-dd');
          this.dateToFilter = format(endOfYear(today), 'yyyy-MM-dd');
          break;
        case 'all':
        default:
          this.dateFromFilter = null;
          this.dateToFilter = null;
          break;
      }
    },
    resetDateFilters() {
      this.quickDateFilter = 'all';
      this.dateFromFilter = null;
      this.dateToFilter = null;
    },
    async fetchExchangeRate() {
        try {
            const bcvServiceModule = await import('@/services/bcvService');
            const rate = await bcvServiceModule.default.getCurrentRate();
            if (rate && rate.success && rate.data) {
                // Guardar tasa USD
                this.exchangeRate = parseFloat(rate.data.dollar) || 1;
                // Guardar tasa EUR si está disponible
                if (rate.data.euro) {
                    this.exchangeRateEur = parseFloat(rate.data.euro) || 1;
                }
            }
        } catch(e) {
            console.warn('Could not fetch BCV exchange rate', e);
        }
    },
    async toggleCurrency() {
        if (this.currencyDisplay === 'VES') {
            if (this.exchangeRate === 1) {
                await this.fetchExchangeRate();
            }
            this.currencyDisplay = 'USD';
        } else {
            this.currencyDisplay = 'VES';
        }
    },
    async loadMovements() {
      this.loadingMovements = true
      try {
        this.movements = await inventoryService.getAllMovements({ limit: 500 })
      } catch (e) {
        console.error('Error loading movements', e)
      } finally {
        this.loadingMovements = false
      }
    },
    async loadDashboard() {
      // Ejecutar las 3 queries en PARALELO — server-side, no client-side
      try {
        const [stats, topSelling, lowStock] = await Promise.all([
          inventoryService.getDashboardStats(),
          inventoryService.getTopSellingProducts(5),    // RPC: GROUP BY en BD
          inventoryService.getLowStockProducts()         // RPC: filtro stock <= min en BD
        ])

        if (stats) this.stats = stats
        this.topSellingProducts = topSelling || []
        this.lowStockProducts   = lowStock   || []
      } catch (e) {
        console.error('Error loading dashboard', e)
      }
    },
    async loadProducts() {
      this.loadingProducts = true
      try {
        this.products = await inventoryService.getProducts({ includeDeleted: this.showDeletedProducts })
      } catch (e) {
        console.error(e)
      } finally {
        this.loadingProducts = false
      }
    },
    
    // CRUD Producto
    openProductDialog(product = null) {
      this.editingProduct = product
      if (product) {
        this.productForm = { ...product }
      } else {
        this.productForm = {
          code: '',
          name: '',
          description: '',
          unit: 'UND',
          currency: 'VES',
          cost_price: 0,
          sale_price: 0,
          min_stock: 5,
          initial_stock: 0
        }
      }
      this.productDialog = true
    },
    
    async saveProduct() {
      if (!this.$refs.productForm.validate()) return
      
      try {
        const payload = { ...this.productForm }
        const initialStock = payload.initial_stock // Extract simple property
        delete payload.initial_stock // No enviar al update/create directamente

        let productId
        
        if (this.editingProduct) {
          await inventoryService.updateProduct(this.editingProduct.id, payload)
          productId = this.editingProduct.id
        } else {
          // Auto-generar SKU si el usuario no ingresó código
          if (!payload.code || payload.code.trim() === '') {
            try {
              payload.code = await inventoryService.getNextProductSku()
            } catch {
              payload.code = `PROD-${Date.now().toString().slice(-5)}`
            }
          }

          // Crear producto con stock 0 y registrar movimiento inicial
          const { data: newProds, error } = await inventoryService.createProduct({
            ...payload,
            stock: 0
          })
          
          if (error) throw error
          const newProd = newProds[0]
          productId = newProd.id
          
          // Registrar Movimiento Inicial si aplica
          if (initialStock > 0) {
             await inventoryService.registerMovement({
               product_id: productId,
               movement_type: 'INITIAL',
               quantity: initialStock,
               cost_price: payload.cost_price,
               description: 'Inventario Inicial'
             })
          }
        }
        
        this.productDialog = false
        // Recargar en paralelo para no bloquear la UI
        await Promise.all([this.loadProducts(), this.loadDashboard()])
      } catch (e) {
        console.error('Error saving product', e)
      }
    },

    // Abrir diálogo de confirmación de eliminación
    openDeleteDialog(item) {
      this.productToDelete = item
      this.deleteConfirmDialog = true
    },

    // Confirmar soft delete
    async confirmDeleteProduct() {
      try {
        await inventoryService.deleteProduct(this.productToDelete.id)
        this.deleteConfirmDialog = false
        this.productToDelete = null
        this.loadProducts()
        this.loadDashboard()
      } catch (e) {
        console.error('Error deleting product', e)
      }
    },

    // Abrir diálogo de restauración
    openRestoreDialog(item) {
      this.productToRestore = item
      this.restoreConfirmDialog = true
    },

    // Confirmar restauración de producto
    async confirmRestoreProduct() {
      try {
        await inventoryService.restoreProduct(this.productToRestore.id)
        this.restoreConfirmDialog = false
        this.productToRestore = null
        this.loadProducts()
        this.loadDashboard()
      } catch (e) {
        console.error('Error restoring product', e)
      }
    },

    // Kardex
    async viewMovements(item) {
       this.selectedProductForMovements = item
       this.loadingProductMovements = true
       this.movementsDialog = true
       try {
         this.productMovements = await inventoryService.getProductMovements(item.id)
       } catch (e) {
         console.error(e)
       } finally {
         this.loadingProductMovements = false
       }
    },

    // Helpers
    getStockColor(item) {
      if (item.stock <= 0) return 'error'
      if (item.stock <= item.min_stock) return 'warning'
      return 'success'
    },
    getMovementColor(type) {
        const map = {
            'INITIAL': 'info',
            'IN_PURCHASE': 'success',
            'OUT_SALE': 'error', // Red for out
            'OUT_SELF_CONSUMPTION': 'orange',
            'ADJUSTMENT': 'grey'
        }
        return map[type] || 'grey'
    },
    translateMovementType(type) {
        const map = {
            'INITIAL': 'Inventario Inicial',
            'IN_PURCHASE': 'Compra',
            'OUT_SALE': 'Venta',
            'OUT_SELF_CONSUMPTION': 'Autoconsumo',
            'ADJUSTMENT': 'Ajuste Manual'
        }
        return map[type] || type
    },
    formatCurrency(val, currency = 'VES') {
      return new Intl.NumberFormat('es-VE', { 
        style: 'currency', 
        currency: currency === 'VES' ? 'VES' : 'USD', 
        currencyDisplay: 'symbol' 
      }).format(val || 0).replace('USD', '$')
    },
    formatDate(d, includeTime = false) {
       if(!d) return ''
       const opts = { year: 'numeric', month: '2-digit', day: '2-digit' }
       if (includeTime) {
           opts.hour = '2-digit'
           opts.minute = '2-digit'
       }
       return new Date(d).toLocaleDateString('es-ES', opts)
    },
    
    // Export
    async downloadValuation() {
        // TODO: Mostrar loading global
        try {
            let allProducts = await inventoryService.getProducts({ limit: 5000 })
            if (this.dateFromFilter) {
                allProducts = allProducts.filter(p => new Date(p.created_at) >= new Date(this.dateFromFilter));
            }
            if (this.dateToFilter) {
                const toDate = new Date(this.dateToFilter);
                toDate.setHours(23, 59, 59, 999);
                allProducts = allProducts.filter(p => new Date(p.created_at) <= toDate);
            }
            await inventoryExportService.exportValuation(allProducts)
        } catch (e) {
            console.error(e)
            alert('Error exportando inventario')
        }
    },
    async downloadKardex() {
        try {
            let allMovements = await inventoryService.getAllMovements({ limit: 5000 })
            if (this.dateFromFilter) {
                allMovements = allMovements.filter(m => new Date(m.created_at) >= new Date(this.dateFromFilter));
            }
            if (this.dateToFilter) {
                const toDate = new Date(this.dateToFilter);
                toDate.setHours(23, 59, 59, 999);
                allMovements = allMovements.filter(m => new Date(m.created_at) <= toDate);
            }
            await inventoryExportService.exportMovements(allMovements)
        } catch (e) {
             console.error(e)
             alert('Error exportando kardex')
        }
    },
    
    openExportDialog() {
        const today = new Date().toISOString().substr(0, 10);
        // Default: Primer dia del mes hasta hoy o los filtros globales activos
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().substr(0, 10);
        
        this.exportDates = { 
            start: this.dateFromFilter || firstDay, 
            end: this.dateToFilter || today 
        };
        this.exportDialog = true;
    },
    
    async confirmExportSummary() {
        this.exportDialog = false;
        // Loading...
        try {
             const allProducts = await inventoryService.getProducts({ limit: 5000 });
             const allMovements = await inventoryService.getAllMovements({ limit: 10000 });
             
             await inventoryExportService.exportHorizontalSummary(allProducts, allMovements, this.exportDates);
        } catch (e) {
            console.error(e);
            alert('Error generando reporte: ' + e.message);
        }
    }
  }
}
</script>

<style scoped>
.stats-card {
  border-radius: 12px;
  transition: transform 0.2s;
}
.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
}
.opacity-20 {
  opacity: 0.2;
}
</style>
