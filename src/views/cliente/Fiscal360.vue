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
            <h3 class="text-subtitle-1 font-weight-bold text-secondary">Estado General</h3>
            <v-chip size="small" :color="complianceColor" variant="flat" class="font-weight-bold">
              {{ progressRate }}% Cumplimiento
            </v-chip>
          </div>
          <div style="height: 180px; position: relative">
            <canvas ref="chartCanvas"></canvas>
            <div class="chart-center-text">
                <div class="text-h4 font-weight-bold text-secondary">{{ chartCenterValue }}</div>
                <div class="text-caption text-grey">de {{ chartCenterTotal }}</div>
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
                <span class="text-caption font-weight-bold text-primary">
                  {{ progressRate }}% Completado
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
              <div class="d-flex mt-2 gap-2 overflow-x-auto py-2">
                 <v-chip 
                    v-for="cat in categories" 
                    :key="cat"
                    size="small" 
                    :variant="getCategoryVariant(cat)"
                    :color="getCategoryColor(cat)"
                    class="mr-2"
                 >
                    <v-icon start :icon="getCategoryIconStatus(cat)"></v-icon>
                    {{ cat }} 
                    <span v-if="complianceDetail.byCategory[cat]" class="ml-1 font-weight-bold">
                        ({{ complianceDetail.byCategory[cat].percent }}%)
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
        
        <!-- Tabs de navegación por estado -->
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
            
            <v-tab value="VIGENTE" class="text-none font-weight-medium">
              <v-icon start size="24" color="success">mdi-check-circle</v-icon>
              <span class="d-none d-sm-inline">Vigentes</span>
              <v-chip size="small" class="ml-2" color="success" variant="tonal">
                {{ stats.vigente }}
              </v-chip>
            </v-tab>
            
            <v-tab value="TRAMITE" class="text-none font-weight-medium">
              <v-icon start size="24" color="warning">mdi-clock-outline</v-icon>
              <span class="d-none d-sm-inline">En Trámite</span>
              <v-chip size="small" class="ml-2" color="warning" variant="tonal">
                {{ stats.tramite }}
              </v-chip>
            </v-tab>
            
            <v-tab value="VENCIDO" class="text-none font-weight-medium">
              <v-icon start size="24" color="error">mdi-alert-circle</v-icon>
              <span class="d-none d-sm-inline">Vencidos</span>
              <v-chip size="small" class="ml-2" color="error" variant="tonal">
                {{ stats.vencido }}
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

          <!-- Filtros por categoría - Solo para tabs que no son papelera -->
          <v-slide-y-transition>
            <div v-if="currentTab !== 'trash'" class="pa-4 bg-grey-lighten-5">
              <div class="d-flex align-center flex-wrap">
                <span class="text-caption text-grey-darken-1 font-weight-medium mr-4">
                  <v-icon size="small" class="mr-1">mdi-filter-variant</v-icon>
                  Filtrar por categoría:
                </span>
                <v-chip
                  :variant="categoryFilter === 'ALL' ? 'elevated' : 'outlined'"
                  :color="categoryFilter === 'ALL' ? 'primary' : 'grey'"
                  size="small"
                  class="font-weight-medium px-3 mr-2 mb-1"
                  @click="categoryFilter = 'ALL'"
                >
                  Todas
                </v-chip>
                <v-chip
                  v-for="cat in categories"
                  :key="cat"
                  :variant="categoryFilter === cat ? 'elevated' : 'outlined'"
                  :color="categoryFilter === cat ? getCategoryChipColor(cat) : 'grey'"
                  size="small"
                  class="font-weight-medium px-3 mr-2 mb-1"
                  @click="categoryFilter = cat"
                >
                  <v-icon start size="small" :icon="getCategoryIcon(cat)"></v-icon>
                  {{ cat }}
                </v-chip>
              </div>
            </div>
          </v-slide-y-transition>
        </v-card>

        <!-- Document List -->
        <v-card class="rounded-xl border-none" elevation="0" :loading="loading">
          <v-data-iterator
             :items="filteredDocs"
             :items-per-page="-1"
          >
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
                            <v-icon color="secondary" class="mr-3">{{ getCategoryIcon(cat.name) }}</v-icon>
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
                                        <!-- Si tiene fecha de vencimiento, mostrar día/mes -->
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
                                        <!-- Sin vencimiento: mostrar ícono -->
                                        <v-icon
                                            v-else
                                            :icon="getCategoryIcon(doc.category)"
                                            size="32"
                                            color="primary"
                                        />
                                    </div>
                                </template>

                                <v-list-item-title class="font-weight-bold mb-1">
                                    {{ doc.name }}
                                </v-list-item-title>
                                
                                <v-list-item-subtitle>
                                    <v-chip size="x-small" :color="getStatusColor(getEffectiveStatus(doc))" class="mr-2">
                                        {{ getEffectiveStatus(doc) }}
                                    </v-chip>
                                    <span v-if="doc.expiration_date" :class="getExpirationClass(doc.expiration_date)">
                                        Vence: {{ formatDate(doc.expiration_date) }}
                                    </span>
                                </v-list-item-subtitle>

                                <template v-slot:append>
                                    <div class="d-flex align-center">
                                        <!-- Actions for Active Items -->
                                        <template v-if="currentTab !== 'trash'">
                                            <v-btn
                                                icon="mdi-eye"
                                                variant="text"
                                                size="small"
                                                color="info"
                                                @click.stop="openPreview(doc)"
                                                v-tooltip="'Ver detalle'"
                                                class="mr-1"
                                            />
                                            <v-btn
                                                v-if="doc.documents?.file_url"
                                                icon="mdi-download"
                                                variant="text"
                                                size="small"
                                                color="primary"
                                                :href="doc.documents.file_url"
                                                target="_blank"
                                                @click.stop
                                                v-tooltip="'Descargar'"
                                                class="mr-1"
                                            />
                                            <v-btn
                                                icon="mdi-pencil"
                                                variant="text"
                                                size="small"
                                                color="grey"
                                                @click.stop="openDialog(doc)"
                                                v-tooltip="'Editar'"
                                                class="mr-1"
                                            />
                                            <v-btn
                                                icon="mdi-delete"
                                                variant="text"
                                                size="small"
                                                color="error"
                                                @click.stop="confirmDelete(doc)"
                                                v-tooltip="'Mover a Papelera'"
                                            />
                                        </template>

                                        <!-- Actions for Trashed Items -->
                                        <template v-else>
                                            <v-btn
                                                prepend-icon="mdi-refresh"
                                                variant="text"
                                                size="small"
                                                color="success"
                                                @click.stop="restoreDoc(doc)"
                                                :loading="restoring"
                                            >
                                                Restaurar
                                            </v-btn>
                                            <v-btn
                                                icon="mdi-delete-forever"
                                                variant="text"
                                                size="small"
                                                color="error"
                                                @click.stop="confirmDelete(doc)"
                                                v-tooltip="'Eliminar Definitivamente'"
                                            />
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
          
          <div v-if="filteredDocs.length === 0" class="text-center py-10">
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
                        <div class="text-caption text-white" style="opacity: 0.8">{{ previewItem.category }}</div>
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

  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Chart from 'chart.js/auto'
