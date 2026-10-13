<template>
  <div class="mis-papeles">
    <!-- ═════════════ CARGANDO ═════════════ -->
    <template v-if="initialLoading">
      <v-skeleton-loader type="heading, text" class="mb-6 bg-transparent" max-width="420" />
      <v-row>
        <v-col cols="12" md="7"><v-skeleton-loader type="image" height="150" class="rounded-xl" /></v-col>
        <v-col cols="12" md="5"><v-skeleton-loader type="image" height="150" class="rounded-xl" /></v-col>
      </v-row>
      <v-skeleton-loader type="list-item-avatar-two-line@5" class="rounded-xl mt-6" />
    </template>

    <template v-else>
      <!-- ═════════════ PAPELERA ═════════════ -->
      <template v-if="currentTab === 'trash'">
        <EncabezadoPagina titulo="Papelera" subtitulo="Papeles que borraste. Puedes restaurarlos o eliminarlos para siempre.">
          <v-btn variant="tonal" prepend-icon="mdi-arrow-left" class="text-none" @click="currentTab = 'all'">
            Volver a Mis papeles
          </v-btn>
        </EncabezadoPagina>

        <EstadoVacio v-if="filteredDocs.length === 0" icono="mdi-delete-empty-outline" titulo="La papelera está vacía" />
        <v-sheet v-else class="mis-papeles__lista" rounded="xl" border>
          <template v-for="(doc, i) in filteredDocs" :key="doc.id">
            <v-divider v-if="i > 0" />
            <TarjetaDocumentoFiscal
              :doc="doc"
              papelera
              :restaurando="restoring"
              :categoria-titulo="getCategoryTitle(doc.category)"
              @restaurar="restoreDoc"
              @eliminar-definitivo="confirmDelete"
            />
          </template>
        </v-sheet>
      </template>

      <!-- ═════════════ VISTA PRINCIPAL ═════════════ -->
      <template v-else>
        <EncabezadoPagina
          titulo="Mis papeles"
          subtitulo="Ten los papeles de tu negocio al día. Te avisamos antes de que venzan."
        >
          <v-btn color="primary" size="large" prepend-icon="mdi-upload" class="text-none" @click="openDialog()">
            Subir documento
          </v-btn>
          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="large" aria-label="Más opciones" />
            </template>
            <v-list density="comfortable" min-width="240">
              <v-list-item prepend-icon="mdi-file-pdf-box" title="Exportar expediente (PDF)" :disabled="exporting" @click="exportToPDF" />
              <v-list-item prepend-icon="mdi-delete-outline" :title="`Papelera (${stats.trash})`" @click="currentTab = 'trash'" />
            </v-list>
          </v-menu>
        </EncabezadoPagina>

        <!-- AVANCE + SIGUIENTE PASO -->
        <div class="mis-papeles__panel">
          <section class="mis-papeles__avance" aria-label="Avance de tus papeles">
            <BarraPapeles :papeles="papeles" @elegir="irAPapel" />
          </section>

          <section
            class="mis-papeles__paso"
            :class="paso ? `mis-papeles__paso--${paso.estado.clave}` : 'mis-papeles__paso--listo'"
            aria-live="polite"
          >
            <template v-if="paso">
              <div class="mis-papeles__paso-etiqueta">Tu siguiente paso</div>
              <div class="mis-papeles__paso-titulo">{{ textoPaso.titulo }}</div>
              <p class="mis-papeles__paso-detalle">{{ textoPaso.detalle }}</p>
              <div class="mis-papeles__paso-acciones">
                <v-btn color="primary" size="large" :prepend-icon="paso.estado.accion.icono" class="text-none" @click="ejecutarPaso(paso)">
                  {{ textoPaso.boton }}
                </v-btn>
                <v-btn
                  v-if="pendientesDespuesDelPaso > 0"
                  variant="text"
                  class="text-none"
                  @click="filtro = 'pendientes'"
                >
                  Ver los {{ pendientesDespuesDelPaso }} que siguen
                </v-btn>
              </div>
            </template>
            <template v-else>
              <v-icon icon="mdi-check-decagram" size="40" color="success" class="mb-2" />
              <div class="mis-papeles__paso-titulo">¡Tu negocio está al día!</div>
              <p class="mis-papeles__paso-detalle">Todos tus papeles están vigentes. Te avisaremos por correo antes de que algo venza.</p>
            </template>
          </section>
        </div>

        <!-- FILTROS -->
        <v-chip-group v-model="filtro" mandatory selected-class="mis-papeles__filtro--activo" class="mis-papeles__filtros" aria-label="Filtrar papeles">
          <v-chip value="todos" variant="outlined" size="large">Todos · {{ resumen.total + resumen.noaplica }}</v-chip>
          <v-chip value="pendientes" variant="outlined" size="large" :disabled="!resumen.porResolver">
            Por resolver · {{ resumen.porResolver }}
          </v-chip>
          <v-chip value="aldia" variant="outlined" size="large" :disabled="!resumen.aldia">Al día · {{ resumen.aldia }}</v-chip>
        </v-chip-group>

        <!-- LISTA POR CATEGORÍA -->
        <TransitionGroup tag="div" name="seccion" class="mis-papeles__secciones">
          <section v-for="seccion in seccionesVisibles" :key="seccion.valor" class="mis-papeles__seccion">
            <header class="mis-papeles__seccion-cabecera">
              <h2 class="mis-papeles__seccion-titulo">
                <v-icon :icon="getCategoryIcon(seccion.valor)" size="20" class="mr-2" />{{ seccion.titulo }}
              </h2>
              <span class="mis-papeles__seccion-avance" :class="{ 'text-success': seccion.alDia === seccion.total && seccion.total > 0 }">
                {{ seccion.alDia }} de {{ seccion.total }} al día
              </span>
            </header>
            <v-sheet class="mis-papeles__lista" rounded="xl" border>
              <template v-for="(papel, i) in seccion.papeles" :key="papel.id">
                <v-divider v-if="i > 0" />
                <TarjetaDocumentoFiscal
                  :doc="papel.doc"
                  :pendiente="papel.pendiente"
                  :frecuencia="papel.frecuencia"
                  :class="{ 'fila-papel--resaltada': resaltado === papel.id }"
                  @ver="openPreview"
                  @editar="openDialog"
                  @eliminar="confirmDelete"
                  @subir="openDialogForPending"
                />
              </template>
            </v-sheet>
          </section>
        </TransitionGroup>

        <EstadoVacio
          v-if="seccionesVisibles.length === 0"
          icono="mdi-file-search-outline"
          titulo="No hay papeles con este filtro"
          mensaje="Prueba con «Todos» para ver la lista completa."
        />

        <!-- DECLARACIONES Y PAGOS PERIÓDICOS -->
        <section v-if="filtro === 'todos' && tiposRecurrentes.length" class="mis-papeles__seccion mis-papeles__periodicos">
          <header class="mis-papeles__seccion-cabecera">
            <div>
              <h2 class="mis-papeles__seccion-titulo">
                <v-icon icon="mdi-calendar-sync-outline" size="20" class="mr-2" />Declaraciones y pagos periódicos
              </h2>
              <p class="mis-papeles__seccion-ayuda">Los que se presentan cada mes, trimestre o año. Elige el año que quieres revisar.</p>
            </div>
            <v-select
              v-model="selectedYear"
              :items="availableYears"
              density="comfortable"
              variant="outlined"
              hide-details
              label="Año"
              class="mis-papeles__anio"
            />
          </header>
          <FiscalPeriodTracker
            v-for="tipo in tiposRecurrentes"
            :key="tipo.categoria + '-' + tipo.type.id"
            :type="tipo.type"
            :category="tipo.categoria"
            :documents="getDocsForType(tipo.type.id)"
            :year="selectedYear"
            @open-preview="openPreview"
            @open-dialog="handleTrackerDialog"
            @delete-doc="confirmDelete"
          />
        </section>
      </template>
    </template>

    <!-- ═════════════ DIÁLOGOS ═════════════ -->
    <FiscalDocDialog
      v-model="dialogOpen"
      :editing-item="editingItem"
      :loading="saving"
      @save="handleSave"
      @close="dialogOpen = false"
    />

    <DialogoAdaptable
      v-model="deleteDialog"
      :titulo="currentTab === 'trash' ? '¿Eliminar para siempre?' : '¿Mover a la papelera?'"
      icono="mdi-delete-outline"
      max-width="460"
      :cargando="deleting"
    >
      <p class="mb-3">
        <template v-if="currentTab === 'trash'">Esto <strong>no se puede deshacer</strong>: se borra el registro y su archivo.</template>
        <template v-else>Podrás restaurarlo desde la papelera si lo necesitas.</template>
      </p>
      <p class="font-weight-bold mb-0">{{ itemToDelete?.name }}</p>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="deleting" @click="deleteDialog = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="deleting" @click="executeDelete">
          {{ currentTab === 'trash' ? 'Eliminar para siempre' : 'Mover a la papelera' }}
        </v-btn>
      </template>
    </DialogoAdaptable>

    <DialogoAdaptable
      v-model="previewDialog"
      :titulo="previewItem?.name || 'Documento'"
      :icono="previewItem ? getCategoryIcon(previewItem.category) : 'mdi-file-document-outline'"
      max-width="960"
    >
      <template v-if="previewItem">
        <div class="mis-papeles__detalle">
          <dl class="mis-papeles__datos">
            <div>
              <dt>Estado</dt>
              <dd :class="`text-${estadoPreview.semaforo.color === 'grey' ? 'medium-emphasis' : estadoPreview.semaforo.color}`">
                <v-icon :icon="estadoPreview.semaforo.icono" size="18" class="mr-1" />{{ estadoPreview.semaforo.texto }}
              </dd>
            </div>
            <div><dt>Categoría</dt><dd>{{ getCategoryTitle(previewItem.category) }}</dd></div>
            <div v-if="previewItem.emission_date"><dt>Emitido</dt><dd>{{ formatDate(previewItem.emission_date) }}</dd></div>
            <div v-if="previewItem.expiration_date"><dt>Vence</dt><dd>{{ formatDate(previewItem.expiration_date) }}</dd></div>
            <div v-if="previewItem.notes" class="mis-papeles__datos-notas"><dt>Notas</dt><dd>{{ previewItem.notes }}</dd></div>
          </dl>

          <div class="mis-papeles__archivo">
            <template v-if="previewItem.documents?.file_url">
              <iframe
                v-if="isFilePDF(previewItem.documents.file_url)"
                :src="previewItem.documents.file_url"
                title="Vista previa del documento"
              />
              <v-img v-else :src="previewItem.documents.file_url" contain max-height="520" />
            </template>
            <EstadoVacio
              v-else
              icono="mdi-file-hidden"
              titulo="Sin archivo adjunto"
              mensaje="Toca «Editar» para agregar una foto o un PDF."
            />
          </div>
        </div>
      </template>
      <template #acciones>
        <v-btn
          v-if="previewItem?.documents?.file_url"
          variant="tonal"
          prepend-icon="mdi-download"
          class="text-none"
          :href="previewItem.documents.file_url"
          target="_blank"
        >
          Descargar
        </v-btn>
        <v-spacer />
        <v-btn variant="text" prepend-icon="mdi-pencil-outline" class="text-none" @click="previewDialog = false; openDialog(previewItem)">Editar</v-btn>
        <v-btn color="primary" variant="flat" class="text-none" @click="previewDialog = false">Cerrar</v-btn>
      </template>
    </DialogoAdaptable>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="bottom">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { jsPDF } from 'jspdf'
