<template>
  <v-container fluid class="pa-4">

    <!-- Barra de acciones -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="busqueda"
          prepend-inner-icon="mdi-magnify"
          label="Buscar factura..."
          variant="outlined"
          clearable
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-plus"
          @click="abrirDialogoNuevaFactura"
        >
          Nueva Factura
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="filtroEstado"
          :items="estadosFactura"
          label="Estado"
          clearable
          variant="outlined"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filtroFechaInicio"
          label="Fecha Inicio"
          type="date"
          variant="outlined"
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3">
        <v-text-field
          v-model="filtroFechaFin"
          label="Fecha Fin"
          type="date"
          variant="outlined"
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-center">
        <v-btn
          color="secondary"
          variant="outlined"
          @click="aplicarFiltros"
        >
          Aplicar Filtros
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tabla de facturas -->
    <v-card>
      <v-card-title>
        <v-icon left>mdi-receipt-long</v-icon>
        Lista de Facturas ({{ facturasFiltradas.length }})
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="facturasFiltradas"
        :loading="cargando"
        class="elevation-1"
      >
        <!-- Columna de número de factura -->
        <template v-slot:item.numero="{ item }">
          <v-chip color="primary" variant="tonal">
            {{ item.numero }}
          </v-chip>
        </template>

        <!-- Columna de fecha -->
        <template v-slot:item.fecha="{ item }">
          {{ formatearFecha(item.fecha) }}
        </template>

        <!-- Columna de total -->
        <template v-slot:item.total="{ item }">
          ${{ item.total.toLocaleString() }}
        </template>

        <!-- Columna de estado -->
        <template v-slot:item.estado="{ item }">
          <v-chip
            :color="getColorEstado(item.estado)"
            variant="tonal"
            size="small"
          >
            {{ item.estado }}
          </v-chip>
        </template>

        <!-- Columna de acciones -->
        <template v-slot:item.acciones="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            color="info"
            variant="text"
            @click="verFactura(item)"
          ></v-btn>
          <v-btn
            icon="mdi-download"
            size="small"
            color="success"
            variant="text"
            @click="descargarFactura(item)"
          ></v-btn>
          <v-btn
            icon="mdi-email"
            size="small"
            color="warning"
            variant="text"
            @click="enviarFactura(item)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo para nueva factura -->
    <v-dialog v-model="dialogoFactura" max-width="800px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Nueva Factura</span>
        </v-card-title>
        
        <v-card-text>
          <v-form ref="formularioFactura" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="facturaForm.clienteId"
                  :items="clientes"
                  item-title="nombre"
                  item-value="id"
                  label="Cliente"
                  :rules="[v => !!v || 'El cliente es requerido']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="facturaForm.fecha"
                  label="Fecha"
                  type="date"
                  :rules="[v => !!v || 'La fecha es requerida']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="facturaForm.vencimiento"
                  label="Fecha de Vencimiento"
                  type="date"
                  :rules="[v => !!v || 'La fecha de vencimiento es requerida']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="facturaForm.observaciones"
                  label="Observaciones"
                ></v-text-field>
              </v-col>
            </v-row>

            <!-- Productos/Servicios -->
            <v-divider class="my-4"></v-divider>
            <h3 class="text-h6 mb-3">Productos/Servicios</h3>
            
            <v-row v-for="(item, index) in facturaForm.items" :key="index" class="mb-2">
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="item.descripcion"
                  label="Descripción"
                  :rules="[v => !!v || 'La descripción es requerida']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="item.cantidad"
                  label="Cantidad"
                  type="number"
                  :rules="[v => v > 0 || 'La cantidad debe ser mayor a 0']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model.number="item.precio"
                  label="Precio Unit."
                  type="number"
                  :rules="[v => v > 0 || 'El precio debe ser mayor a 0']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  :model-value="item.cantidad * item.precio"
                  label="Total"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2" class="d-flex align-center">
                <v-btn
                  icon="mdi-delete"
                  color="error"
                  variant="text"
                  @click="eliminarItem(index)"
                  :disabled="facturaForm.items.length === 1"
                ></v-btn>
              </v-col>
            </v-row>

            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-plus"
              @click="agregarItem"
              class="mb-4"
            >
              Agregar Item
            </v-btn>

            <!-- Totales -->
            <v-divider class="my-4"></v-divider>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="facturaForm.subtotal"
                  label="Subtotal"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="facturaForm.iva"
                  label="IVA (19%)"
                  readonly
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="facturaForm.total"
                  label="Total"
                  readonly
                  class="text-h6 font-weight-bold"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="cerrarDialogoFactura"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formularioValido"
            @click="guardarFactura"
          >
            Crear Factura
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: 'Facturacion',
  data() {
    return {
      busqueda: '',
      cargando: false,
      dialogoFactura: false,
      formularioValido: false,
      filtroEstado: null,
      filtroFechaInicio: '',
      filtroFechaFin: '',
      estadosFactura: [
        'Borrador',
        'Emitida',
        'Enviada',
        'Pagada',
        'Vencida',
        'Anulada'
      ],
      headers: [
        { title: 'Número', key: 'numero', sortable: true },
        { title: 'Cliente', key: 'cliente', sortable: true },
        { title: 'Fecha', key: 'fecha', sortable: true },
        { title: 'Vencimiento', key: 'vencimiento', sortable: true },
        { title: 'Total', key: 'total', sortable: true },
        { title: 'Estado', key: 'estado', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      facturaForm: {
        clienteId: null,
        fecha: new Date().toISOString().split('T')[0],
        vencimiento: '',
        observaciones: '',
        items: [
          {
            descripcion: '',
            cantidad: 1,
            precio: 0
          }
        ],
        subtotal: 0,
        iva: 0,
        total: 0
      },
      clientes: [
        { id: 1, nombre: 'Juan Pérez' },
        { id: 2, nombre: 'Empresa ABC S.A.S.' },
        { id: 3, nombre: 'María González' }
      ],
      facturas: [
        {
          id: 1,
          numero: 'FAC-001',
          cliente: 'Juan Pérez',
          fecha: '2024-01-15',
          vencimiento: '2024-02-15',
          total: 150000,
          estado: 'Emitida'
        },
        {
          id: 2,
          numero: 'FAC-002',
          cliente: 'Empresa ABC S.A.S.',
          fecha: '2024-01-16',
          vencimiento: '2024-02-16',
          total: 250000,
          estado: 'Pagada'
        },
        {
          id: 3,
          numero: 'FAC-003',
          cliente: 'María González',
          fecha: '2024-01-17',
          vencimiento: '2024-02-17',
          total: 75000,
          estado: 'Vencida'
        }
      ]
    }
  },
  computed: {
    facturasFiltradas() {
      let facturas = this.facturas

      // Filtro por búsqueda
      if (this.busqueda) {
        const busquedaLower = this.busqueda.toLowerCase()
        facturas = facturas.filter(factura =>
          factura.numero.toLowerCase().includes(busquedaLower) ||
          factura.cliente.toLowerCase().includes(busquedaLower)
        )
      }

      // Filtro por estado
      if (this.filtroEstado) {
        facturas = facturas.filter(factura => factura.estado === this.filtroEstado)
      }

      return facturas
    }
  },
  watch: {
    'facturaForm.items': {
      handler() {
        this.calcularTotales()
      },
      deep: true
    }
  },
  methods: {
    abrirDialogoNuevaFactura() {
      this.facturaForm = {
        clienteId: null,
        fecha: new Date().toISOString().split('T')[0],
        vencimiento: '',
        observaciones: '',
        items: [
          {
            descripcion: '',
            cantidad: 1,
            precio: 0
          }
        ],
        subtotal: 0,
        iva: 0,
        total: 0
      }
      this.dialogoFactura = true
    },
    agregarItem() {
      this.facturaForm.items.push({
        descripcion: '',
        cantidad: 1,
        precio: 0
      })
    },
    eliminarItem(index) {
      if (this.facturaForm.items.length > 1) {
        this.facturaForm.items.splice(index, 1)
      }
    },
    calcularTotales() {
      this.facturaForm.subtotal = this.facturaForm.items.reduce((total, item) => {
        return total + (item.cantidad * item.precio)
      }, 0)
      
      this.facturaForm.iva = this.facturaForm.subtotal * 0.19
      this.facturaForm.total = this.facturaForm.subtotal + this.facturaForm.iva
    },
    cerrarDialogoFactura() {
      this.dialogoFactura = false
    },
    guardarFactura() {
      if (this.$refs.formularioFactura.validate()) {
        const nuevaFactura = {
          id: Date.now(),
          numero: `FAC-${String(this.facturas.length + 1).padStart(3, '0')}`,
          cliente: this.clientes.find(c => c.id === this.facturaForm.clienteId)?.nombre || '',
          fecha: this.facturaForm.fecha,
          vencimiento: this.facturaForm.vencimiento,
          total: this.facturaForm.total,
          estado: 'Borrador'
        }
        
        this.facturas.push(nuevaFactura)
        this.cerrarDialogoFactura()
      }
    },
    verFactura(factura) {
      console.log('Ver factura:', factura)
    },
    descargarFactura(factura) {
      console.log('Descargar factura:', factura)
    },
    enviarFactura(factura) {
      console.log('Enviar factura:', factura)
    },
    aplicarFiltros() {
      // Los filtros se aplican automáticamente por computed
      console.log('Aplicando filtros...')
    },
    formatearFecha(fecha) {
      return new Date(fecha).toLocaleDateString('es-ES')
    },
    getColorEstado(estado) {
      const colores = {
        'Borrador': 'grey',
        'Emitida': 'info',
        'Enviada': 'warning',
        'Pagada': 'success',
        'Vencida': 'error',
        'Anulada': 'error'
      }
      return colores[estado] || 'grey'
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
