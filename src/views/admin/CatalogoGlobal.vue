<template>
  <div class="catalogo-admin">
    <EncabezadoPagina
      titulo="Catálogo global"
      subtitulo="Proveedores y productos que comparten todos los negocios. Revisa lo nuevo y verifícalo."
    >
      <v-btn color="primary" size="large" prepend-icon="mdi-plus" class="text-none" data-testid="catalogo-agregar" @click="abrirFormulario()">
        Agregar
      </v-btn>
      <v-menu location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
        </template>
        <v-list density="comfortable" min-width="240">
          <v-list-item prepend-icon="mdi-file-excel-outline" title="Importar Excel de productos" data-testid="catalogo-importar" @click="abrirImportar" />
        </v-list>
      </v-menu>
    </EncabezadoPagina>

    <FiltroChips v-model="tipo" :opciones="opcionesTipo" etiqueta="Qué catálogo ver" class="mb-2" />

    <PanelSiguientePaso
      class="mb-5"
      :listo="porVerificar[tipo] === 0"
      :titulo="`Hay ${porVerificar[tipo]} ${tipo === 'proveedores' ? 'proveedores' : 'productos'} por verificar`"
      detalle="Empieza por los que más negocios confirmaron: son los más usados."
      texto-boton="Ver los más confirmados"
      icono-boton="mdi-check-decagram-outline"
      :titulo-listo="`No queda ningún ${tipo === 'proveedores' ? 'proveedor' : 'producto'} por verificar`"
      detalle-listo="Cuando un negocio aporte uno nuevo, aparecerá aquí."
      @accion="filtro = FILTROS.POR_VERIFICAR"
    />

    <FiltroChips v-model="filtro" :opciones="opcionesFiltro" etiqueta="Filtrar por estado" class="mb-2" />
    <v-text-field
      v-model="busqueda"
      :label="tipo === 'proveedores' ? 'Buscar por razón social o RIF' : 'Buscar por nombre, marca o código de barras'"
      prepend-inner-icon="mdi-magnify"
      variant="outlined"
      density="comfortable"
      clearable
      hide-details
      class="mb-4"
      data-testid="catalogo-buscar"
    />

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error" />

    <v-skeleton-loader v-if="cargando && !items.length" type="list-item-avatar-two-line@4" class="rounded-xl" />
    <EstadoVacio
      v-else-if="!items.length"
      icono="mdi-book-search-outline"
      :titulo="busqueda ? 'No encontramos nada con esa búsqueda' : 'No hay nada en esta lista'"
      :mensaje="busqueda ? 'Prueba con otra palabra o quita el filtro.' : 'Agrega uno a mano o importa tu semilla de productos desde Excel.'"
      texto-accion="Agregar"
      @accion="abrirFormulario()"
    />
    <SeccionLista
      v-else
      :titulo="tipo === 'proveedores' ? 'Proveedores' : 'Productos'"
      :meta="total > items.length ? `Mostrando ${items.length} de ${total}. Usa el buscador para afinar.` : `${total} en total`"
    >
      <div v-for="item in items" :key="item.id" class="fila-cat" data-testid="catalogo-fila">
        <v-avatar v-if="tipo === 'proveedores'" :color="item.verificado ? 'success' : 'secondary'" size="44" rounded="lg" class="flex-shrink-0">
          <v-icon :icon="item.tipo_persona === 'gobierno' ? 'mdi-bank-outline' : 'mdi-domain'" color="white" />
        </v-avatar>
        <v-avatar v-else color="grey-lighten-3" size="56" rounded="lg" class="flex-shrink-0">
          <v-img v-if="urlFoto(item)" :src="urlFoto(item)" :alt="`Foto de ${item.nombre}`" cover />
          <v-icon v-else icon="mdi-image-off-outline" color="grey" aria-label="Sin foto de estudio" />
        </v-avatar>

        <div class="fila-cat__texto">
          <div class="fila-cat__titulo">{{ tipo === 'proveedores' ? item.razon_social : item.nombre }}</div>
          <div class="fila-cat__sub">
            <template v-if="tipo === 'proveedores'">
              {{ item.rif }} · {{ item.tipo_persona === 'gobierno' ? 'Gobierno' : 'Empresa' }}
            </template>
            <template v-else>
              {{ [item.marca, item.categoria].filter(Boolean).join(' · ') || 'Sin marca ni categoría' }} · {{ item.codigo_barras }}
            </template>
          </div>
          <div class="fila-cat__estado">
            <v-chip size="small" :color="item.verificado ? 'success' : 'warning'" variant="tonal">
              {{ item.verificado ? 'Verificado' : 'Por verificar' }}
            </v-chip>
            <span class="fila-cat__conf">{{ textoConfirmaciones(item.confirmaciones) }}</span>
            <v-chip v-if="item.fuente && item.fuente !== 'aporte'" size="x-small" variant="outlined">{{ item.fuente === 'equipo' ? 'Cargado por el equipo' : 'Importado' }}</v-chip>
          </div>
        </div>

        <div class="fila-cat__acciones">
          <v-btn
            v-if="!item.verificado"
            color="primary"
            variant="flat"
            class="text-none fila-cat__principal"
            prepend-icon="mdi-check-decagram"
            :loading="trabajando === item.id"
            data-testid="catalogo-verificar"
            @click="cambiarVerificacion(item, true)"
          >
            Verificar
          </v-btn>
          <v-btn
            v-else
            variant="tonal"
            class="text-none fila-cat__principal"
            prepend-icon="mdi-pencil-outline"
            @click="abrirFormulario(item)"
          >
            Editar
          </v-btn>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" :aria-label="`Más acciones de ${tipo === 'proveedores' ? item.razon_social : item.nombre}`" />
            </template>
            <v-list density="comfortable" min-width="260">
              <v-list-item v-if="!item.verificado" prepend-icon="mdi-pencil-outline" title="Editar" @click="abrirFormulario(item)" />
              <v-list-item v-if="item.verificado" prepend-icon="mdi-close-circle-outline" title="Quitar verificación" data-testid="catalogo-quitar-verificacion" @click="cambiarVerificacion(item, false)" />
              <template v-if="tipo === 'productos'">
                <v-list-item prepend-icon="mdi-image-plus" title="Subir foto de estudio" data-testid="catalogo-subir-foto" @click="elegirFoto(item)" />
                <v-list-item prepend-icon="mdi-creation-outline" title="Generar con IA" subtitle="Próximamente" disabled />
              </template>
              <v-divider />
              <v-list-item prepend-icon="mdi-delete-outline" title="Eliminar" base-color="error" data-testid="catalogo-eliminar" @click="aEliminar = item" />
            </v-list>
          </v-menu>
        </div>
      </div>
    </SeccionLista>

    <input ref="inputFoto" type="file" accept="image/jpeg,image/png,image/webp" class="d-none" data-testid="catalogo-input-foto" @change="alElegirFoto">

    <!-- Agregar / editar -->
    <DialogoAdaptable
      v-model="formAbierto"
      :titulo="editando ? 'Editar' : (tipo === 'proveedores' ? 'Agregar proveedor' : 'Agregar producto')"
      :icono="tipo === 'proveedores' ? 'mdi-truck-delivery-outline' : 'mdi-package-variant-closed'"
      :cargando="guardando"
      max-width="560"
    >
      <v-form @submit.prevent="guardar">
        <template v-if="tipo === 'proveedores'">
          <v-text-field v-model="form.rif" label="RIF" placeholder="J-12345678-9" variant="outlined" :readonly="!!editando" :error-messages="errores.rif" data-testid="form-rif" />
          <v-text-field v-model="form.razon_social" label="Razón social" variant="outlined" :error-messages="errores.razon_social" data-testid="form-razon" />
          <v-text-field v-model="form.nombre_comercial" label="Nombre comercial (opcional)" variant="outlined" />
          <v-text-field v-model="form.domicilio_fiscal" label="Domicilio fiscal (opcional)" variant="outlined" />
          <v-text-field v-model="form.actividad" label="Actividad (opcional)" variant="outlined" />
          <v-switch v-model="form.es_contribuyente_especial" label="Es contribuyente especial" color="primary" hide-details :indeterminate="form.es_contribuyente_especial === null" />
        </template>
        <template v-else>
          <v-text-field v-model="form.codigo_barras" label="Código de barras" inputmode="numeric" variant="outlined" :readonly="!!editando" :error-messages="errores.codigo_barras" data-testid="form-codigo" />
          <v-text-field v-model="form.nombre" label="Nombre del producto" variant="outlined" :error-messages="errores.nombre" data-testid="form-nombre" />
          <v-text-field v-model="form.marca" label="Marca (opcional)" variant="outlined" />
          <v-text-field v-model="form.categoria" label="Categoría (opcional)" variant="outlined" />
          <v-text-field v-model="form.presentacion" label="Presentación (opcional)" placeholder="1 kg, 500 ml…" variant="outlined" />
          <v-text-field v-model="form.unidad" label="Unidad (opcional)" placeholder="UND, KG, LTS…" variant="outlined" />
        </template>
        <p v-if="!editando" class="text-caption text-medium-emphasis mb-0">
          Se guarda como cargado por el equipo de AD System y ya verificado.
        </p>
      </v-form>
      <template #acciones>
        <v-spacer />
        <v-btn variant="text" class="text-none" :disabled="guardando" @click="formAbierto = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" class="text-none" :loading="guardando" data-testid="form-guardar" @click="guardar">Guardar</v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Eliminar -->
    <DialogoAdaptable
      :model-value="!!aEliminar"
      titulo="¿Eliminar del catálogo?"
      icono="mdi-delete-outline"
      :cargando="eliminando"
      max-width="460"
      @update:model-value="(v) => { if (!v) aEliminar = null }"
    >
      <p class="mb-0">
        Vas a eliminar <strong>{{ aEliminar && (tipo === 'proveedores' ? aEliminar.razon_social : aEliminar.nombre) }}</strong> para todos los negocios.
        Los negocios conservan su propia copia. Esto no se puede deshacer.
      </p>
      <template #acciones>
        <v-spacer />
        <v-btn variant="text" class="text-none" :disabled="eliminando" @click="aEliminar = null">Cancelar</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="eliminando" data-testid="eliminar-confirmar" @click="confirmarEliminar">Eliminar</v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Importar Excel -->
    <DialogoAdaptable v-model="importAbierto" titulo="Importar semilla de productos" icono="mdi-file-excel-outline" :cargando="importando" max-width="560">
      <p class="mb-3">
        Sube un Excel (.xlsx, .xls o .csv) con las columnas <strong>nombre</strong>, <strong>código de barras</strong> y, si quieres,
        <strong>marca</strong>, <strong>categoría</strong>, <strong>presentación</strong> y <strong>unidad</strong>. Si el código ya existe, se completa sin borrar lo que había.
      </p>
      <v-btn variant="tonal" prepend-icon="mdi-upload" class="text-none mb-3" :disabled="importando" @click="$refs.inputExcel.click()">Elegir archivo</v-btn>
      <input ref="inputExcel" type="file" accept=".xlsx,.xls,.csv" class="d-none" data-testid="catalogo-input-excel" @change="alElegirExcel">
      <v-alert v-if="importError" type="error" variant="tonal" class="mb-3" :text="importError" />
      <div v-if="vista" data-testid="importar-resumen">
        <p class="font-weight-bold mb-1">{{ vista.validas.length }} productos listos para cargar</p>
        <p v-if="vista.duplicadas" class="text-body-2 mb-1">{{ vista.duplicadas }} repetidos dentro del archivo (se usa el primero).</p>
        <p v-if="vista.errores.length" class="text-body-2 mb-1">{{ vista.errores.length }} filas con problemas, no se cargarán:</p>
        <ul v-if="vista.errores.length" class="text-body-2 ps-5">
          <li v-for="e in vista.errores.slice(0, 5)" :key="e.fila">Fila {{ e.fila }}: {{ e.mensaje }}</li>
          <li v-if="vista.errores.length > 5">…y {{ vista.errores.length - 5 }} más</li>
        </ul>
      </div>
      <v-progress-linear v-if="importando" :model-value="avance" color="primary" class="mt-3" />
      <template #acciones>
        <v-spacer />
        <v-btn variant="text" class="text-none" :disabled="importando" @click="importAbierto = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" class="text-none" :disabled="!vista || !vista.validas.length" :loading="importando" data-testid="importar-confirmar" @click="confirmarImportar">
          Cargar {{ vista ? vista.validas.length : '' }} productos
        </v-btn>
      </template>
    </DialogoAdaptable>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import { useNotificacionStore } from '@/store/notificacionStore'
