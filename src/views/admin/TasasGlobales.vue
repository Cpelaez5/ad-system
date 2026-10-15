<template>
  <div class="tasas-admin">
    <EncabezadoPagina titulo="Tasas globales" :subtitulo="TEXTO_HORARIO + '.'">
      <v-btn color="primary" size="large" prepend-icon="mdi-pencil-plus-outline" class="text-none" data-testid="tasa-corregir" @click="abrirDialogo()">
        Corregir o agregar tasa
      </v-btn>
    </EncabezadoPagina>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />
    <v-skeleton-loader v-if="cargando" type="heading, list-item-two-line@5" class="rounded-xl" />

    <template v-else>
      <PanelSiguientePaso
        class="mb-6"
        :listo="!huecos.length"
        :titulo="textoFaltan(huecos.length)"
        :detalle="huecos.length ? 'Son días de lunes a viernes sin ninguna tasa. Si fue un feriado, no hace falta cargarlos.' : ''"
        texto-boton="Agregar la del primer día"
        icono-boton="mdi-pencil-plus-outline"
        titulo-listo="No falta ningún día"
        detalle-listo="Los últimos 60 días hábiles tienen su tasa."
        @accion="abrirDialogo(huecos[0])"
      >
        <template v-if="huecos.length" #secundaria>
          <div class="huecos" data-testid="huecos">
            <v-chip
              v-for="f in huecos"
              :key="f"
              size="small"
              color="warning"
              variant="tonal"
              class="text-none"
              @click="abrirDialogo(f)"
            >
              {{ fechaCorta(f) }}
            </v-chip>
          </div>
        </template>
      </PanelSiguientePaso>

      <SeccionLista :titulo="`Últimos ${tabla.length} días hábiles`" icono="mdi-calendar-month-outline" ayuda="Las tasas están en bolívares por unidad de cada moneda.">
        <!-- Escritorio y tablet: una tabla -->
        <div v-if="!xs" class="tasas-tabla__marco">
          <v-table density="comfortable" class="tasas-tabla" data-testid="tabla-tasas">
            <thead>
              <tr>
                <th>Fecha</th>
                <th v-for="m in MONEDAS_TABLA" :key="m" class="text-end">{{ m }}</th>
                <th>Fuente</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in tabla" :key="f.fecha" :class="{ 'fila-hueco': f.hueco }" data-testid="fila-tasa" @click="abrirDialogo(f.fecha)">
                <td class="text-no-wrap font-weight-medium">{{ nombreDia(f.fecha) }}</td>
                <td v-for="m in MONEDAS_TABLA" :key="m" class="text-end text-no-wrap">
                  <template v-if="f.tasas[m]">{{ numero(f.tasas[m].tasa) }}</template>
                  <v-icon v-else-if="f.hueco" icon="mdi-alert-outline" color="warning" size="18" aria-label="Sin tasa" />
                  <span v-else class="text-medium-emphasis">—</span>
                </td>
                <td>
                  <v-chip v-if="f.hueco" size="small" color="warning" variant="tonal">Sin tasa</v-chip>
                  <template v-else>
                    <v-chip v-for="s in fuentes(f)" :key="s" size="x-small" :color="s === FUENTE_MANUAL ? 'primary' : undefined" variant="tonal" class="mr-1">{{ s }}</v-chip>
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Teléfono: una fila por día -->
        <template v-else>
          <div v-for="f in tabla" :key="f.fecha" class="dia-movil" :class="{ 'fila-hueco': f.hueco }" role="button" tabindex="0" data-testid="fila-tasa" @click="abrirDialogo(f.fecha)" @keydown.enter="abrirDialogo(f.fecha)">
            <div class="dia-movil__cabecera">
              <span class="font-weight-bold">{{ nombreDia(f.fecha) }}</span>
              <v-chip v-if="f.hueco" size="x-small" color="warning" variant="tonal">Sin tasa</v-chip>
              <v-chip v-for="s in fuentes(f)" :key="s" size="x-small" :color="s === FUENTE_MANUAL ? 'primary' : undefined" variant="tonal">{{ s }}</v-chip>
            </div>
            <div v-if="!f.hueco" class="dia-movil__tasas">
              <span v-for="m in MONEDAS_TABLA" :key="m" class="dia-movil__tasa">
                <span class="text-medium-emphasis">{{ m }}</span> {{ f.tasas[m] ? numero(f.tasas[m].tasa) : '—' }}
              </span>
            </div>
          </div>
        </template>
      </SeccionLista>
    </template>

    <DialogoAdaptable
      v-model="dialogo"
      titulo="Corregir o agregar tasa"
      icono="mdi-cash-sync"
      :cargando="guardando"
      max-width="480"
    >
      <template v-if="!confirmando">
        <v-text-field v-model="form.fecha" type="date" label="Fecha" variant="outlined" :max="hoyTexto" :error-messages="errores.fecha" data-testid="tasa-fecha" />
        <p class="text-body-2 mb-1">Moneda</p>
        <FiltroChips v-model="form.moneda" :opciones="opcionesMoneda" etiqueta="Moneda" class="mb-2" />
        <p v-if="errores.moneda" class="text-error text-caption mb-2">{{ errores.moneda }}</p>
        <v-text-field
          :model-value="form.tasaTexto"
          label="Tasa (Bs por unidad)"
          placeholder="104,25"
          inputmode="decimal"
          variant="outlined"
          prefix="Bs"
          :error-messages="errores.tasa"
          data-testid="tasa-valor"
          @update:model-value="(v) => (form.tasaTexto = formatearTasaEscrita(v))"
        />
      </template>
      <template v-else>
        <p class="mb-2" data-testid="tasa-confirmacion">
          Vas a guardar <strong>{{ form.moneda }}</strong> del <strong>{{ fechaCorta(form.fecha) }}</strong> en <strong>Bs {{ form.tasaTexto }}</strong>.
        </p>
        <p v-if="existente" class="mb-0 text-body-2">
          Ya había una tasa ese día: Bs {{ numero(existente.tasa) }} ({{ existente.fuente || 'sin fuente' }}). Se va a reemplazar.
        </p>
        <p v-else class="mb-0 text-body-2">No había tasa de {{ form.moneda }} ese día.</p>
      </template>
      <template #acciones>
        <v-spacer />
        <template v-if="!confirmando">
          <v-btn variant="text" class="text-none" @click="dialogo = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" class="text-none" data-testid="tasa-revisar" @click="revisar">Revisar</v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" class="text-none" :disabled="guardando" @click="confirmando = false">Volver</v-btn>
          <v-btn color="primary" variant="flat" class="text-none" :loading="guardando" data-testid="tasa-guardar" @click="guardar">Sí, guardar</v-btn>
        </template>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { useNotificacionStore } from '@/store/notificacionStore'
