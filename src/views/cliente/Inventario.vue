<template>
  <div class="mi-mercancia">
    <!-- ═══════════════════════════════════════════════ -->
    <!-- SKELETON LOADING                                -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-if="initialLoading">
      <v-skeleton-loader type="heading, text" class="mb-6 bg-transparent" max-width="420" />
      <v-row>
        <v-col cols="12" md="7"><v-skeleton-loader type="image" height="110" class="rounded-xl" /></v-col>
        <v-col cols="12" md="5"><v-skeleton-loader type="image" height="110" class="rounded-xl" /></v-col>
      </v-row>
      <v-skeleton-loader type="list-item-avatar-two-line@5" class="rounded-xl mt-6" />
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CONTENIDO PRINCIPAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else>
      <EncabezadoPagina
        titulo="Mi mercancía"
        subtitulo="Toma una foto de tu producto y nosotros llenamos los datos"
      >
        <v-btn color="primary" size="large" prepend-icon="mdi-camera-outline" class="text-none mi-mercancia__tomar" @click="tomarFoto">
          Tomar foto
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable" min-width="240">
            <v-list-item prepend-icon="mdi-file-document-outline" title="Escanear documento (IA)" @click="adjustmentDialog = true" />
            <v-divider />
            <v-list-item prepend-icon="mdi-cash-multiple" title="Exportar inventario valorizado" @click="downloadValuation" />
            <v-list-item prepend-icon="mdi-history" title="Exportar Kardex global" @click="downloadKardex" />
            <v-list-item prepend-icon="mdi-table-arrow-right" title="Exportar resumen horizontal" @click="openExportDialog" />
            <v-divider />
            <v-list-item
              :prepend-icon="showDeletedProducts ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :title="showDeletedProducts ? 'Ocultar eliminados' : 'Ver también los eliminados'"
              @click="alternarEliminados"
            />
            <v-list-item prepend-icon="mdi-refresh" title="Actualizar" @click="loadProducts" />
          </v-list>
        </v-menu>
      </EncabezadoPagina>

      <div class="mi-mercancia__rapidas">
        <v-btn variant="tonal" color="secondary" density="comfortable" prepend-icon="mdi-bookshelf" class="text-none" @click="fotoEstante">Foto del estante</v-btn>
        <v-btn variant="tonal" color="secondary" density="comfortable" prepend-icon="mdi-image-outline" class="text-none" @click="subirFotoGaleria">Subir foto</v-btn>
        <v-btn variant="tonal" color="secondary" density="comfortable" prepend-icon="mdi-pencil-outline" class="text-none" @click="openProductDialog()">Escribirlo yo</v-btn>
        <v-btn variant="tonal" color="secondary" density="comfortable" prepend-icon="mdi-briefcase-plus-outline" class="text-none" @click="openProductDialog(null, 'servicio')">Nuevo servicio</v-btn>
      </div>

      <!-- AVANCE DE STOCK + SIGUIENTE PASO -->
      <div class="mi-mercancia__panel">
        <section class="mi-mercancia__avance" aria-label="Avance del stock de tu mercancía">
          <p class="mi-mercancia__frase">{{ fraseInventario }}</p>
          <BarraSegmentos
            v-if="segmentosStock.length"
            :segmentos="segmentosStock"
            :etiqueta="`${resumenStock.bien} de ${resumenStock.total} productos con buen stock`"
            @elegir="irASegmento"
          />
          <div v-if="segmentosStock.length" class="mi-mercancia__leyenda">
            <span class="mi-mercancia__leyenda-item"><i class="mi-mercancia__punto mi-mercancia__punto--success" />{{ resumenStock.bien }} bien</span>
            <span class="mi-mercancia__leyenda-item"><i class="mi-mercancia__punto mi-mercancia__punto--warning" />{{ resumenStock.bajos }} por agotarse</span>
            <span class="mi-mercancia__leyenda-item"><i class="mi-mercancia__punto mi-mercancia__punto--error" />{{ resumenStock.agotados }} agotados</span>
          </div>
        </section>

        <PanelSiguientePaso
          :listo="!pasoStock"
          :titulo="pasoStock ? pasoStock.titulo : ''"
          :detalle="pasoStock ? pasoStock.detalle : ''"
          :texto-boton="pasoStock ? pasoStock.boton : ''"
          icono-boton="mdi-package-variant-closed"
          titulo-listo="¡Tu inventario está en buen estado!"
          detalle-listo="Ningún producto está agotado ni por agotarse."
          @accion="ejecutarPasoStock"
        />
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
          <div v-if="loadingDashboard">
            <v-skeleton-loader type="list-item-avatar-two-line@5" class="rounded-xl" />
          </div>
          <SeccionLista v-else titulo="Lo que más vendes" icono="mdi-chart-line">
            <div v-for="(product, i) in topSellingProducts" :key="product.name + i" class="fila-producto fila-producto--simple">
              <span class="fila-producto__icono fila-producto__icono--rank" aria-hidden="true">{{ i + 1 }}</span>
              <div class="fila-producto__texto">
                <div class="fila-producto__nombre">{{ product.name }}</div>
                <div class="fila-producto__estado">{{ product.totalSold }} {{ product.unit }} vendidas</div>
              </div>
              <div class="fila-producto__derecha">
                <div class="fila-producto__valor text-success">{{ formatCurrency(product.totalRevenue) }}</div>
                <div class="fila-producto__valor-secundario">ingresos est.</div>
              </div>
            </div>
            <EstadoVacio
              v-if="topSellingProducts.length === 0"
              icono="mdi-chart-line-variant"
              titulo="Todavía no hay suficientes ventas"
              mensaje="Cuando registres ventas de tus productos, aquí verás los más vendidos."
            />
          </SeccionLista>
        </v-window-item>

        <!-- PRODUCTS TAB -->
        <v-window-item value="products">
          <div class="mi-mercancia__toolbar">
            <v-text-field
              v-model="productSearch"
              prepend-inner-icon="mdi-magnify"
              placeholder="Buscar producto por nombre o código"
              variant="outlined"
              density="comfortable"
              hide-details
              clearable
              class="mi-mercancia__buscador"
            ></v-text-field>
            <v-btn-toggle
              :model-value="vista"
              mandatory
              color="primary"
              variant="outlined"
              divided
              density="comfortable"
              class="mi-mercancia__vista"
              aria-label="Cómo ver tu mercancía"
              @update:model-value="setVista"
            >
              <v-btn value="lista" icon="mdi-view-list-outline" aria-label="Ver en lista" />
              <v-btn value="cuadricula" icon="mdi-view-grid-outline" aria-label="Ver en cuadrícula" />
            </v-btn-toggle>
          </div>

          <FiltroChips v-model="filtroUnico" :opciones="opcionesFiltro" etiqueta="Filtrar mi mercancía" class="mb-3" />

          <div v-if="loadingProducts">
            <v-skeleton-loader type="list-item-avatar-two-line@5" class="rounded-xl" />
          </div>

          <EstadoVacio
            v-else-if="filteredProducts.length === 0"
            :icono="inventarioEstadoVacioPorFiltro ? 'mdi-filter-remove-outline' : 'mdi-package-variant-closed'"
            :titulo="inventarioEstadoVacioPorFiltro ? 'No hay resultados con estos filtros' : 'Todavía no tienes productos'"
            :mensaje="inventarioEstadoVacioPorFiltro ? 'Prueba con otra búsqueda o quita algún filtro.' : 'Toma una foto de tu primer producto: nosotros llenamos los datos y tú solo pones el precio.'"
            :texto-accion="inventarioEstadoVacioPorFiltro ? 'Limpiar filtros' : 'Tomar foto'"
            :texto-accion-secundaria="inventarioEstadoVacioPorFiltro ? '' : 'Escribirlo yo'"
            icono-accion-secundaria="mdi-pencil-outline"
            @accion="inventarioEstadoVacioPorFiltro ? limpiarFiltrosInventario() : tomarFoto()"
            @accion-secundaria="openProductDialog()"
          />

          <SeccionLista v-else-if="vista === 'lista'" :meta="`${filteredProducts.length} ${filteredProducts.length === 1 ? 'elemento' : 'elementos'}`">
            <div
              v-for="item in filteredProducts"
              :key="item.id"
              class="fila-producto"
              :class="{ 'fila-producto--resaltada': resaltadoProducto === item.id }"
              :data-producto-id="item.id"
            >
              <span v-if="fotoUrls[item.foto_path]" class="fila-producto__foto">
                <FotoProducto :src="fotoUrls[item.foto_path]" :tipo="item.tipo" :alt="item.name" />
              </span>
              <span v-else class="fila-producto__icono" :class="item.tipo === 'servicio' ? 'fila-producto__icono--rank' : `fila-producto__icono--${getStockColor(item)}`" aria-hidden="true">
                <v-icon :icon="item.tipo === 'servicio' ? 'mdi-briefcase-outline' : 'mdi-package-variant-closed'" size="20" />
              </span>

              <div class="fila-producto__texto">
                <div class="fila-producto__nombre" :class="{ 'text-decoration-line-through text-medium-emphasis': item.deleted_at }">
                  {{ item.name }}
                  <v-chip v-if="item.deleted_at" size="x-small" color="error" variant="tonal" class="ml-2">Eliminado</v-chip>
                </div>
                <div v-if="item.tipo === 'servicio'" class="fila-producto__estado">
                  <v-chip size="x-small" color="secondary" variant="tonal" class="mr-1">Servicio</v-chip>
                  {{ item.atributos?.se_cobra_por ? 'Se cobra por ' + item.atributos.se_cobra_por.toLowerCase() : '' }}
                </div>
                <div v-else class="fila-producto__estado">
                  {{ item.code ? item.code + ' · ' : '' }}{{ item.stock }} {{ item.unit || 'Und' }}
                  <span v-if="!item.deleted_at && item.stock <= 0" class="text-error font-weight-medium">· Agotado</span>
                  <span v-else-if="!item.deleted_at && item.stock <= item.min_stock" class="text-warning-oscuro font-weight-medium">· Stock bajo</span>
                </div>
              </div>

              <div class="fila-producto__derecha">
                <div class="fila-producto__valor">{{ formatCurrency(item.sale_price, item.currency) }}</div>
                <div v-if="item.currency && item.currency !== 'VES'" class="fila-producto__valor-secundario">
                  ≈ {{ formatCurrency(item.sale_price * exchangeRate, 'VES') }}
                </div>
              </div>

              <div class="fila-producto__acciones">
                <template v-if="!item.deleted_at">
                  <v-btn variant="tonal" color="secondary" prepend-icon="mdi-pencil-outline" class="text-none fila-producto__accion" @click="openProductDialog(item)">
                    Editar
                  </v-btn>
                  <v-menu location="bottom end">
                    <template #activator="{ props: menuProps }">
                      <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" aria-label="Más opciones" />
                    </template>
                    <v-list density="comfortable">
                      <v-list-item v-if="item.tipo !== 'servicio'" prepend-icon="mdi-history" title="Ver Kardex" @click="viewMovements(item)" />
                      <v-list-item prepend-icon="mdi-delete-outline" base-color="error" title="Eliminar" @click="openDeleteDialog(item)" />
                    </v-list>
                  </v-menu>
                </template>
                <template v-else>
                  <v-btn variant="tonal" color="success" prepend-icon="mdi-restore" class="text-none fila-producto__accion" @click="openRestoreDialog(item)">
                    Restaurar
                  </v-btn>
                  <v-btn v-if="item.tipo !== 'servicio'" icon="mdi-history" variant="text" aria-label="Ver Kardex" @click="viewMovements(item)"></v-btn>
                </template>
              </div>
            </div>
          </SeccionLista>

          <!-- Cuadrícula -->
          <div v-else>
            <p class="mi-mercancia__meta">{{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'elemento' : 'elementos' }}</p>
            <ul class="mi-mercancia__cuadricula">
              <li
                v-for="item in filteredProducts"
                :key="item.id"
                class="tarjeta-producto"
                :class="{ 'tarjeta-producto--eliminada': item.deleted_at, 'fila-producto--resaltada': resaltadoProducto === item.id }"
                :data-producto-id="item.id"
              >
                <button type="button" class="tarjeta-producto__boton" :aria-label="(item.deleted_at ? 'Restaurar ' : 'Editar ') + item.name" @click="abrirDetalle(item)">
                  <span class="tarjeta-producto__foto">
                    <FotoProducto :src="fotoUrls[item.foto_path]" :tipo="item.tipo" :alt="item.name" tamano-icono="40" />
                    <span class="tarjeta-producto__tipo" aria-hidden="true">
                      <v-icon :icon="item.tipo === 'servicio' ? 'mdi-briefcase-outline' : 'mdi-package-variant-closed'" size="16" />
                    </span>
                  </span>
                  <span class="tarjeta-producto__nombre">{{ item.name }}</span>
                  <span class="tarjeta-producto__precio">{{ formatCurrency(item.sale_price, item.currency) }}</span>
                  <span class="tarjeta-producto__estado">
                    <v-chip v-if="item.deleted_at" size="small" color="error" variant="tonal">Eliminado</v-chip>
                    <v-chip v-else-if="item.tipo === 'servicio'" size="small" color="secondary" variant="tonal">Servicio</v-chip>
                    <v-chip v-else-if="Number(item.stock) <= 0" size="small" color="error" variant="tonal">Agotado</v-chip>
                    <v-chip v-else-if="Number(item.stock) <= Number(item.min_stock || 0)" size="small" color="warning" variant="tonal">Quedan {{ item.stock }}</v-chip>
                    <v-chip v-else size="small" color="success" variant="tonal">{{ item.stock }} {{ (item.unit || 'und').toLowerCase() }}</v-chip>
                  </span>
                </button>
                <v-menu v-if="!item.deleted_at" location="bottom end">
                  <template #activator="{ props: menuProps }">
                    <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="flat" size="small" class="tarjeta-producto__menu" :aria-label="`Más opciones de ${item.name}`" />
                  </template>
                  <v-list density="comfortable">
                    <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" @click="openProductDialog(item)" />
                    <v-list-item v-if="item.tipo !== 'servicio'" prepend-icon="mdi-history" title="Ver Kardex" @click="viewMovements(item)" />
                    <v-list-item prepend-icon="mdi-delete-outline" base-color="error" title="Eliminar" @click="openDeleteDialog(item)" />
                  </v-list>
                </v-menu>
              </li>
            </ul>
          </div>
        </v-window-item>

        <!-- MOVEMENTS TAB -->
        <v-window-item value="movements">
        <!-- Filtros de fecha: solo aplican a Movimientos -->
      <v-expansion-panels class="mb-4" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon start>mdi-filter-variant</v-icon>
              <span class="font-weight-medium">Filtros de fecha</span>
              <v-chip
                v-if="dateFromFilter || dateToFilter"
                size="small"
                color="secondary"
                variant="tonal"
                class="ml-3"
              >
                Filtro activo
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row class="mt-2">
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
              <v-col cols="12" md="4">
                <v-text-field v-model="dateFromFilter" label="Desde" type="date" variant="outlined" hide-details></v-text-field>
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="dateToFilter" label="Hasta" type="date" variant="outlined" hide-details></v-text-field>
              </v-col>
              <v-col cols="12" class="d-flex justify-end mt-2 pt-0">
                <v-btn variant="text" color="secondary" class="text-none" @click="resetDateFilters">Limpiar</v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
          <v-card class="rounded-xl" elevation="1">
            <v-card-title>Historial de movimientos</v-card-title>
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
    </template>

    <!-- Entradas de foto (cámara y galería) -->
    <input ref="camaraInput" type="file" accept="image/*" capture="environment" class="d-none" @change="alElegirFotoNueva">
    <input ref="galeriaInput" type="file" accept="image/*" class="d-none" @change="alElegirFotoNueva">
    <input ref="estanteInput" type="file" accept="image/*" capture="environment" class="d-none" @change="alElegirFotoEstante">

    <CrearConFotoDialog v-model="crearConFotoDialog" :archivo="archivoFoto" :rubro="rubro" @listo="alFotoLista" />

    <ProductoFormDialog
      v-model="productDialog"
      :producto="editingProduct"
      :prefill="prefillProducto"
      :rubro="rubro"
      :tipo-inicial="tipoInicial"
      @guardado="alGuardarProducto"
      @otra-foto="tomarFoto"
      @rubro-guardado="v => rubro = v"
      @error="msg => $root?.showSnackbar?.(msg, 'error')"
    />

    <EstanteDialog v-model="estanteDialog" :archivo="archivoEstante" :productos="products" @cambios="alCambiosEstante" />

    <!-- Dialogo Kardex (Movimientos Producto) -->
    <DialogoAdaptable
      v-model="movementsDialog"
      :titulo="`Movimientos: ${selectedProductForMovements?.name || ''}`"
      icono="mdi-history"
      max-width="900"
    >
      <v-chip v-if="selectedProductForMovements" size="small" class="mb-3">{{ selectedProductForMovements?.stock }} {{ selectedProductForMovements?.unit }}</v-chip>
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

      <template #acciones>
        <v-btn color="primary" variant="flat" @click="movementsDialog = false">Cerrar</v-btn>
      </template>
    </DialogoAdaptable>

    <InventoryAdjustmentDialog
      v-model="adjustmentDialog"
      @saved="() => { loadDashboard(); loadProducts(); }"
    />

    <!-- Diálogo Confirmar Eliminación (Soft Delete) -->
    <DialogoAdaptable
      v-model="deleteConfirmDialog"
      titulo="Eliminar producto"
      icono="mdi-delete-alert"
      max-width="500"
      :cargando="deletingProduct"
    >
      <p class="mb-3">
        ¿Estás seguro que deseas eliminar el producto <strong>{{ productToDelete?.name }}</strong>?
      </p>
      <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
        <strong>Este producto se marcará como eliminado.</strong>
      </v-alert>
      <ul class="text-caption text-medium-emphasis pl-4">
        <li>No afectará el historial de stock ni movimientos anteriores.</li>
        <li>No aparecerá en el buscador de ventas ni en listas de productos activos.</li>
        <li>Podrás restaurarlo posteriormente si es necesario.</li>
      </ul>

      <template #acciones>
        <v-btn variant="text" :disabled="deletingProduct" @click="deleteConfirmDialog = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" :loading="deletingProduct" @click="confirmDeleteProduct">
          <v-icon start>mdi-delete</v-icon>
          Eliminar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Diálogo Confirmar Restauración -->
    <DialogoAdaptable
      v-model="restoreConfirmDialog"
      titulo="Restaurar producto"
      icono="mdi-restore"
      max-width="450"
      :cargando="restoringProduct"
    >
      <p>¿Deseas restaurar el producto <strong>{{ productToRestore?.name }}</strong>?</p>
      <p class="text-caption text-medium-emphasis mt-2">El producto volverá a estar activo y aparecerá en el buscador de ventas.</p>

      <template #acciones>
        <v-btn variant="text" :disabled="restoringProduct" @click="restoreConfirmDialog = false">Cancelar</v-btn>
        <v-btn color="success" variant="flat" :loading="restoringProduct" @click="confirmRestoreProduct">
          <v-icon start>mdi-restore</v-icon>
          Restaurar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Dialogo Exportar Resumen -->
    <DialogoAdaptable
      v-model="exportDialog"
      titulo="Exportar resumen"
      icono="mdi-table-arrow-right"
      max-width="400"
      :cargando="exportingSummary"
    >
      <v-row>
        <v-col cols="12">
          <v-text-field v-model="exportDates.start" label="Desde" type="date" variant="outlined"></v-text-field>
        </v-col>
        <v-col cols="12">
          <v-text-field v-model="exportDates.end" label="Hasta" type="date" variant="outlined"></v-text-field>
        </v-col>
      </v-row>

      <template #acciones>
        <v-btn variant="text" :disabled="exportingSummary" @click="exportDialog = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="exportingSummary" @click="confirmExportSummary">Exportar</v-btn>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script>
