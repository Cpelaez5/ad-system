<template>
  <v-container fluid class="pa-4">

    <!-- Tarjetas de resumen -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card
          class="pa-6 stats-card"
          height="120"
          style="background-color: #02254d;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Asientos Este Mes</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="resumen.asientosMes"
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
            <div class="text-body-2 text-white mb-4">Ingresos Totales</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              $<AnimatedNumber
                :value="resumen.ingresos"
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
          style="background-color: #f2b648;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Egresos Totales</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              $<AnimatedNumber
                :value="resumen.egresos"
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
            <div class="text-body-2 mb-4" style="color: #010101;">Utilidad Neta</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              $<AnimatedNumber
                :value="resumen.utilidad"
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
    </v-row>

    <!-- Pestañas -->
    <v-tabs v-model="tabActiva" class="mb-4">
      <v-tab value="asientos">
        <v-icon left>mdi-book-plus</v-icon>
        Asientos Contables
      </v-tab>
      <v-tab value="reportes">
        <v-icon left>mdi-chart-line</v-icon>
        Reportes
      </v-tab>
      <v-tab value="cuentas">
        <v-icon left>mdi-format-list-bulleted</v-icon>
        Plan de Cuentas
      </v-tab>
    </v-tabs>

    <v-window v-model="tabActiva">
      <!-- Pestaña de Asientos Contables -->
      <v-window-item value="asientos">
        <v-row class="mb-4">
          <v-col cols="12" class="text-right">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="abrirDialogoNuevoAsiento"
            >
              Nuevo Asiento
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-title>
            <v-icon left>mdi-book-open</v-icon>
            Asientos Contables
          </v-card-title>
          
          <v-data-table
            :headers="headersAsientos"
            :items="asientos"
            :loading="cargando"
            class="elevation-1"
          >
            <template v-slot:item.fecha="{ item }">
              {{ formatearFecha(item.fecha) }}
            </template>
            
            <template v-slot:item.total="{ item }">
              ${{ item.total.toLocaleString() }}
            </template>

            <template v-slot:item.acciones="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                color="info"
                variant="text"
                @click="verAsiento(item)"
              ></v-btn>
              <v-btn
                icon="mdi-pencil"
                size="small"
                color="warning"
                variant="text"
                @click="editarAsiento(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>

      <!-- Pestaña de Reportes -->
      <v-window-item value="reportes">
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-chart-bar</v-icon>
                Balance General
              </v-card-title>
              <v-card-text>
                <p class="text-body-1">Genera el balance general del período seleccionado.</p>
                <v-btn color="primary" @click="generarBalanceGeneral">
                  Generar Reporte
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-chart-pie</v-icon>
                Estado de Resultados
              </v-card-title>
              <v-card-text>
                <p class="text-body-1">Muestra los ingresos, gastos y utilidad del período.</p>
                <v-btn color="primary" @click="generarEstadoResultados">
                  Generar Reporte
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-cash-flow</v-icon>
                Flujo de Caja
              </v-card-title>
              <v-card-text>
                <p class="text-body-1">Analiza el flujo de efectivo del negocio.</p>
                <v-btn color="primary" @click="generarFlujoCaja">
                  Generar Reporte
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-book-open-variant</v-icon>
                Libro Mayor
              </v-card-title>
              <v-card-text>
                <p class="text-body-1">Detalle de movimientos por cuenta contable.</p>
                <v-btn color="primary" @click="generarLibroMayor">
                  Generar Reporte
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- Pestaña de Plan de Cuentas -->
      <v-window-item value="cuentas">
        <v-row class="mb-4">
          <v-col cols="12" class="text-right">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="abrirDialogoNuevaCuenta"
            >
              Nueva Cuenta
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-title>
            <v-icon left>mdi-format-list-bulleted</v-icon>
            Plan de Cuentas
          </v-card-title>
          
          <v-data-table
            :headers="headersCuentas"
            :items="cuentas"
            :loading="cargando"
            class="elevation-1"
          >
            <template v-slot:item.tipo="{ item }">
              <v-chip
                :color="getColorTipoCuenta(item.tipo)"
                variant="tonal"
                size="small"
              >
                {{ item.tipo }}
              </v-chip>
            </template>

            <template v-slot:item.saldo="{ item }">
              ${{ item.saldo.toLocaleString() }}
            </template>

            <template v-slot:item.acciones="{ item }">
              <v-btn
                icon="mdi-pencil"
                size="small"
                color="warning"
                variant="text"
                @click="editarCuenta(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- Diálogo para nuevo asiento -->
    <v-dialog v-model="dialogoAsiento" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Nuevo Asiento Contable</span>
        </v-card-title>
        
        <v-card-text>
          <v-form ref="formularioAsiento" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="asientoForm.numero"
                  label="Número de Asiento"
                  :rules="[v => !!v || 'El número es requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="asientoForm.fecha"
                  label="Fecha"
                  type="date"
                  :rules="[v => !!v || 'La fecha es requerida']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="asientoForm.descripcion"
                  label="Descripción"
                  :rules="[v => !!v || 'La descripción es requerida']"
                  required
                ></v-textarea>
              </v-col>
            </v-row>

            <!-- Movimientos del asiento -->
            <v-divider class="my-4"></v-divider>
            <h3 class="text-h6 mb-3">Movimientos</h3>
            
            <v-row v-for="(movimiento, index) in asientoForm.movimientos" :key="index" class="mb-2">
              <v-col cols="12" md="4">
                <v-select
                  v-model="movimiento.cuenta"
                  :items="cuentas"
                  item-title="nombre"
                  item-value="codigo"
                  label="Cuenta"
                  :rules="[v => !!v || 'La cuenta es requerida']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="movimiento.debe"
                  label="Debe"
                  type="number"
                  :rules="[v => v >= 0 || 'El valor debe ser positivo']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="movimiento.haber"
                  label="Haber"
                  type="number"
                  :rules="[v => v >= 0 || 'El valor debe ser positivo']"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2" class="d-flex align-center">
                <v-btn
                  icon="mdi-delete"
                  color="error"
                  variant="text"
                  @click="eliminarMovimiento(index)"
                  :disabled="asientoForm.movimientos.length === 1"
                ></v-btn>
              </v-col>
            </v-row>

            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="agregarMovimiento"
              class="mb-4"
            >
              Agregar Movimiento
            </v-btn>

            <!-- Validación del asiento -->
            <v-alert
              v-if="!asientoBalanceado"
              type="error"
              class="mb-4"
            >
              El asiento no está balanceado. La suma de debe debe ser igual a la suma de haber.
            </v-alert>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="cerrarDialogoAsiento"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formularioValido || !asientoBalanceado"
            @click="guardarAsiento"
          >
            Guardar Asiento
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import userService from '@/services/userService.js'
import invoiceService from '@/services/invoiceService.js'