import FiscalDocDialog from '@/components/fiscal/FiscalDocDialog.vue'
import FiscalPeriodTracker from '@/components/fiscal/FiscalPeriodTracker.vue'
import TarjetaDocumentoFiscal from '@/components/fiscal/TarjetaDocumentoFiscal.vue'
import BarraPapeles from '@/components/fiscal/BarraPapeles.vue'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'
import { estadoPapel, siguientePaso, resumenPapeles, GRUPOS_POR_RESOLVER } from '@/utils/estadoPapel'
import { formatFechaCorta } from '@/utils/fechas'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import fiscalService from '@/services/fiscalService'
import userService from '@/services/userService'
import { obtenerUrlFirmada } from '@/services/storageUrlService.js'
import systemLogo from '/ADSystem/logo.png'
import { FISCAL_TYPES, isRecurringFrequency } from '@/constants/fiscalDocuments'
import { semaforoDocumento } from '@/utils/semaforoDocumento'

// Data
const initialLoading = ref(true)
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const restoring = ref(false)
const exporting = ref(false)
const docs = ref([])
const stats = reactive({ total: 0, vigente: 0, tramite: 0, vencido: 0, noAplica: 0, porVencer: 0, trash: 0 })
const currentTab = ref('all') // 'all' | 'trash' — la vista principal ahora agrupa todas las categorías en una sola pantalla
const dialogOpen = ref(false)
const deleteDialog = ref(false)
const previewDialog = ref(false)
const editingItem = ref(null)
const itemToDelete = ref(null)
const previewItem = ref(null)
const snackbar = ref({ show: false, message: '', color: 'error' })

// Selector de período
const now = new Date()
const selectedYear = ref(now.getFullYear())
const statusFilter = ref('ALL')

// Años disponibles para el selector (desde 2020 hasta el próximo año)
const availableYears = computed(() => {
    const current = new Date().getFullYear()
    const years = []
    for (let y = 2020; y <= current + 1; y++) years.push(y)
    return years.sort((a, b) => b - a) // Orden descendente para acceso rápido a recientes
})

