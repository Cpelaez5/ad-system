<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="titulo"
    :icono="guardadoOk ? 'mdi-check-circle-outline' : (esServicio ? 'mdi-briefcase-outline' : 'mdi-package-variant')"
    max-width="640"
    :cargando="guardando || subiendoFoto"
    @update:model-value="cerrar"
  >
    <!-- ═══ Guardado en modo "Foto y listo": ¿otro producto? ═══ -->
    <div v-if="guardadoOk" class="pf-listo">
      <v-icon icon="mdi-check-circle" color="success" size="64" aria-hidden="true" />
      <p class="pf-listo__titulo">¡Listo! Guardamos «{{ nombreGuardado }}»</p>
      <p class="pf-listo__texto">¿Tienes otro producto? Toma otra foto y lo cargamos igual de rápido.</p>
    </div>

    <v-form v-else ref="formRef" @submit.prevent="guardar">
      <!-- Aviso amable de la IA -->
      <v-alert
        v-if="aviso"
        :color="aviso.tipo === 'warning' ? 'warning' : 'secondary'"
        variant="tonal"
        density="comfortable"
        class="mb-4"
        :icon="aviso.icono"
      >
        {{ aviso.texto }}
      </v-alert>

      <!-- Foto -->
      <section class="pf-foto" aria-label="Foto">
        <div class="pf-foto__vista">
          <FotoProducto :src="fotoUrl" :tipo="form.tipo" :alt="form.name || 'Foto'" tamano-icono="36" />
          <v-progress-circular v-if="subiendoFoto" indeterminate color="primary" class="pf-foto__cargando" />
        </div>
        <div class="pf-foto__acciones">
          <p class="pf-foto__ayuda">{{ form.foto_path ? 'Esta es la foto de tu ' + (esServicio ? 'servicio' : 'producto') + '.' : 'Una foto ayuda a reconocerlo más rápido.' }}</p>
          <div class="pf-foto__botones">
            <v-btn variant="tonal" color="secondary" class="text-none" prepend-icon="mdi-camera-outline" :disabled="subiendoFoto" @click="camaraInput?.click()">
              {{ form.foto_path ? 'Otra foto' : 'Tomar foto' }}
            </v-btn>
            <v-btn variant="text" color="secondary" class="text-none" prepend-icon="mdi-image-outline" :disabled="subiendoFoto" @click="galeriaInput?.click()">
              Subir foto
            </v-btn>
            <v-btn
              v-if="form.foto_path"
              variant="text"
              color="secondary"
              class="text-none"
              prepend-icon="mdi-image-remove-outline"
              :disabled="subiendoFoto"
              @click="quitarFoto"
            >
              Quitar
            </v-btn>
          </div>
          <!-- Nano Banana es OPCIONAL: el cliente decide si la usa y puede cambiar de opinión -->
          <v-btn-toggle
            v-if="form.foto_path && mejoradaPath && !comparacion"
            :model-value="usandoMejorada ? 'mejorada' : 'original'"
            mandatory
            density="comfortable"
            color="primary"
            variant="outlined"
            class="pf-foto__version"
            aria-label="Qué foto usar"
            @update:model-value="usarVersion"
          >
            <v-btn value="original" class="text-none">Original</v-btn>
            <v-btn value="mejorada" class="text-none" prepend-icon="mdi-auto-fix">Mejorada</v-btn>
          </v-btn-toggle>
          <v-btn
            v-if="form.foto_path && !mejoradaPath"
            variant="outlined"
            color="primary"
            class="text-none pf-foto__mejorar"
            prepend-icon="mdi-auto-fix"
            :loading="mejorando"
            :disabled="subiendoFoto"
            @click="mejorar"
          >
            Mejorar foto con IA
          </v-btn>
          <div v-if="ofertaFotoCatalogo && !form.foto_path" class="pf-catalogo-foto" data-testid="catalogo-oferta-foto">
            <img :src="ofertaFotoCatalogo.url" alt="Foto del catálogo de AD System" class="pf-catalogo-foto__img" loading="lazy">
            <v-btn variant="tonal" color="primary" class="text-none" :loading="copiandoFoto" prepend-icon="mdi-image-plus-outline" @click="usarFotoCatalogo">
              Usar foto del catálogo
            </v-btn>
          </div>
          <p v-if="errorFoto" class="pf-foto__error" role="alert">{{ errorFoto }}</p>
        </div>
        <input ref="camaraInput" type="file" accept="image/*" capture="environment" class="d-none" @change="alElegirFoto">
        <input ref="galeriaInput" type="file" accept="image/*" class="d-none" @change="alElegirFoto">
      </section>

      <!-- Original vs. mejorada -->
      <section v-if="comparacion" class="pf-comparar" aria-label="Elige tu foto">
        <p class="pf-comparar__titulo">¿Cuál foto quieres usar?</p>
        <p class="pf-comparar__ayuda">Tú decides. Puedes cambiarla cuando quieras.</p>
        <div class="pf-comparar__par">
          <figure class="pf-comparar__opcion">
            <FotoProducto :src="comparacion.urlOriginal" :tipo="form.tipo" alt="Foto original" />
            <figcaption>Original</figcaption>
            <v-btn variant="tonal" color="secondary" block class="text-none" @click="elegirFoto('original')">Usar la original</v-btn>
          </figure>
          <figure class="pf-comparar__opcion">
            <FotoProducto :src="comparacion.urlMejorada" :tipo="form.tipo" alt="Foto mejorada con IA" />
            <figcaption>Mejorada con IA</figcaption>
            <v-btn variant="tonal" color="secondary" block class="text-none" @click="elegirFoto('mejorada')">Usar la mejorada</v-btn>
          </figure>
        </div>
      </section>

      <!-- Tipo (solo al crear) -->
      <div v-if="!producto" class="pf-tipo">
        <v-btn-toggle v-model="form.tipo" mandatory color="primary" variant="outlined" divided class="pf-tipo__toggle" aria-label="¿Qué vas a registrar?">
          <v-btn value="producto" class="text-none" prepend-icon="mdi-package-variant-closed">Producto</v-btn>
          <v-btn value="servicio" class="text-none" prepend-icon="mdi-briefcase-outline">Servicio</v-btn>
        </v-btn-toggle>
      </div>

      <v-text-field
        v-model="form.name"
        :label="esServicio ? 'Nombre del servicio' : 'Nombre del producto'"
        variant="outlined"
        :rules="[v => !!(v && v.trim()) || 'Escribe el nombre']"
        class="mb-1"
      />

      <div v-if="catalogoMarca" class="pf-catalogo-marca" data-testid="catalogo-marca-producto">
        <v-icon size="16" class="mr-1" icon="mdi-check-decagram-outline" />
        <span>{{ catalogoMarca }}</span>
        <v-btn variant="text" size="small" color="primary" class="text-none ml-1 px-2" data-testid="catalogo-no-es-este" @click="deshacerCatalogo">No es este</v-btn>
      </div>

      <section v-if="sugerencias.length" class="pf-sugerencias" aria-label="Sugerencias del catálogo" data-testid="catalogo-sugerencias">
        <p class="pf-sugerencias__titulo">¿Es alguno de estos?</p>
        <button
          v-for="s in sugerencias"
          :key="s.id || s.codigo_barras || s.nombre"
          type="button"
          class="pf-sugerencia"
          @click="elegirSugerencia(s)"
        >
          <span class="pf-sugerencia__foto">
            <img v-if="urlMiniatura(s)" :src="urlMiniatura(s)" alt="" loading="lazy">
            <v-icon v-else icon="mdi-package-variant" size="22" aria-hidden="true" />
          </span>
          <span class="pf-sugerencia__texto">
            <strong>{{ s.nombre }}</strong>
            <small v-if="s.marca">{{ s.marca }}</small>
          </span>
        </button>
      </section>

      <v-row dense>
        <v-col cols="12" :sm="mostrarStockInicial ? 6 : 12">
          <v-text-field
            v-model.number="form.sale_price"
            :label="esServicio ? 'Lo que cobras' : 'Precio de venta'"
            type="number"
            inputmode="decimal"
            step="0.01"
            min="0"
            variant="outlined"
            :prefix="prefijoMoneda"
            :hint="monedaTexto"
            persistent-hint
          />
        </v-col>
        <v-col v-if="mostrarStockInicial" cols="12" sm="6">
          <v-text-field
            v-model.number="form.initial_stock"
            label="¿Cuántas tienes?"
            type="number"
            inputmode="numeric"
            min="0"
            variant="outlined"
            hint="Puedes cambiarlo después"
            persistent-hint
          />
        </v-col>
      </v-row>

      <!-- Invitación a elegir el rubro -->
      <v-alert v-if="!rubroActual && !esServicio" color="secondary" variant="tonal" density="comfortable" class="mt-4 pf-rubro" icon="mdi-store-cog-outline">
        <p class="mb-2"><strong>¿A qué se dedica tu negocio?</strong> Así te pedimos solo los datos que importan para tus productos.</p>
        <div class="pf-rubro__fila">
          <v-select
            v-model="rubroElegido"
            :items="RUBROS"
            item-title="titulo"
            item-value="valor"
            label="Elige tu rubro"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-btn color="primary" variant="flat" class="text-none" :disabled="!rubroElegido" :loading="guardandoRubro" @click="guardarRubroElegido">Guardar</v-btn>
        </div>
      </v-alert>

      <h3 class="pf-seccion">Sobre {{ esServicio ? 'el servicio' : 'el producto' }}</h3>
      <v-row dense>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.categoria" label="Categoría" variant="outlined" placeholder="Ej. Víveres, Ropa" />
        </v-col>
        <v-col v-if="!esServicio" cols="12" sm="6">
          <v-text-field v-model="form.marca" label="Marca" variant="outlined" />
        </v-col>
        <v-col v-for="campo in camposRubro" :key="campo.clave" cols="12" sm="6">
          <v-switch
            v-if="campo.tipo === 'si_no'"
            v-model="form.atributos[campo.clave]"
            :label="campo.etiqueta"
            color="primary"
            hide-details
            inset
          />
          <v-select
            v-else-if="campo.tipo === 'opciones'"
            v-model="form.atributos[campo.clave]"
            :items="campo.opciones"
            :label="campo.etiqueta"
            variant="outlined"
            clearable
          />
          <v-text-field
            v-else
            v-model="form.atributos[campo.clave]"
            :label="campo.etiqueta"
            :type="campo.tipo === 'fecha' ? 'date' : campo.tipo === 'numero' ? 'number' : 'text'"
            :placeholder="campo.ejemplo ? 'Ej. ' + campo.ejemplo : undefined"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <v-expansion-panels variant="accordion" class="mt-3 pf-mas">
        <v-expansion-panel>
          <v-expansion-panel-title>Más datos (opcional)</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row dense class="mt-1">
              <v-col cols="12" sm="6">
                <v-text-field v-model="form.code" label="Código interno / SKU" variant="outlined" hint="Si lo dejas vacío, lo creamos nosotros" persistent-hint />
              </v-col>
              <v-col v-if="!esServicio" cols="12" sm="6">
                <v-text-field v-model="form.codigo_barras" label="Código de barras" variant="outlined" inputmode="numeric" data-testid="campo-codigo-barras">
                  <template v-if="puedeEscanear" #append-inner>
                    <v-btn variant="tonal" color="secondary" size="small" class="text-none" prepend-icon="mdi-barcode-scan" data-testid="boton-escanear" @click="escanerAbierto = true">
                      Escanear
                    </v-btn>
                  </template>
                </v-text-field>
              </v-col>
              <v-col v-if="!esServicio" cols="12" sm="6">
                <v-select v-model="form.unit" label="Unidad" :items="['UND', 'KG', 'LTS', 'MTS', 'CAJA', 'BULTO']" variant="outlined" />
              </v-col>
              <v-col cols="12" sm="6">
                <v-select
                  v-model="form.currency"
                  :items="[{ title: 'Bolívares (Bs)', value: 'VES' }, { title: 'Dólares (USD)', value: 'USD' }, { title: 'Euros (EUR)', value: 'EUR' }]"
                  item-title="title"
                  item-value="value"
                  label="Moneda del precio"
                  variant="outlined"
                />
              </v-col>
              <v-col v-if="!esServicio" cols="12" sm="6">
                <v-text-field v-model.number="form.cost_price" :label="`Costo unitario (${form.currency || 'VES'})`" type="number" inputmode="decimal" step="0.01" min="0" variant="outlined" :prefix="prefijoMoneda" />
              </v-col>
              <v-col v-if="!esServicio" cols="12" sm="6">
                <v-text-field v-model.number="form.min_stock" label="Avisarme cuando queden" type="number" inputmode="numeric" min="0" variant="outlined" hint="Stock mínimo" persistent-hint />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="form.description" label="Descripción" variant="outlined" rows="2" auto-grow />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-form>

    <template #acciones>
      <template v-if="guardadoOk">
        <v-btn variant="text" class="text-none" @click="cerrar(false)">Terminar</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" size="large" class="text-none" prepend-icon="mdi-camera-outline" @click="otraFoto">
          Tomar otra foto
        </v-btn>
      </template>
      <template v-else>
        <v-btn variant="text" class="text-none" :disabled="guardando" @click="cerrar(false)">Cancelar</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" size="large" class="text-none" :loading="guardando" :disabled="subiendoFoto" @click="guardar">
          Guardar
        </v-btn>
      </template>
    </template>
    <EscanerCodigoBarras v-if="puedeEscanear" v-model="escanerAbierto" @detectado="alEscanear" />
  </DialogoAdaptable>
