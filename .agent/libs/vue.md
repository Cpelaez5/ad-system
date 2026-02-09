# 🟢 Vue 3 - Cheat Sheet

> Patrones usados en este proyecto

---

## Estructura de Componente

```vue
<template>
  <div>
    <!-- Template HTML -->
  </div>
</template>

<script>
export default {
  name: 'MiComponente',
  
  // Props que recibe
  props: {
    titulo: {
      type: String,
      required: true
    },
    valor: {
      type: Number,
      default: 0
    }
  },
  
  // Eventos que emite
  emits: ['guardar', 'cancelar'],
  
  // Estado reactivo
  data() {
    return {
      loading: false,
      items: []
    }
  },
  
  // Propiedades computadas
  computed: {
    totalItems() {
      return this.items.length
    }
  },
  
  // Métodos
  methods: {
    async cargarDatos() {
      this.loading = true
      try {
        this.items = await servicio.getItems()
      } finally {
        this.loading = false
      }
    },
    
    guardar() {
      this.$emit('guardar', this.items)
    }
  },
  
  // Lifecycle hooks
  mounted() {
    this.cargarDatos()
  }
}
</script>

<style scoped>
/* Estilos solo para este componente */
</style>
```

---

## Directivas Comunes

```vue
<!-- Condicionales -->
<div v-if="loading">Cargando...</div>
<div v-else-if="error">Error</div>
<div v-else>Contenido</div>

<div v-show="visible">Oculta con CSS</div>

<!-- Listas -->
<div v-for="item in items" :key="item.id">
  {{ item.nombre }}
</div>

<!-- Binding -->
<input v-model="texto" />
<input :value="valor" @input="actualizarValor" />

<!-- Eventos -->
<button @click="guardar">Guardar</button>
<button @click.prevent="submit">Sin default</button>
<input @keyup.enter="buscar" />

<!-- Clases dinámicas -->
<div :class="{ 'activo': isActive, 'error': hasError }"></div>
<div :class="[claseBase, claseCondicional]"></div>

<!-- Estilos dinámicos -->
<div :style="{ color: colorTexto, fontSize: size + 'px' }"></div>
```

---

## Comunicación entre Componentes

### Props (Padre → Hijo)
```vue
<!-- Padre -->
<HijoComponente :datos="misDatos" :activo="true" />

<!-- Hijo -->
props: {
  datos: { type: Array, default: () => [] },
  activo: { type: Boolean, default: false }
}
```

### Eventos (Hijo → Padre)
```vue
<!-- Hijo -->
this.$emit('actualizado', nuevoValor)

<!-- Padre -->
<HijoComponente @actualizado="manejarActualizacion" />
```

### v-model Personalizado
```vue
<!-- Hijo -->
props: ['modelValue'],
emits: ['update:modelValue'],
computed: {
  valor: {
    get() { return this.modelValue },
    set(v) { this.$emit('update:modelValue', v) }
  }
}

<!-- Padre -->
<HijoComponente v-model="miValor" />
```

---

## Watchers

```javascript
watch: {
  // Watch simple
  busqueda(nuevoValor, valorAnterior) {
    this.buscar(nuevoValor)
  },
  
  // Watch con opciones
  filtros: {
    handler(nuevos) {
      this.cargarDatos()
    },
    deep: true,      // Observar cambios profundos
    immediate: true  // Ejecutar al montar
  }
}
```

---

## Refs

```vue
<template>
  <input ref="inputBusqueda" />
  <MiComponente ref="componenteHijo" />
</template>

<script>
methods: {
  enfocar() {
    this.$refs.inputBusqueda.focus()
  },
  
  llamarMetodoHijo() {
    this.$refs.componenteHijo.recargar()
  }
}
</script>
```

---

## Async/Await en Métodos

```javascript
methods: {
  async guardarFactura() {
    if (!this.validarFormulario()) return
    
    this.loading = true
    try {
      const resultado = await invoiceService.create(this.factura)
      this.showSnackbar('Factura guardada', 'success')
      this.$emit('guardado', resultado)
    } catch (error) {
      this.showSnackbar('Error: ' + error.message, 'error')
    } finally {
      this.loading = false
    }
  }
}
```

---

## Importar Servicios

```javascript
// Usar alias @/ para imports
import invoiceService from '@/services/invoiceService.js'
import clientService from '@/services/clientService.js'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers.js'
```

---

## Mejores Prácticas del Proyecto

1. **Siempre usar `key` en v-for**: `:key="item.id"`
2. **Props con tipos y defaults**
3. **Emits explícitos**
4. **Manejo de loading y errores**
5. **Imports con @/**
6. **Comentarios en español**