// (Meses eliminados ya que FiscalPeriodTracker maneja los períodos internamente)


// Orden pedido por la contadora: Legal, Municipal, SENIAT, Nómina primero.
const categories = [
    { title: 'Legal', value: 'LEGAL' },
    { title: 'Municipal', value: 'MUNICIPAL' },
    { title: 'Seniat', value: 'SENIAT' },
    { title: 'Parafiscales y nómina', value: 'NOMINA' },
    { title: 'Libros Contables', value: 'LIBROS' },
    { title: 'Otros', value: 'OTROS' }
]

const getCategoryTitle = (catValue) => {
    const cat = categories.find(c => c.value === catValue)
    return cat ? cat.title : catValue
}

// Computed
// Utilities for the new grouping layout
const getRecurringTypes = (cat) => {
    const types = FISCAL_TYPES[cat] || []
    // Incluir: frecuencias recurrentes, ANNUAL, y tipos "flexible" (sin cadencia fija pero con lista libre)
    return types.filter(t => isRecurringFrequency(t.frequency) || t.frequency === 'ANNUAL' || t.flexible)
}

const getNonRecurringTypes = (cat) => {
    const types = FISCAL_TYPES[cat] || []
    return types.filter(t => !isRecurringFrequency(t.frequency) && t.frequency !== 'ANNUAL')
}

const getDocsForType = (typeId) => {
    return docs.value.filter(d => d.doc_type === typeId)
}

// Documentos de una categoría que ya pasaron el filtro de estado global.
// A diferencia de la versión anterior, NO depende de una pestaña activa:
// la pantalla ahora muestra todas las categorías a la vez (una debajo de otra).
const getDocsForCategory = (cat) => {
    let filtered = docs.value.filter(d => d.category === cat)
    if (statusFilter.value !== 'ALL') {
        filtered = filtered.filter(d => {
            const st = getEffectiveStatus(d)
            if (statusFilter.value === 'VIGENTE') return st === 'VIGENTE' || st === 'PRESENTADO'
            return st === statusFilter.value
        })
    }
    return filtered
}

const getNonRecurringDocsForCategory = (cat) => {
    const nrTypes = getNonRecurringTypes(cat).map(t => t.id)
    return getDocsForCategory(cat).filter(d => {
        if (!d.doc_type) return true // Ad-hoc sin tipo estricto
        return nrTypes.includes(d.doc_type)
    })
}

// Documentos permanentes/únicos requeridos pero aún sin subir (los recurrentes
// pendientes los maneja FiscalPeriodTracker con su propia lógica de "Falta").
const getPendingDocsForCategory = (cat) => {
    if (statusFilter.value !== 'ALL') return []

    const pending = []
    const nrTypes = getNonRecurringTypes(cat)

    nrTypes.forEach(type => {
        if (!type.required) return
        const exists = docs.value.some(d => {
            if (d.category !== cat) return false
            if (d.doc_type === type.id) return true
            // Fallback fuzzy match only if doc_type is missing
            let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
            // Evitar falso positivo: "RIF de Socios" contiene "RIF"
            if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) {
                isNameMatch = false
            }
            return isNameMatch
        })

        if (!exists) {
            pending.push({ ...type, category: cat, isPending: true })
        }
    })

    return pending
}

// ═══ Mis papeles (rediseño 2026-10-13): una lista unificada de papeles ═══
// Cada papel = documento único subido o requerido sin subir. Los periódicos
// (declaraciones mensuales, etc.) van aparte, en "Declaraciones y pagos".
const filtro = ref('todos') // 'todos' | 'pendientes' | 'aldia'
const resaltado = ref(null)

// Ciclo de un documento subido según su tipo (PERMANENT, VIGENTE, AdHoc…).
const frecuenciaDe = (doc) => {
    const tipo = (FISCAL_TYPES[doc.category] || []).find(t => t.id === doc.doc_type)
    return tipo?.frequency || (doc.doc_type ? null : 'AdHoc')
}

const papeles = computed(() => {
    const lista = []
    categories.forEach(cat => {
        getNonRecurringDocsForCategory(cat.value).forEach(doc => {
            lista.push({ id: doc.id, nombre: doc.name || 'Documento', categoria: cat.value, doc, pendiente: null, frecuencia: frecuenciaDe(doc), estado: estadoPapel({ doc, frecuencia: frecuenciaDe(doc) }) })
        })
        getPendingDocsForCategory(cat.value).forEach(pendiente => {
            lista.push({ id: `pendiente-${cat.value}-${pendiente.id}`, nombre: pendiente.label, categoria: cat.value, doc: null, pendiente, frecuencia: pendiente.frequency, estado: estadoPapel({ pendiente }) })
        })
    })
    return lista
})

const resumen = computed(() => resumenPapeles(papeles.value))
const paso = computed(() => siguientePaso(papeles.value))

const pendientesDespuesDelPaso = computed(() => {
    const r = resumen.value
    return Math.max(0, r.porResolver - (paso.value ? 1 : 0))
})

const ORDEN_EN_SECCION = { atender: 0, falta: 1, completar: 2, tramite: 3, aldia: 4, noaplica: 5 }
const pasaFiltro = (papel) => {
    if (filtro.value === 'pendientes') return GRUPOS_POR_RESOLVER.includes(papel.estado.clave)
    if (filtro.value === 'aldia') return papel.estado.clave === 'aldia'
    return true
}

const seccionesVisibles = computed(() => categories
    .map(cat => {
        const todos = papeles.value.filter(p => p.categoria === cat.value)
        const cuentan = todos.filter(p => p.estado.clave !== 'noaplica')
        return {
            valor: cat.value,
            titulo: cat.title,
            total: cuentan.length,
            alDia: cuentan.filter(p => p.estado.clave === 'aldia').length,
            papeles: todos.filter(pasaFiltro).sort((a, b) => ORDEN_EN_SECCION[a.estado.clave] - ORDEN_EN_SECCION[b.estado.clave]),
        }
    })
    .filter(sec => sec.papeles.length > 0))

const tiposRecurrentes = computed(() => categories.flatMap(cat =>
    getRecurringTypes(cat.value)
        .filter(type => isRecurringFrequency(type.frequency) || type.frequency === 'ANNUAL')
        .map(type => ({ categoria: cat.value, type }))))