</template>

<script setup>
/**
 * ProductoFormDialog — alta y edición de producto o servicio (Mi mercancía).
 *
 * - Lo esencial arriba (foto, nombre, precio, cuántas tienes); lo del rubro
 *   después; lo demás en "Más datos".
 * - Modo "Foto y listo": `prefill` trae la foto ya subida y lo que la IA reconoció;
 *   al guardar ofrece "Tomar otra foto" para cargar el catálogo en ráfaga.
 * - Servicios: sin stock, sin costo y sin movimientos de inventario.
 */
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import FotoProducto from '@/components/inventory/FotoProducto.vue'
import EscanerCodigoBarras from '@/components/inventory/EscanerCodigoBarras.vue'
import inventoryService from '@/services/inventoryService'
import { subirFoto, urlFoto, mejorarFoto, borrarFotos, unidadDelFormulario } from '@/services/productoFotoService'
import { guardarRubro } from '@/services/rubroService'
import { RUBROS, camposDe, tipoPorDefecto } from '@/constants/rubros'
import { fotosASuprimir } from '@/utils/fotosProducto'
import { buscarProducto, urlFotoCatalogo, copiarFotoCatalogoAlNegocio } from '@/services/catalogoService'
import { codigoBarrasValido, limpiarCodigoBarras } from '@/utils/codigoBarras'
import { camposDesdeCatalogo, marcaCatalogo } from '@/utils/catalogoProducto'
import { soportaEscaner } from '@/utils/escanerCodigoBarras'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** Producto a editar; null = crear. */
  producto: { type: Object, default: null },
  /** { foto_path, producto (respuesta de la IA), aviso } del flujo "Foto y listo". */
  prefill: { type: Object, default: null },
  /** Rubro del negocio (clients.rubro) o null. */
  rubro: { type: String, default: null },
  /** Tipo con el que se abre al crear sin prefill ('producto' | 'servicio'). */
  tipoInicial: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'guardado', 'otra-foto', 'rubro-guardado', 'error'])

