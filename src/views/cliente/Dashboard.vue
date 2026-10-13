<template>
  <v-container fluid class="dashboard-como-voy pa-4 pa-md-6">
    <h1 class="text-h4 mb-1">¿Cómo voy?</h1>
    <p class="text-medium-emphasis mb-4">Tus números, sin jerga contable.</p>

    <!-- ═══ CARGANDO ═══ -->
    <template v-if="loading">
      <v-skeleton-loader type="button" width="280" class="mb-4 rounded-xl" />
      <v-row class="mb-4">
        <v-col v-for="n in 3" :key="'kpi-sk-' + n" cols="12" md="4">
          <v-skeleton-loader type="card" height="150" class="rounded-xl" />
        </v-col>
      </v-row>
      <v-skeleton-loader type="image" height="320" class="rounded-xl mb-4" />
      <v-row>
        <v-col v-for="n in 2" :key="'lista-sk-' + n" cols="12" md="6">
          <v-skeleton-loader type="card" height="260" class="rounded-xl" />
        </v-col>
      </v-row>
    </template>

    <!-- ═══ ERROR DE CARGA ═══ -->
    <AvisoAmable
      v-else-if="loadError"
      tipo="error"
      :mensaje="loadError.message"
      texto-accion="Reintentar"
      @accion="reintentar"
    />

    <!-- ═══ CONTENIDO ═══ -->
    <template v-else>
      <SelectorPeriodo v-model="periodo" class="mb-4" />

      <!-- Hallazgo #5: nunca se suman bolívares como si fueran dólares; si a
           alguna factura le falta toda tasa (guardada y BCV), se avisa en
           vez de inflar/ocultar el total. -->
      <AvisoAmable
        v-if="facturasSinTasa > 0"
        tipo="advertencia"
        :mensaje="mensajeFacturasSinTasa"
        class="mb-4"
      />

      <!-- Hallazgo #7: el estado vacío del período SOLO reemplaza las tres
           tarjetas — el gráfico de 6 meses y los rankings siguen visibles
           (usan su propio histórico/estado vacío interno). -->
      <transition name="cruce" mode="out-in">
        <EstadoVacio
          v-if="!tieneMovimientos"
          key="vacio-periodo"
          icono="mdi-chart-line"
          titulo="Aún no hay movimientos en este período"
          mensaje="Registra tu primera venta o gasto."
          texto-accion="Registrar ahora"
          class="mb-4"
          @accion="registrar"
        />

        <v-row v-else key="tarjetas" class="mb-4">
          <v-col cols="12" md="4">
            <TarjetaKPI
              etiqueta="Vendí"
              :monto="totalVendi"
              :monto-bs="bsVendi"
              color="success"
              :variacion="variacionVendi"
              :subir-es-bueno="true"
              :etiqueta-periodo-anterior="etiquetaAnterior"
              :indice="0"
            />
          </v-col>
          <v-col cols="12" md="4">
            <TarjetaKPI
              etiqueta="Gasté"
              :monto="totalGaste"
              :monto-bs="bsGaste"
              color="error"
              :variacion="variacionGaste"
              :subir-es-bueno="false"
              :etiqueta-periodo-anterior="etiquetaAnterior"
              :indice="1"
            />
          </v-col>
          <v-col cols="12" md="4">
            <TarjetaKPI
              etiqueta="Me queda"
              :monto="meQueda"
              :monto-bs="bsMeQueda"
              :color="meQueda >= 0 ? 'success' : 'error'"
              :variacion="variacionMeQueda"
              :subir-es-bueno="true"
              :etiqueta-periodo-anterior="etiquetaAnterior"
              :indice="2"
            />
          </v-col>
        </v-row>
      </transition>

      <!-- Gráfico: últimos 6 meses (histórico completo, siempre visible). -->
      <SeccionPanel
        titulo="Últimos 6 meses"
        subtitulo="Vendí vs. Gasté, mes a mes"
        icono="mdi-chart-bar"
        class="mb-4"
        :retraso-ms="150"
      >
        <GraficoBarras :labels="datosGrafico.labels" :series="seriesGrafico" :altura="280" />
      </SeccionPanel>

      <!-- Top categorías y top clientes (del período elegido; si el período
           está vacío, cada lista muestra su propio texto de "sin datos",
           siempre visibles). -->
      <v-row>
        <v-col cols="12" md="6">
          <SeccionPanel titulo="¿En qué gasto más?" icono="mdi-receipt-text-outline" :retraso-ms="200">
            <ListaRanking
              :items="categorias"
              color="error"
              vacio-texto="Sin gastos registrados en este período."
            />
          </SeccionPanel>
        </v-col>
        <v-col cols="12" md="6">
          <SeccionPanel titulo="¿A quién le vendo más?" icono="mdi-account-group-outline" :retraso-ms="200">
            <ListaRanking
              :items="clientesTop"
              color="secondary"
              vacio-texto="Sin ventas registradas en este período."
            />
          </SeccionPanel>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script>
