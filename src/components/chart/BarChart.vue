<template>
  <!-- El div externo aplica la altura explícita pasada desde el padre -->
  <div class="chart-container" :style="{ height: height + 'px' }">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'
import { markRaw } from 'vue'

export default {
  name: 'BarChart',
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
      default: 200
    }
  },
  // Watch whole data object as fallback
  data() {
    return {
      // markRaw: le dice a Vue que NO envuelva el objeto Chart en un Proxy reactivo.
      // Sin markRaw, Chart.js falla silenciosamente porque el Proxy intercepta
      // las mutaciones internas necesarias para el renderizado del canvas.
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
    // Fallback: observar objeto `data` completo por si se reemplaza la referencia
    data: {
      handler() {
        if (this.chart) {
          this.$nextTick(() => this.updateChart())
        }
      },
      deep: true,
      immediate: false
    },
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
              // Clonar para evitar proxies reactivas en Chart.js
              const safeOptions = JSON.parse(JSON.stringify(newOptions || {}))
              Object.assign(this.chart.options, safeOptions)
              this.chart.update('none')
            } catch (e) {
              console.warn('BarChart: error aplicando opciones', e)
            }
          })
        }
      },
      deep: false
    }
  },
  methods: {
    handleResize() {
      // Verificar que el chart existe Y que su canvas interno está inicializado
      // antes de llamar resize() para evitar "Cannot set properties of undefined"
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
      console.log('[BarChart] createChart called, canvas:', canvas, 'data:', this.data?.labels?.length, 'labels')
      if (!canvas) { console.warn('[BarChart] No canvas ref'); return }
      const ctx = canvas.getContext && canvas.getContext('2d')
      if (!ctx) { console.warn('[BarChart] No 2d context'); return }

      // Destruir instancia previa si existe (evita "Canvas already in use")
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }

      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top',
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
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Poppins, sans-serif', size: 11 }, color: '#010101' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(237, 237, 237, 0.5)', drawBorder: false },
            ticks: { font: { family: 'Poppins, sans-serif', size: 11 }, color: '#010101' }
          }
        },
        animation: { duration: 800, easing: 'easeOutCubic' }
      }

      // Clonar los datos con JSON para evitar proxies reactivas de Vue
      const dataCopy = JSON.parse(JSON.stringify(this.data || { labels: [], datasets: [] }))

      // Fusionar opciones respetando los callbacks (funciones) del padre
      // usando Object.assign en profundidad en vez de JSON.parse (que elimina funciones)
      const mergedOptions = this.deepMerge(defaultOptions, this.options || {})

      console.log('[BarChart] Creating chart with', dataCopy.labels?.length, 'labels,', dataCopy.datasets?.length, 'datasets')
      try {
        // markRaw: evita que Vue envuelva la instancia de Chart en un Proxy reactivo.
        // El Proxy de Vue interfiere con las operaciones internas de Chart.js,
        // causando que el canvas no se dibuje aunque la instancia 'exista'.
        this.chart = markRaw(new Chart(ctx, {
          type: 'bar',
          data: dataCopy,
          options: mergedOptions
        }))
        console.log('[BarChart] Chart created successfully (raw):', this.chart.constructor.name)
      } catch (e) {
        console.error('[BarChart] Error creating chart:', e)
      }
    },
    updateChart() {
      if (!this.chart) {
        // Si no existe el chart todavía, intentar crearlo
        this.$nextTick(() => this.createChart())
        return
      }

      try {
        // Validar que los datos sean válidos
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

        // Destruir y recrear siempre — evita problemas con proxies reactivas de Vue
        // y garantiza que las animaciones funcionen correctamente en cada actualización
        this.chart.destroy()
        this.chart = null
        this.$nextTick(() => this.createChart())

      } catch (error) {
        console.error('BarChart: error en updateChart', error)
        // Fallback de seguridad
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
