<template>
  <div class="animated-table-container">
    <!-- Header de la tabla -->
    <div v-if="title" class="table-header animate-slide-in-down">
      <h3 class="text-h6 font-weight-bold">
        <v-icon left class="animate-micro-rotate">{{ titleIcon }}</v-icon>
        {{ title }}
      </h3>
      <div v-if="showActions" class="table-actions animate-fade-in animate-delay-200">
        <slot name="actions"></slot>
      </div>
    </div>

    <!-- Contenedor de la tabla -->
    <div class="table-wrapper animate-slide-in-up animate-delay-100">
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-per-page="itemsPerPage"
        :page="page"
        :search="search"
        :sort-by="sortBy"
        :sort-desc="sortDesc"
        class="animated-data-table"
        :class="{ 'animate-loading': loading }"
        @update:page="updatePage"
        @update:items-per-page="updateItemsPerPage"
        @update:sort-by="updateSortBy"
        @update:sort-desc="updateSortDesc"
      >
        <!-- Slot para contenido personalizado de celdas -->
        <template v-for="(header, index) in headers" :key="header.key" v-slot:[`item.${header.key}`]="{ item }">
          <div 
            class="table-cell animate-table-row"
            :class="`animate-delay-${(index % 5) * 100}`"
          >
            <slot 
              :name="`item.${header.key}`" 
              :item="item" 
              :value="item[header.key]"
            >
              {{ item[header.key] }}
            </slot>
          </div>
        </template>

        <!-- Slot para acciones -->
        <template v-if="showItemActions" v-slot:item.actions="{ item }">
          <div class="table-actions-cell animate-table-row">
            <slot name="item.actions" :item="item">
              <v-btn
                icon
                size="small"
                color="primary"
                variant="text"
                class="animate-micro-bounce"
                @click="editItem(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn
                icon
                size="small"
                color="error"
                variant="text"
                class="animate-micro-bounce"
                @click="deleteItem(item)"
              >
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </slot>
          </div>
        </template>

        <!-- Slot para estado de carga -->
        <template v-slot:loading>
          <v-skeleton-loader
            v-for="n in itemsPerPage"
            :key="n"
            type="table-row"
            class="animate-pulse"
          ></v-skeleton-loader>
        </template>

        <!-- Slot para datos vacíos -->
        <template v-slot:no-data>
          <div class="no-data animate-fade-in">
            <v-icon size="64" color="grey-lighten-1" class="animate-bounce">mdi-database-off</v-icon>
            <p class="text-h6 mt-4">No hay datos disponibles</p>
            <p class="text-body-2 text-grey">Los datos aparecerán aquí cuando estén disponibles</p>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Paginación personalizada -->
    <div v-if="showPagination" class="table-pagination animate-slide-in-up animate-delay-300">
      <v-pagination
        v-model="page"
        :length="totalPages"
        :total-visible="7"
        class="animate-fade-in"
        @update:model-value="updatePage"
      ></v-pagination>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AnimatedTable',
  props: {
    title: {
      type: String,
      default: ''
    },
    titleIcon: {
      type: String,
      default: 'mdi-table'
    },
    headers: {
      type: Array,
      required: true
    },
    items: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    itemsPerPage: {
      type: Number,
      default: 10
    },
    page: {
      type: Number,
      default: 1
    },
    search: {
      type: String,
      default: ''
    },
    sortBy: {
      type: Array,
      default: () => []
    },
    sortDesc: {
      type: Array,
      default: () => []
    },
    showActions: {
      type: Boolean,
      default: true
    },
    showItemActions: {
      type: Boolean,
      default: true
    },
    showPagination: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    totalPages() {
      return Math.ceil(this.items.length / this.itemsPerPage)
    }
  },
  methods: {
    updatePage(newPage) {
      this.$emit('update:page', newPage)
    },
    updateItemsPerPage(newItemsPerPage) {
      this.$emit('update:items-per-page', newItemsPerPage)
    },
    updateSortBy(newSortBy) {
      this.$emit('update:sort-by', newSortBy)
    },
    updateSortDesc(newSortDesc) {
      this.$emit('update:sort-desc', newSortDesc)
    },
    editItem(item) {
      this.$emit('edit', item)
    },
    deleteItem(item) {
      this.$emit('delete', item)
    }
  }
}
</script>

<style scoped>
.animated-table-container {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
  transition: all var(--transition-normal);
}

.animated-table-container:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: var(--text-on-primary);
  border-bottom: 1px solid var(--color-surface);
}

.table-header h3 {
  color: var(--text-on-primary);
  display: flex;
  align-items: center;
  margin: 0;
}

.table-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.table-wrapper {
  position: relative;
  overflow: hidden;
}

.animated-data-table {
  transition: all var(--transition-normal);
}

.table-cell {
  transition: all var(--transition-fast);
  padding: var(--spacing-sm);
}

.table-cell:hover {
  background-color: rgba(2, 37, 77, 0.05);
  transform: scale(1.02);
}

.table-actions-cell {
  display: flex;
  gap: var(--spacing-xs);
  justify-content: center;
}

.no-data {
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--text-secondary);
}

.table-pagination {
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border-top: 1px solid var(--color-surface);
  display: flex;
  justify-content: center;
}

/* Animaciones específicas para filas de tabla */
.animated-data-table :deep(.v-data-table__tr) {
  transition: all var(--transition-fast);
}

.animated-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgba(2, 37, 77, 0.05) !important;
  transform: translateX(4px);
}

.animated-data-table :deep(.v-data-table__tr:nth-child(even)) {
  animation: tableRowSlide var(--animation-duration-fast) var(--ease-out);
}

.animated-data-table :deep(.v-data-table__tr:nth-child(odd)) {
  animation: tableRowSlide var(--animation-duration-fast) var(--ease-out);
  animation-delay: 0.1s;
}

/* Animación de resaltado para filas nuevas */
.animated-data-table :deep(.v-data-table__tr.highlight) {
  animation: tableRowHighlight 1s var(--ease-in-out);
}

/* Responsive */
@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    gap: var(--spacing-md);
    text-align: center;
  }
  
  .table-actions {
    justify-content: center;
  }
  
  .table-pagination {
    padding: var(--spacing-md);
  }
}

/* Estados de carga */
.animate-loading {
  position: relative;
  overflow: hidden;
}

.animate-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(2, 37, 77, 0.1),
    transparent
  );
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>
