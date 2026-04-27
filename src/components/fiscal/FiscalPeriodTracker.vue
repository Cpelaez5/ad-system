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
          {{ uploadedCount }} / {{ periods.length }} Completados
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
            :variant="period.doc ? 'flat' : 'outlined'"
            :class="[
              'period-card d-flex flex-column justify-center align-center h-100 pa-2',
              period.doc ? 'bg-primary-lighten-1 cursor-pointer' : 'cursor-pointer hover-bg'
            ]"
            :style="period.doc ? `background-color: ${getDocColor(period.doc)}15 !important; border: 1px solid ${getDocColor(period.doc)}50` : 'border-style: dashed;'"
            @click="handlePeriodClick(period)"
            v-ripple
          >
            <!-- Título del Período (Ej. Ene, Q1, etc) -->
            <div class="text-caption font-weight-bold mb-1" :class="period.doc ? `text-${getDocColor(period.doc)}` : 'text-grey-darken-1'">
              {{ period.label }}
            </div>
            
            <!-- Icono centralizado -->
            <v-icon
              v-if="period.doc"
              :color="getDocColor(period.doc)"
              size="24"
            >
              {{ getDocIcon(period.doc) }}
            </v-icon>
            <v-icon
              v-else
              :color="period.isFuture ? 'grey-lighten-2' : (period.isCurrent ? 'warning' : 'error')"
              size="24"
            >
              {{ period.isFuture ? 'mdi-clock-outline' : 'mdi-plus-circle-outline' }}
            </v-icon>

            <!-- Subtítulo pequeño de estado -->
            <div class="text-micro mt-1 text-center" :class="period.doc ? `text-${getDocColor(period.doc)}` : 'text-grey'">
              {{ period.statusLabel }}
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
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

