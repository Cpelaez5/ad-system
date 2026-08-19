<template>
  <div class="proveedor-autocomplete">
    <div class="d-flex align-center mb-2">
      <span class="text-subtitle-1 font-weight-medium">Proveedor</span>
      <v-chip size="small" color="primary" variant="tonal" class="ml-2">Requerido</v-chip>
      <v-spacer></v-spacer>
      <v-btn
        variant="text"
        color="primary"
        size="small"
        prepend-icon="mdi-plus"
        @click="$emit('add-new')"
      >
        Nuevo
      </v-btn>
    </div>

    <v-autocomplete
      v-model="internalValue"
      :items="proveedores"
      :loading="loading"
      item-title="nombre"
      item-value="id"
      placeholder="Buscar por Nombre o RIF"
      variant="outlined"
      hide-details="auto"
      :rules="[v => !!v || 'Debe seleccionar un proveedor']"
      clearable
      return-object
      @update:model-value="onSelect"
    >
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props" :title="item.raw.nombre" :subtitle="item.raw.rif">
          <template v-slot:prepend>
            <v-icon color="primary" class="mr-2">
              {{ item.raw.tipo_persona === 'JURIDICA' ? 'mdi-domain' : 'mdi-account' }}
            </v-icon>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script>
import proveedorService from '@/services/proveedorService.js'

export default {
  name: 'ProveedorAutocomplete',
  props: {
    modelValue: {
      type: Object,
      default: null
    }
  },
  emits: ['update:modelValue', 'add-new'],
  data() {
    return {
      internalValue: this.modelValue,
      proveedores: [],
      loading: false
    }
  },
  watch: {
    modelValue(newVal) {
      this.internalValue = newVal
    }
  },
  async mounted() {
    await this.fetchProveedores()
    window.addEventListener('ad-proveedor-changed', this.fetchProveedores)
  },
  beforeUnmount() {
    window.removeEventListener('ad-proveedor-changed', this.fetchProveedores)
  },
  methods: {
    async fetchProveedores() {
      this.loading = true
      try {
        const data = await proveedorService.getProveedores({ onlyActive: true })
        this.proveedores = data || []
      } catch (error) {
        console.error('Error fetching proveedores in autocomplete:', error)
      } finally {
        this.loading = false
      }
    },
    onSelect(val) {
      this.$emit('update:modelValue', val)
    }
  }
}
</script>

<style scoped>
.proveedor-autocomplete {
  width: 100%;
}
</style>
