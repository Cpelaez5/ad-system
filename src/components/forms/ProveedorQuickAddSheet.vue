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

          <v-select
            v-model="formData.islr_concept_id"
            :items="conceptosIslr"
            item-title="nombre"
            item-value="id"
            label="Concepto ISLR (Por Defecto)"
            variant="outlined"
            density="comfortable"
            clearable
            class="mb-3"
          ></v-select>

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
import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

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
      conceptosIslr: [],
      municipios: [],
      formData: {
        nombre: '',
        rif: '',
        tipo_persona: 'JURIDICA',
        iva_retention_rate: 0,
        islr_concept_id: null,
        municipal_rate: 0,
        municipio_id: null,
        licencia_actividad_economica: ''
      }
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
        iva_retention_rate: 0,
        islr_concept_id: null,
        municipal_rate: 0,
        municipio_id: null,
        licencia_actividad_economica: ''
      }
      if (this.$refs.form) this.$refs.form.resetValidation()
    },
    async fetchCatalogs() {
      if (this.conceptosIslr.length === 0) {
        const { data: c } = await supabase.from('conceptos_islr').select('*').eq('is_active', true)
        if (c) this.conceptosIslr = c
      }
      if (this.municipios.length === 0) {
        const { data: m } = await supabase.from('municipios').select('*').order('nombre')
        if (m) this.municipios = m
      }
    },
    async save() {
      if (!this.$refs.form.validate()) return
      
      this.saving = true
      try {
        const orgId = getCurrentOrganizationId()
        const insertData = { ...this.formData, organization_id: orgId }
        
        const { data, error } = await supabase
          .from('proveedores')
          .insert([insertData])
          .select()
          .single()

        if (error) throw error

        this.$emit('saved', data)
        this.close()
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
