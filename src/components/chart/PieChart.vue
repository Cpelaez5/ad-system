<template>
  <div class="chart-container animate-chart-fade-in">
    <div class="chart-wrapper animate-chart-grow">
      <canvas ref="chartCanvas" :width="width" :height="height"></canvas>
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
      required: true,
      default: () => ({
        labels: [],
        datasets: []
      })
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
    this.createChart()
  },
  beforeUnmount() {
    if (this.chart) {
      this.chart.destroy()
    }
  },
  watch: {
    data: {
      handler() {
        this.updateChart()
      },
      deep: true
    }
  },
  methods: {
    createChart() {
      const ctx = this.$refs.chartCanvas.getContext('2d')
      
      const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
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
          easing: 'easeOutQuart',
          delay: (context) => {
            return context.dataIndex * 200
          }
        },
        animations: {
          radius: {
            from: 0,
            duration: 1200,
            easing: 'easeOutQuart'
          },
          angle: {
            from: 0,
            duration: 1200,
            easing: 'easeOutQuart'
          }
        }
      }

      this.chart = new Chart(ctx, {
        type: 'pie',
        data: this.data,
        options: { ...defaultOptions, ...this.options }
      })
    },
    updateChart() {
      if (this.chart) {
        this.chart.data = this.data
        this.chart.update('active')
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
  transition: all var(--transition-normal);
}

.chart-container:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px) scale(1.02);
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

canvas {
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
}

canvas:hover {
  transform: scale(1.05);
}

/* Animación de entrada para el contenedor */
.chart-container::before {
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
  animation: chartShimmer 2s infinite;
}

@keyframes chartShimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Animación especial para gráficos de pastel */
.chart-container::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: radial-gradient(circle, rgba(2, 37, 77, 0.1) 0%, transparent 70%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pieGlow 3s ease-in-out infinite;
}

@keyframes pieGlow {
  0%, 100% {
    width: 0;
    height: 0;
    opacity: 0;
  }
  50% {
    width: 200px;
    height: 200px;
    opacity: 1;
  }
}
</style>
