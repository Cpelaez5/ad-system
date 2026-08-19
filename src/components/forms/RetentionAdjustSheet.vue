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
          :items="formattedConceptos"
          item-title="displayLabel"
          item-value="id"
          label="Concepto ISLR (Override)"
          variant="outlined"
          density="comfortable"
          hint="Sobrescribe el concepto por defecto del proveedor"
          persistent-hint
          clearable
          class="ml-4 mb-2"
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
import proveedorService from '@/services/proveedorService.js'

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
    },
    tipoPersona: {
      type: String,
      default: null
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
  computed: {
    formattedConceptos() {
      return this.conceptosIslr
        .filter(c => !this.tipoPersona || !c.aplica_persona || c.aplica_persona === 'AMBOS' || c.aplica_persona === 'AMBAS' || c.aplica_persona === this.tipoPersona)
        .map(c => ({
          ...c,
          displayLabel: `${c.codigo ? '[' + c.codigo + '] ' : ''}${c.nombre} (${c.porcentaje_retencion}%)`
        }))
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
      try {
        const data = await proveedorService.getISLRConcepts(this.tipoPersona)
        if (data) this.conceptosIslr = data
      } catch (err) {
        console.warn('Error fetching conceptos ISLR in RetentionAdjustSheet:', err)
      }
    }
  }
}
</script>
