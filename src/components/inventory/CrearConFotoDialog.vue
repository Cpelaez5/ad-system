<template>
  <DialogoAdaptable
    :model-value="modelValue"
    titulo="Foto y listo"
    icono="mdi-camera-iris"
    max-width="460"
    persistent
    @update:model-value="cancelar"
  >
    <div class="cf" aria-live="polite">
      <div class="cf__foto">
        <img v-if="vistaPrevia" :src="vistaPrevia" alt="Tu foto" class="cf__img">
        <v-progress-circular v-if="!error" indeterminate color="primary" size="56" class="cf__giro" />
      </div>
      <template v-if="!error">
        <p class="cf__mensaje">{{ mensaje }}</p>
        <p class="cf__ayuda">Esto toma unos segundos.</p>
      </template>
      <template v-else>
        <v-icon icon="mdi-alert-circle-outline" color="warning" size="36" aria-hidden="true" />
        <p class="cf__mensaje">{{ error }}</p>
      </template>
    </div>

    <template #acciones>
      <v-btn variant="text" class="text-none" @click="cancelar(false)">Cancelar</v-btn>
      <v-spacer />
      <template v-if="error">
        <v-btn variant="tonal" class="text-none" @click="sinFoto">Escribirlo yo</v-btn>
        <v-btn color="primary" variant="flat" class="text-none" @click="procesar">Reintentar</v-btn>
      </template>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
/**
 * CrearConFotoDialog — "Foto y listo": sube la foto, la IA reconoce el producto y
 * devuelve (`listo`) la ruta de la foto y los datos para el formulario corto.
 * Nunca bloquea: si la IA falla, entrega el formulario vacío con un aviso amable.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { subirFoto, identificarProducto } from '@/services/productoFotoService'
import { camposDe } from '@/constants/rubros'
import { MENSAJES_ANALISIS, avisoDeIdentificacion } from '@/utils/fotoYListo'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  archivo: { type: Object, default: null },
  rubro: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'listo'])

const vistaPrevia = ref(null)
const mensaje = ref(MENSAJES_ANALISIS[0])
const error = ref('')
let ticket = 0
let timer = null
let ultimaRuta = null

function detenerMensajes() {
  if (timer) { clearInterval(timer); timer = null }
}

function iniciarMensajes() {
  detenerMensajes()
  let i = 0
  mensaje.value = MENSAJES_ANALISIS[0]
  timer = setInterval(() => {
    i = Math.min(i + 1, MENSAJES_ANALISIS.length - 1)
    mensaje.value = MENSAJES_ANALISIS[i]
  }, 2200)
}

async function procesar() {
  const mio = ++ticket
  error.value = ''
  iniciarMensajes()
  try {
    let ruta = ultimaRuta
    if (!ruta) {
      const r = await subirFoto(props.archivo)
      if (mio !== ticket) return
      if (r.error) { detenerMensajes(); error.value = r.error; return }
      ruta = r.path
      ultimaRuta = ruta
    }
    const { producto, error: errIA } = await identificarProducto(ruta, camposDe(props.rubro || 'otro'))
    if (mio !== ticket) return
    detenerMensajes()
    emit('listo', { foto_path: ruta, producto, aviso: avisoDeIdentificacion(producto, errIA) })
    emit('update:modelValue', false)
  } catch {
    if (mio !== ticket) return
    detenerMensajes()
    error.value = 'Algo salió mal. Intenta de nuevo.'
  }
}

function sinFoto() {
  ticket++
  emit('listo', { foto_path: ultimaRuta, producto: null, aviso: null })
  emit('update:modelValue', false)
}

function cancelar(valor) {
  if (valor !== false) return
  ticket++
  detenerMensajes()
  emit('update:modelValue', false)
}

watch(() => props.modelValue, abierto => {
  if (vistaPrevia.value) { URL.revokeObjectURL(vistaPrevia.value); vistaPrevia.value = null }
  if (abierto && props.archivo) {
    ultimaRuta = null
    vistaPrevia.value = URL.createObjectURL(props.archivo)
    procesar()
  } else {
    ticket++
    detenerMensajes()
  }
})

onBeforeUnmount(() => {
  ticket++
  detenerMensajes()
  if (vistaPrevia.value) URL.revokeObjectURL(vistaPrevia.value)
})
</script>

<style scoped>
.cf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
  text-align: center;
}

.cf__foto {
  position: relative;
  width: min(240px, 70vw);
  aspect-ratio: 1 / 1;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.cf__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
}

.cf__giro {
  position: absolute;
  inset: 0;
  margin: auto;
}

.cf__mensaje {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.cf__ayuda {
  margin: 0;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
</style>