import { jsPDF } from 'jspdf'
import StatsCard from '@/components/common/StatsCard.vue'
import FiscalDocDialog from '@/components/fiscal/FiscalDocDialog.vue'
import fiscalService from '@/services/fiscalService'
import { FISCAL_TYPES } from '@/constants/fiscalDocuments'

// Data
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const restoring = ref(false)
const exporting = ref(false)
const docs = ref([])
const stats = reactive({ total: 0, vigente: 0, tramite: 0, vencido: 0, porVencer: 0, trash: 0 })
const activeFilter = ref('ALL')
const categoryFilter = ref('ALL')
const currentTab = ref('all') // 'all' | 'VIGENTE' | 'TRAMITE' | 'VENCIDO' | 'trash'
const dialogOpen = ref(false)
const deleteDialog = ref(false)
const previewDialog = ref(false)
const editingItem = ref(null)
const itemToDelete = ref(null)
const previewItem = ref(null)
const chartCanvas = ref(null)
let chartInstance = null

const filters = [
    { label: 'Todos', value: 'ALL', count: 0 },
    { label: 'Vigentes', value: 'VIGENTE', count: 0 },
    { label: 'En Trámite', value: 'TRAMITE', count: 0 },
    { label: 'Vencidos', value: 'VENCIDO', count: 0 },
]

const categories = ['LEGAL', 'MUNICIPAL', 'SENIAT', 'NOMINA', 'OTROS']

// Computed
const filteredDocs = computed(() => {
    let filtered = docs.value
    
    // Filtrar por pestaña (estado)
    if (currentTab.value === 'trash') {
        // Papelera se maneja en loadData, pero por seguridad
        return filtered
    } else if (currentTab.value !== 'all') {
        // Filtrar por estado efectivo
        filtered = filtered.filter(d => getEffectiveStatus(d) === currentTab.value)
    }
    
    // Filtrar por categoría
    if (categoryFilter.value !== 'ALL') {
        filtered = filtered.filter(d => d.category === categoryFilter.value)
    }
    
    return filtered
})