import * as servicio from '@/services/superAdminService'
import { leerArchivo } from '@/services/importacionProductosService'
import { FILTROS_CATALOGO as FILTROS, validarProveedor, validarProducto, filasSemilla } from '@/utils/catalogoAdmin'

const notificar = useNotificacionStore()

const tipo = ref('productos')
const filtro = ref(FILTROS.POR_VERIFICAR)
const busqueda = ref('')
const items = ref([])
const total = ref(0)
const cargando = ref(false)
const error = ref('')
const porVerificar = reactive({ proveedores: 0, productos: 0 })
const trabajando = ref(null)

const opcionesTipo = computed(() => [
  { valor: 'productos', texto: 'Productos', cantidad: porVerificar.productos },
  { valor: 'proveedores', texto: 'Proveedores', cantidad: porVerificar.proveedores },
])
const opcionesFiltro = computed(() => [
  { valor: FILTROS.POR_VERIFICAR, texto: 'Por verificar', cantidad: porVerificar[tipo.value] },
  { valor: FILTROS.VERIFICADOS, texto: 'Verificados' },
  { valor: FILTROS.TODOS, texto: 'Todos' },
])

const textoConfirmaciones = (n) => {
  const c = Number(n) || 0
  return c === 1 ? 'Confirmado por 1 negocio' : `Confirmado por ${c} negocios`
}
const urlFoto = (item) => servicio.urlFoto(item)

