<template>
  <v-container fluid class="fill-height align-start pa-4 pa-md-6 bg-background">
    
    <!-- ═══════════════════════════════════════════════ -->
    <!-- SKELETON LOADING                                -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-if="initialLoading">
      <!-- Skeleton Header -->
      <v-row no-gutters class="pb-2">
        <v-col cols="12" md="8">
          <v-skeleton-loader type="heading" width="300" class="mb-2" />
          <v-skeleton-loader type="text" width="400" />
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-start justify-md-end flex-wrap mt-4 mt-md-0">
          <v-skeleton-loader type="button" width="150" class="mr-3" />
          <v-skeleton-loader type="button" width="150" />
        </v-col>
      </v-row>

      <!-- Skeleton Dashboard -->
      <v-row class="mb-6">
        <v-col cols="12" md="4" lg="3">
          <v-skeleton-loader type="card" height="250" class="rounded-xl" />
        </v-col>
        <v-col cols="12" md="8" lg="9">
          <v-row class="fill-height">
            <v-col cols="6" sm="4" v-for="n in 3" :key="'f-sk-card-' + n">
              <v-skeleton-loader type="card" height="120" class="rounded-xl" />
            </v-col>
            <v-col cols="12">
              <v-skeleton-loader type="list-item-two-line" height="110" class="rounded-xl" />
            </v-col>
          </v-row>
        </v-col>
      </v-row>

      <!-- Skeleton Content -->
      <v-row>
        <v-col cols="12">
          <v-skeleton-loader type="table-thead, table-tbody" class="rounded-xl" />
        </v-col>
      </v-row>
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CONTENIDO PRINCIPAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else>
      <!-- HEADER -->
      <v-row no-gutters class="pb-2">
        <v-col cols="12">
          <div class="d-flex align-center flex-wrap" style="gap: 4px">
            <h1 class="text-h4 font-weight-bold text-secondary mb-0">Mis papeles del negocio</h1>
            <AyudaTermino clave="expediente_fiscal" />
          </div>
          <p class="text-body-1 text-grey-darken-2 mt-1 mb-0" style="max-width: 640px">
            Aquí guardas los papeles de tu negocio y te avisamos antes de que se venzan.
          </p>
        </v-col>

        <v-col cols="12" class="d-flex align-center flex-wrap mt-4" style="gap: 8px">
          <v-btn
            color="secondary"
            prepend-icon="mdi-file-pdf-box"
            variant="outlined"
            rounded="lg"
            :block="$vuetify.display.smAndDown"
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
            :block="$vuetify.display.smAndDown"
            @click="openDialog()"
          >
            <span class="d-none d-sm-inline mr-1">Nuevo</span> Documento
          </v-btn>
        </v-col>
      </v-row>

      <!-- PROGRESO: "Tu negocio está al día: X de Y" -->
      <v-card class="rounded-xl pa-4 mb-6 animate-section" style="animation-delay: 0.1s" variant="outlined">
        <div class="d-flex align-center justify-space-between flex-wrap mb-2" style="gap: 8px">
          <div class="d-flex align-center" style="gap: 8px">
            <v-icon :color="progresoColor" icon="mdi-shield-check-outline" />
            <span class="text-subtitle-1 font-weight-bold text-secondary">
              Tu negocio está al día: {{ progresoAlDia.covered }} de {{ progresoAlDia.required }}
            </span>
          </div>
          <span class="text-caption text-grey-darken-1">Los documentos "No aplica" no cuentan aquí.</span>
        </div>
        <v-progress-linear
          :model-value="progresoPorcentaje"
          height="12"
          rounded
          :color="progresoColor"
          bg-color="grey-lighten-3"
        />
      </v-card>

    <!-- CONTENT (LIST) -->
    <v-row class="pb-10">
      <v-col cols="12">

        <!-- VISTA PAPELERA -->
        <template v-if="currentTab === 'trash'">
          <v-btn
            variant="text"
            size="small"
            color="primary"
            prepend-icon="mdi-arrow-left"
            class="text-none mb-4"
            @click="currentTab = 'all'"
          >
            Volver a Mis papeles
          </v-btn>

          <EstadoVacio
            v-if="filteredDocs.length === 0"
            icono="mdi-delete-empty"
            titulo="La papelera está vacía"
          />
          <TarjetaDocumentoFiscal
            v-for="doc in filteredDocs"
            :key="doc.id"
            :doc="doc"
            papelera
            :restaurando="restoring"
            :categoria-titulo="getCategoryTitle(doc.category)"
            @restaurar="restoreDoc"
            @eliminar-definitivo="confirmDelete"
          />
        </template>

        <!-- VISTA PRINCIPAL: agrupada por categoría -->
        <template v-else>
          <!-- Filtros: año fiscal, estado, acceso a papelera -->
          <div class="d-flex align-center flex-wrap mb-6" style="gap: 12px">
            <v-select
              v-model="selectedYear"
              :items="availableYears"
              density="compact"
              variant="outlined"
              hide-details
              class="fiscal-select-year"
              bg-color="white"
              label="Año Fiscal"
              prepend-inner-icon="mdi-calendar"
            />
            <v-select
              v-model="statusFilter"
              :items="statusFilterOptions"
              item-title="text"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              class="fiscal-select-status"
              bg-color="white"
              prepend-inner-icon="mdi-filter-variant"
              label="Estado"
            />
            <v-spacer class="d-none d-sm-block" />
            <v-btn
              variant="text"
              size="small"
              color="grey-darken-1"
              prepend-icon="mdi-delete-outline"
              class="text-none"
              @click="currentTab = 'trash'"
            >
              Papelera
              <v-chip size="x-small" class="ml-1" color="grey" variant="tonal">{{ stats.trash }}</v-chip>
            </v-btn>
          </div>

          <!-- ATIENDE ESTO PRIMERO -->
          <section v-if="urgentes.length > 0" class="mb-8">
            <h2 class="text-h6 font-weight-bold text-error mb-3 d-flex align-center">
              <v-icon start icon="mdi-alert-circle" color="error" />
              Atiende esto primero
            </h2>
            <TarjetaDocumentoFiscal
              v-for="item in urgentes"
              :key="'urgente-' + (item.doc ? item.doc.id : item.pendiente.id + item.categoriaTitulo)"
              :doc="item.doc"
              :pendiente="item.pendiente"
              :categoria-titulo="item.categoriaTitulo"
              @ver="openPreview"
              @editar="openDialog"
              @eliminar="confirmDelete"
              @subir="openDialogForPending"
            />
          </section>

          <!-- CATEGORÍAS: Legal, Municipal, SENIAT, Nómina, Libros Contables, Otros -->
          <section v-for="cat in categories" :key="cat.value" class="mb-8">
            <h2 class="text-h6 font-weight-bold text-secondary mb-3 d-flex align-center">
              <v-icon start :icon="getCategoryIcon(cat.value)" color="secondary" />
              {{ cat.title }}
            </h2>

            <!-- Documentos periódicos (mensual, trimestral, quincenal, semestral, anual) -->
            <FiscalPeriodTracker
              v-for="type in getRecurringTypes(cat.value)"
              :key="type.id"
              :type="type"
              :category="cat.value"
              :documents="getDocsForType(type.id)"
              :year="selectedYear"
              @open-preview="openPreview"
              @open-dialog="handleTrackerDialog"
              @delete-doc="confirmDelete"
            />

            <!-- Documentos únicos / permanentes ya subidos -->
            <TarjetaDocumentoFiscal
              v-for="doc in getNonRecurringDocsForCategory(cat.value)"
              :key="doc.id"
              :doc="doc"
              @ver="openPreview"
              @editar="openDialog"
              @eliminar="confirmDelete"
            />

            <!-- Documentos únicos / permanentes requeridos pero aún sin subir -->
            <TarjetaDocumentoFiscal
              v-for="pending in getPendingDocsForCategory(cat.value)"
              :key="'pendiente-' + pending.id"
              :pendiente="pending"
              @subir="openDialogForPending"
            />
          </section>
        </template>
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
    <v-dialog v-model="previewDialog" max-width="900" scrollable :fullscreen="$vuetify.display.smAndDown">
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

    </template>
  </v-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { jsPDF } from 'jspdf'
