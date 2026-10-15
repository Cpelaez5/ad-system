<template>
  <div class="ia">
    <EncabezadoPagina titulo="Configuración de IA" subtitulo="Qué proveedor y modelo de IA usa el sistema para leer facturas y responder en el chat.">
      <v-btn variant="outlined" size="large" class="text-none" prepend-icon="mdi-chart-box-outline" data-testid="ir-uso" @click="router.push('/admin/uso-ia')">
        Uso de IA
      </v-btn>
      <v-btn color="primary" size="large" class="text-none" prepend-icon="mdi-plus" :disabled="cargando" data-testid="nuevo" @click="abrirNuevo">
        Nuevo perfil
      </v-btn>
    </EncabezadoPagina>

    <FiltroChips v-model="vista" etiqueta="Sección" :opciones="opcionesVista" class="mb-4" />

    <template v-if="vista === 'perfiles'">
      <v-skeleton-loader v-if="cargando" type="article, list-item-two-line" data-testid="cargando" />

      <template v-else>
        <PanelSiguientePaso
          class="mb-6"
          :listo="!siguiente"
          :titulo="siguiente ? siguiente.titulo : ''"
          :detalle="siguiente ? siguiente.detalle : ''"
          :texto-boton="siguiente ? siguiente.boton : ''"
          titulo-listo="La IA está funcionando"
          :detalle-listo="activo ? `Se usa «${activo.profile_name}» (${activo.model}).` : ''"
          @accion="siguiente.accion()"
        />

        <EstadoVacio
          v-if="perfiles.length === 0"
          icono="mdi-robot-off-outline"
          titulo="Todavía no hay perfiles"
          mensaje="Un perfil guarda el proveedor, el modelo y la llave de API. El primero que crees queda en uso."
          texto-accion="Crear el primer perfil"
          @accion="abrirNuevo"
        />

        <SeccionLista v-else titulo="Perfiles" icono="mdi-robot-outline" :meta="`${perfiles.length} guardado${perfiles.length === 1 ? '' : 's'}`">
          <FilaPerfilIa
            v-for="p in perfiles"
            :key="p.id"
            :perfil="p"
            :estado="p.is_active ? estadoActivo : null"
            :activando="activandoId === p.id"
            :bloqueado="activandoId !== null"
            @activar="activar"
            @editar="abrirEditar"
            @eliminar="pedirEliminar"
          />
        </SeccionLista>

        <SeccionLista
          class="mt-8"
          titulo="Uso reciente"
          icono="mdi-history"
          ayuda="Las últimas 30 llamadas a la IA. El detalle por día y por modelo está en Uso de IA."
        >
          <template #cabecera>
            <v-btn variant="text" class="text-none" prepend-icon="mdi-refresh" :loading="cargandoLogs" data-testid="recargar-uso" @click="cargarUso">Actualizar</v-btn>
          </template>
          <div v-if="cargandoLogs && logs.length === 0" class="vacio-lista">Cargando…</div>
          <div v-else-if="logs.length === 0" class="vacio-lista" data-testid="sin-uso">Aún no hay llamadas registradas.</div>
          <div v-for="l in logs" :key="l.id" class="fila-uso" data-testid="fila-uso">
            <div class="fila-uso__texto">
              <div class="fila-uso__modelo">{{ l.model }}</div>
              <div class="fila-uso__sub">{{ formatearFecha(l.created_at) }}<template v-if="l.error_code"> · {{ l.error_code }}</template></div>
            </div>
            <div class="fila-uso__derecha">
              <div v-if="l.costo_estimado" class="fila-uso__costo">${{ Number(l.costo_estimado).toFixed(6) }}</div>
              <v-chip size="small" variant="tonal" :color="l.status === 'success' ? 'success' : 'error'">{{ l.status === 'success' ? 'Éxito' : 'Fallo' }}</v-chip>
            </div>
          </div>
        </SeccionLista>
      </template>
    </template>

    <template v-else>
      <p class="text-body-1 text-medium-emphasis mb-4">Prueba el perfil que está en uso sin tocar datos de ningún negocio.</p>
      <FiltroChips v-model="demo" etiqueta="Tipo de prueba" :opciones="opcionesDemo" class="mb-4" />
      <v-card variant="outlined" class="laboratorio">
        <OCRDemo v-if="demo === 'ocr'" />
        <AiChatDemo v-if="demo === 'chat'" />
      </v-card>
    </template>

    <DialogoPerfilIa v-model="dialogoPerfil" :perfil="perfilEnEdicion" :cargando="guardando" @guardar="guardar" />

    <DialogoAdaptable v-model="dialogoEliminar" titulo="Eliminar perfil" icono="mdi-delete-outline" :cargando="eliminando" max-width="480">
      <p class="text-body-1 mb-0">
        ¿Eliminar el perfil <strong>{{ aEliminar?.profile_name }}</strong>? Se borra también su llave guardada. Esto no se puede deshacer.
      </p>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="eliminando" @click="dialogoEliminar = false">Cancelar</v-btn>
        <v-btn color="error" size="large" class="text-none" :loading="eliminando" data-testid="confirmar-eliminar" @click="eliminar">Eliminar</v-btn>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useNotificacionStore } from '@/store/notificacionStore'
