<template>
  <div class="barra-papeles" :class="{ 'barra-papeles--animada': animar }">
    <div class="barra-papeles__titulo">
      <span class="barra-papeles__cifra">{{ resumen.alDia }}</span>
      <span class="barra-papeles__de">de {{ resumen.total }}</span>
      <span class="barra-papeles__texto">{{ resumen.total === 1 ? 'papel al día' : 'papeles al día' }}</span>
    </div>

    <!-- Un segmento por papel: el negocio "se ve" completo o con huecos -->
    <div class="barra-papeles__segmentos" role="list" :aria-label="`${resumen.alDia} de ${resumen.total} papeles al día`">
      <v-tooltip
        v-for="(papel, i) in visibles"
        :key="papel.id"
        location="top"
        :text="`${papel.nombre}: ${papel.estado.semaforo.texto}`"
      >
        <template #activator="{ props: tooltipProps }">
          <button
            v-bind="tooltipProps"
            type="button"
            role="listitem"
            class="barra-papeles__segmento"
            :class="`barra-papeles__segmento--${tono(papel)}`"
            :style="{ '--i': i }"
            :aria-label="`${papel.nombre}: ${papel.estado.semaforo.texto}`"
            @click="$emit('elegir', papel)"
          />
        </template>
      </v-tooltip>
    </div>

    <ul class="barra-papeles__leyenda">
      <li v-if="resumen.atender"><span class="punto punto--error" />{{ resumen.atender }} por atender</li>
      <li v-if="resumen.falta"><span class="punto punto--falta" />{{ resumen.falta }} por subir</li>
      <li v-if="resumen.completar"><span class="punto punto--warning" />{{ resumen.completar }} sin fecha de vencimiento</li>
      <li v-if="resumen.tramite"><span class="punto punto--warning" />{{ resumen.tramite }} en trámite</li>
      <li><span class="punto punto--success" />{{ resumen.alDia }} al día</li>
    </ul>

    <p class="barra-papeles__mensaje">{{ mensaje }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { resumenPapeles } from '@/utils/estadoPapel'
import { prefiereMovimientoReducido } from '@/components/ui/movimiento.js'

/**
 * BarraPapeles — avance del expediente como una fila de segmentos, uno por papel
 * (los "no aplica" no cuentan). Verde = al día, rojo/ámbar = por atender, gris
 * punteado = falta subirlo. Tocar un segmento lleva a ese papel (`elegir`).
 * Única animación de la vista: los segmentos se llenan en secuencia al cargar.
 */
const props = defineProps({
  /** [{ id, nombre, estado: estadoPapel(...) }] */
  papeles: { type: Array, default: () => [] },
})
defineEmits(['elegir'])

const visibles = computed(() => props.papeles.filter((p) => p.estado.clave !== 'noaplica'))
const resumen = computed(() => resumenPapeles(props.papeles))

function tono(papel) {
  const { clave, semaforo } = papel.estado
  if (clave === 'aldia') return 'success'
  if (clave === 'falta') return 'falta'
  if (clave === 'tramite' || clave === 'completar') return 'warning'
  return semaforo.color === 'error' ? 'error' : 'warning'
}

// Frase que motiva según el avance (sin regaños: lo que falta y lo que gana)
const mensaje = computed(() => {
  const { porcentaje, porResolver, total } = resumen.value
  if (!total) return 'Sube tu primer papel y empieza a armar el expediente de tu negocio.'
  if (porResolver === 0) return 'Excelente: tu negocio está en regla. Te avisaremos antes de cualquier vencimiento.'
  if (porcentaje >= 70) return `¡Ya casi! Te ${porResolver === 1 ? 'falta 1 papel' : `faltan ${porResolver} papeles`} para tener tu negocio en regla.`
  return `Cada papel al día te protege de multas y te deja listo ante cualquier inspección. Vas ${porcentaje}%.`
})

const animar = ref(false)
onMounted(() => {
  animar.value = !prefiereMovimientoReducido()
})
</script>

<style scoped>
.barra-papeles__titulo {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.barra-papeles__cifra {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-on-surface));
}

.barra-papeles__de {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.barra-papeles__texto {
  font-size: 1.05rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.barra-papeles__segmentos {
  display: flex;
  gap: 4px;
  height: 18px;
}

.barra-papeles__segmento {
  flex: 1 1 0;
  min-width: 6px;
  border: 0;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  transition: transform var(--ad-move-rapido) var(--ad-move-curva-entrada), filter var(--ad-move-rapido) ease;
}

.barra-papeles__segmento:hover,
.barra-papeles__segmento:focus-visible {
  transform: scaleY(1.35);
  filter: brightness(0.92);
}

.barra-papeles__segmento:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}

.barra-papeles__segmento--success { background: rgb(var(--v-theme-success)); }
.barra-papeles__segmento--error { background: rgb(var(--v-theme-error)); }
.barra-papeles__segmento--warning { background: #e0a100; }
.barra-papeles__segmento--falta {
  background: repeating-linear-gradient(135deg, #d4d6da 0 4px, #e9eaec 4px 8px);
}

/* Entrada: los segmentos se "llenan" uno tras otro (una sola vez) */
.barra-papeles--animada .barra-papeles__segmento {
  animation: llenar-segmento 420ms var(--ad-move-curva-entrada) both;
  animation-delay: calc(var(--i) * 22ms);
}

@keyframes llenar-segmento {
  from { opacity: 0; transform: scaleY(0.2); }
  to { opacity: 1; transform: scaleY(1); }
}

.barra-papeles__leyenda {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.barra-papeles__mensaje {
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.barra-papeles__leyenda li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.punto {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}
.punto--success { background: rgb(var(--v-theme-success)); }
.punto--error { background: rgb(var(--v-theme-error)); }
.punto--warning { background: #e0a100; }
.punto--falta { background: repeating-linear-gradient(135deg, #c4c7cc 0 3px, #e9eaec 3px 6px); }

@media (prefers-reduced-motion: reduce) {
  .barra-papeles__segmento { transition: none; animation: none !important; }
}
</style>
