<template>
  <v-container fluid class="fill-height align-start pa-0 bg-background">
    
    <!-- HEADER -->
    <v-row no-gutters class="pa-6 pb-2">
      <v-col cols="12" md="8">
        <h1 class="text-h4 text-md-h4 text-h5 font-weight-bold text-secondary mb-1">
          Expediente Fiscal 360
        </h1>
        <p class="text-body-2 text-md-body-1 text-grey-darken-1">
          Gestiona tus permisos y mantén tu empresa al día.
        </p>
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center justify-start justify-md-end flex-wrap mt-4 mt-md-0">
        <v-btn
          color="secondary"
          prepend-icon="mdi-file-pdf-box"
          variant="outlined"
          class="text-none px-4 mr-3"
          rounded="lg"
          @click="exportToPDF"
          :loading="exporting"
        >
          <span class="d-none d-sm-inline mr-1">Exportar</span> Expediente
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          elevation="2"
          class="text-none px-4"
          rounded="lg"
          @click="openDialog()"
        >
          <span class="d-none d-sm-inline mr-1">Nuevo</span> Documento
        </v-btn>
      </v-col>
    </v-row>

    <!-- DASHBOARD -->
    <v-row class="px-6 mb-6">
      
      <!-- Chart -->
      <v-col cols="12" md="4" lg="3">
        <v-card class="rounded-xl h-100 pa-4" variant="outlined" style="border-color: rgba(0,0,0,0.05)">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-subtitle-1 font-weight-bold text-secondary">Progreso General</h3>
          </div>
          <div style="height: 180px; position: relative">
            <canvas ref="chartCanvas" style="position: relative; z-index: 2"></canvas>
            <div class="chart-center-text">
                <div class="text-h4 font-weight-bold text-secondary">{{ progressRate }}%</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Stats Cards -->
      <v-col cols="12" md="8" lg="9">
        <v-row class="fill-height">
          <v-col cols="6" sm="4">
            <StatsCard
               title="Vigentes"
               :value="stats.vigente"
               bg-color="#02254d"
               text-color="white"
               icon="mdi-check-circle"
            />
          </v-col>
          <v-col cols="6" sm="4">
            <StatsCard
               title="En Trámite"
               :value="stats.tramite"
               bg-color="#f2b648"
               text-color="#010101"
               icon="mdi-clock-outline"
            />
          </v-col>
          <v-col cols="12" sm="4">
            <StatsCard
               title="Vencidos / Por Vencer"
               :value="stats.vencido + stats.porVencer"
               bg-color="#961112"
               text-color="white"
               icon="mdi-alert-circle"
            />
          </v-col>
          
          <!-- Checklist Progress -->
          <v-col cols="12">
            <v-card class="rounded-xl pa-4 bg-surface" elevation="0">
              <div class="d-flex justify-space-between mb-2">
                <span class="text-subtitle-2 font-weight-bold text-secondary">
                  Progreso del Expediente
                </span>
              </div>
              <v-progress-linear
                :model-value="progressRate"
                height="12"
                rounded
                color="primary"
                bg-color="grey-lighten-3"
              >
                <template v-slot:default="{ value }">
                  <span class="text-white text-caption font-weight-bold">{{ Math.ceil(value) }}%</span>
                </template>
              </v-progress-linear>
              <v-tooltip activator="parent" location="top">
                Completados: {{ complianceDetail.total.covered }} / {{ complianceDetail.total.required }}
              </v-tooltip>
              <div class="d-flex mt-2 gap-2 overflow-x-auto py-2">
                 <v-chip 
                    v-for="cat in categories" 
                    :key="cat.value"
                    size="small" 
                    :variant="getCategoryVariant(cat.value)"
                    :color="getCategoryColor(cat.value)"
                    class="mr-2"
                 >
                    <v-icon start :icon="getCategoryIconStatus(cat.value)"></v-icon>
                    {{ cat.title }} 
                    <span v-if="complianceDetail[cat.value]" class="ml-1 font-weight-bold">
                        ({{ complianceDetail[cat.value].rate }}%)
                    </span>
                 </v-chip>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- CONTENT (LIST) -->
    <v-row class="px-6 pb-10">
      <v-col cols="12">
        
        <!-- Tabs de navegación por categoría -->
        <v-card class="mb-4" elevation="2">
          <v-tabs
            v-model="currentTab"
            bg-color="white"
            color="primary"
            show-arrows
            height="64"
          >
            <v-tab value="all" class="text-none font-weight-medium">
              <v-icon start size="24">mdi-view-list</v-icon>
              <span class="d-none d-sm-inline">Todos</span>
              <v-chip size="small" class="ml-2" color="primary" variant="tonal">
                {{ stats.total }}
              </v-chip>
            </v-tab>

            <v-tab v-for="cat in categories" :key="cat.value" :value="cat.value" class="text-none font-weight-medium">
              <v-icon start size="24" :color="getCategoryChipColor(cat.value)">{{ getCategoryIcon(cat.value) }}</v-icon>
              <span class="d-none d-sm-inline">{{ cat.title }}</span>
              <v-chip size="small" class="ml-2" :color="getCategoryChipColor(cat.value)" variant="tonal">
                {{ getCategoryCount(cat.value) }}
              </v-chip>
            </v-tab>

            <v-tab value="trash" class="text-none font-weight-medium">
              <v-icon start size="24" color="grey">mdi-delete-outline</v-icon>
              <span class="d-none d-sm-inline">Papelera</span>
              <v-chip size="small" class="ml-2" color="grey" variant="tonal">
                {{ stats.trash }}
              </v-chip>
            </v-tab>
          </v-tabs>

          <!-- Barra de período y filtro de estado - Solo para tabs con docs recurrentes -->
          <v-slide-y-transition>
            <div v-if="showPeriodSelector" class="pa-3 px-4 bg-grey-lighten-5">
              <div class="d-flex align-center flex-wrap" style="gap: 12px">
                <!-- Selector de año -->
                <v-select
                  v-model="selectedYear"
                  :items="availableYears"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="width: 110px"
                  bg-color="white"
                  label="Año"
                  prepend-inner-icon="mdi-calendar"
                />

                <!-- Selector de mes -->
                <v-select
                  v-model="selectedMonth"
                  :items="monthOptions"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="width: 160px"
                  bg-color="white"
                  label="Mes"
                  prepend-inner-icon="mdi-calendar-month"
                />

                <v-spacer />

                <!-- Filtro de estado -->
                <v-select
                  v-model="statusFilter"
                  :items="statusOptions"
                  item-title="label"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 180px"
                  bg-color="white"
                  prepend-inner-icon="mdi-filter-variant"
                  label="Estado"
                />
              </div>
            </div>
          </v-slide-y-transition>
        </v-card>

        <!-- Document List -->
        <v-card class="rounded-xl border-none" elevation="0" :loading="loading">

          <!-- ===== MODO EXPANSION PANELS: Tab "Todos" ===== -->
          <template v-if="currentTab === 'all' || currentTab === 'trash'">
            <v-data-iterator :items="filteredDocs" :items-per-page="-1">
              <template v-slot:default="{ items }">
                <v-expansion-panels variant="accordion" class="rounded-xl">
                  <v-expansion-panel
                    v-for="cat in groupedCategories"
                    :key="cat.name"
                    elevation="0"
                    class="mb-2 border rounded-lg"
                  >
                    <v-expansion-panel-title>
                      <div class="d-flex align-center w-100">
                        <v-icon color="secondary" class="mr-3">{{ getCategoryIcon(cat.id) }}</v-icon>
                        <span class="text-subtitle-1 font-weight-bold">{{ cat.name }}</span>
                        <v-spacer />
                        <v-chip size="small" variant="tonal" class="mr-4">
                          {{ cat.docs.length }} docs
                        </v-chip>
                      </div>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-list lines="two">
                        <v-list-item
                          v-for="doc in cat.docs"
                          :key="doc.id"
                          class="py-3 rounded-lg mb-1 hover-bg cursor-pointer"
                          border
                          @click="openPreview(doc)"
                        >
                          <template v-slot:prepend>
                            <div class="mr-4 text-center d-flex align-center justify-center" style="width: 50px; height: 50px">
                              <template v-if="doc.expiration_date">
                                <div>
                                  <div class="text-h6 font-weight-bold mb-n1" :class="getExpirationClass(doc.expiration_date)">
                                    {{ getDay(doc.expiration_date) }}
                                  </div>
                                  <div class="text-caption text-uppercase" :class="getExpirationClass(doc.expiration_date)">
                                    {{ getMonth(doc.expiration_date) }}
                                  </div>
                                </div>
                              </template>
                              <v-icon v-else :icon="getCategoryIcon(doc.category)" size="32" color="primary" />
                            </div>
                          </template>

                          <v-list-item-title class="font-weight-bold mb-1">{{ doc.name }}</v-list-item-title>
                          <v-list-item-subtitle class="d-flex align-center flex-wrap">
                            <v-chip size="x-small" :color="getStatusColor(getEffectiveStatus(doc))" class="mr-2 mb-1">
                              {{ getEffectiveStatus(doc) }}
                            </v-chip>
                            
                            <!-- Expiration Warning -->
                            <template v-if="doc.expiration_date">
                                <v-chip
                                    size="x-small"
                                    variant="flat"
                                    :color="getExpirationInfo(doc.expiration_date).color"
                                    class="mr-2 mb-1"
                                >
                                    <v-icon start size="x-small">{{ getExpirationInfo(doc.expiration_date).icon }}</v-icon>
                                    {{ getExpirationInfo(doc.expiration_date).label }}
                                </v-chip>
                            </template>

                            <!-- Missing Dates Warning -->
                            <template v-else-if="!doc.expiration_date || !doc.emission_date">
                                  <v-chip
                                    size="x-small"
                                    variant="tonal"
                                    color="warning"
                                    class="mb-1 cursor-pointer"
                                    @click.stop="openDialog(doc)"
                                >
                                    <v-icon start size="x-small">mdi-calendar-alert</v-icon>
                                    Completar fechas
                                </v-chip>
                            </template>
                          </v-list-item-subtitle>

                          <template v-slot:append>
                            <div class="d-flex align-center">
                              <template v-if="currentTab !== 'trash'">
                                <v-btn icon="mdi-eye" variant="text" size="small" color="info" @click.stop="openPreview(doc)" v-tooltip="'Ver detalle'" class="mr-1" />
                                <v-btn v-if="doc.documents?.file_url" icon="mdi-download" variant="text" size="small" color="primary" :href="doc.documents.file_url" target="_blank" @click.stop v-tooltip="'Descargar'" class="mr-1" />
                                <v-btn icon="mdi-pencil" variant="text" size="small" color="grey" @click.stop="openDialog(doc)" v-tooltip="'Editar'" class="mr-1" />
                                <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click.stop="confirmDelete(doc)" v-tooltip="'Mover a Papelera'" />
                              </template>
                              <template v-else>
                                <v-btn prepend-icon="mdi-refresh" variant="text" size="small" color="success" @click.stop="restoreDoc(doc)" :loading="restoring">Restaurar</v-btn>
                                <v-btn icon="mdi-delete-forever" variant="text" size="small" color="error" @click.stop="confirmDelete(doc)" v-tooltip="'Eliminar Definitivamente'" />
                              </template>
                            </div>
                          </template>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </template>
            </v-data-iterator>
          </template>

          <!-- ===== MODO LISTA PLANA: Tabs de categoría individual ===== -->
          <template v-else>
            <v-list lines="two" class="pa-2">
              <!-- Documentos existentes -->
              <v-list-item
                v-for="doc in filteredDocs"
                :key="doc.id"
                class="py-3 rounded-lg mb-1 hover-bg cursor-pointer"
                border
                @click="openPreview(doc)"
              >
                <template v-slot:prepend>
                  <div class="mr-4 text-center d-flex align-center justify-center" style="width: 50px; height: 50px">
                    <template v-if="doc.expiration_date">
                      <div>
                        <div class="text-h6 font-weight-bold mb-n1" :class="getExpirationClass(doc.expiration_date)">
                          {{ getDay(doc.expiration_date) }}
                        </div>
                        <div class="text-caption text-uppercase" :class="getExpirationClass(doc.expiration_date)">
                          {{ getMonth(doc.expiration_date) }}
                        </div>
                      </div>
                    </template>
                    <v-icon v-else :icon="getCategoryIcon(doc.category)" size="32" color="primary" />
                  </div>
                </template>

                <v-list-item-title class="font-weight-bold mb-1">{{ doc.name }}</v-list-item-title>
                <v-list-item-subtitle class="d-flex align-center flex-wrap">
                  <v-chip size="x-small" :color="getStatusColor(getEffectiveStatus(doc))" class="mr-2 mb-1">
                    {{ getEffectiveStatus(doc) }}
                  </v-chip>
                  
                  <!-- Expiration Warning -->
                  <template v-if="doc.expiration_date">
                      <v-chip
                          size="x-small"
                          variant="flat"
                          :color="getExpirationInfo(doc.expiration_date).color"
                          class="mr-2 mb-1"
                      >
                          <v-icon start size="x-small">{{ getExpirationInfo(doc.expiration_date).icon }}</v-icon>
                          {{ getExpirationInfo(doc.expiration_date).label }}
                      </v-chip>
                  </template>

                  <!-- Missing Dates Warning -->
                  <template v-else-if="!doc.expiration_date || !doc.emission_date">
                        <v-chip
                          size="x-small"
                          variant="tonal"
                          color="warning"
                          class="mb-1 cursor-pointer"
                          @click.stop="openDialog(doc)"
                      >
                          <v-icon start size="x-small">mdi-calendar-alert</v-icon>
                          Completar fechas
                      </v-chip>
                  </template>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex align-center">
                    <v-btn icon="mdi-eye" variant="text" size="small" color="info" @click.stop="openPreview(doc)" v-tooltip="'Ver detalle'" class="mr-1" />
                    <v-btn v-if="doc.documents?.file_url" icon="mdi-download" variant="text" size="small" color="primary" :href="doc.documents.file_url" target="_blank" @click.stop v-tooltip="'Descargar'" class="mr-1" />
                    <v-btn icon="mdi-pencil" variant="text" size="small" color="grey" @click.stop="openDialog(doc)" v-tooltip="'Editar'" class="mr-1" />
                    <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click.stop="confirmDelete(doc)" v-tooltip="'Mover a Papelera'" />
                  </div>
                </template>
              </v-list-item>

              <!-- Documentos pendientes (requeridos pero no subidos) -->
              <template v-if="pendingDocs.length > 0">
                <v-divider class="my-3" />
                <div class="text-caption text-grey-darken-1 font-weight-medium px-4 mb-2">
                  <v-icon size="small" class="mr-1">mdi-alert-circle-outline</v-icon>
                  Pendientes por subir
                </div>
                <v-list-item
                  v-for="pending in pendingDocs"
                  :key="pending.id"
                  class="py-3 rounded-lg mb-1"
                  border
                  style="opacity: 0.6"
                >
                  <template v-slot:prepend>
                    <div class="mr-4 d-flex align-center justify-center" style="width: 50px; height: 50px">
                      <v-icon icon="mdi-file-question-outline" size="32" color="grey-lighten-1" />
                    </div>
                  </template>

                  <v-list-item-title class="font-weight-medium text-grey-darken-1 mb-1">
                    {{ pending.label }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="text-grey">
                    Documento requerido — No encontrado para este período
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <v-btn
                      prepend-icon="mdi-plus"
                      variant="tonal"
                      size="small"
                      color="primary"
                      class="text-none"
                      @click.stop="openDialogForPending(pending)"
                    >
                      Subir
                    </v-btn>
                  </template>
                </v-list-item>
              </template>
            </v-list>
          </template>
          
          <!-- Estado vacío -->
          <div v-if="filteredDocs.length === 0 && pendingDocs.length === 0" class="text-center py-10">
            <v-icon size="64" color="grey-lighten-2" class="mb-4">
                {{ currentTab === 'trash' ? 'mdi-delete-empty' : 'mdi-file-document-outline' }}
            </v-icon>
            <h3 class="text-h6 text-grey">
                {{ currentTab === 'trash' ? 'La papelera está vacía' : 'No hay documentos en esta categoría' }}
            </h3>
          </div>

        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs -->
    <FiscalDocDialog
      v-model="dialogOpen"
      :editing-item="editingItem"
      :loading="saving"
      @save="handleSave"
      @close="dialogOpen = false"
    />

    <!-- Delete/Trash Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
        <v-card>
            <v-card-title class="bg-error text-white">
                {{ currentTab === 'trash' ? '¿Eliminar Definitivamente?' : '¿Mover a Papelera?' }}
            </v-card-title>
            <v-card-text class="pa-4">
               <div v-if="currentTab === 'trash'">
                   Esta acción <strong>no se puede deshacer</strong>. Se eliminará el registro y el archivo adjunto permanentemente.
               </div>
               <div v-else>
                   El documento se moverá a la papelera. Podrás restaurarlo después si lo necesitas.
               </div>
               <div class="mt-4 font-weight-bold">
                   {{ itemToDelete?.name }}
               </div>
            </v-card-text>
            <v-card-actions>
                <v-spacer />
                <v-btn text @click="deleteDialog = false">Cancelar</v-btn>
                <v-btn 
                    color="error" 
                    variant="elevated" 
                    @click="executeDelete" 
                    :loading="deleting"
                >
                    {{ currentTab === 'trash' ? 'Eliminar para siempre' : 'Mover a Papelera' }}
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Preview Dialog -->
    <v-dialog v-model="previewDialog" max-width="900" scrollable>
        <v-card v-if="previewItem" class="rounded-xl elevation-0" style="border-radius: 20px !important;">
            <!-- Header con gradiente sutil -->
            <div class="preview-header pa-6" style="background: linear-gradient(135deg, #1F355C 0%, #2d4a7c 100%);">
                <div class="d-flex align-center">
                    <v-avatar color="white" size="48" class="mr-4">
                        <v-icon :icon="getCategoryIcon(previewItem.category)" color="secondary" size="24"></v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                        <div class="text-h5 font-weight-bold text-white">{{ previewItem.name }}</div>
                        <div class="text-caption text-white" style="opacity: 0.8">{{ getCategoryTitle(previewItem.category) }}</div>
                    </div>
                    <v-chip 
                        :color="getStatusColor(getEffectiveStatus(previewItem))" 
                        size="small" 
                        class="font-weight-bold px-3"
                        variant="elevated"
                    >
                        {{ getEffectiveStatus(previewItem) }}
                    </v-chip>
                </div>
            </div>
            
            <v-card-text class="pa-0">
                <v-row no-gutters>
                    <!-- Document Info -->
                    <v-col cols="12" :md="previewItem.documents?.file_url ? 4 : 12" class="pa-6 bg-grey-lighten-5">
                        <div class="text-overline text-grey-darken-1 mb-4">
                            <v-icon size="small" class="mr-1">mdi-information</v-icon>
                            Detalles
                        </div>
                        
                        <div class="d-flex flex-column" style="gap: 16px;">
                            <div v-if="previewItem.doc_type" class="info-item">
                                <div class="text-caption text-grey-darken-1 mb-1">Tipo de Documento</div>
                                <div class="text-body-1 font-weight-medium">{{ previewItem.doc_type }}</div>
                            </div>
                            
                            <div v-if="previewItem.emission_date" class="info-item">
                                <div class="text-caption text-grey-darken-1 mb-1">
                                    <v-icon size="x-small" class="mr-1">mdi-calendar-check</v-icon>
                                    Fecha de Emisión
                                </div>
                                <div class="text-body-1 font-weight-medium">{{ formatDate(previewItem.emission_date) }}</div>
                            </div>
                            
                            <div v-if="previewItem.expiration_date" class="info-item">
                                <div class="text-caption text-grey-darken-1 mb-1">
                                    <v-icon size="x-small" class="mr-1" :color="getExpirationIconColor(previewItem.expiration_date)">mdi-calendar-clock</v-icon>
                                    Fecha de Vencimiento
                                </div>
                                <div class="text-body-1 font-weight-medium" :class="getExpirationClass(previewItem.expiration_date)">
                                    {{ formatDate(previewItem.expiration_date) }}
                                </div>
                            </div>
                            
                            <div v-if="previewItem.notes" class="info-item">
                                <div class="text-caption text-grey-darken-1 mb-1">
                                    <v-icon size="x-small" class="mr-1">mdi-note-text</v-icon>
                                    Notas
                                </div>
                                <div class="text-body-2 font-weight-medium text-wrap" style="white-space: pre-wrap;">{{ previewItem.notes }}</div>
                            </div>
                        </div>
                    </v-col>
                    
                    <!-- File Preview -->
                    <v-col v-if="previewItem.documents?.file_url" cols="12" md="8" class="pa-6">
                        <div class="text-overline text-grey-darken-1 mb-4">
                            <v-icon size="small" class="mr-1">mdi-file-document</v-icon>
                            Vista Previa
                        </div>
                        
                        <div class="preview-container rounded-xl overflow-hidden bg-grey-lighten-3" style="height: 420px;">
                            <!-- PDF Preview -->
                            <iframe 
                                v-if="isFilePDF(previewItem.documents.file_url)"
                                :src="previewItem.documents.file_url"
                                width="100%"
                                height="100%"
                                style="border: none"
                            ></iframe>
                            
                            <!-- Image Preview -->
                            <v-img
                                v-else
                                :src="previewItem.documents.file_url"
                                height="420"
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
                    
                    <!-- No file message -->
                    <v-col v-else-if="!previewItem.documents?.file_url" cols="12" md="8" class="d-flex align-center justify-center pa-6">
                        <div class="text-center py-12">
                            <v-icon size="80" color="grey-lighten-2">mdi-file-hidden</v-icon>
                            <div class="text-body-1 text-grey mt-4">Sin archivo adjunto</div>
                            <div class="text-caption text-grey-lighten-1">Puedes agregar un archivo editando el documento</div>
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>
            
            <v-divider />
            
            <v-card-actions class="px-6 py-4">
                <v-btn
                    v-if="previewItem.documents?.file_url"
                    prepend-icon="mdi-download"
                    color="primary"
                    variant="tonal"
                    rounded="lg"
                    :href="previewItem.documents.file_url"
                    target="_blank"
                    class="text-none"
                >
                    Descargar Archivo
                </v-btn>
                <v-spacer />
                <v-btn
                    prepend-icon="mdi-pencil"
                    color="secondary"
                    variant="text"
                    rounded="lg"
                    @click="previewDialog = false; openDialog(previewItem)"
                    class="text-none mr-2"
                >
                    Editar
                </v-btn>
                <v-btn 
                    @click="previewDialog = false" 
                    variant="elevated" 
                    color="grey-darken-3"
                    rounded="lg"
                    class="text-none"
                >
                    Cerrar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar 
        v-model="snackbar.show" 
        :color="snackbar.color" 
        :timeout="4000"
        location="bottom"
    >
        {{ snackbar.message }}
        <template v-slot:actions>
            <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
        </template>
    </v-snackbar>

  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Chart from 'chart.js/auto'
import { jsPDF } from 'jspdf'
import StatsCard from '@/components/common/StatsCard.vue'
import FiscalDocDialog from '@/components/fiscal/FiscalDocDialog.vue'
import fiscalService from '@/services/fiscalService'
import userService from '@/services/userService'
import systemLogo from '@/assets/icon.png'
import { FISCAL_TYPES, MONTHS, isRecurringFrequency, getExpirationInfo } from '@/constants/fiscalDocuments'

// Data
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const restoring = ref(false)
const exporting = ref(false)
const docs = ref([])
const stats = reactive({ total: 0, vigente: 0, tramite: 0, vencido: 0, porVencer: 0, trash: 0 })
const currentTab = ref('all') // 'all' | 'LEGAL' | 'MUNICIPAL' | 'SENIAT' | 'NOMINA' | 'OTROS' | 'trash'
const dialogOpen = ref(false)
const deleteDialog = ref(false)
const previewDialog = ref(false)
const editingItem = ref(null)
const itemToDelete = ref(null)
const previewItem = ref(null)
const chartCanvas = ref(null)
let chartInstance = null
const snackbar = ref({ show: false, message: '', color: 'error' })

// Selector de período
const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth()) // 0-based
const statusFilter = ref('ALL')