let secuencia = 0
async function cargar() {
  const mia = ++secuencia
  cargando.value = true
  error.value = ''
  const res = await servicio.listarCatalogo(tipo.value, { filtro: filtro.value, texto: busqueda.value })
  if (mia !== secuencia) return // llegó una búsqueda más nueva
  items.value = res.data
  total.value = res.total
  error.value = res.error || ''
  cargando.value = false
}
async function contar() {
  const res = await servicio.contarPorVerificar()
  porVerificar.proveedores = res.data.proveedores
  porVerificar.productos = res.data.productos
}

let temporizador = null
watch([tipo, filtro], cargar)
watch(busqueda, () => {
  clearTimeout(temporizador)
  temporizador = setTimeout(cargar, 350)
})
onMounted(() => { contar(); cargar() })
onBeforeUnmount(() => clearTimeout(temporizador))

// ── Verificar ───────────────────────────────────────────────────────────────
async function cambiarVerificacion(item, valor) {
  trabajando.value = item.id
  const res = await servicio.verificar(tipo.value, item.id, valor)
  trabajando.value = null
  if (res.error) return notificar.mostrar(res.error, 'error')
  notificar.mostrar(valor ? 'Listo, quedó verificado.' : 'Se quitó la verificación.', 'success')
  await Promise.all([cargar(), contar()])
}

