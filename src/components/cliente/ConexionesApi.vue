<template>
  <section class="conexiones" aria-labelledby="conexiones-titulo">
    <button
      type="button"
      class="conexiones__cabecera"
      :aria-expanded="abierto ? 'true' : 'false'"
      aria-controls="conexiones-contenido"
      data-testid="conexiones-toggle"
      @click="alternar"
    >
      <span class="conexiones__texto">
        <span id="conexiones-titulo" class="conexiones__titulo">Conexiones</span>
        <span class="conexiones__ayuda">Conecta tu tienda en línea u otro sistema con tus productos.</span>
      </span>
      <v-icon :icon="abierto ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
    </button>

    <div v-if="abierto" id="conexiones-contenido" class="conexiones__contenido">
      <v-skeleton-loader v-if="cargando" type="list-item-two-line, list-item-two-line" class="bg-transparent" />

      <AvisoAmable v-else-if="error" tipo="error" titulo="No pudimos cargar tus llaves" :mensaje="error" texto-accion="Reintentar" @accion="cargar" />

      <template v-else>
        <EstadoVacio
          v-if="!llaves.length"
          icono="mdi-key-outline"
          titulo="Aún no tienes llaves"
          mensaje="Una llave es como una contraseña para que otro sistema pueda cargar y consultar tus productos."
          texto-accion="Crear llave"
          @accion="abrirCrear"
        />

        <template v-else>
          <v-list lines="two" class="pa-0" data-testid="conexiones-lista">
            <template v-for="l in llaves" :key="l.id">
              <v-list-item class="px-0">
                <v-list-item-title class="font-weight-bold text-wrap">{{ l.nombre }}</v-list-item-title>
                <v-list-item-subtitle class="text-wrap">
                  <code>{{ l.prefijo }}…</code> · {{ usoTexto(l) }}
                </v-list-item-subtitle>
                <template #append>
                  <v-btn variant="text" color="error" class="text-none" @click="pedirRevocar(l)">Revocar</v-btn>
                </template>
              </v-list-item>
              <v-divider />
            </template>
          </v-list>
          <v-btn color="primary" size="large" class="text-none mt-4" prepend-icon="mdi-plus" :disabled="llaves.length >= MAX_LLAVES" @click="abrirCrear">
            Crear llave
          </v-btn>
          <p v-if="llaves.length >= MAX_LLAVES" class="conexiones__nota">Tienes {{ MAX_LLAVES }} llaves activas, el máximo. Revoca una que no uses para crear otra.</p>
        </template>

        <div class="conexiones__uso">
          <h3 class="conexiones__subtitulo">Cómo usar la API</h3>
          <p class="conexiones__nota">Con tu llave puedes consultar tus productos desde otro sistema. Ejemplo para copiar y pegar:</p>
          <pre class="conexiones__codigo" data-testid="conexiones-curl">{{ ejemplo }}</pre>
          <p class="conexiones__nota">
            Para cargar productos, envía <code>POST</code> con <code>{ "productos": [ … ] }</code> (hasta 500 por vez). Si el <code>codigo</code> o el <code>codigo_barras</code> ya existe, ese producto se actualiza.
          </p>
        </div>
      </template>
    </div>

    <!-- Crear llave -->
    <DialogoAdaptable
      v-model="dialogoCrear"
      :titulo="llaveNueva ? 'Tu llave está lista' : 'Crear llave'"
      icono="mdi-key-plus"
      max-width="520"
      persistent
      :cargando="creando"
      @cerrar="cerrarCrear"
    >
      <template v-if="!llaveNueva">
        <p class="mb-4">Ponle un nombre que te recuerde dónde la usarás, por ejemplo «Mi tienda en línea».</p>
        <v-text-field
          v-model="nombre"
          label="Nombre de la llave"
          variant="outlined"
          maxlength="60"
          counter
          autofocus
          :error-messages="errorCrear"
          @keyup.enter="crear"
        />
      </template>
      <template v-else>
        <AvisoAmable tipo="advertencia" class="mb-4" titulo="Guárdala, no la volveremos a mostrar" mensaje="Si la pierdes, crea otra y revoca esta." />
        <div class="conexiones__llave" data-testid="conexiones-llave">{{ llaveNueva.llave }}</div>
        <v-btn color="primary" variant="tonal" class="text-none mt-3" :prepend-icon="copiada ? 'mdi-check' : 'mdi-content-copy'" @click="copiar">
          {{ copiada ? 'Copiada' : 'Copiar llave' }}
        </v-btn>
      </template>
      <template #acciones>
        <template v-if="!llaveNueva">
          <v-btn variant="text" class="text-none" :disabled="creando" @click="dialogoCrear = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" size="large" class="text-none" :loading="creando" :disabled="!nombre.trim()" @click="crear">Crear llave</v-btn>
        </template>
        <v-btn v-else color="primary" variant="flat" size="large" class="text-none" @click="dialogoCrear = false">Ya la guardé</v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Revocar -->
    <DialogoAdaptable v-model="dialogoRevocar" titulo="¿Revocar esta llave?" icono="mdi-key-remove" max-width="460" :cargando="revocando">
      <p>
        Los sistemas que usen <strong>{{ porRevocar?.nombre }}</strong> dejarán de funcionar de inmediato. Esto no se puede deshacer.
      </p>
      <AvisoAmable v-if="errorRevocar" tipo="error" class="mt-3" :mensaje="errorRevocar" />
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="revocando" @click="dialogoRevocar = false">No, conservarla</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="revocando" @click="revocar">Sí, revocar</v-btn>
      </template>
    </DialogoAdaptable>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { formatFechaLocal } from '@/utils/fechas.js'