const statusOptions = [
    { label: 'Todos los estados', value: 'ALL' },
    { label: 'Vigentes', value: 'VIGENTE' },
    { label: 'En Trámite', value: 'TRAMITE' },
    { label: 'Vencidos', value: 'VENCIDO' }
]

// Años disponibles para el selector (desde 2020 hasta el próximo año)
const availableYears = computed(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let y = 2020; y <= current + 1; y++) years.push(y)
    return years.sort((a, b) => b - a) // Orden descendente para acceso rápido a recientes
})

// Opciones de meses para el selector
const monthOptions = computed(() => {
    return MONTHS.map((label, index) => ({ title: label, value: index }))
})

const categories = [
    { title: 'Legal', value: 'LEGAL' },
    { title: 'Municipal', value: 'MUNICIPAL' },
    { title: 'Seniat', value: 'SENIAT' },
    { title: 'Parafiscales y nómina', value: 'NOMINA' },
    { title: 'Otros', value: 'OTROS' }
]

// Determinar si el tab actual tiene documentos recurrentes (necesita selector de período)
const showPeriodSelector = computed(() => {
    if (currentTab.value === 'trash' || currentTab.value === 'all') return false
    const catTypes = FISCAL_TYPES[currentTab.value] || []
    return catTypes.some(t => isRecurringFrequency(t.frequency))
})

