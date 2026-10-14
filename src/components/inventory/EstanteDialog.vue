<template>
  <DialogoAdaptable
    :model-value="modelValue"
    :titulo="paso === 'confirmar' ? 'Confirma el conteo' : 'Foto del estante'"
    icono="mdi-bookshelf"
    max-width="760"
    :persistent="paso === 'analizando' || trabajando"
    :cargando="trabajando"
    @update:model-value="cerrar"
  >
    <!-- ═══ Analizando ═══ -->
    <div v-if="paso === 'analizando'" class="es-espera" aria-live="polite">
      <div class="es-espera__foto">
        <img v-if="vistaPrevia" :src="vistaPrevia" alt="Tu foto del estante" class="es-espera__img">
        <v-progress-circular indeterminate color="primary" size="56" class="es-espera__giro" />
      </div>
      <p class="es-espera__mensaje">{{ mensajeEspera }}</p>
      <p class="es-espera__ayuda">Puede tardar unos segundos.</p>
    </div>

    <!-- ═══ Error / vacío ═══ -->
    <div v-else-if="paso === 'error'" class="es-espera">
      <v-icon icon="mdi-alert-circle-outline" color="warning" size="40" aria-hidden="true" />
      <p class="es-espera__mensaje">{{ error }}</p>
      <p class="es-espera__ayuda">Toma la foto más de cerca o por partes: un estante a la vez.</p>
    </div>

    <!-- ═══ Confirmar ajuste ═══ -->
    <div v-else-if="paso === 'confirmar'">
      <p class="es-intro">Vamos a cambiar las existencias de {{ ajustesReales.length }} producto{{ ajustesReales.length === 1 ? '' : 's' }}. Queda registrado como «Conteo por foto».</p>
      <ul class="es-ajustes">
        <li v-for="a in ajustesReales" :key="a.id" class="es-ajustes__fila">
          <span class="es-ajustes__nombre">{{ a.producto.name }}</span>
          <span class="es-ajustes__cambio">
            {{ a.antes }} <v-icon icon="mdi-arrow-right" size="18" aria-hidden="true" /> <strong>{{ a.despues }}</strong>
            <span class="es-ajustes__delta" :class="a.delta > 0 ? 'text-success' : 'text-error'">({{ a.delta > 0 ? '+' : '' }}{{ a.delta }})</span>
          </span>
        </li>
      </ul>
    </div>

    <!-- ═══ Resultado ═══ -->
    <div v-else>
      <p class="es-intro">
        <strong>Encontramos {{ tarjetas.length }} producto{{ tarjetas.length === 1 ? '' : 's' }}.</strong>
        Revisa, corrige lo que haga falta y elige qué hacer con ellos.
      </p>
      <v-alert v-if="demasiados" type="info" variant="tonal" density="comfortable" class="mb-3">
        Vimos muchos productos. Para más precisión, toma la foto más de cerca o por partes.
      </v-alert>

      <ul class="es-lista">
        <li v-for="t in tarjetas" :key="t.id" class="es-tarjeta" :class="{ 'es-tarjeta--omitida': !t.incluir }">
          <div class="es-tarjeta__recorte">
            <img v-if="t.recorte" :src="t.recorte.dataUrl" :alt="t.nombre" class="es-tarjeta__img">
            <v-icon v-else icon="mdi-package-variant-closed" size="28" aria-hidden="true" class="es-tarjeta__sin" />
          </div>

          <div class="es-tarjeta__centro">
            <v-text-field
              v-model="t.nombre"
              density="comfortable"
              variant="outlined"
              hide-details
              label="Nombre"
              :disabled="!t.incluir"
            />

            <div class="es-tarjeta__coincide">
              <v-chip v-if="!t.coincidencia" size="small" color="success" variant="tonal" prepend-icon="mdi-plus-circle-outline">Nuevo</v-chip>
              <v-chip v-else size="small" color="secondary" variant="tonal" prepend-icon="mdi-check-circle-outline" class="es-tarjeta__chip">
                Ya lo tienes: {{ t.coincidencia.name }} (stock {{ t.coincidencia.stock }})
              </v-chip>
              <v-btn variant="text" size="small" class="text-none" :disabled="!t.incluir" @click="t.cambiando = !t.cambiando">
                {{ t.cambiando ? 'Listo' : 'No es este' }}
              </v-btn>
            </div>

            <v-select
              v-if="t.cambiando"
              :model-value="t.coincidencia ? t.coincidencia.id : NUEVO"
              :items="opcionesCoincidencia"
              item-title="titulo"
              item-value="valor"
              label="¿Cuál es?"
              density="comfortable"
              variant="outlined"
              hide-details
              @update:model-value="v => elegirCoincidencia(t, v)"
            />

            <div class="es-tarjeta__fila">
              <div class="es-cantidad" role="group" :aria-label="`Cantidad de ${t.nombre}`">
                <v-btn icon="mdi-minus" variant="tonal" color="secondary" size="small" aria-label="Una menos" :disabled="!t.incluir || t.cantidad <= 0" @click="t.cantidad = Math.max(0, t.cantidad - 1)" />
                <input
                  v-model.number="t.cantidad"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  class="es-cantidad__valor"
                  :disabled="!t.incluir"
                  :aria-label="`Cantidad de ${t.nombre}`"
                >
                <v-btn icon="mdi-plus" variant="tonal" color="secondary" size="small" aria-label="Una más" :disabled="!t.incluir" @click="t.cantidad = (Number(t.cantidad) || 0) + 1" />
              </div>
              <v-text-field
                v-if="!t.coincidencia"
                v-model.number="t.precio"
                label="Precio (opcional)"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                density="comfortable"
                variant="outlined"
                hide-details
                prefix="Bs"
                class="es-precio"
                :disabled="!t.incluir"
              />
            </div>
          </div>

          <v-switch v-model="t.incluir" color="primary" hide-details inset density="comfortable" class="es-tarjeta__incluir" :aria-label="`Incluir ${t.nombre}`" />
        </li>
      </ul>
      <p v-if="errores.length" class="es-error" role="alert">{{ errores.join(' ') }}</p>
    </div>

    <template #acciones>
      <template v-if="paso === 'error' || paso === 'analizando'">
        <v-btn variant="text" class="text-none" @click="cerrar(false)">{{ paso === 'error' ? 'Cerrar' : 'Cancelar' }}</v-btn>
      </template>
      <template v-else-if="paso === 'confirmar'">
        <v-btn variant="text" class="text-none" :disabled="trabajando" @click="paso = 'resultado'">Volver</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" size="large" class="text-none" :loading="trabajando" @click="confirmarAjustes">
          Confirmar ajuste
        </v-btn>
      </template>
      <template v-else>
        <div class="es-acciones">
          <v-btn v-if="resumen.nuevos" color="primary" variant="flat" size="large" class="text-none" prepend-icon="mdi-plus" :disabled="trabajando" :loading="trabajando && haciendo === 'crear'" @click="crearNuevos">
            Crear {{ resumen.nuevos }} producto{{ resumen.nuevos === 1 ? '' : 's' }} nuevo{{ resumen.nuevos === 1 ? '' : 's' }}
          </v-btn>
          <v-btn v-if="resumen.ajustes" color="secondary" variant="tonal" size="large" class="text-none" prepend-icon="mdi-counter" :disabled="trabajando" @click="paso = 'confirmar'">
            Ajustar existencias de {{ resumen.ajustes }} producto{{ resumen.ajustes === 1 ? '' : 's' }}
          </v-btn>
          <v-btn variant="text" class="text-none" :disabled="trabajando" @click="cerrar(false)">Cancelar</v-btn>
        </div>
      </template>
    </template>
  </DialogoAdaptable>
