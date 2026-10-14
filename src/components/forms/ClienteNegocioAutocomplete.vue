<template>
  <div class="cliente-negocio" data-testid="cliente-negocio-autocomplete">
    <v-autocomplete
      :model-value="seleccion"
      v-model:search="texto"
      :items="opciones"
      item-title="titulo"
      item-value="clave"
      return-object
      no-filter
      :loading="cargando"
      :label="label"
      placeholder="Busca por nombre o RIF, o escribe uno nuevo"
      variant="outlined"
      density="comfortable"
      hide-details="auto"
      hide-no-data
      clearable
      :rules="[() => !!nombre || 'Elige o escribe a quién le vendiste']"
      @update:model-value="alElegir"
      @click:clear="alLimpiar"
      @blur="alSalir"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps" :title="undefined" :subtitle="undefined">
          <template #prepend>
            <v-icon :icon="icono(item.raw)" class="mr-2" aria-hidden="true" />
          </template>
          <v-list-item-title class="font-weight-medium">{{ etiqueta(item.raw) }}</v-list-item-title>
          <v-list-item-subtitle v-if="item.raw.subtitulo">{{ item.raw.subtitulo }}</v-list-item-subtitle>
        </v-list-item>
      </template>
    </v-autocomplete>

    <!-- Cliente nuevo: se crea al guardar la venta, no al escribirlo. -->
    <div v-if="seleccion && seleccion.tipo === 'nuevo'" class="cliente-negocio__nuevo">
      <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-account-plus-outline">
        Cliente nuevo: se guardará al registrar la venta
      </v-chip>
      <v-row dense class="mt-2">
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="rif"
            label="RIF (opcional)"
            placeholder="J-12345678-9"
            variant="outlined"
            density="comfortable"
            :hide-details="!avisoRif"
            :messages="avisoRif"
            @update:model-value="v => $emit('update:rif', v)"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="telefono"
            label="Teléfono (opcional)"
            placeholder="0414-1234567"
            type="tel"
            inputmode="tel"
            variant="outlined"
            density="comfortable"
            hide-details
            @update:model-value="v => $emit('update:telefono', v)"
          />
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script>
import clientesNegocioService, { filtrarClientes, esConsumidorFinal } from '@/services/clientesNegocioService.js'
import { normalizarRif } from '@/utils/rif.js'

const CONSUMIDOR_FINAL = { clave: 'cf', tipo: 'consumidor', titulo: 'Consumidor final', subtitulo: 'Sin guardar al cliente' }

/**
 * Autocompletado de "¿A quién le vendiste?" (solo VENTA). Controlado por el
 * formulario: recibe el cliente enlazado (`clienteId`) o el nombre escrito
 * (`nombre`) y avisa con eventos; nunca escribe en la BD.
 */
export default {
  name: 'ClienteNegocioAutocomplete',
  props: {
    clienteId: { type: String, default: null },
    nombre: { type: String, default: '' },
    rif: { type: String, default: '' },
    telefono: { type: String, default: '' },
    label: { type: String, default: '' }
  },
  emits: ['seleccionar', 'nuevo', 'consumidor-final', 'limpiar', 'cliente-cargado', 'update:rif', 'update:telefono'],
  data() {
    return { todos: [], texto: '', cargando: false }
  },
  computed: {
    seleccion() {
      if (this.clienteId) {
        const c = this.todos.find((x) => x.id === this.clienteId)
        return { clave: 'c:' + this.clienteId, tipo: 'cliente', id: this.clienteId, titulo: c?.nombre || this.nombre, subtitulo: c?.rif || '' }
      }
      if (!this.nombre) return null
      if (esConsumidorFinal(this.nombre)) return CONSUMIDOR_FINAL
      return { clave: 'nuevo', tipo: 'nuevo', titulo: this.nombre }
    },
    opciones() {
      const t = (this.texto || '').trim()
      // Con un cliente ya elegido, el texto del campo es su propio nombre: se muestra la lista completa.
      const consulta = this.seleccion && t === this.seleccion.titulo ? '' : t
      const lista = filtrarClientes(this.todos, consulta, 8).map((c) => ({
        clave: 'c:' + c.id, tipo: 'cliente', id: c.id, titulo: c.nombre, subtitulo: c.rif || 'Sin RIF', raw: c
      }))
      const hayIgual = lista.some((o) => o.titulo.trim().toLowerCase() === consulta.toLowerCase())
      if (consulta && !hayIgual && !esConsumidorFinal(consulta)) {
        lista.push({ clave: 'nuevo', tipo: 'nuevo', titulo: consulta, subtitulo: 'Se guarda al registrar la venta' })
      }
      lista.push(CONSUMIDOR_FINAL)
      return lista
    },
    avisoRif() {
      return this.rif && !normalizarRif(this.rif) ? 'Revisa el RIF. Ejemplo: J-12345678-9' : ''
    }
  },
  watch: {
    clienteId() { this.avisarCargado() }
  },
  async mounted() {
    this.cargando = true
    try {
      this.todos = await clientesNegocioService.buscar('', 1000)
      this.avisarCargado()
    } finally {
      this.cargando = false
    }
  },
  methods: {
    icono(o) {
      return o.tipo === 'nuevo' ? 'mdi-account-plus-outline' : o.tipo === 'consumidor' ? 'mdi-account-question-outline' : 'mdi-account-outline'
    },
    etiqueta(o) {
      return o.tipo === 'nuevo' ? `Nuevo cliente: «${o.titulo}»` : o.titulo
    },
    avisarCargado() {
      if (!this.clienteId) return
      const c = this.todos.find((x) => x.id === this.clienteId)
      if (c) this.$emit('cliente-cargado', c)
    },
    alElegir(o) {
      if (!o) return
      if (o.tipo === 'cliente') {
        const c = this.todos.find((x) => x.id === o.id) || o.raw
        this.$emit('seleccionar', c)
      } else if (o.tipo === 'consumidor') {
        this.$emit('consumidor-final')
      } else if (o.tipo === 'nuevo') {
        this.$emit('nuevo', { nombre: o.titulo })
      }
    },
    // Quien escribe un nombre y sigue de largo no pierde lo escrito: cuenta como cliente nuevo.
    alSalir() {
      const t = (this.texto || '').trim()
      if (!t || this.seleccion) return
      const igual = this.todos.find((c) => c.nombre.trim().toLowerCase() === t.toLowerCase())
      if (igual) this.$emit('seleccionar', igual)
      else if (esConsumidorFinal(t)) this.$emit('consumidor-final')
      else this.$emit('nuevo', { nombre: t })
    },
    alLimpiar() {
      this.$emit('limpiar')
    }
  }
}
</script>

<style scoped>
.cliente-negocio { width: 100%; }
.cliente-negocio__nuevo { margin-top: 12px; }
</style>