const getCategoryTitle = (catValue) => {
    const cat = categories.find(c => c.value === catValue)
    return cat ? cat.title : catValue
}

// Computed
// Verifica si un documento pertenece al período seleccionado
const isInSelectedPeriod = (doc) => {
    if (!doc.emission_date) return true // Sin fecha de emisión: siempre visible
    
    const emissionDate = new Date(doc.emission_date)
    const emYear = emissionDate.getFullYear()
    const emMonth = emissionDate.getMonth()
    
    // Buscar la frecuencia del tipo de documento
    const catTypes = FISCAL_TYPES[doc.category] || []
    const typeInfo = catTypes.find(t => t.id === doc.doc_type)
    const frequency = typeInfo?.frequency || 'PERMANENT'
    
    // Documentos permanentes/vigentes: siempre visibles
    if (!isRecurringFrequency(frequency) && frequency !== 'ANNUAL') return true
    
    // Documentos anuales: filtrar solo por año
    if (frequency === 'ANNUAL') return emYear === selectedYear.value
    
    // Documentos trimestrales: verificar si el mes de emisión está en el mismo trimestre
    if (frequency === 'QUARTERLY') {
        const selectedQ = Math.floor(selectedMonth.value / 3)
        const docQ = Math.floor(emMonth / 3)
        return emYear === selectedYear.value && docQ === selectedQ
    }
    
    // Documentos mensuales/quincenales/semestrales: filtrar por mes exacto
    return emYear === selectedYear.value && emMonth === selectedMonth.value
}

