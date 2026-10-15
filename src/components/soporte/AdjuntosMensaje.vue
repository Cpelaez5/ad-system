<template>
  <div v-if="lista.length" class="adj" :class="{ 'adj--una': lista.length === 1 }">
    <button
      v-for="(a, i) in lista"
      :key="a.path"
      type="button"
      class="adj__miniatura"
      :aria-label="`Ver la imagen ${a.nombre || i + 1} en grande`"
      @click="abrir(a)"
    >
      <img v-if="urls[a.path]" :src="urls[a.path]" :alt="a.nombre || 'Captura de pantalla'" class="adj__img" loading="lazy" />
      <span v-else class="adj__espera" :class="{ 'adj__espera--error': fallaron[a.path] }">
        <v-icon :icon="fallaron[a.path] ? 'mdi-image-broken-variant' : 'mdi-image-outline'" size="28" />
      </span>
    </button>

    <DialogoAdaptable v-model="visor" :titulo="visorNombre" icono="mdi-image-outline" max-width="960">
      <img v-if="visorUrl" :src="visorUrl" :alt="visorNombre" class="adj__grande" />
    </DialogoAdaptable>
  </div>
</template>

<script setup>
/**
 * AdjuntosMensaje — las capturas de un mensaje, en miniaturas redondeadas.
 * Un toque abre la imagen en grande. Los enlaces son firmados (1 h) y se piden al mostrarse.
 */
import { computed, reactive, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { urlDeAdjunto } from '@/services/adjuntosSoporteService'
import { adjuntosDeMensaje } from '@/utils/adjuntosSoporte.js'

const props = defineProps({ mensaje: { type: Object, required: true } })

const lista = computed(() => adjuntosDeMensaje(props.mensaje))
const urls = reactive({})
const fallaron = reactive({})
const visor = ref(false)
const visorUrl = ref('')
const visorNombre = ref('Imagen')

watch(lista, async (items) => {
  for (const a of items) {
    if (urls[a.path] || fallaron[a.path]) continue
    const url = await urlDeAdjunto(a.path)
    if (url) urls[a.path] = url
    else fallaron[a.path] = true
  }
}, { immediate: true })

function abrir(a) {
  if (!urls[a.path]) return
  visorUrl.value = urls[a.path]
  visorNombre.value = a.nombre || 'Imagen'
  visor.value = true
}
</script>

<style scoped>
.adj { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.adj__miniatura {
  width: 120px; height: 120px; padding: 0; overflow: hidden; cursor: zoom-in;
  border-radius: 12px; border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.adj--una .adj__miniatura { width: min(220px, 100%); height: 160px; }
.adj__miniatura:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.adj__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.adj__espera { width: 100%; height: 100%; display: grid; place-items: center; color: rgb(var(--v-theme-on-surface)); opacity: 0.6; }
.adj__espera--error { color: rgb(var(--v-theme-error)); opacity: 1; }
.adj__grande { display: block; max-width: 100%; max-height: 78vh; margin: 0 auto; border-radius: 8px; }
</style>