const textoPaso = computed(() => {
    const p = paso.value
    if (!p) return { titulo: '', detalle: '', boton: '' }
    if (p.estado.clave === 'atender') {
        return {
            titulo: `Renueva: ${p.nombre}`,
            detalle: `${p.estado.semaforo.texto}. Tenerlo al día te evita multas y problemas con el SENIAT o la alcaldía.`,
            boton: 'Renovar ahora',
        }
    }
    if (p.estado.clave === 'falta') {
        const detalle = p.frecuencia === 'PERMANENT'
            ? 'Se sube una sola vez y queda guardado. Basta con una foto o un PDF.'
            : 'Súbelo con su fecha de vencimiento y te avisamos antes de que venza. Basta con una foto o un PDF.'
        return { titulo: `Sube: ${p.nombre}`, detalle, boton: 'Subir ahora' }
    }
    if (p.estado.clave === 'completar') {
        return {
            titulo: `Completa: ${p.nombre}`,
            detalle: 'Lo subiste sin fecha de vencimiento. Agrégala para que podamos avisarte antes de que venza.',
            boton: 'Agregar fecha',
        }
    }
    return {
        titulo: `Actualiza: ${p.nombre}`,
        detalle: 'Lo marcaste "en trámite". Cuando te lo entreguen, súbelo aquí con sus fechas.',
        boton: 'Actualizar',
    }
})

const ejecutarPaso = (p) => {
    const evento = p.estado.accion.evento
    if (evento === 'subir') openDialogForPending(p.pendiente)
    else if (evento === 'editar') openDialog(p.doc)
    else openPreview(p.doc)
}

// Desde la barra: muestra ese papel en la lista y lo resalta un momento.
const irAPapel = async (papel) => {
    filtro.value = 'todos'
    resaltado.value = papel.id
    await nextTick()
    const fila = document.querySelector(`[data-papel-id="${papel.id}"]`)
    fila?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => { if (resaltado.value === papel.id) resaltado.value = null }, 1600)
}

const estadoPreview = computed(() => estadoPapel({ doc: previewItem.value, frecuencia: previewItem.value ? frecuenciaDe(previewItem.value) : null }))

// Filtro de documentos para la vista de PAPELERA (la vista principal ya no
// usa una lista plana: se agrupa por categoría con getDocsForCategory).
const filteredDocs = computed(() => docs.value)

// Detailed Compliance Logic
// VENCIDO documents count as 0.5, VIGENTE/TRAMITE count as 1.0
const complianceDetail = computed(() => {
    const result = {}
    let totalRequired = 0
    let totalCovered = 0

    // Iterate known categories
    categories.forEach(catObj => {
        const cat = catObj.value
        if (cat === 'OTROS') return // Skip OTROS for strict compliance
        
        const types = FISCAL_TYPES[cat] || []
        const requiredTypes = types.filter(t => t.required)
        const catTotal = requiredTypes.length
        let catCovered = 0

        requiredTypes.forEach(type => {
            // Find docs that match this type
            const matchingDocs = docs.value.filter(d => {
                if (d.category !== cat) return false
                const isTypeMatch = d.doc_type === type.id
                // Fallback fuzzy match only if doc_type is missing
                let isNameMatch = !d.doc_type && d.name.toLowerCase().includes(type.label.toLowerCase())
                
                // Evitar falso positivo: "RIF de Socios" contiene "RIF"
                if (isNameMatch && type.id === 'RIF' && d.name.toLowerCase().includes('socios')) {
                    isNameMatch = false
                }

                return isTypeMatch || isNameMatch
            })

            // Check if any matching doc is valid (NO_APLICA = cuenta como cubierto)
            const hasNoAplica = matchingDocs.some(d => d.status === 'NO_APLICA')
            const hasValidDoc = matchingDocs.some(d => {
                const status = getEffectiveStatus(d)
                return status === 'VIGENTE' || status === 'PRESENTADO' || status === 'TRAMITE' || status === 'NO_APLICA'
            })

            if (hasValidDoc) {
                catCovered++
                totalCovered++
            }
        })

        result[cat] = {
            total: catTotal,
            covered: catCovered,
            rate: catTotal === 0 ? 100 : Math.round((catCovered / catTotal) * 100)
        }
        
        totalRequired += catTotal
    })

    // Agregamos el total global al objeto resultado
    result.total = {
        required: totalRequired,
        covered: totalCovered,
        rate: totalRequired === 0 ? 0 : Math.round((totalCovered / totalRequired) * 100)
    }

    return result
})

const progressRate = computed(() => {
    return complianceDetail.value.total ? complianceDetail.value.total.rate : 0
})

