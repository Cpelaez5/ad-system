<template>
  <v-container fluid class="dashboard-ejecutivo pa-4 pa-md-6">

    <!-- ═══════════════════════════════════════════════ -->
    <!-- SKELETON LOADING                                -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-if="loading">
      <!-- Skeleton header -->
      <div class="mb-6">
        <v-skeleton-loader type="heading" width="320" class="mb-2" />
        <v-skeleton-loader type="text" width="420" />
      </div>
      <!-- Skeleton KPIs -->
      <v-row class="mb-6">
        <v-col v-for="n in 4" :key="'kpi-sk-' + n" cols="12" sm="6" lg="3">
          <v-skeleton-loader type="card" height="150" class="rounded-xl" />
        </v-col>
      </v-row>
      <!-- Skeleton gráficos -->
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <v-skeleton-loader type="image" height="380" class="rounded-xl" />
        </v-col>
        <v-col cols="12" md="4">
          <v-skeleton-loader type="image" height="380" class="rounded-xl" />
        </v-col>
      </v-row>
      <!-- Skeleton grilla inferior -->
      <v-row>
        <v-col v-for="n in 4" :key="'grid-sk-' + n" cols="12" md="6">
          <v-skeleton-loader type="card" height="260" class="rounded-xl" />
        </v-col>
      </v-row>
    </template>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- CONTENIDO PRINCIPAL                             -->
    <!-- ═══════════════════════════════════════════════ -->
    <template v-else>

      <!-- ─── HEADER EJECUTIVO ─── -->
      <div class="dashboard-header mb-6 animate-section" style="animation-delay: 0s">
        <v-row align="center" no-gutters>
          <!-- Saludo + empresa + fecha -->
          <v-col cols="12" md="6">
            <h1 class="dashboard-greeting">{{ saludo }}, {{ nombreUsuario }}</h1>
            <p class="dashboard-subtitle">
              {{ nombreEmpresa }}
              <span v-if="nombreEmpresa"> &middot; </span>
              {{ fechaFormateada }}
            </p>
          </v-col>

          <!-- Controles: BCV + Moneda + Filtro -->
          <v-col cols="12" md="6" class="d-flex align-center justify-md-end flex-wrap ga-3 mt-3 mt-md-0">

            <!-- Toggle moneda USD / VES -->
            <v-btn-toggle
              v-model="monedaActual"
              mandatory
              density="compact"
              variant="outlined"
              divided
              color="#1F355C"
              class="moneda-toggle"
            >
              <v-btn value="USD" size="small">USD</v-btn>
              <v-btn value="VES" size="small">VES</v-btn>
            </v-btn-toggle>

            <!-- Filtro de período -->
            <v-select
              v-model="periodoSeleccionado"
              :items="opcionesPeriodo"
              variant="outlined"
              density="compact"
              hide-details
              class="filtro-periodo"
              prepend-inner-icon="mdi-calendar-range"
            />
          </v-col>
        </v-row>
      </div>

      <!-- ─── KPI CARDS ─── -->
      <v-row class="mb-6">
        <v-col
          v-for="(kpi, index) in kpisCalculados"
          :key="kpi.key"
          cols="12"
          sm="6"
          lg="3"
          class="animate-section"
          :style="{ animationDelay: `${0.1 + index * 0.08}s` }"
        >
          <div class="kpi-wrapper">
            <!-- Card con toggle de moneda -->
            <CurrencyStatsCard
              v-if="kpi.showToggle"
              :title="kpi.titulo"
              :value="kpi.valor"
              :currency-symbol="kpi.simbolo"
              :bg-color="kpi.bgColor"
              :text-color="kpi.textColor"
              @toggle-currency="toggleMoneda"
            />
            <!-- Card de estadísticas simple -->
            <StatsCard
              v-else
              :title="kpi.titulo"
              :value="kpi.valor"
              :bg-color="kpi.bgColor"
              :text-color="kpi.textColor"
              :is-currency="kpi.esMonto"
              :currency-symbol="kpi.simbolo"
            />
            <!-- Indicador de variación porcentual vs período anterior -->
            <div
              v-if="kpi.variacion !== null && periodoSeleccionado !== 'todo'"
              class="kpi-variacion mt-2"
            >
              <v-chip
                size="x-small"
                :color="kpi.variacion >= 0 ? 'success' : 'error'"
                variant="tonal"
                label
              >
                <v-icon start size="12">
                  {{ kpi.variacion >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                </v-icon>
                {{ kpi.variacion >= 0 ? '+' : '' }}{{ kpi.variacion.toFixed(1) }}%
              </v-chip>
              <span class="variacion-label">vs anterior</span>
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- ─── GRÁFICOS PRINCIPALES ─── -->
      <v-row class="mb-6">
        <!-- Gráfico de evolución: Ingresos vs Egresos + Línea de Margen -->
        <v-col cols="12" md="8" class="animate-section" style="animation-delay: 0.4s">
          <v-card class="dashboard-card chart-card">
            <v-card-title class="card-title-row">
              <v-icon class="mr-2" color="#1F355C" size="20">mdi-chart-timeline-variant-shimmer</v-icon>
              <span>Evolución de Rendimiento</span>
            </v-card-title>
            <v-card-text class="pt-0 chart-body">
              <BarChart
                v-if="chartEvolucionData.labels.length > 0"
                :key="'bar-' + chartKey"
                :data="chartEvolucionData"
                :options="chartEvolucionOptions"
                :height="340"
              />
              <div v-else class="empty-state">
                <v-icon size="56" color="#ccc">mdi-chart-bar</v-icon>
                <p class="mt-3">Aún no hay datos de facturación</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Gráfico de distribución de gastos (Pie) -->
        <v-col cols="12" md="4" class="animate-section" style="animation-delay: 0.5s">
          <v-card class="dashboard-card chart-card">
            <v-card-title class="card-title-row">
              <v-icon class="mr-2" color="#E0B04F" size="20">mdi-chart-donut</v-icon>
              <span>Distribución de Gastos</span>
            </v-card-title>
            <v-card-text class="pt-0 chart-body">
              <PieChart
                v-if="chartGastosData.labels && chartGastosData.labels.length > 0"
                :key="'pie-' + chartKey"
                :data="chartGastosData"
                :options="chartGastosOptions"
                :height="300"
              />
              <div v-else class="empty-state">
                <v-icon size="56" color="#ccc">mdi-chart-pie</v-icon>
                <p class="mt-3">Sin datos de compras en este período</p>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ─── SECCIÓN INFERIOR: SWAPY GRID ─── -->
      <div ref="swapyContainer" class="swapy-grid">

        <!-- SLOT: Insights Automáticos -->
        <div data-swapy-slot="insights" class="swapy-slot animate-section" style="animation-delay: 0.6s">
          <div data-swapy-item="insights">
            <v-card class="dashboard-card full-height">
              <v-card-title class="card-title-row" data-swapy-handle>
                <v-icon class="mr-2" color="#A81C22" size="20">mdi-lightbulb-on-outline</v-icon>
                <span>Insights</span>
                <v-spacer />
                <v-icon size="18" color="#bbb" class="drag-handle-icon">mdi-drag</v-icon>
              </v-card-title>
              <v-card-text>
                <!-- Sin insights -->
                <div v-if="insightsCalculados.length === 0" class="empty-state compact">
                  <v-icon size="40" color="#ccc">mdi-robot-happy-outline</v-icon>
                  <p class="mt-2">¡Todo se ve bien! Sin alertas por ahora.</p>
                </div>
                <!-- Lista de insights -->
                <div v-else class="insights-list">
                  <div
                    v-for="(insight, i) in insightsCalculados"
                    :key="'insight-' + i"
                    class="insight-item"
                    :class="{ 'clickable': !!insight.action }"
                    @click="insight.action ? $router.push(insight.action.path) : null"
                  >
                    <div class="insight-icon" :style="{ backgroundColor: insight.color + '15' }">
                      <v-icon :color="insight.color" size="20">{{ insight.icon }}</v-icon>
                    </div>
                    <div class="insight-content">
                      <p class="insight-text">{{ insight.text }}</p>
                      <v-chip
                        v-if="insight.action"
                        size="x-small"
                        variant="text"
                        :color="insight.color"
                        class="insight-link pa-0 mt-1"
                      >
                        {{ insight.action.label }} →
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>

        <!-- SLOT: Actividad Reciente -->
        <div data-swapy-slot="actividad" class="swapy-slot animate-section" style="animation-delay: 0.7s">
          <div data-swapy-item="actividad">
            <v-card class="dashboard-card full-height">
              <v-card-title class="card-title-row" data-swapy-handle>
                <v-icon class="mr-2" color="#1F355C" size="20">mdi-history</v-icon>
                <span>Actividad Reciente</span>
                <v-spacer />
                <v-icon size="18" color="#bbb" class="drag-handle-icon">mdi-drag</v-icon>
              </v-card-title>
              <v-card-text>
                <!-- Sin actividad -->
                <div v-if="actividadesRecientes.length === 0" class="empty-state compact">
                  <v-icon size="40" color="#ccc">mdi-clock-outline</v-icon>
                  <p class="mt-2">Sin actividad reciente</p>
                </div>
                <!-- Timeline de actividad -->
                <div v-else class="activity-timeline">
                  <div
                    v-for="act in actividadesRecientes"
                    :key="act.id"
                    class="activity-item"
                  >
                    <div class="activity-dot" :style="{ backgroundColor: act.color }"></div>
                    <div class="activity-body">
                      <p class="activity-desc">{{ act.descripcion }}</p>
                      <span class="activity-time">{{ act.fecha }}</span>
                    </div>
                    <v-icon size="16" color="#bbb">{{ act.icono }}</v-icon>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>

        <!-- SLOT: Top Productos -->
        <div data-swapy-slot="top-productos" class="swapy-slot animate-section" style="animation-delay: 0.8s">
          <div data-swapy-item="top-productos">
            <v-card class="dashboard-card full-height">
              <v-card-title class="card-title-row" data-swapy-handle>
                <v-icon class="mr-2" color="#f2b648" size="20">mdi-trophy-outline</v-icon>
                <span>Top Productos</span>
                <v-spacer />
                <v-icon size="18" color="#bbb" class="drag-handle-icon">mdi-drag</v-icon>
              </v-card-title>
              <v-card-text>
                <!-- Sin productos -->
                <div v-if="topProducts.length === 0" class="empty-state compact">
                  <v-icon size="40" color="#ccc">mdi-package-variant</v-icon>
                  <p class="mt-2">Sin datos de productos vendidos</p>
                </div>
                <!-- Ranking de productos -->
                <div v-else class="top-products-list">
                  <div
                    v-for="(prod, i) in topProducts.slice(0, 5)"
                    :key="'prod-' + i"
                    class="product-rank-item"
                  >
                    <div class="rank-badge" :class="'rank-' + (i + 1)">{{ i + 1 }}</div>
                    <div class="product-info">
                      <p class="product-name">{{ prod.name || prod.product_name || 'Producto' }}</p>
                      <p class="product-stats">
                        {{ prod.total_sold || prod.totalSold || 0 }}
                        {{ prod.unit || 'uds' }} vendidos
                      </p>
                    </div>
                    <div class="product-revenue">
                      ${{ formatMonto(prod.total_revenue || prod.totalRevenue || 0) }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>

        <!-- SLOT: Estado Fiscal -->
        <div data-swapy-slot="fiscal" class="swapy-slot animate-section" style="animation-delay: 0.9s">
          <div data-swapy-item="fiscal">
            <v-card class="dashboard-card full-height">
              <v-card-title class="card-title-row justify-space-between" data-swapy-handle>
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="#A81C22" size="20">mdi-shield-check-outline</v-icon>
                  <span>Expediente Fiscal</span>
                </div>
                <div class="d-flex align-center gap-2">
                  <v-btn
                    variant="text"
                    size="small"
                    color="#1F355C"
                    @click="$router.push('/cliente/fiscal-360')"
                  >
                    Ver todo
                  </v-btn>
                  <v-icon size="18" color="#bbb" class="drag-handle-icon">mdi-drag</v-icon>
                </div>
              </v-card-title>
              <v-card-text>
                <!-- Tres mini KPIs fiscales -->
                <v-row dense class="mb-3">
                  <v-col cols="4" class="text-center">
                    <div class="fiscal-stat">
                      <div class="fiscal-number text-success">
                        <AnimatedNumber :value="fiscalStats.vigente" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
                      </div>
                      <div class="fiscal-label">Vigentes</div>
                    </div>
                  </v-col>
                  <v-col cols="4" class="text-center">
                    <div class="fiscal-stat">
                      <div class="fiscal-number text-warning">
                        <AnimatedNumber :value="fiscalStats.tramite" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
                      </div>
                      <div class="fiscal-label">En Trámite</div>
                    </div>
                  </v-col>
                  <v-col cols="4" class="text-center">
                    <div class="fiscal-stat">
                      <div class="fiscal-number text-error">
                        <AnimatedNumber :value="fiscalStats.porVencer" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
                      </div>
                      <div class="fiscal-label">Por Vencer</div>
                    </div>
                  </v-col>
                </v-row>

                <!-- Barra de progreso: estado general -->
                <div class="mt-2">
                  <div class="d-flex justify-space-between text-caption mb-1">
                    <span style="color: #888">Estado general</span>
                    <span style="color: #666; font-weight: 500">
                      {{ fiscalStats.vigente }}/{{ fiscalStats.total }} vigentes
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="fiscalStats.total > 0 ? (fiscalStats.vigente / fiscalStats.total * 100) : 0"
                    color="#4CAF50"
                    bg-color="#E8F5E9"
                    height="8"
                    rounded
                  />
                </div>

                <!-- Alerta de documentos vencidos -->
                <v-alert
                  v-if="fiscalStats.vencido > 0"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                  icon="mdi-alert-circle"
                >
                  {{ fiscalStats.vencido }} documento(s) vencido(s)
                </v-alert>
              </v-card-text>
            </v-card>
          </div>
        </div>

      </div><!-- /.swapy-grid -->

    </template>
  </v-container>
</template>

<script>
// ═══════════════════════════════════════════════════════════
// Dashboard Ejecutivo Premium — Cliente
// Consolida datos de ventas, compras, inventario, documentos,
// expediente fiscal y tasa BCV para ofrecer una visión 360°
// del rendimiento del negocio del cliente.
// ═══════════════════════════════════════════════════════════

// --- Componentes ---
import BarChart from '@/components/chart/BarChart.vue'
import PieChart from '@/components/chart/PieChart.vue'
import StatsCard from '@/components/common/StatsCard.vue'
import CurrencyStatsCard from '@/components/common/CurrencyStatsCard.vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

// --- Servicios ---
import invoiceService from '@/services/invoiceService'
import inventoryService from '@/services/inventoryService'
import documentService from '@/services/documentService'
import fiscalService from '@/services/fiscalService'
import bcvService from '@/services/bcvService'
import userService from '@/services/userService'
import preferencesService from '@/services/preferencesService'

// --- Swapy (Drag-to-Swap) ---
import { createSwapy } from 'swapy'

export default {
  name: 'ClienteDashboardEjecutivo',

  components: {
    BarChart,
    PieChart,
    StatsCard,
    CurrencyStatsCard,
    AnimatedNumber
  },

  data() {
    return {
      // Estado general
      loading: true,

      // Clave reactiva para forzar re-montaje de gráficos cuando llegan datos reales
      // (evita el problema de Vue proxies con Chart.js)
      chartKey: 0,

      // Usuario autenticado y su empresa
      usuario: null,
      clientId: null,

      // Filtro global de período
      periodoSeleccionado: 'este_mes',
      opcionesPeriodo: [
        { title: 'Este Mes', value: 'este_mes' },
        { title: 'Mes Anterior', value: 'mes_anterior' },
        { title: 'Último Trimestre', value: 'ultimo_trimestre' },
        { title: 'Este Año', value: 'este_ano' },
        { title: 'Todo', value: 'todo' }
      ],

      // Moneda de visualización activa
      monedaActual: 'USD',

      // ── Datos crudos (se cargan UNA vez, se filtran vía computed) ──
      ventas: [],
      compras: [],
      inventoryStats: {
        totalProducts: 0,
        totalValueCost: { VES: 0, USD: 0, EUR: 0 },
        totalValueSale: { VES: 0, USD: 0, EUR: 0 }
      },
      topProducts: [],
      lowStockProducts: [],
      documentos: [],
      fiscalStats: { total: 0, vigente: 0, tramite: 0, vencido: 0, porVencer: 0, trash: 0 },
      tasaBCV: null,

      // Swapy
      swapyInstance: null
    }
  },

  computed: {
    // ═══════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════

    /** Saludo dinámico según hora del día */
    saludo() {
      const hora = new Date().getHours()
      if (hora >= 5 && hora < 12) return 'Buenos días'
      if (hora >= 12 && hora < 18) return 'Buenas tardes'
      return 'Buenas noches'
    },

    /** Nombre del usuario para el saludo */
    nombreUsuario() {
      if (!this.usuario) return 'Usuario'
      return this.usuario.firstName || this.usuario.email?.split('@')[0] || 'Usuario'
    },

    /** Nombre de la empresa del cliente */
    nombreEmpresa() {
      return this.usuario?.client?.company_name || ''
    },

    /** Fecha formateada: "Domingo, 27 de abril de 2026" */
    fechaFormateada() {
      const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      const fecha = new Date().toLocaleDateString('es-ES', opciones)
      return fecha.charAt(0).toUpperCase() + fecha.slice(1)
    },

    // ═══════════════════════════════════════════
    // RANGOS DE FECHAS SEGÚN FILTRO
    // ═══════════════════════════════════════════

    /** Calcula rango actual y rango anterior para comparación */
    rangoFechas() {
      const ahora = new Date()
      let inicio, fin, inicioAnterior, finAnterior

      switch (this.periodoSeleccionado) {
        case 'este_mes':
          inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
          fin = ahora
          inicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
          finAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
          break
        case 'mes_anterior':
          inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
          fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0)
          inicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1)
          finAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 0)
          break
        case 'ultimo_trimestre':
          inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 1)
          fin = ahora
          inicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 6, 1)
          finAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 0)
          break
        case 'este_ano':
          inicio = new Date(ahora.getFullYear(), 0, 1)
          fin = ahora
          inicioAnterior = new Date(ahora.getFullYear() - 1, 0, 1)
          finAnterior = new Date(ahora.getFullYear() - 1, 11, 31)
          break
        case 'todo':
        default:
          inicio = new Date(2000, 0, 1)
          fin = ahora
          inicioAnterior = null
          finAnterior = null
          break
      }

      return { inicio, fin, inicioAnterior, finAnterior }
    },

    // ── Facturas filtradas por período actual y anterior ──
    ventasFiltradas() {
      return this.filtrarPorPeriodo(this.ventas, this.rangoFechas.inicio, this.rangoFechas.fin)
    },
    comprasFiltradas() {
      return this.filtrarPorPeriodo(this.compras, this.rangoFechas.inicio, this.rangoFechas.fin)
    },
    ventasAnterior() {
      if (!this.rangoFechas.inicioAnterior) return []
      return this.filtrarPorPeriodo(this.ventas, this.rangoFechas.inicioAnterior, this.rangoFechas.finAnterior)
    },
    comprasAnterior() {
      if (!this.rangoFechas.inicioAnterior) return []
      return this.filtrarPorPeriodo(this.compras, this.rangoFechas.inicioAnterior, this.rangoFechas.finAnterior)
    },

    // ═══════════════════════════════════════════
    // KPIs CALCULADOS
    // ═══════════════════════════════════════════

    totalIngresos() {
      return this.sumarMontos(this.ventasFiltradas)
    },
    totalEgresos() {
      return this.sumarMontos(this.comprasFiltradas)
    },
    margenNeto() {
      return this.totalIngresos - this.totalEgresos
    },
    margenPorcentaje() {
      if (this.totalIngresos === 0) return 0
      return (this.margenNeto / this.totalIngresos) * 100
    },
    valorInventario() {
      const stats = this.inventoryStats
      return stats.totalValueCost?.USD || stats.totalValueCost?.VES || 0
    },

    // ── Totales período anterior (para variación % ) ──
    totalIngresosAnterior() {
      return this.sumarMontos(this.ventasAnterior)
    },
    totalEgresosAnterior() {
      return this.sumarMontos(this.comprasAnterior)
    },
    margenNetoAnterior() {
      return this.totalIngresosAnterior - this.totalEgresosAnterior
    },

    // ── Variaciones porcentuales ──
    variacionIngresos() {
      return this.calcularVariacion(this.totalIngresos, this.totalIngresosAnterior)
    },
    variacionEgresos() {
      return this.calcularVariacion(this.totalEgresos, this.totalEgresosAnterior)
    },
    variacionMargen() {
      return this.calcularVariacion(this.margenNeto, this.margenNetoAnterior)
    },

    /** Factor de conversión USD → VES usando tasa BCV */
    factorConversion() {
      return this.tasaBCV?.dollar || 1
    },

    /**
     * Array de objetos KPI para renderizar las 4 cards.
     * Cada objeto incluye título, valor, color, símbolo y variación.
     */
    kpisCalculados() {
      const esVES = this.monedaActual === 'VES'
      const factor = esVES ? this.factorConversion : 1
      const simbolo = esVES ? 'Bs ' : '$'

      return [
        {
          key: 'ingresos',
          titulo: 'Ingresos del Período',
          valor: this.totalIngresos * factor,
          simbolo,
          bgColor: '#02254d',
          textColor: 'white',
          esMonto: true,
          showToggle: true,
          variacion: this.variacionIngresos
        },
        {
          key: 'egresos',
          titulo: 'Egresos del Período',
          valor: this.totalEgresos * factor,
          simbolo,
          bgColor: '#961112',
          textColor: 'white',
          esMonto: true,
          showToggle: true,
          variacion: this.variacionEgresos
        },
        {
          key: 'margen',
          titulo: 'Margen Neto',
          valor: this.margenNeto * factor,
          simbolo,
          bgColor: '#f2b648',
          textColor: '#1a1a1a',
          esMonto: true,
          showToggle: false,
          variacion: this.variacionMargen
        },
        {
          key: 'inventario',
          titulo: 'Valor Inventario',
          valor: this.valorInventario,
          simbolo: '$',
          bgColor: '#f0d29b',
          textColor: '#1a1a1a',
          esMonto: true,
          showToggle: false,
          variacion: null
        }
      ]
    },

    // ═══════════════════════════════════════════
    // GRÁFICO: Evolución de Rendimiento (Bar + Línea)
    // ═══════════════════════════════════════════

    /** Data para el gráfico de barras + línea de margen (últimos 6 meses) */
    chartEvolucionData() {
      const ahora = new Date()
      const meses = []
      const ingresosPorMes = []
      const egresosPorMes = []
      const margenPorMes = []

      // Calcular totales por cada uno de los últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
        const mesNombre = fecha.toLocaleDateString('es-ES', { month: 'short' })
        meses.push(mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1))

        const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59)

        const ventasMes = this.filtrarPorPeriodo(this.ventas, inicioMes, finMes)
        const comprasMes = this.filtrarPorPeriodo(this.compras, inicioMes, finMes)

        const ingresos = this.sumarMontos(ventasMes)
        const egresos = this.sumarMontos(comprasMes)

        ingresosPorMes.push(ingresos)
        egresosPorMes.push(egresos)
        margenPorMes.push(ingresos - egresos)
      }

      return {
        labels: meses,
        datasets: [
          {
            label: 'Ingresos',
            data: ingresosPorMes,
            backgroundColor: 'rgba(2, 37, 77, 0.85)',
            borderColor: '#02254d',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            order: 2
          },
          {
            label: 'Egresos',
            data: egresosPorMes,
            backgroundColor: 'rgba(150, 17, 18, 0.70)',
            borderColor: '#961112',
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false,
            order: 3
          },
          {
            type: 'line',
            label: 'Margen',
            data: margenPorMes,
            borderColor: '#f2b648',
            backgroundColor: 'rgba(242, 182, 72, 0.12)',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#f2b648',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.4,
            fill: true,
            order: 1
          }
        ]
      }
    },

    /** Opciones del gráfico de evolución */
    chartEvolucionOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: 'Montserrat, sans-serif', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(2, 37, 77, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#f2b648',
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleFont: { family: 'Montserrat' },
            bodyFont: { family: 'Montserrat' },
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y || 0
                return ` ${ctx.dataset.label}: $${val.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Montserrat', size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
            ticks: {
              font: { family: 'Montserrat', size: 11 },
              callback: (v) => '$' + v.toLocaleString()
            }
          }
        }
      }
    },

    // ═══════════════════════════════════════════
    // GRÁFICO: Distribución de Gastos (Pie)
    // ═══════════════════════════════════════════

    /** Data para gráfico pie: top 5 categorías de compras */
    chartGastosData() {
      // Agrupar compras filtradas por categoría (usar primer ítem o emisor)
      const categorias = {}
      this.comprasFiltradas.forEach(inv => {
        // Intentar obtener una categoría significativa
        const cat = inv.issuer?.name
          || inv.items?.[0]?.description
          || inv.client?.name
          || 'Otros'
        const monto = parseFloat(inv.financial?.totalSales) || 0
        categorias[cat] = (categorias[cat] || 0) + monto
      })

      // Ordenar por monto y tomar top 5
      const sorted = Object.entries(categorias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

      if (sorted.length === 0) return { labels: [], datasets: [] }

      const coloresPie = ['#02254d', '#961112', '#f2b648', '#1F355C', '#f0d29b']

      return {
        labels: sorted.map(([cat]) => cat.length > 30 ? cat.substring(0, 30) + '…' : cat),
        datasets: [{
          data: sorted.map(([, monto]) => monto),
          backgroundColor: coloresPie,
          borderWidth: 3,
          borderColor: '#FFFFFF',
          hoverBorderWidth: 4,
          hoverOffset: 6
        }]
      }
    },

    /** Opciones del gráfico pie */
    chartGastosOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: { family: 'Montserrat', size: 11 },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(2, 37, 77, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#f2b648',
            borderWidth: 1,
            cornerRadius: 12,
            titleFont: { family: 'Montserrat' },
            bodyFont: { family: 'Montserrat' },
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed || 0
                return ` $${val.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
              }
            }
          }
        }
      }
    },

    // ═══════════════════════════════════════════
    // INSIGHTS AUTOMÁTICOS
    // ═══════════════════════════════════════════

    /**
     * Motor de insights: genera observaciones automáticas
     * analizando la data actual. Máximo 5 insights.
     */
    insightsCalculados() {
      const items = []

      // 1. Crecimiento / caída de ventas
      if (this.variacionIngresos !== null && this.periodoSeleccionado !== 'todo') {
        if (this.variacionIngresos > 5) {
          items.push({
            icon: 'mdi-trending-up',
            color: '#4CAF50',
            text: `Tus ventas crecieron un ${this.variacionIngresos.toFixed(1)}% vs el período anterior`,
            action: { path: '/cliente/facturacion', label: 'Ver Ventas' }
          })
        } else if (this.variacionIngresos < -5) {
          items.push({
            icon: 'mdi-trending-down',
            color: '#FF9800',
            text: `Tus ventas cayeron un ${Math.abs(this.variacionIngresos).toFixed(1)}% vs el período anterior`,
            action: { path: '/cliente/facturacion', label: 'Ver Ventas' }
          })
        }
      }

      // 2. Productos con stock bajo
      if (this.lowStockProducts.length > 0) {
        items.push({
          icon: 'mdi-package-variant-closed-remove',
          color: '#F44336',
          text: `${this.lowStockProducts.length} producto(s) con stock bajo necesitan reposición`,
          action: { path: '/cliente/inventario', label: 'Ver Inventario' }
        })
      }

      // 3. Documentos fiscales por vencer
      if (this.fiscalStats.porVencer > 0) {
        items.push({
          icon: 'mdi-file-clock-outline',
          color: '#FF9800',
          text: `${this.fiscalStats.porVencer} documento(s) fiscal(es) vencen en los próximos 30 días`,
          action: { path: '/cliente/fiscal-360', label: 'Ver Expediente' }
        })
      }

      // 4. Documentos fiscales vencidos
      if (this.fiscalStats.vencido > 0) {
        items.push({
          icon: 'mdi-file-alert-outline',
          color: '#F44336',
          text: `${this.fiscalStats.vencido} documento(s) fiscal(es) vencidos. Renovar cuanto antes.`,
          action: { path: '/cliente/fiscal-360', label: 'Renovar' }
        })
      }

      // 5. Análisis de margen neto
      if (this.totalIngresos > 0) {
        const margen = this.margenPorcentaje.toFixed(1)
        if (this.margenPorcentaje > 30) {
          items.push({
            icon: 'mdi-chart-areaspline',
            color: '#4CAF50',
            text: `Tu margen neto es del ${margen}%. ¡Excelente rentabilidad!`,
            action: null
          })
        } else if (this.margenPorcentaje > 0) {
          items.push({
            icon: 'mdi-chart-areaspline',
            color: '#1F355C',
            text: `Tu margen neto es del ${margen}% en este período`,
            action: null
          })
        } else {
          items.push({
            icon: 'mdi-alert-outline',
            color: '#F44336',
            text: `Margen negativo (${margen}%). Los egresos superan los ingresos.`,
            action: null
          })
        }
      }

      // 6. Resumen de facturas emitidas
      if (this.ventasFiltradas.length > 0) {
        items.push({
          icon: 'mdi-receipt-text-outline',
          color: '#1F355C',
          text: `${this.ventasFiltradas.length} factura(s) de venta por $${this.formatMonto(this.totalIngresos)} en este período`,
          action: { path: '/cliente/facturacion', label: 'Ver Facturas' }
        })
      }

      return items.slice(0, 5)
    },

    // ═══════════════════════════════════════════
    // ACTIVIDAD RECIENTE
    // ═══════════════════════════════════════════

    /** Últimas 5 actividades ordenadas por fecha descendente */
    actividadesRecientes() {
      const actividades = []

      // Ventas recientes (máx 3)
      this.ventas.slice(0, 3).forEach(inv => {
        actividades.push({
          id: 'v-' + inv.id,
          descripcion: `Factura ${inv.invoiceNumber || 'S/N'} emitida`,
          fecha: this.formatearFechaRelativa(new Date(inv.createdAt || inv.issueDate)),
          fechaRaw: new Date(inv.createdAt || inv.issueDate),
          icono: 'mdi-receipt-text-outline',
          color: '#02254d'
        })
      })

      // Compras recientes (máx 2)
      this.compras.slice(0, 2).forEach(inv => {
        actividades.push({
          id: 'c-' + inv.id,
          descripcion: `Compra ${inv.invoiceNumber || 'S/N'} registrada`,
          fecha: this.formatearFechaRelativa(new Date(inv.createdAt || inv.issueDate)),
          fechaRaw: new Date(inv.createdAt || inv.issueDate),
          icono: 'mdi-cart-outline',
          color: '#961112'
        })
      })

      // Documentos recientes (máx 2)
      this.documentos.slice(0, 2).forEach(doc => {
        actividades.push({
          id: 'd-' + doc.id,
          descripcion: `Documento "${doc.nombre || 'archivo'}" subido`,
          fecha: this.formatearFechaRelativa(new Date(doc.fechaSubida)),
          fechaRaw: new Date(doc.fechaSubida),
          icono: 'mdi-file-upload-outline',
          color: '#f2b648'
        })
      })

      // Ordenar por fecha más reciente y devolver máximo 5
      return actividades
        .sort((a, b) => b.fechaRaw - a.fechaRaw)
        .slice(0, 5)
    }
  },

  methods: {
    // ═══════════════════════════════════════════
    // CARGA DE DATOS — PROGRESIVA (2 TIERS)
    // ═══════════════════════════════════════════

    /**
     * CARGA PROGRESIVA:
     * Tier 1 (crítico) → Ventas, Compras, BCV cache, Stats inventario
     *   → Al completar: loading = false, el usuario ve KPIs y gráficos
     * Tier 2 (secundario) → Documentos, Fiscal, Top Productos, Low Stock, BCV fresh
     *   → Se carga en background sin bloquear la UI
     *
     * OPTIMIZACIÓN BCV:
     * La tasa BCV usa proxies CORS que tardan 3-10s cuando el cache expira.
     * Estrategia: usar cache de localStorage inmediatamente si existe (aunque esté "expirado"),
     * y refrescar en background. El usuario siempre ve un dato rápido.
     */
    async cargarDatos() {
      this.loading = true
      const t0 = performance.now()

      try {
        // ── Pre-vuelo: usuario actual ──
        const currentUser = await userService.getCurrentUser()
        if (!currentUser || !currentUser.client_id) {
          console.warn('⚠️ No hay client_id disponible para el dashboard')
          return
        }

        this.usuario = currentUser
        this.clientId = currentUser.client_id

        // ── BCV: Intentar cache "caliente" SIN esperar red ──
        // Leemos de localStorage aunque esté expirado para dar dato inmediato
        this.cargarBCVDesdeCache()

        console.log('🚀 Tier 1: Cargando datos críticos...')

        // ── TIER 1: Datos críticos (KPIs + gráficos) ──
        // Solo 3 llamadas a DB, todas livianas y en paralelo
        const [ventasRes, comprasRes, invStatsRes] = await Promise.allSettled([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: currentUser.client_id }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: currentUser.client_id }),
          inventoryService.getDashboardStats()
        ])

        // Asignar resultados Tier 1
        this.ventas = ventasRes.status === 'fulfilled' ? (ventasRes.value || []) : []
        this.compras = comprasRes.status === 'fulfilled' ? (comprasRes.value || []) : []
        this.inventoryStats = invStatsRes.status === 'fulfilled' && invStatsRes.value
          ? invStatsRes.value
          : this.inventoryStats

        const t1 = performance.now()
        console.log(`✅ Tier 1 completado en ${(t1 - t0).toFixed(0)}ms — Mostrando dashboard`)

        // ── PRIMER PAINT: Quitar skeleton, el usuario ya ve KPIs y gráficos ──
        this.loading = false

        // Incrementar chartKey para que los gráficos se remonten con los datos reales
        // Esto es necesario porque el v-if monta los charts al mismo tiempo que llegan los datos
        this.$nextTick(() => { this.chartKey++ })

        // ── TIER 2: Datos secundarios (background, sin bloquear UI) ──
        // Se ejecuta después del primer paint con requestAnimationFrame
        requestAnimationFrame(() => {
          this.cargarDatosTier2(currentUser)
        })

      } catch (error) {
        console.error('❌ Error cargando dashboard:', error)
      } finally {
        // Seguridad: si algo falla, no dejar el skeleton pegado
        if (this.loading) this.loading = false
      }
    },

    /**
     * Tier 2: Carga datos secundarios sin bloquear la UI.
     * Incluye: documentos, fiscal, top productos, low stock, BCV fresco.
     */
    async cargarDatosTier2(currentUser) {
      const t0 = performance.now()
      console.log('🔄 Tier 2: Cargando datos secundarios...')

      try {
        const [
          topProdsRes, lowStockRes, docsRes, fiscalRes, bcvRes
        ] = await Promise.allSettled([
          inventoryService.getTopSellingProducts(5),
          inventoryService.getLowStockProducts(),
          documentService.getDocuments(),
          // Optimización: getStats() hace 2 llamadas internas secuenciales
          // (getFiscalDocs(false) + getFiscalDocs(true)).
          // Usamos getStatsFast() que las ejecuta en paralelo
          this.obtenerFiscalStatsRapido(),
          // BCV: refrescar tasa real en background (puede tardar varios segundos)
          bcvService.getCurrentRate()
        ])

        // Asignar resultados Tier 2 (reactivo, la UI se actualiza sola)
        this.topProducts = topProdsRes.status === 'fulfilled' ? (topProdsRes.value || []) : []
        this.lowStockProducts = lowStockRes.status === 'fulfilled' ? (lowStockRes.value || []) : []
        this.documentos = docsRes.status === 'fulfilled' ? (docsRes.value || []) : []
        this.fiscalStats = fiscalRes.status === 'fulfilled' && fiscalRes.value
          ? fiscalRes.value
          : this.fiscalStats

        // BCV: actualizar con dato fresco (reemplaza el cache "caliente")
        if (bcvRes.status === 'fulfilled' && bcvRes.value?.success) {
          this.tasaBCV = bcvRes.value.data
        }

        const t1 = performance.now()
        console.log(`✅ Tier 2 completado en ${(t1 - t0).toFixed(0)}ms`, {
          topProducts: this.topProducts.length,
          lowStock: this.lowStockProducts.length,
          documentos: this.documentos.length,
          fiscal: this.fiscalStats.total,
          bcv: this.tasaBCV?.dollar
        })

      } catch (error) {
        console.error('⚠️ Error parcial en Tier 2:', error)
      }
    },

    /**
     * Lee la tasa BCV desde localStorage inmediatamente (sin validar expiración).
     * Esto evita esperar 3-10s del proxy CORS. El dato se refresca en Tier 2.
     */
    cargarBCVDesdeCache() {
      try {
        const cached = localStorage.getItem('bcv_exchange_rates')
        if (!cached) return
        const { data } = JSON.parse(cached)
        if (data && typeof data.dollar === 'number') {
          this.tasaBCV = { ...data, cached: true }
          console.log('⚡ BCV: Usando cache caliente:', data.dollar)
        }
      } catch (e) {
        // Silencioso — no hay cache disponible
      }
    },

    /**
     * Versión optimizada de fiscalService.getStats() que ejecuta
     * las 2 consultas internas (activos + papelera) en paralelo
     * en vez de secuencialmente. Ahorra ~50% del tiempo.
     */
    async obtenerFiscalStatsRapido() {
      try {
        // Ejecutar ambas consultas en paralelo (vs secuencial en el servicio)
        const [docs, trashDocs] = await Promise.all([
          fiscalService.getFiscalDocs({ trashed: false }),
          fiscalService.getFiscalDocs({ trashed: true })
        ])

        const now = new Date()
        const stats = {
          total: docs.length,
          vigente: 0,
          tramite: 0,
          vencido: 0,
          porVencer: 0,
          trash: trashDocs.length
        }

        docs.forEach(doc => {
          const status = doc.status.toLowerCase()
          if (stats[status] !== undefined) stats[status]++

          if (doc.expiration_date) {
            const expDate = new Date(doc.expiration_date)
            const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))
            if (diffDays > 0 && diffDays <= 30 && doc.status === 'VIGENTE') {
              stats.porVencer++
            }
            if (diffDays < 0 && doc.status === 'VIGENTE') {
              stats.vigente--
              stats.vencido++
            }
          }
        })

        return stats
      } catch (error) {
        console.error('❌ Error en obtenerFiscalStatsRapido:', error)
        return null
      }
    },

    // ═══════════════════════════════════════════
    // SWAPY (Drag-to-Swap)
    // ═══════════════════════════════════════════

    /** Inicializa Swapy en el contenedor inferior del dashboard */
    async inicializarSwapy() {
      if (!this.$refs.swapyContainer) return

      try {
        this.swapyInstance = createSwapy(this.$refs.swapyContainer, {
          animation: 'dynamic',
          enabled: true,
          // 'drop' es más predecible que 'hover' cuando las cards contienen
          // elementos interactivos (charts, listas, botones)
          swapMode: 'drop',
          autoScrollOnDrag: true
        })

        // Guardar layout al soltar una card (Supabase + localStorage fallback)
        this.swapyInstance.onSwap(event => {
          console.log('🔄 Layout actualizado')
          this.guardarLayout(event.data.object)
        })

        // Restaurar layout guardado previamente (Supabase → localStorage → default)
        await this.cargarLayout()

      } catch (error) {
        console.warn('⚠️ Error inicializando Swapy:', error)
      }
    },

    /**
     * Guarda el layout en Supabase (persistencia entre dispositivos)
     * y en localStorage como fallback rápido.
     */
    async guardarLayout(layout) {
      // 1. Guardar en localStorage (inmediato, sin latencia)
      const key = `dashboard_layout_${this.usuario?.id || 'default'}`
      try {
        localStorage.setItem(key, JSON.stringify(layout))
      } catch (e) {
        console.warn('⚠️ Error guardando layout en localStorage:', e)
      }

      // 2. Guardar en Supabase (persistencia entre dispositivos)
      try {
        const result = await preferencesService.saveDashboardLayout(layout)
        if (result.success) {
          console.log('☁️ Layout sincronizado con Supabase')
        } else {
          console.warn('⚠️ No se pudo sincronizar layout con Supabase:', result.message)
        }
      } catch (e) {
        console.warn('⚠️ Error sincronizando layout con Supabase:', e)
      }
    },

    /**
     * Carga el layout guardado: intenta primero desde Supabase,
     * luego fallback a localStorage.
     */
    async cargarLayout() {
      if (!this.swapyInstance) return

      try {
        // 1. Intentar cargar desde Supabase (fuente de verdad)
        const layoutSupabase = await preferencesService.getDashboardLayout()
        if (layoutSupabase) {
          console.log('☁️ Layout restaurado desde Supabase')
          this.swapyInstance.setData(layoutSupabase)
          // Sincronizar localStorage con la fuente de verdad
          const key = `dashboard_layout_${this.usuario?.id || 'default'}`
          localStorage.setItem(key, JSON.stringify(layoutSupabase))
          return
        }

        // 2. Fallback: cargar desde localStorage
        const key = `dashboard_layout_${this.usuario?.id || 'default'}`
        const saved = localStorage.getItem(key)
        if (saved) {
          const layout = JSON.parse(saved)
          this.swapyInstance.setData(layout)
          console.log('💾 Layout restaurado desde localStorage')
          // Migrar a Supabase para futuras sesiones
          preferencesService.saveDashboardLayout(layout)
        }
      } catch (e) {
        console.warn('⚠️ Error cargando layout guardado:', e)
      }
    },

    // ═══════════════════════════════════════════
    // HELPERS DE FILTRADO Y CÁLCULO
    // ═══════════════════════════════════════════

    /** Filtra un array de facturas por rango de fechas */
    filtrarPorPeriodo(facturas, inicio, fin) {
      if (!facturas || !inicio || !fin) return []
      return facturas.filter(inv => {
        const fecha = new Date(inv.issueDate || inv.createdAt)
        return fecha >= inicio && fecha <= fin
      })
    },

    /** Suma los montos (financial.totalSales) de un array de facturas */
    sumarMontos(facturas) {
      return (facturas || []).reduce((sum, inv) => {
        return sum + (parseFloat(inv.financial?.totalSales) || 0)
      }, 0)
    },

    /**
     * Calcula la variación porcentual entre valor actual y anterior.
     * Retorna null si ambos son 0 (sin datos para comparar).
     */
    calcularVariacion(actual, anterior) {
      if (anterior === 0 && actual === 0) return null
      if (anterior === 0) return actual > 0 ? 100 : -100
      return ((actual - anterior) / Math.abs(anterior)) * 100
    },

    /** Alterna entre moneda USD y VES */
    toggleMoneda() {
      this.monedaActual = this.monedaActual === 'USD' ? 'VES' : 'USD'
    },

    /** Formatea un número como monto con separadores venezolanos */
    formatMonto(valor) {
      return (valor || 0).toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    },

    /** Convierte una fecha a texto relativo ("Hace 2h", "Ayer", etc.) */
    formatearFechaRelativa(fecha) {
      if (!fecha || isNaN(fecha.getTime())) return ''
      const ahora = new Date()
      const diffMs = ahora - fecha
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Justo ahora'
      if (diffMins < 60) return `Hace ${diffMins} min`
      if (diffHours < 24) return `Hace ${diffHours}h`
      if (diffDays === 1) return 'Ayer'
      if (diffDays < 7) return `Hace ${diffDays} días`
      return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    }
  },

  async mounted() {
    await this.cargarDatos()

    // Inicializar Swapy con un pequeño delay para garantizar que el DOM
    // esté completamente pintado, incluyendo los slots que se renderizan
    // en el mismo ciclo que loading = false.
    // $nextTick no es suficiente porque Vuetify puede necesitar un frame extra
    // para generar los elementos internos de las v-card.
    setTimeout(() => {
      this.inicializarSwapy()
    }, 150)
  },

  beforeUnmount() {
    // Limpiar instancia de Swapy al destruir el componente
    if (this.swapyInstance) {
      this.swapyInstance.destroy()
    }
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════ */
/* DASHBOARD EJECUTIVO — Estilos Premium                   */
/* ═══════════════════════════════════════════════════════ */

/* ── Layout principal ── */
.dashboard-ejecutivo {
  background-color: var(--color-background, #efefef);
  min-height: 100vh;
}

/* ── Header ── */
.dashboard-header {
  padding: 8px 4px;
}

.dashboard-greeting {
  font-family: var(--font-primary, 'Montserrat'), sans-serif;
  font-weight: 700;
  font-size: 1.75rem;
  color: var(--color-secondary, #1F355C);
  margin: 0;
  line-height: 1.3;
  letter-spacing: -0.02em;
}

.dashboard-subtitle {
  font-family: var(--font-secondary, 'Open Sans'), sans-serif;
  font-size: 0.9rem;
  color: #777;
  margin: 4px 0 0;
}

/* ── Controles del header ── */
.bcv-chip {
  font-family: var(--font-primary, 'Montserrat'), sans-serif;
}

.moneda-toggle {
  border-radius: 10px !important;
  overflow: hidden;
}

.filtro-periodo {
  max-width: 200px;
  min-width: 170px;
}

.filtro-periodo :deep(.v-field) {
  border-radius: 10px !important;
}

/* ── KPI Card Wrapper ── */
.kpi-wrapper {
  position: relative;
}

.kpi-variacion {
  display: flex;
  align-items: center;
  padding-left: 6px;
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
  animation-delay: 1.2s;
}

.variacion-label {
  font-size: 0.72rem;
  color: #999;
  margin-left: 6px;
}

/* ── Dashboard Cards (estilo global) ── */
.dashboard-card {
  border-radius: var(--radius-lg, 20px) !important;
  box-shadow: none !important;
  border: 1px solid rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-2px);
  border-color: rgba(0, 0, 0, 0.1);
}

.card-title-row {
  display: flex;
  align-items: center;
  font-family: var(--font-primary, 'Montserrat'), sans-serif;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-secondary, #1F355C);
  padding: 16px 20px 8px;
}

/* ── Chart cards ── */
.chart-card {
  min-height: 400px;
}

.chart-body {
  height: 100%;
  min-height: 340px;
}

/* ── Full height cards (swapy) ── */
.full-height {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.full-height .v-card-text {
  flex: 1;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 260px;
  opacity: 0.5;
}

.empty-state.compact {
  min-height: 160px;
}

.empty-state p {
  font-size: 0.85rem;
  color: #999;
  margin: 0;
}

/* ═══════════════════════════════════════════════════════ */
/* SWAPY GRID                                              */
/* ═══════════════════════════════════════════════════════ */

.swapy-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.swapy-slot {
  min-height: 280px;
}

.swapy-slot > div {
  height: 100%;
}

.swapy-slot .dashboard-card {
  height: 100%;
}

/* Ícono indicador de arrastre en card headers */
.drag-handle-icon {
  opacity: 0.35;
  cursor: grab;
  transition: opacity 0.2s ease;
}

[data-swapy-handle]:hover .drag-handle-icon {
  opacity: 0.7;
}

[data-swapy-handle] {
  cursor: grab;
}

[data-swapy-handle]:active {
  cursor: grabbing;
}

/* ═══════════════════════════════════════════════════════ */
/* INSIGHTS                                                */
/* ═══════════════════════════════════════════════════════ */

.insights-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.insight-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background-color 0.2s ease;
}

.insight-item.clickable {
  cursor: pointer;
}

.insight-item.clickable:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.insight-icon {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.insight-content {
  flex: 1;
}

.insight-text {
  font-size: 0.85rem;
  color: #333;
  margin: 0;
  line-height: 1.45;
}

.insight-link {
  font-size: 0.75rem;
  cursor: pointer;
}

/* ═══════════════════════════════════════════════════════ */
/* ACTIVIDAD RECIENTE                                      */
/* ═══════════════════════════════════════════════════════ */

.activity-timeline {
  display: flex;
  flex-direction: column;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-dot {
  width: 10px;
  height: 10px;
  min-width: 10px;
  border-radius: 50%;
}

.activity-body {
  flex: 1;
}

.activity-desc {
  font-size: 0.85rem;
  color: #333;
  margin: 0;
  line-height: 1.35;
}

.activity-time {
  font-size: 0.73rem;
  color: #aaa;
}

/* ═══════════════════════════════════════════════════════ */
/* TOP PRODUCTOS                                           */
/* ═══════════════════════════════════════════════════════ */

.top-products-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.product-rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 6px;
  border-radius: 10px;
  transition: background-color 0.2s ease;
}

.product-rank-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.rank-badge {
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: #fff;
  background-color: #1F355C;
}

.rank-1 { background: linear-gradient(135deg, #f2b648, #e6a020); color: #333; }
.rank-2 { background: linear-gradient(135deg, #B0B0B0, #909090); }
.rank-3 { background: linear-gradient(135deg, #CD7F32, #A06020); }

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-stats {
  font-size: 0.73rem;
  color: #999;
  margin: 0;
}

.product-revenue {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-secondary, #1F355C);
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════ */
/* ESTADO FISCAL                                           */
/* ═══════════════════════════════════════════════════════ */

.fiscal-stat {
  padding: 8px 0;
}

.fiscal-number {
  font-family: var(--font-primary, 'Montserrat'), sans-serif;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
}

.fiscal-label {
  font-size: 0.73rem;
  color: #999;
  margin-top: 2px;
}

/* ═══════════════════════════════════════════════════════ */
/* ANIMACIONES                                             */
/* ═══════════════════════════════════════════════════════ */

.animate-section {
  opacity: 0;
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ═══════════════════════════════════════════════════════ */
/* RESPONSIVE                                              */
/* ═══════════════════════════════════════════════════════ */

@media (max-width: 960px) {
  .dashboard-greeting {
    font-size: 1.35rem;
  }

  .swapy-grid {
    grid-template-columns: 1fr;
  }

  .filtro-periodo {
    max-width: 100%;
    min-width: 0;
    flex: 1;
  }

  .chart-card {
    min-height: 320px;
  }
}

@media (max-width: 600px) {
  .dashboard-greeting {
    font-size: 1.15rem;
  }

  .dashboard-ejecutivo {
    padding: 12px !important;
  }

  .fiscal-number {
    font-size: 1.5rem;
  }

  .swapy-grid {
    gap: 16px;
  }

  .chart-body {
    min-height: 260px;
  }
}
</style>