import FiscalDocDialog from '@/components/fiscal/FiscalDocDialog.vue'
import FiscalPeriodTracker from '@/components/fiscal/FiscalPeriodTracker.vue'
import TarjetaDocumentoFiscal from '@/components/fiscal/TarjetaDocumentoFiscal.vue'
import AyudaTermino from '@/components/ui/AyudaTermino.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import fiscalService from '@/services/fiscalService'
import userService from '@/services/userService'
import { obtenerUrlFirmada } from '@/services/storageUrlService.js'
import systemLogo from '/ADSystem/logo.png'
import { FISCAL_TYPES, isRecurringFrequency } from '@/constants/fiscalDocuments'
import { semaforoDocumento } from '@/utils/semaforoDocumento'

// Data
const initialLoading = ref(true)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const restoring = ref(false)
const exporting = ref(false)
const docs = ref([])
const stats = reactive({ total: 0, vigente: 0, tramite: 0, vencido: 0, noAplica: 0, porVencer: 0, trash: 0 })
const currentTab = ref('all') // 'all' | 'trash' — la vista principal ahora agrupa todas las categorías en una sola pantalla
const dialogOpen = ref(false)
const deleteDialog = ref(false)
const previewDialog = ref(false)
const editingItem = ref(null)
const itemToDelete = ref(null)
const previewItem = ref(null)
const snackbar = ref({ show: false, message: '', color: 'error' })

// Selector de período
const now = new Date()
const selectedYear = ref(now.getFullYear())
const statusFilter = ref('ALL')