</template>

<script setup>
/**
 * EstanteDialog — "Foto del estante": una foto sirve para armar el catálogo
 * (crear lo nuevo) y para contar el inventario (ajustar lo que ya existe).
 * Spec: docs/mvp/diseno/productos-y-servicios.md, sección 6.
 *
 * Nunca pisa el stock en silencio: el ajuste se muestra antes → después, se
 * confirma y se registra como movimiento ADJUSTMENT "Conteo por foto".
 */
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import inventoryService from '@/services/inventoryService'
import {
  subirFoto, subirBlob, identificarEstante, recortarImagen, medirImagen, borrarFotos, unidadDelFormulario,
} from '@/services/productoFotoService'
import {
  armarTarjetas, cajaAPixeles, construirAjustes, resumenEstante, tarjetasNuevas, MAX_PRODUCTOS_ESTANTE,
} from '@/utils/estante'

const NUEVO = '__nuevo__'
const MENSAJES = ['Subiendo tu foto…', 'Contando lo que hay en tu estante…', 'Reconociendo cada producto…', 'Preparando la lista…']

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  archivo: { type: Object, default: null },
  /** Inventario actual (para reconocer lo que ya existe). */
  productos: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue', 'cambios', 'error'])

const paso = ref('analizando') // analizando | resultado | confirmar | error
const error = ref('')
const errores = ref([])
const tarjetas = ref([])
const trabajando = ref(false)
const haciendo = ref('')
const vistaPrevia = ref(null)
const mensajeEspera = ref(MENSAJES[0])
let ticket = 0
let timer = null

