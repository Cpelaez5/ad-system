<template>
  <div
    class="fila-papel"
    :class="[`fila-papel--${estado.clave}`, { 'fila-papel--tocable': tocable }]"
    :data-papel-id="idPapel"
    :role="tocable ? 'button' : undefined"
    :tabindex="tocable ? 0 : undefined"
    @click="tocable && $emit('ver', doc)"
    @keydown.enter.self="tocable && $emit('ver', doc)"
  >
    <!-- Semáforo: color + ícono (el texto va al lado, nunca solo color) -->
    <span class="fila-papel__icono" :class="`fila-papel__icono--${tonoIcono}`" aria-hidden="true">
      <v-icon :icon="estado.semaforo.icono" size="22" />
    </span>

    <div class="fila-papel__texto">
      <div class="fila-papel__nombre">{{ nombre }}</div>
      <div class="fila-papel__estado" :class="`text-${tonoTexto}`">
        <span v-if="mostrarCategoria" class="fila-papel__categoria">{{ categoriaTitulo }} ·</span>
        {{ estado.semaforo.texto }}
        <span v-if="fechaVence" class="fila-papel__fecha">· {{ fechaVence }}</span>
      </div>
    </div>

    <div class="fila-papel__acciones" @click.stop>
      <!-- Papelera -->
      <template v-if="doc && papelera">
        <v-btn
          variant="tonal"
          color="success"
          prepend-icon="mdi-restore"
          class="text-none"
          :loading="restaurando"
          @click="$emit('restaurar', doc)"
        >
          Restaurar
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable">
            <v-list-item prepend-icon="mdi-delete-forever" base-color="error" title="Eliminar para siempre" @click="$emit('eliminarDefinitivo', doc)" />
          </v-list>
        </v-menu>
      </template>

      <!-- Normal: UNA acción clara + el resto en ⋮ -->
      <template v-else>
        <v-btn
          :variant="accionDestacada ? 'flat' : 'tonal'"
          :color="accionDestacada ? 'primary' : undefined"
          :prepend-icon="estado.accion.icono"
          class="text-none fila-papel__accion"
          @click="emitirAccion"
        >
          {{ estado.accion.texto }}
        </v-btn>
        <v-menu v-if="doc" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" aria-label="Más opciones" />
          </template>
          <v-list density="comfortable">
            <v-list-item prepend-icon="mdi-eye-outline" title="Ver" @click="$emit('ver', doc)" />
            <v-list-item prepend-icon="mdi-pencil-outline" title="Editar" @click="$emit('editar', doc)" />
            <v-list-item prepend-icon="mdi-delete-outline" base-color="error" title="Mover a la papelera" @click="$emit('eliminar', doc)" />
          </v-list>
        </v-menu>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { estadoPapel } from '@/utils/estadoPapel'
import { formatFechaCorta } from '@/utils/fechas'

/**
 * Fila de un papel del negocio (documento subido o requerido sin subir) en
 * Mis papeles. Capa de PRESENTACIÓN: no toca fiscalService; emite los mismos
 * eventos que antes (ver/editar/eliminar/subir/restaurar/eliminarDefinitivo).
 * Una sola acción visible (Renovar / Subir / Actualizar / Ver) según el estado;
 * ver, editar y papelera quedan en el menú ⋮.
 */
const props = defineProps({
  /** Documento fiscal ya cargado (registro de la BD). Null si es un pendiente. */
  doc: { type: Object, default: null },
  /** Tipo requerido aún no subido: { id, label, category, required }. Null si hay doc. */
  pendiente: { type: Object, default: null },
  /** Título de la categoría a mostrar (ej. "Legal"). Vacío = no mostrar. */
  categoriaTitulo: { type: String, default: '' },
  /** Modo papelera: Restaurar / Eliminar para siempre. */
  papelera: { type: Boolean, default: false },
  /** Spinner de "Restaurar" mientras se procesa. */
  restaurando: { type: Boolean, default: false },
  /** Ciclo del tipo de documento ('PERMANENT' | 'VIGENTE' | 'AdHoc' | …). Si es pendiente se toma de él. */
  frecuencia: { type: String, default: null },
})

