<template>
  <div v-if="uso" class="tu-asistente" :class="[`tu-asistente--${variante}`, { 'tu-asistente--tarjeta': tarjeta }]" data-testid="tu-asistente">
    <!-- Compacta: menú lateral y hoja "Más". Al tocarla se abre el detalle. -->
    <template v-if="variante === 'compacta'">
      <button
        type="button"
        class="ta-compacta"
        :aria-label="`Tu asistente. ${frase}. Ver detalle`"
        data-testid="tu-asistente-compacta"
        @click="abierto = true"
      >
        <span class="ta-compacta__barra">
          <span class="ta-compacta__etiqueta">
            <v-icon icon="mdi-creation" size="16" class="ta-icono" aria-hidden="true" />
            Tu asistente
          </span>
          <v-progress-linear
            :model-value="porcentaje"
            :color="color"
            bg-color="rgba(128,128,128,0.35)"
            height="6"
            rounded
            aria-hidden="true"
          />
          <span class="ta-compacta__frase">{{ frase }}</span>
        </span>
        <!-- Menú recogido: solo el círculo, con tooltip -->
        <v-tooltip location="end" :text="`Tu asistente: ${frase}`">
          <template #activator="{ props: tip }">
            <span v-bind="tip" class="ta-compacta__circulo" data-testid="tu-asistente-circulo">
              <v-progress-circular :model-value="porcentaje" :color="color" size="36" width="4">
                <v-icon icon="mdi-creation" size="16" class="ta-icono" aria-hidden="true" />
              </v-progress-circular>
            </span>
          </template>
        </v-tooltip>
      </button>

      <DialogoAdaptable v-model="abierto" titulo="Tu asistente" icono="mdi-creation" max-width="480">
        <TuAsistente v-if="abierto" variante="completa" :client-id="clientId" :sin-titulo="true" />
      </DialogoAdaptable>
    </template>

    <!-- Completa: detalle y Mi plan -->
    <template v-else>
      <h2 v-if="!sinTitulo" class="ta-completa__titulo">
        <v-icon icon="mdi-creation" size="22" class="ta-icono mr-2" aria-hidden="true" />Tu asistente este mes
      </h2>
      <v-progress-linear
        :model-value="porcentaje"
        :color="color"
        bg-color="grey-lighten-2"
        height="14"
        rounded
        class="ta-completa__barra"
        :aria-label="`${porcentaje} por ciento. ${frase}`"
      />
      <p class="ta-completa__frase" data-testid="tu-asistente-frase">{{ frase }}</p>

      <ul v-if="acciones.length" class="ta-completa__lista" aria-label="Lo que hiciste este mes">
        <li v-for="a in acciones" :key="a">{{ a }}</li>
      </ul>
      <p v-else class="ta-completa__vacio">Este mes todavía no has usado a tu asistente.</p>

      <p v-if="renovacion && !agotado" class="ta-completa__renueva">{{ renovacion }}</p>

      <v-btn
        v-if="mejorar"
        color="primary"
        variant="flat"
        size="large"
        block
        class="text-none ta-completa__mejorar"
        data-testid="tu-asistente-mejorar"
        @click="irAPlanes"
      >Mejorar mi plan</v-btn>
    </template>
  </div>
</template>

<script setup>
/**
 * TuAsistente — uso de IA del negocio en lenguaje sencillo (barra, frase y
 * acciones). NUNCA muestra créditos ni tokens. Si la RPC falla o no devuelve
 * nada, no pinta nada. Se refresca al montarse y con el evento `ad-ia-usada`.
 * Ver docs/mvp/diseno/uso-ia-por-cliente.md.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { obtenerUsoIa, EVENTO_IA_USADA } from '@/services/usoIaService'
import {
  porcentajeDeUso, fraseDeUso, colorDeUso, accionesEnPalabras, textoRenovacion,
  sugiereMejorarPlan, nivelDeUso,
} from '@/utils/usoIaTexto'

defineOptions({ name: 'TuAsistente' })

const props = defineProps({
  /** 'compacta' (menú / hoja Más) o 'completa' (detalle / Mi plan). */
  variante: { type: String, default: 'compacta', validator: (v) => ['compacta', 'completa'].includes(v) },
  /** Solo el staff: negocio a consultar. El cliente no pasa nada. */
  clientId: { type: String, default: null },
  /** Oculta el título interno de la variante completa (si ya lo pone el diálogo/tarjeta). */
  sinTitulo: { type: Boolean, default: false },
  /** Se dibuja como tarjeta con borde (para Mi plan). */
  tarjeta: { type: Boolean, default: false },
})

const router = useRouter()
const uso = ref(null)
const abierto = ref(false)

const porcentaje = computed(() => porcentajeDeUso(uso.value))
const frase = computed(() => fraseDeUso(porcentaje.value, uso.value?.renueva))
const color = computed(() => colorDeUso(porcentaje.value))
const acciones = computed(() => accionesEnPalabras(uso.value?.por_accion))
const renovacion = computed(() => textoRenovacion(uso.value?.renueva))
const agotado = computed(() => nivelDeUso(porcentaje.value) === 'agotado')
const mejorar = computed(() => sugiereMejorarPlan(porcentaje.value))

let montado = true
async function cargar() {
  const r = await obtenerUsoIa({ clientId: props.clientId || undefined })
  if (montado) uso.value = r
}

function irAPlanes() {
  abierto.value = false
  router.push('/cliente/planes')
}

onMounted(() => {
  cargar()
  window.addEventListener(EVENTO_IA_USADA, cargar)
})
onBeforeUnmount(() => {
  montado = false
  window.removeEventListener(EVENTO_IA_USADA, cargar)
})

defineExpose({ cargar })
</script>

<style scoped>
.ta-icono { color: var(--ad-ia-1); }

.tu-asistente--tarjeta {
  padding: 20px;
  border-radius: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

/* ---- Compacta ---- */
.ta-compacta {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  border: 1px solid transparent;
  font: inherit;
  min-height: 44px;
}
.ta-compacta:hover { background: rgba(128, 128, 128, 0.12); }
.ta-compacta:focus-visible { outline: 2px solid var(--ad-ia-1); outline-offset: 2px; }
.ta-compacta__barra { display: flex; flex-direction: column; gap: 6px; }
.ta-compacta__etiqueta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  font-weight: 600;
}
.ta-compacta__frase { font-size: 0.8125rem; opacity: 0.85; line-height: 1.3; }
.ta-compacta__circulo { display: none; justify-content: center; }

/* ---- Completa ---- */
.ta-completa__titulo { display: flex; align-items: center; font-size: 1.125rem; font-weight: 700; margin: 0 0 12px; }
.ta-completa__barra { margin-bottom: 12px; }
.ta-completa__frase { font-size: 1.125rem; font-weight: 600; margin: 0 0 12px; }
.ta-completa__lista { margin: 0 0 12px; padding: 0; list-style: none; }
.ta-completa__lista li { padding: 6px 0 6px 16px; font-size: 1rem; border-left: 2px solid var(--ad-ia-1); margin-bottom: 6px; }
.ta-completa__vacio { font-size: 1rem; margin: 0 0 12px; opacity: 0.8; }
.ta-completa__renueva { font-size: 0.9375rem; margin: 0 0 12px; opacity: 0.8; }
.ta-completa__mejorar { margin-top: 4px; min-height: 48px; }
</style>
