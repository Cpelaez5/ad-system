<template>
  <v-container fluid class="pa-4">

    <!-- Tarjetas de estadísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6. stats-card"
          height="120"
          style="background-color: #02254d;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Clientes Activos</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ estadisticas.totalClientes }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #961112;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Facturas Este Mes</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ estadisticas.facturasMes }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #f2b648;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Ingresos Este Mes</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">${{ estadisticas.ingresosMes.toLocaleString() }}</div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #f0d29b;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Documentos Archivados</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">{{ estadisticas.documentos }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Accesos rápidos (NO arrastrable) -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h2 class="text-h5 font-weight-bold mb-4">Accesos Rápidos</h2>
        <v-row>
          <v-col cols="12" sm="6" md="4">
            <v-card
              class="pa-4 text-center"
              hover
              @click="$router.push('/clientes')"
            >
              <v-icon size="48" color="primary" class="mb-2">mdi-account-plus</v-icon>
              <h3 class="text-h6">Nuevo Cliente</h3>
              <p class="text-body-2 text-grey">Registrar nuevo contribuyente</p>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-card
              class="pa-4 text-center"
              hover
              @click="$router.push('/facturacion')"
            >
              <v-icon size="48" color="success" class="mb-2">mdi-receipt-plus</v-icon>
              <h3 class="text-h6">Nueva Factura</h3>
              <p class="text-body-2 text-grey">Crear factura electrónica</p>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-card
              class="pa-4 text-center"
              hover
              @click="$router.push('/archivo')"
            >
              <v-icon size="48" color="info" class="mb-2">mdi-upload</v-icon>
              <h3 class="text-h6">Subir Documento</h3>
              <p class="text-body-2 text-grey">Archivar soportes digitales</p>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Contenedor de Drag & Drop para cards individuales -->
    <div ref="container" class="dashboard-drag-container">
      <!-- Gráfico de Barras -->
      <div data-swapy-slot="grafico-barras" class="dashboard-slot">
        <div data-swapy-item="grafico-barras">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-chart-bar</v-icon>
              Ingresos vs Egresos (Últimos 6 meses)
            </v-card-title>
            <v-card-text>
              <BarChart
                :data="chartData"
                :options="chartOptions"
                height="300"
              />
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Gráfico de Pastel -->
      <div data-swapy-slot="grafico-pastel" class="dashboard-slot">
        <div data-swapy-item="grafico-pastel">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-chart-pie</v-icon>
              Distribución de Gastos
            </v-card-title>
            <v-card-text>
              <PieChart
                :data="pieChartData"
                :options="pieChartOptions"
                height="300"
              />
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Actividad Reciente -->
      <div data-swapy-slot="actividad-reciente" class="dashboard-slot">
        <div data-swapy-item="actividad-reciente">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-history</v-icon>
              Actividad Reciente
            </v-card-title>
            <v-card-text>
              <v-list>
                <v-list-item
                  v-for="actividad in actividadesRecientes"
                  :key="actividad.id"
                  :prepend-icon="actividad.icono"
                >
                  <v-list-item-title>{{ actividad.descripcion }}</v-list-item-title>
                  <v-list-item-subtitle>{{ actividad.fecha }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Estado del Sistema -->
      <div data-swapy-slot="estado-sistema" class="dashboard-slot">
        <div data-swapy-item="estado-sistema">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-chart-line</v-icon>
              Estado del Sistema
            </v-card-title>
            <v-card-text>
              <div class="mb-3">
                <div class="d-flex justify-space-between">
                  <span>Almacenamiento</span>
                  <span>75%</span>
                </div>
                <v-progress-linear
                  color="primary"
                  height="8"
                  :model-value="75"
                  rounded
                ></v-progress-linear>
              </div>
              
              <div class="mb-3">
                <div class="d-flex justify-space-between">
                  <span>Respaldos</span>
                  <span>100%</span>
                </div>
                <v-progress-linear
                  color="success"
                  height="8"
                  :model-value="100"
                  rounded
                ></v-progress-linear>
              </div>

              <div class="text-center mt-4">
                <v-chip color="success" variant="tonal">
                  <v-icon left>mdi-check-circle</v-icon>
                  Sistema Operativo
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script>
import BarChart from '../components/chart/BarChart.vue'
import PieChart from '../components/chart/PieChart.vue'
import { createSwapy } from 'swapy'
import { onMounted, onUnmounted, ref } from 'vue'

export default {
  name: 'Dashboard',
  components: {
    BarChart,
    PieChart
  },
  setup() {
    const swapy = ref(null)
    const container = ref()

    onMounted(() => {
      // Si el contenedor está cargado
      if (container.value) {
        swapy.value = createSwapy(container.value, {
          animation: 'dynamic', // Animación spring más suave y profesional
          enabled: true,
          swapMode: 'hover', // Intercambio al hacer hover
          autoScrollOnDrag: true, // Auto-scroll durante el arrastre
          dragOnHold: false, // Arrastre inmediato
          dragAxis: 'both' // Arrastre en ambas direcciones
        })

        // Event listeners
        swapy.value.onSwap(event => {
          console.log('🔄 Elementos intercambiados:', event)
        })

        swapy.value.onSwapStart(event => {
          console.log('🚀 Inicio de drag:', event)
        })

        swapy.value.onSwapEnd(event => {
          console.log('✅ Fin de drag:', event)
        })
      }
    })

    onUnmounted(() => {
      // Destruir la instancia de Swapy al desmontar el componente
      swapy.value?.destroy()
    })

    return {
      swapy,
      container
    }
  },
  data() {
    return {
      estadisticas: {
        totalClientes: 156,
        facturasMes: 89,
        ingresosMes: 1250000,
        documentos: 2341
      },
      chartData: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Ingresos',
            data: [1200000, 1350000, 1100000, 1450000, 1300000, 1250000],
            backgroundColor: 'rgba(25, 118, 210, 0.8)',
            borderColor: '#1976D2',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Egresos',
            data: [800000, 900000, 750000, 950000, 850000, 800000],
            backgroundColor: 'rgba(255, 82, 82, 0.8)',
            borderColor: '#FF5252',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          }
        ]
      },
      chartOptions: {
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
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString()
              }
            }
          }
        }
      },
      pieChartData: {
        labels: ['Nómina', 'Servicios', 'Equipos', 'Marketing', 'Otros'],
        datasets: [{
          data: [40, 25, 15, 12, 8],
          backgroundColor: [
            '#1976D2',
            '#FF5252',
            '#FFC107',
            '#4CAF50',
            '#9E9E9E'
          ],
          borderWidth: 2,
          borderColor: '#FFFFFF'
        }]
      },
      pieChartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                family: 'Poppins, sans-serif',
                size: 11
              }
            }
          }
        }
      },
      actividadesRecientes: [
        {
          id: 1,
          descripcion: 'Nueva factura creada para Cliente ABC',
          fecha: 'Hace 2 horas',
          icono: 'mdi-receipt'
        },
        {
          id: 2,
          descripcion: 'Cliente XYZ actualizado',
          fecha: 'Hace 4 horas',
          icono: 'mdi-account-edit'
        },
        {
          id: 3,
          descripcion: 'Documento subido al archivo',
          fecha: 'Ayer',
          icono: 'mdi-file-upload'
        },
        {
          id: 4,
          descripcion: 'Reporte de auditoría generado',
          fecha: 'Ayer',
          icono: 'mdi-file-chart'
        }
      ]
    }
  }
}
</script>