const groupedCategories = computed(() => {
    const groups = {}
    filteredDocs.value.forEach(doc => {
        if (!groups[doc.category]) groups[doc.category] = []
        groups[doc.category].push(doc)
    })
    return Object.keys(groups).map(cat => ({
        name: cat,
        docs: groups[cat]
    }))
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
    categories.forEach(cat => {
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
                const isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                return isTypeMatch || isNameMatch
            })
            
            if (matchingDocs.length > 0) {
                // Get the best doc using effective status (considers expiration)
                // VIGENTE = 1.0, TRAMITE = 0.7, VENCIDO = 0.5
                const hasVigente = matchingDocs.some(d => getEffectiveStatus(d) === 'VIGENTE')
                const hasTramite = matchingDocs.some(d => getEffectiveStatus(d) === 'TRAMITE')
                const hasVencido = matchingDocs.some(d => getEffectiveStatus(d) === 'VENCIDO')
                
                if (hasVigente) {
                    catCovered += 1 // Full value
                } else if (hasTramite) {
                    catCovered += 0.7 // In progress
                } else if (hasVencido) {
                    catCovered += 0.5 // Half value for expired
                }
            }
        })

        result[cat] = {
            total: catTotal,
            covered: catCovered,
            percent: catTotal === 0 ? 100 : Math.round((catCovered / catTotal) * 100)
        }
        
        totalRequired += catTotal
        totalCovered += catCovered
    })

    return {
        byCategory: result,
        totalProgress: totalRequired === 0 ? 0 : Math.round((totalCovered / totalRequired) * 100)
    }
})

const progressRate = computed(() => complianceDetail.value.totalProgress)

const chartCenterValue = computed(() => {
    return Object.values(complianceDetail.value.byCategory)
        .reduce((sum, cat) => sum + cat.covered, 0)
})

const chartCenterTotal = computed(() => {
    return Object.values(complianceDetail.value.byCategory)
        .reduce((sum, cat) => sum + cat.total, 0)
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
        
        // Update filter counts
        filters[0].count = stats.total
        filters[1].count = stats.vigente
        filters[2].count = stats.tramite
        filters[3].count = stats.vencido
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

// Watch tab change - solo cambiar filtro, no recargar datos
watch(currentTab, () => {
    categoryFilter.value = 'ALL' // Reset filter on tab change
    // Los datos ya están en docs.value, solo se filtra diferente
    // No es necesario recargar de la BD ni actualizar el chart
})

const updateChart = () => {
    if (!chartCanvas.value) return
    if (chartInstance) chartInstance.destroy()
    
    // Calcular documentos requeridos cubiertos vs pendientes
    const totalRequired = Object.values(complianceDetail.value.byCategory)
        .reduce((sum, cat) => sum + cat.total, 0)
    const totalCovered = Object.values(complianceDetail.value.byCategory)
        .reduce((sum, cat) => sum + cat.covered, 0)
    const pending = totalRequired - totalCovered
    
    chartInstance = new Chart(chartCanvas.value, {
        type: 'doughnut',
        data: {
             labels: ['Completados', 'Pendientes'],
             datasets: [{
                 data: [totalCovered, pending],
                 backgroundColor: ['#4CAF50', '#E0E0E0'],
                 borderWidth: 0,
                 hoverOffset: 4
             }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            }
        }
    })
}

const openDialog = (item = null) => {
    editingItem.value = item
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
        }
    } catch (e) {
        console.error(e)
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
    if (!complianceDetail.value.byCategory[cat]) return 'outlined'
    return complianceDetail.value.byCategory[cat].percent === 100 ? 'tonal' : 'outlined'
}

const getCategoryColor = (cat) => {
    if (!complianceDetail.value.byCategory[cat]) return 'grey'
    const percent = complianceDetail.value.byCategory[cat].percent
    if (percent === 100) return 'success'
    if (percent > 0) return 'warning'
    return 'grey'
}

const getCategoryIconStatus = (cat) => {
    if (!complianceDetail.value.byCategory[cat]) return 'mdi-circle-outline'
    const percent = complianceDetail.value.byCategory[cat].percent
    if (percent === 100) return 'mdi-check-all'
    if (percent > 0) return 'mdi-chart-arc'
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
        doc.setFontSize(20)
        doc.setTextColor(31, 53, 92) // #1F355C - secondary color
        doc.text('Expediente Fiscal 360', pageWidth / 2, y, { align: 'center' })
        
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
            'NOMINA': 'Nómina',
            'OTROS': 'Otros'
        }
        
        for (const cat of categories) {
            const catDocs = docs.value.filter(d => d.category === cat)
            if (catDocs.length === 0) continue
            
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
            const catProgress = complianceDetail.value.byCategory[cat]
            if (catProgress) {
                doc.setFontSize(10)
                doc.setTextColor(100)
                doc.text(`(${catProgress.covered}/${catProgress.total} - ${catProgress.percent}%)`, margin + 30, y)
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
            
            // Documents
            for (const docItem of catDocs) {
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
}

.hover-bg:hover {
    background-color: #f5f5f5;
}
</style>