const formRef = ref(null)
const camaraInput = ref(null)
const galeriaInput = ref(null)
const guardando = ref(false)
const guardadoOk = ref(false)
const nombreGuardado = ref('')
const subiendoFoto = ref(false)
const mejorando = ref(false)
const errorFoto = ref('')
const fotoUrl = ref(null)
const comparacion = ref(null)
// Versión "de estudio" generada con Nano Banana, guardada aparte para poder alternar.
const mejoradaPath = ref(null)
const usandoMejorada = computed(() => !!mejoradaPath.value && form.foto_path === mejoradaPath.value)
const rubroLocal = ref(null)
const rubroElegido = ref(null)
const guardandoRubro = ref(false)
// Fotos subidas en esta sesión y fotos que tenía el producto al abrir (para no dejar huérfanas).
let subidasSesion = []
let fotosIniciales = []

// Estado del catálogo global (declarado antes de `iniciar`, que se ejecuta de inmediato)
const catalogoMarca = ref('')
const sugerencias = ref([])
const ofertaFotoCatalogo = ref(null)
const copiandoFoto = ref(false)
const escanerAbierto = ref(false)
const puedeEscanear = computed(() => !props.producto && soportaEscaner())
let deshacerCatalogoDatos = null
let temporizadorCodigo = null
let temporizadorNombre = null
let codigoConsultado = ''
let nombreConsultado = ''

