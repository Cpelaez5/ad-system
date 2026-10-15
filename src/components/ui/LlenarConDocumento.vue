<template>
  <div class="llenar-doc">
    <v-menu v-if="esTelefono" location="bottom start">
      <template #activator="{ props: menu }">
        <BotonIA
          v-bind="menu"
          variant="tonal"
          color="primary"
          size="large"
          block
          class="llenar-doc__boton"
          :loading="leyendo"
          :disabled="leyendo"
          data-testid="llenar-con-documento"
        >Llenar con un documento</BotonIA>
      </template>
      <v-list>
        <v-list-item prepend-icon="mdi-camera-outline" title="Tomar foto" data-testid="llenar-tomar-foto" @click="$refs.camara?.click()" />
        <v-list-item prepend-icon="mdi-file-upload-outline" title="Subir foto o PDF" data-testid="llenar-subir" @click="$refs.selector?.click()" />
      </v-list>
    </v-menu>
    <BotonIA
      v-else
      variant="tonal"
      color="primary"
      size="large"
      class="llenar-doc__boton"
      :loading="leyendo"
      :disabled="leyendo"
      data-testid="llenar-con-documento"
      @click="$refs.selector?.click()"
    >Llenar con un documento</BotonIA>

    <input ref="camara" type="file" accept="image/*" capture="environment" class="llenar-doc__input" data-testid="llenar-input-camara" @change="elegido">
    <input ref="selector" type="file" accept="image/*,application/pdf" class="llenar-doc__input" data-testid="llenar-input" @change="elegido">

    <TrabajandoIA v-if="leyendo" mensaje="Leyendo tu documento…" class="llenar-doc__estado" data-testid="llenar-leyendo" />

    <p v-if="aviso" class="llenar-doc__aviso" role="status" data-testid="llenar-aviso">
      <v-icon size="16" class="mr-1">mdi-information-outline</v-icon>{{ aviso }}
    </p>

    <p v-if="marca" class="llenar-doc__marca" data-testid="llenar-marca">
      <MarcaIA :texto="marca" />
      <v-btn variant="text" size="small" color="primary" class="text-none ml-1 px-2" data-testid="llenar-deshacer" @click="deshacer">Deshacer</v-btn>
    </p>
  </div>
</template>

<script>
import BotonIA from '@/components/ui/BotonIA.vue'
import TrabajandoIA from '@/components/ui/TrabajandoIA.vue'
import MarcaIA from '@/components/ui/MarcaIA.vue'
import {
  leerDocumento, avisoDeCalidad, esIlegible, marcaDeLlenado, aplicarSoloVacios, restaurar,
} from '@/services/documentoIaService'

export default {
  name: 'LlenarConDocumento',
  components: { BotonIA, TrabajandoIA, MarcaIA },
  props: {
    /** Objeto del formulario que se llena (se modifica solo en los campos vacíos). */
    formulario: { type: Object, required: true },
    /** Función pura documento → { campo: valor } (aProveedor, aCliente, aEmpresa). */
    mapear: { type: Function, required: true },
    tipoEsperado: { type: String, default: 'auto' },
    /** Campos que siempre se sobrescriben (selectores con valor por defecto). */
    forzar: { type: Array, default: () => [] },
    /** Opcional: (doc) => mensaje si el documento no corresponde; entonces no se llena nada. */
    validar: { type: Function, default: null },
  },
  emits: ['datos', 'error', 'llenado', 'deshecho'],
  data() {
    return { leyendo: false, aviso: '', marca: '', previo: null, esTelefono: false }
  },
  watch: {
    // El formulario se reinicia al abrirse: se limpia la marca anterior.
    formulario() { this.limpiar() },
  },
  mounted() {
    try {
      this.esTelefono = !!window.matchMedia?.('(max-width: 959px)').matches
    } catch { this.esTelefono = false }
  },
  methods: {
    limpiar() {
      this.aviso = ''
      this.marca = ''
      this.previo = null
    },
    async elegido(e) {
      const archivo = e.target.files?.[0]
      e.target.value = '' // permite elegir el mismo archivo otra vez
      if (!archivo) return
      this.limpiar()
      this.leyendo = true
      try {
        const { documento, error } = await leerDocumento(archivo, this.tipoEsperado)
        if (error) {
          this.aviso = error.message
          this.$emit('error', error)
          return
        }
        this.$emit('datos', documento, archivo)
        if (esIlegible(documento)) {
          this.aviso = avisoDeCalidad(documento)
          return
        }
        const problema = this.validar?.(documento)
        if (problema) {
          this.aviso = problema
          return
        }
        this.aviso = avisoDeCalidad(documento) || ''
        const { campos, previo } = aplicarSoloVacios(this.formulario, this.mapear(documento), this.forzar)
        if (campos.length) {
          this.previo = previo
          this.marca = marcaDeLlenado(documento)
          this.$emit('llenado', campos, documento)
        } else if (!this.aviso) {
          this.aviso = 'Ya tenías esos datos escritos, no cambiamos nada.'
        }
      } finally {
        this.leyendo = false
      }
    },
    deshacer() {
      restaurar(this.formulario, this.previo)
      this.limpiar()
      this.$emit('deshecho')
    },
  },
}
</script>

<style scoped>
.llenar-doc__input { display: none; }
.llenar-doc__boton { min-height: 48px; }
.llenar-doc__aviso,
.llenar-doc__marca {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin: 8px 0 0;
  font-size: 0.9375rem;
  line-height: 1.4;
}
.llenar-doc__estado { margin-top: 8px; }
.llenar-doc__aviso { color: rgb(var(--v-theme-warning)); }
.llenar-doc__marca { color: rgb(var(--v-theme-on-surface)); }
</style>
