<template>
  <v-card class="settings-card" rounded="xl" elevation="0" data-testid="preferencias-avisos">
    <div class="settings-card-header">
      <v-icon color="white" class="mr-2">mdi-bell-cog-outline</v-icon>
      <span>Qué avisos te llegan</span>
    </div>
    <v-card-text class="pa-4 pa-sm-6">
      <p class="text-body-2 text-medium-emphasis mb-4">
        Todos los avisos llegan siempre a la campanita de arriba. Aquí eliges cuáles te llegan además por correo y a este dispositivo.
      </p>

      <div v-if="cargando" class="d-flex justify-center py-6"><v-progress-circular indeterminate color="primary" /></div>
      <v-alert v-else-if="error" type="warning" variant="tonal" density="comfortable" class="mb-3">{{ error }}</v-alert>

      <div v-else>
        <div v-for="f in filas" :key="f.tipo" class="evento" :class="{ 'evento--pronto': !f.activo }" :data-testid="`evento-${f.tipo}`">
          <div class="evento__texto">
            <div class="evento__nombre">
              {{ f.nombre }}
              <v-chip v-if="!f.activo" size="x-small" variant="tonal" color="secondary" class="ml-2" data-testid="chip-pronto">Pronto</v-chip>
            </div>
            <div class="evento__desc">{{ f.descripcion }}</div>
          </div>
          <div class="evento__interruptores">
            <v-switch
              :model-value="f.correo"
              :disabled="!f.activo"
              label="Correo"
              color="primary" hide-details inset density="comfortable"
              :aria-label="`Correo: ${f.nombre}`"
              :data-testid="`correo-${f.tipo}`"
              @update:model-value="(v) => cambiar(f, 'correo', v)"
            />
            <div class="evento__push">
              <v-switch
                :model-value="f.push && pushDisponible"
                :disabled="!f.activo || !pushDisponible"
                label="En este dispositivo"
                color="primary" hide-details inset density="comfortable"
                :aria-label="`En este dispositivo: ${f.nombre}`"
                :data-testid="`push-${f.tipo}`"
                @update:model-value="(v) => cambiar(f, 'push', v)"
              />
              <span v-if="f.activo && !pushDisponible" class="evento__ayuda">Actívalo arriba</span>
            </div>
          </div>
        </div>
      </div>

      <v-divider class="my-4" />
      <div class="d-flex flex-column flex-sm-row align-sm-center ga-3">
        <v-btn
          variant="tonal" color="primary" class="text-none" prepend-icon="mdi-email-fast-outline"
          :loading="enviandoPrueba" min-height="44" data-testid="correo-prueba"
          @click="probarCorreo"
        >
          Enviarme un correo de prueba
        </v-btn>
        <span v-if="mensajePrueba" class="text-body-2" :class="mensajePrueba.ok ? 'text-success' : 'text-error'" role="status">{{ mensajePrueba.texto }}</span>
      </div>
      <v-alert v-if="errorGuardar" type="error" variant="tonal" density="comfortable" class="mt-3" role="alert">{{ errorGuardar }}</v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import * as servicio from '@/services/notificacionesService.js'
import userService from '@/services/userService'
import { estadoPush } from '@/services/pushService.js'
import { resolverPreferencia, tiposParaRol } from '@/utils/notificaciones.js'

const cargando = ref(true)
const error = ref('')
const errorGuardar = ref('')
const userId = ref(null)
const tipos = ref([])
const prefs = ref(new Map())
const pushDisponible = ref(false)
const enviandoPrueba = ref(false)
const mensajePrueba = ref(null)

const filas = computed(() =>
  tipos.value.map((t) => ({ ...t, ...resolverPreferencia(prefs.value.get(t.tipo), t) })),
)

async function cargar() {
  const usuario = await userService.getCurrentUser()
  userId.value = usuario?.id || null
  const [t, p, ps] = await Promise.all([servicio.listarTipos(), servicio.listarPreferencias(userId.value), estadoPush().catch(() => null)])
  if (t.error) { error.value = t.error } else { tipos.value = tiposParaRol(t.data, usuario?.role) }
  prefs.value = new Map((p.data || []).map((x) => [x.tipo, x]))
  pushDisponible.value = ps?.situacion === 'activo'
  cargando.value = false
}

async function cambiar(fila, campo, valor) {
  if (!userId.value) return
  errorGuardar.value = ''
  const anterior = prefs.value.get(fila.tipo)
  const nuevo = { tipo: fila.tipo, correo: fila.correo, push: fila.push, [campo]: valor }
  prefs.value = new Map(prefs.value).set(fila.tipo, nuevo)
  const { error: e } = await servicio.guardarPreferencia(userId.value, fila.tipo, { correo: nuevo.correo, push: nuevo.push })
  if (e) {
    const mapa = new Map(prefs.value)
    if (anterior) mapa.set(fila.tipo, anterior); else mapa.delete(fila.tipo)
    prefs.value = mapa
    errorGuardar.value = e
  }
}

async function probarCorreo() {
  enviandoPrueba.value = true
  mensajePrueba.value = null
  const { error: e } = await servicio.enviarCorreoPrueba()
  mensajePrueba.value = e ? { ok: false, texto: e } : { ok: true, texto: 'Listo. Revisa tu correo en un minuto (y la carpeta de spam).' }
  enviandoPrueba.value = false
}

onMounted(cargar)
</script>

<style scoped>
.evento {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.evento:last-child { border-bottom: 0; }
.evento--pronto { opacity: 0.65; }
.evento__nombre { font-weight: 700; font-size: 0.9375rem; }
.evento__desc { font-size: 0.8125rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }
.evento__interruptores { display: flex; flex-wrap: wrap; column-gap: 24px; row-gap: 0; }
.evento__push { display: flex; flex-direction: column; }
.evento__ayuda { font-size: 0.75rem; margin-top: -6px; margin-left: 52px; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }
@media (min-width: 600px) {
  .evento { flex-direction: row; align-items: center; justify-content: space-between; gap: 16px; }
  .evento__texto { flex: 1 1 auto; }
  .evento__interruptores { flex: 0 0 auto; }
}
</style>