const filteredDocs = computed(() => {
    let filtered = docs.value
    
    // Papelera: retornar tal cual
    if (currentTab.value === 'trash') return filtered
    
    // Filtrar por categoría (tab)
    if (currentTab.value !== 'all') {
        filtered = filtered.filter(d => d.category === currentTab.value)
    }
    
    // Filtrar por período (solo si el selector está visible)
    if (showPeriodSelector.value) {
        filtered = filtered.filter(d => isInSelectedPeriod(d))
    }
    
    // Filtrar por estado
    if (statusFilter.value !== 'ALL') {
        filtered = filtered.filter(d => getEffectiveStatus(d) === statusFilter.value)
    }
    
    return filtered
})

// Documentos pendientes (requeridos pero no subidos) para el período actual
const pendingDocs = computed(() => {
    if (currentTab.value === 'all' || currentTab.value === 'trash') return []
    if (statusFilter.value !== 'ALL') return [] // No mostrar pendientes si hay filtro de estado
    
    const catTypes = FISCAL_TYPES[currentTab.value] || []
    const pending = []
    
    catTypes.forEach(type => {
        if (!type.required) return
        
        // Para docs permanentes, verificar si existe alguno sin importar período
        if (!isRecurringFrequency(type.frequency) && type.frequency !== 'ANNUAL') {
            const exists = docs.value.some(d => d.category === currentTab.value && d.doc_type === type.id)
            if (!exists) {
                pending.push({ ...type, category: currentTab.value, isPending: true })
            }
            return
        }
        
        // Para docs recurrentes, verificar si existe para el período seleccionado
        const existsInPeriod = filteredDocs.value.some(d => d.doc_type === type.id)
        if (!existsInPeriod) {
            pending.push({ ...type, category: currentTab.value, isPending: true })
        }
    })
    
    return pending
})