const statusFilterOptions = [
    { text: 'Todos', value: 'ALL' },
    { text: 'Vigentes / Presentados', value: 'VIGENTE' },
    { text: 'En Trámite', value: 'TRAMITE' },
    { text: 'Vencidos', value: 'VENCIDO' },
    { text: 'No Aplica', value: 'NO_APLICA' }
]

// Años disponibles para el selector (desde 2020 hasta el próximo año)
const availableYears = computed(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let y = 2020; y <= current + 1; y++) years.push(y)
    return years.sort((a, b) => b - a) // Orden descendente para acceso rápido a recientes
})

// (Meses eliminados ya que FiscalPeriodTracker maneja los períodos internamente)


// Orden pedido por la contadora: Legal, Municipal, SENIAT, Nómina primero.
const categories = [
    { title: 'Legal', value: 'LEGAL' },
    { title: 'Municipal', value: 'MUNICIPAL' },
    { title: 'Seniat', value: 'SENIAT' },
    { title: 'Parafiscales y nómina', value: 'NOMINA' },
    { title: 'Libros Contables', value: 'LIBROS' },
    { title: 'Otros', value: 'OTROS' }
]

const getCategoryTitle = (catValue) => {
    const cat = categories.find(c => c.value === catValue)
    return cat ? cat.title : catValue
}

// Computed
// Utilities for the new grouping layout
const getRecurringTypes = (cat) => {
    const types = FISCAL_TYPES[cat] || []
    // Incluir: frecuencias recurrentes, ANNUAL, y tipos "flexible" (sin cadencia fija pero con lista libre)
    return types.filter(t => isRecurringFrequency(t.frequency) || t.frequency === 'ANNUAL' || t.flexible)
}

const getNonRecurringTypes = (cat) => {
    const types = FISCAL_TYPES[cat] || []
    return types.filter(t => !isRecurringFrequency(t.frequency) && t.frequency !== 'ANNUAL')
}

const getDocsForType = (typeId) => {
    return docs.value.filter(d => d.doc_type === typeId)
}

// Documentos de una categoría que ya pasaron el filtro de estado global.
// A diferencia de la versión anterior, NO depende de una pestaña activa:
// la pantalla ahora muestra todas las categorías a la vez (una debajo de otra).
const getDocsForCategory = (cat) => {
    let filtered = docs.value.filter(d => d.category === cat)
    if (statusFilter.value !== 'ALL') {
        filtered = filtered.filter(d => {
            const st = getEffectiveStatus(d)
            if (statusFilter.value === 'VIGENTE') return st === 'VIGENTE' || st === 'PRESENTADO'
            return st === statusFilter.value
        })
    }
    return filtered
}

const getNonRecurringDocsForCategory = (cat) => {
    const nrTypes = getNonRecurringTypes(cat).map(t => t.id)
    return getDocsForCategory(cat).filter(d => {
        if (!d.doc_type) return true // Ad-hoc sin tipo estricto
        return nrTypes.includes(d.doc_type)
    })
}

// Documentos permanentes/únicos requeridos pero aún sin subir (los recurrentes
// pendientes los maneja FiscalPeriodTracker con su propia lógica de "Falta").
const getPendingDocsForCategory = (cat) => {
    if (statusFilter.value !== 'ALL') return []

    const pending = []
    const nrTypes = getNonRecurringTypes(cat)

    nrTypes.forEach(type => {
        if (!type.required) return
        const exists = docs.value.some(d => {
            if (d.category !== cat) return false
            if (d.doc_type === type.id) return true
            // Fallback fuzzy match only if doc_type is missing
            let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
            // Evitar falso positivo: "RIF de Socios" contiene "RIF"
            if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) {
                isNameMatch = false
            }
            return isNameMatch
        })

        if (!exists) {
            pending.push({ ...type, category: cat, isPending: true })
        }
    })

    return pending
}

// Documentos que necesitan atención ahora: rojo/naranja por fecha, o
// requeridos y nunca subidos. Se muestran primero (fuera del orden por
// categoría) en la sección "Atiende esto primero".
const urgentes = computed(() => {
    if (currentTab.value === 'trash') return []
    const items = []

    categories.forEach(catObj => {
        const cat = catObj.value

        getNonRecurringDocsForCategory(cat).forEach(doc => {
            if (doc.status === 'NO_APLICA' || doc.status === 'TRAMITE') return
            const s = semaforoDocumento(doc.emission_date, doc.expiration_date)
            if (s.color === 'error' || s.color === 'warning') {
                items.push({ doc, categoriaTitulo: catObj.title })
            }
        })

        getPendingDocsForCategory(cat).forEach(pending => {
            items.push({ pendiente: pending, categoriaTitulo: catObj.title })
        })
    })

    return items
})

// Filtro de documentos para la vista de PAPELERA (la vista principal ya no
// usa una lista plana: se agrupa por categoría con getDocsForCategory).
const filteredDocs = computed(() => docs.value)

