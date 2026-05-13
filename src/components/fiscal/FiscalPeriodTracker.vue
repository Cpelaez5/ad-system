<template>
  <v-card class="mb-4 rounded-xl overflow-hidden" elevation="0" variant="outlined">
    <!-- ══════════════════════════════════════════ -->
    <!-- Encabezado: Tipo de Documento              -->
    <!-- ══════════════════════════════════════════ -->
    <div
      class="px-4 py-3 d-flex align-center flex-wrap"
      style="background: linear-gradient(90deg, #f8f9fa 0%, #fff 100%); border-bottom: 1px solid rgba(0,0,0,0.07)"
    >
      <v-icon :icon="categoryIcon" color="primary" class="mr-3" size="22" />
      <div class="flex-grow-1">
        <div class="text-subtitle-1 font-weight-bold text-secondary">{{ type.label }}</div>
        <div class="text-caption text-grey-darken-1 d-flex align-center">
          <v-icon size="x-small" class="mr-1">mdi-refresh</v-icon>
          Frecuencia:
          <strong class="ml-1">{{ frequencyLabel }}</strong>
        </div>
      </div>

      <!-- Resumen de completitud -->
      <v-chip
        size="small"
        :color="completionColor"
        variant="tonal"
        class="mt-2 mt-sm-0"
      >
        <v-icon start size="x-small">
          {{ uploadedCount === passedPeriods ? 'mdi-check-all' : 'mdi-chart-arc' }}
        </v-icon>
        {{ uploadedCount }} / {{ passedPeriods }} Completados
      </v-chip>
    </div>

    <!-- ══════════════════════════════════════════ -->
    <!-- Lista de Períodos                          -->
    <!-- ══════════════════════════════════════════ -->
    <v-list class="pa-0" lines="one">
      <template v-for="(period, index) in periods" :key="index">
        <v-divider v-if="index > 0" />

        <v-list-item
          :class="[
            'py-2 px-4',
            period.isFuture ? 'opacity-50' : '',
            period.doc ? 'cursor-pointer' : ''
          ]"
          @click="period.doc ? $emit('open-preview', period.doc) : null"
          :ripple="!!period.doc"
        >
          <!-- Ícono de estado (lado izquierdo) -->
          <template #prepend>
            <v-avatar
              :color="getPeriodAvatarColor(period)"
              size="32"
              class="mr-3"
              variant="tonal"
            >
              <v-icon size="16" :color="getPeriodIconColor(period)">
                {{ getPeriodIcon(period) }}
              </v-icon>
            </v-avatar>
          </template>

          <!-- Etiqueta del período -->
          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ period.label }}
          </v-list-item-title>

          <!-- Chip de estado -->
          <v-list-item-subtitle>
            <v-chip
              size="x-small"
              :color="getPeriodStatusColor(period)"
              variant="tonal"
              class="mt-1"
            >
              {{ period.statusLabel }}
            </v-chip>
          </v-list-item-subtitle>

          <!-- Acciones (lado derecho) -->
          <template #append>
            <div class="d-flex align-center" style="gap: 2px">
              <!-- Período con documento cargado -->
              <template v-if="period.doc">
                <!-- Ver archivo -->
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="info"
                  v-tooltip="'Ver detalle'"
                  @click.stop="$emit('open-preview', period.doc)"
                >
                  <v-icon size="16">mdi-eye</v-icon>
                </v-btn>

                <!-- Descargar archivo (solo si existe) -->
                <v-btn
                  v-if="period.doc.documents?.file_url"
                  icon
                  size="x-small"
                  variant="text"
                  color="primary"
                  :href="period.doc.documents.file_url"
                  target="_blank"
                  v-tooltip="'Descargar archivo'"
                  @click.stop
                >
                  <v-icon size="16">mdi-download</v-icon>
                </v-btn>

                <!-- Editar -->
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="grey-darken-1"
                  v-tooltip="'Editar'"
                  @click.stop="$emit('open-dialog', {
                    typeId: type.id,
                    category: category,
                    periodInfo: period,
                    doc: period.doc
                  })"
                >
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
              </template>

              <!-- Período sin documento -->
              <template v-else-if="!period.isFuture">
                <!-- Subir documento -->
                <v-btn
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="text-none"
                  prepend-icon="mdi-upload"
                  @click.stop="$emit('open-dialog', {
                    typeId: type.id,
                    category: category,
                    periodInfo: period
                  })"
                >
                  Subir
                </v-btn>
              </template>

              <!-- Período futuro -->
              <template v-else>
                <v-chip size="x-small" variant="text" color="grey" class="text-caption">
                  Próximo
                </v-chip>
              </template>
            </div>
          </template>
        </v-list-item>
      </template>

      <!-- Estado vacío (no aplica, etc.) -->
      <v-list-item v-if="periods.length === 0" class="py-4 text-center text-grey">
        <v-list-item-title>Sin períodos para el año seleccionado</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { FREQUENCIES } from '@/constants/fiscalDocuments'