export default {
  name: 'Contabilidad',
  components: { AnimatedNumber },
  data() {
    return {
      currentUser: null,
      tabActiva: 'asientos',
      cargando: false,
      dialogoAsiento: false,
      formularioValido: false,
      resumen: {
        asientosMes: 0,
        ingresos: 0,
        egresos: 0,
        utilidad: 0
      },
      headersAsientos: [
        { title: 'Número', key: 'numero', sortable: true },
        { title: 'Fecha', key: 'fecha', sortable: true },
        { title: 'Descripción', key: 'descripcion', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      headersCuentas: [
        { title: 'Código', key: 'codigo', sortable: true },
        { title: 'Nombre', key: 'nombre', sortable: true },
        { title: 'Tipo', key: 'tipo', sortable: true },
        { title: 'Saldo', key: 'saldo', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      asientoForm: {
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        movimientos: [
          {
            cuenta: '',
            debe: 0,
            haber: 0
          }
        ]
      },
      asientos: [],
      cuentas: []
    }
  },
  computed: {
    asientoBalanceado() {
      const totalDebe = this.asientoForm.movimientos.reduce((sum, mov) => sum + (mov.debe || 0), 0)
      const totalHaber = this.asientoForm.movimientos.reduce((sum, mov) => sum + (mov.haber || 0), 0)
      return totalDebe === totalHaber && totalDebe > 0
    }
  },
  async mounted() {
    await this.loadUser()
    await this.loadRealData()
  },
  methods: {
    async loadUser() {
      try {
        this.currentUser = await userService.getCurrentUser()
        if (!this.currentUser || (this.currentUser.role !== 'admin' && this.currentUser.role !== 'contador')) {
          console.warn('⚠️ Usuario sin permisos para esta vista')
          this.$router.push('/dashboard')
        }
      } catch (error) {
        console.error('❌ Error al cargar usuario:', error)
        this.$router.push('/login')
      }
    },
    async loadRealData() {
      this.cargando = true
      try {
        // Obtener todas las facturas de la organización
        const ventas = await invoiceService.getInvoices({ flow: 'VENTA' })
        const compras = await invoiceService.getInvoices({ flow: 'COMPRA' })
        
        // Calcular ingresos (ventas)
        const ingresos = ventas.reduce((sum, inv) => {
          const total = parseFloat(inv.financial?.totalSales || 0)
          return sum + total
        }, 0)
        
        // Calcular egresos (compras)
        const egresos = compras.reduce((sum, inv) => {
          const total = parseFloat(inv.financial?.totalSales || 0)
          return sum + total
        }, 0)
        
        // Actualizar resumen con datos reales
        this.resumen.ingresos = ingresos
        this.resumen.egresos = egresos
        this.resumen.utilidad = ingresos - egresos
        this.resumen.asientosMes = ventas.length + compras.length
        
        // TODO: Cargar asientos contables reales cuando exista la tabla
        // TODO: Cargar plan de cuentas real cuando exista la tabla
        
        console.log('✅ Datos contables cargados:', {
          ingresos: this.resumen.ingresos,
          egresos: this.resumen.egresos,
          utilidad: this.resumen.utilidad,
          asientosMes: this.resumen.asientosMes
        })
      } catch (error) {
        console.error('❌ Error al cargar datos contables:', error)
      } finally {
        this.cargando = false
      }
    },
    abrirDialogoNuevoAsiento() {
      this.asientoForm = {
        numero: '',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        movimientos: [
          {
            cuenta: '',
            debe: 0,
            haber: 0
          }
        ]
      }
      this.dialogoAsiento = true
    },
    agregarMovimiento() {
      this.asientoForm.movimientos.push({
        cuenta: '',
        debe: 0,
        haber: 0
      })
    },
    eliminarMovimiento(index) {
      if (this.asientoForm.movimientos.length > 1) {
        this.asientoForm.movimientos.splice(index, 1)
      }
    },
    cerrarDialogoAsiento() {
      this.dialogoAsiento = false
    },
    guardarAsiento() {
      if (this.$refs.formularioAsiento.validate() && this.asientoBalanceado) {
        const total = this.asientoForm.movimientos.reduce((sum, mov) => sum + (mov.debe || 0), 0)
        
        const nuevoAsiento = {
          id: Date.now(),
          numero: this.asientoForm.numero,
          fecha: this.asientoForm.fecha,
          descripcion: this.asientoForm.descripcion,
          total: total
        }
        
        this.asientos.push(nuevoAsiento)
        this.cerrarDialogoAsiento()
      }
    },
    verAsiento(asiento) {
      console.log('Ver asiento:', asiento)
    },
    editarAsiento(asiento) {
      console.log('Editar asiento:', asiento)
    },
    abrirDialogoNuevaCuenta() {
      console.log('Nueva cuenta')
    },
    editarCuenta(cuenta) {
      console.log('Editar cuenta:', cuenta)
    },
    generarBalanceGeneral() {
      console.log('Generando balance general...')
    },
    generarEstadoResultados() {
      console.log('Generando estado de resultados...')
    },
    generarFlujoCaja() {
      console.log('Generando flujo de caja...')
    },
    generarLibroMayor() {
      console.log('Generando libro mayor...')
    },
    formatearFecha(fecha) {
      return new Date(fecha).toLocaleDateString('es-ES')
    },
    getColorTipoCuenta(tipo) {
      const colores = {
        'Activo': 'success',
        'Pasivo': 'error',
        'Patrimonio': 'info',
        'Ingreso': 'primary',
        'Gasto': 'warning'
      }
      return colores[tipo] || 'grey'
    }
  }
}
</script>

<style scoped>
.v-data-table {
  border-radius: 8px;
}

.v-btn {
  margin: 0 2px;
}
</style>