const nuevoForm = () => ({
  code: '', name: '', description: '', unit: 'UND', currency: 'VES',
  cost_price: 0, sale_price: null, min_stock: 5, initial_stock: null,
  tipo: 'producto', categoria: '', marca: '', codigo_barras: '',
  atributos: {}, foto_path: null, foto_original_path: null,
})
const form = reactive(nuevoForm())

const rubroActual = computed(() => rubroLocal.value || props.rubro || null)
const esServicio = computed(() => form.tipo === 'servicio')
const camposRubro = computed(() => camposDe(rubroActual.value || 'otro', form.tipo))
const mostrarStockInicial = computed(() => !props.producto && !esServicio.value)
const modoFoto = computed(() => !!props.prefill && !props.producto)
const prefijoMoneda = computed(() => (form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : 'Bs'))
const monedaTexto = computed(() => ({ VES: 'En bolívares', USD: 'En dólares', EUR: 'En euros' }[form.currency] || ''))
const titulo = computed(() => {
  if (guardadoOk.value) return 'Producto guardado'
  if (props.producto) return esServicio.value ? 'Editar servicio' : 'Editar producto'
  if (modoFoto.value) return 'Revisa lo que encontramos'
  return esServicio.value ? 'Nuevo servicio' : 'Nuevo producto'
})

