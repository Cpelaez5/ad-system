<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="tituloPaso"
    icono="mdi-file-excel-outline"
    max-width="760"
    persistent
    :cargando="trabajando"
    @update:model-value="$emit('update:modelValue', $event)"
    @cerrar="reiniciar"
  >
    <AvisoAmable v-if="errorArchivo" tipo="error" class="mb-3" :mensaje="errorArchivo" data-testid="importar-error" />

    <!-- PASO 1: SUBIR -->
    <div v-if="paso === 'subir'" class="imp">
      <p class="imp__intro">
        Sube tu lista de productos en Excel o CSV. <strong>No tiene que ser una plantilla</strong>: nosotros reconocemos las columnas y tú las corriges si hace falta.
      </p>

      <input ref="inputArchivo" type="file" accept=".xlsx,.xls,.csv" class="d-none" data-testid="importar-archivo" @change="alElegirArchivo" />
      <v-btn color="primary" size="x-large" block prepend-icon="mdi-upload" class="text-none imp__subir" :loading="leyendo" @click="$refs.inputArchivo.click()">
        Elegir archivo de Excel o CSV
      </v-btn>
      <p class="imp__ayuda">Archivos .xlsx, .xls o .csv, hasta 5 MB y {{ MAX_FILAS.toLocaleString('es-VE') }} filas.</p>

      <v-select
        v-model="rubro"
        :items="RUBROS"
        item-title="titulo"
        item-value="valor"
        label="Tu rubro"
        variant="outlined"
        density="comfortable"
        hide-details
        class="mb-2"
      />
      <v-btn variant="text" color="primary" class="text-none px-0 imp__plantilla" prepend-icon="mdi-download" :loading="descargando" @click="bajarPlantilla">
        Descargar plantilla de mi rubro
      </v-btn>

      <section v-if="historial.length" class="imp__historial" aria-label="Importaciones anteriores">
        <h3 class="imp__subtitulo">Importaciones anteriores</h3>
        <v-list lines="two" density="comfortable" class="pa-0">
          <v-list-item v-for="h in historial" :key="h.id" class="px-0">
            <v-list-item-title class="text-wrap">{{ tituloHistorial(h) }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap">{{ detalleHistorial(h) }}</v-list-item-subtitle>
            <template v-if="puedeDeshacer(h)" #append>
              <v-btn variant="text" color="error" class="text-none" @click="pedirDeshacer(h)">Deshacer</v-btn>
            </template>
          </v-list-item>
        </v-list>
      </section>
    </div>

    <!-- PASO 2: COLUMNAS -->
    <div v-else-if="paso === 'columnas'" class="imp">
      <p class="imp__intro"><strong>Encontramos estas columnas</strong> en «{{ nombreArchivo }}». Si alguna quedó mal, cámbiala; las que no sirvan, déjalas en «No usar».</p>

      <ul class="imp__columnas">
        <li v-for="(enc, i) in encabezados" :key="i" class="imp__columna">
          <div class="imp__col-origen">
            <div class="imp__col-nombre">{{ enc || `Columna ${i + 1}` }}</div>
            <div class="imp__col-ejemplo">{{ ejemploDe(i) }}</div>
          </div>
          <v-select
            :model-value="mapeo[i]"
            :items="itemsDestino"
            item-title="etiqueta"
            item-value="clave"
            variant="outlined"
            density="comfortable"
            hide-details
            :aria-label="`Qué es la columna ${enc}`"
            @update:model-value="cambiarMapeo(i, $event)"
          />
        </li>
      </ul>

      <AvisoAmable v-if="!mapeo.includes('nombre')" tipo="advertencia" class="mt-3" mensaje="Falta indicar cuál columna es el Nombre del producto." />

      <div v-if="hayPrecio && !monedaDetectada" class="imp__moneda">
        <div class="imp__subtitulo">¿En qué moneda están los precios?</div>
        <FiltroChips v-model="monedaDefecto" :opciones="OPCIONES_MONEDA" etiqueta="Moneda de los precios" />
        <p class="imp__ayuda">Si una celda trae «$» o «Bs», usamos esa.</p>
      </div>
    </div>

    <!-- PASO 3: REVISAR -->
    <div v-else-if="paso === 'revisar'" class="imp">
      <p class="imp__resumen" data-testid="importar-resumen">
        <strong>{{ resumen.total }} {{ resumen.total === 1 ? 'producto' : 'productos' }}</strong>: {{ textoResumen(resumen) }}
      </p>
      <BarraSegmentos :segmentos="segmentos" :etiqueta="textoResumen(resumen)" :interactiva="false" />

      <FiltroChips v-model="filtro" :opciones="opcionesFiltro" etiqueta="Ver filas" class="my-3" />

      <AvisoAmable v-if="resumen.errores" tipo="advertencia" class="mb-3" mensaje="Corrige los problemas aquí mismo u omítelos: las filas con problemas no se importarán." />

      <v-list lines="three" class="pa-0 imp__lista" data-testid="importar-filas">
        <template v-for="f in filasVisibles" :key="f.fila">
          <v-list-item class="px-0 imp__fila" :class="{ 'imp__fila--omitida': omitidas.has(f.fila) }">
            <template #prepend>
              <v-icon :icon="iconoEstado(f)" :color="colorEstado(f)" class="mr-3" />
            </template>
            <v-list-item-title class="text-wrap font-weight-bold">{{ f.datos.name || '(sin nombre)' }}</v-list-item-title>
            <v-list-item-subtitle class="text-wrap">{{ detalleFila(f) }}</v-list-item-subtitle>
            <div v-if="f.completadoCatalogo" class="imp__catalogo" data-testid="importar-completado-catalogo">
              <v-icon size="14" icon="mdi-check-decagram-outline" class="mr-1" />Completado con el catálogo
            </div>
            <div v-if="f.estado === 'error'" class="imp__error">
              <div v-for="e in f.errores" :key="e.campo + e.mensaje" class="imp__error-texto">Fila {{ f.fila }}: {{ e.mensaje }}</div>
              <div class="imp__arreglo">
                <v-text-field
                  v-for="c in camposAArreglar(f)"
                  :key="c"
                  :model-value="f.crudo[c] ?? ''"
                  :label="etiquetaCampo(c)"
                  variant="outlined"
                  density="compact"
                  hide-details
                  class="imp__arreglo-campo"
                  @update:model-value="corregir(f, c, $event)"
                />
                <v-btn variant="text" size="small" class="text-none" @click="alternarOmitida(f)">
                  {{ omitidas.has(f.fila) ? 'No omitir' : 'Omitir esta fila' }}
                </v-btn>
              </div>
            </div>
          </v-list-item>
          <v-divider />
        </template>
      </v-list>
      <v-btn v-if="filasFiltradas.length > limiteFilas" variant="text" class="text-none mt-2" @click="limiteFilas += 50">
        Ver más ({{ filasFiltradas.length - limiteFilas }} restantes)
      </v-btn>

      <AvisoAmable v-if="resumen.ajustes" tipo="info" class="mt-3" :mensaje="`${resumen.ajustes} de los productos que ya tienes traen otras existencias. No las cambiamos al importar; al terminar podrás ajustarlas.`" />

      <div v-if="importando" class="imp__progreso" aria-live="polite">
        <div class="imp__progreso-texto">Importando {{ progreso.hechas }} de {{ progreso.total }}…</div>
        <v-progress-linear :model-value="porcentaje" color="primary" height="12" rounded />
      </div>
    </div>

    <!-- PASO 4: LISTO -->
    <div v-else-if="paso === 'listo'" class="imp">
      <div class="imp__listo">
        <v-icon icon="mdi-check-decagram" size="56" color="success" />
        <h3 class="imp__listo-titulo" data-testid="importar-listo">{{ tituloListo }}</h3>
        <p v-if="resultado.fallidas" class="imp__ayuda">{{ resultado.fallidas }} no se pudieron guardar. Puedes volver a intentarlo con ese archivo.</p>
      </div>

      <PanelSiguientePaso
        v-if="filasConAjuste.length && !ajusteHecho"
        :titulo="`Ajustar existencias de ${filasConAjuste.length} ${filasConAjuste.length === 1 ? 'producto' : 'productos'}`"
        detalle="Tu archivo trae otras cantidades para productos que ya tenías. Si las ajustas, quedará un movimiento «Importación» en cada uno."
        :texto-boton="`Ajustar existencias`"
        icono-boton="mdi-scale-balance"
        :cargando="ajustando"
        @accion="ajustar"
      />
      <AvisoAmable v-else-if="ajusteHecho" tipo="info" mensaje="Existencias ajustadas." />

      <v-btn v-if="resultado.importacion && puedeDeshacer(resultado.importacion)" variant="text" color="error" class="text-none mt-3" prepend-icon="mdi-undo" :loading="deshaciendo" @click="pedirDeshacer(resultado.importacion)">
        Deshacer importación
      </v-btn>
      <p v-if="resultado.importacion && puedeDeshacer(resultado.importacion)" class="imp__ayuda">Puedes deshacerla durante 24 horas. Solo se quitan los productos nuevos que aún no tienen ventas.</p>
    </div>

    <!-- Confirmar deshacer -->
    <DialogoAdaptable v-model="confirmarDeshacer" titulo="¿Deshacer esta importación?" icono="mdi-undo" max-width="460">
      <p>Los <strong>{{ pendienteDeshacer?.ids_creados?.length || 0 }}</strong> productos nuevos de esta importación irán a la papelera. Los que ya tengan ventas se quedan. Los productos que se actualizaron no vuelven a como estaban.</p>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="deshaciendo" @click="confirmarDeshacer = false">No, dejarla</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="deshaciendo" @click="deshacer">Sí, deshacer</v-btn>
      </template>
    </DialogoAdaptable>

    <template #acciones>
      <template v-if="paso === 'subir'">
        <v-btn variant="text" class="text-none" @click="cerrar">Cancelar</v-btn>
      </template>
      <template v-else-if="paso === 'columnas'">
        <v-btn variant="text" class="text-none" @click="paso = 'subir'">Atrás</v-btn>
        <v-btn color="primary" variant="flat" size="large" class="text-none" :disabled="!mapeo.includes('nombre')" :loading="preparando" @click="irARevisar">Revisar</v-btn>
      </template>
      <template v-else-if="paso === 'revisar'">
        <v-btn variant="text" class="text-none" :disabled="importando" @click="paso = 'columnas'">Atrás</v-btn>
        <v-btn color="primary" variant="flat" size="large" class="text-none" :disabled="!aImportar.length" :loading="importando" data-testid="importar-confirmar" @click="importar">
          Importar {{ aImportar.length }} {{ aImportar.length === 1 ? 'producto' : 'productos' }}
        </v-btn>
      </template>
      <template v-else>
        <v-btn color="primary" variant="flat" size="large" class="text-none" @click="cerrar">Listo</v-btn>
      </template>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import BarraSegmentos from '@/components/ui/BarraSegmentos.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import { RUBROS } from '@/constants/rubros.js'
import { formatMoney } from '@/utils/formatMoney.js'
import { formatFechaLocal } from '@/utils/fechas.js'
import {
  MAX_FILAS, camposDestino, detectarEncabezados, sugerirMapeo, monedasPorColumna,
  filasDesdeMatriz, planificar, completarConCatalogo, resumir, textoResumen, puedeDeshacer as puedeDeshacerUtil,
} from '@/utils/importacionProductos.js'
import servicio from '@/services/importacionProductosService.js'
import { descargarPlantilla } from './plantillaRubro.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'importado'])

const OPCIONES_MONEDA = [
  { valor: 'VES', texto: 'Bolívares (Bs)' },
  { valor: 'USD', texto: 'Dólares ($)' },
]

const paso = ref('subir') // subir | columnas | revisar | listo
const rubro = ref('otro')
const monedaDefecto = ref('VES')
const nombreArchivo = ref('')
const errorArchivo = ref('')
const leyendo = ref(false)
const descargando = ref(false)
const preparando = ref(false)
const importando = ref(false)
const ajustando = ref(false)
const deshaciendo = ref(false)
const ajusteHecho = ref(false)
const inputArchivo = ref(null)

const matriz = ref([])
const filaEncabezado = ref(0)
const encabezados = ref([])
const mapeo = ref([])
const existentes = ref([])
const filasCrudas = ref([])
const omitidas = ref(new Set())
const filtro = ref('todos')
const limiteFilas = ref(50)
const progreso = ref({ hechas: 0, total: 0 })
const resultado = ref({ creados: 0, actualizados: 0, fallidas: 0, importacion: null })
const historial = ref([])
const confirmarDeshacer = ref(false)
const pendienteDeshacer = ref(null)

const trabajando = computed(() => importando.value || ajustando.value || deshaciendo.value)

const tituloPaso = computed(() => ({
  subir: 'Importar desde Excel',
  columnas: 'Revisa las columnas',
  revisar: 'Revisa antes de importar',
  listo: 'Importación lista',
}[paso.value]))

const itemsDestino = computed(() => [{ clave: '', etiqueta: 'No usar esta columna' }, ...camposDestino(rubro.value)])
const hayPrecio = computed(() => mapeo.value.includes('precio') || mapeo.value.includes('costo'))
const monedasColumna = computed(() => monedasPorColumna(encabezados.value, mapeo.value))
const monedaDetectada = computed(() => !!(monedasColumna.value.precio || monedasColumna.value.costo || mapeo.value.includes('moneda')))
const ctx = computed(() => ({ rubro: rubro.value, monedaDefecto: monedaDefecto.value, monedasColumna: monedasColumna.value }))

const catalogoPorCodigo = ref(new Map())
const plan = computed(() => completarConCatalogo(planificar(filasCrudas.value, ctx.value, existentes.value).filas, catalogoPorCodigo.value))
const resumen = computed(() => resumir(plan.value))
const aImportar = computed(() => plan.value.filter((f) => (f.estado === 'nuevo' || f.estado === 'actualizar') && !omitidas.value.has(f.fila)))
const filasConAjuste = computed(() => plan.value.filter((f) => f.ajuste && f.estado === 'actualizar'))

const opcionesFiltro = computed(() => [
  { valor: 'todos', texto: 'Todos', cantidad: resumen.value.total },
  { valor: 'nuevo', texto: 'Nuevos', cantidad: resumen.value.nuevos },
  { valor: 'actualizar', texto: 'Se actualizarán', cantidad: resumen.value.actualizar },
  { valor: 'error', texto: 'Con problemas', cantidad: resumen.value.errores },
])
const filasFiltradas = computed(() => (filtro.value === 'todos' ? plan.value : plan.value.filter((f) => f.estado === filtro.value)))
const filasVisibles = computed(() => filasFiltradas.value.slice(0, limiteFilas.value))

const TONO = { nuevo: 'success', actualizar: 'warning', error: 'error' }
const segmentos = computed(() => {
  const lista = plan.value
  const grupos = Math.min(lista.length, 60)
  if (!grupos) return []
  const tam = lista.length / grupos
  return Array.from({ length: grupos }, (_, g) => {
    const trozo = lista.slice(Math.floor(g * tam), Math.floor((g + 1) * tam) || undefined)
    const tono = trozo.some((f) => f.estado === 'error') ? 'error' : trozo.some((f) => f.estado === 'actualizar') ? 'warning' : 'success'
    return { id: `g${g}`, tono, etiqueta: `${trozo.length} ${trozo.length === 1 ? 'fila' : 'filas'}` }
  })
})

const porcentaje = computed(() => (progreso.value.total ? Math.round((progreso.value.hechas / progreso.value.total) * 100) : 0))
const tituloListo = computed(() => {
  const r = resultado.value
  const total = r.creados + r.actualizados
  if (!total) return 'No se pudo importar nada'
  const partes = []
  if (r.creados) partes.push(`${r.creados} nuevos`)
  if (r.actualizados) partes.push(`${r.actualizados} actualizados`)
  return `Listo, importamos ${total} ${total === 1 ? 'producto' : 'productos'} (${partes.join(' y ')})`
})

watch(() => props.modelValue, async (abierto) => {
  if (!abierto) return
  reiniciar()
  const [r, h] = await Promise.allSettled([servicio.obtenerRubro(), servicio.listarImportaciones()])
  if (r.status === 'fulfilled' && r.value) rubro.value = r.value
  if (h.status === 'fulfilled') historial.value = h.value
})

function reiniciar() {
  paso.value = 'subir'
  errorArchivo.value = ''
  nombreArchivo.value = ''
  matriz.value = []
  encabezados.value = []
  mapeo.value = []
  filasCrudas.value = []
  omitidas.value = new Set()
  filtro.value = 'todos'
  limiteFilas.value = 50
  ajusteHecho.value = false
  resultado.value = { creados: 0, actualizados: 0, fallidas: 0, importacion: null }
  if (inputArchivo.value) inputArchivo.value.value = ''
}

function cerrar() {
  emit('update:modelValue', false)
}

async function alElegirArchivo(e) {
  const archivo = e.target.files?.[0]
  if (!archivo) return
  errorArchivo.value = ''
  leyendo.value = true
  try {
    const { matriz: m } = await servicio.leerArchivo(archivo)
    matriz.value = m
    nombreArchivo.value = archivo.name
    prepararColumnas()
    paso.value = 'columnas'
  } catch (err) {
    errorArchivo.value = err.message || 'No pudimos leer ese archivo'
  } finally {
    leyendo.value = false
    e.target.value = ''
  }
}

function prepararColumnas() {
  filaEncabezado.value = detectarEncabezados(matriz.value, rubro.value)
  const ancho = Math.max(...matriz.value.slice(filaEncabezado.value, filaEncabezado.value + 30).map((f) => f.length), 0)
  const fila = matriz.value[filaEncabezado.value] || []
  encabezados.value = Array.from({ length: ancho }, (_, i) => String(fila[i] ?? '').trim())
  mapeo.value = sugerirMapeo(encabezados.value, rubro.value)
}

function ejemploDe(i) {
  for (let r = filaEncabezado.value + 1; r < Math.min(matriz.value.length, filaEncabezado.value + 15); r++) {
    const v = matriz.value[r]?.[i]
    if (v !== undefined && v !== null && String(v).trim() !== '') return `Ej.: ${v instanceof Date ? formatFechaLocal(v) : String(v).slice(0, 40)}`
  }
  return 'Sin datos'
}

function cambiarMapeo(i, clave) {
  const nuevo = [...mapeo.value]
  // Una clave va en una sola columna: si ya estaba en otra, esa pasa a "No usar".
  if (clave) nuevo.forEach((c, j) => { if (c === clave && j !== i) nuevo[j] = '' })
  nuevo[i] = clave || ''
  mapeo.value = nuevo
}

async function irARevisar() {
  preparando.value = true
  errorArchivo.value = ''
  try {
    existentes.value = await servicio.cargarExistentes()
    filasCrudas.value = filasDesdeMatriz(matriz.value, filaEncabezado.value, mapeo.value)
    if (filasCrudas.value.length > MAX_FILAS) {
      filasCrudas.value = filasCrudas.value.slice(0, MAX_FILAS)
    }
    catalogoPorCodigo.value = await servicio.cargarCatalogo(filasCrudas.value)
    omitidas.value = new Set()
    filtro.value = 'todos'
    limiteFilas.value = 50
    paso.value = 'revisar'
  } catch {
    errorArchivo.value = 'No pudimos revisar tus productos actuales. Revisa tu conexión e inténtalo de nuevo'
    paso.value = 'subir'
  } finally {
    preparando.value = false
  }
}

const etiquetas = computed(() => Object.fromEntries(camposDestino(rubro.value).map((c) => [c.clave, c.etiqueta])))
const etiquetaCampo = (clave) => etiquetas.value[clave] || clave

function camposAArreglar(f) {
  return [...new Set(f.errores.map((e) => e.campo))]
}

function corregir(f, campo, valor) {
  filasCrudas.value = filasCrudas.value.map((x) => (x.fila === f.fila ? { ...x, crudo: { ...x.crudo, [campo]: valor } } : x))
}

function alternarOmitida(f) {
  const s = new Set(omitidas.value)
  if (s.has(f.fila)) s.delete(f.fila)
  else s.add(f.fila)
  omitidas.value = s
}

const iconoEstado = (f) => ({ nuevo: 'mdi-plus-circle-outline', actualizar: 'mdi-sync', error: 'mdi-alert-circle-outline' }[f.estado])
const colorEstado = (f) => TONO[f.estado]

function detalleFila(f) {
  const partes = []
  partes.push({ nuevo: 'Nuevo', actualizar: 'Se actualizará', error: 'Con problemas' }[f.estado])
  if (f.datos.code) partes.push(`Código ${f.datos.code}`)
  if (f.datos.sale_price !== undefined) partes.push(formatMoney(f.datos.sale_price, f.datos.currency || ctx.value.monedaDefecto))
  if (f.datos.tipo === 'servicio') partes.push('Servicio')
  else if (f.estado === 'nuevo' && f.existencias > 0) partes.push(`${f.existencias} en existencia`)
  return partes.join(' · ')
}

async function importar() {
  importando.value = true
  progreso.value = { hechas: 0, total: aImportar.value.length }
  try {
    const r = await servicio.importarPlan(aImportar.value, {
      archivo: nombreArchivo.value,
      rubro: rubro.value,
      totalArchivo: plan.value.length,
      onProgreso: (p) => { progreso.value = p },
    })
    // Quedan registradas en el historial; las filas con problemas u omitidas cuentan como errores.
    resultado.value = { ...r, importacion: null }
    try {
      const lista = await servicio.listarImportaciones()
      historial.value = lista
      resultado.value.importacion = lista.find((h) => h.id === r.importacionId) || null
    } catch { /* el historial es un extra */ }
    paso.value = 'listo'
    emit('importado')
  } catch (err) {
    errorArchivo.value = err.message || 'No pudimos terminar la importación'
  } finally {
    importando.value = false
  }
}

async function ajustar() {
  ajustando.value = true
  try {
    await servicio.ajustarExistencias(filasConAjuste.value)
    ajusteHecho.value = true
    emit('importado')
  } finally {
    ajustando.value = false
  }
}

const puedeDeshacer = (h) => puedeDeshacerUtil(h)
function pedirDeshacer(h) {
  pendienteDeshacer.value = h
  confirmarDeshacer.value = true
}
async function deshacer() {
  deshaciendo.value = true
  try {
    await servicio.deshacerImportacion(pendienteDeshacer.value)
    confirmarDeshacer.value = false
    historial.value = await servicio.listarImportaciones()
    if (paso.value === 'listo') resultado.value.importacion = null
    emit('importado')
  } catch (err) {
    confirmarDeshacer.value = false
    errorArchivo.value = err.message || 'No pudimos deshacer la importación'
  } finally {
    deshaciendo.value = false
  }
}

function tituloHistorial(h) {
  const cuando = formatFechaLocal(h.created_at)
  const origen = h.origen === 'api' ? 'Por la API' : (h.archivo || 'Archivo')
  return `${origen} · ${cuando}${h.deshecha_en ? ' · deshecha' : ''}`
}
function detalleHistorial(h) {
  return `${h.creados} nuevos · ${h.actualizados} actualizados · ${h.con_error} con problemas`
}

async function bajarPlantilla() {
  descargando.value = true
  try { await descargarPlantilla(rubro.value) } finally { descargando.value = false }
}
</script>

<style scoped>
.imp__catalogo {
  display: flex;
  align-items: center;
  margin-top: 2px;
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.imp { display: flex; flex-direction: column; gap: 4px; }
.imp__intro { font-size: 1rem; line-height: 1.5; margin: 0 0 16px; }
.imp__ayuda { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.72); margin: 8px 0 16px; }
.imp__subir { min-height: 64px; }
.imp__plantilla { align-self: flex-start; font-size: 1rem; }
.imp__subtitulo { font-weight: 700; font-size: 1rem; margin: 0 0 8px; }
.imp__historial { margin-top: 20px; }
.imp__columnas { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.imp__columna { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; align-items: center; }
.imp__col-nombre { font-weight: 700; overflow-wrap: anywhere; }
.imp__col-ejemplo { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.72); overflow-wrap: anywhere; }
.imp__moneda { margin-top: 18px; }
.imp__resumen { font-size: 1.1rem; margin: 0 0 12px; }
.imp__fila--omitida { opacity: 0.55; }
.imp__error { margin-top: 6px; }
.imp__error-texto { color: rgb(var(--v-theme-error)); font-size: 0.95rem; overflow-wrap: anywhere; }
.imp__arreglo { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; }
.imp__arreglo-campo { flex: 1 1 160px; }
.imp__progreso { margin-top: 16px; }
.imp__progreso-texto { font-weight: 600; margin-bottom: 8px; }
.imp__listo { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 8px 0 20px; }
.imp__listo-titulo { font-size: 1.3rem; font-weight: 700; line-height: 1.3; text-wrap: balance; margin: 0; }
@media (max-width: 599px) {
  .imp__columna { grid-template-columns: 1fr; gap: 6px; }
}
</style>