// Progreso "Tu negocio está al día: X de Y" — a diferencia de
// complianceDetail (usado en el PDF), los documentos NO_APLICA no cuentan
// ni en el numerador ni en el denominador, y solo lo "vigente" (no "en
// trámite") cuenta como al día.
const progresoAlDia = computed(() => {
    let required = 0
    let covered = 0

    categories.forEach(catObj => {
        const cat = catObj.value
        if (cat === 'OTROS') return
        const types = FISCAL_TYPES[cat] || []

        types.filter(t => t.required).forEach(type => {
            const matchingDocs = docs.value.filter(d => {
                if (d.category !== cat) return false
                const isTypeMatch = d.doc_type === type.id
                let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) {
                    isNameMatch = false
                }
                return isTypeMatch || isNameMatch
            })

            // Los NO_APLICA no cuentan ni como requeridos ni como cubiertos.
            if (matchingDocs.some(d => d.status === 'NO_APLICA')) return

            required++
            const vigente = matchingDocs.some(d => {
                const status = getEffectiveStatus(d)
                return status === 'VIGENTE' || status === 'PRESENTADO'
            })
            if (vigente) covered++
        })
    })

    return { required, covered }
})

const progresoPorcentaje = computed(() => {
    if (progresoAlDia.value.required === 0) return 100
    return Math.round((progresoAlDia.value.covered / progresoAlDia.value.required) * 100)
})