const aviso = computed(() => {
  const a = props.prefill?.aviso
  if (!a || props.producto) return null
  return a
})

function iniciar() {
  reiniciarCatalogo()
  subidasSesion = []
  fotosIniciales = []
  guardadoOk.value = false
  errorFoto.value = ''
  comparacion.value = null
  mejoradaPath.value = null
  rubroElegido.value = null
  rubroLocal.value = null
  Object.assign(form, nuevoForm())
  const p = props.producto
  if (p) {
    Object.assign(form, {
      code: p.code || '', name: p.name || '', description: p.description || '', unit: p.unit || 'UND',
      currency: p.currency || 'VES', cost_price: p.cost_price ?? 0, sale_price: p.sale_price ?? 0,
      min_stock: p.min_stock ?? 5, tipo: p.tipo === 'servicio' ? 'servicio' : 'producto',
      categoria: p.categoria || '', marca: p.marca || '', codigo_barras: p.codigo_barras || '',
      atributos: { ...(p.atributos || {}) }, foto_path: p.foto_path || null, foto_original_path: p.foto_original_path || null,
    })
    fotosIniciales = [p.foto_path, p.foto_original_path]
    if (p.foto_path && p.foto_original_path && p.foto_path !== p.foto_original_path) mejoradaPath.value = p.foto_path
  } else {
    form.tipo = props.tipoInicial || tipoPorDefecto(props.rubro)
    const pre = props.prefill
    if (pre) {
      form.foto_path = pre.foto_path || null
      form.foto_original_path = pre.foto_path || null
      subidasSesion.push(pre.foto_path)
      const ia = pre.producto
      if (ia) {
        form.tipo = 'producto'
        form.name = ia.nombre || ''
        form.categoria = ia.categoria || ''
        form.marca = ia.marca || ''
        form.codigo_barras = ia.codigo_barras || ''
        form.description = ia.descripcion || ''
        form.unit = unidadDelFormulario(ia.unidad)
        const atributos = { ...(ia.atributos || {}) }
        if (ia.presentacion && !atributos.presentacion) atributos.presentacion = ia.presentacion
        form.atributos = atributos
      }
    }
  }
}