// ── Agregar / editar ────────────────────────────────────────────────────────
const formAbierto = ref(false)
const editando = ref(null)
const guardando = ref(false)
const errores = ref({})
const form = reactive({})

function abrirFormulario(item = null) {
  editando.value = item
  errores.value = {}
  for (const k of Object.keys(form)) delete form[k]
  Object.assign(form, item ? { ...item } : (tipo.value === 'proveedores' ? { es_contribuyente_especial: null } : {}))
  formAbierto.value = true
}

async function guardar() {
  const v = tipo.value === 'proveedores' ? validarProveedor(form) : validarProducto(form)
  errores.value = v.errores
  if (!v.ok) return
  guardando.value = true
  const res = editando.value
    ? await servicio.editar(tipo.value, editando.value.id, form)
    : await servicio.crear(tipo.value, form)
  guardando.value = false
  if (res.error) return notificar.mostrar(res.error, 'error')
  formAbierto.value = false
  notificar.mostrar(editando.value ? 'Cambios guardados.' : 'Agregado al catálogo.', 'success')
  await Promise.all([cargar(), contar()])
}

// ── Eliminar ────────────────────────────────────────────────────────────────
const aEliminar = ref(null)
const eliminando = ref(false)
async function confirmarEliminar() {
  eliminando.value = true
  const res = await servicio.eliminar(tipo.value, aEliminar.value)
  eliminando.value = false
  if (res.error) return notificar.mostrar(res.error, 'error')
  aEliminar.value = null
  notificar.mostrar('Eliminado del catálogo.', 'success')
  await Promise.all([cargar(), contar()])
}

