<template>
  <v-container fluid class="pa-4">
    <!-- Tarjetas de estadísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #02254d;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Mis Facturas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="estadisticas.totalFacturas"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
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
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="estadisticas.facturasMes"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
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
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              $<AnimatedNumber
                :value="estadisticas.ingresosMes"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="2"
                :maximum-fraction-digits="2"
              />
            </div>
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
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="estadisticas.documentos"
                :start="0"
                :duration="900"
                :adaptive="false"
                :min-duration="300"
                :max-duration="1000"
                easing="easeOutQuint"
                locale="es-VE"
                :minimum-fraction-digits="0"
                :maximum-fraction-digits="0"
              />
            </div>
          </div>
        </v-card>
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
                :height="300"
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
                :height="300"
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
            <v-card-text class="pa-3">
              <v-list density="compact" class="pa-0">
                <v-list-item
                  v-for="actividad in actividadesRecientes.slice(0, 2)"
                  :key="actividad.id"
                  :prepend-icon="actividad.icono"
                  class="px-0 py-1"
                  min-height="32"
                >
                  <v-list-item-title class="text-caption">{{ actividad.descripcion }}</v-list-item-title>
                  <v-list-item-subtitle class="text-caption">{{ actividad.fecha }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
              <div v-if="actividadesRecientes.length > 2" class="text-center mt-1">
                <v-chip size="x-small" color="primary" variant="tonal">
                  +{{ actividadesRecientes.length - 2 }} más
                </v-chip>
              </div>
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
                  <span>Documentos</span>
                  <span>{{ estadisticas.documentos }}</span>
                </div>
                <v-progress-linear
                  color="primary"
                  height="8"
                  :model-value="Math.min((estadisticas.documentos / 100) * 100, 100)"
                  rounded
                ></v-progress-linear>
              </div>
              
              <div class="mb-3">
                <div class="d-flex justify-space-between">
                  <span>Facturas</span>
                  <span>{{ estadisticas.totalFacturas }}</span>
                </div>
                <v-progress-linear
                  color="success"
                  height="8"
                  :model-value="Math.min((estadisticas.totalFacturas / 50) * 100, 100)"
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

      <!-- Nueva Card - Reportes -->
      <div data-swapy-slot="reportes" class="dashboard-slot">
        <div data-swapy-item="reportes">
          <v-card>
            <v-card-title>
              <v-icon left>mdi-file-document-multiple</v-icon>
              Reportes Generados
            </v-card-title>
            <v-card-text>
              <div class="mb-3">
                <div class="d-flex justify-space-between align-center">
                  <span>Facturas Totales</span>
                  <v-chip color="primary" size="small">{{ estadisticas.totalFacturas }}</v-chip>
                </div>
              </div>
              
              <div class="mb-3">
                <div class="d-flex justify-space-between align-center">
                  <span>Este Mes</span>
                  <v-chip color="success" size="small">{{ estadisticas.facturasMes }}</v-chip>
                </div>
              </div>

              <div class="mb-3">
                <div class="d-flex justify-space-between align-center">
                  <span>Documentos</span>
                  <v-chip color="info" size="small">{{ estadisticas.documentos }}</v-chip>
                </div>
              </div>

              <div class="text-center mt-4">
                <v-btn color="primary" variant="tonal" size="small">
                  <v-icon left>mdi-plus</v-icon>
                  Nuevo Reporte
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script>
import BarChart from '@/components/chart/BarChart.vue'
import PieChart from '@/components/chart/PieChart.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { createSwapy } from 'swapy'
import { onMounted, onUnmounted, ref } from 'vue'
import userService from '@/services/userService.js'

export default {
  name: 'ClienteDashboard',
  components: {
    BarChart,
    PieChart,
    AnimatedNumber
  },
  setup() {
    const swapy = ref(null)
    const container = ref()

    onMounted(() => {
      if (container.value) {
        swapy.value = createSwapy(container.value, {
          animation: 'dynamic',
          enabled: true,
          swapMode: 'hover',
          autoScrollOnDrag: true,
          dragOnHold: false,
          dragAxis: 'both'
        })

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
      swapy.value?.destroy()
    })

    return {
      swapy,
      container
    }
  },
  async mounted() {
    await this.cargarEstadisticas()
    await this.cargarDatosGraficas()
    await this.cargarActividadesRecientes()
  },
  methods: {
    async cargarEstadisticas() {
      try {
        console.log('🔄 Cargando estadísticas del dashboard del cliente...')
        
        // Obtener usuario actual
        const currentUser = await userService.getCurrentUser()
        if (!currentUser || !currentUser.client_id) {
          console.warn('⚠️ No hay client_id disponible')
          return
        }

        const clientId = currentUser.client_id
        
        // Cargar estadísticas de facturas (VENTA y COMPRA)
        const invoiceServiceModule = (await import('@/services/invoiceService')).default
        const ventas = await invoiceServiceModule.getInvoices({ flow: 'VENTA', clientId })
        const compras = await invoiceServiceModule.getInvoices({ flow: 'COMPRA', clientId })
        
        // Calcular estadísticas de facturas
        const todasLasFacturas = [...(ventas || []), ...(compras || [])]
        const facturasEsteMes = todasLasFacturas.filter(inv => {
          const fecha = new Date(inv.issueDate || inv.createdAt)
          const ahora = new Date()
          return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear()
        })
        
        const ingresosEsteMes = facturasEsteMes.reduce((sum, inv) => {
          const monto = parseFloat(inv?.financial?.totalSales || 0)
          return sum + (isNaN(monto) ? 0 : monto)
        }, 0)
        
        // Cargar estadísticas de documentos
        const documentServiceModule = (await import('@/services/documentService')).default
        const documentos = await documentServiceModule.getDocuments()
        
        // Actualizar estadísticas
        this.estadisticas = {
          totalFacturas: todasLasFacturas.length,
          facturasMes: facturasEsteMes.length,
          ingresosMes: ingresosEsteMes,
          documentos: documentos?.length || 0
        }
        
        console.log('✅ Estadísticas cargadas:', this.estadisticas)
        
      } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error)
      }
    },
    async cargarDatosGraficas() {
      try {
        console.log('🔄 Cargando datos para gráficas del cliente...')
        
        const currentUser = await userService.getCurrentUser()
        if (!currentUser || !currentUser.client_id) {
          return
        }
        
        const clientId = currentUser.client_id
        const invoiceServiceModule = (await import('@/services/invoiceService')).default
        
        // Obtener todas las facturas de los últimos 6 meses
        const ventas = await invoiceServiceModule.getInvoices({ flow: 'VENTA', clientId })
        const compras = await invoiceServiceModule.getInvoices({ flow: 'COMPRA', clientId })
        
        // Calcular datos por mes (últimos 6 meses)
        const ahora = new Date()
        const meses = []
        const ingresosPorMes = []
        const egresosPorMes = []
        
        for (let i = 5; i >= 0; i--) {
          const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
          const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short' })
          meses.push(mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1))
          
          // Filtrar facturas del mes
          const ventasMes = ventas.filter(inv => {
            const fechaInv = new Date(inv.issueDate || inv.createdAt)
            return fechaInv.getMonth() === fecha.getMonth() && 
                   fechaInv.getFullYear() === fecha.getFullYear()
          })
          
          const comprasMes = compras.filter(inv => {
            const fechaInv = new Date(inv.issueDate || inv.createdAt)
            return fechaInv.getMonth() === fecha.getMonth() && 
                   fechaInv.getFullYear() === fecha.getFullYear()
          })
          
          // Calcular totales
          const ingresos = ventasMes.reduce((sum, inv) => {
            return sum + (parseFloat(inv.financial?.totalSales || 0))
          }, 0)
          
          const egresos = comprasMes.reduce((sum, inv) => {
            return sum + (parseFloat(inv.financial?.totalSales || 0))
          }, 0)
          
          ingresosPorMes.push(ingresos)
          egresosPorMes.push(egresos)
        }
        
        // Actualizar gráfica de barras
        this.chartData = {
          labels: meses,
          datasets: [
            {
              label: 'Ingresos',
              data: ingresosPorMes,
              backgroundColor: 'rgba(25, 118, 210, 0.8)',
              borderColor: '#1976D2',
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false,
            },
            {
              label: 'Egresos',
              data: egresosPorMes,
              backgroundColor: 'rgba(255, 82, 82, 0.8)',
              borderColor: '#FF5252',
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false,
            }
          ]
        }
        
        // Calcular distribución de gastos (por tipo de factura COMPRA)
        const categoriasGastos = {}
        compras.forEach(inv => {
          const categoria = inv.items?.[0]?.description || 'Otros'
          const monto = parseFloat(inv.financial?.totalSales || 0)
          categoriasGastos[categoria] = (categoriasGastos[categoria] || 0) + monto
        })
        
        // Ordenar y tomar las 5 categorías principales
        const categoriasOrdenadas = Object.entries(categoriasGastos)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
        
        const labelsGastos = categoriasOrdenadas.map(([cat]) => cat)
        const datosGastos = categoriasOrdenadas.map(([, monto]) => monto)
        
        // Si no hay datos, usar valores por defecto vacíos
        if (labelsGastos.length === 0) {
          labelsGastos.push('Sin datos')
          datosGastos.push(0)
        }
        
        // Actualizar gráfica de pastel
        this.pieChartData = {
          labels: labelsGastos,
          datasets: [{
            data: datosGastos,
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
        }
        
        console.log('✅ Datos de gráficas cargados')
        
      } catch (error) {
        console.error('❌ Error al cargar datos de gráficas:', error)
      }
    },
    async cargarActividadesRecientes() {
      try {
        console.log('🔄 Cargando actividades recientes del cliente...')
        
        const currentUser = await userService.getCurrentUser()
        if (!currentUser || !currentUser.client_id) {
          return
        }
        
        const clientId = currentUser.client_id
        const invoiceServiceModule = (await import('@/services/invoiceService')).default
        const documentServiceModule = (await import('@/services/documentService')).default
        
        // Obtener facturas recientes
        const facturas = await invoiceServiceModule.getInvoices({ flow: 'VENTA', clientId })
        
        // Obtener documentos recientes
        const documentos = await documentServiceModule.getDocuments()
        
        // Combinar facturas y documentos con fechas originales para ordenar
        const todasLasActividades = [
          ...facturas.map(inv => ({
            id: inv.id,
            descripcion: `Nueva factura ${inv.invoiceNumber} creada`,
            fecha: new Date(inv.createdAt || inv.issueDate),
            fechaFormateada: this.formatearFechaRelativa(new Date(inv.createdAt || inv.issueDate)),
            icono: 'mdi-receipt'
          })),
          ...documentos.map(doc => ({
            id: doc.id,
            descripcion: `Documento ${doc.fileName} subido`,
            fecha: new Date(doc.createdAt),
            fechaFormateada: this.formatearFechaRelativa(new Date(doc.createdAt)),
            icono: 'mdi-file-upload'
          }))
        ]
        
        // Ordenar por fecha (más reciente primero) y tomar las 4 más recientes
        this.actividadesRecientes = todasLasActividades
          .sort((a, b) => b.fecha - a.fecha)
          .slice(0, 4)
          .map(act => ({
            id: act.id,
            descripcion: act.descripcion,
            fecha: act.fechaFormateada,
            icono: act.icono
          }))
        
        console.log('✅ Actividades recientes cargadas:', this.actividadesRecientes.length)
        
      } catch (error) {
        console.error('❌ Error al cargar actividades recientes:', error)
        this.actividadesRecientes = []
      }
    },
    formatearFechaRelativa(fecha) {
      const ahora = new Date()
      const diffMs = ahora - fecha
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      
      if (diffMins < 60) {
        return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
      } else if (diffHours < 24) {
        return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
      } else if (diffDays === 1) {
        return 'Ayer'
      } else if (diffDays < 7) {
        return `Hace ${diffDays} días`
      } else {
        return fecha.toLocaleDateString('es-ES')
      }
    }
  },
  data() {
    return {
      estadisticas: {
        totalFacturas: 0,
        facturasMes: 0,
        ingresosMes: 0,
        documentos: 0
      },
      chartData: {
        labels: [],
        datasets: [
          {
            label: 'Ingresos',
            data: [],
            backgroundColor: 'rgba(25, 118, 210, 0.8)',
            borderColor: '#1976D2',
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Egresos',
            data: [],
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
        labels: [],
        datasets: [{
          data: [],
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
      actividadesRecientes: []
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

.dashboard-drag-container {
  position: relative;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  grid-template-rows: 400px 400px;
  gap: 24px;
  margin-bottom: 24px;
  max-width: 100%;
}

.dashboard-drag-container > :nth-child(1) {
  grid-column: 1 / 3;
  grid-row: 1 / 2;
}

.dashboard-drag-container > :nth-child(2) {
  grid-column: 3 / 4;
  grid-row: 1 / 2;
}

.dashboard-drag-container > :nth-child(3) {
  grid-column: 4 / 5;
  grid-row: 1 / 2;
}

.dashboard-drag-container > :nth-child(4) {
  grid-column: 1 / 3;
  grid-row: 2 / 3;
}

.dashboard-drag-container > :nth-child(5) {
  grid-column: 3 / 5;
  grid-row: 2 / 3;
}

.dashboard-slot {
  height: 100%;
  width: 100%;
  min-width: 100%;
  display: flex;
  flex: 1;
}

.dashboard-slot .v-card {
  height: 100%;
  width: 100%;
  min-width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.dashboard-slot .v-card .v-card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  min-height: 0;
}

.dashboard-slot .v-card .v-card-title {
  flex-shrink: 0;
  width: 100%;
}

@media (max-width: 960px) {
  .dashboard-drag-container {
    grid-template-columns: 1fr;
    grid-template-rows: 400px 400px 400px 400px;
    gap: 16px;
  }
  
  .dashboard-drag-container > :nth-child(4),
  .dashboard-drag-container > :nth-child(5) {
    grid-column: span 1;
  }
}

.dashboard-slot .v-card {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 100% !important;
  box-sizing: border-box;
  flex: 1;
}

.dashboard-slot {
  width: 100% !important;
  min-width: 100% !important;
  flex: 1;
}

.dashboard-slot > div {
  width: 100% !important;
  min-width: 100% !important;
  flex: 1;
}

[data-swapy-item] {
  transition: opacity 0.2s ease;
}

[data-swapy-item][data-swapy-dragging] .v-card {
  border-radius: 20px !important;
}

[data-swapy-item][data-swapy-dragging] {
  border-radius: 20px !important;
}

[data-swapy-slot] {
  border-radius: 20px !important;
  transition: background 0.2s ease;
}

[data-swapy-slot] .v-card {
  border-radius: 20px !important;
}

[data-swapy-item][data-swapy-dragging] {
  opacity: 0.6 !important;
  transition: opacity 0.2s ease;
}

[data-swapy-slot][data-swapy-highlighted] {
  background: rgba(128, 128, 128, 0.1);
  transition: background 0.2s ease;
}
</style>

