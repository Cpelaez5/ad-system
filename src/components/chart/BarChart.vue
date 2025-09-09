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
  name: 'BarChart',
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
      default: 200
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
            position: 'top',
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
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: 'Poppins, sans-serif',
                size: 11
              },
              color: '#010101'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(237, 237, 237, 0.5)',
              drawBorder: false
            },
            ticks: {
              font: {
                family: 'Poppins, sans-serif',
                size: 11
              },
              color: '#010101'
            }
          }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart',
          delay: (context) => {
            return context.dataIndex * 100
          }
        },
        animations: {
          x: {
            from: 0,
            duration: 1000,
            easing: 'easeOutQuart'
          },
          y: {
            from: 0,
            duration: 1000,
            easing: 'easeOutQuart'
          }
        }
      }

      this.chart = new Chart(ctx, {
        type: 'bar',
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
  transform: translateY(-2px);
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
  transform: scale(1.02);
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
</style>
