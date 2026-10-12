# 🔀 Swapy - Cheat Sheet

> Drag-to-swap layouts en JavaScript

---

## Instalación

```bash
npm install swapy
```

---

## Uso Básico

### HTML Structure
```html
<div id="container">
  <!-- Slot = área donde se puede dropear -->
  <div data-swapy-slot="slot-1">
    <!-- Item = elemento arrastrable -->
    <div data-swapy-item="card-1">
      Contenido 1
    </div>
  </div>
  
  <div data-swapy-slot="slot-2">
    <div data-swapy-item="card-2">
      Contenido 2
    </div>
  </div>
</div>
```

### JavaScript
```javascript
import { createSwapy } from 'swapy'

// Inicializar
const container = document.getElementById('container')
const swapy = createSwapy(container)

// Escuchar cambios
swapy.onSwap((event) => {
  console.log('Nuevo orden:', event.data.array)
  // Guardar en localStorage o DB
})
```

---

## Integración con Vue

```vue
<template>
  <div ref="swapyContainer" class="dashboard-grid">
    <div 
      v-for="(card, index) in cards" 
      :key="card.id"
      :data-swapy-slot="`slot-${index}`"
    >
      <div :data-swapy-item="card.id" class="card">
        <component :is="card.component" />
      </div>
    </div>
  </div>
</template>

<script>
import { createSwapy } from 'swapy'

export default {
  data() {
    return {
      swapy: null,
      cards: [
        { id: 'stats', component: 'StatsCard' },
        { id: 'chart', component: 'ChartCard' },
        { id: 'recent', component: 'RecentInvoices' }
      ]
    }
  },
  
  mounted() {
    this.initSwapy()
  },
  
  beforeUnmount() {
    if (this.swapy) {
      this.swapy.destroy()
    }
  },
  
  methods: {
    initSwapy() {
      this.swapy = createSwapy(this.$refs.swapyContainer)
      
      this.swapy.onSwap((event) => {
        // Guardar nuevo orden
        this.saveCardOrder(event.data.object)
      })
      
      // Cargar orden guardado
      this.loadSavedOrder()
    },
    
    saveCardOrder(order) {
      localStorage.setItem('dashboardOrder', JSON.stringify(order))
    },
    
    loadSavedOrder() {
      const saved = localStorage.getItem('dashboardOrder')
      if (saved) {
        const order = JSON.parse(saved)
        this.swapy.setData(order)
      }
    }
  }
}
</script>

<style>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
</style>
```

---

## Configuración

```javascript
const swapy = createSwapy(container, {
  animation: 'dynamic',  // 'dynamic' | 'spring' | 'none'
  swapMode: 'drop',      // 'drop' | 'stop'
  autoScrollOnDrag: true,
  enabled: true
})

// Deshabilitar temporalmente
swapy.enable(false)

// Habilitar
swapy.enable(true)

// Destruir
swapy.destroy()
```

---

## Eventos

```javascript
swapy.onSwap((event) => {
  // event.data.object - Mapeo slot → item
  // { 'slot-1': 'card-2', 'slot-2': 'card-1' }
  
  // event.data.array - Array ordenado
  // [{ slot: 'slot-1', item: 'card-2' }, ...]
})
```

---

## Uso en Dashboard (Patrón del Proyecto)

```javascript
// Dashboard con cards arrastrables
const dashboardCards = [
  { id: 'total-facturas', title: 'Total Facturas' },
  { id: 'ingresos', title: 'Ingresos del Mes' },
  { id: 'pendientes', title: 'Facturas Pendientes' },
  { id: 'chart', title: 'Gráfico de Ventas' }
]

// Los usuarios pueden reorganizar su dashboard
// El orden se guarda en localStorage
```
