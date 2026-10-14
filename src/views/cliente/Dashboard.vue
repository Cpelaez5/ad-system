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
      <v-row class="mb-4">
        <v-col cols="12" md="7"><v-skeleton-loader type="card" height="260" class="rounded-xl" /></v-col>
        <v-col cols="12" md="5"><v-skeleton-loader type="card" height="260" class="rounded-xl" /></v-col>
      </v-row>
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

      <!-- Frase de resultado del período, en llano (reemplaza la vieja
           tarjeta "Me queda": ese número ya vive aquí). Solo con movimientos
           — con el período vacío, el EstadoVacio de abajo ya explica qué
           hacer. -->
      <p v-if="tieneMovimientos" class="text-h6 font-weight-regular mb-4 dashboard-como-voy__frase">
        {{ fraseDeResultado }}
      </p>

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
           cifras — el gráfico de 6 meses y los rankings siguen visibles
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

        <!-- 3 cifras en línea, sin tarjetas de colores (TarjetaKPI es
             texto plano sobre el fondo, sin elevación ni color de
             superficie). -->
        <v-row v-else key="cifras" class="mb-4">
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
              etiqueta="Lo que vas a declarar"
              :monto="montoIvaEstimado"
              :monto-bs="bsIvaEstimado"
              color="secondary"
              ayuda-clave="iva_a_pagar_estimado"
              :nota="notaIvaEstimado"
              :indice="2"
            />
          </v-col>
        </v-row>
      </transition>

      <!-- Grilla de gráficos reales (histórico completo o del período según
           cada panel — siempre visibles, con su propio texto/estado vacío
           interno). Rejilla de 12 columnas en escritorio para aprovechar el
           ancho; en el teléfono cada panel ocupa el ancho completo y se
           apilan en el mismo orden. -->

      <!-- 1. Vendí vs. Gasté mes a mes + línea "Me queda" (neto). -->
      <v-row class="mb-4">
        <v-col cols="12">
          <SeccionPanel
            titulo="¿Cómo va mi negocio mes a mes?"
            :subtitulo="fraseMeses"
            icono="mdi-chart-bar"
            :retraso-ms="150"
          >
            <template #accion>
              <FiltroChips
                v-model="cantidadMesesGrafico"
                etiqueta="Cantidad de meses"
                :opciones="[{ valor: 6, texto: '6 meses' }, { valor: 12, texto: '12 meses' }]"
              />
            </template>
            <GraficoBarras :labels="datosMeses.labels" :series="seriesMeses" :altura="300" />
          </SeccionPanel>
        </v-col>
      </v-row>

      <!-- 2. ¿En qué gasto más? (categorías, barras horizontales) + 3. Impuestos del período. -->
      <v-row class="mb-4">
        <v-col cols="12" md="7">
          <SeccionPanel class="h-100" titulo="¿En qué gasto más?" icono="mdi-receipt-text-outline" :retraso-ms="200">
            <AvisoAmable
              v-if="categoriaSinClasificarDomina"
              tipo="advertencia"
              :mensaje="mensajeCategorizar"
              class="mb-2"
            />
            <v-btn v-if="categoriaSinClasificarDomina" variant="tonal" color="primary" class="text-none mb-3" @click="irACategorizar">
              Categorizar compras
            </v-btn>
            <p v-if="categorias.length === 0" class="text-body-2 text-medium-emphasis text-center py-6 mb-0">
              Registra compras con categoría para ver este gráfico.
            </p>
            <v-row v-else>
              <v-col cols="12" md="7">
                <GraficoBarras :labels="categoriasGrafico.labels" :series="categoriasGrafico.series" horizontal :altura="240" />
              </v-col>
              <v-col cols="12" md="5">
                <ListaRanking :items="categorias" color="error" />
              </v-col>
            </v-row>
          </SeccionPanel>
        </v-col>
        <v-col cols="12" md="5">
          <SeccionPanel class="h-100" titulo="Impuestos del período" icono="mdi-bank-outline" :retraso-ms="250">
            <p v-if="!hayImpuestos" class="text-body-2 text-medium-emphasis text-center py-6 mb-0">
              Registra ventas y compras con IVA para ver cuánto vas a declarar.
            </p>
            <template v-else>
              <p class="text-body-2 text-medium-emphasis mb-3 d-flex align-center ga-1">
                Lo que vas a declarar <AyudaTermino clave="iva_a_pagar_estimado" /> {{ montoIvaEstimadoTexto }}
              </p>
              <GraficoBarras :labels="impuestosGrafico.labels" :series="impuestosGrafico.series" :altura="220" />
            </template>
          </SeccionPanel>
        </v-col>
      </v-row>

      <!-- 4. ¿A quién le vendo más? + 5. ¿A quién le compro más? -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <SeccionPanel class="h-100" titulo="¿A quién le vendo más?" icono="mdi-account-group-outline" :retraso-ms="200">
            <ListaRanking
              :items="clientesTop"
              color="secondary"
              vacio-texto="Sin ventas registradas en este período."
            />
          </SeccionPanel>
        </v-col>
        <v-col cols="12" md="6">
          <SeccionPanel class="h-100" titulo="¿A quién le compro más?" icono="mdi-truck-outline" :retraso-ms="250">
            <ListaRanking
              :items="proveedoresTop"
              color="error"
              vacio-texto="Sin compras registradas en este período."
            />
          </SeccionPanel>
        </v-col>
      </v-row>

      <!-- 6. ¿En qué días vendo más? + 7. ¿En qué moneda cobro más? -->
      <v-row>
        <v-col cols="12" md="7">
          <SeccionPanel
            class="h-100"
            titulo="¿En qué días vendo más?"
            :subtitulo="fraseDias"
            icono="mdi-calendar-week-outline"
            :retraso-ms="200"
          >
            <p v-if="diasGrafico.valores.every((v) => v === 0)" class="text-body-2 text-medium-emphasis text-center py-6 mb-0">
              Registra tus ventas con fecha para ver este gráfico.
            </p>
            <GraficoBarras v-else :labels="diasGrafico.labels" :series="diasSeries" :altura="220" />
          </SeccionPanel>
        </v-col>
        <v-col cols="12" md="5">
          <SeccionPanel class="h-100" titulo="¿En qué moneda cobro más?" icono="mdi-cash-multiple" :retraso-ms="250">
            <p v-if="monedaGrafico.labels.length === 0" class="text-body-2 text-medium-emphasis text-center py-6 mb-0">
              Registra ventas para ver en qué moneda cobras.
            </p>
            <GraficoBarras v-else :labels="monedaGrafico.labels" :series="monedaGrafico.series" :altura="220" />
          </SeccionPanel>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script>
