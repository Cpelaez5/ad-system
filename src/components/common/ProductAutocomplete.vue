<template>
  <v-combobox
    v-model="internalValue"
    :items="items"
    :loading="loading"
    v-model:search="search"
    item-title="name"
    item-value="id"
    :label="label"
    placeholder="Escribe nombre o código..."
    variant="outlined"
    density="compact"
    hide-details
    return-object
    clearable
    no-filter
    menu-icon="mdi-package-variant-closed"
    @update:modelValue="onSelect"
    @update:search="querySelections"
  >
    <template v-slot:item="{ props, item }">
      <!-- Deshabilitar productos sin stock en modo VENTA -->
      <v-list-item
        v-bind="props"
        :title="item.raw.name"
        :subtitle="item.raw.code"
        :disabled="flow === 'VENTA' && item.raw.stock <= 0"
      >
        <template v-slot:append>
           <div class="d-flex flex-column align-end">
             <!-- Chip de stock con semáforo visual -->
             <v-chip
               v-if="item.raw.stock > 0"
               size="x-small"
               :color="item.raw.stock <= item.raw.min_stock ? 'warning' : 'success'"
               variant="flat"
               class="mb-1"
             >
               {{ item.raw.stock }} {{ item.raw.unit }}
             </v-chip>
             <!-- Alerta SIN STOCK para ventas -->
             <v-chip
               v-else
               size="x-small"
               color="error"
               variant="flat"
               class="mb-1"
               prepend-icon="mdi-alert-circle"
             >
               SIN STOCK
             </v-chip>
             <span class="text-caption text-grey">Base: {{ formatCurrency(item.raw.sale_price) }}</span>
           </div>
        </template>
      </v-list-item>
    </template>
    <template v-slot:no-data>
      <div class="pa-2 text-center text-caption">
        <div v-if="loading">Buscando...</div>
        <div v-else-if="search && search.length > 2">Presiona Enter para agregar usando este texto.</div>
        <div v-else>Escribe para buscar o agregar un texto libre</div>
      </div>
    </template>
  </v-combobox>

</template>

<script>
import inventoryService from '@/services/inventoryService'

export default {
  name: 'ProductAutocomplete',
  props: {
    modelValue: {
      type: [Object, String],
      default: null
    },
    label: {
      type: String,
      default: 'Buscar Producto'
    },
    clientId: {
      type: String,
      default: null
    },
    flow: {
       type: String,
       default: 'VENTA' 
    }
  },
  emits: ['update:modelValue', 'create-new', 'product-selected'],
  data() {
    return {
      items: [],
      loading: false,
      search: null,
      internalValue: null
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        this.internalValue = val
      }
    },
    search(val) {
      if (val && val !== this.internalValue?.name) {
        this.querySelections(val)
      }
    }
  },
  mounted() {
      // Cargar iniciales?
      this.querySelections('')
  },
  methods: {
    async querySelections(v) {
      this.loading = true
      try {
        const data = await inventoryService.getProducts({ 
            search: v || '', 
            limit: 10,
            clientId: this.clientId 
        });
        
        this.items = data
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    },
    onSelect(val) {
      this.$emit('update:modelValue', val)
      this.$emit('product-selected', val)
    },
    formatCurrency(val) {
       return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(val || 0)
    }
  }
}
</script>