watch(() => props.modelValue, abierto => {
  if (abierto) {
    iniciar()
    nextTick(() => formRef.value?.resetValidation?.())
  }
}, { immediate: true })

watch(() => form.foto_path, async path => {
  fotoUrl.value = null
  if (path) fotoUrl.value = await urlFoto(path)
}, { immediate: true })

// ─── Catálogo global de AD System (solo al CREAR) ───────────────────────────

function reiniciarCatalogo() {
  clearTimeout(temporizadorCodigo)
  clearTimeout(temporizadorNombre)
  catalogoMarca.value = ''
  sugerencias.value = []
  ofertaFotoCatalogo.value = null
  deshacerCatalogoDatos = null
  codigoConsultado = ''
  nombreConsultado = ''
}

function urlMiniatura(item) {
  return urlFotoCatalogo(item?.foto_path)
}

/** Llena solo los campos vacíos y guarda lo anterior para "No es este". */
function aplicarCatalogo(item) {
  const actual = { name: form.name, marca: form.marca, categoria: form.categoria, unit: form.unit, atributos: form.atributos }
  const { cambios, llenados } = camposDesdeCatalogo(actual, item)
  const previo = {}
  for (const k of Object.keys(cambios)) previo[k] = k === 'atributos' ? { ...form.atributos } : form[k]
  if (item.codigo_barras && !String(form.codigo_barras || '').trim()) {
    cambios.codigo_barras = item.codigo_barras
    previo.codigo_barras = form.codigo_barras
    codigoConsultado = item.codigo_barras
  }
  if (cambios.name) nombreConsultado = cambios.name
  Object.assign(form, cambios)
  const fotoUrl = !form.foto_path && item.foto_path ? urlFotoCatalogo(item.foto_path) : null
  ofertaFotoCatalogo.value = fotoUrl ? { path: item.foto_path, url: fotoUrl } : null
  if (!llenados.length && !ofertaFotoCatalogo.value) return false
  deshacerCatalogoDatos = previo
  catalogoMarca.value = marcaCatalogo(item)
  sugerencias.value = []
  return true
}

function deshacerCatalogo() {
  if (deshacerCatalogoDatos) Object.assign(form, deshacerCatalogoDatos)
  deshacerCatalogoDatos = null
  catalogoMarca.value = ''
  ofertaFotoCatalogo.value = null
}

async function consultarPorCodigo(codigo) {
  codigoConsultado = codigo
  const [item] = await buscarProducto(codigo, 1)
  if (!item || limpiarCodigoBarras(form.codigo_barras) !== codigo) return
  aplicarCatalogo(item)
}

async function consultarPorNombre(texto) {
  nombreConsultado = texto
  const items = await buscarProducto(texto, 3)
  if (form.name?.trim() !== texto) return
  sugerencias.value = items.slice(0, 3)
}

function elegirSugerencia(item) {
  sugerencias.value = []
  aplicarCatalogo(item)
}

async function usarFotoCatalogo() {
  const oferta = ofertaFotoCatalogo.value
  if (!oferta) return
  errorFoto.value = ''
  copiandoFoto.value = true
  const path = await copiarFotoCatalogoAlNegocio(oferta.path)
  copiandoFoto.value = false
  if (!path) { errorFoto.value = 'No pudimos copiar la foto. Puedes tomar una tú.'; return }
  subidasSesion.push(path)
  form.foto_path = path
  form.foto_original_path = path
  ofertaFotoCatalogo.value = null
}

function alEscanear(codigo) {
  form.codigo_barras = codigo
}

watch(() => form.codigo_barras, valor => {
  clearTimeout(temporizadorCodigo)
  if (props.producto || !props.modelValue) return
  const codigo = limpiarCodigoBarras(valor)
  if (!codigoBarrasValido(codigo) || codigo === codigoConsultado) return
  temporizadorCodigo = setTimeout(() => consultarPorCodigo(codigo), 400)
}, { immediate: true })