// Conteo de documentos por categoría
const getCategoryCount = (catValue) => {
    return docs.value.filter(d => d.category === catValue).length
}

const groupedCategories = computed(() => {
    const groups = {}
    
    // Inicializar grupos con el orden definido y títulos correctos
    categories.forEach(cat => {
        groups[cat.value] = {
            title: cat.title,
            docs: []
        }
    })

    filteredDocs.value.forEach(doc => {
        if (groups[doc.category]) {
            groups[doc.category].docs.push(doc)
        }
    })

    return Object.keys(groups).map(key => ({
        name: groups[key].title,
        id: key,
        docs: groups[key].docs
    })).filter(g => g.docs.length > 0)
})

const complianceRate = computed(() => {
    if (stats.total === 0) return 0
    return Math.round((stats.vigente / stats.total) * 100)
})

const complianceColor = computed(() => {
    if (progressRate.value >= 80) return 'success'
    if (progressRate.value >= 50) return 'warning'
    return 'error'
})

// Detailed Compliance Logic
// VENCIDO documents count as 0.5, VIGENTE/TRAMITE count as 1.0
const complianceDetail = computed(() => {
    const result = {}
    let totalRequired = 0
    let totalCovered = 0

    // Iterate known categories
    categories.forEach(catObj => {
        const cat = catObj.value
        if (cat === 'OTROS') return // Skip OTROS for strict compliance
        
        const types = FISCAL_TYPES[cat] || []
        const requiredTypes = types.filter(t => t.required)
        const catTotal = requiredTypes.length
        let catCovered = 0

        requiredTypes.forEach(type => {
            // Find docs that match this type
            const matchingDocs = docs.value.filter(d => {
                if (d.category !== cat) return false
                const isTypeMatch = d.doc_type === type.id
                // Fallback fuzzy match only if doc_type is missing
                let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                
                // Evitar falso positivo: "RIF de Socios" contiene "RIF"
                if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) {
                    isNameMatch = false
                }

                return isTypeMatch || isNameMatch
            })

            // Check if any matching doc is valid
            const hasValidDoc = matchingDocs.some(d => {
                const status = getEffectiveStatus(d)
                return status === 'VIGENTE' || status === 'TRAMITE'
            })

            if (hasValidDoc) {
                catCovered++
                totalCovered++
            }
        })

        result[cat] = {
            total: catTotal,
            covered: catCovered,
            rate: catTotal === 0 ? 100 : Math.round((catCovered / catTotal) * 100)
        }
        
        totalRequired += catTotal
    })

    // Agregamos el total global al objeto resultado
    result.total = {
        required: totalRequired,
        covered: totalCovered,
        rate: totalRequired === 0 ? 0 : Math.round((totalCovered / totalRequired) * 100)
    }

    return result
})