import OCRDemo from '@/views/shared/OCRDemo.vue'
import AiChatDemo from '@/components/chat/AiChatDemo.vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import FilaPerfilIa from '@/components/admin/ia/FilaPerfilIa.vue'
import DialogoPerfilIa from '@/components/admin/ia/DialogoPerfilIa.vue'
import { estadoConexion, deducirEstado, sufijoDeLlave } from '@/components/admin/ia/iaUtil'
import { formatFechaLocal } from '@/utils/fechas'

const notificaciones = useNotificacionStore()
const router = useRouter()

const vista = ref('perfiles')
const demo = ref('chat')
const opcionesVista = [
  { valor: 'perfiles', texto: 'Perfiles' },
  { valor: 'pruebas', texto: 'Laboratorio de pruebas' },
]
const opcionesDemo = [
  { valor: 'chat', texto: 'Chat libre' },
  { valor: 'ocr', texto: 'Extraer factura' },
]

const cargando = ref(true)
const cargandoLogs = ref(true)
const guardando = ref(false)
const eliminando = ref(false)
const activandoId = ref(null)

const perfiles = ref([])
const logs = ref([])
const estadoClave = ref('connected')

const dialogoPerfil = ref(false)
const perfilEnEdicion = ref(null)
const dialogoEliminar = ref(false)
const aEliminar = ref(null)

const activo = computed(() => perfiles.value.find((p) => p.is_active) || null)
const estadoActivo = computed(() => estadoConexion(estadoClave.value))

// UNA cosa que hacer ahora: crear el primero, activar uno, o arreglar la llave/cuota.
const siguiente = computed(() => {
  if (perfiles.value.length === 0) {
    return { titulo: 'Crea tu primer perfil de IA', detalle: 'Sin un perfil, el OCR de facturas y el chat no pueden funcionar.', boton: 'Crear perfil', accion: abrirNuevo }
  }
  if (!activo.value) {
    const primero = perfiles.value[0]
    return { titulo: 'Ningún perfil está en uso', detalle: 'Sin un perfil en uso, la IA no responde.', boton: `Usar «${primero.profile_name}»`, accion: () => activar(primero) }
  }
  if (estadoClave.value === 'invalid_key') {
    return { titulo: 'La llave del perfil en uso fue rechazada', detalle: 'Pega una llave nueva para que la IA vuelva a funcionar.', boton: 'Cambiar la llave', accion: () => abrirEditar(activo.value) }
  }
  if (estadoClave.value === 'quota_exceeded') {
    return { titulo: 'El perfil en uso llegó a su límite', detalle: 'Cambia a otro perfil o espera a que se renueve la cuota.', boton: 'Ver uso de IA', accion: () => router.push('/admin/uso-ia') }
  }
  return null
})

onMounted(async () => {
  await cargarPerfiles()
  await cargarUso()
})

async function cargarPerfiles() {
  cargando.value = true
  try {
    // Sin encrypted_api_key: la llave nunca viaja al navegador, solo sus últimos 4.
    const { data } = await supabase
      .from('ai_provider_profiles')
      .select('id, profile_name, provider, model, is_active, key_suffix, created_at')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) {
      perfiles.value = data
      recalcularEstado()
    }
  } catch (err) {
    console.error('Error cargando perfiles:', err)
  } finally {
    cargando.value = false
  }
}