import inventoryService from '@/services/inventoryService'
import inventoryExportService from '@/services/inventoryExportService'
import InventoryAdjustmentDialog from '@/components/inventory/InventoryAdjustmentDialog.vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import BarraSegmentos from '@/components/ui/BarraSegmentos.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import FotoProducto from '@/components/inventory/FotoProducto.vue'
import ProductoFormDialog from '@/components/inventory/ProductoFormDialog.vue'
import CrearConFotoDialog from '@/components/inventory/CrearConFotoDialog.vue'
import EstanteDialog from '@/components/inventory/EstanteDialog.vue'
import { firmarVarias } from '@/services/productoFotoService'
import { obtenerRubro } from '@/services/rubroService'
import { formatMoney } from '@/utils/formatMoney.js'
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format, subMonths } from 'date-fns'

export default {
  name: 'ClienteInventario',
  components: {
    InventoryAdjustmentDialog,
    EncabezadoPagina,
    EstadoVacio,
    DialogoAdaptable,
    BarraSegmentos,
    PanelSiguientePaso,
    FiltroChips,
    SeccionLista,
    FotoProducto,
    ProductoFormDialog,
    CrearConFotoDialog,
    EstanteDialog
  },
  data() {
    return {
      activeTab: 'products',

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
      movements: [],
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
      initialLoading: true,
      loadingDashboard: false,
      loadingProducts: false,
      loadingMovements: false,
      loadingProductMovements: false,

      // UI Config
      currencyDisplay: 'VES',
      exchangeRate: 1,
      exchangeRateEur: 1,

      // Avance de stock
      stockFilter: 'ALL',
      resaltadoProducto: null,

      productSearch: '',
      productDialog: false,
      editingProduct: null,
      prefillProducto: null,
      tipoInicial: null,

      // Vista y filtros
      vista: 'lista',
      tipoFilter: 'ALL',
      fotoUrls: {},
      rubro: null,

      // Foto y listo / Foto del estante
      archivoFoto: null,
      crearConFotoDialog: false,
      archivoEstante: null,
      estanteDialog: false,

      // Soft delete UI
      showDeletedProducts: false,
      deleteConfirmDialog: false,
      productToDelete: null,
      deletingProduct: false,
      restoreConfirmDialog: false,
      productToRestore: null,
      restoringProduct: false,
      exportingSummary: false,

      movementsDialog: false,
      selectedProductForMovements: null,
      productMovements: [],

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
    // ─── Avance de stock (BarraSegmentos + siguiente paso) ───
    // Un segmento por producto activo: 'error' agotado, 'warning' bajo
    // (stock <= min_stock), 'success' bien. Independiente de la pestaña
    // activa, para que el panel de arriba siempre refleje la mercancía real.
    segmentosStock() {
      return this.products
        .filter(p => !p.deleted_at && p.tipo !== 'servicio')
        .map(p => ({ id: p.id, tono: this.getStockColor(p), etiqueta: p.name }))
    },
    resumenStock() {
      const activos = this.products.filter(p => !p.deleted_at && p.tipo !== 'servicio')
      const agotados = activos.filter(p => Number(p.stock) <= 0).length
      const bajos = activos.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.min_stock || 0)).length
      return { total: activos.length, agotados, bajos, bien: activos.length - agotados - bajos }
    },
    fraseInventario() {
      const { total } = this.resumenStock
      if (total === 0) return 'Todavía no tienes productos registrados.'
      return `Tienes ${total} producto${total === 1 ? '' : 's'}; tu inventario vale ${formatMoney(this.convertedTotalValueCost, this.currencyDisplay)} en costo.`
    },
    sinPrecio() {
      return this.products.filter(p => !p.deleted_at && !(Number(p.sale_price) > 0)).length
    },
    pasoStock() {
      const { agotados, bajos } = this.resumenStock
      if (this.sinPrecio > 0) {
        const n = this.sinPrecio
        return {
          titulo: `${n} producto${n === 1 ? '' : 's'} sin precio`,
          detalle: 'Ponles precio para poder venderlos.',
          boton: 'Ponerles precio',
          filtro: 'SIN_PRECIO'
        }
      }
      if (agotados > 0) {
        return {
          titulo: `${agotados} producto${agotados === 1 ? '' : 's'} agotado${agotados === 1 ? '' : 's'}`,
          detalle: 'Repón el stock para no perder ventas.',
          boton: 'Revisar',
          filtro: 'AGOTADOS'
        }
      }
      if (bajos > 0) {
        return {
          titulo: `${bajos} producto${bajos === 1 ? '' : 's'} por agotarse`,
          detalle: 'Su stock ya está en el mínimo que configuraste.',
          boton: 'Revisar',
          filtro: 'BAJOS'
        }
      }
      return null
    },
    opcionesFiltroStock() {
      const { total, agotados, bajos, bien } = this.resumenStock
      return [
        { valor: 'ALL', texto: 'Todos', cantidad: total },
        { valor: 'AGOTADOS', texto: 'Agotados', cantidad: agotados, deshabilitado: agotados === 0 },
        { valor: 'BAJOS', texto: 'Por agotarse', cantidad: bajos, deshabilitado: bajos === 0 },
        { valor: 'BIEN', texto: 'Con buen stock', cantidad: bien, deshabilitado: bien === 0 },
        { valor: 'SIN_PRECIO', texto: 'Sin precio', cantidad: this.sinPrecio, deshabilitado: this.sinPrecio === 0 }
      ]
    },
    filtroUnico: {
      get() { return this.stockFilter !== 'ALL' ? this.stockFilter : this.tipoFilter },
      set(v) {
        if (v === 'ALL' || v === 'PRODUCTO' || v === 'SERVICIO') { this.tipoFilter = v; this.stockFilter = 'ALL' } else { this.stockFilter = v; this.tipoFilter = 'ALL' }
      }
    },
    // Una sola fila: Todo · Productos · Servicios │ estados (solo los que tienen algo)
    opcionesFiltro() {
      const base = this.opcionesFiltroTipo
      const { agotados, bajos } = this.resumenStock
      const estados = [
        { valor: 'AGOTADOS', texto: 'Agotados', cantidad: agotados },
        { valor: 'BAJOS', texto: 'Por agotarse', cantidad: bajos },
        { valor: 'SIN_PRECIO', texto: 'Sin precio', cantidad: this.sinPrecio }
      ].filter(e => e.cantidad > 0 || this.stockFilter === e.valor)
      return [...base, ...estados]
    },
    opcionesFiltroTipo() {
      const activos = this.products.filter(p => !p.deleted_at)
      const servicios = activos.filter(p => p.tipo === 'servicio').length
      return [
        { valor: 'ALL', texto: 'Todo', cantidad: activos.length },
        { valor: 'PRODUCTO', texto: 'Productos', cantidad: activos.length - servicios },
        { valor: 'SERVICIO', texto: 'Servicios', cantidad: servicios }
      ]
    },
    filteredProducts() {
      let result = this.products
      if (this.productSearch) {
        const q = this.productSearch.toLowerCase().trim()
        result = result.filter(p =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.code && p.code.toLowerCase().includes(q))
        )
      }
      if (this.tipoFilter === 'PRODUCTO') {
        result = result.filter(p => p.tipo !== 'servicio')
      } else if (this.tipoFilter === 'SERVICIO') {
        result = result.filter(p => p.tipo === 'servicio')
      }
      if (this.stockFilter === 'AGOTADOS') {
        result = result.filter(p => !p.deleted_at && p.tipo !== 'servicio' && Number(p.stock) <= 0)
      } else if (this.stockFilter === 'BAJOS') {
        result = result.filter(p => !p.deleted_at && p.tipo !== 'servicio' && Number(p.stock) > 0 && Number(p.stock) <= Number(p.min_stock || 0))
      } else if (this.stockFilter === 'BIEN') {
        result = result.filter(p => !p.deleted_at && p.tipo !== 'servicio' && Number(p.stock) > Number(p.min_stock || 0))
      } else if (this.stockFilter === 'SIN_PRECIO') {
        result = result.filter(p => !p.deleted_at && !(Number(p.sale_price) > 0))
      }
      return result
    },
    inventarioEstadoVacioPorFiltro() {
      return this.products.length > 0 && this.filteredProducts.length === 0
    },
    filteredMovements() {
      let result = this.movements
      if (this.dateFromFilter) {
        result = result.filter(m => new Date(m.created_at) >= new Date(this.dateFromFilter))
      }
      if (this.dateToFilter) {
        const toDate = new Date(this.dateToFilter)
        toDate.setHours(23, 59, 59, 999)
        result = result.filter(m => new Date(m.created_at) <= toDate)
      }
      return result
    },
    convertedTotalValueCost() {
      const costVES = this.stats?.totalValueCost?.VES || 0
      const costUSD = this.stats?.totalValueCost?.USD || 0
      const costEUR = this.stats?.totalValueCost?.EUR || 0

      if (this.currencyDisplay === 'VES') {
        return costVES + (costUSD * this.exchangeRate) + (costEUR * this.exchangeRateEur)
      } else {
        const eurInUsd = this.exchangeRate > 0 ? (costEUR * this.exchangeRateEur) / this.exchangeRate : 0
        return costUSD + (costVES / this.exchangeRate) + eurInUsd
      }
    },
    convertedTotalValueSale() {
      const saleVES = this.stats?.totalValueSale?.VES || 0
      const saleUSD = this.stats?.totalValueSale?.USD || 0
      const saleEUR = this.stats?.totalValueSale?.EUR || 0

      if (this.currencyDisplay === 'VES') {
        return saleVES + (saleUSD * this.exchangeRate) + (saleEUR * this.exchangeRateEur)
      } else {
        const eurInUsd = this.exchangeRate > 0 ? (saleEUR * this.exchangeRateEur) / this.exchangeRate : 0
        return saleUSD + (saleVES / this.exchangeRate) + eurInUsd
      }
    }
  },
  async mounted() {
    try { this.vista = localStorage.getItem('ad_mercancia_vista') || '' } catch { this.vista = '' }
    const [, , rubro] = await Promise.all([this.loadDashboard(), this.loadProducts(), obtenerRubro()])
    this.rubro = rubro
    if (this.vista !== 'lista' && this.vista !== 'cuadricula') {
      this.vista = this.products.some(p => p.foto_path) ? 'cuadricula' : 'lista'
    }
    await this.fetchExchangeRate()
    this.initialLoading = false
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
      const today = new Date()
      switch (this.quickDateFilter) {
        case 'thisMonth':
          this.dateFromFilter = format(startOfMonth(today), 'yyyy-MM-dd')
          this.dateToFilter = format(endOfMonth(today), 'yyyy-MM-dd')
          break
        case 'lastMonth': {
          const lastM = subMonths(today, 1)
          this.dateFromFilter = format(startOfMonth(lastM), 'yyyy-MM-dd')
          this.dateToFilter = format(endOfMonth(lastM), 'yyyy-MM-dd')
          break
        }
        case 'thisQuarter':
          this.dateFromFilter = format(startOfQuarter(today), 'yyyy-MM-dd')
          this.dateToFilter = format(endOfQuarter(today), 'yyyy-MM-dd')
          break
        case 'thisSemester': {
          const month = today.getMonth()
          if (month < 6) {
            this.dateFromFilter = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd')
            this.dateToFilter = format(new Date(today.getFullYear(), 5, 30), 'yyyy-MM-dd')
          } else {
            this.dateFromFilter = format(new Date(today.getFullYear(), 6, 1), 'yyyy-MM-dd')
            this.dateToFilter = format(new Date(today.getFullYear(), 11, 31), 'yyyy-MM-dd')
          }
          break
        }
        case 'thisYear':
          this.dateFromFilter = format(startOfYear(today), 'yyyy-MM-dd')
          this.dateToFilter = format(endOfYear(today), 'yyyy-MM-dd')
          break
        case 'all':
        default:
          this.dateFromFilter = null
          this.dateToFilter = null
          break
      }
    },
    resetDateFilters() {
      this.quickDateFilter = 'all'
      this.dateFromFilter = null
      this.dateToFilter = null
    },
    async fetchExchangeRate() {
      try {
        const bcvServiceModule = await import('@/services/bcvService')
        const rate = await bcvServiceModule.default.getCurrentRate()
        if (rate && rate.success && rate.data) {
          this.exchangeRate = parseFloat(rate.data.dollar) || 1
          if (rate.data.euro) {
            this.exchangeRateEur = parseFloat(rate.data.euro) || 1
          }
        }
      } catch (e) {
        console.warn('Could not fetch BCV exchange rate', e)
      }
    },
    async toggleCurrency() {
      if (this.currencyDisplay === 'VES') {
        if (this.exchangeRate === 1) {
          await this.fetchExchangeRate()
        }
        this.currencyDisplay = 'USD'
      } else {
        this.currencyDisplay = 'VES'
      }
    },
    async loadMovements() {
      this.loadingMovements = true
      try {
        this.movements = await inventoryService.getAllMovements({ limit: 100 })
      } catch (e) {
        console.error('Error loading movements', e)
      } finally {
        this.loadingMovements = false
      }
    },
    async loadDashboard() {
      this.loadingDashboard = true
      try {
        const [stats, topSelling] = await Promise.all([
          inventoryService.getDashboardStats(),
          inventoryService.getTopSellingProducts(5)
        ])

        if (stats) this.stats = stats
        this.topSellingProducts = topSelling || []
      } catch (e) {
        console.error('Error loading dashboard', e)
      } finally {
        this.loadingDashboard = false
      }
    },
    // M1: limpia búsqueda y fechas (no "ver eliminados", que es una vista
    // explícita, no un filtro accidental) y recarga.
    limpiarFiltrosInventario() {
      this.productSearch = ''
      this.tipoFilter = 'ALL'
      this.dateFromFilter = null
      this.dateToFilter = null
      this.stockFilter = 'ALL'
    },
    avisarSubidaExcelFutura() {
      // A futuro (anotado en el informe): subir una lista de Excel para
      // crear varios productos a la vez. Hoy no existe el servicio de
      // importación, así que solo avisamos.
      this.$root?.showSnackbar?.('Pronto podrás subir tu lista de productos desde Excel.', 'info')
    },
    async loadProducts() {
      this.loadingProducts = true
      try {
        this.products = await inventoryService.getProducts({ includeDeleted: this.showDeletedProducts, limit: 500 })
        this.cargarFotos()
      } catch (e) {
        console.error(e)
      } finally {
        this.loadingProducts = false
      }
    },

    // ─── Avance de stock: navegación desde la barra y el siguiente paso ───
    ejecutarPasoStock() {
      if (!this.pasoStock) return
      this.stockFilter = this.pasoStock.filtro
      this.activeTab = 'products'
    },
    async irASegmento(seg) {
      this.stockFilter = 'ALL'
      this.activeTab = 'products'
      this.resaltadoProducto = seg.id
      await this.$nextTick()
      const fila = document.querySelector(`[data-producto-id="${seg.id}"]`)
      fila?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => { if (this.resaltadoProducto === seg.id) this.resaltadoProducto = null }, 1600)
    },

    // ─── Vista, fotos y "Foto y listo" ───
    setVista(v) {
      if (v !== 'lista' && v !== 'cuadricula') return
      this.vista = v
      try { localStorage.setItem('ad_mercancia_vista', v) } catch { /* sin almacenamiento: no pasa nada */ }
    },
    async cargarFotos() {
      const rutas = this.products.map(p => p.foto_path).filter(Boolean)
      if (!rutas.length) { this.fotoUrls = {}; return }
      this.fotoUrls = await firmarVarias(rutas)
    },
    tomarFoto() { this.$refs.camaraInput?.click() },
    subirFotoGaleria() { this.$refs.galeriaInput?.click() },
    fotoEstante() { this.$refs.estanteInput?.click() },
    alElegirFotoNueva(e) {
      const archivo = e.target.files?.[0]
      e.target.value = ''
      if (!archivo) return
      this.archivoFoto = archivo
      this.crearConFotoDialog = true
    },
    alElegirFotoEstante(e) {
      const archivo = e.target.files?.[0]
      e.target.value = ''
      if (!archivo) return
      this.archivoEstante = archivo
      this.estanteDialog = true
    },
    alFotoLista(resultado) {
      this.editingProduct = null
      this.tipoInicial = null
      this.prefillProducto = resultado
      this.productDialog = true
    },
    async alGuardarProducto(info) {
      this.$root?.showSnackbar?.(info.nuevo ? '¡Listo! Producto creado.' : '¡Listo! Producto actualizado.', 'success')
      await Promise.all([this.loadProducts(), this.loadDashboard()])
    },
    async alCambiosEstante({ creados, ajustados }) {
      const partes = []
      if (creados) partes.push(`${creados} producto${creados === 1 ? '' : 's'} nuevo${creados === 1 ? '' : 's'}`)
      if (ajustados) partes.push(`existencias de ${ajustados} producto${ajustados === 1 ? '' : 's'} ajustadas`)
      this.$root?.showSnackbar?.(`¡Listo! ${partes.join(' y ')}.`, 'success')
      await Promise.all([this.loadProducts(), this.loadDashboard()])
    },
    abrirDetalle(item) {
      if (item.deleted_at) this.openRestoreDialog(item)
      else this.openProductDialog(item)
    },

    alternarEliminados() {
      this.showDeletedProducts = !this.showDeletedProducts
      this.loadProducts()
    },

    // CRUD Producto
    openProductDialog(product = null, tipo = null) {
      this.editingProduct = product
      this.prefillProducto = null
      this.tipoInicial = tipo
      this.productDialog = true
    },

    openDeleteDialog(item) {
      this.productToDelete = item
      this.deleteConfirmDialog = true
    },

    async confirmDeleteProduct() {
      this.deletingProduct = true
      try {
        await inventoryService.deleteProduct(this.productToDelete.id)
        this.deleteConfirmDialog = false
        this.productToDelete = null
        this.$root?.showSnackbar?.('¡Listo! Producto eliminado.', 'success')
        this.loadProducts()
        this.loadDashboard()
      } catch (e) {
        console.error('Error deleting product', e)
        this.$root?.showSnackbar?.('No pudimos eliminar el producto. Intenta de nuevo.', 'error')
      } finally {
        this.deletingProduct = false
      }
    },

    openRestoreDialog(item) {
      this.productToRestore = item
      this.restoreConfirmDialog = true
    },

    async confirmRestoreProduct() {
      this.restoringProduct = true
      try {
        await inventoryService.restoreProduct(this.productToRestore.id)
        this.restoreConfirmDialog = false
        this.productToRestore = null
        this.$root?.showSnackbar?.('¡Listo! Producto restaurado.', 'success')
        this.loadProducts()
        this.loadDashboard()
      } catch (e) {
        console.error('Error restoring product', e)
        this.$root?.showSnackbar?.('No pudimos restaurar el producto. Intenta de nuevo.', 'error')
      } finally {
        this.restoringProduct = false
      }
    },

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
        'OUT_SALE': 'error',
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
      if (!d) return ''
      const opts = { year: 'numeric', month: '2-digit', day: '2-digit' }
      if (includeTime) {
        opts.hour = '2-digit'
        opts.minute = '2-digit'
      }
      return new Date(d).toLocaleDateString('es-ES', opts)
    },

    // Export
    async downloadValuation() {
      try {
        let allProducts = await inventoryService.getProducts({ limit: 5000 })
        if (this.dateFromFilter) {
          allProducts = allProducts.filter(p => new Date(p.created_at) >= new Date(this.dateFromFilter))
        }
        if (this.dateToFilter) {
          const toDate = new Date(this.dateToFilter)
          toDate.setHours(23, 59, 59, 999)
          allProducts = allProducts.filter(p => new Date(p.created_at) <= toDate)
        }
        await inventoryExportService.exportValuation(allProducts)
      } catch (e) {
        console.error(e)
        this.$root?.showSnackbar?.('No pudimos exportar el inventario. Intenta de nuevo.', 'error')
      }
    },
    async downloadKardex() {
      try {
        let allMovements = await inventoryService.getAllMovements({ limit: 5000 })
        if (this.dateFromFilter) {
          allMovements = allMovements.filter(m => new Date(m.created_at) >= new Date(this.dateFromFilter))
        }
        if (this.dateToFilter) {
          const toDate = new Date(this.dateToFilter)
          toDate.setHours(23, 59, 59, 999)
          allMovements = allMovements.filter(m => new Date(m.created_at) <= toDate)
        }
        await inventoryExportService.exportMovements(allMovements)
      } catch (e) {
        console.error(e)
        this.$root?.showSnackbar?.('No pudimos exportar el kardex. Intenta de nuevo.', 'error')
      }
    },

    openExportDialog() {
      const today = new Date().toISOString().substr(0, 10)
      const date = new Date()
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().substr(0, 10)

      this.exportDates = {
        start: this.dateFromFilter || firstDay,
        end: this.dateToFilter || today
      }
      this.exportDialog = true
    },

    async confirmExportSummary() {
      this.exportingSummary = true
      try {
        const allProducts = await inventoryService.getProducts({ limit: 5000 })
        const allMovements = await inventoryService.getAllMovements({ limit: 10000 })

        await inventoryExportService.exportHorizontalSummary(allProducts, allMovements, this.exportDates)
        this.exportDialog = false
        this.$root?.showSnackbar?.('¡Listo! Resumen exportado.', 'success')
      } catch (e) {
        console.error(e)
        this.$root?.showSnackbar?.('No pudimos generar el reporte. Intenta de nuevo.', 'error')
      } finally {
        this.exportingSummary = false
      }
    }
  }
}
</script>