// ── Foto de estudio ─────────────────────────────────────────────────────────
const inputFoto = ref(null)
let productoFoto = null
function elegirFoto(item) {
  productoFoto = item
  if (inputFoto.value) { inputFoto.value.value = ''; inputFoto.value.click() }
}
async function alElegirFoto(e) {
  const archivo = e.target.files?.[0]
  if (!archivo || !productoFoto) return
  trabajando.value = productoFoto.id
  const res = await servicio.subirFotoEstudio(productoFoto, archivo)
  trabajando.value = null
  if (res.error) return notificar.mostrar(res.error, 'error')
  notificar.mostrar('Foto de estudio guardada.', 'success')
  await cargar()
}

// ── Importar Excel ──────────────────────────────────────────────────────────
const importAbierto = ref(false)
const importando = ref(false)
const importError = ref('')
const vista = ref(null)
const avance = ref(0)

function abrirImportar() {
  vista.value = null
  importError.value = ''
  avance.value = 0
  importAbierto.value = true
}
async function alElegirExcel(e) {
  const archivo = e.target.files?.[0]
  e.target.value = ''
  importError.value = ''
  vista.value = null
  if (!archivo) return
  try {
    const { matriz } = await leerArchivo(archivo)
    const res = filasSemilla(matriz)
    if (res.columnasFaltantes.length) {
      importError.value = `Al archivo le falta la columna: ${res.columnasFaltantes.map((c) => (c === 'codigo_barras' ? 'código de barras' : c)).join(' y ')}.`
      return
    }
    vista.value = res
  } catch (err) {
    importError.value = err?.message || 'No pudimos leer el archivo.'
  }
}
async function confirmarImportar() {
  if (!vista.value?.validas.length) return
  importando.value = true
  const total = vista.value.validas.length
  const res = await servicio.importarSemilla(vista.value.validas, (hechas) => { avance.value = Math.round((hechas / total) * 100) })
  importando.value = false
  if (res.error) { importError.value = res.error; return }
  importAbierto.value = false
  tipo.value = 'productos'
  notificar.mostrar(`Se cargaron ${res.data.guardadas} productos al catálogo.`, 'success')
  await Promise.all([cargar(), contar()])
}
</script>

<style scoped>
.catalogo-admin { max-width: 960px; margin: 0 auto; padding-bottom: 32px; }

.fila-cat {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}
.fila-cat__texto { flex: 1 1 auto; min-width: 0; }
.fila-cat__titulo { font-weight: 700; overflow-wrap: anywhere; }
.fila-cat__sub { font-size: 0.9rem; color: rgba(var(--v-theme-on-surface), 0.68); overflow-wrap: anywhere; }
.fila-cat__estado { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-top: 6px; }
.fila-cat__conf { font-size: 0.85rem; color: rgba(var(--v-theme-on-surface), 0.68); }
.fila-cat__acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

@media (max-width: 599px) {
  .fila-cat { flex-wrap: wrap; }
  .fila-cat__acciones { width: 100%; }
  .fila-cat__principal { flex: 1 1 auto; min-height: 44px; }
}
</style>
