# 📊 Chart.js - Cheat Sheet

> Gráficos interactivos para Vue

---

## Instalación y Setup

```javascript
// En componente Vue
import Chart from 'chart.js/auto'

export default {
  mounted() {
    this.createChart()
  },
  
  methods: {
    createChart() {
      const ctx = this.$refs.chartCanvas
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: this.chartData,
        options: this.chartOptions
      })
    }
  }
}
```

```vue
<template>
  <canvas ref="chartCanvas"></canvas>
</template>
```

---

## Tipos de Gráficos

### Bar Chart (Barras)
```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Enero', 'Febrero', 'Marzo'],
    datasets: [{
      label: 'Ventas',
      data: [12000, 19000, 15000],
      backgroundColor: ['#A81C22', '#1F355C', '#E0B04F']
    }]
  }
})
```

### Line Chart (Líneas)
```javascript
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Ene', 'Feb', 'Mar', 'Abr'],
    datasets: [{
      label: 'Ingresos',
      data: [5000, 7500, 6000, 9000],
      borderColor: '#A81C22',
      fill: false,
      tension: 0.4 // Curva suave
    }]
  }
})
```

### Pie/Doughnut (Circular)
```javascript
new Chart(ctx, {
  type: 'doughnut', // o 'pie'
  data: {
    labels: ['Pagadas', 'Pendientes', 'Vencidas'],
    datasets: [{
      data: [65, 25, 10],
      backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
    }]
  }
})
```

---

## Opciones Comunes

```javascript
const options = {
  responsive: true,
  maintainAspectRatio: false,
  
  plugins: {
    legend: {
      position: 'bottom',
      display: true
    },
    title: {
      display: true,
      text: 'Resumen de Facturas'
    },
    tooltip: {
      enabled: true
    }
  },
  
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}
```

---

## Actualizar Datos

```javascript
// Actualizar datos existentes
this.chart.data.datasets[0].data = [newData]
this.chart.update()

// Agregar nuevo dato
this.chart.data.labels.push('Abril')
this.chart.data.datasets[0].data.push(8000)
this.chart.update()
```

---

## Destruir Gráfico

```javascript
// Antes de crear nuevo o en beforeUnmount
if (this.chart) {
  this.chart.destroy()
}
```

---

## Ejemplo Completo Vue

```vue
<template>
  <div style="height: 300px">
    <canvas ref="chart"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'

export default {
  props: {
    invoiceStats: { type: Object, required: true }
  },
  
  data() {
    return {
      chart: null
    }
  },
  
  mounted() {
    this.renderChart()
  },
  
  beforeUnmount() {
    if (this.chart) this.chart.destroy()
  },
  
  watch: {
    invoiceStats: {
      handler() {
        this.renderChart()
      },
      deep: true
    }
  },
  
  methods: {
    renderChart() {
      if (this.chart) this.chart.destroy()
      
      this.chart = new Chart(this.$refs.chart, {
        type: 'doughnut',
        data: {
          labels: ['Pagadas', 'Pendientes', 'Vencidas'],
          datasets: [{
            data: [
              this.invoiceStats.pagadas,
              this.invoiceStats.pendientes,
              this.invoiceStats.vencidas
            ],
            backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      })
    }
  }
}
</script>
```

---

## Paleta del Proyecto

```javascript
// Usar colores corporativos
const colors = {
  primary: '#A81C22',
  secondary: '#1F355C',
  accent: '#E0B04F',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336'
}
```
