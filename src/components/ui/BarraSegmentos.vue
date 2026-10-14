<template>
  <div class="barra-segmentos" :class="{ 'barra-segmentos--animada': animar }" role="list" :aria-label="etiqueta">
    <v-tooltip v-for="(seg, i) in segmentos" :key="seg.id" location="top" :text="seg.etiqueta" :disabled="!seg.etiqueta">
      <template #activator="{ props: tooltipProps }">
        <button
          v-bind="tooltipProps"
          type="button"
          role="listitem"
          class="barra-segmentos__segmento"
          :class="`barra-segmentos__segmento--${seg.tono || 'falta'}`"
          :style="{ '--i': i }"
          :aria-label="seg.etiqueta"
          :tabindex="interactiva ? 0 : -1"
          @click="interactiva && $emit('elegir', seg)"
        />
      </template>
    </v-tooltip>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { prefiereMovimientoReducido } from './movimiento.js'

/**
 * BarraSegmentos — avance como fila de segmentos, uno por elemento (papel,
 * paso, producto…). Tonos: 'success' (listo), 'error', 'warning', 'falta'
 * (gris rayado = aún no hecho). Se "llena" en secuencia al montar (una vez;
 * nada si la persona prefiere menos movimiento). Tocar un segmento emite
 * `elegir` con ese segmento si `interactiva`.
 */
defineProps({
  /** [{ id, tono: 'success'|'error'|'warning'|'falta', etiqueta }] */
  segmentos: { type: Array, default: () => [] },
  /** Texto accesible del conjunto, p. ej. "3 de 10 papeles al día". */
  etiqueta: { type: String, default: '' },
  interactiva: { type: Boolean, default: true },
})
defineEmits(['elegir'])

const animar = ref(false)
onMounted(() => { animar.value = !prefiereMovimientoReducido() })
</script>

<style scoped>
.barra-segmentos {
  display: flex;
  gap: 4px;
  height: 18px;
}

.barra-segmentos__segmento {
  flex: 1 1 0;
  min-width: 6px;
  border: 0;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  transition: transform var(--ad-move-rapido) var(--ad-move-curva-entrada), filter var(--ad-move-rapido) ease;
}

.barra-segmentos__segmento:hover,
.barra-segmentos__segmento:focus-visible {
  transform: scaleY(1.35);
  filter: brightness(0.92);
}

.barra-segmentos__segmento:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.barra-segmentos__segmento--success { background: rgb(var(--v-theme-success)); }
.barra-segmentos__segmento--error { background: rgb(var(--v-theme-error)); }
.barra-segmentos__segmento--warning { background: #e0a100; }
.barra-segmentos__segmento--falta { background: repeating-linear-gradient(135deg, #d4d6da 0 4px, #e9eaec 4px 8px); }

.barra-segmentos--animada .barra-segmentos__segmento {
  animation: llenar-segmento 420ms var(--ad-move-curva-entrada) both;
  animation-delay: calc(var(--i) * 22ms);
}

@keyframes llenar-segmento {
  from { opacity: 0; transform: scaleY(0.2); }
  to { opacity: 1; transform: scaleY(1); }
}

@media (prefers-reduced-motion: reduce) {
  .barra-segmentos__segmento { transition: none; animation: none !important; }
}
</style>