// ──────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────
const props = defineProps({
  /** Tipo de documento: { id, label, frequency, required } */
  type: { type: Object, required: true },
  /** Categoría: 'LEGAL' | 'MUNICIPAL' | 'SENIAT' | 'NOMINA' | 'OTROS' */
  category: { type: String, required: true },
  /** Documentos del sistema correspondientes a este tipo */
  documents: { type: Array, required: true },
  /** Año fiscal seleccionado en la vista padre */
  year: { type: Number, required: true }
})

const emit = defineEmits(['open-preview', 'open-dialog'])

// ──────────────────────────────────────────────
// Helpers de etiquetas
// ──────────────────────────────────────────────
const frequencyLabel = computed(() => FREQUENCIES[props.type.frequency] || props.type.frequency)

const categoryIcon = computed(() => {
  const icons = {
    LEGAL:    'mdi-gavel',
    MUNICIPAL:'mdi-city',
    SENIAT:   'mdi-bank',
    NOMINA:   'mdi-account-group',
    OTROS:    'mdi-folder-outline'
  }
  return icons[props.category] || 'mdi-file-document-outline'
})

// ──────────────────────────────────────────────
// Cálculo de períodos (S - Single Responsibility)
// Cada bloque de frecuencia es independiente.
// ──────────────────────────────────────────────
const periods = computed(() => {
  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth()   // 0-11
  const currentDay   = now.getDate()
  const freq = props.type.frequency

  // Buscar el doc más válido para un conjunto de documentos candidatos
  const bestDoc = (candidates) =>
    candidates.find(d => d.status !== 'VENCIDO') || candidates[0] || null

  // ── MENSUAL ──────────────────────────────────
  if (freq === 'MONTHLY') {
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return Array.from({ length: 12 }, (_, i) => {
      const candidates = props.documents.filter(d => {
        if (!d.emission_date) return false
        const dt = new Date(d.emission_date + 'T00:00:00')
        return dt.getFullYear() === props.year && dt.getMonth() === i
      })
      const doc       = bestDoc(candidates)
      const isFuture  = props.year > currentYear || (props.year === currentYear && i > currentMonth)
      const isCurrent = props.year === currentYear && i === currentMonth
      return buildPeriod(`${monthNames[i]} ${props.year}`, doc, isFuture, isCurrent, { monthIndex: i })
    })
  }

  // ── QUINCENAL ────────────────────────────────
  if (freq === 'QUINCENAL') {
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const result = []
    for (let m = 0; m < 12; m++) {
      for (let q = 1; q <= 2; q++) {
        const candidates = props.documents.filter(d => {
          if (!d.emission_date) return false
          const dt = new Date(d.emission_date + 'T00:00:00')
          if (dt.getFullYear() !== props.year || dt.getMonth() !== m) return false
          return q === 1 ? dt.getDate() <= 15 : dt.getDate() > 15
        })
        const doc = bestDoc(candidates)
        const currentQ = currentDay <= 15 ? 1 : 2
        const isFuture =
          props.year > currentYear ||
          (props.year === currentYear && m > currentMonth) ||
          (props.year === currentYear && m === currentMonth && q > currentQ)
        const isCurrent = props.year === currentYear && m === currentMonth && q === currentQ
        result.push(buildPeriod(
          `${q}ª Quincena ${monthNames[m]} ${props.year}`,
          doc, isFuture, isCurrent, { monthIndex: m, quincenal: q }
        ))
      }
    }
    return result
  }

  // ── TRIMESTRAL ───────────────────────────────
  if (freq === 'QUARTERLY') {
    const labels = ['1er Trimestre', '2do Trimestre', '3er Trimestre', '4to Trimestre']
    return Array.from({ length: 4 }, (_, i) => {
      const candidates = props.documents.filter(d => {
        if (!d.emission_date) return false
        const dt = new Date(d.emission_date + 'T00:00:00')
        return dt.getFullYear() === props.year && Math.floor(dt.getMonth() / 3) === i
      })
      const doc          = bestDoc(candidates)
      const currentQ     = Math.floor(currentMonth / 3)
      const isFuture     = props.year > currentYear || (props.year === currentYear && i > currentQ)
      const isCurrent    = props.year === currentYear && i === currentQ
      return buildPeriod(`${labels[i]} ${props.year}`, doc, isFuture, isCurrent, { quarterIndex: i })
    })
  }

  // ── SEMESTRAL ────────────────────────────────
  if (freq === 'SEMESTRAL') {
    return Array.from({ length: 2 }, (_, i) => {
      const candidates = props.documents.filter(d => {
        if (!d.emission_date) return false
        const dt = new Date(d.emission_date + 'T00:00:00')
        return dt.getFullYear() === props.year && Math.floor(dt.getMonth() / 6) === i
      })
      const doc        = bestDoc(candidates)
      const currentSem = Math.floor(currentMonth / 6)
      const isFuture   = props.year > currentYear || (props.year === currentYear && i > currentSem)
      const isCurrent  = props.year === currentYear && i === currentSem
      return buildPeriod(`${i === 0 ? '1er' : '2do'} Semestre ${props.year}`, doc, isFuture, isCurrent, {})
    })
  }

  // ── ANUAL ────────────────────────────────────
  if (freq === 'ANNUAL') {
    const candidates = props.documents.filter(d => {
      if (!d.emission_date) return false
      return new Date(d.emission_date + 'T00:00:00').getFullYear() === props.year
    })
    const doc      = bestDoc(candidates)
    const isFuture = props.year > currentYear
    return [buildPeriod(`Año ${props.year}`, doc, isFuture, props.year === currentYear, {})]
  }

  return []
})

