<template>
  <section class="retenciones-municipales" data-testid="retenciones-municipales">
    <header class="retenciones-municipales__cabecera">
      <h2 class="retenciones-municipales__titulo">Retenciones municipales</h2>
      <p class="retenciones-municipales__ayuda">
        Los códigos de actividad y el porcentaje que aplican a tu municipio. Los administra tu contador.
      </p>
    </header>

    <div v-if="cargando" aria-busy="true">
      <v-skeleton-loader type="list-item-two-line, list-item-two-line" />
    </div>

    <template v-else>
      <p v-if="!municipio" class="retenciones-municipales__aviso" data-testid="retenciones-sin-municipio">
        <v-icon icon="mdi-information-outline" size="20" class="mr-1" />
        Elige tu municipio en <strong>Datos de la empresa</strong> para ver tus códigos.
      </p>

      <template v-else>
        <p class="retenciones-municipales__municipio" data-testid="retenciones-municipio">
          <v-icon icon="mdi-city" size="20" class="mr-1" />
          <span>Tu municipio: <strong>{{ nombreMunicipio }}</strong></span>
        </p>

        <ul v-if="conceptos.length" class="retenciones-municipales__lista" data-testid="retenciones-lista">
          <li v-for="c in visibles" :key="c.id" class="retenciones-municipales__fila">
            <span class="retenciones-municipales__pct">{{ pct(c.porcentaje) }}</span>
            <span class="retenciones-municipales__texto">
              <strong>{{ c.codigo }}</strong>
              <span>{{ c.descripcion }}</span>
            </span>
          </li>
        </ul>
        <p v-else-if="!error" class="retenciones-municipales__aviso">
          Todavía no hay códigos cargados para tu municipio.
        </p>
        <p v-if="error" class="retenciones-municipales__aviso">{{ error }}</p>
      </template>

      <div class="retenciones-municipales__acciones">
        <v-btn variant="tonal" color="primary" class="text-none" prepend-icon="mdi-format-list-bulleted" to="/municipal-settings" data-testid="retenciones-ver-todos">
          Ver todos los códigos
        </v-btn>
        <v-btn variant="text" class="text-none" prepend-icon="mdi-chat-question-outline" data-testid="retenciones-no-encuentro" @click="pedirAyuda">
          No encuentro mi código
        </v-btn>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import municipalConceptsService, { resolverMunicipio } from '@/services/municipalConceptsService'

const props = defineProps({
  /** Municipio del negocio tal como está guardado (nombre o id). */
  municipio: { type: String, default: '' },
  estado: { type: String, default: '' },
  /** Cuántos códigos se muestran antes de "Ver todos". */
  maximo: { type: Number, default: 5 },
})

const cargando = ref(true)
const error = ref('')
const conceptos = ref([])
const municipioResuelto = ref(null)

const nombreMunicipio = computed(() => municipioResuelto.value?.nombre || props.municipio)
const visibles = computed(() => conceptos.value.slice(0, props.maximo))
const pct = (p) => `${Number(p).toLocaleString('es-VE', { maximumFractionDigits: 2 })} %`

async function cargar() {
  cargando.value = true
  error.value = ''
  conceptos.value = []
  municipioResuelto.value = null
  try {
    if (props.municipio) {
      const m = await municipalConceptsService.getMunicipios()
      municipioResuelto.value = resolverMunicipio(props.municipio, m.data || [], { estado: props.estado })
      const c = await municipalConceptsService.getConcepts({ municipioId: municipioResuelto.value?.id })
      if (!c.success) throw new Error(c.error)
      conceptos.value = c.data
    }
  } catch (e) {
    error.value = 'No pudimos cargar los códigos. Intenta de nuevo en un momento.'
  } finally {
    cargando.value = false
  }
}

function pedirAyuda() {
  window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
}

onMounted(cargar)
watch(() => props.municipio, cargar)
</script>

<style scoped>
.retenciones-municipales {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  padding: 22px 24px;
  margin-bottom: 20px;
}
@media (max-width: 599px) {
  .retenciones-municipales { padding: 18px; }
}
.retenciones-municipales__cabecera { margin-bottom: 18px; }
.retenciones-municipales__titulo {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
}
.retenciones-municipales__ayuda {
  margin: 4px 0 0;
  font-size: 0.92rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
  max-width: 68ch;
}
.retenciones-municipales__municipio,
.retenciones-municipales__aviso {
  display: flex;
  align-items: center;
  margin: 0 0 12px;
  font-size: 1rem;
}
.retenciones-municipales__lista {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  overflow: hidden;
}
.retenciones-municipales__fila {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}
.retenciones-municipales__fila + .retenciones-municipales__fila {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.retenciones-municipales__pct {
  flex: 0 0 auto;
  min-width: 60px;
  text-align: center;
  padding: 8px 6px;
  border-radius: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.retenciones-municipales__texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}
.retenciones-municipales__acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
@media (max-width: 599px) {
  .retenciones-municipales__acciones .v-btn { width: 100%; }
}
</style>
