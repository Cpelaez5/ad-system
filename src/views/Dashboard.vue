<template>
  <v-container fluid class="pa-4">
    <!-- Título de la página -->
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold text-primary">
          <v-icon left size="large">mdi-view-dashboard</v-icon>
          Dashboard
        </h1>
        <p class="text-subtitle-1 text-grey-darken-1 mt-2">
          Resumen general del sistema contable
        </p>
      </v-col>
    </v-row>

    <!-- Tarjetas de estadísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card
          color="primary"
          variant="tonal"
          class="pa-4"
          height="120"
        >
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-account-group</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ estadisticas.totalClientes }}</div>
              <div class="text-body-2">Clientes Activos</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          color="success"
          variant="tonal"
          class="pa-4"
          height="120"
        >
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-receipt</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ estadisticas.facturasMes }}</div>
              <div class="text-body-2">Facturas Este Mes</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          color="info"
          variant="tonal"
          class="pa-4"
          height="120"
        >
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-currency-usd</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">${{ estadisticas.ingresosMes.toLocaleString() }}</div>
              <div class="text-body-2">Ingresos Este Mes</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card
          color="warning"
          variant="tonal"
          class="pa-4"
          height="120"
        >
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-file-document-multiple</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ estadisticas.documentos }}</div>
              <div class="text-body-2">Documentos Archivados</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Accesos rápidos -->
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

    <!-- Gráficos y análisis -->
    <v-row class="mb-6">
      <v-col cols="12" md="8">
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
      </v-col>

      <v-col cols="12" md="4">
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
      </v-col>
    </v-row>

    <!-- Actividad reciente -->
    <v-row>
      <v-col cols="12" md="8">
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
      </v-col>

      <v-col cols="12" md="4">
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
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import BarChart from '../components/chart/BarChart.vue'
import PieChart from '../components/chart/PieChart.vue'

export default {
  name: 'Dashboard',
  components: {
    BarChart,
    PieChart
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
</style>
