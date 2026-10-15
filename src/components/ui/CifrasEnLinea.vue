<template>
  <div class="cifras-en-linea" role="list">
    <div v-for="c in cifras" :key="c.clave" class="cifras-en-linea__item" role="listitem" :data-testid="`cifra-${c.clave}`">
      <div class="cifras-en-linea__valor" :class="{ 'cifras-en-linea__valor--alerta': c.alerta }">{{ cargando ? '…' : c.valor }}</div>
      <div class="cifras-en-linea__texto">{{ c.texto }}</div>
    </div>
  </div>
</template>

<script setup>
/**
 * CifrasEnLinea — 3 a 6 cifras clave sin tarjetas de colores: cada una es un
 * número grande y su texto en llano, sobre una sola superficie con líneas
 * divisorias (2 columnas en el teléfono, 3 desde 720px). `alerta` pinta la
 * cifra con el color de advertencia del tema (algo que requiere atención).
 * Se coloca dentro de una `SeccionLista` o suelta. Solo usa colores del tema:
 * se ve bien en claro y en oscuro.
 */
defineProps({
  /** [{ clave, valor, texto, alerta? }] */
  cifras: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
})
</script>

<style scoped>
.cifras-en-linea { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 720px) { .cifras-en-linea { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.cifras-en-linea__item { padding: 16px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.cifras-en-linea__valor { font-size: 1.75rem; font-weight: 700; line-height: 1.15; font-variant-numeric: tabular-nums; }
.cifras-en-linea__valor--alerta { color: rgb(var(--v-theme-warning)); }
.cifras-en-linea__texto { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); }
</style>
