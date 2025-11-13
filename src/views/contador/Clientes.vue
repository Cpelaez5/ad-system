<template>
  <v-container fluid class="pa-4">
    <!-- Tarjetas de estadísticas -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #02254d;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Total Clientes</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.total" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #961112;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 text-white mb-4">Clientes Activos</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.activos" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f2b648;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Personas Jurídicas</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.juridicas" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-6 stats-card" height="120" style="background-color: #f0d29b;">
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Personas Naturales</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber :value="stats.naturales" :start="0" :duration="900" :adaptive="false" :min-duration="300" :max-duration="1000" easing="easeOutQuint" locale="es-VE" :minimum-fraction-digits="0" :maximum-fraction-digits="0" />
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Barra de acciones -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="busqueda"
          prepend-inner-icon="mdi-magnify"
          label="Buscar cliente por nombre, RIF o email..."
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
          @click="abrirDialogoNuevoCliente"
        >
          Nuevo Cliente
        </v-btn>
      </v-col>
    </v-row>

    <!-- Tabla de clientes -->
    <v-card>
      <v-card-title>
        <v-icon left>mdi-account-multiple</v-icon>
        Clientes de mi Organización ({{ clientesFiltrados.length }})
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="clientesFiltrados"
        :loading="cargando"
        class="elevation-1"
        :items-per-page="10"
      >
        <template v-slot:item.companyName="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.companyName }}</div>
            <div class="text-caption text-grey">{{ item.rif }}</div>
          </div>
        </template>
        
        <template v-slot:item.status="{ item }">
          <v-chip
            :color="item.status === 'ACTIVO' ? 'success' : 'error'"
            variant="tonal"
            size="small"
          >
            {{ item.status }}
          </v-chip>
        </template>

        <template v-slot:item.taxpayerType="{ item }">
          <v-chip
            :color="item.taxpayerType === 'JURIDICA' ? 'primary' : 'info'"
            variant="tonal"
            size="small"
          >
            {{ item.taxpayerType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}
          </v-chip>
        </template>

        <template v-slot:item.acciones="{ item }">
          <v-btn
            icon="mdi-eye"
            size="small"
            color="info"
            variant="text"
            @click="verCliente(item)"
          ></v-btn>
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="warning"
            variant="text"
            @click="editarCliente(item)"
          ></v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="text"
            @click="eliminarCliente(item)"
          ></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo para nuevo/editar cliente -->
    <v-dialog v-model="dialogoCliente" max-width="800px" scrollable>
      <v-card>
        <v-card-title>
          <v-icon left>{{ esEdicion ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
          {{ esEdicion ? 'Editar' : 'Nuevo' }} Cliente
        </v-card-title>
        
        <v-card-text>
          <v-form ref="formularioCliente" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.companyName"
                  label="Nombre de la Empresa / Razón Social"
                  :rules="[v => !!v || 'El nombre es requerido']"
                  required
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.rif"
                  label="RIF"
                  :rules="[v => !!v || 'El RIF es requerido']"
                  required
                  variant="outlined"
                  hint="Formato: J-12345678-9"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="clienteForm.taxpayerType"
                  :items="tiposCliente"
                  label="Tipo de Contribuyente"
                  :rules="[v => !!v || 'El tipo es requerido']"
                  required
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="clienteForm.status"
                  :items="estadosCliente"
                  label="Estado"
                  :rules="[v => !!v || 'El estado es requerido']"
                  required
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.email"
                  label="Email"
                  type="email"
                  :rules="[v => !!v || 'El email es requerido', v => /.+@.+\..+/.test(v) || 'Email inválido']"
                  required
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.phone"
                  label="Teléfono"
                  :rules="[v => !!v || 'El teléfono es requerido']"
                  required
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="clienteForm.address"
                  label="Dirección"
                  rows="2"
                  variant="outlined"
                ></v-textarea>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.contactPerson"
                  label="Persona de Contacto"
                  variant="outlined"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.website"
                  label="Sitio Web"
                  variant="outlined"
                  hint="Opcional"
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
            @click="cerrarDialogoCliente"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formularioValido || guardando"
            :loading="guardando"
            @click="guardarCliente"
          >
            {{ esEdicion ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo para ver cliente -->
    <v-dialog v-model="dialogoVerCliente" max-width="600px">
      <v-card v-if="clienteSeleccionado">
        <v-card-title>
          <v-icon left>mdi-account</v-icon>
          {{ clienteSeleccionado.companyName }}
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <strong>RIF:</strong> {{ clienteSeleccionado.rif }}
            </v-col>
            <v-col cols="12" md="6">
              <strong>Tipo:</strong> 
              <v-chip
                :color="clienteSeleccionado.taxpayerType === 'JURIDICA' ? 'primary' : 'info'"
                variant="tonal"
                size="small"
              >
                {{ clienteSeleccionado.taxpayerType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <strong>Estado:</strong> 
              <v-chip
                :color="clienteSeleccionado.status === 'ACTIVO' ? 'success' : 'error'"
                variant="tonal"
                size="small"
              >
                {{ clienteSeleccionado.status }}
              </v-chip>
            </v-col>
            <v-col cols="12" md="6">
              <strong>Email:</strong> {{ clienteSeleccionado.email || 'N/A' }}
            </v-col>
            <v-col cols="12" md="6">
              <strong>Teléfono:</strong> {{ clienteSeleccionado.phone || 'N/A' }}
            </v-col>
            <v-col cols="12" md="6">
              <strong>Contacto:</strong> {{ clienteSeleccionado.contactPerson || 'N/A' }}
            </v-col>
            <v-col cols="12">
              <strong>Dirección:</strong> {{ clienteSeleccionado.address || 'N/A' }}
            </v-col>
            <v-col cols="12" v-if="clienteSeleccionado.website">
              <strong>Sitio Web:</strong> {{ clienteSeleccionado.website }}
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="editarCliente(clienteSeleccionado)">Editar</v-btn>
          <v-btn color="grey" variant="text" @click="dialogoVerCliente = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo de confirmación de eliminación -->
    <v-dialog v-model="dialogoEliminar" max-width="400px">
      <v-card>
        <v-card-title>Confirmar Eliminación</v-card-title>
        <v-card-text>
          ¿Está seguro de eliminar al cliente <strong>{{ clienteAEliminar?.companyName }}</strong>?
          <br><br>
          <v-alert type="warning" variant="tonal" density="compact">
            Esta acción no se puede deshacer. Se eliminarán también todas las facturas asociadas.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="dialogoEliminar = false">Cancelar</v-btn>
          <v-btn color="error" :loading="eliminando" @click="confirmarEliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import clientService from '@/services/clientService.js';
import userService from '@/services/userService.js';
import AnimatedNumber from '@/components/common/AnimatedNumber.vue';

export default {
  name: 'Clientes',
  components: { AnimatedNumber },
  data() {
    return {
      busqueda: '',
      cargando: false,
      guardando: false,
      eliminando: false,
      dialogoCliente: false,
      dialogoVerCliente: false,
      dialogoEliminar: false,
      esEdicion: false,
      formularioValido: false,
      currentUser: null,
      clienteSeleccionado: null,
      clienteAEliminar: null,
      clienteForm: {
        id: null,
        companyName: '',
        rif: '',
        taxpayerType: 'JURIDICA',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        website: '',
        status: 'ACTIVO'
      },
      tiposCliente: [
        { title: 'Persona Jurídica', value: 'JURIDICA' },
        { title: 'Persona Natural', value: 'NATURAL' }
      ],
      estadosCliente: [
        { title: 'Activo', value: 'ACTIVO' },
        { title: 'Inactivo', value: 'INACTIVO' },
        { title: 'Suspendido', value: 'SUSPENDIDO' }
      ],
      headers: [
        { title: 'Cliente', key: 'companyName', sortable: true },
        { title: 'Email', key: 'email', sortable: true },
        { title: 'Teléfono', key: 'phone', sortable: true },
        { title: 'Tipo', key: 'taxpayerType', sortable: true },
        { title: 'Estado', key: 'status', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      clientes: [],
      stats: {
        total: 0,
        activos: 0,
        juridicas: 0,
        naturales: 0
      }
    }
  },
  async mounted() {
    await this.loadUser()
    await this.cargarClientes()
  },
  computed: {
    clientesFiltrados() {
      if (!this.busqueda) return this.clientes
      
      const busquedaLower = this.busqueda.toLowerCase()
      return this.clientes.filter(cliente =>
        cliente.companyName?.toLowerCase().includes(busquedaLower) ||
        cliente.rif?.toLowerCase().includes(busquedaLower) ||
        cliente.email?.toLowerCase().includes(busquedaLower) ||
        cliente.contactPerson?.toLowerCase().includes(busquedaLower)
      )
    }
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
    async cargarClientes() {
      try {
        this.cargando = true
        console.log('🔄 Cargando clientes de la organización...')
        
        const clientesData = await clientService.getClients()
        this.clientes = clientesData || []
        console.log('✅ Clientes cargados:', this.clientes.length)
        
        this.calcularStats()
        
      } catch (error) {
        console.error('❌ Error al cargar clientes:', error)
        this.clientes = []
      } finally {
        this.cargando = false
      }
    },
    calcularStats() {
      this.stats.total = this.clientes.length
      this.stats.activos = this.clientes.filter(c => c.status === 'ACTIVO').length
      this.stats.juridicas = this.clientes.filter(c => c.taxpayerType === 'JURIDICA').length
      this.stats.naturales = this.clientes.filter(c => c.taxpayerType === 'NATURAL').length
    },
    abrirDialogoNuevoCliente() {
      this.esEdicion = false
      this.clienteForm = {
        id: null,
        companyName: '',
        rif: '',
        taxpayerType: 'JURIDICA',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        website: '',
        status: 'ACTIVO'
      }
      this.dialogoCliente = true
    },
    verCliente(cliente) {
      this.clienteSeleccionado = cliente
      this.dialogoVerCliente = true
    },
    editarCliente(cliente) {
      this.esEdicion = true
      this.clienteSeleccionado = null
      this.dialogoVerCliente = false
      this.clienteForm = {
        id: cliente.id,
        companyName: cliente.companyName,
        rif: cliente.rif,
        taxpayerType: cliente.taxpayerType,
        email: cliente.email,
        phone: cliente.phone,
        address: cliente.address || '',
        contactPerson: cliente.contactPerson || '',
        website: cliente.website || '',
        status: cliente.status
      }
      this.dialogoCliente = true
    },
    eliminarCliente(cliente) {
      this.clienteAEliminar = cliente
      this.dialogoEliminar = true
    },
    async confirmarEliminar() {
      if (!this.clienteAEliminar) return
      
      try {
        this.eliminando = true
        console.log('🔄 Eliminando cliente:', this.clienteAEliminar.companyName)
        
        const result = await clientService.deleteClient(this.clienteAEliminar.id)
        
        if (result && result.success === false) {
          const errorMsg = result.message || 'Error al eliminar cliente'
          console.error('❌ Error al eliminar cliente:', errorMsg)
          alert('Error al eliminar cliente: ' + errorMsg)
        } else if (result && result.id) {
          console.log('✅ Cliente eliminado exitosamente')
          await this.cargarClientes()
          this.dialogoEliminar = false
          this.clienteAEliminar = null
        } else {
          console.error('❌ Error desconocido al eliminar cliente')
          alert('Error al eliminar cliente')
        }
      } catch (error) {
        console.error('❌ Error inesperado al eliminar cliente:', error)
        alert('Error inesperado al eliminar cliente')
      } finally {
        this.eliminando = false
      }
    },
    cerrarDialogoCliente() {
      this.dialogoCliente = false
      this.clienteForm = {
        id: null,
        companyName: '',
        rif: '',
        taxpayerType: 'JURIDICA',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        website: '',
        status: 'ACTIVO'
      }
    },
    async guardarCliente() {
      if (!this.$refs.formularioCliente.validate()) {
        return
      }
      
      try {
        this.guardando = true
        console.log('🔄 Guardando cliente...')
        
        if (this.esEdicion) {
          // Actualizar cliente existente
          const result = await clientService.updateClient(this.clienteForm.id, this.clienteForm)
          
          if (result && result.success === false) {
            const errorMsg = result.message || 'Error al actualizar cliente'
            console.error('❌ Error al actualizar cliente:', errorMsg)
            alert('Error al actualizar cliente: ' + errorMsg)
          } else if (result && result.id) {
            console.log('✅ Cliente actualizado exitosamente')
            await this.cargarClientes()
            this.cerrarDialogoCliente()
          } else {
            console.error('❌ Error desconocido al actualizar cliente')
            alert('Error al actualizar cliente')
          }
        } else {
          // Crear nuevo cliente
          const result = await clientService.createClient(this.clienteForm)
          
          if (result && result.success === false) {
            const errorMsg = result.message || 'Error al crear cliente'
            console.error('❌ Error al crear cliente:', errorMsg)
            alert('Error al crear cliente: ' + errorMsg)
          } else if (result && result.id) {
            console.log('✅ Cliente creado exitosamente')
            await this.cargarClientes()
            this.cerrarDialogoCliente()
          } else {
            console.error('❌ Error desconocido al crear cliente')
            alert('Error al crear cliente')
          }
        }
      } catch (error) {
        console.error('❌ Error inesperado al guardar cliente:', error)
        alert('Error inesperado al guardar cliente')
      } finally {
        this.guardando = false
      }
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

.stats-card {
  border-radius: 20px !important;
  box-shadow: none !important;
  padding: 20px !important;
}
</style>
