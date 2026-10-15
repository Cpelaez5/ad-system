<template>
  <AyudaMarco>
    <router-link to="/ayuda" class="ayuda-volver" data-testid="ayuda-volver">
      <v-icon icon="mdi-arrow-left" size="20" aria-hidden="true" /> Todas las guías
    </router-link>

    <v-skeleton-loader v-if="cargando" type="heading, paragraph, paragraph" class="bg-transparent" />

    <AvisoAmable
      v-else-if="error || !articulo"
      tipo="error"
      titulo="No pudimos cargar la documentación"
      :mensaje="error || 'No encontramos el documento de la API.'"
      texto-accion="Reintentar"
      @accion="cargar"
    />

    <div v-else class="ayuda-api">
      <v-chip size="small" variant="tonal" color="secondary" prepend-icon="mdi-code-braces" class="mb-3">Para programadores</v-chip>
      <div class="ayuda-api__url" data-testid="ayuda-api-url">
        <span class="ayuda-api__url-etiqueta">Dirección base</span>
        <code>{{ urlBase }}</code>
      </div>
      <ContenidoArticulo :html="html" />
      <ValoracionArticulo />
    </div>
  </AyudaMarco>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AyudaMarco from '@/components/ayuda/AyudaMarco.vue'
import ContenidoArticulo from '@/components/ayuda/ContenidoArticulo.vue'
import ValoracionArticulo from '@/components/ayuda/ValoracionArticulo.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { obtenerArticulo, conDominioReal, urlBaseApi } from '@/services/ayudaService.js'
import { renderizarMarkdown } from '@/utils/ayudaMarkdown.js'

const articulo = ref(null)
const cargando = ref(true)
const error = ref('')

const urlBase = computed(() => `${urlBaseApi()}/functions/v1/api-productos`)
const html = computed(() => (articulo.value ? renderizarMarkdown(conDominioReal(articulo.value.cuerpo)).html : ''))

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    articulo.value = await obtenerArticulo('api')
    document.title = 'API de productos | Ayuda de AD System'
  } catch (e) {
    error.value = 'Revisa tu conexión e intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.ayuda-volver {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  margin-bottom: 8px;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.ayuda-volver:hover { text-decoration: underline; }
.ayuda-api__url {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 72ch;
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 14px;
  background: rgb(var(--v-theme-surface));
}
.ayuda-api__url-etiqueta { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.72); }
.ayuda-api__url code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; overflow-wrap: anywhere; font-size: 0.98rem; }
</style>