import { filasTasas, guardarTasaManual } from '@/services/superAdminService'
import { CODIGOS_CON_TASA, formatearTasaEscrita } from '@/utils/monedas'
import { hoyISO, formatFechaCorta, parseFechaLocal } from '@/utils/fechas'
import { construirTablaTasas, huecosDeTasas, textoFaltan, validarTasaManual, FUENTE_MANUAL, TEXTO_HORARIO } from '@/utils/tasasAdmin'

const MONEDAS_TABLA = CODIGOS_CON_TASA
const { xs } = useDisplay()
const notificar = useNotificacionStore()

const filas = ref([])
const cargando = ref(true)
const error = ref('')
const hoyTexto = hoyISO()

const tabla = computed(() => construirTablaTasas(filas.value))
const huecos = computed(() => huecosDeTasas(tabla.value))

const opcionesMoneda = MONEDAS_TABLA.map((m) => ({ valor: m, texto: m }))
const numero = (n) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaCorta = (f) => formatFechaCorta(f)
const nombreDia = (f) => {
  const d = parseFechaLocal(f)
  const dia = d ? d.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '') : ''
  return `${dia} ${formatFechaCorta(f)}`
}
const fuentes = (f) => [...new Set(Object.values(f.tasas).map((t) => t.fuente).filter(Boolean))]

async function cargar() {
  cargando.value = true
  const res = await filasTasas()
  filas.value = res.data
  error.value = res.error || ''
  cargando.value = false
}
onMounted(cargar)

// ── Corregir o agregar ──────────────────────────────────────────────────────
const dialogo = ref(false)
const confirmando = ref(false)
const guardando = ref(false)
const errores = ref({})
const form = reactive({ fecha: '', moneda: 'USD', tasaTexto: '' })

function abrirDialogo(fecha) {
  form.fecha = fecha || hoyTexto
  form.moneda = 'USD'
  form.tasaTexto = ''
  errores.value = {}
  confirmando.value = false
  dialogo.value = true
}

const existente = computed(() => {
  const f = filas.value.find((r) => r.date === form.fecha && r.currency === form.moneda)
  return f ? { tasa: f.rate, fuente: f.source } : null
})

function revisar() {
  const v = validarTasaManual({ fecha: form.fecha, moneda: form.moneda, tasaTexto: form.tasaTexto })
  errores.value = v.errores
  if (v.ok) confirmando.value = true
}

async function guardar() {
  const v = validarTasaManual({ fecha: form.fecha, moneda: form.moneda, tasaTexto: form.tasaTexto })
  if (!v.ok) { confirmando.value = false; errores.value = v.errores; return }
  guardando.value = true
  const res = await guardarTasaManual(v.valor)
  guardando.value = false
  if (res.error) return notificar.mostrar(res.error, 'error')
  dialogo.value = false
  notificar.mostrar('Tasa guardada.', 'success')
  await cargar()
}
</script>

<style scoped>
.tasas-admin { max-width: 1040px; margin: 0 auto; padding: 24px 16px 32px; }
@media (min-width: 960px) { .tasas-admin { padding: 32px 24px 40px; } }
.huecos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }

.tasas-tabla__marco { overflow-x: auto; }
.tasas-tabla { background: transparent; font-variant-numeric: tabular-nums; }
.tasas-tabla tbody tr { cursor: pointer; }
.fila-hueco { background: rgba(var(--v-theme-warning), 0.1); }

.dia-movil { padding: 12px 16px; cursor: pointer; }
.dia-movil__cabecera { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.dia-movil__tasas { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 4px; font-size: 0.9rem; font-variant-numeric: tabular-nums; }
</style>
