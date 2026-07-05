<template>
  <v-autocomplete
    v-model="internalValue"
    :items="items"
    :loading="loading"
    v-model:search="search"
    item-title="name"
    item-value="id"
    :label="label"
    placeholder="Selecciona o crea una categoría..."
    variant="outlined"
    density="compact"
    hide-details="auto"
    return-object
    clearable
    menu-icon="mdi-shape-outline"
    @update:modelValue="onSelect"
    :rules="rules"
  >
    <template v-slot:no-data>
      <v-list-item v-if="loading">
        <v-list-item-title class="text-caption text-center">
          Cargando categorías...
        </v-list-item-title>
      </v-list-item>
      
      <v-list-item v-else-if="search && search.trim().length > 0">
        <v-list-item-title class="d-flex align-center justify-space-between text-caption">
          <span>No existe "{{ search }}".</span>
          <v-btn 
            size="small" 
            color="primary" 
            variant="tonal" 
            @click.stop="createNewCategory(search)"
            :loading="loading"
          >
            Crear nueva
          </v-btn>
        </v-list-item-title>
      </v-list-item>
      
      <v-list-item v-else>
        <v-list-item-title class="text-caption text-center">
          Escribe para buscar o agregar una nueva categoría
        </v-list-item-title>
      </v-list-item>
    </template>
  </v-autocomplete>
</template>

<script>
import expenseCategoryService from '@/services/expenseCategoryService'

export default {
  name: 'ExpenseCategorySelector',
  props: {
    modelValue: {
      type: [Object, String],
      default: null
    },
    label: {
      type: String,
      default: 'Categoría de Gasto'
    },
    clientId: {
      type: String,
      default: null
    },
    rules: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue', 'category-selected', 'category-created'],
  data() {
    return {
      items: [],
      loading: false,
      search: '',
      internalValue: null
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(val) {
        this.internalValue = val
        // Si hay un valor inicial, asegurarnos de que esté en la lista
        if (val && typeof val === 'object' && val.id) {
          this.$nextTick(() => {
            if (!this.items.find(i => i.id === val.id)) {
              this.items.unshift(val)
            }
          })
        } else if (val && typeof val === 'string') {
          // Es un ID
          const existing = this.items.find(i => i.id === val)
          if (existing) {
            this.internalValue = existing
          }
        }
      }
    },
    clientId: {
      handler(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.fetchCategories()
        }
      }
    }
  },
  mounted() {
    this.fetchCategories()
  },
  methods: {
    async fetchCategories() {
      this.loading = true
      try {
        const data = await expenseCategoryService.getCategories({ 
          clientId: this.clientId 
        })
        this.items = data || []
        
        // Mapear el ID a objeto si internalValue quedó como string
        if (this.internalValue && typeof this.internalValue === 'string') {
          const existing = this.items.find(i => i.id === this.internalValue)
          if (existing) {
            this.internalValue = existing
          }
        }
      } catch (e) {
        console.error('Error fetching categories:', e)
      } finally {
        this.loading = false
      }
    },
    onSelect(val) {
      if (val && typeof val === 'object') {
        this.$emit('update:modelValue', val.id)
        this.$emit('category-selected', val)
      } else {
        this.$emit('update:modelValue', null)
        this.$emit('category-selected', null)
      }
    },
    async createNewCategory(name) {
      if (!name || !name.trim()) return
      
      this.loading = true
      try {
        const newCategory = await expenseCategoryService.createCategory(
          { name: name.trim() },
          { clientId: this.clientId }
        )
        // Actualizamos la lista
        this.items.push(newCategory)
        // Seleccionamos
        this.internalValue = newCategory
        this.search = '' // Limpiamos el buscador
        this.$emit('update:modelValue', newCategory.id)
        this.$emit('category-created', newCategory)
        this.$emit('category-selected', newCategory)
      } catch (e) {
        console.error('Error creating new category:', e)
        this.internalValue = null
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