// ═══════════════════════════════════════════════════════════
// "¿Cómo voy?" — Dashboard del cliente
// Lenguaje llano, pocas cosas bien hechas (PLAN-MVP.md §2): período
// simple, tres tarjetas (Vendí / Gasté / Me queda), un gráfico de 6 meses
// y dos rankings (categorías de gasto, clientes). Los cálculos viven en
// src/utils/resumenFinanciero.js (funciones puras, con tests) — esta vista
// solo carga datos y los pasa a los componentes de src/components/ui/.
// ═══════════════════════════════════════════════════════════

import SelectorPeriodo from '@/components/ui/SelectorPeriodo.vue'
import TarjetaKPI from '@/components/ui/TarjetaKPI.vue'
import SeccionPanel from '@/components/ui/SeccionPanel.vue'
import ListaRanking from '@/components/ui/ListaRanking.vue'
import GraficoBarras from '@/components/ui/GraficoBarras.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'

import userService from '@/services/userService'
import invoiceService from '@/services/invoiceService'
import bcvService from '@/services/bcvService'

import {
  obtenerRangoPeriodo,
  etiquetaPeriodoAnterior,
  filtrarPorRango,
  sumarMontosUsd,
  agruparPorMes,
  topCategorias,
  topClientes,
  calcularVariacion,
} from '@/utils/resumenFinanciero'