const emit = defineEmits(['ver', 'editar', 'eliminar', 'subir', 'restaurar', 'eliminarDefinitivo'])

const estado = computed(() => estadoPapel({ doc: props.doc, pendiente: props.pendiente, frecuencia: props.frecuencia }))
const mostrarCategoria = computed(() => !!props.categoriaTitulo)
const tocable = computed(() => !!props.doc && !props.papelera)
const accionDestacada = computed(() => ['atender', 'falta', 'completar'].includes(estado.value.clave))
const idPapel = computed(() => (props.doc ? props.doc.id : `pendiente-${props.pendiente?.category}-${props.pendiente?.id}`))

const nombre = computed(() => {
  if (props.doc) return props.doc.name || 'Documento fiscal'
  if (props.pendiente) return props.pendiente.label
  return 'Documento fiscal'
})

const fechaVence = computed(() => {
  const fecha = props.doc?.expiration_date
  if (!fecha || !['atender', 'aldia'].includes(estado.value.clave)) return ''
  return `vence el ${formatFechaCorta(fecha)}`
})

const tonoIcono = computed(() => {
  const { clave, semaforo } = estado.value
  if (clave === 'falta' || clave === 'noaplica') return 'neutro'
  return semaforo.color === 'grey' ? 'success' : semaforo.color
})

const tonoTexto = computed(() => {
  const { clave, semaforo } = estado.value
  if (clave === 'atender') return semaforo.color === 'error' ? 'error' : 'warning-oscuro'
  if (clave === 'completar' || clave === 'tramite') return 'warning-oscuro'
  if (clave === 'aldia') return 'success'
  return 'medium-emphasis'
})

function emitirAccion() {
  const { evento } = estado.value.accion
  if (evento === 'subir') emit('subir', props.pendiente)
  else emit(evento, props.doc)
}
</script>

<style scoped>
.fila-papel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  min-height: 72px;
  transition: background-color var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.fila-papel--tocable {
  cursor: pointer;
}

.fila-papel--tocable:hover {
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.fila-papel--tocable:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.fila-papel__icono {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.fila-papel__icono--error { background: rgba(var(--v-theme-error), 0.1); color: rgb(var(--v-theme-error)); }
.fila-papel__icono--warning { background: rgba(224, 161, 0, 0.14); color: #9a6b00; }
.fila-papel__icono--success { background: rgba(var(--v-theme-success), 0.1); color: rgb(var(--v-theme-success)); }
.fila-papel__icono--neutro {
  background: transparent;
  color: rgba(var(--v-theme-on-surface), 0.55);
  border: 1.5px dashed rgba(var(--v-theme-on-surface), 0.3);
}

.fila-papel__texto {
  flex: 1 1 auto;
  min-width: 0;
}

.fila-papel__nombre {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}

.fila-papel__estado {
  margin-top: 3px;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.35;
}

.fila-papel__categoria,
.fila-papel__fecha {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 400;
}

.text-warning-oscuro { color: #8a5f00; }

.fila-papel__acciones {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.fila-papel__accion {
  min-width: 112px;
}

/* Teléfono: la acción baja a su propia línea, a todo el ancho y fácil de tocar */
@media (max-width: 599px) {
  .fila-papel {
    flex-wrap: wrap;
    row-gap: 10px;
  }
  .fila-papel__texto {
    flex: 1 1 calc(100% - 58px);
  }
  .fila-papel__acciones {
    flex: 1 1 100%;
    padding-left: 58px;
  }
  .fila-papel__acciones .fila-papel__accion,
  .fila-papel__acciones > .v-btn:first-child {
    flex: 1 1 auto;
  }
}

/* Al tocar su segmento en la barra de avance, la fila se resalta un momento */
.fila-papel--resaltada {
  background: rgba(var(--v-theme-primary), 0.1);
}

@media (prefers-reduced-motion: reduce) {
  .fila-papel { transition: none; }
}
</style>
