<template>
  <v-bottom-sheet v-model="internalValue" persistent max-width="500">
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <span>Nuevo Proveedor</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" density="comfortable" @click="close"></v-btn>
      </v-card-title>
      
      <v-divider></v-divider>
      
      <v-card-text class="pa-4" style="max-height: 70vh; overflow-y: auto;">
        <v-form ref="form" v-model="valid" @submit.prevent="save">
          <v-text-field
            v-model="formData.nombre"
            label="Nombre o Razón Social"
            variant="outlined"
            density="comfortable"
            :rules="[v => !!v || 'Campo requerido']"
            class="mb-3"
          ></v-text-field>

          <v-row class="mb-3">
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.rif"
                label="RIF/CI"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Campo requerido']"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.tipo_persona"
                :items="['JURIDICA', 'NATURAL']"
                label="Tipo de Persona"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Requerido']"
              ></v-select>
            </v-col>
          </v-row>

          <v-divider class="mb-4"></v-divider>
          <div class="text-subtitle-2 mb-3 text-grey-darken-1">Configuración Fiscal (Retenciones)</div>

          <v-text-field
            v-model="formData.iva_retention_rate"
            label="% Retención IVA"
            type="number"
            variant="outlined"
            density="comfortable"
            hint="Ej: 75 o 100"
            suffix="%"
            class="mb-3"
          ></v-text-field>

          <!-- Selector de Concepto ISLR filtrado por tipo de persona -->
          <v-select
            v-model="formData.islr_concept_id"
            :items="conceptosFiltrados"
            item-title="displayLabel"
            item-value="id"
            label="Concepto ISLR (Por Defecto)"
            variant="outlined"
            density="comfortable"
            clearable
            class="mb-3"
            :hint="conceptoHint"
            persistent-hint
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props">
                <template v-slot:subtitle>
                  <span class="text-caption">
                    {{ item.raw.codigo ? `Cód. ${item.raw.codigo}` : '' }}
                    {{ item.raw.porcentaje_retencion ? ` • ${item.raw.porcentaje_retencion}%` : '' }}
                    {{ item.raw.sustraendo_ut > 0 ? ` • Sustr. ${item.raw.sustraendo_ut} UT` : '' }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.municipal_rate"
                label="Alícuota Municipal"
                type="number"
                variant="outlined"
                density="comfortable"
                suffix="%"
                class="mb-3"
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-autocomplete
                v-model="formData.municipio_id"
                :items="municipios"
                item-title="nombre"
                item-value="id"
                label="Municipio"
                variant="outlined"
                density="comfortable"
                clearable
                class="mb-3"
              ></v-autocomplete>
            </v-col>
          </v-row>
          
          <v-text-field
            v-model="formData.licencia_actividad_economica"
            label="N° Licencia de Actividad Económica"
            variant="outlined"
            density="comfortable"
          ></v-text-field>

        </v-form>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!valid"
          @click="save"
        >
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
import proveedorService from '@/services/proveedorService.js'

export default {
  name: 'ProveedorQuickAddSheet',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'saved'],
  data() {
    return {
      internalValue: this.modelValue,
      valid: false,
      saving: false,
      allConceptosIslr: [],
      municipios: [],
      formData: {
        nombre: '',
        rif: '',
        tipo_persona: 'JURIDICA',
        iva_retention_rate: 75,
        islr_concept_id: null,
        municipal_rate: 0,
        municipio_id: null,
        licencia_actividad_economica: ''
      }
    }
  },
  computed: {
    /** Filtra los conceptos ISLR según el tipo de persona seleccionado */
    conceptosFiltrados() {
      const tipo = this.formData.tipo_persona
      return this.allConceptosIslr
        .filter(c => !c.aplica_persona || c.aplica_persona === 'AMBOS' || c.aplica_persona === 'AMBAS' || c.aplica_persona === tipo)
        .map(c => ({
          ...c,
          displayLabel: `${c.codigo ? '[' + c.codigo + '] ' : ''}${c.nombre} (${c.porcentaje_retencion}%)`
        }))
    },
    /** Hint contextual para el selector de concepto ISLR */
    conceptoHint() {
      const tipo = this.formData.tipo_persona
      return tipo === 'NATURAL'
        ? 'Mostrando conceptos para Persona Natural'
        : 'Mostrando conceptos para Persona Jurídica'
    }
  },
  watch: {
    modelValue(val) {
      this.internalValue = val
      if (val) {
        this.fetchCatalogs()
        this.resetForm()
      }
    },
    internalValue(val) {
      this.$emit('update:modelValue', val)
    },
    'formData.tipo_persona'() {
      this.fetchCatalogs()
    }
  },
  methods: {
    close() {
      this.internalValue = false
    },
    resetForm() {
      this.formData = {
        nombre: '',
        rif: '',
        tipo_persona: 'JURIDICA',
        iva_retention_rate: 75,
        islr_concept_id: null,
        municipal_rate: 0,
        municipio_id: null,
        licencia_actividad_economica: ''
      }
      if (this.$refs.form) this.$refs.form.resetValidation()
    },
    async fetchCatalogs() {
      try {
        const [islr, mun] = await Promise.all([
          proveedorService.getISLRConcepts(this.formData.tipo_persona),
          proveedorService.getMunicipios()
        ])
        this.allConceptosIslr = islr || []
        this.municipios = mun || []
      } catch (err) {
        console.warn('Error cargando catálogos en QuickAddSheet:', err)
      }
    },
    async save() {
      if (this.$refs.form && !this.$refs.form.validate()) return
      
      this.saving = true
      try {
        const result = await proveedorService.createProveedor(this.formData)
        if (result.success) {
          this.$emit('saved', result.data)
          this.close()
        } else {
          alert(result.error || 'Ocurrió un error guardando el proveedor')
        }
      } catch (error) {
        console.error('Error guardando proveedor:', error)
        alert('Ocurrió un error guardando el proveedor')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
