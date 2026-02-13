<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold text-secondary">Inventario de Mercancía</h1>
        <div class="text-subtitle-1 text-grey-darken-1">Gestión de productos, stock y movimientos</div>
      </div>
      <div class="d-flex gap-2">
         <v-btn
          color="info"
          variant="tonal"
          prepend-icon="mdi-robot"
          @click="adjustmentDialog = true"
        >
          IA Consumo
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openProductDialog()"
        >
          Nuevo Producto
        </v-btn>
        <v-btn
          color="secondary"
          variant="outlined"
          prepend-icon="mdi-file-excel"
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

    <!-- Tabs de Navegación -->
    <v-tabs v-model="activeTab" color="primary" class="mb-6 bg-white rounded-lg elevation-1">
      <v-tab value="dashboard" prepend-icon="mdi-view-dashboard">Tablero</v-tab>
      <v-tab value="products" prepend-icon="mdi-package-variant">Productos</v-tab>
      <v-tab value="movements" prepend-icon="mdi-history">Movimientos (Kardex)</v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- DASHBOARD TAB -->
      <v-window-item value="dashboard">
        <v-row>
          <!-- Total Productos -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="pa-4 stats-card bg-surface-light" border>
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-overline text-grey-darken-1 font-weight-bold">Total Productos</div>
                  <div class="text-h3 font-weight-bold text-secondary mt-2">
                    <AnimatedNumber :value="stats.totalProducts" :duration="800" />
                  </div>
                </div>
                <v-icon size="48" color="primary" class="opacity-20">mdi-package-variant-closed</v-icon>
              </div>
            </v-card>
          </v-col>
          
          <!-- Valor Inventario (Costo) -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="pa-4 stats-card bg-surface-light" border>
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-overline text-grey-darken-1 font-weight-bold">Valor en Inventario (Costo)</div>
                  <div class="text-h4 font-weight-bold text-success mt-2">
                    {{ formatCurrency(stats.totalValueCost) }}
                  </div>
                  <div class="text-caption text-grey">Base para ISLR</div>
                </div>
                <v-icon size="48" color="success" class="opacity-20">mdi-cash-multiple</v-icon>
              </div>
            </v-card>
          </v-col>

          <!-- Valor Inventario (Venta) -->
          <v-col cols="12" sm="6" md="4">
            <v-card class="pa-4 stats-card bg-surface-light" border>
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-overline text-grey-darken-1 font-weight-bold">Valor Estimado (Venta)</div>
                  <div class="text-h4 font-weight-bold text-info mt-2">
                     {{ formatCurrency(stats.totalValueSale) }}
                  </div>
                  <div class="text-caption text-grey">Proyección Ganancia</div>
                </div>
                <v-icon size="48" color="info" class="opacity-20">mdi-tag-text-outline</v-icon>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mt-4">
          <!-- Top Productos -->
          <v-col cols="12" md="6">
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
           <v-col cols="12" md="6">
             <v-card title="Resumen de Stock Bajo" prepend-icon="mdi-alert-circle-outline">
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
            <v-spacer></v-spacer>
            <v-btn icon="mdi-refresh" variant="text" @click="loadProducts"></v-btn>
          </v-card-title>
          
          <v-data-table
            :headers="productHeaders"
            :items="products"
            :loading="loadingProducts"
            :search="productSearch"
            hover
          >
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
            
            <!-- Precios -->
            <template v-slot:item.cost_price="{ item }">
              {{ formatCurrency(item.cost_price) }}
            </template>
            <template v-slot:item.sale_price="{ item }">
              {{ formatCurrency(item.sale_price) }}
            </template>

            <!-- Acciones -->
            <template v-slot:item.actions="{ item }">
              <div class="d-flex">
                <v-btn icon="mdi-pencil" size="small" variant="text" color="primary" @click="openProductDialog(item)"></v-btn>
                <v-btn icon="mdi-history" size="small" variant="text" color="info" @click="viewMovements(item)" title="Ver Kardex"></v-btn>
                <v-btn icon="mdi-delete" size="small" variant="text" color="error" @click="confirmDeleteProduct(item)"></v-btn>
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
             :items="movements"
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
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="productForm.cost_price"
                  label="Costo Unitario (Bs)"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  prefix="Bs"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                   v-model.number="productForm.sale_price"
                   label="Precio Venta (Bs)"
                   type="number"
                   step="0.01"
                   variant="outlined"
                   prefix="Bs"
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

