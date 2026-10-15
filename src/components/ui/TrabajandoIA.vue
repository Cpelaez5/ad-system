<template>
  <div class="trabajando-ia" :class="{ 'ad-ia--trabajando': activo }" data-testid="trabajando-ia">
    <slot />
    <p class="trabajando-ia__mensaje" role="status" aria-live="polite">
      <v-icon icon="mdi-creation" size="18" class="trabajando-ia__icono" aria-hidden="true" />
      <span>{{ mensaje }}</span>
    </p>
  </div>
</template>

<script setup>
/**
 * TrabajandoIA — velo con barrido de luz mientras la IA trabaja, con un
 * mensaje amable. El contenido (una foto, un bloque) va en el slot.
 * El barrido se apaga solo con prefers-reduced-motion (ver ia.css); el
 * mensaje queda siempre, así el estado no depende de la animación.
 */
defineOptions({ name: 'TrabajandoIA' })

defineProps({
  mensaje: { type: String, default: 'Un momento, estamos leyendo…' },
  activo: { type: Boolean, default: true },
})
</script>

<style scoped>
.trabajando-ia { padding: 16px; text-align: center; }
.trabajando-ia__mensaje {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 8px 0 0;
  font-size: 1rem;
  font-weight: 500;
}
.trabajando-ia__icono { color: var(--ad-ia-1); }
</style>
