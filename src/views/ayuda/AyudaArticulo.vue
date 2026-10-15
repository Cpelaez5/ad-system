<template>
  <AyudaMarco>
    <router-link to="/ayuda" class="ayuda-volver" data-testid="ayuda-volver">
      <v-icon icon="mdi-arrow-left" size="20" aria-hidden="true" /> Todas las guías
    </router-link>

    <v-skeleton-loader v-if="cargando" type="heading, paragraph, paragraph" class="bg-transparent" />

    <AvisoAmable
      v-else-if="error"
      tipo="error"
      titulo="No pudimos cargar esta guía"
      :mensaje="error"
      texto-accion="Reintentar"
      @accion="cargar"
    />

    <div v-else-if="!articulo" class="ayuda-articulo__noexiste" data-testid="ayuda-no-existe">
      <h1>No encontramos esa guía</h1>
      <p>Puede que el enlace esté viejo. Mira todas las guías o búscala por palabras.</p>
      <v-btn to="/ayuda" color="primary" variant="flat" size="large" class="text-none">Ir al centro de ayuda</v-btn>
    </div>

    <div v-else class="ayuda-articulo">
      <aside v-if="indice.length >= 3" class="ayuda-articulo__indice" aria-label="En esta guía" data-testid="ayuda-indice">
        <details :open="esAncho">
        <summary class="ayuda-articulo__indice-titulo">En esta guía</summary>
        <ul>
          <li v-for="h in indice" :key="h.id" :class="{ 'ayuda-articulo__indice-sub': h.nivel === 3 }">
            <a :href="`#${h.id}`" @click.prevent="irA(h.id)">{{ h.texto }}</a>
          </li>
        </ul>
        </details>
      </aside>

      <article class="ayuda-articulo__cuerpo">
        <ContenidoArticulo :html="html" />
        <ValoracionArticulo />
      </article>
    </div>
  </AyudaMarco>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AyudaMarco from '@/components/ayuda/AyudaMarco.vue'
import ContenidoArticulo from '@/components/ayuda/ContenidoArticulo.vue'
import ValoracionArticulo from '@/components/ayuda/ValoracionArticulo.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { obtenerArticulo, conDominioReal } from '@/services/ayudaService.js'
import { renderizarMarkdown } from '@/utils/ayudaMarkdown.js'

const route = useRoute()
const articulo = ref(null)
const cargando = ref(true)
const error = ref('')
const esAncho = typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 960px)').matches

const renderizado = computed(() => (articulo.value ? renderizarMarkdown(conDominioReal(articulo.value.cuerpo)) : { html: '', indice: [] }))
const html = computed(() => renderizado.value.html)
const indice = computed(() => renderizado.value.indice)

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    articulo.value = await obtenerArticulo(String(route.params.slug || ''))
    if (articulo.value) document.title = `${articulo.value.titulo} | Ayuda de AD System`
  } catch (e) {
    error.value = 'Revisa tu conexión e intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}

function irA(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

watch(() => route.params.slug, cargar)
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
.ayuda-articulo { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: start; }
.ayuda-articulo__indice {
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.ayuda-articulo__indice-titulo { font-weight: 700; min-height: 40px; display: flex; align-items: center; cursor: pointer; }
.ayuda-articulo__indice ul { list-style: none; margin: 0; padding: 0; }
.ayuda-articulo__indice li { margin: 0; }
.ayuda-articulo__indice a {
  display: block;
  padding: 10px 0;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}
.ayuda-articulo__indice a:hover { color: rgb(var(--v-theme-primary)); }
.ayuda-articulo__indice-sub a { padding-left: 16px; font-size: 0.95rem; }
.ayuda-articulo__noexiste { max-width: 560px; padding: 24px 0; }
.ayuda-articulo__noexiste h1 { font-size: 1.8rem; margin: 0 0 8px; }
@media (min-width: 960px) {
  .ayuda-articulo { grid-template-columns: 260px minmax(0, 1fr); gap: 40px; }
  .ayuda-articulo__indice { position: sticky; top: 84px; }
}
</style>