const progressRate = computed(() => {
    return complianceDetail.value.total ? complianceDetail.value.total.rate : 0
})

const chartCenterValue = computed(() => {
    return complianceDetail.value.total ? complianceDetail.value.total.covered : 0
})

const chartCenterTotal = computed(() => {
    return complianceDetail.value.total ? complianceDetail.value.total.required : 0
})

// Methods
const loadData = async () => {
    loading.value = true
    try {
        // Cargar según tab
        docs.value = await fiscalService.getFiscalDocs({ trashed: currentTab.value === 'trash' })
        
        // Stats siempre globales
        const newStats = await fiscalService.getStats()
        Object.assign(stats, newStats)
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

// Watch tab change - recargar datos si cambia hacia/desde papelera
watch(currentTab, (newTab, oldTab) => {
    statusFilter.value = 'ALL' // Reset filtro de estado al cambiar tab
    
    // Si cambiamos hacia o desde la pestaña de papelera, recargar datos
    // porque requiere filtrado diferente en el servidor (deleted_at)
    if (newTab === 'trash' || oldTab === 'trash') {
        loadData()
        return
    }
    // Para otros tabs, no es necesario recargar de la BD
})

const updateChart = () => {
    if (!chartCanvas.value) return
    if (chartInstance) chartInstance.destroy()
    
    // Calcular desglose de estatus para la gráfica
    let cVigente = 0
    let cTramite = 0
    let cVencido = 0
    let cPendiente = 0

    // Iterar todas las categorías para contar documentos requeridos
    const cats = ['LEGAL', 'MUNICIPAL', 'SENIAT', 'NOMINA']
    cats.forEach(cat => {
        const types = FISCAL_TYPES[cat] || []
        const requiredTypes = types.filter(t => t.required)
        
        requiredTypes.forEach(type => {
            // Buscar documentos coincidentes
            const matchingDocs = docs.value.filter(d => {
                if (d.category !== cat) return false
                const isTypeMatch = d.doc_type === type.id
                let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) isNameMatch = false
                return isTypeMatch || isNameMatch
            })

            // Prioridad: 1. Vigente, 2. Trámite, 3. Vencido, 4. Pendiente
            const validDoc = matchingDocs.find(d => {
                const s = getEffectiveStatus(d)
                return s === 'VIGENTE' || s === 'TRAMITE'
            })
            
            if (validDoc) {
                const s = getEffectiveStatus(validDoc)
                if (s === 'VIGENTE') cVigente++
                else if (s === 'TRAMITE') cTramite++
            } else {
                const expiredDoc = matchingDocs.find(d => getEffectiveStatus(d) === 'VENCIDO')
                if (expiredDoc) {
                    cVencido++
                } else {
                    cPendiente++
                }
            }
        })
    })

    // Configurar gráfica
    chartInstance = new Chart(chartCanvas.value, {
        type: 'doughnut',
        data: {
             labels: ['Vigentes', 'En Trámite', 'Vencidos', 'Pendientes'],
             datasets: [{
                 data: [cVigente, cTramite, cVencido, cPendiente],
                 backgroundColor: ['#4CAF50', '#FFC107', '#F44336', '#E0E0E0'],
                 hoverBackgroundColor: ['#66BB6A', '#FFD54F', '#EF5350', '#BDBDBD'],
                 borderWidth: 0,
                 hoverOffset: 4
             }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { 
                    display: false
                },
                tooltip: { 
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    })
}

const openDialog = (item = null) => {
    editingItem.value = item
    dialogOpen.value = true
}

// Abrir diálogo pre-rellenado para un documento pendiente
const openDialogForPending = (pending) => {
    editingItem.value = {
        category: pending.category,
        doc_type: pending.id,
        name: pending.label,
        status: 'VIGENTE'
    }
    dialogOpen.value = true
}

const openPreview = (doc) => {
    previewItem.value = doc
    previewDialog.value = true
}

const isFilePDF = (url) => {
    if (!url) return false
    return url.toLowerCase().includes('.pdf')
}

const getExpirationIconColor = (dateStr) => {
    if (!dateStr) return 'grey'
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'error'
    if (days <= 30) return 'warning'
    return 'success'
}

const handleSave = async (formData) => {
    saving.value = true
    try {
        const file = formData.file
        const docData = { ...formData }
        delete docData.file
        
        const res = await fiscalService.saveFiscalDoc(docData, file)
        
        if (res.success) {
            dialogOpen.value = false
            await loadData()
        } else {
            // Mostrar error al usuario
            console.error('❌ Error al guardar documento fiscal:', res.message)
            snackbar.value = {
                show: true,
                message: `Error al guardar: ${res.message}`,
                color: 'error'
            }
        }
    } catch (e) {
        console.error('❌ Error inesperado al guardar:', e)
        snackbar.value = {
            show: true,
            message: 'Error inesperado al guardar el documento',
            color: 'error'
        }
    } finally {
        saving.value = false
    }
}

const confirmDelete = (item) => {
    itemToDelete.value = item
    deleteDialog.value = true
}

const executeDelete = async () => {
    if (!itemToDelete.value) return
    deleting.value = true
    try {
        if (currentTab.value === 'trash') {
            // Hard Delete
            await fiscalService.hardDeleteFiscalDoc(itemToDelete.value.id)
        } else {
            // Soft Delete
            await fiscalService.deleteFiscalDoc(itemToDelete.value.id)
        }
        deleteDialog.value = false
        await loadData()
    } catch (e) {
        console.error(e)
    } finally {
        deleting.value = false
        itemToDelete.value = null
    }
}

const restoreDoc = async (item) => {
    restoring.value = true
    try {
        await fiscalService.restoreFiscalDoc(item.id)
        await loadData()
    } catch (e) {
        console.error(e)
    } finally {
        restoring.value = false
    }
}

// Helpers

/**
 * Calcula el estado efectivo del documento basado en la fecha de vencimiento
 * Si la fecha de vencimiento ya pasó y el estado no es TRAMITE, se considera VENCIDO
 */
const getEffectiveStatus = (doc) => {
    if (!doc) return 'VIGENTE'
    
    // Si está en trámite, mantener ese estado
    if (doc.status === 'TRAMITE') return 'TRAMITE'
    
    // Si tiene fecha de vencimiento y ya pasó, es VENCIDO
    if (doc.expiration_date) {
        const expDate = new Date(doc.expiration_date)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Comparar solo fechas, no horas
        
        if (expDate < today) {
            return 'VENCIDO'
        }
    }
    
    // En cualquier otro caso, usar el estado guardado
    return doc.status || 'VIGENTE'
}

const getStatusColor = (status) => {
    const map = { 'VIGENTE': 'success', 'TRAMITE': 'warning', 'VENCIDO': 'error' }
    return map[status] || 'grey'
}

const getCategoryIcon = (cat) => {
    const map = {
        'LEGAL': 'mdi-gavel',
        'MUNICIPAL': 'mdi-city',
        'SENIAT': 'mdi-bank',
        'NOMINA': 'mdi-account-group',
        'OTROS': 'mdi-file'
    }
    return map[cat] || 'mdi-file'
}

const getCategoryChipColor = (cat) => {
    const map = {
        'LEGAL': 'deep-purple',
        'MUNICIPAL': 'blue',
        'SENIAT': 'teal',
        'NOMINA': 'orange',
        'OTROS': 'grey'
    }
    return map[cat] || 'grey'
}

const hasCategory = (cat) => {
    return docs.value.some(d => d.category === cat)
}

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
}

const getDay = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).getDate()
}

const getMonth = (dateStr) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleString('es-ES', { month: 'short' })
}

