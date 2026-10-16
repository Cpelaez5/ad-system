<template>
  <div class="soporte">
    <EncabezadoPagina titulo="Soporte" subtitulo="Las consultas que los negocios le escriben al equipo." />

    <div class="soporte__sonido"><BotonSonido :silenciado="sonido.silenciado.value" @alternar="sonido.alternar" /></div>

    <FiltroChips v-model="filtro" :opciones="opciones" etiqueta="Filtrar consultas por estado" class="mb-3" />

    <v-alert v-if="error" type="error" variant="tonal" class="mb-3" role="alert">
      {{ error }}
      <template #append><v-btn variant="text" class="text-none" @click="cargar">Reintentar</v-btn></template>
    </v-alert>

    <div class="soporte__cuerpo" :class="{ 'soporte__cuerpo--hilo': seleccionada }">
      <div class="soporte__lista">
        <div v-if="cargando" aria-busy="true"><v-skeleton-loader v-for="n in 4" :key="n" type="list-item-two-line" /></div>
        <EstadoVacio
          v-else-if="!visibles.length"
          icono="mdi-inbox-outline"
          :titulo="vacio.titulo"
          :mensaje="vacio.mensaje"
        />
        <ul v-else class="lista" aria-label="Consultas">
          <li v-for="c in visibles" :key="c.id">
            <button type="button" class="fila" :class="{ 'fila--activa': seleccionada?.id === c.id }" @click="abrir(c)">
              <span class="fila__texto">
                <span class="fila__titulo">#{{ numeroTicket(c.ticket_numero) }} · {{ c.negocio || c.cliente_nombre || 'Sin nombre' }}</span>
                <span class="fila__detalle">{{ textoTema(c.categoria) }} · {{ c.current_route_title || 'Sin pantalla' }}</span>
                <span class="fila__detalle">{{ haceCuanto(c.ultimo_mensaje_en || c.created_at, ahora) }}</span>
                <span v-if="pasaDelLimite(c, ahora)" class="fila__aviso">
                  <v-icon icon="mdi-clock-alert-outline" size="18" /> Más de 24 h sin respuesta
                </span>
              </span>
              <span v-if="c.prioridad === 'alta'" class="fila__prioridad">Alta</span>
              <span v-if="c.no_leidos_equipo > 0" class="fila__punto" :aria-label="`${c.no_leidos_equipo} mensajes sin leer`">{{ c.no_leidos_equipo }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div v-if="seleccionada" class="soporte__hilo">
        <HiloEquipo
          :consulta="seleccionada"
          :mensajes="mensajes"
          :cargando="cargandoHilo"
          :error="errorHilo"
          :enviando="enviando"
          :mi-id="miId"
          :respuestas="respuestas"
          mostrar-volver
          @volver="cerrar"
          @enviar="enviar"
          @cambiar-estado="cambiar('estado_ticket', $event)"
          @cambiar-prioridad="cambiar('prioridad', $event)"
          @asignarme="asignarme"
          @guardar-respuesta="guardarRespuesta"
          @quitar-respuesta="quitarRespuesta"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Soporte — bandeja del equipo (solo super_admin): filtros por estado con conteos,
 * orden por antigüedad con aviso de 24 h, hilo completo con el contexto del negocio,
 * respuesta, nota interna, estado, prioridad y asignación, todo en tiempo real.
 * Las respuestas guardadas viven en localStorage de este navegador (fase 3 pendiente: pasarlas a la BD).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import HiloEquipo from '@/components/soporte/HiloEquipo.vue'
import * as soporte from '@/services/soporteService'
import * as adjuntosServicio from '@/services/adjuntosSoporteService'
import { useSonidoMensaje } from '@/composables/useSonidoMensaje'
import BotonSonido from '@/components/soporte/BotonSonido.vue'
import {
  ESTADOS_TICKET, ORDEN_ESTADOS, conteosPorEstado, filtrarBandeja, guardarRespuestas, haceCuanto,
  leerRespuestas, numeroTicket, ordenarBandeja, pasaDelLimite, textoTema,
} from '@/utils/soporte.js'

const sonido = useSonidoMensaje()
const consultas = ref([])
const cargando = ref(true)
const error = ref('')
const filtro = ref('nuevo')
const seleccionada = ref(null)
const mensajes = ref([])
const cargandoHilo = ref(false)
const errorHilo = ref('')
const enviando = ref(false)
const ahora = ref(Date.now())
const respuestas = ref(leerRespuestas(typeof localStorage !== 'undefined' ? localStorage : null))

const miId = (() => {
  try { return JSON.parse(localStorage.getItem('currentUser') || '{}').id || '' } catch { return '' }
})()

const conteos = computed(() => conteosPorEstado(consultas.value))
const opciones = computed(() => ORDEN_ESTADOS.map((v) => ({
  valor: v,
  texto: v === 'nuevo' ? 'Nuevas' : v === 'en_curso' ? 'En curso' : v === 'esperando_cliente' ? 'Esperando al cliente' : 'Resueltas',
  cantidad: conteos.value[v],
})))
const visibles = computed(() => ordenarBandeja(filtrarBandeja(consultas.value.filter((c) => c.estado_ticket === filtro.value), filtro.value), ahora.value))
const vacio = computed(() => (conteos.value.todas === 0
  ? { titulo: 'Todavía no hay consultas', mensaje: 'Cuando un negocio le escriba al equipo, aparece aquí.' }
  : { titulo: `Nada en "${ESTADOS_TICKET[filtro.value]}"`, mensaje: 'Todo al día en este estado.' }))

async function cargar() {
  const { data, error: e } = await soporte.listarBandeja()
  consultas.value = data
  error.value = e || ''
  cargando.value = false
  ahora.value = Date.now()
  // Mantener al día la consulta abierta (estado, prioridad, asignación).
  if (seleccionada.value) {
    const nueva = data.find((c) => c.id === seleccionada.value.id)
    if (nueva) seleccionada.value = nueva
  }
}

async function abrir(c) {
  seleccionada.value = c
  mensajes.value = []
  errorHilo.value = ''
  cargandoHilo.value = true
  const { data, error: e } = await soporte.cargarMensajes(c.id)
  mensajes.value = data
  errorHilo.value = e || ''
  cargandoHilo.value = false
  if (c.no_leidos_equipo > 0) {
    soporte.marcarLeidoEquipo(c.id)
    c.no_leidos_equipo = 0
  }
}

function cerrar() { seleccionada.value = null }

async function enviar({ texto, interno, archivos = [] }) {
  enviando.value = true
  let adjuntos = []
  if (archivos.length) {
    const subida = await adjuntosServicio.subirAdjuntos(seleccionada.value.id, archivos)
    if (subida.error) { enviando.value = false; errorHilo.value = subida.error; return }
    adjuntos = subida.data
  }
  const opciones = adjuntos.length ? { interno, adjuntos } : { interno }
  const { data, error: e } = await soporte.enviarComoEquipo(seleccionada.value.id, texto, opciones)
  enviando.value = false
  if (e) { errorHilo.value = e; return }
  errorHilo.value = ''
  agregar(data)
}

function agregar(m) {
  if (m && !mensajes.value.some((x) => x.id === m.id)) mensajes.value = [...mensajes.value, m]
}

async function cambiar(campo, valor) {
  const llamada = campo === 'estado_ticket' ? soporte.cambiarEstado : soporte.cambiarPrioridad
  const { error: e } = await llamada(seleccionada.value.id, valor)
  if (e) { errorHilo.value = e; return }
  seleccionada.value = { ...seleccionada.value, [campo]: valor }
  const i = consultas.value.findIndex((c) => c.id === seleccionada.value.id)
  if (i >= 0) consultas.value.splice(i, 1, { ...consultas.value[i], [campo]: valor })
}

async function asignarme() {
  const { error: e } = await soporte.asignar(seleccionada.value.id, miId)
  if (e) { errorHilo.value = e; return }
  seleccionada.value = { ...seleccionada.value, asignado_a: miId }
}

// ── Respuestas guardadas (localStorage) ──
function guardarRespuesta(texto) {
  const titulo = texto.length > 40 ? `${texto.slice(0, 40)}…` : texto
  respuestas.value = [...respuestas.value, { id: `r${Date.now()}`, titulo, texto }]
  guardarRespuestas(localStorage, respuestas.value)
}
function quitarRespuesta(r) {
  respuestas.value = respuestas.value.filter((x) => x !== r)
  guardarRespuestas(localStorage, respuestas.value)
}

// ── Tiempo real ──
let cancelar = null
let temporizador = null
let reloj = null
function alCambiar({ tabla, payload }) {
  if (tabla === 'mensajes') {
    const m = payload.new
    // Un cliente le escribió al equipo (no su charla con la IA ni notas): suena la campanita.
    if (m?.role === 'user' && !m.interno && m.metadata?.tipo === 'ticket') sonido.reproducir()
    if (seleccionada.value && m.conversation_id === seleccionada.value.id) {
      agregar(m)
      if (m.role === 'user') soporte.marcarLeidoEquipo(m.conversation_id)
    }
  }
  clearTimeout(temporizador)
  temporizador = setTimeout(cargar, 400)
}

const route = useRoute()
onMounted(() => {
  cargar().then(() => {
    // Aviso push: /admin/soporte?c=<id> abre esa consulta.
    const c = consultas.value.find((x) => x.id === route.query.c)
    if (c) abrir(c)
  })
  cancelar = soporte.suscribirBandeja(alCambiar)
  reloj = setInterval(() => { ahora.value = Date.now() }, 60_000)
})
onBeforeUnmount(() => {
  cancelar?.()
  clearTimeout(temporizador)
  clearInterval(reloj)
})
</script>

<style scoped>
.soporte { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .soporte { padding: 32px 24px 40px; } }
.soporte__sonido { display: flex; justify-content: flex-end; margin-bottom: 4px; }
.soporte__cuerpo { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 960px) {
  .soporte__cuerpo--hilo { grid-template-columns: minmax(300px, 380px) 1fr; align-items: start; }
}
/* En el teléfono, con una consulta abierta se ve solo el hilo. */
@media (max-width: 959px) { .soporte__cuerpo--hilo .soporte__lista { display: none; } }
.soporte__hilo {
  min-height: 480px; border-radius: 16px; overflow: hidden;
  background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}
.lista { list-style: none; margin: 0; padding: 0; border-radius: 16px; overflow: hidden; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), 0.14); }
.lista li + li { border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.fila {
  display: flex; align-items: flex-start; gap: 12px; width: 100%; min-height: 72px; padding: 12px 14px;
  text-align: left; cursor: pointer; font: inherit; color: inherit; background: transparent; border: 0;
}
.fila:hover, .fila:focus-visible, .fila--activa { background: rgba(var(--v-theme-on-surface), 0.06); }
.fila__texto { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fila__titulo { font-weight: 700; }
.fila__detalle { font-size: 0.9375rem; color: rgba(var(--v-theme-on-surface), 0.72); }
.fila__aviso { display: inline-flex; align-items: center; gap: 4px; font-size: 0.9375rem; font-weight: 700; color: rgb(var(--v-theme-warning)); }
.fila__prioridad { font-size: 0.875rem; font-weight: 700; color: rgb(var(--v-theme-error)); }
.fila__punto {
  flex: none; min-width: 24px; height: 24px; padding: 0 6px; border-radius: 12px;
  display: grid; place-items: center; font-size: 0.8125rem; font-weight: 700; color: #fff; background: rgb(var(--v-theme-error));
}
</style>
