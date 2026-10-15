<template>
  <v-container fluid class="municipal-page" data-testid="municipal-page">
    <EncabezadoPagina
      titulo="Retenciones municipales"
      subtitulo="Los códigos de actividad económica y el porcentaje que se retiene en cada alcaldía."
    >
      <v-btn
        v-if="puedeEditar"
        color="primary"
        size="large"
        class="text-none"
        prepend-icon="mdi-plus"
        data-testid="municipal-nuevo"
        @click="abrirDialogo()"
      >
        Nuevo código
      </v-btn>
    </EncabezadoPagina>

    <!-- Solo el despacho (admin/contador) administra los códigos; el cliente los consulta. -->
    <v-alert
      v-if="!puedeEditar && usuarioListo"
      type="info"
      variant="tonal"
      class="mb-5"
      data-testid="municipal-aviso-cliente"
    >
      <p class="mb-3">Tu contador administra estos códigos. Si no encuentras el de tu actividad, escríbele por el chat de ayuda.</p>
      <v-btn variant="tonal" class="text-none" prepend-icon="mdi-chat-question-outline" :block="$vuetify.display.xs" @click="abrirAyuda">
        No encuentro mi código
      </v-btn>
    </v-alert>

    <div class="municipal-filtros">
      <v-select
        v-model="filtroMunicipio"
        :items="opcionesMunicipio"
        item-title="titulo"
        item-value="valor"
        label="Municipio"
        variant="outlined"
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-city"
        class="municipal-filtros__municipio"
        data-testid="municipal-filtro-municipio"
      />
      <FiltroChips v-model="filtroOrigen" :opciones="opcionesOrigen" etiqueta="Filtrar por origen" data-testid="municipal-filtro-origen" />
    </div>

    <div v-if="loading" class="pa-2" aria-busy="true">
      <v-skeleton-loader type="list-item-two-line, list-item-two-line, list-item-two-line" />
    </div>

    <v-alert v-else-if="errorCarga" type="error" variant="tonal" class="mb-4">
      {{ errorCarga }}
      <template #append>
        <v-btn variant="text" class="text-none" @click="cargar">Reintentar</v-btn>
      </template>
    </v-alert>

    <EstadoVacio
      v-else-if="!conceptosFiltrados.length"
      icono="mdi-city-variant-outline"
      :titulo="hayFiltros ? 'No hay códigos con ese filtro' : 'Todavía no hay códigos cargados'"
      :mensaje="mensajeVacio"
      :texto-accion="puedeEditar && !hayFiltros ? 'Agregar un código' : (hayFiltros ? 'Ver todos' : '')"
      @accion="hayFiltros ? limpiarFiltros() : abrirDialogo()"
    />

    <SeccionLista
      v-else
      :titulo="tituloLista"
      :meta="`${conceptosFiltrados.length} ${conceptosFiltrados.length === 1 ? 'código' : 'códigos'}`"
    >
      <div
        v-for="c in conceptosFiltrados"
        :key="c.id"
        class="fila-codigo"
        data-testid="municipal-fila"
      >
        <div class="fila-codigo__porcentaje" :class="{ 'fila-codigo__porcentaje--cero': Number(c.porcentaje) === 0 }">
          {{ formatoPorcentaje(c.porcentaje) }}
        </div>
        <div class="fila-codigo__cuerpo">
          <div class="fila-codigo__codigo">{{ c.codigo }}</div>
          <div class="fila-codigo__actividad">{{ c.descripcion }}</div>
          <div class="fila-codigo__detalle">
            <span><v-icon icon="mdi-city" size="16" /> {{ nombreMunicipio(c.municipio_id) }}</span>
            <v-chip size="small" variant="tonal" :color="c.origen === 'comun' ? 'secondary' : 'primary'" class="ml-2">
              {{ c.origen === 'comun' ? 'AD System' : 'Mi despacho' }}
            </v-chip>
          </div>
          <div v-if="c.ordenanza || c.vigente_desde" class="fila-codigo__ordenanza">
            <template v-if="c.ordenanza">{{ c.ordenanza }}</template>
            <template v-if="c.ordenanza && c.vigente_desde"> · </template>
            <template v-if="c.vigente_desde">vigente desde {{ fechaCorta(c.vigente_desde) }}</template>
          </div>
        </div>
        <v-menu v-if="puedeGestionar(c)">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" aria-label="Más acciones" data-testid="municipal-menu" />
          </template>
          <v-list>
            <v-list-item prepend-icon="mdi-pencil" title="Editar" @click="abrirDialogo(c)" />
            <v-list-item prepend-icon="mdi-delete-outline" title="Quitar" base-color="error" @click="pedirQuitar(c)" />
          </v-list>
        </v-menu>
      </div>
    </SeccionLista>

    <!-- Crear / editar -->
    <DialogoAdaptable
      v-model="dialog"
      :titulo="editedItem.id ? 'Editar código' : 'Nuevo código municipal'"
      icono="mdi-city-variant-outline"
      :cargando="saving"
      persistent
      @cerrar="reiniciarFormulario"
    >
      <v-form ref="form" v-model="valid" @submit.prevent="save">
        <v-switch
          v-if="esSuperAdmin && !editedItem.id"
          v-model="editedItem.comun"
          color="primary"
          inset
          hide-details
          label="Código común de AD System (lo ven todos los despachos)"
          class="mb-3"
          data-testid="municipal-es-comun"
        />
        <v-select
          v-model="editedItem.municipio_id"
          :items="opcionesMunicipioFormulario"
          item-title="titulo"
          item-value="valor"
          label="Municipio"
          variant="outlined"
          prepend-inner-icon="mdi-city"
          hint="Elige la alcaldía a la que pertenece este código."
          persistent-hint
          class="mb-3"
          data-testid="municipal-campo-municipio"
        />
        <v-text-field
          v-model="editedItem.codigo"
          label="Código de actividad"
          placeholder="Ej: 1.01.00"
          variant="outlined"
          :rules="[v => !!(v && String(v).trim()) || 'Escribe el código']"
          prepend-inner-icon="mdi-identifier"
          class="mb-2"
          data-testid="municipal-campo-codigo"
        />
        <v-textarea
          v-model="editedItem.descripcion"
          label="Actividad"
          placeholder="Ej: Comercio al por menor de artículos…"
          variant="outlined"
          rows="2"
          auto-grow
          :rules="[v => !!(v && String(v).trim()) || 'Describe la actividad']"
          prepend-inner-icon="mdi-text"
          class="mb-2"
        />
        <v-text-field
          v-model="editedItem.porcentaje"
          label="Porcentaje de retención"
          type="number"
          step="0.01"
          min="0"
          max="100"
          inputmode="decimal"
          variant="outlined"
          suffix="%"
          hint="Puede ser 0 % si la actividad está exenta."
          persistent-hint
          :rules="[
            v => (v !== '' && v !== null && v !== undefined) || 'Escribe el porcentaje',
            v => Number(v) >= 0 || 'No puede ser negativo',
            v => Number(v) <= 100 || 'Máximo 100 %'
          ]"
          prepend-inner-icon="mdi-percent"
          class="mb-3"
          data-testid="municipal-campo-porcentaje"
        />
        <v-text-field
          v-model="editedItem.ordenanza"
          label="Ordenanza (opcional)"
          placeholder="Ej: Ordenanza de Impuesto sobre Actividades Económicas 2026"
          variant="outlined"
          prepend-inner-icon="mdi-gavel"
          class="mb-2"
        />
        <v-text-field
          v-model="editedItem.vigente_desde"
          label="Vigente desde (opcional)"
          type="date"
          variant="outlined"
          prepend-inner-icon="mdi-calendar"
        />
      </v-form>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="saving" data-testid="municipal-cancelar" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" size="large" class="text-none" :loading="saving" :disabled="!valid" data-testid="municipal-guardar" @click="save">
          Guardar
        </v-btn>
      </template>
    </DialogoAdaptable>

    <!-- Confirmar quitar -->
    <DialogoAdaptable v-model="dialogQuitar" titulo="¿Quitar este código?" max-width="440" :cargando="saving">
      <p class="mb-0">
        Vas a quitar el código <strong>{{ aQuitar?.codigo }}</strong>. Las compras que ya registraste no cambian.
      </p>
      <template #acciones>
        <v-btn variant="text" class="text-none" :disabled="saving" @click="dialogQuitar = false">Cancelar</v-btn>
        <v-btn color="error" variant="flat" class="text-none" :loading="saving" @click="quitar">Quitar</v-btn>
      </template>
    </DialogoAdaptable>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3500" rounded="lg">
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import municipalConceptsService from '@/services/municipalConceptsService'
import userService from '@/services/userService'
import EncabezadoPagina from '@/components/ui/EncabezadoPagina.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import SeccionLista from '@/components/ui/SeccionLista.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import DialogoAdaptable from '@/components/ui/DialogoAdaptable.vue'

