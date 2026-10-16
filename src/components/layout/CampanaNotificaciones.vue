<template>
  <div class="campana">
    <v-btn
      id="campana-avisos-btn"
      icon
      variant="text"
      class="campana__boton"
      :aria-label="etiquetaBoton"
      data-testid="campana"
      @click="alTocarCampana"
    >
      <v-badge v-if="noLeidas > 0" :content="textoInsignia(noLeidas)" color="primary" floating>
        <v-icon icon="mdi-bell-badge-outline" />
      </v-badge>
      <v-icon v-else icon="mdi-bell-outline" />
    </v-btn>

    <!-- Teléfono: hoja a pantalla casi completa -->
    <DialogoAdaptable v-if="esMovil" v-model="abierto" titulo="Avisos" icono="mdi-bell-outline">
      <PanelNotificaciones v-bind="propsPanel" sin-titulo v-on="eventosPanel" class="campana__panel-movil" />
    </DialogoAdaptable>

    <!-- Escritorio: panel desplegable de 400 px -->
    <v-menu v-else v-model="abierto" activator="#campana-avisos-btn" location="bottom end" offset="8" :close-on-content-click="false">
      <v-card class="campana__panel-escritorio" elevation="8" rounded="lg">
        <PanelNotificaciones v-bind="propsPanel" v-on="eventosPanel" />
      </v-card>
    </v-menu>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import PanelNotificaciones from './PanelNotificaciones.vue'
import * as servicio from '@/services/notificacionesService.js'
import { useSonidoMensaje } from '@/composables/useSonidoMensaje'
import { agruparPorFecha, esDeSoporte, rutaSegura, textoInsignia } from '@/utils/notificaciones.js'

/**
 * CampanaNotificaciones — bandeja de avisos para todos los roles (centro de notificaciones).
 * Tiempo real por user_id. Los avisos de soporte de la consulta que está abierta en el chat
 * se marcan leídos al instante (el chat avisa con el evento 'ad-soporte-conversacion-abierta').
 */
const props = defineProps({ userId: { type: String, default: null } })

const router = useRouter()
const { xs } = useDisplay()
const sonido = useSonidoMensaje()

const esMovil = computed(() => xs.value)
const abierto = ref(false)
const items = ref([])
const noLeidas = ref(0)
const cargando = ref(false)
const hayMas = ref(false)
const pagina = ref(0)
const ahora = ref(new Date())

let cancelar = null
let conversacionAbierta = null
let temporizadorConteo = null

const grupos = computed(() => agruparPorFecha(items.value, ahora.value))
const etiquetaBoton = computed(() => (noLeidas.value > 0 ? `Avisos: ${noLeidas.value} sin leer` : 'Avisos'))
const propsPanel = computed(() => ({
  grupos: grupos.value, noLeidas: noLeidas.value, cargando: cargando.value, hayMas: hayMas.value, ahora: ahora.value,
}))
const eventosPanel = {
  abrir: (n) => abrirAviso(n),
  'marcar-todas': () => marcarTodas(),
  'ver-mas': () => cargar(pagina.value + 1),
  preferencias: () => { abierto.value = false; router.push({ path: '/settings', query: { seccion: 'avisos' } }) },
}

async function cargar(p = 0) {
  if (!props.userId) return
  cargando.value = true
  const { data, hayMas: mas } = await servicio.listar({ pagina: p })
  items.value = p === 0 ? data : [...items.value, ...data.filter((n) => !items.value.some((x) => x.id === n.id))]
  pagina.value = p
  hayMas.value = mas
  cargando.value = false
}

async function recontar() {
  const { data } = await servicio.contarNoLeidas()
  noLeidas.value = data
}
function recontarPronto() {
  clearTimeout(temporizadorConteo)
  temporizadorConteo = setTimeout(recontar, 300)
}

function reemplazar(fila) {
  const i = items.value.findIndex((n) => n.id === fila.id)
  if (i >= 0) items.value.splice(i, 1, fila)
}

function alCambiar({ tipo, fila, anterior }) {
  if (tipo === 'INSERT' && fila) {
    if (items.value.some((n) => n.id === fila.id)) return
    const yaLoEstaViendo = esDeSoporte(fila.tipo) && conversacionAbierta && fila.agrupar === `soporte:${conversacionAbierta}`
    if (yaLoEstaViendo) {
      // El chat de esa consulta está abierto: ya lo vio, no hace falta molestar.
      items.value.unshift({ ...fila, leida_en: new Date().toISOString() })
      servicio.marcarLeidas([fila.id])
      return
    }
    items.value.unshift(fila)
    noLeidas.value += 1
    sonido.reproducir()
  } else if (tipo === 'UPDATE' && fila) {
    reemplazar(fila)
    recontarPronto()
  } else if (tipo === 'DELETE' && anterior?.id) {
    items.value = items.value.filter((n) => n.id !== anterior.id)
    recontarPronto()
  }
}

function alAbrirConversacion(ev) {
  conversacionAbierta = ev?.detail?.id || null
  if (conversacionAbierta) marcarSoporte(conversacionAbierta)
}

/** Lo que ya tiene en pantalla de esa consulta queda leído (el servicio lo guarda en la base). */
function marcarSoporte(id) {
  const ahoraIso = new Date().toISOString()
  let hubo = false
  items.value = items.value.map((n) => {
    if (n.agrupar === `soporte:${id}` && !n.leida_en) { hubo = true; return { ...n, leida_en: ahoraIso } }
    return n
  })
  if (hubo) recontarPronto()
}

async function abrirAviso(n) {
  abierto.value = false
  if (!n.leida_en) {
    reemplazar({ ...n, leida_en: new Date().toISOString() })
    noLeidas.value = Math.max(0, noLeidas.value - 1)
    servicio.marcarLeidas([n.id])
  }
  const ruta = rutaSegura(n.url)
  if (ruta) router.push(ruta)
}

async function marcarTodas() {
  const ahoraIso = new Date().toISOString()
  items.value = items.value.map((n) => (n.leida_en ? n : { ...n, leida_en: ahoraIso }))
  noLeidas.value = 0
  await servicio.marcarTodas()
}

function alTocarCampana() {
  ahora.value = new Date()
  // En escritorio el v-menu se abre solo con su activator; en el teléfono lo abrimos nosotros.
  if (esMovil.value) abierto.value = !abierto.value
}

async function arrancar() {
  cancelar?.()
  cancelar = null
  items.value = []
  noLeidas.value = 0
  if (!props.userId) return
  await Promise.all([cargar(0), recontar()])
  cancelar = servicio.suscribir(props.userId, alCambiar)
}

watch(() => props.userId, arrancar)
onMounted(() => {
  window.addEventListener('ad-soporte-conversacion-abierta', alAbrirConversacion)
  arrancar()
})
onBeforeUnmount(() => {
  window.removeEventListener('ad-soporte-conversacion-abierta', alAbrirConversacion)
  clearTimeout(temporizadorConteo)
  cancelar?.()
})
</script>

<style scoped>
.campana { display: inline-flex; flex: 0 0 auto; }
.campana__boton { width: 44px; height: 44px; }
.campana__panel-escritorio {
  width: 400px;
  max-width: calc(100vw - 16px);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.campana__panel-movil { min-height: 60vh; }
</style>