export default {
  name: 'ClienteDashboardComoVoy',

  components: {
    SelectorPeriodo,
    TarjetaKPI,
    SeccionPanel,
    ListaRanking,
    GraficoBarras,
    EstadoVacio,
    AvisoAmable,
  },

  data() {
    return {
      loading: true,
      loadError: null,

      periodo: 'este_mes',

      clientId: null,
      ventasRaw: [],
      comprasRaw: [],
      tasaBCV: null,
    }
  },

  computed: {
    rango() {
      return obtenerRangoPeriodo(this.periodo)
    },
    etiquetaAnterior() {
      return etiquetaPeriodoAnterior(this.periodo)
    },

    ventasPeriodo() {
      return filtrarPorRango(this.ventasRaw, this.rango.inicio, this.rango.fin)
    },
    comprasPeriodo() {
      return filtrarPorRango(this.comprasRaw, this.rango.inicio, this.rango.fin)
    },
    ventasAnterior() {
      if (!this.rango.inicioAnterior) return []
      return filtrarPorRango(this.ventasRaw, this.rango.inicioAnterior, this.rango.finAnterior)
    },
    comprasAnterior() {
      if (!this.rango.inicioAnterior) return []
      return filtrarPorRango(this.comprasRaw, this.rango.inicioAnterior, this.rango.finAnterior)
    },

    /** `{ total, excluidas }` — ver `sumarMontosUsd` (hallazgo #5: tasa de la factura primero, nunca Bs como USD). */
    resumenVentas() {
      return sumarMontosUsd(this.ventasPeriodo, this.tasaBCV)
    },
    resumenCompras() {
      return sumarMontosUsd(this.comprasPeriodo, this.tasaBCV)
    },
    totalVendi() {
      return this.resumenVentas.total
    },
    totalGaste() {
      return this.resumenCompras.total
    },
    meQueda() {
      return this.totalVendi - this.totalGaste
    },

    /** Facturas del período elegido que no se pudieron convertir a USD (ninguna tasa disponible). */
    facturasSinTasa() {
      return this.resumenVentas.excluidas + this.resumenCompras.excluidas
    },
    mensajeFacturasSinTasa() {
      const n = this.facturasSinTasa
      return `${n} factura${n === 1 ? '' : 's'} no se ${n === 1 ? 'incluyó' : 'incluyeron'} porque no tiene${n === 1 ? '' : 'n'} tasa de cambio.`
    },

    totalVendiAnterior() {
      return sumarMontosUsd(this.ventasAnterior, this.tasaBCV).total
    },
    totalGasteAnterior() {
      return sumarMontosUsd(this.comprasAnterior, this.tasaBCV).total
    },
    meQuedaAnterior() {
      return this.totalVendiAnterior - this.totalGasteAnterior
    },

    variacionVendi() {
      return calcularVariacion(this.totalVendi, this.totalVendiAnterior)
    },
    variacionGaste() {
      return calcularVariacion(this.totalGaste, this.totalGasteAnterior)
    },
    variacionMeQueda() {
      return calcularVariacion(this.meQueda, this.meQuedaAnterior)
    },

    /** Tasa del dólar del día, 0 si no hay (oculta el equivalente en Bs en vez de mostrar basura). */
    factorBs() {
      return this.tasaBCV?.dollar || 0
    },
    bsVendi() {
      return this.factorBs > 0 ? this.totalVendi * this.factorBs : null
    },
    bsGaste() {
      return this.factorBs > 0 ? this.totalGaste * this.factorBs : null
    },
    bsMeQueda() {
      return this.factorBs > 0 ? this.meQueda * this.factorBs : null
    },

    /** Últimos 6 meses (siempre sobre el histórico completo, no sobre el período elegido). */
    datosGrafico() {
      return agruparPorMes(this.ventasRaw, this.comprasRaw, this.tasaBCV, 6)
    },
    seriesGrafico() {
      // Colores del tema actual (no un hex fijo, hallazgo #17): respeta el
      // tema oscuro, donde success/error son tonos distintos para AA.
      const colores = this.$vuetify.theme.current.colors
      return [
        { nombre: 'Vendí', datos: this.datosGrafico.vendi, color: colores.success },
        { nombre: 'Gasté', datos: this.datosGrafico.gaste, color: colores.error },
      ]
    },

    categorias() {
      return topCategorias(this.comprasPeriodo, this.tasaBCV, 5)
    },
    clientesTop() {
      return topClientes(this.ventasPeriodo, this.tasaBCV, 5)
    },

    tieneMovimientos() {
      return this.ventasPeriodo.length > 0 || this.comprasPeriodo.length > 0
    },
  },

  methods: {
    async cargarDatos() {
      this.loading = true
      this.loadError = null

      try {
        const usuario = await userService.getCurrentUser()
        if (!usuario || !usuario.client_id) {
          this.loadError = {
            code: 'SIN_CLIENTE',
            message: 'No pudimos identificar tu empresa. Intenta de nuevo.',
          }
          return
        }
        this.clientId = usuario.client_id

        const [ventasRes, comprasRes, bcvRes] = await Promise.allSettled([
          invoiceService.getInvoices({ flow: 'VENTA', clientId: this.clientId }),
          invoiceService.getInvoices({ flow: 'COMPRA', clientId: this.clientId }),
          bcvService.getCurrentRate(),
        ])

        const ventasOk = ventasRes.status === 'fulfilled'
        const comprasOk = comprasRes.status === 'fulfilled'

        // Hallazgo #6: si falla la carga de ventas O de compras, se muestra
        // el error (con Reintentar) en vez de seguir con esa lista en []
        // (que la pantalla mostraba como "$0", un dato falso).
        if (!ventasOk || !comprasOk) {
          this.loadError = {
            code: 'ERROR_CARGA',
            message:
              !ventasOk && !comprasOk
                ? 'No pudimos cargar tu resumen. Intenta de nuevo.'
                : !ventasOk
                  ? 'No pudimos cargar tus ventas. Intenta de nuevo.'
                  : 'No pudimos cargar tus compras. Intenta de nuevo.',
          }
          return
        }

        this.ventasRaw = ventasRes.value || []
        this.comprasRaw = comprasRes.value || []
        this.tasaBCV = bcvRes.status === 'fulfilled' && bcvRes.value?.success ? bcvRes.value.data : null
      } catch (error) {
        this.loadError = {
          code: 'ERROR_CARGA',
          message: 'No pudimos cargar tu resumen. Intenta de nuevo.',
        }
      } finally {
        this.loading = false
      }
    },

    reintentar() {
      this.cargarDatos()
    },

    registrar() {
      this.$router.push('/cliente/inicio?registrar=compra')
    },
  },

  async mounted() {
    await this.cargarDatos()
  },
}
</script>

<style scoped>
.dashboard-como-voy {
  background-color: rgb(var(--v-theme-background));
  min-height: 100vh;
}

/* Transición cruzada al cambiar de período (ver movimiento.js): un fundido
   corto, nunca un salto brusco de contenido a contenido. */
.cruce-enter-active,
.cruce-leave-active {
  transition: opacity var(--ad-move-duracion-entrada, 280ms) var(--ad-move-curva-entrada, ease-out);
}
.cruce-enter-from,
.cruce-leave-to {
  opacity: 0;
}
</style>