export default {
  name: 'ClienteInventario',
  components: { AnimatedNumber, InventoryAdjustmentDialog },
  data() {
    return {
      activeTab: 'dashboard',
      
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
        { title: 'Descripción', key: 'description' },
      ]
    }
  },
  async mounted() {
    await this.loadDashboard()
  },
  watch: {
    activeTab(val) {
      if (val === 'products') this.loadProducts()
      if (val === 'dashboard') this.loadDashboard()
      // Movements tab could load recent movements
    }
  },
  methods: {
    async loadDashboard() {
      // Cargar stats
      try {
        const stats = await inventoryService.getDashboardStats()
        if (stats) {
          this.stats = stats
        }
        
        // Calcular Top Productos (Client side aggregation)
        // Pedimos movimientos de SALIDA
        const movements = await inventoryService.getAllMovements({ limit: 1000 })
        if (movements) {
            const sales = movements.filter(m => m.movement_type === 'OUT_SALE');
            const productSales = {}; // { id: { name, unit, totalSold, totalRevenue } }
            
            sales.forEach(m => {
                const pid = m.product_id;
                const pName = m.products?.name || 'Desconocido';
                const pUnit = m.products?.unit || 'U';
                const qty = Math.abs(m.quantity);
                const price = m.products?.sale_price || 0; // Aproximación, ideal usar precio de venta real del item, pero no lo tenemos en movements directo
                
                if (!productSales[pid]) {
                    productSales[pid] = { name: pName, unit: pUnit, totalSold: 0, totalRevenue: 0 };
                }
                productSales[pid].totalSold += qty;
                productSales[pid].totalRevenue += (qty * price); // Estimado
            });
            
            this.topSellingProducts = Object.values(productSales)
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 5);
        }

        // Cargar alerta de stock (fetch simple y filtrar en cliente o query especifico)
        // Por ahora cargamos productos y filtramos
        const prods = await inventoryService.getProducts()
        this.lowStockProducts = prods.filter(p => p.stock <= p.min_stock)
      } catch (e) {
        console.error('Error loading dashboard', e)
      }
    },
    async loadProducts() {
      this.loadingProducts = true
      try {
        this.products = await inventoryService.getProducts()
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
        delete payload.initial_stock // No enviar al update/create directamente si no es campoe
        
        let productId
        
        if (this.editingProduct) {
          await inventoryService.updateProduct(this.editingProduct.id, payload)
          productId = this.editingProduct.id
        } else {
          // Crear
          // Payload tiene stock = 0 por defecto.
          // Si hay initial_stock, se maneja como movimiento INITIAL
          const { data: newProds, error } = await inventoryService.createProduct({
            ...payload,
            stock: 0 // Iniciar en 0 y hacer movimiento
          })
          
          if(error) throw error
          // Supabase insert devuelve array si select es usado, o null
          // En inventoryService usamos insertWithTenant que devuelve data
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
        this.loadProducts()
        this.loadDashboard()
      } catch (e) {
        console.error('Error saving product', e)
      }
    },
    
    async confirmDeleteProduct(item) {
        if(confirm('¿Eliminar producto? Si tiene movimientos, esto podría afectar reportes históricos.')) {
            await inventoryService.deleteProduct(item.id)
            this.loadProducts()
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
    formatCurrency(val) {
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(val || 0)
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
            const allProducts = await inventoryService.getProducts({ limit: 2000 })
            await inventoryExportService.exportValuation(allProducts)
        } catch (e) {
            console.error(e)
            alert('Error exportando inventario')
        }
    },
    async downloadKardex() {
        try {
            const allMovements = await inventoryService.getAllMovements({ limit: 2000 })
            await inventoryExportService.exportMovements(allMovements)
        } catch (e) {
             console.error(e)
             alert('Error exportando kardex')
        }
    },
    
    openExportDialog() {
        const today = new Date().toISOString().substr(0, 10);
        // Default: Primer dia del mes hasta hoy
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().substr(0, 10);
        
        this.exportDates = { start: firstDay, end: today };
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