import servicio, { ejemploCurl } from '@/services/apiKeysService.js'

const MAX_LLAVES = 5

const abierto = ref(false) // plegada por defecto, para no asustar
const cargando = ref(false)
const error = ref('')
const llaves = ref([])
let yaCargo = false

const dialogoCrear = ref(false)
const nombre = ref('')
const creando = ref(false)
const errorCrear = ref('')
const llaveNueva = ref(null)
const copiada = ref(false)

const dialogoRevocar = ref(false)
const porRevocar = ref(null)
const revocando = ref(false)
const errorRevocar = ref('')

const ejemplo = computed(() => ejemploCurl())

async function cargar() {
  cargando.value = true
  error.value = ''
  try {
    llaves.value = await servicio.listarLlaves()
    yaCargo = true
  } catch {
    error.value = 'Revisa tu conexión e inténtalo de nuevo.'
  } finally {
    cargando.value = false
  }
}

function alternar() {
  abierto.value = !abierto.value
  if (abierto.value && !yaCargo) cargar()
}

function usoTexto(l) {
  return l.ultimo_uso ? `Último uso: ${formatFechaLocal(l.ultimo_uso)}` : 'Sin usar todavía'
}

function abrirCrear() {
  nombre.value = ''
  errorCrear.value = ''
  llaveNueva.value = null
  copiada.value = false
  dialogoCrear.value = true
}

async function crear() {
  if (!nombre.value.trim() || creando.value) return
  creando.value = true
  errorCrear.value = ''
  try {
    llaveNueva.value = await servicio.crearLlave(nombre.value.trim())
    await cargar()
  } catch (e) {
    errorCrear.value = e.message
  } finally {
    creando.value = false
  }
}

function cerrarCrear() {
  // La llave completa no se conserva en memoria al cerrar.
  llaveNueva.value = null
  nombre.value = ''
}

async function copiar() {
  try {
    await navigator.clipboard.writeText(llaveNueva.value.llave)
    copiada.value = true
    setTimeout(() => { copiada.value = false }, 2500)
  } catch {
    // Sin permiso del portapapeles: la llave queda visible para copiarla a mano.
  }
}

function pedirRevocar(l) {
  porRevocar.value = l
  errorRevocar.value = ''
  dialogoRevocar.value = true
}

async function revocar() {
  revocando.value = true
  errorRevocar.value = ''
  try {
    await servicio.revocarLlave(porRevocar.value.id)
    dialogoRevocar.value = false
    await cargar()
  } catch (e) {
    errorRevocar.value = e.message
  } finally {
    revocando.value = false
  }
}
</script>

<style scoped>
.conexiones {
  margin-top: 28px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-top: 8px;
}
.conexiones__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 64px;
  padding: 8px 4px;
  background: none;
  border: 0;
  text-align: left;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.conexiones__cabecera:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 8px;
}
.conexiones__texto { display: flex; flex-direction: column; gap: 2px; }
.conexiones__titulo { font-size: 1.2rem; font-weight: 700; }
.conexiones__ayuda { font-size: 0.95rem; color: rgba(var(--v-theme-on-surface), 0.72); }
.conexiones__contenido { padding: 8px 4px 16px; }
.conexiones__subtitulo { font-size: 1rem; font-weight: 700; margin: 0 0 6px; }
.conexiones__uso { margin-top: 24px; }
.conexiones__nota { font-size: 0.95rem; line-height: 1.5; margin: 6px 0; color: rgba(var(--v-theme-on-surface), 0.78); }
.conexiones__codigo {
  margin: 8px 0;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-size: 0.85rem;
  overflow-x: auto;
  white-space: pre;
}
.conexiones__llave {
  padding: 14px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.95rem;
  overflow-wrap: anywhere;
  user-select: all;
}
</style>
