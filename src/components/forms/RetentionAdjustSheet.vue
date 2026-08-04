<template>
  <v-bottom-sheet v-model="internalValue" max-width="500">
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-primary text-white">
        <span>Ajustar Retenciones</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" density="comfortable" color="white" @click="close"></v-btn>
      </v-card-title>
      
      <v-card-text class="pa-4">
        <div class="text-caption mb-4 text-grey-darken-1">
          Por defecto se aplican las retenciones configuradas en el perfil del proveedor. 
          Desmarca las opciones si deseas omitir alguna retención para esta compra en particular.
        </div>

        <v-switch
          v-model="localConfig.aplicar_iva"
          label="Aplicar Retención de IVA"
          color="success"
          inset
          hide-details
          class="mb-2"
        ></v-switch>

        <v-divider class="my-3"></v-divider>

        <v-switch
          v-model="localConfig.aplicar_islr"
          label="Aplicar Retención de ISLR"
          color="success"
          inset
          hide-details
          class="mb-3"
        ></v-switch>
        
        <v-select
          v-if="localConfig.aplicar_islr"
          v-model="localConfig.islr_concept_id"
          :items="conceptosIslr"
          item-title="nombre"
          item-value="id"
          label="Concepto ISLR (Override)"
          variant="outlined"
          density="comfortable"
          hint="Sobrescribe el concepto por defecto del proveedor"
          persistent-hint
          clearable
          class="ml-4 mb-2"
        ></v-select>

        <v-divider class="my-3"></v-divider>

        <v-switch
          v-model="localConfig.aplicar_municipal"
          label="Aplicar Retención Municipal"
          color="success"
          inset
          hide-details
          class="mb-2"
        ></v-switch>
      </v-card-text>
      
      <v-divider></v-divider>
      
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          @click="apply"
        >
          Aplicar Ajustes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-bottom-sheet>
</template>

<script>
import { supabase } from '@/lib/supabaseClient'

export default {
  name: 'RetentionAdjustSheet',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    config: {
      type: Object,
      required: true
    }
  },
  emits: ['update:modelValue', 'update:config'],
  data() {
    return {
      internalValue: this.modelValue,
      localConfig: {
        aplicar_iva: true,
        aplicar_islr: true,
        aplicar_municipal: true,
        islr_concept_id: null
      },
      conceptosIslr: []
    }
  },
  watch: {
    modelValue(val) {
      this.internalValue = val
      if (val) {
        // Clonar la config para no mutar el prop directamente hasta que de a "Aplicar"
        this.localConfig = { ...this.config }
        this.fetchConceptos()
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
    apply() {
      this.$emit('update:config', { ...this.localConfig })
      this.close()
    },
    async fetchConceptos() {
      if (this.conceptosIslr.length === 0) {
        const { data } = await supabase.from('conceptos_islr').select('*').eq('is_active', true)
        if (data) this.conceptosIslr = data
      }
    }
  }
}
</script>
