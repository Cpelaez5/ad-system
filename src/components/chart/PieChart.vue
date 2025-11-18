<template>
  <div class="chart-container animate-chart-fade-in">
    <div class="chart-wrapper animate-chart-grow">
      <canvas ref="chartCanvas"></canvas>
    </div>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'

export default {
  name: 'PieChart',
  props: {
    data: {
      type: Object,
      // required: true,
      // default: () => ({
      //   labels: [],
      //   datasets: []
      // })
    },
    options: {
      type: Object,
      default: () => ({})
    },
    width: {
      type: Number,
      default: 400
    },
    height: {
      type: Number,
      default: 400
    }
  },
  data() {
    return {
      chart: null
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.createChart()
      // Forzar un resize/update por si el canvas aún no tenía tamaño
      if (this.chart && typeof this.chart.resize === 'function') {
        this.chart.resize()
        this.chart.update('none')
      }
      // Escuchar cambios de tamaño para redibujar correctamente
      window.addEventListener('resize', this.handleResize)
    })
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
    window.removeEventListener('resize', this.handleResize)
  },
  watch: {
    // Watch específico para labels y datasets para detectar cambios
    'data.labels': {
      handler() {
        if (this.chart) {
          this.$nextTick(() => {
            this.updateChart()
          })
        }
      },
      immediate: false
    },
    'data.datasets': {
      handler() {
        if (this.chart) {
          this.$nextTick(() => {
            this.updateChart()
          })
        }
      },
      deep: true,
      immediate: false
    },
    options: {
      handler(newOptions) {
        if (this.chart && newOptions) {
          this.$nextTick(() => {
            try {
              const safeOptions = JSON.parse(JSON.stringify(newOptions || {}))
              Object.assign(this.chart.options, safeOptions)
              this.chart.update('none')
            } catch (e) {
              console.warn('PieChart: error aplicando opciones', e)
            }
          })
        }
      },
      deep: false
    }
    ,
    // Fallback: observar objeto `data` completo por si se reemplaza la referencia
    data: {
      handler() {
        if (this.chart) {
          this.$nextTick(() => this.updateChart())
        }
      },
      deep: true,
      immediate: false
    }
  },
  methods: {
    handleResize() {
      if (this.chart && typeof this.chart.resize === 'function') {
        this.chart.resize()
        this.chart.update('none')
      }
    },
    createChart() {
      const canvas = this.$refs.chartCanvas
      if (!canvas) return
      const ctx = canvas.getContext && canvas.getContext('2d')
      if (!ctx) return
      console.debug('PieChart: createChart canvas size', canvas.clientWidth, canvas.clientHeight)
      
      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'point'
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                family: 'Poppins, sans-serif',
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(2, 37, 77, 0.9)',
            titleColor: '#FFFFFF',
            bodyColor: '#FFFFFF',
            borderColor: '#F2B648',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutCubic',
          delay: (context) => {
            // Delay escalonado para que los segmentos aparezcan uno por uno
            return context.dataIndex * 100
          }
        },
        animations: {
          // Animación del radio desde el centro
          radius: {
            type: 'number',
            easing: 'easeOutCubic',
            duration: 1500,
            from: 0,
            delay: (context) => {
              return context.dataIndex * 100
            }
          },
          // Animación del ángulo
          angle: {
            type: 'number',
            easing: 'easeOutCubic',
            duration: 1500,
            from: 0,
            delay: (context) => {
              return context.dataIndex * 100
            }
          },
          // Animación de colores para suavizar la aparición
          colors: {
            type: 'color',
            easing: 'easeOutCubic',
            duration: 1000,
            from: 'transparent'
          }
        },
        transitions: {
          // Desactivar animaciones de hover (active mode)
          active: {
            animation: {
              duration: 0
            }
          },
          // Desactivar animaciones en actualizaciones
          resize: {
            animation: {
              duration: 0
            }
          }
        }
      }

      // Evitar pasar objetos reactivos de Vue directamente a Chart.js.
      // Hacemos una copia profunda de `data` y `options` para que Chart.js
      // no intente mutar proxies reactivas de Vue (provoca recursión/errores).
      const dataCopy = JSON.parse(JSON.stringify(this.data || { labels: [], datasets: [] }))
      const optionsCopy = Object.assign({}, defaultOptions, JSON.parse(JSON.stringify(this.options || {})))

      console.debug('PieChart: creating chart with data', dataCopy, 'options', optionsCopy)

      this.chart = new Chart(ctx, {
        type: 'pie',
        data: dataCopy,
        options: optionsCopy
      })
      // No llamar a update() inmediatamente sobre datos reactivos; el constructor
      // ya dibuja el gráfico. Si es necesario, forzaremos un resize asíncrono.
      setTimeout(() => {
        try {
          if (this.chart && typeof this.chart.resize === 'function') {
            this.chart.resize()
            this.chart.update('none')
          }
        } catch (e) {
          console.warn('PieChart: error en resize inicial', e)
        }
      }, 0)
    },
    updateChart() {
      if (!this.chart) return
      console.debug('PieChart: updateChart called - chart exists, canvas size', this.$refs.chartCanvas?.clientWidth, this.$refs.chartCanvas?.clientHeight)
      
      try {
        // Validar que los datos sean válidos
        if (!this.data || !Array.isArray(this.data.labels) || !Array.isArray(this.data.datasets)) {
          // Si no hay datos válidos, limpiar el gráfico
          if (this.chart.data && (this.chart.data.labels.length > 0 || this.chart.data.datasets.length > 0)) {
            this.chart.data.labels = []
            this.chart.data.datasets = []
            this.chart.update('none')
          }
          return
        }
        
        // Verificar si hay datos para mostrar
        const hasData = this.data.labels.length > 0 && this.data.datasets.length > 0 && 
                       this.data.datasets.some(ds => ds.data && ds.data.length > 0)
        
        if (!hasData) {
          // Si no hay datos, limpiar el gráfico
          if (this.chart.data && (this.chart.data.labels.length > 0 || this.chart.data.datasets.length > 0)) {
            this.chart.data.labels = []
            this.chart.data.datasets = []
            this.chart.update('none')
          }
          return
        }
        
        // Crear copias de los datos para evitar referencias reactivas
        const labels = [...(this.data.labels || [])]
        const datasets = this.data.datasets.map(ds => ({
          ...ds,
          data: [...(ds.data || [])]
        }))
        console.debug('PieChart: updating chart data labels:', labels, 'datasets:', datasets)
        
        // Verificar si es la primera vez que se cargan datos (gráfico vacío)
        const isFirstLoad = this.chart.data.labels.length === 0 && this.chart.data.datasets.length === 0
        
        // Actualizar datos directamente
        this.chart.data.labels = labels
        this.chart.data.datasets = datasets
        
        // Si es la primera carga, usar animación. Si no, intentar actualizar sin animación
        try {
          if (isFirstLoad) {
            this.chart.update()
          } else {
            this.chart.update('none')
          }
        } catch (e) {
          console.warn('PieChart: update failed, recreating chart', e)
          try {
            this.chart.destroy()
          } catch (dErr) {
            console.warn('PieChart: error destroying chart during fallback', dErr)
          }
          this.$nextTick(() => {
            try {
              this.createChart()
            } catch (cErr) {
              console.error('PieChart: failed to recreate chart', cErr)
            }
          })
        }
      } catch (error) {
        console.error('Error actualizando gráfico:', error)
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: var(--spacing-md);
  background: var(--color-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

canvas {
  border-radius: var(--radius-md);
}

/* Asegurar que el canvas ocupe el área disponible */
canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