watch(() => form.name, valor => {
  clearTimeout(temporizadorNombre)
  const texto = String(valor || '').trim()
  if (props.producto || !props.modelValue || esServicio.value) { sugerencias.value = []; return }
  if (texto.length < 3) { sugerencias.value = []; return }
  if (codigoBarrasValido(form.codigo_barras) || texto === nombreConsultado) return
  temporizadorNombre = setTimeout(() => consultarPorNombre(texto), 400)
}, { immediate: true })

onBeforeUnmount(() => { clearTimeout(temporizadorCodigo); clearTimeout(temporizadorNombre) })

function limpiarFotos(guardado) {
  const borrar = fotosASuprimir({
    iniciales: fotosIniciales,
    subidas: subidasSesion,
    conservar: guardado ? [form.foto_path, form.foto_original_path] : fotosIniciales,
    guardado,
  })
  if (borrar.length) borrarFotos(borrar)
}

function cerrar(valor) {
  if (valor === false && (guardando.value || subiendoFoto.value)) return
  if (valor === false && !guardadoOk.value && props.modelValue) limpiarFotos(false)
  emit('update:modelValue', valor)
}

async function alElegirFoto(e) {
  const archivo = e.target.files?.[0]
  e.target.value = ''
  if (!archivo) return
  errorFoto.value = ''
  comparacion.value = null
  subiendoFoto.value = true
  const { path, error } = await subirFoto(archivo)
  subiendoFoto.value = false
  if (error) { errorFoto.value = error; return }
  subidasSesion.push(path)
  form.foto_path = path
  form.foto_original_path = path
  mejoradaPath.value = null
}

function quitarFoto() {
  form.foto_path = null
  form.foto_original_path = null
  comparacion.value = null
  mejoradaPath.value = null
}

async function mejorar() {
  errorFoto.value = ''
  mejorando.value = true
  const original = form.foto_original_path || form.foto_path
  const { path, error } = await mejorarFoto(original)
  if (error) {
    mejorando.value = false
    errorFoto.value = error
    return
  }
  subidasSesion.push(path)
  const [urlOriginal, urlMejorada] = await Promise.all([urlFoto(original), urlFoto(path)])
  mejorando.value = false
  comparacion.value = { original, mejorada: path, urlOriginal, urlMejorada }
}

function elegirFoto(cual) {
  if (!comparacion.value) return
  form.foto_original_path = comparacion.value.original
  mejoradaPath.value = comparacion.value.mejorada
  form.foto_path = cual === 'mejorada' ? comparacion.value.mejorada : comparacion.value.original
  comparacion.value = null
}

function usarVersion(cual) {
  if (!mejoradaPath.value) return
  form.foto_path = cual === 'mejorada' ? mejoradaPath.value : (form.foto_original_path || form.foto_path)
}

async function guardarRubroElegido() {
  guardandoRubro.value = true
  const r = await guardarRubro(rubroElegido.value)
  guardandoRubro.value = false
  if (!r.ok) { emit('error', r.error); return }
  rubroLocal.value = rubroElegido.value
  emit('rubro-guardado', rubroElegido.value)
}

function armarPayload() {
  const serv = esServicio.value
  const payload = {
    name: form.name.trim(),
    description: form.description || null,
    code: (form.code || '').trim(),
    unit: serv ? 'UND' : form.unit || 'UND',
    currency: form.currency || 'VES',
    sale_price: Number(form.sale_price) || 0,
    cost_price: serv ? 0 : Number(form.cost_price) || 0,
    min_stock: serv ? 0 : Number(form.min_stock) || 0,
    tipo: form.tipo,
    categoria: form.categoria,
    marca: serv ? null : form.marca,
    codigo_barras: serv ? null : form.codigo_barras,
    atributos: form.atributos,
    foto_path: form.foto_path,
    foto_original_path: form.foto_original_path,
  }
  // Solo los campos que corresponden al tipo
  const permitidas = new Set(camposDe(rubroActual.value || 'otro', form.tipo).map(c => c.clave))
  payload.atributos = Object.fromEntries(Object.entries(form.atributos).filter(([k]) => permitidas.has(k)))
  return payload
}