// Methods
const loadData = async () => {
    loading.value = true
    try {
        // Cargar según tab
        const rawDocs = await fiscalService.getFiscalDocs({ trashed: currentTab.value === 'trash' })

        // Resolver file_url (ruta o URL pública/firmada antigua) a una URL firmada
        // lista para mostrar/descargar/previsualizar, ya que el bucket 'documents'
        // pasará a ser privado.
        docs.value = await Promise.all(rawDocs.map(async (doc) => {
            if (doc?.documents?.file_url) {
                const signedUrl = await obtenerUrlFirmada('documents', doc.documents.file_url)
                if (signedUrl) {
                    doc.documents = { ...doc.documents, file_url: signedUrl }
                }
            }
            return doc
        }))

        // Stats siempre globales
        const newStats = await fiscalService.getStats()
        Object.assign(stats, newStats)
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

// Watch tab change - recargar datos si cambia hacia/desde papelera
watch(currentTab, (newTab, oldTab) => {
    statusFilter.value = 'ALL' // Reset filtro de estado al cambiar tab
    
    // Si cambiamos hacia o desde la pestaña de papelera, recargar datos
    // porque requiere filtrado diferente en el servidor (deleted_at)
    if (newTab === 'trash' || oldTab === 'trash') {
        loadData()
        return
    }
    // Para otros tabs, no es necesario recargar de la BD
})

const openDialog = (item = null) => {
    editingItem.value = item
    dialogOpen.value = true
}

// Abrir diálogo pre-rellenado para un documento pendiente general
const openDialogForPending = (pending) => {
    editingItem.value = {
        category: pending.category,
        doc_type: pending.id,
        name: pending.label,
        status: 'VIGENTE'
    }
    dialogOpen.value = true
}

// Abrir diálogo pre-rellenado para un período específico (desde el Tracker)
const openDialogForPeriod = ({ typeId, category, periodInfo }) => {
    // Calculamos una fecha de emisión aproximada para que el form se auto-llene con el mes/año correcto.
    const month = periodInfo.monthIndex !== undefined ? periodInfo.monthIndex : (periodInfo.quarterIndex !== undefined ? periodInfo.quarterIndex * 3 : 0)
    
    // Usar fecha local (YYYY-MM-DD) para evitar desfase UTC
    const d = new Date(selectedYear.value, month, 1)
    const emissionDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

    editingItem.value = {
        category,
        doc_type: typeId,
        name: periodInfo.label,
        status: 'VIGENTE',
        emission_date: emissionDateStr
    }
    dialogOpen.value = true
}

/**
 * Handler unificado para el evento @open-dialog del FiscalPeriodTracker.
 * - Modo flexible (sin periodInfo): abre el dialog sin fecha pre-llenada,
 *   solo con la categoría y tipo para que el usuario complete libremente.
 * - Modo normal (con periodInfo): delega a openDialogForPeriod que
 *   pre-llena la fecha de emisión según el período calculado.
 */
const handleTrackerDialog = ({ typeId, category, periodInfo }) => {
    if (!periodInfo) {
        // Modo flexible: el usuario define el período manualmente
        editingItem.value = {
            category,
            doc_type: typeId,
            status: 'VIGENTE'
        }
        dialogOpen.value = true
    } else {
        openDialogForPeriod({ typeId, category, periodInfo })
    }
}

const openPreview = (doc) => {
    previewItem.value = doc
    previewDialog.value = true
}

const isFilePDF = (url) => {
    if (!url) return false
    return url.toLowerCase().includes('.pdf')
}

const handleSave = async (formData) => {
    saving.value = true
    try {
        const file = formData.file
        const docData = { ...formData }
        delete docData.file
        
        const res = await fiscalService.saveFiscalDoc(docData, file)
        
        if (res.success) {
            dialogOpen.value = false
            await loadData()
        } else {
            // Mostrar error al usuario
            console.error('❌ Error al guardar documento fiscal:', res.message)
            snackbar.value = {
                show: true,
                message: `Error al guardar: ${res.message}`,
                color: 'error'
            }
        }
    } catch (e) {
        console.error('❌ Error inesperado al guardar:', e)
        snackbar.value = {
            show: true,
            message: 'Error inesperado al guardar el documento',
            color: 'error'
        }
    } finally {
        saving.value = false
    }
}

const confirmDelete = (item) => {
    itemToDelete.value = item
    deleteDialog.value = true
}

const executeDelete = async () => {
    if (!itemToDelete.value) return
    deleting.value = true
    try {
        if (currentTab.value === 'trash') {
            // Hard Delete
            await fiscalService.hardDeleteFiscalDoc(itemToDelete.value.id)
        } else {
            // Soft Delete
            await fiscalService.deleteFiscalDoc(itemToDelete.value.id)
        }
        deleteDialog.value = false
        await loadData()
    } catch (e) {
        console.error(e)
    } finally {
        deleting.value = false
        itemToDelete.value = null
    }
}

const restoreDoc = async (item) => {
    restoring.value = true
    try {
        await fiscalService.restoreFiscalDoc(item.id)
        await loadData()
    } catch (e) {
        console.error(e)
    } finally {
        restoring.value = false
    }
}

// Helpers

const getEffectiveStatus = (docItem) => {
    if (docItem.status === 'NO_APLICA') return 'NO_APLICA'
    if (docItem.status === 'TRAMITE') return 'TRAMITE'
    
    // Buscar si es recurrente
    let isRecurring = false
    if (docItem.category && docItem.doc_type) {
        const types = FISCAL_TYPES[docItem.category] || []
        const typeInfo = types.find(t => t.id === docItem.doc_type)
        if (typeInfo && isRecurringFrequency(typeInfo.frequency)) {
            isRecurring = true
        }
    }
    
    if (isRecurring) {
        return 'PRESENTADO'
    }

    if (docItem.status === 'VENCIDO') return 'VENCIDO'
    
    // Si tiene expiration_date, validar (solo aplica para documentos NO recurrentes)
    if (docItem.expiration_date) {
        const expDate = new Date(docItem.expiration_date)
        if (expDate < new Date()) {
            return 'VENCIDO'
        }
    }
    
    return docItem.status || 'VIGENTE'
}

const getCategoryIcon = (cat) => {
    const map = {
        'LEGAL': 'mdi-gavel',
        'MUNICIPAL': 'mdi-city',
        'SENIAT': 'mdi-bank',
        'NOMINA': 'mdi-account-group',
        'LIBROS': 'mdi-book-open-page-variant',
        'OTROS': 'mdi-file'
    }
    return map[cat] || 'mdi-file'
}

const formatDate = (dateStr) => formatFechaCorta(dateStr)

// ─────────────────────────────────────────────────────────────────
// PDF Export — Helpers (S.O.L.I.D.: cada función tiene una sola tarea)
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula los períodos para un tipo de documento dado,
 * equivalente a la lógica de FiscalPeriodTracker pero para el PDF.
 * Retorna array de { label, doc, isFuture, statusLabel }
 */
const getPeriodRowsForPdf = (type, catDocs, year) => {
    const now          = new Date()
    const currentYear  = now.getFullYear()
    const currentMonth = now.getMonth()
    const currentDay   = now.getDate()
    const freq         = type.frequency

    const docsOfType = catDocs.filter(d => d.doc_type === type.id)

    const bestDoc = (candidates) =>
        candidates.find(d => d.status !== 'VENCIDO') || candidates[0] || null

    const buildRow = (label, doc, isFuture) => {
        let statusLabel
        if (doc) {
            const s = doc.status
            if (s === 'TRAMITE')     statusLabel = 'EN TRÁMITE'
            else if (s === 'NO_APLICA') statusLabel = 'NO APLICA'
            // VIGENTE, PRESENTADO o VENCIDO → fue presentado
            // (mismo criterio que la UI: el hecho de existir el doc = presentado)
            else                     statusLabel = 'PRESENTADO'
        } else {
            statusLabel = isFuture ? '—' : 'NO PRESENTADO'
        }
        return { label, doc, isFuture, statusLabel }
    }

    if (freq === 'MONTHLY') {
        const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        return Array.from({ length: 12 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && dt.getMonth() === i
            })
            // El mes actual no ha terminado → tratar como pendiente (mismo criterio que la UI)
            const isFuture = year > currentYear || (year === currentYear && i >= currentMonth)
            return buildRow(`${names[i]} ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'QUINCENAL') {
        const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
        const rows = []
        for (let m = 0; m < 12; m++) {
            for (let q = 1; q <= 2; q++) {
                const cands = docsOfType.filter(d => {
                    const dt = new Date(d.emission_date + 'T00:00:00')
                    if (dt.getFullYear() !== year || dt.getMonth() !== m) return false
                    return q === 1 ? dt.getDate() <= 15 : dt.getDate() > 15
                })
                const curQ = currentDay <= 15 ? 1 : 2
                // La quincena actual aún no ha terminado → pendiente
                const isPast = year < currentYear ||
                    (year === currentYear && m < currentMonth) ||
                    (year === currentYear && m === currentMonth && q < curQ)
                const isFuture = !isPast
                rows.push(buildRow(`${q}ª Quincena ${names[m]} ${year}`, bestDoc(cands), isFuture))
            }
        }
        return rows
    }

    if (freq === 'QUARTERLY') {
        const labels = ['1er Trimestre','2do Trimestre','3er Trimestre','4to Trimestre']
        return Array.from({ length: 4 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && Math.floor(dt.getMonth() / 3) === i
            })
            const curQ     = Math.floor(currentMonth / 3)
            // El trimestre actual no ha terminado → pendiente
            const isFuture = year > currentYear || (year === currentYear && i >= curQ)
            return buildRow(`${labels[i]} ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'SEMESTRAL') {
        return Array.from({ length: 2 }, (_, i) => {
            const cands = docsOfType.filter(d => {
                const dt = new Date(d.emission_date + 'T00:00:00')
                return dt.getFullYear() === year && Math.floor(dt.getMonth() / 6) === i
            })
            const curSem   = Math.floor(currentMonth / 6)
            const isFuture = year > currentYear || (year === currentYear && i > curSem)
            return buildRow(`${i === 0 ? '1er' : '2do'} Semestre ${year}`, bestDoc(cands), isFuture)
        })
    }

    if (freq === 'ANNUAL') {
        const cands    = docsOfType.filter(d =>
            new Date(d.emission_date + 'T00:00:00').getFullYear() === year)
        // El año actual no ha terminado → pendiente (misma lógica que la UI)
        const isFuture = year >= currentYear
        return [buildRow(`Año ${year}`, bestDoc(cands), isFuture)]
    }

    // Permanentes / Ad-hoc: listar todos los docs existentes de este tipo
    if (docsOfType.length === 0) return []
    return docsOfType.map(d => buildRow(d.name || type.label, d, false))
}

/** Dibuja el header de categoría. Retorna la nueva posición Y. */
const pdfDrawCategoryHeader = (doc, pageWidth, margin, catName, progress, y) => {
    // Fondo con borde redondeado para el header de categoría
    const headerHeight = 10
    doc.setFillColor(31, 53, 92) // #1F355C azul corporativo
    doc.roundedRect(margin, y - 6, pageWidth - margin * 2, headerHeight, 3, 3, 'F')

    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(255, 255, 255) // Texto blanco sobre fondo azul
    doc.text(catName, margin + 5, y)

    if (progress) {
        doc.setFontSize(9)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(224, 176, 79) // #E0B04F dorado corporativo
        const progressText = `${progress.covered}/${progress.total} — ${progress.rate}%`
        doc.text(progressText, pageWidth - margin - 5, y, { align: 'right' })
    }

    return y + 8
}

/** Dibuja el sub-header de tipo de documento. Retorna la nueva posición Y. */
const pdfDrawTypeHeader = (doc, margin, label, freqLabel, y) => {
    // Línea decorativa a la izquierda
    doc.setFillColor(168, 28, 34) // #A81C22 rojo corporativo
    doc.rect(margin + 4, y - 4, 2, 5, 'F')

    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(31, 53, 92) // #1F355C
    doc.text(`  ${label}`, margin + 8, y)

    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(140)
    doc.text(`(${freqLabel})`, margin + 75, y)

    return y + 2
}

/** Dibuja una fila de período. Retorna la nueva posición Y. */
const pdfDrawPeriodRow = (doc, margin, pageWidth, label, statusLabel, isFuture, y, isAlternate = false) => {
    const colStatus = pageWidth - margin - 45
    const rowHeight = 5

    // Fondo alternado sutil
    if (isAlternate) {
        doc.setFillColor(245, 245, 250) // Gris muy claro
        doc.rect(margin + 6, y - 4, pageWidth - margin * 2 - 6, rowHeight, 'F')
    }

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')

    // Label (sangría para indicar jerarquía)
    doc.setTextColor(40)
    const truncated = label.length > 38 ? label.substring(0, 35) + '…' : label
    doc.text(`    · ${truncated}`, margin, y)

    // Estado con color y fondo tipo badge
    let badgeR, badgeG, badgeB
    let textR, textG, textB

    if (isFuture) {
        badgeR = 230; badgeG = 230; badgeB = 230
        textR = 150; textG = 150; textB = 150
    } else if (statusLabel === 'PRESENTADO') {
        badgeR = 232; badgeG = 245; badgeB = 233 // Verde claro
        textR = 46; textG = 125; textB = 50
    } else if (statusLabel === 'EN TRAMITE' || statusLabel === 'EN TRÁMITE') {
        badgeR = 255; badgeG = 243; badgeB = 224 // Naranja claro
        textR = 230; textG = 120; textB = 0
    } else if (statusLabel === 'NO APLICA') {
        badgeR = 238; badgeG = 238; badgeB = 238 // Gris claro
        textR = 120; textG = 120; textB = 120
    } else {
        badgeR = 255; badgeG = 228; badgeB = 228 // Rojo claro
        textR = 198; textG = 40; textB = 40
    }

    // Dibujar badge redondeado detrás del texto de estado
    const statusWidth = doc.getTextWidth(statusLabel) + 6
    doc.setFillColor(badgeR, badgeG, badgeB)
    doc.roundedRect(colStatus - 2, y - 3.5, statusWidth, 5, 1.5, 1.5, 'F')

    doc.setTextColor(textR, textG, textB)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(7.5)
    doc.text(statusLabel, colStatus + 1, y)

    return y + 6
}

/** Verifica si falta espacio y agrega nueva página si es necesario. */
const pdfCheckPage = (doc, y, threshold = 265) => {
    if (y > threshold) {
        doc.addPage()
        return 20
    }
    return y
}

// ─────────────────────────────────────────────────────────────────
// PDF Export — Función principal
// ─────────────────────────────────────────────────────────────────
const exportToPDF = async () => {
    exporting.value = true
    
    try {
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const margin = 15
        let y = 20
        
        // Header
        const currentUser = await userService.getCurrentUser()
        const clientName = currentUser.client?.company_name || currentUser.organization?.name || currentUser.firstName + ' ' + currentUser.lastName
        const clientRif = currentUser.client?.rif || currentUser.organization?.rif || ''

        // Convert identifier to base64
        const getBase64ImageFromURL = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.setAttribute('crossOrigin', 'anonymous')
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(img, 0, 0)
                    const dataURL = canvas.toDataURL('image/png')
                    resolve({ dataURL, width: img.width, height: img.height })
                }
                img.onerror = error => reject(error)
                img.src = url
            })
        }

        // ── Franja superior decorativa ──
        doc.setFillColor(31, 53, 92) // #1F355C
        doc.rect(0, 0, pageWidth, 4, 'F')
        doc.setFillColor(168, 28, 34) // #A81C22
        doc.rect(0, 4, pageWidth, 2, 'F')

        // ── Logo centrado ──
        try {
            const logoInfo = await getBase64ImageFromURL(systemLogo)
            const pdfHeight = 9 // Logo pequeño
            const ratio = logoInfo.width / logoInfo.height
            const pdfWidth = pdfHeight * ratio
            
            doc.addImage(logoInfo.dataURL, 'PNG', (pageWidth - pdfWidth) / 2, 10, pdfWidth, pdfHeight)
        } catch (e) {
            console.warn('Could not load logo for PDF', e)
        }

        // Título centrado debajo del logo
        y = 26
        doc.setFontSize(16)
        doc.setTextColor(31, 53, 92) // #1F355C
        doc.setFont(undefined, 'bold')
        doc.text('Expediente Fiscal 360', pageWidth / 2, y, { align: 'center' })
        
        // ── Información de la empresa ──
        y += 8
        doc.setFontSize(12)
        doc.setTextColor(80)
        doc.setFont(undefined, 'normal')
        doc.text(clientName, pageWidth / 2, y, { align: 'center' })

        if (clientRif) {
            y += 6
            doc.setFontSize(10)
            doc.text(`RIF/CI: ${clientRif}`, pageWidth / 2, y, { align: 'center' })
        }
        
        y += 8
        doc.setFontSize(9)
        doc.setTextColor(140)
        doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })}`, pageWidth / 2, y, { align: 'center' })
        
        // ── Línea divisoria elegante ──
        y += 6
        doc.setDrawColor(224, 176, 79) // #E0B04F dorado
        doc.setLineWidth(0.8)
        doc.line(margin, y, pageWidth - margin, y)
        doc.setLineWidth(0.2)
        
        // ── Progress Summary ──
        y += 10
        doc.setFontSize(11)
        doc.setFont(undefined, 'bold')
        doc.setTextColor(31, 53, 92) // #1F355C
        doc.text(`Progreso General: ${progressRate.value}%`, margin, y)
        
        // Barra de progreso con bordes redondeados
        y += 5
        const barWidth = 80
        const barHeight = 6
        // Fondo gris de la barra
        doc.setFillColor(230, 230, 230)
        doc.roundedRect(margin, y, barWidth, barHeight, 3, 3, 'F')
        // Progreso con gradiente simulado
        const progressWidth = barWidth * (progressRate.value / 100)
        if (progressWidth > 0) {
            doc.setFillColor(168, 28, 34) // #A81C22 rojo corporativo
            doc.roundedRect(margin, y, Math.max(progressWidth, 6), barHeight, 3, 3, 'F')
        }
        
        y += 14

        // ── Leyenda de estado con badges ──
        doc.setFontSize(7.5)
        doc.setFont(undefined, 'bold')
        const legendItems = [
            { label: 'PRESENTADO / VIGENTE', bgR: 232, bgG: 245, bgB: 233, r: 46,  g: 125, b: 50  },
            { label: 'EN TRAMITE',           bgR: 255, bgG: 243, bgB: 224, r: 230, g: 120, b: 0   },
            { label: 'NO PRESENTADO',        bgR: 255, bgG: 228, bgB: 228, r: 198, g: 40,  b: 40  },
            { label: 'NO APLICA',            bgR: 238, bgG: 238, bgB: 238, r: 120, g: 120, b: 120 },
        ]
        let lx = margin
        for (const l of legendItems) {
            const textWidth = doc.getTextWidth(l.label) + 8
            // Badge de fondo
            doc.setFillColor(l.bgR, l.bgG, l.bgB)
            doc.roundedRect(lx, y - 3.5, textWidth, 5, 1.5, 1.5, 'F')
            // Texto
            doc.setTextColor(l.r, l.g, l.b)
            doc.text(l.label, lx + 4, y)
            lx += textWidth + 4
        }
        y += 10

        // ── Línea divisoria ──
        doc.setDrawColor(200)
        doc.setLineWidth(0.2)
        doc.line(margin, y, pageWidth - margin, y)
        y += 8

        // ─────────────────────────────────────────────────────────────────
        // Loop principal: Categoría → Tipo → Períodos
        // ─────────────────────────────────────────────────────────────────
        const PDF_CAT_NAMES = {
            LEGAL:     'Legal',
            LIBROS:    'Libros Contables',
            MUNICIPAL: 'Municipal',
            SENIAT:    'SENIAT',
            NOMINA:    'Nómina y Parafiscales',
            OTROS:     'Otros'
        }
        const FREQ_LABELS = {
            PERMANENT: 'Permanente', VIGENTE: 'Vigente (variable)',
            ANNUAL: 'Anual', SEMESTRAL: 'Semestral',
            QUARTERLY: 'Trimestral', MONTHLY: 'Mensual',
            QUINCENAL: 'Quincenal', AdHoc: 'Eventual'
        }

        const pdfYear = selectedYear.value

        for (const cat of ['LEGAL', 'LIBROS', 'MUNICIPAL', 'SENIAT', 'NOMINA', 'OTROS']) {
            const catDocs  = docs.value.filter(d => d.category === cat)
            const catTypes = FISCAL_TYPES[cat] || []
            if (catTypes.length === 0 && catDocs.length === 0) continue

            // Solo omitir categorías sin tipos definidos o OTROS sin documentos
            if (cat === 'OTROS' && catDocs.length === 0) continue

            // ── Header de categoría ──────────────────────────────────────
            // Reservar espacio: al menos 25px para el header + primera línea
            y = pdfCheckPage(doc, y, 250)
            y = pdfDrawCategoryHeader(
                doc, pageWidth, margin,
                PDF_CAT_NAMES[cat],
                complianceDetail.value[cat],
                y
            )
            y += 3

            // ── Por cada tipo de documento de esta categoría ──────────────
            let rowIndex = 0
            for (const type of catTypes) {
                const rows       = getPeriodRowsForPdf(type, catDocs, pdfYear)
                const docsOfType = catDocs.filter(d => d.doc_type === type.id)

                // Filas con documento real (cargado)
                const uploadedRows  = rows.filter(r => r.doc)

                // Solo omitir el tipo genérico 'Otro Documento' si no tiene docs
                if (type.id === 'OTRO' && uploadedRows.length === 0) continue

                // Reservar espacio: header del tipo + al menos 1 fila
                y = pdfCheckPage(doc, y, 255)
                y = pdfDrawTypeHeader(
                    doc, margin,
                    type.label,
                    FREQ_LABELS[type.frequency] || type.frequency,
                    y
                )
                y += 5

                // ── Caso 1: Tipo FLEXIBLE — lista solo los docs existentes ─
                if (type.flexible) {
                    const flexRows = catDocs
                        .filter(d => d.doc_type === type.id)
                        .sort((a, b) => new Date(b.emission_date || 0) - new Date(a.emission_date || 0))

                    if (flexRows.length === 0) {
                        // No hay nada cargado → una línea informativa neutra
                        y = pdfCheckPage(doc, y)
                        y = pdfDrawPeriodRow(doc, margin, pageWidth, 'Sin documentos cargados', 'NO PRESENTADO', false, y, rowIndex % 2 === 1)
                        rowIndex++
                    } else {
                        for (const d of flexRows) {
                            const lbl = d.name || (d.emission_date
                                ? new Date(d.emission_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'Sin fecha')
                            const sMap = { VIGENTE: 'PRESENTADO', PRESENTADO: 'PRESENTADO', TRAMITE: 'EN TRAMITE', NO_APLICA: 'NO APLICA' }
                            const statusLabel = sMap[d.status] || 'VENCIDO'
                            y = pdfCheckPage(doc, y)
                            y = pdfDrawPeriodRow(doc, margin, pageWidth, lbl, statusLabel, false, y, rowIndex % 2 === 1)
                            rowIndex++
                        }
                    }
                }
                // ── Caso 2: Sin ningún documento cargado ────────────────────
                else if (uploadedRows.length === 0) {
                    // Una sola línea neutra — sin contar ni mencionar periodos faltantes
                    y = pdfCheckPage(doc, y)
                    y = pdfDrawPeriodRow(doc, margin, pageWidth, 'Sin registro cargado', 'NO PRESENTADO', false, y, rowIndex % 2 === 1)
                    rowIndex++
                }
                // ── Caso 3: Hay documentos cargados — mostrar cada uno ──────
                else {
                    for (const row of uploadedRows) {
                        y = pdfCheckPage(doc, y)
                        y = pdfDrawPeriodRow(doc, margin, pageWidth, row.label, row.statusLabel, false, y, rowIndex % 2 === 1)
                        rowIndex++
                    }
                }

                y += 4 // Espacio entre tipos
            }

            y += 8 // Espacio entre categorías
        }
        
        // Footer con línea decorativa
        const pageCount = doc.internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            const pageH = doc.internal.pageSize.getHeight()
            
            // Línea dorada en el footer
            doc.setDrawColor(224, 176, 79) // #E0B04F
            doc.setLineWidth(0.5)
            doc.line(margin, pageH - 15, pageWidth - margin, pageH - 15)
            
            // Texto de página
            doc.setFontSize(8)
            doc.setFont(undefined, 'normal')
            doc.setTextColor(150)
            doc.text(
                `Página ${i} de ${pageCount}`, 
                pageWidth / 2, 
                pageH - 10, 
                { align: 'center' }
            )

            // Marca de agua sutil: "AD System"
            doc.setTextColor(230)
            doc.setFontSize(7)
            doc.text('AD System', pageWidth - margin, pageH - 10, { align: 'right' })
        }
        
        // Save
        const fileName = `Expediente_Fiscal_${new Date().toISOString().split('T')[0]}.pdf`
        doc.save(fileName)
        
    } catch (error) {
        console.error('Error al exportar PDF:', error)
    } finally {
        exporting.value = false
    }
}

onMounted(async () => {
    await loadData()
    initialLoading.value = false
})

</script>

<style scoped>
.mis-papeles {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 16px 96px;
}

@media (min-width: 960px) {
  .mis-papeles { padding: 32px 32px 64px; }
}

/* ── Avance + siguiente paso ── */
.mis-papeles__panel {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin: 8px 0 24px;
}

@media (min-width: 960px) {
  .mis-papeles__panel { grid-template-columns: 7fr 5fr; }
}

.mis-papeles__avance,
.mis-papeles__paso {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 20px;
  padding: 22px 24px;
}

.mis-papeles__paso {
  display: flex;
  flex-direction: column;
  justify-content: center;
  /* Un toque de marca: el paso pendiente lleva un fondo granate muy suave */
  background: linear-gradient(0deg, rgba(var(--v-theme-primary), 0.045), rgba(var(--v-theme-primary), 0.045)), rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-theme-primary), 0.22);
}

.mis-papeles__paso--listo {
  background: linear-gradient(0deg, rgba(var(--v-theme-success), 0.06), rgba(var(--v-theme-success), 0.06)), rgb(var(--v-theme-surface));
  border-color: rgba(var(--v-theme-success), 0.3);
}

.mis-papeles__paso-etiqueta {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 6px;
}

.mis-papeles__paso-titulo {
  font-size: 1.3rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
  text-wrap: balance;
}

.mis-papeles__paso-detalle {
  margin: 8px 0 16px;
  font-size: 0.98rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.75);
  max-width: 52ch;
}

.mis-papeles__paso--listo .mis-papeles__paso-detalle { margin-bottom: 0; }

.mis-papeles__paso-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

@media (max-width: 599px) {
  .mis-papeles__avance,
  .mis-papeles__paso { padding: 18px; }
  .mis-papeles__paso-acciones > .v-btn:first-child { flex: 1 1 100%; }
}

/* ── Filtros ── */
.mis-papeles__filtros {
  margin-bottom: 8px;
}

.mis-papeles__filtros :deep(.v-chip) {
  font-weight: 600;
}

.mis-papeles__filtros :deep(.mis-papeles__filtro--activo) {
  background: rgb(var(--v-theme-on-surface)) !important;
  color: rgb(var(--v-theme-surface)) !important;
  border-color: rgb(var(--v-theme-on-surface)) !important;
}

/* ── Secciones por categoría ── */
.mis-papeles__seccion {
  margin-top: 28px;
}

.mis-papeles__seccion-cabecera {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.mis-papeles__seccion-titulo {
  display: flex;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
}

.mis-papeles__seccion-avance {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.65);
  font-variant-numeric: tabular-nums;
}

.mis-papeles__seccion-ayuda {
  margin: 4px 0 0;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}

.mis-papeles__lista {
  overflow: hidden;
}

.mis-papeles__anio {
  max-width: 140px;
}

.mis-papeles__periodicos {
  margin-top: 40px;
}

/* Cambio de filtro: las secciones entran y salen con un fundido breve */
.seccion-enter-active,
.seccion-leave-active {
  transition: opacity var(--ad-move-normal) var(--ad-move-curva-entrada), transform var(--ad-move-normal) var(--ad-move-curva-entrada);
}
.seccion-enter-from,
.seccion-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.seccion-leave-active { position: absolute; width: 100%; }

/* ── Detalle (vista previa) ── */
.mis-papeles__detalle {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media (min-width: 960px) {
  .mis-papeles__detalle { grid-template-columns: 280px 1fr; }
}

.mis-papeles__datos {
  margin: 0;
  display: grid;
  gap: 14px;
  align-content: start;
}

.mis-papeles__datos dt {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 2px;
}

.mis-papeles__datos dd {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.mis-papeles__datos-notas dd {
  font-weight: 400;
  white-space: pre-wrap;
}

.mis-papeles__archivo {
  min-height: 320px;
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mis-papeles__archivo iframe {
  width: 100%;
  height: 520px;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .seccion-enter-active,
  .seccion-leave-active { transition: none; }
}
</style>