async function cargarUso() {
  cargandoLogs.value = true
  try {
    const { data } = await supabase.from('ai_usage_logs').select('*').order('created_at', { ascending: false }).limit(30)
    if (data) {
      logs.value = data
      recalcularEstado()
    }
  } catch (err) {
    console.error('Error cargando el uso:', err)
  } finally {
    cargandoLogs.value = false
  }
}

function recalcularEstado() {
  const clave = deducirEstado(logs.value, activo.value)
  if (clave) estadoClave.value = clave
}

function abrirNuevo() {
  perfilEnEdicion.value = null
  dialogoPerfil.value = true
}

function abrirEditar(perfil) {
  perfilEnEdicion.value = perfil
  dialogoPerfil.value = true
}

async function activar(perfil) {
  if (perfil.is_active) return
  activandoId.value = perfil.id
  try {
    // Primero se apagan todos: evita el conflicto del índice único parcial.
    const { error: e1 } = await supabase.from('ai_provider_profiles').update({ is_active: false }).eq('is_active', true)
    if (e1) throw e1
    const { error: e2 } = await supabase.from('ai_provider_profiles').update({ is_active: true }).eq('id', perfil.id)
    if (e2) throw e2
    await cargarPerfiles()
    notificaciones.mostrar(`Ahora se usa «${perfil.profile_name}»`, 'success')
  } catch (err) {
    console.error('Error activando perfil:', err)
    notificaciones.mostrar('No se pudo cambiar de perfil. Inténtalo de nuevo.', 'error')
  } finally {
    activandoId.value = null
  }
}

function pedirEliminar(perfil) {
  aEliminar.value = perfil
  dialogoEliminar.value = true
}

async function eliminar() {
  if (!aEliminar.value) return
  eliminando.value = true
  try {
    const { error } = await supabase.from('ai_provider_profiles').delete().eq('id', aEliminar.value.id)
    if (error) throw error
    dialogoEliminar.value = false
    await cargarPerfiles()
    notificaciones.mostrar('Perfil eliminado', 'success')
  } catch (err) {
    console.error('Error eliminando perfil:', err)
    notificaciones.mostrar('No se pudo eliminar el perfil.', 'error')
  } finally {
    eliminando.value = false
  }
}

async function guardar(f) {
  guardando.value = true
  try {
    const payload = { profile_name: f.profileName, provider: f.provider, model: f.model }
    if (f.apiKey) {
      // Pendiente de backend (heredado): cifrar en una Edge Function o RPC.
      payload.encrypted_api_key = f.apiKey
      payload.key_suffix = sufijoDeLlave(f.apiKey)
    }
    if (f.id) {
      const { error } = await supabase.from('ai_provider_profiles').update(payload).eq('id', f.id)
      if (error) throw error
    } else {
      // El primero queda en uso; los demás, guardados.
      payload.is_active = perfiles.value.length === 0
      const { error } = await supabase.from('ai_provider_profiles').insert(payload)
      if (error) throw error
    }
    dialogoPerfil.value = false
    await cargarPerfiles()
    notificaciones.mostrar('Perfil guardado', 'success')
  } catch (err) {
    console.error(err)
    notificaciones.mostrar('No se pudo guardar: ' + (err.message || 'error desconocido'), 'error')
  } finally {
    guardando.value = false
  }
}

function formatearFecha(valor) {
  return formatFechaLocal(valor, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) || ''
}
</script>

<style scoped>
.ia { max-width: 1120px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .ia { padding: 32px 24px 40px; } }
.vacio-lista { padding: 20px 16px; text-align: center; color: rgba(var(--v-theme-on-surface), 0.68); }
.fila-uso { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; }
.fila-uso__texto { min-width: 0; }
.fila-uso__modelo { font-weight: 600; overflow-wrap: anywhere; }
.fila-uso__sub { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.65); overflow-wrap: anywhere; }
.fila-uso__derecha { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
.fila-uso__costo { font-size: 0.85rem; font-variant-numeric: tabular-nums; color: rgba(var(--v-theme-on-surface), 0.75); }
.laboratorio { overflow: hidden; }
</style>