const resumen = computed(() => resumenEstante(tarjetas.value))
const demasiados = computed(() => tarjetas.value.length >= MAX_PRODUCTOS_ESTANTE)
const ajustesReales = computed(() => construirAjustes(tarjetas.value).filter(a => a.delta !== 0))
const opcionesCoincidencia = computed(() => [
  { valor: NUEVO, titulo: 'Es nuevo (no lo tengo)' },
  ...props.productos
    .filter(p => !p.deleted_at && p.tipo !== 'servicio')
    .map(p => ({ valor: p.id, titulo: `${p.name} (stock ${p.stock})` })),
])

function elegirCoincidencia(t, valor) {
  t.coincidencia = valor === NUEVO ? null : props.productos.find(p => p.id === valor) || null
  t.motivo = t.coincidencia ? 'elegido' : null
}

function parar() { if (timer) { clearInterval(timer); timer = null } }

async function analizar() {
  const mio = ++ticket
  paso.value = 'analizando'
  error.value = ''
  errores.value = []
  tarjetas.value = []
  parar()
  let i = 0
  mensajeEspera.value = MENSAJES[0]
  timer = setInterval(() => { i = Math.min(i + 1, MENSAJES.length - 1); mensajeEspera.value = MENSAJES[i] }, 2500)

  try {
    const subida = await subirFoto(props.archivo)
    if (mio !== ticket) return
    if (subida.error) { parar(); error.value = subida.error; paso.value = 'error'; return }

    const { productos, error: errIA } = await identificarEstante(subida.path)
    borrarFotos([subida.path]) // la foto del estante es temporal: ya tenemos la copia local
    if (mio !== ticket) return
    parar()
    if (errIA) { error.value = errIA; paso.value = 'error'; return }
    if (!productos.length) { error.value = 'No encontramos productos en esta foto.'; paso.value = 'error'; return }

    const lista = armarTarjetas(productos, props.productos).map(t => reactive({ ...t, cambiando: false, recorte: null }))
    let medida = null
    try { medida = await medirImagen(subida.blob) } catch { /* sin recortes */ }
    if (medida) {
      for (const t of lista) {
        const rect = cajaAPixeles(t.item.box_2d, medida.ancho, medida.alto)
        if (!rect) continue
        try { t.recorte = await recortarImagen(subida.blob, rect) } catch { /* sin recorte para este */ }
        if (mio !== ticket) return
      }
    }
    tarjetas.value = lista
    paso.value = 'resultado'
  } catch {
    if (mio !== ticket) return
    parar()
    error.value = 'No pudimos leer el estante. Intenta de nuevo.'
    paso.value = 'error'
  }
}

async function crearNuevos() {
  const nuevos = tarjetasNuevas(tarjetas.value)
  if (!nuevos.length) return
  trabajando.value = true
  haciendo.value = 'crear'
  errores.value = []
  let creados = 0
  const fallaron = []
  for (const t of nuevos) {
    try {
      let foto = null
      if (t.recorte?.blob) {
        const s = await subirBlob(t.recorte.blob)
        foto = s.path
      }
      const item = t.item
      const atributos = item.presentacion ? { presentacion: item.presentacion } : {}
      let code
      try { code = await inventoryService.getNextProductSku() } catch { code = `PROD-${Date.now().toString().slice(-5)}` }
      const { data, error: err } = await inventoryService.createProduct({
        name: t.nombre.trim(), code, tipo: 'producto', unit: unidadDelFormulario(item.unidad), currency: 'VES',
        sale_price: Number(t.precio) || 0, cost_price: 0, min_stock: 5, stock: 0,
        categoria: item.categoria || null, marca: item.marca || null, atributos,
        foto_path: foto, foto_original_path: foto,
      })
      if (err) throw err
      const creado = Array.isArray(data) ? data[0] : data
      const cant = Math.max(0, Math.round(Number(t.cantidad) || 0))
      if (creado && cant > 0) {
        await inventoryService.registerMovement({
          product_id: creado.id, movement_type: 'INITIAL', quantity: cant, cost_price: 0, description: 'Conteo por foto',
        })
      }
      creados++
      tarjetas.value = tarjetas.value.filter(x => x.id !== t.id)
    } catch (e) {
      console.error('Error creando producto del estante', e)
      fallaron.push(t.nombre)
    }
  }
  trabajando.value = false
  haciendo.value = ''
  if (fallaron.length) errores.value = [`No pudimos crear: ${fallaron.join(', ')}. Intenta de nuevo.`]
  if (creados) emit('cambios', { creados, ajustados: 0 })
  if (!tarjetas.value.length) emit('update:modelValue', false)
}