const progresoColor = computed(() => {
    if (progresoPorcentaje.value >= 80) return 'success'
    if (progresoPorcentaje.value >= 50) return 'warning'
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

            // Check if any matching doc is valid (NO_APLICA = cuenta como cubierto)
            const hasNoAplica = matchingDocs.some(d => d.status === 'NO_APLICA')
            const hasValidDoc = matchingDocs.some(d => {
                const status = getEffectiveStatus(d)
                return status === 'VIGENTE' || status === 'PRESENTADO' || status === 'TRAMITE' || status === 'NO_APLICA'
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

// Methods
const loadData = async () => {
    loading.value = true
    try {
        // Cargar según tab
        const rawDocs = await fiscalService.getFiscalDocs({ trashed: currentTab.value === 'trash' })

        // Resolver file_url (ruta o URL pública/firmada antigua) a una URL firmada
        // lista para mostrar/descargar/previsualizar, ya que el bucket 'documents'
        // pasará a ser privado.
        docs.value = await Promise.all(rawDocs.map(async (doc) => {
            if (doc?.documents?.file_url) {
                const signedUrl = await obtenerUrlFirmada('documents', doc.documents.file_url)
                if (signedUrl) {
                    doc.documents = { ...doc.documents, file_url: signedUrl }
                }
            }
            return doc
        }))

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

const openDialog = (item = null) => {
    editingItem.value = item
    dialogOpen.value = true
}

// Abrir diálogo pre-rellenado para un documento pendiente general
const openDialogForPending = (pending) => {
    editingItem.value = {
        category: pending.category,
        doc_type: pending.id,
        name: pending.label,
        status: 'VIGENTE'
    }
    dialogOpen.value = true
}

// Abrir diálogo pre-rellenado para un período específico (desde el Tracker)
const openDialogForPeriod = ({ typeId, category, periodInfo }) => {
    // Calculamos una fecha de emisión aproximada para que el form se auto-llene con el mes/año correcto.
    const month = periodInfo.monthIndex !== undefined ? periodInfo.monthIndex : (periodInfo.quarterIndex !== undefined ? periodInfo.quarterIndex * 3 : 0)
    
    // Usar fecha local (YYYY-MM-DD) para evitar desfase UTC
    const d = new Date(selectedYear.value, month, 1)
    const emissionDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

    editingItem.value = {
        category,
        doc_type: typeId,
        name: periodInfo.label,
        status: 'VIGENTE',
        emission_date: emissionDateStr
    }
    dialogOpen.value = true
}

/**
 * Handler unificado para el evento @open-dialog del FiscalPeriodTracker.
 * - Modo flexible (sin periodInfo): abre el dialog sin fecha pre-llenada,
 *   solo con la categoría y tipo para que el usuario complete libremente.
 * - Modo normal (con periodInfo): delega a openDialogForPeriod que
 *   pre-llena la fecha de emisión según el período calculado.
 */
const handleTrackerDialog = ({ typeId, category, periodInfo }) => {
    if (!periodInfo) {
        // Modo flexible: el usuario define el período manualmente
        editingItem.value = {
            category,
            doc_type: typeId,
            status: 'VIGENTE'
        }
        dialogOpen.value = true
    } else {
        openDialogForPeriod({ typeId, category, periodInfo })
    }
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

const getEffectiveStatus = (docItem) => {
    if (docItem.status === 'NO_APLICA') return 'NO_APLICA'
    if (docItem.status === 'TRAMITE') return 'TRAMITE'
    
    // Buscar si es recurrente
    let isRecurring = false
    if (docItem.category && docItem.doc_type) {
        const types = FISCAL_TYPES[docItem.category] || []
        const typeInfo = types.find(t => t.id === docItem.doc_type)
        if (typeInfo && isRecurringFrequency(typeInfo.frequency)) {
            isRecurring = true
        }
    }
    
    if (isRecurring) {
        return 'PRESENTADO'
    }

    if (docItem.status === 'VENCIDO') return 'VENCIDO'
    
    // Si tiene expiration_date, validar (solo aplica para documentos NO recurrentes)
    if (docItem.expiration_date) {
        const expDate = new Date(docItem.expiration_date)
        if (expDate < new Date()) {
            return 'VENCIDO'
        }
    }
    
    return docItem.status || 'VIGENTE'
}

const getStatusColor = (status) => {
    const map = { 'VIGENTE': 'success', 'PRESENTADO': 'success', 'TRAMITE': 'warning', 'VENCIDO': 'error', 'NO_APLICA': 'grey' }
    return map[status] || 'grey'
}

const getCategoryIcon = (cat) => {
    const map = {
        'LEGAL': 'mdi-gavel',
        'MUNICIPAL': 'mdi-city',
        'SENIAT': 'mdi-bank',
        'NOMINA': 'mdi-account-group',
        'LIBROS': 'mdi-book-open-page-variant',
        'OTROS': 'mdi-file'
    }
    return map[cat] || 'mdi-file'
}

const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString()
}

const getExpirationClass = (dateStr) => {
    if (!dateStr) return ''
    const days = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'text-error font-weight-bold'
    if (days < 30) return 'text-warning font-weight-bold'
    return 'text-grey'
}

// ─────────────────────────────────────────────────────────────────
// PDF Export — Helpers (S.O.L.I.D.: cada función tiene una sola tarea)
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula los períodos para un tipo de documento dado,
 * equivalente a la lógica de FiscalPeriodTracker pero para el PDF.
 * Retorna array de { label, doc, isFuture, statusLabel }
 */
const getPeriodRowsForPdf = (type, catDocs, year) => {
    const now          = new Date()
    const currentYear  = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentDay   = now.getDate()
    const freq         = type.frequency

    const docsOfType = catDocs.filter(d => d.doc_type === type.id)

    const bestDoc = (candidates) =>
        candidates.find(d => d.status !== 'VENCIDO') || candidates[0] || null

    const buildRow = (label, doc, isFuture) => {
        let statusLabel
        if (doc) {
            const s = doc.status
            if (s === 'TRAMITE')     statusLabel = 'EN TRÁMITE'
            else if (s === 'NO_APLICA') statusLabel = 'NO APLICA'
            // VIGENTE, PRESENTADO o VENCIDO → fue presentado
            // (mismo criterio que la UI: el hecho de existir el doc = presentado)
            else                     statusLabel = 'PRESENTADO'
        } else {
            statusLabel = isFuture ? '—' : 'NO PRESENTADO'
        }
        return { label, doc, isFuture, statusLabel }
    }

    if (freq === 'MONTHLY') {
        const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        return Array.from({ length: 12 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && dt.getMonth() === i
            })
            // El mes actual no ha terminado → tratar como pendiente (mismo criterio que la UI)
            const isFuture = year > currentYear || (year === currentYear && i >= currentMonth)
            return buildRow(`${names[i]} ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'QUINCENAL') {
        const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        const rows = []
        for (let m = 0; m < 12; m++) {
            for (let q = 1; q <= 2; q++) {
                const cands = docsOfType.filter(d => {
                    const dt = new Date(d.emission_date + 'T00:00:00')
                    if (dt.getFullYear() !== year || dt.getMonth() !== m) return false
                    return q === 1 ? dt.getDate() <= 15 : dt.getDate() > 15
                })
                const curQ = currentDay <= 15 ? 1 : 2
                // La quincena actual aún no ha terminado → pendiente
                const isPast = year < currentYear ||
                    (year === currentYear && m < currentMonth) ||
                    (year === currentYear && m === currentMonth && q < curQ)
                const isFuture = !isPast
                rows.push(buildRow(`${q}ª Quincena ${names[m]} ${year}`, bestDoc(cands), isFuture))
            }
        }
        return rows
    }

    if (freq === 'QUARTERLY') {
        const labels = ['1er Trimestre','2do Trimestre','3er Trimestre','4to Trimestre']
        return Array.from({ length: 4 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && Math.floor(dt.getMonth() / 3) === i
            })
            const curQ     = Math.floor(currentMonth / 3)
            // El trimestre actual no ha terminado → pendiente
            const isFuture = year > currentYear || (year === currentYear && i >= curQ)
            return buildRow(`${labels[i]} ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'SEMESTRAL') {
        return Array.from({ length: 2 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && Math.floor(dt.getMonth() / 6) === i
            })
            const curSem   = Math.floor(currentMonth / 6)
            const isFuture = year > currentYear || (year === currentYear && i > curSem)
            return buildRow(`${i === 0 ? '1er' : '2do'} Semestre ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'ANNUAL') {
        const cands    = docsOfType.filter(d =>
            new Date(d.emission_date + 'T00:00:00').getFullYear() === year)
        // El año actual no ha terminado → pendiente (misma lógica que la UI)
        const isFuture = year >= currentYear
        return [buildRow(`Año ${year}`, bestDoc(cands), isFuture)]
    }

    // Permanentes / Ad-hoc: listar todos los docs existentes de este tipo
    if (docsOfType.length === 0) return []
    return docsOfType.map(d => buildRow(d.name || type.label, d, false))
}

/** Dibuja el header de categoría. Retorna la nueva posición Y. */
const pdfDrawCategoryHeader = (doc, pageWidth, margin, catName, progress, y) => {
    // Fondo con borde redondeado para el header de categoría
    const headerHeight = 10
    doc.setFillColor(31, 53, 92) // #1F355C azul corporativo
    doc.roundedRect(margin, y - 6, pageWidth - margin * 2, headerHeight, 3, 3, 'F')

    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255) // Texto blanco sobre fondo azul
    doc.text(catName, margin + 5, y)

    if (progress) {
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(224, 176, 79) // #E0B04F dorado corporativo
        const progressText = `${progress.covered}/${progress.total} — ${progress.rate}%`
        doc.text(progressText, pageWidth - margin - 5, y, { align: 'right' })
    }

    return y + 8
}

/** Dibuja el sub-header de tipo de documento. Retorna la nueva posición Y. */
const pdfDrawTypeHeader = (doc, margin, label, freqLabel, y) => {
    // Línea decorativa a la izquierda
    doc.setFillColor(168, 28, 34) // #A81C22 rojo corporativo
    doc.rect(margin + 4, y - 4, 2, 5, 'F')

    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(31, 53, 92) // #1F355C
    doc.text(`  ${label}`, margin + 8, y)

    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(140)
    doc.text(`(${freqLabel})`, margin + 75, y)

    return y + 2
}

/** Dibuja una fila de período. Retorna la nueva posición Y. */
const pdfDrawPeriodRow = (doc, margin, pageWidth, label, statusLabel, isFuture, y, isAlternate = false) => {
    const colStatus = pageWidth - margin - 45
    const rowHeight = 5

    // Fondo alternado sutil
    if (isAlternate) {
        doc.setFillColor(245, 245, 250) // Gris muy claro
        doc.rect(margin + 6, y - 4, pageWidth - margin * 2 - 6, rowHeight, 'F')
    }

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')

    // Label (sangría para indicar jerarquía)
    doc.setTextColor(40)
    const truncated = label.length > 38 ? label.substring(0, 35) + '…' : label
    doc.text(`    · ${truncated}`, margin, y)

    // Estado con color y fondo tipo badge
    let badgeR, badgeG, badgeB
    let textR, textG, textB

    if (isFuture) {
        badgeR = 230; badgeG = 230; badgeB = 230
        textR = 150; textG = 150; textB = 150
    } else if (statusLabel === 'PRESENTADO') {
        badgeR = 232; badgeG = 245; badgeB = 233 // Verde claro
        textR = 46; textG = 125; textB = 50
    } else if (statusLabel === 'EN TRAMITE' || statusLabel === 'EN TRÁMITE') {
        badgeR = 255; badgeG = 243; badgeB = 224 // Naranja claro
        textR = 230; textG = 120; textB = 0
    } else if (statusLabel === 'NO APLICA') {
        badgeR = 238; badgeG = 238; badgeB = 238 // Gris claro
        textR = 120; textG = 120; textB = 120
    } else {
        badgeR = 255; badgeG = 228; badgeB = 228 // Rojo claro
        textR = 198; textG = 40; textB = 40
    }

    // Dibujar badge redondeado detrás del texto de estado
    const statusWidth = doc.getTextWidth(statusLabel) + 6
    doc.setFillColor(badgeR, badgeG, badgeB)
    doc.roundedRect(colStatus - 2, y - 3.5, statusWidth, 5, 1.5, 1.5, 'F')

    doc.setTextColor(textR, textG, textB)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(7.5)
    doc.text(statusLabel, colStatus + 1, y)

    return y + 6
}

/** Verifica si falta espacio y agrega nueva página si es necesario. */
const pdfCheckPage = (doc, y, threshold = 265) => {
    if (y > threshold) {
        doc.addPage()
        return 20
    }
    return y
}

// ─────────────────────────────────────────────────────────────────
// PDF Export — Función principal
// ─────────────────────────────────────────────────────────────────
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

        // ── Franja superior decorativa ──
        doc.setFillColor(31, 53, 92) // #1F355C
        doc.rect(0, 0, pageWidth, 4, 'F')
        doc.setFillColor(168, 28, 34) // #A81C22
        doc.rect(0, 4, pageWidth, 2, 'F')

        // ── Logo centrado ──
        try {
            const logoInfo = await getBase64ImageFromURL(systemLogo)
            const pdfHeight = 9 // Logo pequeño
            const ratio = logoInfo.width / logoInfo.height
            const pdfWidth = pdfHeight * ratio
            
            doc.addImage(logoInfo.dataURL, 'PNG', (pageWidth - pdfWidth) / 2, 10, pdfWidth, pdfHeight)
        } catch (e) {
            console.warn('Could not load logo for PDF', e)
        }

        // Título centrado debajo del logo
        y = 26
        doc.setFontSize(16)
        doc.setTextColor(31, 53, 92) // #1F355C
        doc.setFont(undefined, 'bold')
        doc.text('Expediente Fiscal 360', pageWidth / 2, y, { align: 'center' })
        
        // ── Información de la empresa ──
        y += 8
        doc.setFontSize(12)
        doc.setTextColor(80)
        doc.setFont(undefined, 'normal')
        doc.text(clientName, pageWidth / 2, y, { align: 'center' })

        if (clientRif) {
            y += 6
            doc.setFontSize(10)
            doc.text(`RIF/CI: ${clientRif}`, pageWidth / 2, y, { align: 'center' })
        }
        
        y += 8
        doc.setFontSize(9)
        doc.setTextColor(140)
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })}`, pageWidth / 2, y, { align: 'center' })
        
        // ── Línea divisoria elegante ──
        y += 6
        doc.setDrawColor(224, 176, 79) // #E0B04F dorado
        doc.setLineWidth(0.8)
        doc.line(margin, y, pageWidth - margin, y)
        doc.setLineWidth(0.2)
        
        // ── Progress Summary ──
        y += 10
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(31, 53, 92) // #1F355C
        doc.text(`Progreso General: ${progressRate.value}%`, margin, y)
        
        // Barra de progreso con bordes redondeados
        y += 5
        const barWidth = 80
        const barHeight = 6
        // Fondo gris de la barra
        doc.setFillColor(230, 230, 230)
        doc.roundedRect(margin, y, barWidth, barHeight, 3, 3, 'F')
        // Progreso con gradiente simulado
        const progressWidth = barWidth * (progressRate.value / 100)
        if (progressWidth > 0) {
            doc.setFillColor(168, 28, 34) // #A81C22 rojo corporativo
            doc.roundedRect(margin, y, Math.max(progressWidth, 6), barHeight, 3, 3, 'F')
        }
        
        y += 14

        // ── Leyenda de estado con badges ──
        doc.setFontSize(7.5)
        doc.setFont(undefined, 'bold')
        const legendItems = [
            { label: 'PRESENTADO / VIGENTE', bgR: 232, bgG: 245, bgB: 233, r: 46,  g: 125, b: 50  },
            { label: 'EN TRAMITE',           bgR: 255, bgG: 243, bgB: 224, r: 230, g: 120, b: 0   },
            { label: 'NO PRESENTADO',        bgR: 255, bgG: 228, bgB: 228, r: 198, g: 40,  b: 40  },
            { label: 'NO APLICA',            bgR: 238, bgG: 238, bgB: 238, r: 120, g: 120, b: 120 },
        ]
        let lx = margin
        for (const l of legendItems) {
            const textWidth = doc.getTextWidth(l.label) + 8
            // Badge de fondo
            doc.setFillColor(l.bgR, l.bgG, l.bgB)
            doc.roundedRect(lx, y - 3.5, textWidth, 5, 1.5, 1.5, 'F')
            // Texto
            doc.setTextColor(l.r, l.g, l.b)
            doc.text(l.label, lx + 4, y)
            lx += textWidth + 4
        }
        y += 10

        // ── Línea divisoria ──
        doc.setDrawColor(200)
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageWidth - margin, y)
        y += 8

        // ─────────────────────────────────────────────────────────────────
        // Loop principal: Categoría → Tipo → Períodos
        // ─────────────────────────────────────────────────────────────────
        const PDF_CAT_NAMES = {
            LEGAL:     'Legal',
            LIBROS:    'Libros Contables',
            MUNICIPAL: 'Municipal',
            SENIAT:    'SENIAT',
            NOMINA:    'Nómina y Parafiscales',
            OTROS:     'Otros'
        }
        const FREQ_LABELS = {
            PERMANENT: 'Permanente', VIGENTE: 'Vigente (variable)',
            ANNUAL: 'Anual', SEMESTRAL: 'Semestral',
            QUARTERLY: 'Trimestral', MONTHLY: 'Mensual',
            QUINCENAL: 'Quincenal', AdHoc: 'Eventual'
        }

        const pdfYear = selectedYear.value

        for (const cat of ['LEGAL', 'LIBROS', 'MUNICIPAL', 'SENIAT', 'NOMINA', 'OTROS']) {
            const catDocs  = docs.value.filter(d => d.category === cat)
            const catTypes = FISCAL_TYPES[cat] || []
            if (catTypes.length === 0 && catDocs.length === 0) continue

            // Solo omitir categorías sin tipos definidos o OTROS sin documentos
            if (cat === 'OTROS' && catDocs.length === 0) continue

            // ── Header de categoría ──────────────────────────────────────
            // Reservar espacio: al menos 25px para el header + primera línea
            y = pdfCheckPage(doc, y, 250)
            y = pdfDrawCategoryHeader(
                doc, pageWidth, margin,
                PDF_CAT_NAMES[cat],
                complianceDetail.value[cat],
                y
            )
            y += 3

            // ── Por cada tipo de documento de esta categoría ──────────────
            let rowIndex = 0
            for (const type of catTypes) {
                const rows       = getPeriodRowsForPdf(type, catDocs, pdfYear)
                const docsOfType = catDocs.filter(d => d.doc_type === type.id)

                // Filas con documento real (cargado)
                const uploadedRows  = rows.filter(r => r.doc)

                // Solo omitir el tipo genérico 'Otro Documento' si no tiene docs
                if (type.id === 'OTRO' && uploadedRows.length === 0) continue

                // Reservar espacio: header del tipo + al menos 1 fila
                y = pdfCheckPage(doc, y, 255)
                y = pdfDrawTypeHeader(
                    doc, margin,
                    type.label,
                    FREQ_LABELS[type.frequency] || type.frequency,
                    y
                )
                y += 5

                // ── Caso 1: Tipo FLEXIBLE — lista solo los docs existentes ─
                if (type.flexible) {
                    const flexRows = catDocs
                        .filter(d => d.doc_type === type.id)
                        .sort((a, b) => new Date(b.emission_date || 0) - new Date(a.emission_date || 0))

                    if (flexRows.length === 0) {
                        // No hay nada cargado → una línea informativa neutra
                        y = pdfCheckPage(doc, y)
                        y = pdfDrawPeriodRow(doc, margin, pageWidth, 'Sin documentos cargados', 'NO PRESENTADO', false, y, rowIndex % 2 === 1)
                        rowIndex++
                    } else {
                        for (const d of flexRows) {
                            const lbl = d.name || (d.emission_date
                                ? new Date(d.emission_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'Sin fecha')
                            const sMap = { VIGENTE: 'PRESENTADO', PRESENTADO: 'PRESENTADO', TRAMITE: 'EN TRAMITE', NO_APLICA: 'NO APLICA' }
                            const statusLabel = sMap[d.status] || 'VENCIDO'
                            y = pdfCheckPage(doc, y)
                            y = pdfDrawPeriodRow(doc, margin, pageWidth, lbl, statusLabel, false, y, rowIndex % 2 === 1)
                            rowIndex++
                        }
                    }
                }
                // ── Caso 2: Sin ningún documento cargado ────────────────────
                else if (uploadedRows.length === 0) {
                    // Una sola línea neutra — sin contar ni mencionar periodos faltantes
                    y = pdfCheckPage(doc, y)
                    y = pdfDrawPeriodRow(doc, margin, pageWidth, 'Sin registro cargado', 'NO PRESENTADO', false, y, rowIndex % 2 === 1)
                    rowIndex++
                }
                // ── Caso 3: Hay documentos cargados — mostrar cada uno ──────
                else {
                    for (const row of uploadedRows) {
                        y = pdfCheckPage(doc, y)
                        y = pdfDrawPeriodRow(doc, margin, pageWidth, row.label, row.statusLabel, false, y, rowIndex % 2 === 1)
                        rowIndex++
                    }
                }

                y += 4 // Espacio entre tipos
            }

            y += 8 // Espacio entre categorías
        }
        
        // Footer con línea decorativa
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            const pageH = doc.internal.pageSize.getHeight()
            
            // Línea dorada en el footer
            doc.setDrawColor(224, 176, 79) // #E0B04F
            doc.setLineWidth(0.5)
            doc.line(margin, pageH - 15, pageWidth - margin, pageH - 15)
            
            // Texto de página
            doc.setFontSize(8)
            doc.setFont(undefined, 'normal')
            doc.setTextColor(150)
            doc.text(
                `Página ${i} de ${pageCount}`, 
                pageWidth / 2, 
                pageH - 10, 
                { align: 'center' }
            )

            // Marca de agua sutil: "AD System"
            doc.setTextColor(230)
            doc.setFontSize(7)
            doc.text('AD System', pageWidth - margin, pageH - 10, { align: 'right' })
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
    initialLoading.value = false
})

</script>

<style scoped>
/* Selectores de período — Responsive */
.fiscal-select-year {
    width: 130px;
    flex-shrink: 0;
}

.fiscal-select-status {
    max-width: 180px;
    flex-shrink: 0;
}

/* En móvil XS: selectores toman ancho completo */
@media (max-width: 599px) {
    .fiscal-select-year,
    .fiscal-select-status {
        width: 100% !important;
        max-width: 100% !important;
        flex: 1 1 100%;
    }
}
</style>
