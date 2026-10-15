<template>
  <div class="uso-ia">
    <EncabezadoPagina
      titulo="Uso de IA"
      subtitulo="Cuántas veces se usó la IA, cuánto costó y qué errores hubo. Sin nombres ni correos."
    />

    <FiltroChips v-model="dias" :opciones="opcionesPeriodo" etiqueta="Período" class="mb-4" />

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />
    <v-alert v-if="resumen && resumen.truncado" type="warning" variant="tonal" class="mb-4" data-testid="aviso-truncado">
      Hay más de {{ MAX_FILAS_IA.toLocaleString('es-VE') }} llamadas en este período. Las cifras usan las {{ MAX_FILAS_IA.toLocaleString('es-VE') }} más recientes: elige un período más corto para ver todo.
    </v-alert>

    <v-skeleton-loader v-if="cargando" type="heading, image, list-item-two-line@3" class="rounded-xl" />

    <EstadoVacio
      v-else-if="resumen && !resumen.llamadas"
      icono="mdi-robot-outline"
      titulo="Sin uso de IA en este período"
      mensaje="Cuando alguien use el OCR, Foto y listo o el chat, aparecerá aquí."
    />

    <template v-else-if="resumen">
      <div class="uso-ia__cifras" data-testid="cifras">
        <div class="cifra">
          <div class="cifra__valor">{{ resumen.llamadas.toLocaleString('es-VE') }}</div>
          <div class="cifra__etiqueta">Llamadas</div>
          <div class="cifra__nota">{{ resumen.usuarios }} {{ resumen.usuarios === 1 ? 'persona distinta' : 'personas distintas' }}</div>
        </div>
        <div class="cifra" :class="{ 'cifra--alerta': resumen.porcentajeErrores >= 10 }">
          <div class="cifra__valor">{{ resumen.porcentajeErrores.toLocaleString('es-VE') }}%</div>
          <div class="cifra__etiqueta">Con error</div>
          <div class="cifra__nota">{{ resumen.errores.toLocaleString('es-VE') }} {{ resumen.errores === 1 ? 'llamada' : 'llamadas' }}</div>
        </div>
        <div class="cifra">
          <div class="cifra__valor">{{ resumen.tokens.toLocaleString('es-VE') }}</div>
          <div class="cifra__etiqueta">Tokens</div>
          <div class="cifra__nota">entrada y salida</div>
        </div>
        <div class="cifra">
          <div class="cifra__valor">{{ formatoCostoUsd(resumen.costo) }}</div>
          <div class="cifra__etiqueta">Costo estimado</div>
          <div class="cifra__nota">suma del período</div>
        </div>
      </div>

      <SeccionLista titulo="Llamadas por día" icono="mdi-chart-bar" class="mb-6">
        <div class="uso-ia__grafico">
          <GraficoBarras :labels="etiquetasDias" :series="series" formato="entero" :altura="240" />
        </div>
      </SeccionLista>

      <SeccionLista titulo="Por modelo" icono="mdi-chip" class="mb-6">
        <div v-for="m in resumen.porModelo" :key="m.modelo" class="fila-ia" data-testid="fila-modelo">
          <div class="fila-ia__texto">
            <div class="fila-ia__titulo">{{ m.modelo }}</div>
            <div class="fila-ia__sub">{{ m.llamadas.toLocaleString('es-VE') }} llamadas · {{ m.errores }} con error</div>
          </div>
          <div class="fila-ia__valor">{{ formatoCostoUsd(m.costo) }}</div>
        </div>
      </SeccionLista>

      <SeccionLista titulo="Errores más frecuentes" icono="mdi-alert-circle-outline" :meta="resumen.errores ? '' : 'Sin errores'" :meta-exito="!resumen.errores">
        <div v-for="e in resumen.topErrores" :key="e.codigo" class="fila-ia" data-testid="fila-error">
          <div class="fila-ia__texto">
            <div class="fila-ia__titulo">{{ e.codigo }}</div>
            <div class="fila-ia__sub">{{ e.ultimoMensaje || 'Sin mensaje' }}</div>
          </div>
          <div class="fila-ia__valor">{{ e.cantidad }}×</div>
        </div>
        <div v-if="!resumen.topErrores.length" class="fila-ia text-medium-emphasis">No hubo errores en este período.</div>
      </SeccionLista>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import GraficoBarras from '@/components/ui/GraficoBarras.vue'
import { filasUsoIa } from '@/services/superAdminService'
import { agregarUsoIa, formatoCostoUsd, PERIODOS_IA, MAX_FILAS_IA } from '@/utils/usoIa'

const tema = useTheme()
const dias = ref(30)
const resumen = ref(null)
const cargando = ref(false)
const error = ref('')

const opcionesPeriodo = PERIODOS_IA.map((n) => ({ valor: n, texto: `${n} días` }))

let secuencia = 0
async function cargar() {
  const mia = ++secuencia
  cargando.value = true
  error.value = ''
  const hoy = new Date()
  const res = await filasUsoIa(dias.value, hoy)
  if (mia !== secuencia) return
  error.value = res.error || ''
  resumen.value = agregarUsoIa(res.data, { dias: dias.value, hoy })
  cargando.value = false
}
watch(dias, cargar)
onMounted(cargar)

const etiquetasDias = computed(() => (resumen.value?.porDia || []).map((d) => `${d.fecha.slice(8, 10)}/${d.fecha.slice(5, 7)}`))
const series = computed(() => {
  const c = tema.current.value.colors
  const r = resumen.value
  return [
    { nombre: 'Correctas', datos: (r?.porDia || []).map((d) => d.llamadas - d.errores), color: c.secondary || '#6b6b6b' },
    { nombre: 'Con error', datos: (r?.porDia || []).map((d) => d.errores), color: c.error || '#b3261e' },
  ]
})
</script>

<style scoped>
.uso-ia { max-width: 960px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .uso-ia { padding: 32px 24px 40px; } }

.uso-ia__cifras {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
@media (min-width: 840px) { .uso-ia__cifras { grid-template-columns: repeat(4, minmax(0, 1fr)); } }

.cifra {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 20px;
  padding: 16px 18px;
}
.cifra--alerta { border-color: rgba(var(--v-theme-error), 0.5); }
.cifra__valor { font-size: 1.7rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; overflow-wrap: anywhere; }
.cifra__etiqueta { font-weight: 600; margin-top: 2px; }
.cifra__nota { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.65); }

.uso-ia__grafico { padding: 16px; }

.fila-ia { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.fila-ia__texto { flex: 1 1 auto; min-width: 0; }
.fila-ia__titulo { font-weight: 700; overflow-wrap: anywhere; }
.fila-ia__sub { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); overflow-wrap: anywhere; }
.fila-ia__valor { font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>