async function confirmarAjustes() {
  const ajustes = ajustesReales.value
  if (!ajustes.length) { paso.value = 'resultado'; return }
  trabajando.value = true
  haciendo.value = 'ajustar'
  errores.value = []
  let hechos = 0
  const fallaron = []
  for (const a of ajustes) {
    try {
      const r = await inventoryService.registerMovement({
        product_id: a.producto.id, movement_type: 'ADJUSTMENT', quantity: Math.abs(a.delta),
        is_negative: a.delta < 0, description: 'Conteo por foto',
      })
      if (r && r.error) throw r.error
      hechos++
      tarjetas.value = tarjetas.value.filter(x => x.id !== a.id)
    } catch (e) {
      console.error('Error ajustando existencias', e)
      fallaron.push(a.producto.name)
    }
  }
  trabajando.value = false
  haciendo.value = ''
  if (fallaron.length) errores.value = [`No pudimos ajustar: ${fallaron.join(', ')}. Intenta de nuevo.`]
  if (hechos) emit('cambios', { creados: 0, ajustados: hechos })
  paso.value = 'resultado'
  if (!tarjetas.value.length) emit('update:modelValue', false)
}

function cerrar(valor) {
  if (valor !== false) return
  if (trabajando.value) return
  ticket++
  parar()
  emit('update:modelValue', false)
}

watch(() => props.modelValue, abierto => {
  if (vistaPrevia.value) { URL.revokeObjectURL(vistaPrevia.value); vistaPrevia.value = null }
  if (abierto && props.archivo) {
    vistaPrevia.value = URL.createObjectURL(props.archivo)
    analizar()
  } else {
    ticket++
    parar()
  }
})

onBeforeUnmount(() => {
  ticket++
  parar()
  if (vistaPrevia.value) URL.revokeObjectURL(vistaPrevia.value)
})
</script>

<style scoped>
.es-espera {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 16px;
  text-align: center;
}

.es-espera__foto {
  position: relative;
  width: min(280px, 80vw);
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.es-espera__img { width: 100%; height: 100%; object-fit: cover; opacity: 0.55; }
.es-espera__giro { position: absolute; inset: 0; margin: auto; }
.es-espera__mensaje { margin: 0; font-size: 1.125rem; font-weight: 700; }
.es-espera__ayuda { margin: 0; font-size: 1rem; color: rgba(var(--v-theme-on-surface), 0.65); }

.es-intro { margin: 0 0 12px; font-size: 1rem; }

.es-lista, .es-ajustes { list-style: none; margin: 0; padding: 0; }

.es-tarjeta {
  display: grid;
  grid-template-columns: 76px 1fr auto;
  gap: 12px;
  align-items: start;
  padding: 14px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.es-tarjeta:first-child { border-top: 0; }
.es-tarjeta--omitida { opacity: 0.55; }

.es-tarjeta__recorte {
  width: 76px;
  height: 76px;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.es-tarjeta__img { width: 100%; height: 100%; object-fit: cover; }
.es-tarjeta__sin { color: rgba(var(--v-theme-on-surface), 0.4); }

.es-tarjeta__centro { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

.es-tarjeta__coincide { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.es-tarjeta__chip { max-width: 100%; height: auto; min-height: 28px; }
.es-tarjeta__chip :deep(.v-chip__content) { white-space: normal; }

.es-tarjeta__fila { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }

.es-cantidad { display: inline-flex; align-items: center; gap: 6px; }

.es-cantidad__valor {
  width: 64px;
  height: 44px;
  text-align: center;
  font-size: 1.125rem;
  font-weight: 700;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.3);
  border-radius: 8px;
  background: transparent;
  color: inherit;
}

.es-precio { max-width: 170px; }

.es-ajustes__fila {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.es-ajustes__fila:first-child { border-top: 0; }
.es-ajustes__nombre { font-weight: 600; min-width: 0; }
.es-ajustes__cambio { white-space: nowrap; font-size: 1.0625rem; }
.es-ajustes__delta { margin-left: 4px; font-weight: 600; }

.es-error { margin: 12px 0 0; color: rgb(var(--v-theme-error)); }

.es-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
}

@media (max-width: 599px) {
  .es-acciones { flex-direction: column-reverse; align-items: stretch; }
  .es-tarjeta { grid-template-columns: 60px 1fr auto; gap: 10px; }
  .es-tarjeta__recorte { width: 60px; height: 60px; }
}
</style>