<style scoped>
.mi-mercancia {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

@media (min-width: 960px) {
  .mi-mercancia { padding: 32px 32px 64px; }
}

/* ── Avance de stock + siguiente paso ── */
.mi-mercancia__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 8px 0 24px;
}

@media (min-width: 960px) {
  .mi-mercancia__panel { grid-template-columns: 7fr 5fr; }
}

.mi-mercancia__avance {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 20px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}

@media (max-width: 599px) {
  .mi-mercancia__avance { padding: 18px; }
}

.mi-mercancia__frase {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.mi-mercancia__leyenda {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.mi-mercancia__leyenda-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mi-mercancia__punto {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.mi-mercancia__punto--success { background: rgb(var(--v-theme-success)); }
.mi-mercancia__punto--warning { background: #e0a100; }
.mi-mercancia__punto--error { background: rgb(var(--v-theme-error)); }

/* ── Barra de herramientas de Productos ── */
.mi-mercancia__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.mi-mercancia__toolbar { flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }

.mi-mercancia__buscador {
  flex: 1 1 0;
  min-width: 0;
  max-width: 520px;
}

/* ── Acciones rápidas bajo el encabezado ── */
.mi-mercancia__rapidas {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 8px;
}

@media (max-width: 599px) {
  /* Teléfono: "Tomar foto" grande arriba; las demás, en una fila con scroll */
  .mi-mercancia__rapidas {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 0 -16px 8px;
    padding: 0 16px 4px;
    scrollbar-width: none;
  }
  .mi-mercancia__rapidas::-webkit-scrollbar { display: none; }
  .mi-mercancia__rapidas :deep(.v-btn) { flex: 0 0 auto; }
  .mi-mercancia__tomar { flex: 1 1 auto; min-height: 56px; font-size: 1.0625rem; }
  .mi-mercancia__panel { gap: 10px; margin: 4px 0 12px; }
  .mi-mercancia__avance { padding: 12px 16px; gap: 8px; }
  .mi-mercancia__frase { font-size: 0.9375rem; }
  .mi-mercancia__leyenda { gap: 10px; font-size: 0.75rem; flex-wrap: nowrap; white-space: nowrap; }
}

.mi-mercancia__vista { flex: 0 0 auto; }

.mi-mercancia__meta {
  margin: 0 0 8px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

/* ── Cuadrícula de tarjetas ── */
.mi-mercancia__cuadricula {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (min-width: 600px) {
  .mi-mercancia__cuadricula { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
}

@media (min-width: 960px) {
  .mi-mercancia__cuadricula { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 1280px) {
  .mi-mercancia__cuadricula { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}

.tarjeta-producto {
  position: relative;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color var(--ad-move-fast, 150ms) ease;
}

.tarjeta-producto:hover { border-color: rgba(var(--v-theme-on-surface), 0.3); }
.tarjeta-producto--eliminada { opacity: 0.6; }

.tarjeta-producto__boton {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  width: 100%;
  padding: 8px 8px 12px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  cursor: pointer;
}

.tarjeta-producto__boton:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
  border-radius: 16px;
}

.tarjeta-producto__foto { position: relative; display: block; }

.tarjeta-producto__tipo {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.92);
  color: rgb(var(--v-theme-secondary));
}

.tarjeta-producto__nombre {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
  padding: 0 4px;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.tarjeta-producto__precio {
  padding: 0 4px;
  font-size: 1rem;
  font-weight: 700;
}

.tarjeta-producto__estado { padding: 0 4px; }

.tarjeta-producto__menu {
  position: absolute !important;
  top: 12px;
  right: 12px;
  background: rgba(var(--v-theme-surface), 0.92) !important;
}

/* ── Fila de producto (Productos y Tablero) ── */
.fila-producto__foto {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: block;
}

.fila-producto {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-height: 72px;
}

.fila-producto__icono {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 700;
}

.fila-producto__icono--error { background: rgba(var(--v-theme-error), 0.1); color: rgb(var(--v-theme-error)); }
.fila-producto__icono--warning { background: rgba(224, 161, 0, 0.14); color: #9a6b00; }
.fila-producto__icono--success { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.fila-producto__icono--rank { background: rgba(var(--v-theme-secondary), 0.12); color: rgb(var(--v-theme-secondary)); }

.fila-producto__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.fila-producto__nombre {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}

.fila-producto__estado {
  margin-top: 2px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.text-warning-oscuro { color: #8a5f00; }

.fila-producto__derecha {
  flex: 0 0 auto;
  text-align: right;
}

.fila-producto__valor {
  font-size: 0.9375rem;
  font-weight: 700;
  white-space: nowrap;
  color: rgb(var(--v-theme-on-surface));
}

.fila-producto__valor-secundario {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
}

.fila-producto__acciones {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.fila-producto__accion {
  min-width: 100px;
}

.fila-producto--resaltada {
  background: rgba(var(--v-theme-primary), 0.1);
}

@media (max-width: 599px) {
  .fila-producto:not(.fila-producto--simple) {
    flex-wrap: wrap;
    row-gap: 10px;
  }
  .fila-producto:not(.fila-producto--simple) .fila-producto__texto {
    flex: 1 1 calc(100% - 58px);
  }
  .fila-producto:not(.fila-producto--simple) .fila-producto__derecha {
    flex: 1 1 100%;
    padding-left: 58px;
    text-align: left;
  }
  .fila-producto:not(.fila-producto--simple) .fila-producto__acciones {
    flex: 1 1 100%;
    padding-left: 58px;
  }
  .fila-producto__acciones .fila-producto__accion,
  .fila-producto__acciones > .v-btn:first-child {
    flex: 1 1 auto;
  }
}
</style>
