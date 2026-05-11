<template>
  <v-card class="mb-4 border rounded-xl overflow-hidden" elevation="0" variant="outlined">
    <!-- Encabezado del tipo de documento -->
    <div class="px-4 py-3 bg-grey-lighten-4 border-b d-flex align-center flex-wrap">
      <v-icon :icon="getCategoryIcon(category)" color="primary" class="mr-3" />
      <div>
        <div class="text-subtitle-1 font-weight-bold text-secondary">{{ type.label }}</div>
        <div class="text-caption text-grey-darken-1 d-flex align-center">
          <v-icon size="x-small" class="mr-1">mdi-refresh</v-icon>
          Frecuencia: <strong class="ml-1">{{ getFrequencyLabel(type.frequency) }}</strong>
        </div>
      </div>
      <v-spacer />

      <!-- Badges de resumen -->
      <div class="d-flex align-center gap-2 mt-2 mt-sm-0">
        <v-chip size="small" :color="completionColor" variant="flat">
          {{ uploadedCount }} / {{ pastPeriods.length }} Completados
        </v-chip>
        <v-chip v-if="noAplicaCount > 0" size="small" color="grey" variant="flat" prepend-icon="mdi-minus-circle-outline">
          {{ noAplicaCount }} No Aplica
        </v-chip>
      </div>
    </div>

    <!-- Tracker / Grid de períodos -->
    <v-card-text class="pa-4 bg-white">
      <v-row dense>
        <v-col
          v-for="(period, index) in periods"
          :key="index"
          :cols="12"
          :sm="getColSize(type.frequency)"
        >
          <!-- Tarjeta de Período -->
          <v-card
            :variant="period.docs.length > 0 ? 'flat' : 'outlined'"
            :class="[
              'period-card d-flex flex-column justify-center align-center h-100 pa-2',
              'cursor-pointer'
            ]"
            :style="getPeriodStyle(period)"
            @click="handlePeriodClick(period)"
            v-ripple
            :aria-label="`${period.label}: ${period.statusLabel}`"
          >
            <!-- Título del Período (Ej. Ene, Q1, etc) -->
            <div class="text-caption font-weight-bold mb-1" :class="getPeriodTextClass(period)">
              {{ period.label }}
            </div>

            <!-- Indicador de múltiples documentos -->
            <div v-if="period.docs.length > 1" class="position-relative">
              <v-icon :color="getMultiDocColor(period)" size="22">mdi-file-multiple</v-icon>
              <v-badge
                :content="period.docs.length"
                :color="getMultiDocColor(period)"
                floating
                inline
                class="text-caption"
              />
            </div>

            <!-- Ícono único cuando hay 1 doc -->
            <v-icon v-else-if="period.docs.length === 1" :color="getDocColor(period.docs[0])" size="24">
              {{ getDocIcon(period.docs[0]) }}
            </v-icon>

            <!-- Sin documentos -->
            <v-icon
              v-else
              :color="period.isFuture ? 'grey-lighten-2' : (period.isCurrent ? 'warning' : 'error')"
              size="24"
            >
              {{ period.isFuture ? 'mdi-clock-outline' : 'mdi-plus-circle-outline' }}
            </v-icon>

            <!-- Subtítulo pequeño de estado -->
            <div class="text-micro mt-1 text-center" :class="getPeriodTextClass(period)">
              {{ period.statusLabel }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Modal de lista de archivos cuando hay múltiples -->
    <v-dialog v-model="multiDocDialog" max-width="500px">
      <v-card rounded="xl">
        <v-card-title class="bg-primary text-white py-3 px-4 d-flex align-center">
          <v-icon start>mdi-file-multiple</v-icon>
          {{ multiDocPeriod?.label }} — {{ multiDocPeriod?.docs.length }} archivos
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" color="white" @click="multiDocDialog = false" />
        </v-card-title>
        <v-list lines="two">
          <v-list-item
            v-for="doc in multiDocPeriod?.docs"
            :key="doc.id"
            :title="doc.name"
            :subtitle="doc.emission_date"
            @click="openDocPreview(doc)"
            class="cursor-pointer"
          >
            <template #prepend>
              <v-icon :color="getDocColor(doc)" class="mr-2">{{ getDocIcon(doc) }}</v-icon>
            </template>
            <template #append>
              <v-chip size="x-small" :color="getDocColor(doc)" variant="tonal">{{ doc.status }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
        <v-card-actions class="pa-3 justify-end">
          <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" @click="openNewDocForPeriod">
            Agregar otro archivo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getExpirationInfo, FREQUENCIES } from '@/constants/fiscalDocuments'

const props = defineProps({
  type: {
    type: Object,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  documents: {
    type: Array,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['open-preview', 'open-dialog'])

// Estado del modal de múltiples archivos
const multiDocDialog = ref(false)
const multiDocPeriod = ref(null)

// Helper: Etiquetas de frecuencia
const getFrequencyLabel = (freq) => {
  return FREQUENCIES[freq] || freq
}

const getCategoryIcon = (category) => {
  const icons = {
    'LEGAL': 'mdi-gavel',
    'MUNICIPAL': 'mdi-city',
    'SENIAT': 'mdi-bank',
    'NOMINA': 'mdi-account-group',
    'OTROS': 'mdi-folder-outline'
  }
  return icons[category] || 'mdi-file-document-outline'
}

// ---------------------------------------------------------------
// Construcción de períodos
// Cada período ahora tiene `docs: Array` en lugar de `doc: Object`
// para soportar múltiples archivos por período.
// ---------------------------------------------------------------
const periods = computed(() => {
  const result = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-11

  const buildPeriod = (label, matchingDocs, isFuture, isCurrent, extra = {}) => {
    // Separar NO_APLICA del resto
    const noAplicaDocs = matchingDocs.filter(d => d.status === 'NO_APLICA')
    const activeDocs   = matchingDocs.filter(d => d.status !== 'NO_APLICA')

    // Si el período está marcado como No Aplica (y no hay docs activos), mostrar estado N/A
    if (noAplicaDocs.length > 0 && activeDocs.length === 0) {
      return { label, docs: noAplicaDocs, isFuture, isCurrent, statusLabel: 'N/A', isNoAplica: true, ...extra }
    }

    let statusLabel = ''
    if (activeDocs.length > 0) {
      if (activeDocs.length > 1)       statusLabel = `${activeDocs.length} archivos`
      else if (activeDocs[0].status === 'VIGENTE')  statusLabel = 'Subido'
      else if (activeDocs[0].status === 'TRAMITE')  statusLabel = 'En Trámite'
      else                             statusLabel = 'Vencido'
    } else {
      statusLabel = isFuture ? 'Espera' : 'Falta'
    }

    return { label, docs: activeDocs, isFuture, isCurrent, statusLabel, isNoAplica: false, ...extra }
  }

  if (props.type.frequency === 'MONTHLY') {
    const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    for (let i = 0; i < 12; i++) {
      const matchingDocs = props.documents.filter(d => {
        if (!d.emission_date) return false
        // Parsear en hora local para evitar desfase UTC
        const date = new Date(d.emission_date + 'T00:00:00')
        return date.getFullYear() === props.year && date.getMonth() === i
      })
      const isFuture = props.year > currentYear || (props.year === currentYear && i > currentMonth)
      const isCurrent = props.year === currentYear && i === currentMonth
      result.push(buildPeriod(monthsShort[i], matchingDocs, isFuture, isCurrent, { monthIndex: i }))
    }

  } else if (props.type.frequency === 'QUARTERLY') {
    const quarters = ['1er Trim.', '2do Trim.', '3er Trim.', '4to Trim.']
    for (let i = 0; i < 4; i++) {
      const matchingDocs = props.documents.filter(d => {
        if (!d.emission_date) return false
        const date = new Date(d.emission_date + 'T00:00:00')
        return date.getFullYear() === props.year && Math.floor(date.getMonth() / 3) === i
      })
      const currentQuarter = Math.floor(currentMonth / 3)
      const isFuture = props.year > currentYear || (props.year === currentYear && i > currentQuarter)
      const isCurrent = props.year === currentYear && i === currentQuarter
      result.push(buildPeriod(quarters[i], matchingDocs, isFuture, isCurrent, { quarterIndex: i }))
    }

  } else if (props.type.frequency === 'SEMESTRAL') {
    const semesters = ['1er Sem.', '2do Sem.']
    for (let i = 0; i < 2; i++) {
      const matchingDocs = props.documents.filter(d => {
        if (!d.emission_date) return false
        const date = new Date(d.emission_date + 'T00:00:00')
        return date.getFullYear() === props.year && Math.floor(date.getMonth() / 6) === i
      })
      const currentSemester = Math.floor(currentMonth / 6)
      const isFuture = props.year > currentYear || (props.year === currentYear && i > currentSemester)
      const isCurrent = props.year === currentYear && i === currentSemester
      result.push(buildPeriod(semesters[i], matchingDocs, isFuture, isCurrent))
    }

  } else if (props.type.frequency === 'ANNUAL') {
    const matchingDocs = props.documents.filter(d => {
      if (!d.emission_date) return false
      return new Date(d.emission_date + 'T00:00:00').getFullYear() === props.year
    })
    const isFuture  = props.year > currentYear
    const isCurrent = props.year === currentYear
    
    let periodLabel = `Año ${props.year}`
    if (props.type.id === 'ISLR_ANUAL' || props.type.id === 'IGP') {
        periodLabel = `Ejercicio ${props.year - 1}`
    }
    
    result.push(buildPeriod(periodLabel, matchingDocs, isFuture, isCurrent))

  } else if (props.type.frequency === 'QUINCENAL') {
    const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    for (let m = 0; m < 12; m++) {
      for (let q = 1; q <= 2; q++) {
        const matchingDocs = props.documents.filter(d => {
          if (!d.emission_date) return false
          const date = new Date(d.emission_date + 'T00:00:00')
          if (date.getFullYear() !== props.year || date.getMonth() !== m) return false
          return q === 1 ? date.getDate() <= 15 : date.getDate() > 15
        })
        const currentQ  = now.getDate() <= 15 ? 1 : 2
        const isFuture  = props.year > currentYear || (props.year === currentYear && m > currentMonth) ||
                          (props.year === currentYear && m === currentMonth && q > currentQ)
        const isCurrent = props.year === currentYear && m === currentMonth && q === currentQ
        result.push(buildPeriod(`${monthsShort[m]} Q${q}`, matchingDocs, isFuture, isCurrent))
      }
    }
  }

  return result
})

// Períodos ya pasados (para calcular el denominador del progreso)
const pastPeriods = computed(() =>
  periods.value.filter(p => !p.isFuture && !p.isNoAplica)
)

const uploadedCount = computed(() =>
  pastPeriods.value.filter(p => p.docs.length > 0).length
)

const noAplicaCount = computed(() =>
  periods.value.filter(p => p.isNoAplica).length
)

const completionColor = computed(() => {
  const needed = pastPeriods.value.length
  if (needed === 0) return 'grey'
  const rate = uploadedCount.value / needed
  if (rate >= 1)   return 'success'
  if (rate >= 0.5) return 'warning'
  return 'error'
})

// ---------------------------------------------------------------
// Estilos por período
// ---------------------------------------------------------------
const getDocColor = (doc) => {
  if (doc.status === 'NO_APLICA') return 'grey'
  if (doc.status === 'VIGENTE')   return 'success'
  if (doc.status === 'TRAMITE')   return 'warning'
  return 'error'
}

const getDocIcon = (doc) => {
  if (doc.status === 'NO_APLICA') return 'mdi-minus-circle-outline'
  if (doc.status === 'VIGENTE')   return 'mdi-check-circle'
  if (doc.status === 'TRAMITE')   return 'mdi-clock-outline'
  return 'mdi-alert-circle'
}

const getMultiDocColor = (period) => {
  // Color basado en el documento más importante del período
  const hasVencido  = period.docs.some(d => d.status === 'VENCIDO')
  const hasTramite  = period.docs.some(d => d.status === 'TRAMITE')
  if (hasVencido) return 'error'
  if (hasTramite) return 'warning'
  return 'success'
}

const getPeriodStyle = (period) => {
  if (period.isNoAplica) {
    return 'background-color: #f5f5f5 !important; border: 1px dashed #9e9e9e; opacity: 0.75;'
  }
  if (period.docs.length === 0) {
    return 'border-style: dashed;'
  }
  const color = getMultiDocColor(period)
  const hex = color === 'success' ? '#4caf50' : color === 'warning' ? '#ff9800' : '#f44336'
  return `background-color: ${hex}15 !important; border: 1px solid ${hex}50`
}

const getPeriodTextClass = (period) => {
  if (period.isNoAplica) return 'text-grey'
  if (period.docs.length === 0) {
    return period.isFuture ? 'text-grey-darken-1' : (period.isCurrent ? 'text-warning' : 'text-error')
  }
  return `text-${getMultiDocColor(period)}`
}

// ---------------------------------------------------------------
// Interacción
// ---------------------------------------------------------------
const getColSize = (frequency) => {
  switch (frequency) {
    case 'MONTHLY':   return 2
    case 'QUARTERLY': return 3
    case 'SEMESTRAL': return 6
    case 'ANNUAL':    return 12
    case 'QUINCENAL': return 2
    default:          return 4
  }
}

const handlePeriodClick = (period) => {
  if (period.isNoAplica) {
    // Abrir el primer doc N/A para ver/editar la observación
    emit('open-preview', period.docs[0])
    return
  }

  if (period.docs.length > 1 || (period.docs.length === 1 && props.type.allowMultiple)) {
    // Múltiples docs o permite múltiples: mostrar modal con la lista y botón "Añadir otro"
    multiDocPeriod.value = period
    multiDocDialog.value = true
  } else if (period.docs.length === 1) {
    // Un solo doc (y no permite múltiples): abrir preview
    emit('open-preview', period.docs[0])
  } else {
    // Sin doc: abrir diálogo de creación
    emit('open-dialog', {
      typeId:     props.type.id,
      category:   props.category,
      periodInfo: period
    })
  }
}

const openDocPreview = (doc) => {
  multiDocDialog.value = false
  emit('open-preview', doc)
}

const openNewDocForPeriod = () => {
  multiDocDialog.value = false
  emit('open-dialog', {
    typeId:     props.type.id,
    category:   props.category,
    periodInfo: multiDocPeriod.value
  })
}
</script>

<style scoped>
.period-card {
    transition: all 0.2s ease;
    border-radius: 8px;
    height: 64px;
}
.period-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.text-micro {
    font-size: 0.65rem;
    line-height: 1;
    text-transform: uppercase;
    font-weight: 600;
}
.gap-2 {
    gap: 8px;
}
</style>
