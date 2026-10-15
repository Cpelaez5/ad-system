<template>
  <AyudaMarco>
    <section class="ayuda-inicio__encabezado">
      <h1 class="ayuda-inicio__titulo">¿Con qué te ayudamos?</h1>
      <p class="ayuda-inicio__sub">Guías cortas, paso a paso, para usar AD System desde tu teléfono.</p>
      <v-text-field
        v-model="consulta"
        class="ayuda-inicio__buscador"
        variant="outlined"
        density="comfortable"
        rounded="xl"
        hide-details
        clearable
        placeholder="Escribe aquí, por ejemplo: tasa, factura, sello"
        prepend-inner-icon="mdi-magnify"
        aria-label="Buscar en la ayuda"
        data-testid="ayuda-buscador"
        type="search"
        enterkeyhint="search"
      />
    </section>

    <v-skeleton-loader v-if="cargando" type="card, card, card" class="bg-transparent" />

    <AvisoAmable
      v-else-if="error"
      tipo="error"
      titulo="No pudimos cargar la ayuda"
      :mensaje="error"
      texto-accion="Reintentar"
      @accion="cargar"
    />

    <template v-else>
      <p v-if="consulta && !resultados.length" class="ayuda-inicio__vacio" role="status" data-testid="ayuda-sin-resultados">
        No encontramos nada para «{{ consulta }}». Prueba con otra palabra, o mira todas las guías.
        <v-btn variant="text" color="primary" class="text-none" @click="consulta = ''">Ver todas</v-btn>
      </p>

      <p v-else-if="consulta" class="ayuda-inicio__conteo" role="status">
        {{ resultados.length }} {{ resultados.length === 1 ? 'guía' : 'guías' }} para «{{ consulta }}»
      </p>

      <ul class="ayuda-inicio__rejilla" data-testid="ayuda-tarjetas">
        <li v-for="a in resultados" :key="a.slug">
          <router-link :to="rutaArticulo(a.slug)" class="ayuda-tarjeta" :data-testid="`ayuda-tarjeta-${a.slug}`">
            <span class="ayuda-tarjeta__icono" aria-hidden="true">
              <v-icon :icon="iconoArticulo(a.slug)" size="26" />
            </span>
            <span class="ayuda-tarjeta__texto">
              <span class="ayuda-tarjeta__titulo">{{ a.titulo }}</span>
              <span class="ayuda-tarjeta__resumen">{{ a.resumen }}</span>
            </span>
            <v-icon icon="mdi-chevron-right" class="ayuda-tarjeta__flecha" aria-hidden="true" />
          </router-link>
        </li>
      </ul>
    </template>
  </AyudaMarco>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AyudaMarco from '@/components/ayuda/AyudaMarco.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { cargarArticulos } from '@/services/ayudaService.js'
import { buscarArticulos, iconoArticulo, rutaArticulo } from '@/utils/ayudaBusqueda.js'

const articulos = ref([])
const cargando = ref(true)
const error = ref('')
const consulta = ref('')

const resultados = computed(() => buscarArticulos(articulos.value, consulta.value || ''))

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    articulos.value = await cargarArticulos()
  } catch (e) {
    error.value = 'Revisa tu conexión e intenta de nuevo.'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.ayuda-inicio__encabezado { padding: 16px 0 24px; max-width: 760px; }
.ayuda-inicio__titulo { font-size: clamp(1.9rem, 6vw, 2.8rem); line-height: 1.15; font-weight: 700; margin: 0 0 8px; }
.ayuda-inicio__sub { font-size: 1.15rem; margin: 0 0 20px; color: rgba(var(--v-theme-on-surface), 0.76); }
.ayuda-inicio__buscador :deep(.v-field) { font-size: 1.15rem; min-height: 64px; background: rgb(var(--v-theme-surface)); }
.ayuda-inicio__buscador :deep(input) { min-height: 40px; }
.ayuda-inicio__conteo, .ayuda-inicio__vacio { font-size: 1.05rem; margin: 0 0 16px; }
.ayuda-inicio__rejilla {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 640px) { .ayuda-inicio__rejilla { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .ayuda-inicio__rejilla { grid-template-columns: repeat(3, 1fr); } }
.ayuda-tarjeta {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 100%;
  min-height: 88px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
  transition: border-color var(--ad-move-rapido, 150ms) ease, background var(--ad-move-rapido, 150ms) ease;
}
.ayuda-tarjeta:hover, .ayuda-tarjeta:focus-visible { border-color: rgb(var(--v-theme-primary)); }
.ayuda-tarjeta:focus-visible { outline: 3px solid rgba(var(--v-theme-primary), 0.4); outline-offset: 2px; }
.ayuda-tarjeta__icono {
  flex: 0 0 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.ayuda-tarjeta__texto { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ayuda-tarjeta__titulo { font-size: 1.1rem; font-weight: 700; line-height: 1.3; }
.ayuda-tarjeta__resumen { font-size: 0.98rem; line-height: 1.4; color: rgba(var(--v-theme-on-surface), 0.72); }
.ayuda-tarjeta__flecha { flex: 0 0 auto; opacity: 0.5; }
@media (prefers-reduced-motion: reduce) { .ayuda-tarjeta { transition: none; } }
</style>
