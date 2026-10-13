<template>
  <v-card
    class="rounded-xl mb-3 tarjeta-doc-fiscal"
    :class="`tarjeta-doc-fiscal--${semaforo.color}`"
    variant="outlined"
    :ripple="!!doc"
    @click="doc && !papelera ? $emit('ver', doc) : null"
  >
    <div class="d-flex align-start pa-4" style="gap: 12px">
      <!-- Ícono de estado: color + ícono, nunca solo color -->
      <v-avatar :color="semaforo.color" variant="tonal" size="44" class="flex-shrink-0">
        <v-icon :icon="semaforo.icono" :color="semaforo.color" size="22" />
      </v-avatar>

      <div class="flex-grow-1" style="min-width: 0">
        <!-- Categoría (opcional, útil en listas mezcladas como "Atiende esto primero") -->
        <div v-if="mostrarCategoria" class="text-caption text-grey-darken-1 mb-1">
          {{ categoriaTitulo }}
        </div>

        <div class="text-body-1 font-weight-bold text-secondary text-truncate">
          {{ nombre }}
        </div>

        <!-- Texto del semáforo: SIEMPRE visible, no solo el color -->
        <div class="d-flex align-center flex-wrap mt-1" style="gap: 6px">
          <v-chip
            size="small"
            :color="semaforo.color"
            variant="tonal"
            class="font-weight-medium"
          >
            <v-icon start size="small" :icon="semaforo.icono" />
            {{ semaforo.texto }}
          </v-chip>
        </div>
      </div>

      <!-- Acciones -->
      <div class="d-flex flex-column align-end flex-shrink-0" style="gap: 4px">
        <template v-if="doc && papelera">
          <v-btn
            icon="mdi-restore"
            variant="text"
            size="small"
            color="success"
            aria-label="Restaurar"
            :loading="restaurando"
            @click.stop="$emit('restaurar', doc)"
          />
          <v-btn
            icon="mdi-delete-forever"
            variant="text"
            size="small"
            color="error"
            aria-label="Eliminar definitivamente"
            @click.stop="$emit('eliminarDefinitivo', doc)"
          />
        </template>
        <template v-else-if="doc">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            color="info"
            aria-label="Ver detalle"
            @click.stop="$emit('ver', doc)"
          />
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            color="grey-darken-1"
            aria-label="Editar"
            @click.stop="$emit('editar', doc)"
          />
          <v-btn
            icon="mdi-delete"
            variant="text"
            size="small"
            color="error"
            aria-label="Mover a papelera"
            @click.stop="$emit('eliminar', doc)"
          />
        </template>
        <template v-else-if="esPendiente">
          <BotonAccion
            texto="Subir ahora"
            tamano="normal"
            ancho="auto"
            variante="secundaria"
            icono="mdi-upload"
            @click.stop="$emit('subir', pendiente)"
          />
        </template>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import BotonAccion from '@/components/ui/BotonAccion.vue'
import { semaforoDocumento } from '@/utils/semaforoDocumento'

/**
 * TarjetaDocumentoFiscal — una tarjeta por documento fiscal (o por un
 * documento requerido que todavía no se ha subido), con semáforo según
 * examples/expediente-fiscal-360.md: color + ícono + texto, nunca solo
 * color. Es una capa de PRESENTACIÓN: no toca fiscalService ni el flujo
 * de guardado, solo emite eventos que la vista padre resuelve igual que
 * antes (ver/editar/eliminar/subir).
 */
const props = defineProps({
  /** Documento fiscal ya cargado (registro de la BD). Null si es un pendiente. */
  doc: { type: Object, default: null },
  /** Tipo requerido aún no subido: { id, label, category, required }. Null si hay doc. */
  pendiente: { type: Object, default: null },
  /** Título de la categoría a mostrar (ej. "Legal"). Vacío = no mostrar. */
  categoriaTitulo: { type: String, default: '' },
  /** Modo papelera: cambia las acciones a Restaurar / Eliminar definitivamente. */
  papelera: { type: Boolean, default: false },
  /** Muestra el spinner de "Restaurar" mientras se procesa. */
  restaurando: { type: Boolean, default: false }
})

defineEmits(['ver', 'editar', 'eliminar', 'subir', 'restaurar', 'eliminarDefinitivo'])

const esPendiente = computed(() => !props.doc && !!props.pendiente)
const mostrarCategoria = computed(() => !!props.categoriaTitulo)

const nombre = computed(() => {
  if (props.doc) return props.doc.name || 'Documento fiscal'
  if (props.pendiente) return props.pendiente.label
  return 'Documento fiscal'
})

/**
 * Semáforo del documento. Reglas:
 * - NO_APLICA → gris, "No aplica a tu negocio" (no es una fecha, es una decisión).
 * - TRAMITE → amarillo, "En trámite" (todavía no hay fecha de vencimiento real).
 * - Pendiente (nunca subido) → amarillo, "Aún no lo has subido".
 * - Resto (VIGENTE/PRESENTADO/VENCIDO) → semaforoDocumento() puro por fechas.
 */
const semaforo = computed(() => {
  if (esPendiente.value) {
    return { color: 'warning', icono: 'mdi-upload-outline', texto: 'Falta subir este documento' }
  }
  if (!props.doc) {
    return { color: 'grey', icono: 'mdi-file-document-outline', texto: 'Sin información' }
  }
  if (props.doc.status === 'NO_APLICA') {
    return { color: 'grey', icono: 'mdi-minus-circle-outline', texto: 'No aplica a tu negocio' }
  }
  if (props.doc.status === 'TRAMITE') {
    return { color: 'warning', icono: 'mdi-clock-outline', texto: 'En trámite' }
  }
  return semaforoDocumento(props.doc.emission_date, props.doc.expiration_date)
})
</script>

<style scoped>
.tarjeta-doc-fiscal {
  cursor: default;
  border-width: 1px;
}
.tarjeta-doc-fiscal[class*='cursor-pointer'],
.tarjeta-doc-fiscal {
  transition: border-color 0.15s ease;
}
</style>
