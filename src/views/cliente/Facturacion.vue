<template>
  <v-container fluid class="pa-4 pa-md-6">
    <!-- ═══════════════════════════════════════════════ -->
    <!-- SKELETON LOADING                                -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-if="initialLoading">
      <!-- Skeleton Header -->
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <v-skeleton-loader type="heading" width="300" class="mb-2" />
          <v-skeleton-loader type="text" width="400" />
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-end">
          <v-skeleton-loader type="button" width="150" class="mr-2" />
          <v-skeleton-loader type="button" width="120" />
        </v-col>
      </v-row>

      <!-- Skeleton KPIs -->
      <v-row class="mb-6">
        <v-col v-for="n in 2" :key="'kpi-sk-' + n" cols="12" md="6">
          <v-skeleton-loader type="card" height="130" class="rounded-xl" />
        </v-col>
      </v-row>

      <!-- Skeleton Tabs -->
      <v-card class="mb-4 rounded-xl border-none">
        <v-skeleton-loader type="table-row" height="64" />
      </v-card>

      <!-- Skeleton Table -->
      <v-card class="rounded-xl border-none">
        <v-skeleton-loader type="table-thead, table-tbody" />
      </v-card>
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CONTENIDO PRINCIPAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else>
      <!-- Encabezado: acción principal "Nuevo registro"; exportar en el menú ⋮ -->
      <EncabezadoPagina
        titulo="Mis movimientos"
        subtitulo="Tus facturas de venta, compra y gastos en un solo lugar."
        class="mb-6"
      >
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus"
          class="text-none"
          @click="openNewInvoiceDialog"
        >
          Nuevo registro
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable" min-width="300">
            <v-list-subheader>Libros fiscales (SENIAT)</v-list-subheader>
            <v-list-item
              prepend-icon="mdi-book-open-variant"
              title="Libro de Compras"
              subtitle="Solo facturas fiscales (compras y gastos)"
              :disabled="invoices.length === 0"
              @click="exportFiscal('COMPRA')"
            />
            <v-list-item
              prepend-icon="mdi-book-open-variant"
              title="Libro de Ventas"
              subtitle="Solo facturas fiscales de ventas"
              :disabled="invoices.length === 0"
              @click="exportFiscal('VENTA')"
            />
            <v-list-item
              prepend-icon="mdi-file-send-outline"
              title="Ver todo en SENIAT del mes"
              subtitle="Libros, retenciones de IVA y de ISLR"
              :to="{ name: 'ClienteSeniat' }"
            />
            <v-divider class="my-2" />
            <v-list-subheader>Reportes generales en Excel</v-list-subheader>
            <v-list-item
              prepend-icon="mdi-file-excel-outline"
              title="Compras general"
              subtitle="Facturas y recibos de compras y gastos"
              :disabled="invoices.length === 0"
              @click="exportGeneral('COMPRA')"
            />
            <v-list-item
              prepend-icon="mdi-file-excel-outline"
              title="Ventas general"
              subtitle="Facturas y recibos de ventas"
              :disabled="invoices.length === 0"
              @click="exportGeneral('VENTA')"
            />
          </v-list>
        </v-menu>
      </EncabezadoPagina>

      <!-- Resumen del mes + siguiente paso -->
      <div class="movimientos__panel">
        <section class="movimientos__resumen" aria-label="Resumen del mes">
          <p class="movimientos__frase">{{ fraseMes }}</p>
          <dl class="movimientos__cifras">
            <div class="movimientos__cifra">
              <dt>Vendí</dt>
              <dd>{{ money(resumenMes.vendi) }}</dd>
            </div>
            <div class="movimientos__cifra">
              <dt>Gasté</dt>
              <dd>{{ money(resumenMes.gaste) }}</dd>
            </div>
            <div class="movimientos__cifra">
              <dt>Retenciones</dt>
              <dd>{{ money(resumenMes.retenciones) }}</dd>
            </div>
          </dl>
          <p v-if="resumenMes.sinTasa" class="movimientos__sin-tasa" data-test="sin-tasa">
            {{ textoSinTasa(resumenMes.sinTasa) }} (no entran en estas cifras).
            <router-link to="/cliente/mi-area#tasa">Revisar mi tasa</router-link>
          </p>
        </section>

        <PanelSiguientePaso
          :listo="pasoSiguiente.tipo === 'listo'"
          :titulo="pasoSiguiente.titulo"
          :detalle="pasoSiguiente.detalle"
          :texto-boton="pasoSiguiente.boton"
          :icono-boton="pasoSiguiente.icono"
          titulo-listo="¡Tus movimientos están al día!"
          detalle-listo="No tienes borradores, cobros pendientes ni retenciones por revisar."
          @accion="irAlSiguientePaso"
        />
      </div>

      <!-- Tipo de movimiento, con su cantidad -->
      <FiltroChips
        v-model="currentTab"
        :opciones="opcionesTab"
        etiqueta="Tipo de movimiento"
        class="mb-4"
      />

      <!-- Filtros plegables (búsqueda, estado, moneda, fechas) -->
      <v-expansion-panels class="mb-4" variant="accordion">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon start>mdi-filter-variant</v-icon>
              <span class="font-weight-medium">Buscar y filtrar</span>
              <v-chip
                v-if="activeFiltersCount > 0"
                size="small"
                color="secondary"
                variant="tonal"
                class="ml-3"
              >
                {{ activeFiltersCount }} activo{{ activeFiltersCount > 1 ? 's' : '' }}
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row class="mt-2">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Buscar por número o cliente/proveedor"
                  variant="outlined"
                  clearable
                  hide-details
                  @input="applyFilters"
                  @update:model-value="applyFilters"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <CustomDatePicker
                  v-model="dateFromFilter"
                  label="Fecha inicio"
                  placeholder="Seleccionar"
                  @update:model-value="applyFilters"
                />
              </v-col>
              <v-col cols="12" md="3">
                <CustomDatePicker
                  v-model="dateToFilter"
                  label="Fecha fin"
                  placeholder="Seleccionar"
                  @update:model-value="applyFilters"
                />
              </v-col>
              <v-col cols="12">
                <div class="text-body-2 text-medium-emphasis mb-1">Estado</div>
                <FiltroChips
                  v-model="statusFilter"
                  :opciones="opcionesEstado"
                  etiqueta="Filtrar por estado"
                />
              </v-col>
              <v-col cols="12">
                <div class="text-body-2 text-medium-emphasis mb-1">Moneda</div>
                <FiltroChips
                  v-model="currencyFilter"
                  :opciones="opcionesMoneda"
                  etiqueta="Filtrar por moneda"
                />
              </v-col>
              <v-col cols="12" class="d-flex">
                <v-btn
                  variant="text"
                  color="secondary"
                  prepend-icon="mdi-filter-off"
                  class="text-none"
                  :disabled="activeFiltersCount === 0"
                  @click="clearFilters"
                >
                  Limpiar filtros
                </v-btn>
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

    <!-- Error al cargar: mensaje llano + Reintentar, en vez de una lista vacía silenciosa -->
    <AvisoAmable
      v-if="loadError"
      tipo="error"
      titulo="No pudimos cargar tus movimientos"
      :mensaje="loadError"
      texto-accion="Reintentar"
      @accion="loadInvoices"
      class="mb-4"
    />

    <template v-else>
      <!-- M2: en móvil no había ningún indicador mientras loading estaba
           activo (ni skeleton ni EstadoVacio) — se veía la pantalla en
           blanco un instante. -->
      <div v-if="loading && $vuetify.display.xs" class="d-flex flex-column ga-2">
        <v-skeleton-loader v-for="n in 4" :key="n" type="list-item-two-line" />
      </div>
      <EstadoVacio
        v-else-if="!loading && filteredInvoices.length === 0"
        :icono="estadoVacioIcono"
        :titulo="estadoVacioTitulo"
        :mensaje="estadoVacioMensaje"
        :texto-accion="estadoVacioPorFiltro ? 'Limpiar filtros' : ((currentTab === 'trash' || currentTab === 'retenciones') ? '' : 'Nuevo registro')"
        @accion="estadoVacioPorFiltro ? clearFilters() : openNewInvoiceDialog()"
      />

      <template v-else>
        <!-- Lista en móvil: la tabla de varias columnas es ilegible en xs -->
        <div v-if="$vuetify.display.xs" class="d-flex flex-column ga-2">
          <FilaMovimiento
            v-for="(item, i) in invoicesMovil"
            :key="item.id"
            class="ad-move-entrada"
            :style="{ animationDelay: `calc(var(--ad-move-escalon-lista) * ${Math.min(i, 12)})` }"
            :quien="(item.flow === 'VENTA' ? item.client?.companyName : item.issuer?.companyName) || 'Sin nombre'"
            :subtitulo="item.invoiceNumber"
            :fecha="item.issueDate"
            :monto="getDisplayAmountYMoneda(item).monto"
            :moneda="getDisplayAmountYMoneda(item).moneda"
            :equivalente="getEquivalentAmount(item)"
            :estado="item.status"
            :color-estado="getStatusColor(item.status)"
            :icono="item.flow === 'VENTA' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
            :color-icono="item.flow === 'VENTA' ? 'success' : 'error'"
            @abrir="viewInvoice(item)"
          />
          <!-- Por tandas: 51 filas de golpe abruman y hacen eterno el scroll -->
          <v-btn
            v-if="filteredInvoices.length > limiteMovil"
            variant="tonal"
            size="large"
            block
            class="text-none mt-2"
            prepend-icon="mdi-chevron-down"
            @click="limiteMovil += tandaMovil"
          >
            Ver más ({{ filteredInvoices.length - limiteMovil }} restantes)
          </v-btn>
        </div>

        <!-- Tabla de facturas (escritorio) -->
        <v-card v-else variant="outlined" class="movimientos__tabla">
      <v-card-title>
        {{ currentTab === 'retenciones' ? 'Retenciones fiscales' : 'Tus movimientos' }} ({{ filteredInvoices.length }})
      </v-card-title>

      <v-data-table
        :headers="dynamicHeaders"
        :items="filteredInvoices"
        :loading="loading"
        class="elevation-1"
        :items-per-page="10"
        v-model:sort-by="sortBy"
      >
        <!-- Columna de número de factura -->
        <template v-slot:item.invoiceNumber="{ item }">
          <div class="d-flex align-center flex-wrap ga-1">
            <span class="font-weight-medium">{{ item.invoiceNumber }}</span>
            <v-chip v-if="(item.retenciones && item.retenciones.iva > 0) || (item.financial && item.financial.ivaRetention > 0)" color="secondary" variant="outlined" size="x-small" class="font-weight-bold">
              IVA
            </v-chip>
            <v-chip v-if="(item.retenciones && item.retenciones.islr > 0) || (item.financial && item.financial.islrRetention > 0)" color="secondary" variant="outlined" size="x-small" class="font-weight-bold">
              ISLR
            </v-chip>
          </div>
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
          {{ formatFechaCorta(item.issueDate) }}
        </template>

        <!-- Columna de método de pago -->
        <template v-slot:item.paymentMethod="{ item }">
          <div v-if="item.financial?.paymentMethod">
            <v-chip
              v-if="item.financial.paymentMethod === 'CASHEA'"
              color="#000000"
              style="background-color: #fdfa3d;"
              size="small"
              class="font-weight-bold"
            >
              <img src="/Cashea-black-icon.svg" alt="Cashea" width="14" height="14" class="mr-1" />
              Cashea
            </v-chip>
            <v-chip
              v-else
              :color="getPaymentMethodColor(item.financial.paymentMethod)"
              variant="outlined"
              size="small"
              class="font-weight-medium"
            >
              {{ formatPaymentMethod(item.financial.paymentMethod) }}
            </v-chip>
          </div>
          <span v-else class="text-caption text-grey">-</span>
        </template>

        <!-- Columna de Retención IVA (en tab Retenciones) -->
        <template v-slot:item.retencionesIva="{ item }">
          <div v-if="(item.retenciones && item.retenciones.iva > 0) || (item.financial && item.financial.ivaRetention > 0)">
            <v-chip color="secondary" size="small" variant="tonal" class="font-weight-bold">
              -{{ formatCurrency(item.retenciones?.iva || item.financial?.ivaRetention, item.financial?.currency) }}
            </v-chip>
          </div>
          <span v-else class="text-caption text-grey">-</span>
        </template>

        <!-- Columna de Retención ISLR (en tab Retenciones) -->
        <template v-slot:item.retencionesIslr="{ item }">
          <div v-if="(item.retenciones && item.retenciones.islr > 0) || (item.financial && item.financial.islrRetention > 0)">
            <v-chip color="secondary" size="small" variant="tonal" class="font-weight-bold">
              -{{ formatCurrency(item.retenciones?.islr || item.financial?.islrRetention, item.financial?.currency) }}
            </v-chip>
          </div>
          <span v-else class="text-caption text-grey">-</span>
        </template>

        <!-- Columna de total -->
        <template v-slot:item.total="{ item }">
          <div 
            class="total-amount-display d-flex flex-column justify-center"
            :class="{ 'amount-changing': isChangingCurrency }"
          >
            <div class="d-flex align-center">
              <v-icon
                :icon="item.flow === 'VENTA' ? 'mdi-arrow-up' : 'mdi-arrow-down'"
                :color="item.flow === 'VENTA' ? 'success' : 'error'"
                size="small"
                class="mr-2"
              ></v-icon>
              {{ getFormattedDisplayAmount(item) }}
            </div>
            <!-- Equivalente en VES si la factura es en USD/EUR y estamos en vista VES -->
            <div v-if="getEquivalentAmount(item)" class="text-caption text-grey ml-6">
              ≈ {{ getEquivalentAmount(item) }}
            </div>
          </div>
        </template>

        <!-- Columna de Neto a Pagar (en tab Retenciones) -->
        <template v-slot:item.netoPagar="{ item }">
          <div class="font-weight-bold text-success">
            {{ formatCurrency(item.retenciones?.neto_a_pagar || (Number(item.financial?.totalSales || 0) - Number(item.retenciones?.iva || item.financial?.ivaRetention || 0) - Number(item.retenciones?.islr || item.financial?.islrRetention || 0) - Number(item.retenciones?.municipal || item.financial?.municipalRetention || 0)), item.financial?.currency) }}
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
          <div v-if="currentTab !== 'trash'" class="d-flex align-center">
            <!-- Botón rápido de cuotas Cashea (solo para facturas con Cashea) -->
            <v-tooltip text="Gestionar cuotas Cashea" location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-if="item.financial?.paymentMethod === 'CASHEA'"
                  v-bind="props"
                  size="small"
                  variant="tonal"
                  style="background-color: #fdfa3d; color: #000; min-width: 28px; height: 28px; padding: 0 6px;"
                  class="mr-1"
                  @click="openCasheaDialog(item)"
                >
                  <img src="/Cashea-black-icon.svg" alt="Cashea" width="13" height="13" />
                </v-btn>
              </template>
            </v-tooltip>
            <v-btn
              icon="mdi-eye"
              size="small"
              color="secondary"
              variant="text"
              @click="viewInvoice(item)"
              title="Ver detalles"
            ></v-btn>
            <v-btn
              icon="mdi-pencil"
              size="small"
              color="secondary"
              variant="text"
              @click="editInvoice(item)"
              title="Editar"
            ></v-btn>
            <!-- Menú de Descargas Unificado -->
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn
                  icon="mdi-download"
                  size="small"
                  color="secondary"
                  variant="text"
                  v-bind="props"
                  title="Opciones de descarga"
                ></v-btn>
              </template>
              <v-list density="compact">
                <v-list-item @click="downloadReceiptPdf(item)" prepend-icon="mdi-file-pdf-box">
                  <v-list-item-title>Ver / Descargar Resumen en PDF</v-list-item-title>
                </v-list-item>
                <v-list-item @click="exportInvoice(item)" prepend-icon="mdi-file-excel-box">
                  <v-list-item-title>Descargar Datos en Excel</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="item.attachments && item.attachments.length > 0" @click="downloadAttachment(item)" prepend-icon="mdi-paperclip">
                  <v-list-item-title>Ver / Descargar Foto Adjunta</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="(item.retenciones && item.retenciones.islr > 0) || (item.financial && item.financial.islrRetention > 0)" @click="downloadISLR(item)" prepend-icon="mdi-file-percent">
                  <v-list-item-title>Descargar Comprobante ISLR (PDF)</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="(item.retenciones && item.retenciones.iva > 0) || (item.financial && item.financial.ivaRetention > 0)" @click="downloadIVA(item)" prepend-icon="mdi-file-certificate">
                  <v-list-item-title>Descargar Comprobante IVA (PDF)</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="canDownloadMunicipal(item)" @click="downloadMunicipal(item)" prepend-icon="mdi-file-document-outline">
                  <v-list-item-title>Descargar Comprobante Municipal (PDF)</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
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
      </template>
    </template>

    <!-- Diálogo para nueva/editar factura: envuelve SimpleInvoiceForm/ClientInvoiceForm,
         que ya traen su propio encabezado/pie de card (sif-header/sif-footer) y su
         pantalla completa en móvil (scrollable + fullscreen por debajo de "sm").
         No se reemplaza por DialogoAdaptable para no duplicar ese encabezado/pie —
         no se tocó el interior de ninguno de los dos formularios (otro agente
         trabaja en SimpleInvoiceForm; ver informe de la tarea). -->
    <!-- Para volver al formulario original: cambiar USE_SIMPLE_FORM a false en data() -->
    <v-dialog v-model="invoiceDialog" max-width="1100px" scrollable :fullscreen="$vuetify.display.smAndDown" :transition="$vuetify.display.xs ? 'dialog-bottom-transition' : 'dialog-transition'">
      <SimpleInvoiceForm
        v-if="USE_SIMPLE_FORM"
        ref="simpleForm"
        :invoice="editingInvoice"
        :flow="defaultFlow"
        :cliente-inicial="clienteInicial"
        @submit="handleInvoiceSubmit"
        @cancel="closeInvoiceDialog"
      />
      <ClientInvoiceForm
        v-else
        :invoice="editingInvoice"
        :flow="defaultFlow"
        @submit="handleInvoiceSubmit"
        @cancel="closeInvoiceDialog"
      />
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <DialogoAdaptable
      v-model="deleteDialog"
      titulo="Confirmar eliminación"
      icono="mdi-delete-alert-outline"
      max-width="420"
      :cargando="deleting"
    >
      <div v-if="currentTab === 'trash'" class="text-error font-weight-bold mb-2">
        ⚠️ Atención: Borrado Definitivo
      </div>
      ¿Está seguro de que desea {{ currentTab === 'trash' ? 'eliminar DEFINITIVAMENTE' : 'enviar a la papelera' }} la factura <strong>{{ invoiceToDelete?.invoiceNumber }}</strong>?
      {{ currentTab === 'trash' ? 'Esta acción NO se puede deshacer.' : 'Podrá restaurarla luego desde la papelera.' }}
      <template #acciones>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" :disabled="deleting" @click="deleteDialog = false">
          Cancelar
        </v-btn>
        <v-btn color="error" variant="elevated" :loading="deleting" @click="confirmDelete">
          Eliminar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Diálogo de vista de factura -->
    <DialogoAdaptable
      v-model="viewDialog"
      titulo="Detalle de factura"
      icono="mdi-receipt-text-outline"
      max-width="1200"
    >
      <template v-if="viewingInvoice">
        <!-- Encabezado: número (puede ser largo, salta de línea), tipo y estado -->
        <div class="detalle-factura__encabezado pa-4 pa-md-6 rounded-lg mb-4">
            <div class="d-flex align-start flex-wrap ga-3">
                <v-avatar color="white" size="44" class="flex-shrink-0">
                    <v-icon icon="mdi-receipt-text-outline" color="secondary" size="24"></v-icon>
                </v-avatar>
                <div class="flex-grow-1" style="min-width: 0;">
                    <div class="text-caption text-white" style="opacity: 0.8">Factura N.º</div>
                    <div class="text-h6 text-md-h5 font-weight-bold text-white detalle-factura__numero">{{ viewingInvoice.invoiceNumber }}</div>
                    <div class="text-caption text-white" style="opacity: 0.8">{{ viewingInvoice.flow }}</div>
                </div>
                <v-chip
                    :color="getStatusColor(viewingInvoice.status)"
                    size="small"
                    class="font-weight-bold px-3 flex-shrink-0"
                    variant="elevated"
                >
                    {{ viewingInvoice.status }}
                </v-chip>
            </div>
        </div>

        <v-card-text class="pa-0">
          <v-row no-gutters>
            <!-- Document Info -->
            <v-col cols="12" :md="hasAttachment(viewingInvoice) ? 4 : 12" class="pa-6 bg-grey-lighten-5">
              <div class="text-overline text-grey-darken-1 mb-4">
                  <v-icon size="small" class="mr-1">mdi-information</v-icon>
                  Detalles
              </div>
              
              <div class="d-flex flex-column" style="gap: 16px;">
                  <div class="info-item">
                      <div class="text-caption text-grey-darken-1 mb-1">Emisor</div>
                      <div class="text-body-1 font-weight-medium">{{ viewingInvoice.issuer.companyName }}</div>
                      <div class="text-body-2 text-grey-darken-1">RIF: {{ viewingInvoice.issuer.rif }}</div>
                  </div>
                  
                  <div class="info-item">
                      <div class="text-caption text-grey-darken-1 mb-1">Cliente</div>
                      <div class="text-body-1 font-weight-medium">{{ viewingInvoice.client.companyName }}</div>
                      <div class="text-body-2 text-grey-darken-1">RIF: {{ viewingInvoice.client.rif }}</div>
                  </div>
                  
                  <div class="info-item d-flex justify-space-between border-b pb-2">
                    <div>
                      <div class="text-caption text-grey-darken-1 mb-1">Fecha Emisión</div>
                      <div class="text-body-1 font-weight-medium">{{ formatDate(viewingInvoice.issueDate) }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-grey-darken-1 mb-1">Vencimiento</div>
                      <div class="text-body-1 font-weight-medium">{{ formatDate(viewingInvoice.dueDate) }}</div>
                    </div>
                  </div>

                  <div class="info-item d-flex justify-space-between align-end">
                    <div>
                      <div class="text-caption text-grey-darken-1 mb-1">Total IVA</div>
                      <div class="text-body-1 font-weight-medium">{{ formatCurrency(viewingInvoice.financial.taxDebit, viewingInvoice.financial.currency) }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-primary font-weight-bold mb-1">Monto Total</div>
                      <div class="text-h6 font-weight-bold text-success">{{ formatCurrency(viewingInvoice.financial.totalSales, viewingInvoice.financial.currency) }}</div>
                    </div>
                  </div>
                  <!-- Bloque de Retenciones -->
                  <div v-if="viewingInvoice.retenciones && (viewingInvoice.retenciones.iva > 0 || viewingInvoice.retenciones.islr > 0 || viewingInvoice.retenciones.municipal > 0)" class="info-item mt-3 pt-3 border-t">
                    <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center text-primary">
                      <div class="d-flex align-center">
                        <v-icon size="small" class="mr-1">mdi-shield-check</v-icon>
                        Retenciones
                      </div>
                    </div>
                    <v-row dense>
                      <v-col cols="12" sm="6" md="4" v-if="viewingInvoice.retenciones.iva > 0">
                        <div class="text-caption text-grey-darken-1 mb-1">IVA</div>
                        <div class="text-body-2 font-weight-bold text-error text-nowrap">-{{ formatCurrency(viewingInvoice.retenciones.iva, viewingInvoice.financial.currency) }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4" v-if="viewingInvoice.retenciones.islr > 0">
                        <div class="text-caption text-grey-darken-1 mb-1">ISLR</div>
                        <div class="text-body-2 font-weight-bold text-error text-nowrap">-{{ formatCurrency(viewingInvoice.retenciones.islr, viewingInvoice.financial.currency) }}</div>
                      </v-col>
                      <v-col cols="12" sm="6" md="4" v-if="viewingInvoice.retenciones.municipal > 0">
                        <div class="text-caption text-grey-darken-1 mb-1">Municipal</div>
                        <div class="text-body-2 font-weight-bold text-error text-nowrap">-{{ formatCurrency(viewingInvoice.retenciones.municipal, viewingInvoice.financial.currency) }}</div>
                      </v-col>
                    </v-row>
                    <div class="d-flex justify-space-between align-end mt-2 pt-2 border-t">
                       <div class="text-caption text-grey-darken-1 font-weight-medium">Neto a Pagar</div>
                       <div class="text-body-1 font-weight-bold text-success">{{ formatCurrency(viewingInvoice.retenciones.neto_a_pagar || (viewingInvoice.financial.totalSales - (viewingInvoice.retenciones.iva || 0) - (viewingInvoice.retenciones.islr || 0) - (viewingInvoice.retenciones.municipal || 0)), viewingInvoice.financial.currency) }}</div>
                    </div>
                  </div>
                  
                  <div v-if="viewingInvoice.financial?.paymentMethod" class="info-item mt-2 pt-2 border-t">
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-caption text-grey-darken-1 mb-1">Método de Pago</div>
                        <v-chip v-if="viewingInvoice.financial.paymentMethod === 'CASHEA'" color="#000000" style="background-color: #fdfa3d;" size="small" class="font-weight-bold">
                          <img src="/Cashea-black-icon.svg" alt="Cashea" width="14" height="14" class="mr-1" />
                          Cashea
                        </v-chip>
                        <v-chip v-else :color="getPaymentMethodColor(viewingInvoice.financial.paymentMethod)" size="small" variant="tonal" class="font-weight-bold">
                          {{ formatPaymentMethod(viewingInvoice.financial.paymentMethod) }}
                        </v-chip>
                      </div>
                      <div class="text-right" v-if="viewingInvoice.financial?.paymentReference">
                        <div class="text-caption text-grey-darken-1 mb-1">Referencia</div>
                        <div class="text-body-2 font-weight-medium">{{ viewingInvoice.financial.paymentReference }}</div>
                      </div>
                    </div>
                  </div>

                  <div v-if="viewingInvoice.financial?.credit" class="info-item mt-3 pt-3 border-t">
                    <div class="text-subtitle-2 font-weight-bold mb-2 d-flex align-center">
                      <v-icon size="small" class="mr-1">mdi-calendar-month</v-icon>
                      Detalle de Cuotas (Cashea / Crédito)
                    </div>
                    <v-row dense class="mb-2">
                      <v-col cols="12">
                        <div class="text-caption text-grey-darken-1">Inicial pagada</div>
                        <div class="text-body-2 font-weight-bold text-success">
                          {{ formatCurrency(viewingInvoice.financial.credit.initialAmount, viewingInvoice.financial.currency) }} 
                          ({{ viewingInvoice.financial.credit.initialPercentage }}%)
                        </div>
                      </v-col>
                    </v-row>
                    <v-table density="compact" class="bg-transparent text-caption border rounded">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th class="text-right">Monto</th>
                          <th class="text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="inst in viewingInvoice.financial.credit.installments" :key="inst.id">
                          <td>{{ formatDate(inst.date) }}</td>
                          <td class="text-right font-weight-medium">{{ formatCurrency(inst.amount, viewingInvoice.financial.currency) }}</td>
                          <td class="text-center">
                            <v-chip size="x-small" :color="inst.status === 'PAGADA' ? 'success' : 'error'" class="font-weight-bold" variant="flat">
                              {{ inst.status === 'PAGADA' ? 'Pagada' : 'Por Cobrar' }}
                            </v-chip>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
                  
                  <div v-if="viewingInvoice.notes" class="info-item mt-2">
                      <div class="text-caption text-grey-darken-1 mb-1">
                          <v-icon size="x-small" class="mr-1">mdi-note-text</v-icon>
                          Notas
                      </div>
                      <div class="text-body-2 font-weight-medium text-wrap" style="white-space: pre-wrap;">{{ viewingInvoice.notes }}</div>
                  </div>


              </div>
            </v-col>
            
            <!-- File Preview -->
            <v-col v-if="hasAttachment(viewingInvoice)" cols="12" md="8" class="pa-6">
                <div class="text-overline text-grey-darken-1 mb-4">
                    <v-icon size="small" class="mr-1">mdi-file-document</v-icon>
                    Vista Previa
                </div>
                
                <div class="preview-container rounded-xl overflow-hidden bg-grey-lighten-3" style="height: 480px;">
                    <!-- PDF Preview -->
                    <iframe 
                        v-if="isFilePDF(getFirstAttachment(viewingInvoice).url)"
                        :src="getFirstAttachment(viewingInvoice).url"
                        width="100%"
                        height="100%"
                        style="border: none"
                    ></iframe>
                    
                    <!-- Image Preview -->
                    <v-img
                        v-else
                        :src="getFirstAttachment(viewingInvoice).url"
                        height="480"
                        cover
                    >
                        <template v-slot:placeholder>
                            <div class="d-flex align-center justify-center fill-height">
                                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                            </div>
                        </template>
                    </v-img>
                </div>
            </v-col>
            
          </v-row>
        </v-card-text>
      </template>

      <template #acciones>
        <!-- C1 (ola F2b): en móvil la tabla de escritorio se reemplaza por
             FilaMovimiento, que solo abre este diálogo al tocar la fila — así
             que las mismas acciones de la fila de escritorio (Editar, Cuotas
             Cashea, Mover a papelera / Restaurar / Eliminar definitivamente)
             tienen que estar también acá, no solo en la tabla. -->
        <template v-if="viewingInvoice && currentTab === 'trash'">
          <v-btn
            color="success"
            variant="tonal"
            prepend-icon="mdi-refresh"
            style="min-height: 44px;"
            @click="restaurarDesdeDetalle"
          >
            Restaurar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            prepend-icon="mdi-delete-forever"
            style="min-height: 44px;"
            @click="moverAPapeleraDesdeDetalle"
          >
            Eliminar definitivamente
          </v-btn>
        </template>
        <template v-else-if="viewingInvoice">
          <v-btn
            v-if="viewingInvoice.financial?.paymentMethod === 'CASHEA'"
            variant="tonal"
            style="background-color: #fdfa3d; color: #000; min-height: 44px;"
            @click="cuotasCasheaDesdeDetalle"
          >
            <img src="/Cashea-black-icon.svg" alt="Cashea" width="14" height="14" class="mr-1" />
            Cuotas Cashea
          </v-btn>
          <v-btn
            color="warning"
            variant="tonal"
            prepend-icon="mdi-pencil"
            style="min-height: 44px;"
            @click="editarDesdeDetalle"
          >
            Editar
          </v-btn>
          <!-- Menú de Descargas Unificado (Modal) -->
          <v-menu>
            <template v-slot:activator="{ props }">
              <v-btn
                color="success"
                variant="tonal"
                prepend-icon="mdi-download"
                style="min-height: 44px;"
                v-bind="props"
              >
                Descargas
              </v-btn>
            </template>
            <v-list density="compact">
              <v-list-item @click="downloadReceiptPdf(viewingInvoice)" prepend-icon="mdi-file-pdf-box">
                <v-list-item-title>Ver / Descargar Resumen en PDF</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="hasAttachment(viewingInvoice)" @click="downloadAttachment(viewingInvoice)" prepend-icon="mdi-paperclip">
                <v-list-item-title>Ver / Descargar Foto Adjunta</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="(viewingInvoice.retenciones && viewingInvoice.retenciones.islr > 0) || (viewingInvoice.financial && viewingInvoice.financial.islrRetention > 0)" @click="downloadISLR(viewingInvoice)" prepend-icon="mdi-file-percent">
                <v-list-item-title>Descargar Comprobante ISLR (PDF)</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="(viewingInvoice.retenciones && viewingInvoice.retenciones.iva > 0) || (viewingInvoice.financial && viewingInvoice.financial.ivaRetention > 0)" @click="downloadIVA(viewingInvoice)" prepend-icon="mdi-file-certificate">
                <v-list-item-title>Descargar Comprobante IVA (PDF)</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="canDownloadMunicipal(viewingInvoice)" @click="downloadMunicipal(viewingInvoice)" prepend-icon="mdi-file-document-outline">
                <v-list-item-title>Descargar Comprobante Municipal (PDF)</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
          <v-btn
            color="error"
            variant="text"
            prepend-icon="mdi-delete"
            style="min-height: 44px;"
            @click="moverAPapeleraDesdeDetalle"
          >
            Mover a papelera
          </v-btn>
        </template>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="elevated" @click="viewDialog = false" class="px-6" style="min-height: 44px;">
          Cerrar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Diálogo de opciones avanzadas de exportación -->
    <DialogoAdaptable
      v-model="showExportDialog"
      titulo="Opciones de exportación"
      icono="mdi-download"
      max-width="600"
    >
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

      <template #acciones>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="showExportDialog = false">
          Cancelar
        </v-btn>
        <v-btn color="success" variant="elevated" @click="exportWithOptions">
          <v-icon left>mdi-download</v-icon>
          Exportar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Diálogo de filtros de fecha para exportación (UX Mejorado) -->
    <DialogoAdaptable
      v-model="exportDateDialog"
      @cerrar="cancelExportDateDialog"
      titulo="Exportar registros"
      icono="mdi-file-export-outline"
      max-width="520"
      persistent
    >
          <!-- Contexto: tipo de libro y flujo -->
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ pendingExportType === 'fiscal' ? 'Libro Fiscal SENIAT' : 'Reporte General' }}
            - {{ pendingExportFlow === 'COMPRA' ? 'Compras/Gastos' : 'Ventas' }}
          </p>

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

      <template #acciones>
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
      </template>
    </DialogoAdaptable>

    <!-- ── Modal rápido de cuotas Cashea ──────────────────────── -->
    <CasheaInstallmentsModal
      v-model="casheaDialog"
      :invoice="casheaInvoice"
      @saved="onCasheaSaved"
    />

    <!-- ── Diálogo confirmación retención municipal ─────────── -->
    <DialogoAdaptable
      v-model="municipalConfirmDialog"
      @cerrar="resolverMunicipalConfirm(false)"
      titulo="Tu proveedor está en otro municipio"
      icono="mdi-map-marker-alert-outline"
      max-width="420"
      persistent
    >
      Normalmente no corresponde retener el impuesto municipal cuando el proveedor está en otro municipio. ¿Quieres generar el comprobante igual?
      <template #acciones>
        <v-spacer></v-spacer>
        <v-btn color="grey-darken-1" variant="text" @click="resolverMunicipalConfirm(false)">
          Cancelar
        </v-btn>
        <v-btn color="primary" variant="elevated" @click="resolverMunicipalConfirm(true)">
          Generar igual
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- ── Sistema de Notificaciones Snackbar ─────────────────── -->
    <AppSnackbar
      v-model="snackbar.show"
      :type="snackbar.type"
      :message="snackbar.message"
      :timeout="snackbar.timeout"
    />

    </template>
  </v-container>
</template>


<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import CustomDatePicker from '@/components/common/CustomDatePicker.vue'
import invoiceService from '@/services/invoiceService.js';
import { guardarRegistro } from '@/services/registroService.js';
import { obtenerUrlFirmada } from '@/services/storageUrlService.js';
import bcvService from '@/services/bcvService.js';
import exportService from '@/services/exportService.js';
import ClientInvoiceForm from '@/components/forms/client/ClientInvoiceForm.vue';
import SimpleInvoiceForm  from '@/components/forms/client/SimpleInvoiceForm.vue';
import clientesNegocioService from '@/services/clientesNegocioService.js';
import CasheaInstallmentsModal from '@/components/forms/client/CasheaInstallmentsModal.vue';
import userService from '@/services/userService.js';
import { generateReceiptPdf } from '@/services/receipt-pdf-service.js';
import retentionPdfService from '@/services/retention-pdf-service.js';
import dayjs from 'dayjs';
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js';
import AppSnackbar from '@/components/common/AppSnackbar.vue';
import { supabase } from '@/lib/supabaseClient';
import proveedorService from '@/services/proveedorService.js';
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import FilaMovimiento from '@/components/ui/FilaMovimiento.vue'

/** Filas que muestra la lista móvil por tanda ("Ver más" agrega otra). */
const TANDA_MOVIL = 20
import FiltroChips from '@/components/ui/FiltroChips.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import { formatMoney } from '@/utils/formatMoney.js'
import { formatFechaCorta } from '@/utils/fechas.js'
import { resumenDelMes, siguientePasoMovimientos } from '@/utils/resumenMovimientos.js'
import { textoSinTasa } from '@/utils/monedas.js'
import { tasasVigentes } from '@/services/tasaService.js'

export default {
  name: 'FacturacionCliente',
  components: {
    AppSnackbar,
    ClientInvoiceForm,
    SimpleInvoiceForm,
    CasheaInstallmentsModal,
    AnimatedNumber,
    CustomDatePicker,
    EncabezadoPagina,
    EstadoVacio,
    AvisoAmable,
    DialogoAdaptable,
    FilaMovimiento,
    FiltroChips,
    PanelSiguientePaso
  },
  data() {
    return {
      snackbar: {
        show: false,
        message: '',
        type: 'info',
        timeout: 5000
      },
      proveedoresMap: {},
      initialLoading: true,
      loading: true,
      loadError: '',
      deleting: false,
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
      convertedStatsCashea: 0,
      convertedAmounts: {},
      cachedRate: null,
      // Tasas vigentes del negocio ({ USD, EUR, ... }), automáticas o manuales
      tasasHoy: {},

      // Tab actual
      limiteMovil: TANDA_MOVIL,
      tandaMovil: TANDA_MOVIL,
      currentTab: 'all', // 'all', 'ventas', 'compras', 'gastos'
      clienteInicial: null, // Mis clientes: "Registrar venta a este cliente" (?cliente=<id>)
      
      // Ordenamiento por defecto
      sortBy: [{ key: 'invoiceNumber', order: 'asc' }],
            
      // Filtros
      searchQuery: '',
      statusFilter: 'all', // 'all' = Todos (predeterminado)
      currencyFilter: 'all', // 'all' = Todas las monedas (predeterminado)
      dateFromFilter: null, // Ahora es Date object o null
      dateToFilter: null, // Ahora es Date object o null
      
      // ── Feature flag: cambiar a false para volver al formulario multi-paso ──
      USE_SIMPLE_FORM: true,

      // Estados de diálogos
      invoiceDialog: false,
      deleteDialog: false,
      viewDialog: false,
      showExportDialog: false,
      municipalConfirmDialog: false,
      municipalConfirmResolver: null,
      // Modal rápido de cuotas Cashea
      casheaDialog: false,
      casheaInvoice: null,
      
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
        { title: 'Método', key: 'paymentMethod', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'actions', sortable: false }
      ],
      
      invoiceStatuses: [
        'BORRADOR',
        'EMITIDA',
        'CRÉDITO',
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
        { text: 'Crédito', value: 'CRÉDITO' },
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
    invoicesMovil() {
      return this.filteredInvoices.slice(0, this.limiteMovil)
    },
    opcionesTab() {
      return [
        { valor: 'all', texto: 'Todas', cantidad: this.invoices.length },
        { valor: 'ventas', texto: 'Ventas', cantidad: this.ventasCount },
        { valor: 'compras', texto: 'Compras', cantidad: this.comprasCount },
        { valor: 'gastos', texto: 'Gastos', cantidad: this.gastosCount },
        { valor: 'retenciones', texto: 'Mis retenciones', cantidad: this.retencionesCount },
        { valor: 'trash', texto: 'Papelera', cantidad: this.trashCount },
      ];
    },
    opcionesEstado() {
      return this.statusFilterOptions.map((o) => ({ valor: o.value, texto: o.text }));
    },
    opcionesMoneda() {
      return this.currencyFilterOptions.map((o) => ({ valor: o.value, texto: o.text }));
    },
    tasasParaResumen() {
      return { ...this.tasasHoy, USD: this.tasasHoy.USD || this.cachedRate || undefined };
    },
    resumenMes() {
      return resumenDelMes(this.invoices, this.tasasParaResumen);
    },
    fraseMes() {
      const r = this.resumenMes;
      if (!r.vendi && !r.gaste) return 'Este mes todavía no tienes ventas ni gastos registrados.';
      return `Este mes vendiste ${formatMoney(r.vendi, 'USD')} y gastaste ${formatMoney(r.gaste, 'USD')}.`;
    },
    pasoSiguiente() {
      const p = siguientePasoMovimientos(this.invoices, this.tasasParaResumen);
      const plural = (n, uno, varios) => (n === 1 ? uno : varios);
      if (p.tipo === 'borradores') {
        return {
          tipo: p.tipo,
          titulo: `Tienes ${p.cantidad} ${plural(p.cantidad, 'factura en borrador', 'facturas en borrador')}`,
          detalle: 'Los borradores todavía no cuentan en tus cifras. Revísalos y termínalos.',
          boton: plural(p.cantidad, 'Revisarla', 'Revisarlas'),
          icono: 'mdi-file-edit-outline',
        };
      }
      if (p.tipo === 'cobrar') {
        return {
          tipo: p.tipo,
          titulo: `Te deben ${formatMoney(p.monto, 'USD')} de ventas por cobrar`,
          detalle: `${p.cantidad} ${plural(p.cantidad, 'venta a crédito o vencida', 'ventas a crédito o vencidas')} sin cobrar.`,
          boton: 'Ver ventas',
          icono: 'mdi-cash-clock',
        };
      }
      if (p.tipo === 'retenciones') {
        return {
          tipo: p.tipo,
          titulo: `${p.cantidad} ${plural(p.cantidad, 'comprobante de retención', 'comprobantes de retención')} por descargar`,
          detalle: 'Descárgalos y entrégaselos a tus proveedores.',
          boton: 'Ver retenciones',
          icono: 'mdi-file-download-outline',
        };
      }
      return { tipo: 'listo', titulo: '', detalle: '', boton: '', icono: '' };
    },
    dynamicHeaders() {
      if (this.currentTab === 'retenciones') {
        return [
          { title: 'N° Factura', key: 'invoiceNumber', sortable: true },
          { title: 'Proveedor', key: 'client', sortable: true },
          { title: 'Fecha', key: 'issueDate', sortable: true },
          { title: 'Retención IVA', key: 'retencionesIva', sortable: true },
          { title: 'Retención ISLR', key: 'retencionesIslr', sortable: true },
          { title: 'Total Factura', key: 'total', sortable: true },
          { title: 'Neto a Pagar', key: 'netoPagar', sortable: true },
          { title: 'Estado', key: 'status', sortable: true },
          { title: 'Comprobantes', key: 'actions', sortable: false }
        ];
      }
      return this.headers;
    },
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

    retencionesCount() {
      if (!this.invoices || !Array.isArray(this.invoices)) return 0;
      return this.invoices.filter(inv => 
        inv.flow === 'COMPRA' && ((inv.retenciones?.islr > 0) || (inv.retenciones?.iva > 0) || (inv.retenciones?.municipal > 0))
      ).length;
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

    // M1 (ola F2b): si hay búsqueda/filtros activos (no el simple recorte por
    // pestaña), la lista vacía no significa "aún no registras nada" — significa
    // que ESOS filtros no encontraron nada. Mensaje distinto + "Limpiar filtros"
    // en vez de "Nuevo registro" (que sería confuso: sí hay registros).
    estadoVacioPorFiltro() {
      return this.activeFiltersCount > 0;
    },
    // Copy del estado vacío según la pestaña activa (en lenguaje llano, enseña qué tocar)
    estadoVacioIcono() {
      if (this.estadoVacioPorFiltro) return 'mdi-filter-remove-outline';
      const iconos = {
        ventas: 'mdi-cash-plus',
        compras: 'mdi-cart',
        gastos: 'mdi-cash-minus',
        retenciones: 'mdi-file-document-outline',
        trash: 'mdi-delete',
      };
      return iconos[this.currentTab] || 'mdi-receipt-text-outline';
    },
    estadoVacioTitulo() {
      if (this.estadoVacioPorFiltro) return 'No hay resultados con estos filtros';
      const titulos = {
        ventas: 'Aún no registras ventas',
        compras: 'Aún no registras compras',
        gastos: 'Aún no registras gastos',
        retenciones: 'Todavía no tienes retenciones',
        trash: 'La papelera está vacía',
      };
      return titulos[this.currentTab] || 'Aún no registras movimientos';
    },
    estadoVacioMensaje() {
      if (this.estadoVacioPorFiltro) return 'Prueba con otra búsqueda o quita algún filtro.';
      const mensajes = {
        ventas: 'Toca «Nuevo registro» y tómale foto a tu factura de venta.',
        compras: 'Toca «Nuevo registro» y tómale foto a tu factura de compra.',
        gastos: 'Toca «Nuevo registro» y registra lo que gastaste, con o sin factura.',
        retenciones: 'Aquí verás las facturas de compra con retención de IVA, ISLR o municipal.',
        trash: 'Las facturas que elimines aparecerán aquí antes de borrarse para siempre.',
      };
      return mensajes[this.currentTab] || 'Toca «Nuevo registro» para empezar.';
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
    filteredInvoices() {
      this.limiteMovil = TANDA_MOVIL
    },
    currentTab() {
      this.applyFilters();
      if (this.$route.query.tab !== this.currentTab) {
        this.$router.replace({ 
          query: { ...this.$route.query, tab: this.currentTab } 
        }).catch(() => {});
      }
    },
    '$route.query.tab': {
      handler(newTab) {
        if (newTab && newTab !== this.currentTab) {
          this.currentTab = newTab;
        }
      },
      immediate: true
    },
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
          this.convertedStatsCashea = (this.stats.casheaPendingAmount || 0) / (this.cachedRate || 1);

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
          this.convertedStatsCashea = this.stats.casheaPendingAmount || 0;
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
    
    // Cargar tasa inmediatamente para cálculos correctos (la vigente: automática o la que definió el cliente)
    try {
        const vigentes = await tasasVigentes();
        this.tasasHoy = vigentes.tasas || {};
        if (vigentes.tasas?.USD) this.cachedRate = vigentes.tasas.USD;
    } catch (e) { console.error('Error cargando tasa inicial:', e); }
    if (!this.cachedRate) {
      try {
        const rate = await bcvService.getCurrentRate();
        if (rate?.data?.dollar) {
            this.cachedRate = parseFloat(rate.data.dollar);
        }
      } catch (e) { console.error('Error cargando tasa inicial:', e); }
    }

    await this.loadUser();
    await this.loadProveedores();
    await this.loadInvoices();
    this.initialLoading = false;
    // ?ver=<id>: abre el detalle de esa factura (viene del chip del Kardex)
    const verId = this.$route.query.ver;
    if (verId) {
      const encontrada = this.invoices.find(i => i.id === verId);
      if (encontrada) {
        await this.viewInvoice(encontrada);
      } else {
        this.showNotification('No encontramos esa factura (puede estar en la papelera).', 'warning');
      }
      const { ver, ...resto } = this.$route.query;
      this.$router.replace({ query: resto });
    }
    await this.abrirVentaParaCliente();
    if (typeof window !== 'undefined') {
      window.addEventListener('ad-proveedor-changed', this.loadProveedores);
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('ad-proveedor-changed', this.loadProveedores);
    }
  },
  methods: {
    textoSinTasa,
    formatFechaCorta,
    money(monto) {
      return formatMoney(monto, 'USD');
    },
    irAlSiguientePaso() {
      const tipo = this.pasoSiguiente.tipo;
      if (tipo === 'borradores') {
        this.currentTab = 'all';
        this.statusFilter = 'BORRADOR';
      } else if (tipo === 'cobrar') {
        this.currentTab = 'ventas';
        this.statusFilter = 'all';
      } else if (tipo === 'retenciones') {
        this.currentTab = 'retenciones';
        this.statusFilter = 'all';
      }
      this.applyFilters();
    },
    async loadProveedores() {
      try {
        const list = await proveedorService.getProveedores({ onlyActive: true });
        const map = {};
        (list || []).forEach(p => {
          if (p.id) map[p.id] = p.municipio_id || p.municipio || '';
          if (p.rif) map[p.rif] = p.municipio_id || p.municipio || '';
        });
        this.proveedoresMap = map;
      } catch (e) {
        console.warn('Error cargando mapa de proveedores en Facturacion:', e);
      }
    },
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
      
      const myClientId = this.currentUser.client_id || this.currentUser.id;
      
      try {
        this.loading = true;
        this.loadError = '';
        console.log('🔄 Cargando facturas del cliente...', { clientId: myClientId });
        
        // 1. Cargar Ventas y Compras por client_id — ambas usan el mismo filtro seguro
        // Las facturas de VENTA donde yo soy emisor tienen client_id asignado
        const [salesRes, purchasesRes] = await Promise.all([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: myClientId }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: myClientId })
        ]);
        
        this.invoices = [...(salesRes || []), ...(purchasesRes || [])];
        
        // 2. Cargar Papelera (trashed=true) — mismo filtro seguro
        const [trashSalesRes, trashPurchasesRes] = await Promise.all([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: myClientId }, { trashed: true }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: myClientId }, { trashed: true })
        ]);
        this.trashInvoices = [...(trashSalesRes || []), ...(trashPurchasesRes || [])];
        
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
        this.loadError = 'No pudimos cargar tus movimientos. Revisa tu conexión e intenta de nuevo.';
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
        totalAmount: 0,
        casheaPendingAmount: 0
      };
      
      sourceData.forEach(inv => {
        this.stats.byStatus[inv.status] = (this.stats.byStatus[inv.status] || 0) + 1;
        
        // No sumar montos de facturas ANULADAS ni en BORRADOR
        if (inv.status === 'ANULADA' || inv.status === 'BORRADOR') return;

        let amount = inv.financial?.totalSales || 0;
        const currency = inv.financial?.currency || 'VES';

        // NORMALIZAR A VES (Moneda Base del Sistema)
        if (currency === 'USD') {
             amount = amount * currentRate;
        } 
        // TODO: Agregar soporte EUR cuando exista API
        // else if (currency === 'EUR') { ... }

        // LOGICA DE NETEO (Solo para vista global 'all')
        if (this.currentTab === 'all' && inv.flow === 'COMPRA') {
            this.stats.totalAmount -= amount;
        } else {
            this.stats.totalAmount += amount;
        }

        // CALCULO DE CASHEA PENDIENTE (Solo para ventas) — FIX inconsistencia #4
        if (inv.flow === 'VENTA' && inv.financial?.paymentMethod === 'CASHEA' && inv.financial?.credit) {
            let pendingVES = 0;
            const credit = inv.financial.credit;

            // Incluir inicial si aún no ha sido cobrada
            // Si no existe initialStatus, asumimos PAGADA para compatibilidad con facturas previas
            if (credit.initialStatus === 'POR_COBRAR') {
                pendingVES += credit.initialAmount || 0;
            }

            // Sumar cuotas pendientes
            if (credit.installments) {
                credit.installments.forEach(inst => {
                    if (inst.status === 'POR_COBRAR') {
                        pendingVES += inst.amount;
                    }
                });
            }

            // Normalizar a VES si la factura es en USD
            if (currency === 'USD') {
                pendingVES = pendingVES * currentRate;
            }
            this.stats.casheaPendingAmount += pendingVES;
        }
      });
      
      // Actualizar el total visual convertido
      if (this.currencyDisplay === 'USD' && currentRate) {
         this.convertedStatsTotal = this.stats.totalAmount / currentRate;
         this.convertedStatsCashea = this.stats.casheaPendingAmount / currentRate;
      } else {
         this.convertedStatsTotal = this.stats.totalAmount;
         this.convertedStatsCashea = this.stats.casheaPendingAmount;
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
        case 'retenciones':
          filtered = filtered.filter(inv => 
            inv.flow === 'COMPRA' && ((inv.retenciones?.islr > 0) || (inv.retenciones?.iva > 0) || (inv.retenciones?.municipal > 0))
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
    
    // Mis clientes → "Registrar venta a este cliente": /cliente/facturacion?cliente=<id>
    // abre el formulario de venta con ese cliente ya elegido (no guarda nada).
    async abrirVentaParaCliente() {
      const { cliente, ...resto } = this.$route.query;
      if (!cliente) return;
      this.$router.replace({ query: resto });
      const fila = await clientesNegocioService.obtenerBasico(String(cliente));
      if (!fila) return;
      this.currentTab = 'ventas';
      this.clienteInicial = fila;
      this.openNewInvoiceDialog();
    },

    openNewInvoiceDialog() {
      this.editingInvoice = null;
      this.invoiceDialog = true;
    },
    
    editInvoice(invoice) {
      this.editingInvoice = JSON.parse(JSON.stringify(invoice));
      this.invoiceDialog = true;
    },
    
    async viewInvoice(invoice) {
      const cloned = JSON.parse(JSON.stringify(invoice));
      // Resolver la URL del adjunto (ruta o URL pública/firmada antigua) a una
      // URL firmada lista para previsualizar/descargar antes de mostrar el diálogo.
      if (cloned.attachments && cloned.attachments.length > 0 && cloned.attachments[0]) {
        const att = cloned.attachments[0];
        const signedUrl = await obtenerUrlFirmada('invoices', att.path || att.url);
        if (signedUrl) att.url = signedUrl;
      }
      this.viewingInvoice = cloned;
      this.viewDialog = true;
    },
    
    deleteInvoice(invoice) {
      this.invoiceToDelete = invoice;
      this.deleteDialog = true;
    },

    // C1 (ola F2b): acciones del diálogo de detalle (el único punto de
    // entrada en móvil, donde la tabla se reemplaza por FilaMovimiento).
    // Cierran el diálogo de detalle primero para no apilarlo con el
    // siguiente (editar, confirmar borrado...).
    editarDesdeDetalle() {
      if (!this.viewingInvoice) return;
      this.viewDialog = false;
      this.editInvoice(this.viewingInvoice);
    },
    // Sirve tanto para "Mover a papelera" (tabs normales) como para
    // "Eliminar definitivamente" (tab Papelera): deleteInvoice() abre el
    // mismo diálogo de confirmación, que ya distingue el texto y la acción
    // según currentTab (ver confirmDelete).
    moverAPapeleraDesdeDetalle() {
      if (!this.viewingInvoice) return;
      this.viewDialog = false;
      this.deleteInvoice(this.viewingInvoice);
    },
    async restaurarDesdeDetalle() {
      if (!this.viewingInvoice) return;
      this.viewDialog = false;
      await this.restoreInvoice(this.viewingInvoice);
    },
    cuotasCasheaDesdeDetalle() {
      if (!this.viewingInvoice) return;
      this.viewDialog = false;
      this.openCasheaDialog(this.viewingInvoice);
    },

    /** Abre el modal rápido de cuotas Cashea */
    openCasheaDialog(invoice) {
      // Clonar para evitar mutaciones directas antes de guardar
      this.casheaInvoice = JSON.parse(JSON.stringify(invoice));
      this.casheaDialog = true;
    },

    /**
     * Callback cuando el modal de cuotas Cashea guarda exitosamente.
     * Actualiza la factura en el array local sin recargar todo desde la BD.
     */
    onCasheaSaved(updatedInvoice) {
      // Actualizar en el array principal
      const idx = this.invoices.findIndex(inv => inv.id === updatedInvoice.id);
      if (idx !== -1) {
        this.invoices[idx] = { ...this.invoices[idx], ...updatedInvoice };
      }
      // Reflejar cambios en filteredInvoices también
      const fidx = this.filteredInvoices.findIndex(inv => inv.id === updatedInvoice.id);
      if (fidx !== -1) {
        this.filteredInvoices[fidx] = { ...this.filteredInvoices[fidx], ...updatedInvoice };
      }
      // Recalcular estadísticas (la tarjeta "Cashea por Cobrar" se actualiza)
      this.calculateStats();
      // Forzar re-render reactivo
      this.invoices = [...this.invoices];
      this.filteredInvoices = [...this.filteredInvoices];
    },
    
    async confirmDelete() {
      if (!this.invoiceToDelete) return;

      this.deleting = true;
      try {
        let delResult;
        if (this.currentTab === 'trash') {
            delResult = await invoiceService.hardDeleteInvoice(this.invoiceToDelete.id);
        } else {
            delResult = await invoiceService.deleteInvoice(this.invoiceToDelete.id);
        }

        // El servicio no lanza: avisa con success:false y un mensaje en lenguaje llano
        // (p. ej. compras con comprobantes de retención no se borran del todo).
        if (delResult && delResult.success === false) {
          this.deleteDialog = false;
          this.invoiceToDelete = null;
          this.showNotification(delResult.message || 'No pudimos eliminar la factura.', 'warning', 9000);
          return;
        }

        await this.loadInvoices(); // Recarga todo (invoices y trashInvoices)
        this.deleteDialog = false;
        this.invoiceToDelete = null;
        this.showNotification(
          this.currentTab === 'trash' ? '¡Listo! Eliminamos la factura definitivamente.' : '¡Listo! Enviamos la factura a la papelera.',
          'success'
        );
      } catch (error) {
        console.error('❌ Error al eliminar factura:', error);
        this.showNotification('No pudimos eliminar la factura. Intenta de nuevo.', 'error');
      } finally {
        this.deleting = false;
      }
    },

    async restoreInvoice(invoice) {
        try {
            const restoreResult = await invoiceService.restoreInvoice(invoice.id);
            await this.loadInvoices(); // Mueve de trash a active
            if (restoreResult && restoreResult.success === false) {
              this.showNotification(restoreResult.message || 'No pudimos restaurar la factura.', 'error');
            } else if (restoreResult?.warning) {
              this.showNotification(restoreResult.warning, 'warning', 9000);
            } else {
              this.showNotification('¡Listo! Restauramos la factura.', 'success');
            }
        } catch (error) {
            console.error('❌ Error al restaurar factura:', error);
            this.showNotification('No pudimos restaurar la factura. Intenta de nuevo.', 'error');
        }
    },
    
    closeInvoiceDialog() {
      this.invoiceDialog = false;
      this.editingInvoice = null;
      this.clienteInicial = null;
    },
    
    async handleInvoiceSubmit(result) {
      // ── Formato antiguo (ClientInvoiceForm emite { success: true }) ──────────
      if (result && result.success === true) {
        this.closeInvoiceDialog();
        await this.loadInvoices();
        return;
      }

      // ── Formato nuevo (SimpleInvoiceForm emite el formData directamente) ─────
      // La persistencia vive en registroService.guardarRegistro; esta vista solo
      // decide qué hacer con la UI según el resultado.
      const formData = result; // result ES el formData aquí
      const saveResult = await guardarRegistro(formData);

      if (saveResult.success) {
        // Notificar al SimpleInvoiceForm que terminó con éxito
        if (this.$refs.simpleForm) {
          this.$refs.simpleForm.onSaveSuccess();
        }

        // Si fue una compra o gasto, notificar al módulo de proveedores para auto-sincronización
        if (saveResult.isCompra && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ad-proveedor-changed'));
        }

        this.closeInvoiceDialog();
        await this.loadInvoices();
        // La compra se guardó pero el inventario falló: avisar (no es un error de guardado)
        if (saveResult.warning) {
          this.showNotification(saveResult.warning, 'warning', 10000);
        }
      } else {
        console.error('❌ [Facturacion] Error al guardar factura:', saveResult.message);
        // Notificar al SimpleInvoiceForm del error (no pierde los datos)
        if (this.$refs.simpleForm) {
          this.$refs.simpleForm.onSaveFailed(saveResult.message);
        }
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
        'EMITIDA': 'secondary',
        'ENVIADA': 'secondary',
        'PAGADA': 'success',
        'VENCIDA': 'error',
        'ANULADA': 'grey-darken-3',
        'CRÉDITO': 'warning'
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

    getPaymentMethodColor(method) {
      const colors = {
        'EFECTIVO': 'secondary',
        'PAGO_MOVIL': 'secondary',
        'TRANSFERENCIA': 'secondary',
        'ZELLE': 'secondary',
        'PUNTO_VENTA': 'secondary',
        'CASHEA': 'secondary',
        'OTRO': 'grey'
      };
      return colors[method] || 'grey';
    },

    formatPaymentMethod(method) {
      if (method === 'PAGO_MOVIL') return 'Pago Móvil';
      if (method === 'PUNTO_VENTA') return 'Punto de Venta';
      if (!method) return '';
      return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
    },

    getEquivalentAmount(invoice) {
        const currency = invoice.financial?.currency || 'VES';
        const amount = invoice.financial?.totalSales || 0;
        
        // Solo mostrar equivalente si la moneda original no es VES 
        // y la vista actual está en VES, o si es VES y la vista en USD.
        // Pero para replicar Inventario.vue, mostramos equivalente VES debajo del USD.
        if (this.currencyDisplay === 'VES' && currency === 'USD' && this.cachedRate) {
            return this.formatCurrency(amount * this.cachedRate, 'VES');
        }
        
        return null;
    },
    
    getDisplayAmount(invoice) {
      if (this.currencyDisplay === 'USD') {
        return this.convertedAmounts[invoice.id] != null ? this.convertedAmounts[invoice.id] : 0;
      }
      return invoice.financial?.totalSales || 0;
    },

    // I1: versión "cruda" (monto + moneda, no un string ya formateado) de
    // getFormattedDisplayAmount, para la lista móvil (FilaMovimiento, que
    // formatea internamente con formatMoney). Antes la lista móvil usaba
    // getDisplayAmount() + currencyDisplay siempre, así que una factura en
    // USD se pintaba como si fuera VES (o se convertía como si ya fuera VES
    // en vista USD). Con esto respeta la moneda real de CADA factura, igual
    // que la tabla de escritorio.
    getDisplayAmountYMoneda(invoice) {
      if (this.currencyDisplay === 'USD') {
        if (invoice.financial?.currency === 'USD') {
          return { monto: invoice.financial.totalSales || 0, moneda: 'USD' };
        }
        const converted = this.convertedAmounts[invoice.id] !== undefined ? this.convertedAmounts[invoice.id] : 0;
        return { monto: converted, moneda: 'USD' };
      }
      return {
        monto: invoice.financial?.totalSales || 0,
        moneda: invoice.financial?.currency || 'VES'
      };
    },
    
    async convertAmountToUSD(amountInVES) {
      try {
        if (!this.cachedRate) {
          const rate = await bcvService.getCurrentRate();
          this.cachedRate = parseFloat(rate.data.dollar);
        }
        const result = (amountInVES || 0) / (this.cachedRate || 1);
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

    // Utilities for Invoice Preview
    hasAttachment(invoice) {
        return invoice && invoice.attachments && invoice.attachments.length > 0 && invoice.attachments[0].url;
    },
    getFirstAttachment(invoice) {
        if (this.hasAttachment(invoice)) return invoice.attachments[0];
        return null;
    },
    isFilePDF(url) {
        if (!url) return false;
        return url.toLowerCase().includes('.pdf');
    },
    async downloadAttachment(invoice) {
        const attach = this.getFirstAttachment(invoice);
        if (attach && attach.url) {
            const signedUrl = await obtenerUrlFirmada('invoices', attach.path || attach.url);
            window.open(signedUrl || attach.url, '_blank');
        }
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
          // C1 (2026-10-13): el Libro de Compras se filtra/agrupa por fecha_fiscal
          // (mes en que corresponde declarar la operación) si existe, con fallback
          // a la fecha de emisión. Solo aplica a COMPRA; VENTA sigue por issueDate.
          // Ver docs/mvp/backlog-contadora-2026-10-12.md punto 1.
          const referenceDate = (inv.flow === 'COMPRA' && inv.fecha_fiscal) ? inv.fecha_fiscal : inv.issueDate;
          if (!referenceDate) return false;
          const invoiceDate = new Date(referenceDate);
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
          // C1: mismo criterio que el filtro por mes (fecha_fiscal para COMPRA, con fallback).
          const referenceDate = (inv.flow === 'COMPRA' && inv.fecha_fiscal) ? inv.fecha_fiscal : inv.issueDate;
          if (!referenceDate) return false;
          const invoiceDate = new Date(referenceDate);
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
    },

    _buildCompanyInfo() {
      const clientProfile = this.currentUser?.client || {};
      const orgProfile = Array.isArray(this.currentUser?.organization) 
        ? this.currentUser.organization[0] 
        : (this.currentUser?.organization || {});
        
      return {
        name: clientProfile.company_name || orgProfile.name || this.currentUser?.companyName || 'Mi Empresa',
        rif: clientProfile.rif || orgProfile.rif || this.currentUser?.rif || 'J-00000000-0',
        address: clientProfile.address || orgProfile.address || 'DIRECCIÓN NO REGISTRADA',
        phone: clientProfile.phone || orgProfile.phone || '',
        licencia_actividad_economica: clientProfile.licencia_actividad_economica || '',
        municipio: clientProfile.municipio_id || clientProfile.municipio || '',
        estado: clientProfile.estado || '',
        activity_type: clientProfile.activity_type || ''
      };
    },

    showNotification(message, type = 'info', timeout = 5000) {
      this.snackbar = {
        show: true,
        message,
        type,
        timeout
      };
      if (this.$root?.showSnackbar) {
        this.$root.showSnackbar(message, type);
      }
    },

    async downloadISLR(invoice) {
      try {
        const companyInfo = this._buildCompanyInfo();
        await retentionPdfService.generarComprobanteISLR(invoice, companyInfo);
        this.showNotification('Comprobante ISLR exportado exitosamente', 'success');
      } catch (error) {
        console.error('Error exportando comprobante ISLR:', error);
        this.showNotification('Error al exportar comprobante ISLR', 'error');
      }
    },

    async downloadIVA(invoice) {
      try {
        const companyInfo = this._buildCompanyInfo();
        await retentionPdfService.generarComprobanteIVA(invoice, companyInfo);
        this.showNotification('Comprobante IVA exportado exitosamente', 'success');
      } catch (error) {
        console.error('Error exportando comprobante IVA:', error);
        this.showNotification('Error al exportar comprobante IVA', 'error');
      }
    },

    /**
     * Determina si se debe mostrar la opción de descargar el comprobante municipal.
     * Solo es visible si:
     * 1. La factura tiene retención municipal registrada.
     * 2. El proveedor y la empresa cliente residen en el MISMO municipio.
     */
    canDownloadMunicipal(invoice) {
      if (!invoice) return false;

      // 1. Debe existir retención municipal en la factura
      const hasRetention = (invoice.retenciones && Number(invoice.retenciones.municipal) > 0) ||
                           (invoice.financial && Number(invoice.financial.municipalRetention) > 0);
      if (!hasRetention) return false;

      // 2. Municipio de la empresa cliente
      const companyInfo = this._buildCompanyInfo();
      const tenantMunicipio = companyInfo.municipio;
      if (!tenantMunicipio) return false;

      // 3. Municipio del proveedor (con fallback al mapa reactivo en memoria por si fue actualizado)
      const provId = invoice.issuer?.id || invoice.issuer_id || invoice.provider_id;
      const provRif = invoice.issuer?.rif;
      const issuerMunicipio = (provId && this.proveedoresMap?.[provId]) ||
                              (provRif && this.proveedoresMap?.[provRif]) ||
                              invoice.issuer?.municipio_id ||
                              invoice.issuer?.municipio || '';
      if (!issuerMunicipio) return false;

      // C7 (2026-10-13): ya NO se oculta la opción solo porque los municipios
      // difieran. Se muestra siempre que haya retención y datos de municipio en
      // ambas partes; downloadMunicipal() advierte y pide confirmación si no coinciden.
      return true;
    },

    async downloadMunicipal(invoice) {
      try {
        const companyInfo = this._buildCompanyInfo();

        // 1. Municipio del tenant
        const tenantMunicipio = companyInfo.municipio;

        // 2. Municipio del emisor (consultando proveedor en BD si existe para tener el dato más reciente)
        let issuerMunicipio = invoice.issuer?.municipio_id || invoice.issuer?.municipio || '';
        const provId = invoice.issuer?.id || invoice.issuer_id || invoice.provider_id;
        const provRif = invoice.issuer?.rif;

        if (provId || provRif) {
          try {
            let provQuery = supabase.from('proveedores').select('municipio_id, estado');
            if (provId) {
              provQuery = provQuery.eq('id', provId);
            } else {
              provQuery = provQuery.eq('rif', provRif);
            }
            const { data: provData } = await provQuery.maybeSingle();
            if (provData?.municipio_id) {
              issuerMunicipio = provData.municipio_id;
            }
          } catch (e) {
            console.warn('No se pudo verificar municipio actualizado en BD:', e);
          }
        }

        // C7 (2026-10-13): antes se bloqueaba. Ahora se advierte y se permite
        // continuar si el usuario confirma (la contadora pidió "sin bloquear",
        // ver W5 en docs/mvp/backlog-cliente-whatsapp.md).
        let confirmMismatch = false;
        if (!venezuelaLocationsService.areSameMunicipality(tenantMunicipio, issuerMunicipio)) {
          const tenantNombre = venezuelaLocationsService.getCleanMunicipalityName(tenantMunicipio);
          const issuerNombre = venezuelaLocationsService.getCleanMunicipalityName(issuerMunicipio);
          this.showNotification(
            `Tu proveedor está en ${issuerNombre} y tu empresa en ${tenantNombre}. Normalmente no corresponde retener impuesto municipal en este caso.`,
            'warning'
          );
          const continuar = await this.confirmarMunicipioDistinto();
          if (!continuar) return;
          confirmMismatch = true;
        }

        await retentionPdfService.generarComprobanteMunicipal(invoice, companyInfo, { confirmMismatch });
        this.showNotification('Comprobante Municipal exportado exitosamente', 'success');
      } catch (error) {
        console.error('Error exportando comprobante Municipal:', error);
        this.showNotification('Error al exportar comprobante Municipal', 'error');
      }
    },

    confirmarMunicipioDistinto() {
      this.municipalConfirmDialog = true;
      return new Promise((resolve) => {
        this.municipalConfirmResolver = resolve;
      });
    },

    resolverMunicipalConfirm(value) {
      this.municipalConfirmDialog = false;
      if (this.municipalConfirmResolver) {
        this.municipalConfirmResolver(value);
        this.municipalConfirmResolver = null;
      }
    },

    /** Descarga un recibo PDF individual de la factura */
    async downloadReceiptPdf(invoice) {
      try {
        await generateReceiptPdf(invoice);
        this.showNotification('Recibo PDF descargado exitosamente', 'success');
      } catch (error) {
        console.error('Error generando recibo PDF:', error);
        this.showNotification('Error al generar el recibo PDF', 'error');
      }
    }
  }
};
</script>

<style scoped>
.movimientos__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 8px 0 24px;
}

@media (min-width: 960px) {
  .movimientos__panel { grid-template-columns: 7fr 5fr; }
}

.movimientos__resumen {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 20px;
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: center;
}

@media (max-width: 599px) {
  .movimientos__resumen { padding: 18px; }
}

.movimientos__frase {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.movimientos__sin-tasa {
  margin: 8px 0 0;
  font-size: 1rem;
  color: rgb(var(--v-theme-warning-darken-1, var(--v-theme-warning)));
}

.movimientos__cifras {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  margin: 0;
}

.movimientos__cifra dt {
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.movimientos__cifra dd {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

.movimientos__tabla {
  border-radius: 20px;
  border-color: rgba(var(--v-theme-on-surface), 0.1);
}

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

.detalle-factura__encabezado {
  background: rgb(var(--v-theme-secondary));
}

.detalle-factura__numero {
  overflow-wrap: anywhere;
  line-height: 1.25;
}
</style>
