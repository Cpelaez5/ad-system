<template>
  <span class="ad-ia boton-ia" :class="{ 'ad-ia--bloque': block }" data-testid="boton-ia">
    <v-btn
      v-bind="$attrs"
      :block="block"
      class="text-none boton-ia__btn"
    >
      <template #prepend>
        <!-- Ícono propio de la función (cámara, estante…) que al pasar el mouse o enfocar
             se transforma en los destellos de la IA. Sin `icono`, solo destellos. -->
        <span class="boton-ia__iconos" aria-hidden="true">
          <v-icon v-if="icono" :icon="icono" class="boton-ia__icono boton-ia__icono--propio" />
          <v-icon icon="mdi-creation" class="boton-ia__icono" :class="{ 'boton-ia__icono--ia': icono }" />
        </span>
      </template>
      <slot />
    </v-btn>
  </span>
</template>

<script setup>
/**
 * BotonIA — botón de cualquier función que usa IA: borde animado de la IA (.ad-ia) y
 * el ícono de la función, que al hover/foco cambia a los destellos (`mdi-creation`).
 * Todo atributo (variant, size, density, loading, disabled, @click...) pasa al v-btn,
 * así que mide lo mismo que un v-btn normal con esos atributos.
 * Ver docs/mvp/diseno/identidad-ia.md.
 */
defineOptions({ name: 'BotonIA', inheritAttrs: false })

defineProps({
  /** Ocupa todo el ancho. */
  block: { type: Boolean, default: false },
  /** Ícono propio de la función (p. ej. 'mdi-camera-outline'). Al hover pasa a destellos. */
  icono: { type: String, default: null },
})
</script>

<style scoped>
/* Sin altura propia: respeta size/density como cualquier v-btn, para que quede del
   mismo alto que los botones sin IA de al lado (solo cambia el borde y el ícono). */
.boton-ia { --ad-ia-radio: 8px; vertical-align: middle; }

.boton-ia__iconos {
  position: relative;
  display: inline-grid;
}
.boton-ia__icono {
  grid-area: 1 / 1;
  transition: opacity 180ms ease-out, transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.boton-ia__icono--ia {
  opacity: 0;
  transform: scale(0.6) rotate(-45deg);
}
.boton-ia__btn:hover .boton-ia__icono--propio,
.boton-ia__btn:focus-visible .boton-ia__icono--propio {
  opacity: 0;
  transform: scale(0.6) rotate(45deg);
}
.boton-ia__btn:hover .boton-ia__icono--ia,
.boton-ia__btn:focus-visible .boton-ia__icono--ia {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .boton-ia__icono { transition: none; }
}
</style>