<style scoped>
.v-card {
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-2px);
}

.v-progress-linear {
  border-radius: 4px;
}

/* Estilos específicos para las tarjetas de estadísticas */
.stats-card {
  border-radius: 20px !important;
  box-shadow: none !important;
  padding: 20px !important;
}

.stats-card .d-flex {
  text-align: left;
  align-items: flex-start;
}

.stats-card .text-body-2 {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.25;
}

.stats-card .text-h4 {
  font-size: 2rem;
  font-weight: 300;
  line-height: 1.2;
}

/* Estilos para el contenedor de drag & drop */
.dashboard-drag-container {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
  margin-bottom: 24px;
  max-width: 100%;
}

/* Estilos para los slots del dashboard */
.dashboard-slot {
  min-height: 400px;
  width: 100%;
}


/* Responsive grid */
@media (max-width: 960px) {
  .dashboard-drag-container {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto auto;
    gap: 16px;
  }
}

/* Asegurar que las cards no se salgan del contenedor */
.dashboard-slot .v-card {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

/* Asegurar que los border-radius se mantengan durante el drag */
[data-swapy-item][data-swapy-dragging] .v-card {
  border-radius: 20px !important;
}

[data-swapy-item][data-swapy-dragging] {
  border-radius: 20px !important;
}

[data-swapy-slot] {
  border-radius: 20px !important;
}

[data-swapy-slot] .v-card {
  border-radius: 20px !important;
}

/* Estilo para elemento siendo arrastrado */
[data-swapy-item][data-swapy-dragging] {
  opacity: 0.6 !important;
  transition: opacity 0.2s ease;
}

/* Estilo para slot destacado */
[data-swapy-slot][data-swapy-highlighted] {
  background: rgba(255, 255, 255, 0.2);
  transition: background 0.2s ease;
}


</style>