// ═══════════════════════════════════════════════════════════
// "¿Cómo voy?" — Dashboard del cliente
// Lenguaje llano, pocas cosas bien hechas (PLAN-MVP.md §2) pero
// aprovechando el espacio en escritorio: período simple, una frase de
// resultado ("me queda") + tres cifras en línea (Vendí / Gasté / Lo que
// vas a declarar), y una rejilla de gráficos reales con datos que esta
// vista ya carga (mes a mes con línea de neto, categorías de gasto,
// impuestos del período, top clientes/proveedores, días de la semana y
// moneda). Los cálculos viven en src/utils/resumenFinanciero.js (funciones
// puras, con tests) — esta vista solo carga datos y los pasa a los
// componentes de src/components/ui/.
// ═══════════════════════════════════════════════════════════

import SelectorPeriodo from '@/components/ui/SelectorPeriodo.vue'
import TarjetaKPI from '@/components/ui/TarjetaKPI.vue'
import SeccionPanel from '@/components/ui/SeccionPanel.vue'
import ListaRanking from '@/components/ui/ListaRanking.vue'
import GraficoBarras from '@/components/ui/GraficoBarras.vue'
import EstadoVacio from '@/components/ui/EstadoVacio.vue'
import AvisoAmable from '@/components/ui/AvisoAmable.vue'
import FiltroChips from '@/components/ui/FiltroChips.vue'
import AyudaTermino from '@/components/ui/AyudaTermino.vue'