// Configuración de los períodos según la frecuencia
const periods = computed(() => {
  const result = []
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-11
  
  if (props.type.frequency === 'MONTHLY') {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    for (let i = 0; i < 12; i++) {
      // Find matching doc for this month/year using emission_date
      const matchingDocs = props.documents.filter(d => {
        if (!d.emission_date) return false
        const date = new Date(d.emission_date)
        return date.getFullYear() === props.year && date.getMonth() === i
      })
      
      // Take the most "valid" one or just the first
      const doc = matchingDocs.find(d => d.status !== 'VENCIDO') || matchingDocs[0]
      
      const isFuture = props.year > currentYear || (props.year === currentYear && i > currentMonth)
      const isCurrent = props.year === currentYear && i === currentMonth
      
      let statusLabel = ''
      if (doc) {
         if (doc.status === 'VIGENTE') statusLabel = 'Subido'
         else if (doc.status === 'TRAMITE') statusLabel = 'En Trámite'
         else statusLabel = 'Vencido'
      } else {
         if (isFuture) statusLabel = 'Espera'
         else if (isCurrent) statusLabel = 'Falta'
         else statusLabel = 'Falta'
      }

      result.push({
        label: months[i],
        monthIndex: i,
        doc,
        isFuture,
        isCurrent,
        statusLabel
      })
    }
  } else if (props.type.frequency === 'QUARTERLY') {
    const quarters = ['1er Trim.', '2do Trim.', '3er Trim.', '4to Trim.']
    
    for (let i = 0; i < 4; i++) {
        const matchingDocs = props.documents.filter(d => {
            if (!d.emission_date) return false
            const date = new Date(d.emission_date)
            return date.getFullYear() === props.year && Math.floor(date.getMonth() / 3) === i
        })
        const doc = matchingDocs.find(d => d.status !== 'VENCIDO') || matchingDocs[0]
        
        const currentQuarter = Math.floor(currentMonth / 3)
        const isFuture = props.year > currentYear || (props.year === currentYear && i > currentQuarter)
        const isCurrent = props.year === currentYear && i === currentQuarter
        
        let statusLabel = ''
        if (doc) {
           statusLabel = doc.status === 'VIGENTE' ? 'Subido' : (doc.status === 'TRAMITE' ? 'En Trámite' : 'Vencido')
        } else {
           statusLabel = isFuture ? 'Espera' : 'Falta'
        }

        result.push({
            label: quarters[i],
            quarterIndex: i,
            doc,
            isFuture,
            isCurrent,
            statusLabel
        })
    }
  } else if (props.type.frequency === 'SEMESTRAL') {
      const semesters = ['1er Sem.', '2do Sem.']
      for (let i = 0; i < 2; i++) {
          const matchingDocs = props.documents.filter(d => {
              if (!d.emission_date) return false
              const date = new Date(d.emission_date)
              return date.getFullYear() === props.year && Math.floor(date.getMonth() / 6) === i
          })
          const doc = matchingDocs.find(d => d.status !== 'VENCIDO') || matchingDocs[0]
          
          const currentSemester = Math.floor(currentMonth / 6)
          const isFuture = props.year > currentYear || (props.year === currentYear && i > currentSemester)
          const isCurrent = props.year === currentYear && i === currentSemester
          
          let statusLabel = doc ? (doc.status === 'VIGENTE' ? 'Subido' : 'En Trámite') : (isFuture ? 'Espera' : 'Falta')
          
          result.push({
              label: semesters[i],
              doc, isFuture, isCurrent, statusLabel
          })
      }
  } else if (props.type.frequency === 'ANNUAL') {
      const matchingDocs = props.documents.filter(d => {
          if (!d.emission_date) return false
          return new Date(d.emission_date).getFullYear() === props.year
      })
      const doc = matchingDocs.find(d => d.status !== 'VENCIDO') || matchingDocs[0]
      const isFuture = props.year > currentYear
      const isCurrent = props.year === currentYear
      
      result.push({
          label: `Año ${props.year}`,
          doc, isFuture, isCurrent, 
          statusLabel: doc ? 'Subido' : (isFuture ? 'Espera' : 'Falta')
      })
  } else if (props.type.frequency === 'QUINCENAL') {
      // 24 periodos o renderizado mensual con aglomerado. Lo simplificaremos a meses por limitaciones de espacio visual, pero soportando múltiples archivos.
      // O mostramos 2 quincenas por mes:
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      for (let m = 0; m < 12; m++) {
          for (let q = 1; q <= 2; q++) { // Dos quincenas
              const matchingDocs = props.documents.filter(d => {
                  if (!d.emission_date) return false
                  const date = new Date(d.emission_date)
                  if (date.getFullYear() !== props.year || date.getMonth() !== m) return false
                  return q === 1 ? date.getDate() <= 15 : date.getDate() > 15
              })
              const doc = matchingDocs.find(d => d.status !== 'VENCIDO') || matchingDocs[0]
              
              const currentQ = (new Date()).getDate() <= 15 ? 1 : 2
              const isFuture = props.year > currentYear || (props.year === currentYear && m > currentMonth) || (props.year === currentYear && m === currentMonth && q > currentQ)
              const isCurrent = props.year === currentYear && m === currentMonth && q === currentQ
              
              result.push({
                  label: `${months[m]} Q${q}`,
                  doc, isFuture, isCurrent,
                  statusLabel: doc ? 'Subido' : (isFuture ? 'Espera' : 'Falta')
              })
          }
      }
  }

  return result
})

const uploadedCount = computed(() => {
  return periods.value.filter(p => !!p.doc).length
})

const completionColor = computed(() => {
  const needed = periods.value.filter(p => !p.isFuture).length
  if (needed === 0) return 'grey'
  const rate = uploadedCount.value / needed
  if (rate >= 1) return 'success'
  if (rate >= 0.5) return 'warning'
  return 'error'
})

const getColSize = (frequency) => {
    switch(frequency) {
        case 'MONTHLY': return 2 // 6 per row on md, 12 per row on large... wait, cols="12" sm="3" md="2" lg="1"
        case 'QUARTERLY': return 3
        case 'SEMESTRAL': return 6
        case 'ANNUAL': return 12
        case 'QUINCENAL': return 2 // Demasiados (24), en 2 columnas serían 12 lineas, mejor 4 o 6 por linea
        default: return 4
    }
}

// Estilos de Documento
const getDocColor = (doc) => {
    if (doc.status === 'VIGENTE') return 'success'
    if (doc.status === 'TRAMITE') return 'warning'
    return 'error'
}

const getDocIcon = (doc) => {
    if (doc.status === 'VIGENTE') return 'mdi-check-circle'
    if (doc.status === 'TRAMITE') return 'mdi-clock-outline'
    return 'mdi-alert-circle'
}

const handlePeriodClick = (period) => {
  if (period.doc) {
    emit('open-preview', period.doc)
  } else {
    // Si no es un período futuro o si el usuario insiste y quiere adelantarse
    // Lo prepoblaremos
    emit('open-dialog', {
        typeId: props.type.id,
        category: props.category,
        periodInfo: period // para usar la fecha base
    })
  }
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