const getExpirationClass = (dateStr) => {
    if (!dateStr) return ''
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'text-error font-weight-bold'
    if (days < 30) return 'text-warning font-weight-bold'
    return 'text-grey'
}

const getCategoryVariant = (cat) => {
    if (!complianceDetail.value[cat]) return 'outlined'
    return complianceDetail.value[cat].rate === 100 ? 'tonal' : 'outlined'
}

const getCategoryColor = (cat) => {
    if (!complianceDetail.value[cat]) return 'grey'
    const rate = complianceDetail.value[cat].rate
    if (rate === 100) return 'success'
    if (rate > 0) return 'warning'
    return 'grey'
}

const getCategoryIconStatus = (cat) => {
    if (!complianceDetail.value[cat]) return 'mdi-circle-outline'
    const rate = complianceDetail.value[cat].rate
    if (rate === 100) return 'mdi-check-all'
    if (rate > 0) return 'mdi-chart-arc'
    return 'mdi-circle-outline'
}

// PDF Export
const exportToPDF = async () => {
    exporting.value = true
    
    try {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 15
        let y = 20
        
        // Header
        const currentUser = await userService.getCurrentUser()
        const clientName = currentUser.client?.company_name || currentUser.organization?.name || currentUser.firstName + ' ' + currentUser.lastName
        const clientRif = currentUser.client?.rif || currentUser.organization?.rif || ''

        // Convert identifier to base64
        const getBase64ImageFromURL = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.setAttribute('crossOrigin', 'anonymous')
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0)
                    const dataURL = canvas.toDataURL('image/png')
                    resolve({ dataURL, width: img.width, height: img.height })
                }
                img.onerror = error => reject(error)
                img.src = url
            })
        }

        try {
            const logoInfo = await getBase64ImageFromURL(systemLogo)
            const pdfHeight = 12 // Reduced from 18
            const ratio = logoInfo.width / logoInfo.height
            const pdfWidth = pdfHeight * ratio
            
            doc.addImage(logoInfo.dataURL, 'PNG', margin, 10, pdfWidth, pdfHeight)
        } catch (e) {
            console.warn('Could not load logo for PDF', e)
        }

        doc.setFontSize(20)
        doc.setTextColor(31, 53, 92) // #1F355C - secondary color
        doc.text('Expediente Fiscal 360', pageWidth / 2, y, { align: 'center' })
        
        y += 8
        doc.setFontSize(12)
        doc.setTextColor(80)
        doc.text(clientName, pageWidth / 2, y, { align: 'center' })

        if (clientRif) {
            y += 6
            doc.setFontSize(10)
            doc.text(`RIF/CI: ${clientRif}`, pageWidth / 2, y, { align: 'center' })
        }
        
        y += 10
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })}`, pageWidth / 2, y, { align: 'center' })
        
        // Progress Summary
        y += 15
        doc.setFontSize(12)
        doc.setTextColor(0)
        doc.text(`Progreso General: ${progressRate.value}%`, margin, y)
        
        // Draw progress bar
        y += 5
        const barWidth = 60
        const barHeight = 5
        doc.setFillColor(230, 230, 230)
        doc.rect(margin, y, barWidth, barHeight, 'F')
        doc.setFillColor(76, 175, 80) // Green
        doc.rect(margin, y, barWidth * (progressRate.value / 100), barHeight, 'F')
        
        y += 15
        
        // Category headers
        const categories = ['LEGAL', 'MUNICIPAL', 'SENIAT', 'NOMINA', 'OTROS']
        const categoryNames = {
            'LEGAL': 'Legal',
            'MUNICIPAL': 'Municipal', 
            'SENIAT': 'SENIAT',
            'NOMINA': 'Nómina y Parafiscales',
            'OTROS': 'Otros'
        }
        
        for (const cat of categories) {
            const catDocs = docs.value.filter(d => d.category === cat)
            
            // 1. Existing docs
            const allItems = [...catDocs]
            
            // 2. Identify missing required docs
            const types = FISCAL_TYPES[cat] || []
            const requiredTypes = types.filter(t => t.required)
            
            for (const type of requiredTypes) {
                // Check if any valid doc matches this type
                const hasValid = catDocs.some(d => {
                     // Match logic mirrors complianceDetail
                     const isTypeMatch = d.doc_type === type.id
                     // Fuzzy match
                     let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                     if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) isNameMatch = false
                     
                     if (!(isTypeMatch || isNameMatch)) return false
                     
                     // Must be non-expired
                     const status = getEffectiveStatus(d)
                     return status === 'VIGENTE' || status === 'TRAMITE'
                })
                
                if (!hasValid) {
                     // Add placeholder for missing doc
                     allItems.push({
                         name: type.label,
                         status: 'NO PRESENTADO',
                         expiration_date: null,
                         isMissing: true
                     })
                }
            }

            // Skip category only if absolutely nothing to show
            if (allItems.length === 0) continue
            
            // Check if we need a new page
            if (y > 260) {
                doc.addPage()
                y = 20
            }
            
            // Category Header
            doc.setFontSize(14)
            doc.setTextColor(168, 28, 34) // #A81C22 - primary color
            doc.text(categoryNames[cat], margin, y)
            
            // Category progress
            const catProgress = complianceDetail.value[cat]
            if (catProgress) {
                doc.setFontSize(10)
                doc.setTextColor(100)
                doc.text(`(${catProgress.covered}/${catProgress.total} - ${catProgress.rate}%)`, margin + 55, y)
            }
            
            y += 8
            
            // Table header
            doc.setFontSize(9)
            doc.setTextColor(80)
            doc.text('Documento', margin, y)
            doc.text('Estado', margin + 80, y)
            doc.text('Vencimiento', margin + 110, y)
            
            y += 2
            doc.setDrawColor(200)
            doc.line(margin, y, pageWidth - margin, y)
            y += 5
            
            // Sort: Existing first, then Missing. Or Alphabetical?
            // Let's sort by name for a clean report.
            allItems.sort((a, b) => a.name.localeCompare(b.name))

            // Documents Loop
            for (const docItem of allItems) {
                if (y > 270) {
                    doc.addPage()
                    y = 20
                }
                
                doc.setFontSize(10)
                doc.setTextColor(0)
                
                // Name (truncate if too long)
                const docName = docItem.name || 'Sin nombre'
                const truncatedName = docName.length > 40 ? docName.substring(0, 37) + '...' : docName
                doc.text(truncatedName, margin, y)
                
                if (docItem.isMissing) {
                    // Missing Item styling
                    doc.setTextColor(244, 67, 54) // Red
                    doc.text('NO PRESENTADO', margin + 80, y)
                    doc.setTextColor(150)
                    doc.text('--', margin + 110, y)
                } else {
                    // Existing Item styling
                    // Status with color
                    const effectiveStatus = getEffectiveStatus(docItem)
                    if (effectiveStatus === 'VIGENTE') {
                        doc.setTextColor(76, 175, 80) // Green
                    } else if (effectiveStatus === 'TRAMITE') {
                        doc.setTextColor(255, 193, 7) // Yellow/Orange
                    } else {
                        doc.setTextColor(244, 67, 54) // Red
                    }
                    doc.text(effectiveStatus, margin + 80, y)
                    
                    // Expiration date
                    doc.setTextColor(100)
                    if (docItem.expiration_date) {
                        const expDate = new Date(docItem.expiration_date)
                        doc.text(expDate.toLocaleDateString('es-ES'), margin + 110, y)
                    } else {
                        doc.text('N/A', margin + 110, y)
                    }
                }
                
                y += 6
            }
            
            y += 8
        }
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(150)
            doc.text(
                `Página ${i} de ${pageCount}`, 
                pageWidth / 2, 
                doc.internal.pageSize.getHeight() - 10, 
                { align: 'center' }
            )
        }
        
        // Save
        const fileName = `Expediente_Fiscal_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(fileName)
        
    } catch (error) {
        console.error('Error al exportar PDF:', error)
    } finally {
        exporting.value = false
    }
}

onMounted(async () => {
    await loadData()
    updateChart()
})

</script>

<style scoped>
.chart-center-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    z-index: 0;
}

.hover-bg:hover {
    background-color: #f5f5f5;
}
</style>
