<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700px"
    persistent
  >
    <v-card class="fiscal-doc-dialog">
      <v-card-title class="bg-primary text-white d-flex align-center py-3">
        <v-icon start icon="mdi-file-document-outline" class="mr-2" />
        <span class="text-h6 font-weight-bold">
          {{ isEditing ? 'Editar Documento' : 'Nuevo Documento Fiscal' }}
        </span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" color="white" @click="close" />
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="valid" @submit.prevent>
          <v-row>
            <!-- Zona de Carga de Archivo (PRIMERO) -->
            <v-col cols="12">
              <label class="text-subtitle-2 font-weight-bold mb-2 d-block">
                1. Subir Documento (PDF o Imagen)
              </label>
              
              <FiscalFileUpload
                @file-selected="handleFileSelect"
                @file-removed="handleFileRemove"
                :max-size-m-b="5"
                :loading="analyzing"
                loading-message="Analizando documento con IA..."
                :existing-file-url="existingFile?.url"
                :existing-file-name="existingFile?.name"
                accept="application/pdf,image/jpeg,image/png,image/jpg"
              />

              <!-- OCR Status Alerts -->
              <v-fade-transition>
                  <div v-show="analysisComplete" class="mt-3">
                      <v-alert
                          color="success"
                          variant="tonal"
                          icon="mdi-check-circle"
                          density="compact"
                          closable
                      >
                         <strong>¡Análisis completado!</strong>
                         <div class="text-caption">
                             {{ analysisMessage }}
                         </div>
                      </v-alert>
                  </div>
              </v-fade-transition>
            </v-col>

            <v-col cols="12">
                <v-divider class="my-2" />
                <div class="text-subtitle-2 font-weight-bold mb-3">2. Clasificación del Documento</div>
            </v-col>

            <!-- Categoría -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.category"
                :items="categories"
                label="Categoría *"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'La categoría es requerida']"
                @update:model-value="handleCategoryChange"
                required
              />
            </v-col>

            <!-- Tipo de Documento (Dropdown Dinámico) -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.doc_type"
                :items="availableTypes"
                item-title="label"
                item-value="id"
                label="Tipo de Documento *"
                variant="outlined"
                density="comfortable"
                :disabled="!formData.category"
                :rules="[v => !!v || 'El tipo de documento es requerido']"
                @update:model-value="handleTypeChange"
                required
              >
                <template #selection="{ item }">
                    {{ item.raw.label }}
                </template>
                <template #item="{ item, props: itemProps }">
                    <v-list-item v-bind="itemProps">
                        <template #append>
                            <v-chip 
                                v-if="item.raw.required" 
                                size="x-small" 
                                color="primary" 
                                variant="tonal"
                            >
                                Requerido
                            </v-chip>
                        </template>
                    </v-list-item>
                </template>
              </v-select>
            </v-col>

            <!-- Estado -->
            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.status"
                :items="statusOptions"
                label="Estado Actual *"
                variant="outlined"
                density="comfortable"
                :item-props="getStatusProps"
                :rules="[v => !!v || 'El estado es requerido']"
                required
              />
            </v-col>

            <!-- Nombre del Documento (Opcional, auto-llenado) -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.name"
                label="Nombre Personalizado (Opcional)"
                placeholder="Ej: RIF Marzo 2026"
                variant="outlined"
                density="comfortable"
                hint="Se usará el tipo de documento si se deja vacío"
                persistent-hint
              />
            </v-col>

            <v-col cols="12">
                <v-divider class="my-2" />
                <div class="text-subtitle-2 font-weight-bold mb-3">3. Fechas</div>
            </v-col>

            <!-- Fecha de Emisión -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.emission_date"
                label="Fecha de Emisión"
                type="date"
                variant="outlined"
                density="comfortable"
                persistent-hint
                hint="Fecha en que se emitió el documento"
              />
            </v-col>

            <!-- Fecha de Vencimiento -->
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.expiration_date"
                label="Fecha de Vencimiento"
                type="date"
                variant="outlined"
                density="comfortable"
                persistent-hint
                hint="Dejar vacío si no aplica"
                :rules="expirationDateRules"
              />
            </v-col>

            <!-- Notas -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="Notas / Observaciones (Opcional)"
                placeholder="Información relevante extraída del documento o anotaciones manuales..."
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
              />
            </v-col>
          </v-row>
        </v-form>

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          @click="close"
          :disabled="loading"
        >
          Cancelar
        </v-btn>
        
        <v-btn
          color="primary"
          variant="elevated"
          @click="save"
          :loading="loading"
          :disabled="!valid"
          class="px-6"
        >
          {{ isEditing ? 'Actualizar' : 'Guardar' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import FiscalFileUpload from '@/components/fiscal/FiscalFileUpload.vue'
import fiscalOCRService from '@/services/fiscalOCRService'
import { FISCAL_TYPES } from '@/constants/fiscalDocuments'

const props = defineProps({
  modelValue: Boolean,
  editingItem: {
    type: Object,
    default: null
  },
  loading: Boolean,
  error: String
})

const emit = defineEmits(['update:modelValue', 'save', 'close'])

const form = ref(null)
const valid = ref(false)
const newFile = ref(null)

// OCR State
const analyzing = ref(false)
const analysisComplete = ref(false)
const ocrConfidence = ref(0)
const analysisMessage = ref('')

// Data inicial del formulario
const defaultForm = {
  name: '',
  category: null,
  doc_type: null,
  status: 'VIGENTE',
  emission_date: null,
  expiration_date: null,
  notes: ''
}

const formData = reactive({ ...defaultForm })

// Opciones
const categories = ['LEGAL', 'MUNICIPAL', 'SENIAT', 'NOMINA', 'OTROS']

const statusOptions = [
  { title: 'Vigente', value: 'VIGENTE', color: 'success' },
  { title: 'En Trámite', value: 'TRAMITE', color: 'warning' },
  { title: 'Vencido', value: 'VENCIDO', color: 'error' }
]

// Computed
const isEditing = computed(() => !!props.editingItem)

const availableTypes = computed(() => {
    if (!formData.category) return []
    return FISCAL_TYPES[formData.category] || []
})

const existingFile = computed(() => {
  if (props.editingItem && props.editingItem.documents) {
    return {
      url: props.editingItem.documents.file_url,
      name: props.editingItem.documents.name
    }
  }
  return null
})

// Validation: Expiration date must be after emission date
const expirationDateRules = computed(() => [
    v => {
        if (!v || !formData.emission_date) return true // Optional field
        const emission = new Date(formData.emission_date)
        const expiration = new Date(v)
        if (expiration <= emission) {
            return 'La fecha de vencimiento debe ser posterior a la fecha de emisión'
        }
        return true
    }
])

// Methods
const handleCategoryChange = () => {
    formData.doc_type = null
}

const handleTypeChange = (typeId) => {
    // Ya no auto-llenamos el nombre desde el tipo
    // El usuario puede usar el nombre personalizado si lo desea
}

const getStatusProps = (item) => {
  return {
    title: item.title,
    prependIcon: 'mdi-circle',
    baseColor: item.color,
  }
}

const handleFileSelect = async (file) => {
  newFile.value = file
  
  // Auto-análisis siempre (nuevo o reemplazo)
  if (file) {
     await analyzeDocument(file)
  }
}

const analyzeDocument = async (file) => {
    analyzing.value = true
    analysisComplete.value = false
    analysisMessage.value = ''
    
    try {
        const data = await fiscalOCRService.analyzeDocument(file)
        
        // Auto-llenado inteligente
        let detectedItems = []

        // Categoría
        if (data.category && categories.includes(data.category)) {
            formData.category = data.category
            detectedItems.push(`Categoría: ${data.category}`)
        }
        
        // Intentar matchear doc_type
        if (data.category && data.docName) {
            const types = FISCAL_TYPES[data.category] || []
            const matchedType = types.find(t => 
                t.label.toLowerCase().includes(data.docName.toLowerCase()) ||
                data.docName.toLowerCase().includes(t.label.toLowerCase())
            )
            if (matchedType) {
                formData.doc_type = matchedType.id
                formData.name = matchedType.label
                detectedItems.push(`Tipo: ${matchedType.label}`)
            } else {
                formData.name = data.docName
            }
        }

        // Fecha de Emisión (con fallback a notas)
        if (data.emissionDate) {
            formData.emission_date = data.emissionDate
            detectedItems.push('Fecha Emisión')
        } else if (data.notes) {
            // Fallback: Intentar extraer fecha de notas
            const extractedDate = extractDateFromText(data.notes)
            if (extractedDate) {
                formData.emission_date = extractedDate
                detectedItems.push('Fecha Emisión (detectada)')
            }
        }
        
        // Fecha de Vencimiento
        if (data.expirationDate) {
            formData.expiration_date = data.expirationDate
            detectedItems.push('Fecha Vencimiento')
            
            // Lógica de vencimiento
            const exp = new Date(data.expirationDate)
            const now = new Date()
            if (exp < now) formData.status = 'VENCIDO'
            else formData.status = 'VIGENTE'
        }

        // Notas
        if (data.notes || data.summary) {
            formData.notes = data.notes || data.summary
            detectedItems.push('Notas')
        }
        
        ocrConfidence.value = data.confidence || 0
        analysisComplete.value = true
        analysisMessage.value = detectedItems.length > 0 
            ? `Detectado: ${detectedItems.join(', ')}`
            : 'No se pudo extraer información automáticamente.'
        
    } catch (e) {
        console.warn('OCR Analysis failed:', e)
        analysisMessage.value = 'Error en el análisis. Por favor, complete los datos manualmente.'
        analysisComplete.value = true
    } finally {
        analyzing.value = false
    }
}

/**
 * Extrae una fecha de texto en formato DD/MM/YYYY o DD-MM-YYYY y la convierte a YYYY-MM-DD
 */
const extractDateFromText = (text) => {
    if (!text) return null
    
    // Buscar patrones de fecha comunes en texto venezolano
    const patterns = [
        /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g,  // DD/MM/YYYY o DD-MM-YYYY
        /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/g,  // YYYY-MM-DD (ya correcto)
    ]
    
    // Primer patrón: DD/MM/YYYY
    const match1 = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
    if (match1) {
        const [, day, month, year] = match1
        // Validar que sea una fecha razonable
        if (parseInt(day) <= 31 && parseInt(month) <= 12) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
    }
    
    // Segundo patrón: ya es YYYY-MM-DD
    const match2 = text.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/)
    if (match2) {
        const [, year, month, day] = match2
        if (parseInt(day) <= 31 && parseInt(month) <= 12) {
            return `${year}-${month}-${day}`
        }
    }
    
    return null
}

const handleFileRemove = () => {
  newFile.value = null
  analysisComplete.value = false
  if (!props.editingItem) {
      Object.assign(formData, defaultForm)
  }
}

const close = () => {
  emit('close')
  emit('update:modelValue', false)
  resetForm()
}

const save = async () => {
  // Validar form
  const { valid } = await form.value.validate()
  if (!valid) return

  emit('save', {
    ...formData,
    name: formData.name || null, // Nombre es opcional
    file: newFile.value
  })
}

const resetForm = () => {
  Object.assign(formData, defaultForm)
  newFile.value = null
  analyzing.value = false
  analysisComplete.value = false
  if (form.value) form.value.resetValidation()
}

// Watchers
watch(() => props.modelValue, (val) => {
  if (val) {
    if (props.editingItem) {
        // Cargar datos para editar
        Object.assign(formData, {
          id: props.editingItem.id,
          name: props.editingItem.name,
          category: props.editingItem.category,
          doc_type: props.editingItem.doc_type,
          status: props.editingItem.status,
          emission_date: props.editingItem.emission_date,
          expiration_date: props.editingItem.expiration_date,
          notes: props.editingItem.notes || '',
          document_id: props.editingItem.document_id
        })
    } else {
        resetForm()
    }
  }
})
</script>

<style scoped>
.fiscal-doc-dialog {
  border-radius: 12px;
  overflow: hidden;
}
</style>
