<template>
  <div v-if="guias.length" class="guias" role="list" aria-label="Guías que pueden ayudarte">
    <p class="guias__titulo">{{ titulo }}</p>
    <a
      v-for="g in guias"
      :key="g.slug"
      class="guias__enlace"
      role="listitem"
      :href="rutaArticulo(g.slug)"
      @click.prevent="$emit('abrir', rutaArticulo(g.slug))"
    >
      <v-icon :icon="iconoArticulo(g.slug)" size="22" class="guias__icono" />
      <span class="guias__nombre">{{ g.titulo }}</span>
      <v-icon icon="mdi-chevron-right" size="22" />
    </a>
  </div>
</template>

<script setup>
/** SugerenciasGuias — capa 1: las guías de /ayuda que coinciden con lo que escribe. */
import { iconoArticulo, rutaArticulo } from '@/utils/ayudaBusqueda.js'

defineProps({
  /** [{ slug, titulo }] */
  guias: { type: Array, default: () => [] },
  titulo: { type: String, default: 'Esto puede ayudarte' },
})
defineEmits(['abrir'])
</script>

<style scoped>
.guias { display: flex; flex-direction: column; gap: 6px; }
.guias__titulo { margin: 0; font-size: 0.9375rem; font-weight: 700; }
.guias__enlace {
  display: flex; align-items: center; gap: 10px;
  min-height: 48px; padding: 8px 12px;
  border-radius: 12px; text-decoration: none; color: inherit;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}
.guias__enlace:hover, .guias__enlace:focus-visible { border-color: rgba(var(--v-theme-primary), 0.6); }
.guias__icono { color: rgb(var(--v-theme-primary)); }
.guias__nombre { flex: 1; font-weight: 600; font-size: 1rem; }
</style>