async function guardar() {
  if (formRef.value) {
    const { valid } = await formRef.value.validate()
    if (!valid) return
  }
  guardando.value = true
  try {
    const payload = armarPayload()
    if (props.producto) {
      const r = await inventoryService.updateProduct(props.producto.id, payload)
      if (r?.error) throw r.error
    } else {
      if (!payload.code) {
        try { payload.code = await inventoryService.getNextProductSku() } catch { payload.code = `PROD-${Date.now().toString().slice(-5)}` }
      }
      const { data, error } = await inventoryService.createProduct({ ...payload, stock: 0 })
      if (error) throw error
      const creado = Array.isArray(data) ? data[0] : data
      const inicial = Number(form.initial_stock) || 0
      if (creado && !esServicio.value && inicial > 0) {
        await inventoryService.registerMovement({
          product_id: creado.id, movement_type: 'INITIAL', quantity: inicial,
          cost_price: payload.cost_price, description: 'Inventario Inicial',
        })
      }
    }
    nombreGuardado.value = payload.name
    limpiarFotos(true)
    emit('guardado', { nuevo: !props.producto, nombre: payload.name, servicio: esServicio.value })
    if (modoFoto.value) {
      guardadoOk.value = true
    } else {
      emit('update:modelValue', false)
    }
  } catch (e) {
    console.error('Error guardando producto', e)
    emit('error', 'No pudimos guardar. Intenta de nuevo.')
  } finally {
    guardando.value = false
  }
}

function otraFoto() {
  emit('otra-foto')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.pf-foto {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 16px;
  align-items: start;
  margin-bottom: 16px;
}

.pf-foto__vista {
  position: relative;
}

.pf-foto__cargando {
  position: absolute;
  inset: 0;
  margin: auto;
}

.pf-foto__ayuda {
  margin: 0 0 8px;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.75);
}

.pf-foto__botones {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.pf-foto__version {
  margin-top: 4px;
}

.pf-comparar__ayuda {
  margin: -4px 0 12px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.pf-foto__mejorar {
  max-width: 100%;
}

.pf-foto__error {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-error));
  font-size: 0.9375rem;
}

@media (max-width: 599px) {
  .pf-foto { grid-template-columns: 96px 1fr; gap: 12px; }
}

.pf-comparar {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
}

.pf-comparar__titulo {
  margin: 0 0 12px;
  font-weight: 700;
  font-size: 1rem;
}

.pf-comparar__par {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pf-comparar__opcion {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pf-comparar__opcion figcaption {
  font-weight: 600;
  text-align: center;
}

.pf-catalogo-marca {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0 0 8px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.pf-catalogo-foto {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.pf-catalogo-foto__img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.pf-sugerencias {
  margin: 0 0 12px;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
}

.pf-sugerencias__titulo {
  margin: 0 0 8px;
  font-weight: 700;
  font-size: 1rem;
}

.pf-sugerencia {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 6px 8px;
  border-radius: 12px;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.pf-sugerencia:hover,
.pf-sugerencia:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
  outline: none;
}

.pf-sugerencia__foto {
  flex: 0 0 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.pf-sugerencia__foto img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pf-sugerencia__texto {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 1rem;
}

.pf-sugerencia__texto small {
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.pf-tipo { margin-bottom: 16px; }
.pf-tipo__toggle { width: 100%; }
.pf-tipo__toggle :deep(.v-btn) { flex: 1 1 50%; height: 48px; }

.pf-seccion {
  margin: 20px 0 10px;
  font-size: 1rem;
  font-weight: 700;
}

.pf-rubro__fila {
  display: flex;
  gap: 12px;
  align-items: center;
}

.pf-rubro__fila > :first-child { flex: 1 1 auto; }

.pf-listo {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 32px 8px;
}

.pf-listo__titulo {
  margin: 8px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.pf-listo__texto {
  margin: 0;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>
