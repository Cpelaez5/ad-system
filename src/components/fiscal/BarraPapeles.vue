<template>
  <div class="barra-papeles">
    <div class="barra-papeles__titulo">
      <span class="barra-papeles__cifra">{{ resumen.alDia }}</span>
      <span class="barra-papeles__de">de {{ resumen.total }}</span>
      <span class="barra-papeles__texto">{{ resumen.total === 1 ? 'papel al día' : 'papeles al día' }}</span>
    </div>

    <!-- Un segmento por papel: el negocio "se ve" completo o con huecos -->
    <BarraSegmentos
      :segmentos="segmentos"
      :etiqueta="`${resumen.alDia} de ${resumen.total} papeles al día`"
      @elegir="(seg) => $emit('elegir', seg.papel)"
    />

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
import { computed } from 'vue'
import BarraSegmentos from '@/components/ui/BarraSegmentos.vue'
import { resumenPapeles } from '@/utils/estadoPapel'

/**
 * BarraPapeles — avance del expediente como una fila de segmentos, uno por papel
 * (los "no aplica" no cuentan). Verde = al día, rojo/ámbar = por atender, gris
 * punteado = falta subirlo. Tocar un segmento lleva a ese papel (`elegir`).
 * Los segmentos (BarraSegmentos) se llenan en secuencia al cargar: única animación de la vista.
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

const segmentos = computed(() => visibles.value.map((papel) => ({
  id: papel.id,
  tono: tono(papel),
  etiqueta: `${papel.nombre}: ${papel.estado.semaforo.texto}`,
  papel,
})))
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

</style>