const vacio = () => ({
  id: null,
  codigo: '',
  descripcion: '',
  porcentaje: '',
  municipio_id: null,
  ordenanza: '',
  vigente_desde: '',
  comun: false
})

export default {
  name: 'MunicipalSettings',
  components: { EncabezadoPagina, FiltroChips, SeccionLista, EstadoVacio, DialogoAdaptable },
  data() {
    return {
      conceptos: [],
      municipios: [],
      loading: false,
      errorCarga: '',
      dialog: false,
      dialogQuitar: false,
      aQuitar: null,
      valid: true,
      saving: false,
      filtroMunicipio: 'todos',
      filtroOrigen: 'todos',
      editedItem: vacio(),
      snackbar: { show: false, text: '', color: 'success' },
      rol: null,
      usuarioListo: false
    }
  },
  computed: {
    puedeEditar() {
      return ['admin', 'contador', 'super_admin'].includes(this.rol)
    },
    esSuperAdmin() {
      return this.rol === 'super_admin'
    },
    opcionesMunicipio() {
      return [{ valor: 'todos', titulo: 'Todos los municipios' }, { valor: 'generales', titulo: 'Códigos generales' }]
        .concat(this.municipios.map(m => ({ valor: m.id, titulo: m.nombre })))
    },
    opcionesMunicipioFormulario() {
      return [{ valor: null, titulo: 'General (sin municipio)' }]
        .concat(this.municipios.map(m => ({ valor: m.id, titulo: m.nombre })))
    },
    opcionesOrigen() {
      const cuenta = o => this.conceptos.filter(c => c.origen === o).length
      return [
        { valor: 'todos', texto: 'Todos', cantidad: this.conceptos.length },
        { valor: 'comun', texto: 'AD System', cantidad: cuenta('comun') },
        { valor: 'despacho', texto: 'Mi despacho', cantidad: cuenta('despacho') }
      ]
    },
    conceptosFiltrados() {
      return this.conceptos.filter(c => {
        if (this.filtroOrigen !== 'todos' && c.origen !== this.filtroOrigen) return false
        if (this.filtroMunicipio === 'todos') return true
        if (this.filtroMunicipio === 'generales') return !c.municipio_id
        return c.municipio_id === this.filtroMunicipio
      })
    },
    hayFiltros() {
      return this.filtroOrigen !== 'todos' || this.filtroMunicipio !== 'todos'
    },
    tituloLista() {
      if (this.filtroMunicipio === 'todos' || this.filtroMunicipio === 'generales') return 'Códigos de actividad'
      return `Códigos de ${this.nombreMunicipio(this.filtroMunicipio)}`
    },
    mensajeVacio() {
      if (this.hayFiltros) return 'Prueba con otro municipio u origen para ver más códigos.'
      return this.puedeEditar
        ? 'Agrega el primer código de actividad económica con su porcentaje de retención.'
        : 'Tu contador todavía no ha cargado códigos. Pídeselos por el chat de ayuda.'
    }
  },
  async mounted() {
    try {
      const usuario = await userService.getCurrentUser()
      this.rol = usuario?.role || null
    } catch {
      this.rol = null
    }
    this.usuarioListo = true
    await this.cargar()
  },
  methods: {
    async cargar() {
      this.loading = true
      this.errorCarga = ''
      try {
        const [m, c] = await Promise.all([
          municipalConceptsService.getMunicipios(),
          municipalConceptsService.getConcepts()
        ])
        this.municipios = m.data || []
        if (!c.success) throw new Error(c.error)
        this.conceptos = c.data
      } catch (e) {
        this.errorCarga = 'No pudimos cargar los códigos. ' + (e.message || '')
      } finally {
        this.loading = false
      }
    },
    puedeGestionar(c) {
      return c.origen === 'comun' ? this.esSuperAdmin : this.puedeEditar
    },
    nombreMunicipio(id) {
      if (!id) return 'General'
      return this.municipios.find(m => m.id === id)?.nombre || 'Municipio'
    },
    formatoPorcentaje(p) {
      const n = Number(p)
      return `${Number.isFinite(n) ? n.toLocaleString('es-VE', { maximumFractionDigits: 2 }) : p} %`
    },
    fechaCorta(iso) {
      const [y, m, d] = String(iso).slice(0, 10).split('-')
      return `${d}/${m}/${y}`
    },
    limpiarFiltros() {
      this.filtroMunicipio = 'todos'
      this.filtroOrigen = 'todos'
    },
    abrirAyuda() {
      window.dispatchEvent(new CustomEvent('ad-open-support-chat'))
    },
    abrirDialogo(item = null) {
      this.editedItem = item
        ? { ...vacio(), ...item, ordenanza: item.ordenanza || '', vigente_desde: item.vigente_desde || '', comun: item.origen === 'comun' }
        : vacio()
      this.dialog = true
    },
    reiniciarFormulario() {
      setTimeout(() => {
        this.editedItem = vacio()
        if (this.$refs.form) this.$refs.form.resetValidation()
      }, 300)
    },
    async save() {
      if (!this.$refs.form.validate()) return
      this.saving = true
      try {
        const comun = !!this.editedItem.comun && this.esSuperAdmin
        const res = this.editedItem.id
          ? await municipalConceptsService.updateConcept(this.editedItem.id, this.editedItem, { comun })
          : await municipalConceptsService.createConcept(this.editedItem, { comun })
        if (!res.success) throw new Error(res.error)
        this.showSnackbar(this.editedItem.id ? 'Código actualizado' : 'Código registrado')
        this.dialog = false
        await this.cargar()
      } catch (e) {
        this.showSnackbar('No se pudo guardar: ' + e.message, 'error')
      } finally {
        this.saving = false
      }
    },
    pedirQuitar(c) {
      this.aQuitar = c
      this.dialogQuitar = true
    },
    async quitar() {
      this.saving = true
      try {
        const res = await municipalConceptsService.deleteConcept(this.aQuitar.id, { comun: this.aQuitar.origen === 'comun' })
        if (!res.success) throw new Error(res.error)
        this.showSnackbar('Código quitado')
        this.dialogQuitar = false
        await this.cargar()
      } catch (e) {
        this.showSnackbar('No se pudo quitar: ' + e.message, 'error')
      } finally {
        this.saving = false
      }
    },
    showSnackbar(text, color = 'success') {
      this.snackbar = { show: true, text, color }
    }
  }
}
</script>

<style scoped>
.municipal-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 16px;
}
@media (min-width: 600px) {
  .municipal-page { padding: 24px; }
}
.municipal-filtros :deep(.v-slide-group__content) { flex-wrap: wrap; flex: 1 1 100%; width: 100%; }
.municipal-filtros {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
@media (min-width: 960px) {
  .municipal-filtros { flex-direction: row; align-items: center; }
  .municipal-filtros__municipio { max-width: 340px; flex: 0 0 340px; }
}
.fila-codigo {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 8px 14px 16px;
}
.fila-codigo__porcentaje {
  flex: 0 0 auto;
  min-width: 64px;
  height: 44px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.fila-codigo__porcentaje--cero { color: rgba(var(--v-theme-on-surface), 0.65); }
.fila-codigo__cuerpo { flex: 1 1 auto; min-width: 0; }
.fila-codigo__codigo { font-weight: 700; font-size: 1rem; }
.fila-codigo__actividad { font-size: 1rem; margin-top: 2px; overflow-wrap: anywhere; }
.fila-codigo__detalle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 0;
  margin-top: 6px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
}
.fila-codigo__ordenanza {
  margin-top: 4px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
</style>
