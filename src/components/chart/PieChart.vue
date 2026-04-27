<template>
  <div class="chart-container" :style="{ height: height + 'px' }">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'
import { markRaw } from 'vue'

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
      // markRaw: no envolver en Proxy reactivo de Vue (Chart.js falla con proxies)
      chart: null
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.createChart()
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
      if (this.chart && this.chart.canvas && typeof this.chart.resize === 'function') {
        try {
          this.chart.resize()
        } catch (e) {
          // Ignorar errores de resize si el chart fue destruido asincrónicamente
        }
      }
    },
    createChart() {
      const canvas = this.$refs.chartCanvas
      if (!canvas) return
      const ctx = canvas.getContext && canvas.getContext('2d')
      if (!ctx) return

      // Destruir instancia previa si existe (evita "Canvas already in use")
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }

      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'point' },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: 'Poppins, sans-serif', size: 12 }
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
        animation: { duration: 800, easing: 'easeOutCubic' }
      }

      // Clonar los datos con JSON para evitar proxies reactivas de Vue
      const dataCopy = JSON.parse(JSON.stringify(this.data || { labels: [], datasets: [] }))

      // Fusionar opciones respetando los callbacks (funciones) del padre
      const mergedOptions = this.deepMerge(defaultOptions, this.options || {})

      // markRaw: evita que Vue envuelva la instancia de Chart en un Proxy reactivo
      this.chart = markRaw(new Chart(ctx, {
        type: 'pie',
        data: dataCopy,
        options: mergedOptions
      }))
    },
    updateChart() {
      if (!this.chart) {
        this.$nextTick(() => this.createChart())
        return
      }

      try {
        if (!this.data || !Array.isArray(this.data.labels) || !Array.isArray(this.data.datasets)) {
          this.chart.data.labels = []
          this.chart.data.datasets = []
          this.chart.update('none')
          return
        }

        const hasData = this.data.labels.length > 0 &&
          this.data.datasets.some(ds => ds.data && ds.data.length > 0)

        if (!hasData) {
          this.chart.data.labels = []
          this.chart.data.datasets = []
          this.chart.update('none')
          return
        }

        // Destruir y recrear siempre para garantizar animaciones y datos limpios
        this.chart.destroy()
        this.chart = null
        this.$nextTick(() => this.createChart())

      } catch (error) {
        console.error('PieChart: error en updateChart', error)
        try { this.chart?.destroy() } catch (_) {}
        this.chart = null
        this.$nextTick(() => this.createChart())
      }
    },
    /**
     * Fusión profunda de objetos preservando funciones (callbacks de Chart.js).
     * JSON.parse/stringify no puede preservar funciones como los tooltip callbacks.
     */
    deepMerge(target, source) {
      const result = Object.assign({}, target)
      for (const key of Object.keys(source)) {
        const srcVal = source[key]
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && typeof srcVal !== 'function') {
          result[key] = this.deepMerge(target[key] || {}, srcVal)
        } else {
          result[key] = srcVal
        }
      }
      return result
    }
  }
}
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  /* La altura viene del prop :style binding, no del CSS */
}

canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