/**
 * Construye un objeto de período estandarizado.
 * (Open/Closed: agregar nueva frecuencia sin tocar este helper)
 */
const buildPeriod = (label, doc, isFuture, isCurrent, extra) => {
  let statusLabel
  if (doc) {
    const s = doc.status
    if (s === 'VIGENTE' || s === 'PRESENTADO') statusLabel = 'Presentado'
    else if (s === 'TRAMITE') statusLabel = 'En Trámite'
    else statusLabel = 'Vencido'
  } else {
    statusLabel = isFuture ? 'Pendiente' : (isCurrent ? 'Falta' : 'No Presentado')
  }
  return { label, doc, isFuture, isCurrent, statusLabel, ...extra }
}

// ──────────────────────────────────────────────
// Contadores (Single Responsibility)
// ──────────────────────────────────────────────
/** Períodos ya transcurridos (incluyendo el actual) */
const passedPeriods = computed(() =>
  periods.value.filter(p => !p.isFuture).length
)

const uploadedCount = computed(() =>
  periods.value.filter(p => !!p.doc).length
)

const completionColor = computed(() => {
  if (passedPeriods.value === 0) return 'grey'
  const rate = uploadedCount.value / passedPeriods.value
  if (rate >= 1)   return 'success'
  if (rate >= 0.5) return 'warning'
  return 'error'
})

// ──────────────────────────────────────────────
// Helpers de estilo por período (Liskov: misma interfaz para todo período)
// ──────────────────────────────────────────────
const getPeriodStatusColor = (period) => {
  if (period.isFuture) return 'grey'
  if (!period.doc) return period.isCurrent ? 'warning' : 'error'
  const s = period.doc.status
  if (s === 'VIGENTE' || s === 'PRESENTADO') return 'success'
  if (s === 'TRAMITE') return 'warning'
  return 'error'
}

const getPeriodAvatarColor = (period) => getPeriodStatusColor(period)

const getPeriodIconColor = (period) => {
  if (period.isFuture) return 'grey'
  if (!period.doc) return period.isCurrent ? 'warning' : 'error'
  const s = period.doc.status
  if (s === 'VIGENTE' || s === 'PRESENTADO') return 'success'
  if (s === 'TRAMITE') return 'warning'
  return 'error'
}

const getPeriodIcon = (period) => {
  if (period.isFuture) return 'mdi-clock-outline'
  if (!period.doc) return period.isCurrent ? 'mdi-alert-outline' : 'mdi-close-circle-outline'
  const s = period.doc.status
  if (s === 'VIGENTE' || s === 'PRESENTADO') return 'mdi-check-circle'
  if (s === 'TRAMITE') return 'mdi-clock-outline'
  return 'mdi-alert-circle'
}
</script>

<style scoped>
.cursor-pointer { cursor: pointer; }
.opacity-50 { opacity: 0.5; }
</style>
