<template>
  <DialogoAdaptable
    :model-value="modelValue"
    titulo="Escanear código de barras"
    icono="mdi-barcode-scan"
    max-width="520"
    @update:model-value="cerrar"
  >
    <div class="escaner">
      <p class="escaner__ayuda">Apunta la cámara al código de barras del producto. Lo leemos solos.</p>
      <div class="escaner__marco">
        <video ref="videoEl" class="escaner__video" playsinline muted autoplay aria-label="Vista de la cámara" />
        <div v-if="!error && !listo" class="escaner__espera">
          <v-progress-circular indeterminate color="white" />
        </div>
      </div>
      <p v-if="error" class="escaner__error" role="alert">{{ error }}</p>
    </div>
    <template #acciones>
      <v-btn variant="text" class="text-none" @click="cerrar(false)">Cancelar</v-btn>
      <v-spacer />
      <v-btn v-if="error" color="primary" variant="flat" class="text-none" @click="abrirCamara">Intentar de nuevo</v-btn>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
/**
 * EscanerCodigoBarras — abre la cámara trasera, detecta EAN-13, EAN-8, UPC-A y
 * UPC-E con BarcodeDetector, devuelve el código y APAGA la cámara.
 * Solo se muestra si `soportaEscaner()` (decide quien lo usa).
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { FORMATOS_ESCANER, mensajeErrorCamara } from '@/utils/escanerCodigoBarras'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'detectado'])

const videoEl = ref(null)
const error = ref('')
const listo = ref(false)
let stream = null
let temporizador = null
let detector = null
let sesion = 0

function apagar() {
  sesion++
  clearInterval(temporizador)
  temporizador = null
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  if (videoEl.value) videoEl.value.srcObject = null
  listo.value = false
}

async function esperarVideo() {
  for (let i = 0; i < 20 && !videoEl.value; i++) {
    await nextTick()
    if (!videoEl.value) await new Promise(r => setTimeout(r, 50))
  }
  return videoEl.value
}

async function abrirCamara() {
  apagar()
  const miSesion = sesion
  error.value = ''
  try {
    detector = new globalThis.BarcodeDetector({ formats: FORMATOS_ESCANER })
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    if (miSesion !== sesion || !props.modelValue) { apagar(); return }
    const video = await esperarVideo()
    if (!video) { apagar(); return }
    video.srcObject = stream
    await video.play().catch(() => {})
    listo.value = true
    temporizador = setInterval(leer, 250)
  } catch (err) {
    apagar()
    error.value = mensajeErrorCamara(err)
  }
}

let leyendo = false
async function leer() {
  if (leyendo || !videoEl.value || !detector || videoEl.value.readyState < 2) return
  leyendo = true
  try {
    const codigos = await detector.detect(videoEl.value)
    const valor = codigos?.[0]?.rawValue
    if (valor) {
      apagar()
      emit('detectado', valor)
      emit('update:modelValue', false)
    }
  } catch { /* un cuadro que no se pudo leer: seguimos intentando */ } finally {
    leyendo = false
  }
}

function cerrar(valor) {
  if (valor === false) apagar()
  emit('update:modelValue', valor)
}

watch(() => props.modelValue, abierto => {
  if (abierto) abrirCamara()
  else apagar()
}, { immediate: true })

onBeforeUnmount(apagar)
</script>

<style scoped>
.escaner__ayuda {
  margin: 0 0 12px;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.escaner__marco {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #111;
  border-radius: 16px;
  overflow: hidden;
}

.escaner__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.escaner__espera {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.escaner__error {
  margin: 12px 0 0;
  font-size: 1rem;
  color: rgb(var(--v-theme-error));
}
</style>