import userService from '@/services/userService'
import invoiceService from '@/services/invoiceService'
import bcvService from '@/services/bcvService'
import { formatMoney } from '@/utils/formatMoney'

import {
  obtenerRangoPeriodo,
  etiquetaPeriodoAnterior,
  filtrarPorRango,
  sumarMontosUsd,
  agruparPorMes,
  mejorMes,
  agruparVentasPorDia,
  diaConMasVentas,
  proporcionMonedaUsd,
  topCategorias,
  topProveedores,
  SIN_CATEGORIA,
  topClientes,
  calcularVariacion,
  desglosarIvaEstimado,
  fraseResultado,
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
    FiltroChips,
    AyudaTermino,
  },

  data() {
    return {
      loading: true,
      loadError: null,

      periodo: 'este_mes',
      /** 6 o 12 meses en el gráfico "¿Cómo va mi negocio mes a mes?". */
      cantidadMesesGrafico: 6,

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
    /** Frase de resultado del período en llano, arriba de las 3 cifras (sustituye la vieja tarjeta "Me queda"). */
    fraseDeResultado() {
      return fraseResultado(this.periodo, this.totalVendi, this.totalGaste)
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

    variacionVendi() {
      return calcularVariacion(this.totalVendi, this.totalVendiAnterior)
    },
    variacionGaste() {
      return calcularVariacion(this.totalGaste, this.totalGasteAnterior)
    },

    /**
     * Desglose del IVA estimado del período (diferenciador D1): débito de
     * ventas, crédito de compras, retenciones que te hicieron tus clientes
     * y el neto ("Lo que vas a declarar"). Ver `desglosarIvaEstimado`
     * (src/utils/resumenFinanciero.js) — usa solo los datos que esta vista
     * ya carga (ventasPeriodo/comprasPeriodo).
     */
    desgloseIva() {
      return desglosarIvaEstimado(this.ventasPeriodo, this.comprasPeriodo, this.tasaBCV)
    },
    montoIvaEstimado() {
      return this.desgloseIva.neto
    },
    montoIvaEstimadoTexto() {
      return formatMoney(this.montoIvaEstimado, 'USD')
    },
    /** Nota corta bajo la cifra: aclara el cálculo y, si salió negativo, que es un crédito fiscal (no una deuda). */
    notaIvaEstimado() {
      if (this.montoIvaEstimado < 0) {
        return 'Estimado: tienes crédito fiscal este período (pagaste más IVA del que cobraste).'
      }
      return 'Estimado: débito de ventas − crédito de compras − retenciones.'
    },
    /** Panel "Impuestos del período": una barra por concepto, coloreada por significado (no por serie). */
    impuestosGrafico() {
      const colores = this.$vuetify.theme.current.colors
      return {
        labels: ['Cobré (débito)', 'Pagué (crédito)', 'Retenciones', 'Lo que vas a declarar'],
        series: [
          {
            nombre: 'Monto',
            datos: [this.desgloseIva.debito, this.desgloseIva.credito, this.desgloseIva.retencion, this.montoIvaEstimado],
            color: [colores.success, colores.error, colores.secondary, colores.primary],
          },
        ],
      }
    },

    hayImpuestos() {
      const d = this.desgloseIva
      return d.debito !== 0 || d.credito !== 0 || d.retencion !== 0
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
    bsIvaEstimado() {
      return this.factorBs > 0 ? this.montoIvaEstimado * this.factorBs : null
    },

    /** 6 o 12 meses (según `cantidadMesesGrafico`), siempre sobre el histórico completo, no sobre el período elegido. */
    datosMeses() {
      return agruparPorMes(this.ventasRaw, this.comprasRaw, this.tasaBCV, this.cantidadMesesGrafico)
    },
    seriesMeses() {
      // Colores del tema actual (no un hex fijo, hallazgo #17): respeta el
      // tema oscuro, donde success/error son tonos distintos para AA.
      const colores = this.$vuetify.theme.current.colors
      return [
        { nombre: 'Vendí', datos: this.datosMeses.vendi, color: colores.success },
        { nombre: 'Gasté', datos: this.datosMeses.gaste, color: colores.error },
        { nombre: 'Me queda', datos: this.datosMeses.neto, color: colores.secondary, tipo: 'linea' },
      ]
    },
    /** Frase de lectura arriba del gráfico de meses: así no hay que interpretar las barras. */
    fraseMeses() {
      const mejor = mejorMes(this.datosMeses.labels, this.datosMeses.vendi)
      if (!mejor) return `Vendí vs. gasté, mes a mes (últimos ${this.cantidadMesesGrafico} meses).`
      return `Tu mejor mes vendiendo fue ${mejor.label}, con ${formatMoney(mejor.valor, 'USD')}.`
    },

    categorias() {
      return topCategorias(this.comprasPeriodo, this.tasaBCV, 5)
    },
    /** Panel "¿En qué gasto más?": las mismas categorías, en barras horizontales. */
    categoriasGrafico() {
      const colores = this.$vuetify.theme.current.colors
      return {
        labels: this.categorias.map((c) => c.nombre),
        series: [{ nombre: 'Gasté', datos: this.categorias.map((c) => c.monto), color: colores.error }],
      }
    },
    /** true si casi todo el gasto del período quedó "Sin categoría" (poco útil para declarar o decidir). */
    categoriaSinClasificarDomina() {
      const primera = this.categorias[0]
      return !!primera && primera.nombre === SIN_CATEGORIA && primera.porcentaje >= 60
    },
    mensajeCategorizar() {
      const pct = Math.round(this.categorias[0]?.porcentaje || 0)
      return `${pct}% de tus compras no tienen categoría — categorízalas para ver mejor en qué gastas.`
    },

    proveedoresTop() {
      return topProveedores(this.comprasPeriodo, this.tasaBCV, 5)
    },
    clientesTop() {
      return topClientes(this.ventasPeriodo, this.tasaBCV, 5)
    },

    /** Panel "¿En qué días vendo más?": día a día si el período es corto, por día de semana si es largo ("Este año"). */
    diasGrafico() {
      return agruparVentasPorDia(this.ventasPeriodo, this.rango, this.tasaBCV)
    },
    diasSeries() {
      const colores = this.$vuetify.theme.current.colors
      return [{ nombre: 'Vendí', datos: this.diasGrafico.valores, color: colores.success }]
    },
    /** Frase de lectura: siempre por día de semana, sin importar cómo se agrupe el gráfico arriba. */
    fraseDias() {
      const mejor = diaConMasVentas(this.ventasPeriodo, this.tasaBCV)
      if (!mejor) return '¿Qué días vendes más?'
      return `Vendes más los ${mejor.diaPlural}.`
    },

    /** Panel "¿En qué moneda cobro más?": proporción de ventas por moneda, en USD para comparar. */
    monedaGrafico() {
      const proporcion = proporcionMonedaUsd(this.ventasPeriodo, this.tasaBCV)
      const colores = this.$vuetify.theme.current.colors
      const paletaGris = [colores.secondary, '#9E9E9E', '#BDBDBD', '#E0E0E0']
      return {
        labels: proporcion.map((p) => p.moneda),
        series: [
          {
            nombre: 'Vendí',
            datos: proporcion.map((p) => p.valor),
            color: proporcion.map((_, i) => paletaGris[i] || '#E0E0E0'),
          },
        ],
      }
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

    /** Acción del aviso "categoriza tus compras" — a la pestaña de compras de Mis movimientos. */
    irACategorizar() {
      this.$router.push({ name: 'ClienteFacturacion', query: { tab: 'compras' } })
    },
  },

  async mounted() {

    // Primeros pasos del Inicio: ya conoce «¿Cómo voy?»

    try { localStorage.setItem('ad_visto_como_voy', '1') } catch { /* sin almacenamiento: no pasa nada */ }
    await this.cargarDatos()
  },
}
</script>

<style scoped>
.dashboard-como-voy {
  background-color: rgb(var(--v-theme-background));
  min-height: 100vh;
}

.dashboard-como-voy__frase {
  max-width: 62ch;
  text-wrap: balance;
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
