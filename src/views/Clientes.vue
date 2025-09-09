<template>
  <v-container fluid class="pa-4">
    <!-- Título de la página -->
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold text-primary">
          <v-icon left size="large">mdi-account-group</v-icon>
          Gestión de Clientes
        </h1>
        <p class="text-subtitle-1 text-grey-darken-1 mt-2">
          Administra la información de tus contribuyentes
        </p>
      </v-col>
    </v-row>

    <!-- Barra de acciones -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="busqueda"
          prepend-inner-icon="mdi-magnify"
          label="Buscar cliente..."
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
        Lista de Clientes ({{ clientesFiltrados.length }})
      </v-card-title>
      
      <v-data-table
        :headers="headers"
        :items="clientesFiltrados"
        :loading="cargando"
        class="elevation-1"
      >
        <!-- Columna de acciones -->
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

        <!-- Columna de estado -->
        <template v-slot:item.estado="{ item }">
          <v-chip
            :color="item.estado === 'Activo' ? 'success' : 'error'"
            variant="tonal"
            size="small"
          >
            {{ item.estado }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Diálogo para nuevo/editar cliente -->
    <v-dialog v-model="dialogoCliente" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">{{ esEdicion ? 'Editar' : 'Nuevo' }} Cliente</span>
        </v-card-title>
        
        <v-card-text>
          <v-form ref="formularioCliente" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.nombre"
                  label="Nombre Completo"
                  :rules="[v => !!v || 'El nombre es requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.identificacion"
                  label="Identificación"
                  :rules="[v => !!v || 'La identificación es requerida']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.email"
                  label="Email"
                  type="email"
                  :rules="[v => !!v || 'El email es requerido', v => /.+@.+\..+/.test(v) || 'Email inválido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="clienteForm.telefono"
                  label="Teléfono"
                  :rules="[v => !!v || 'El teléfono es requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="clienteForm.direccion"
                  label="Dirección"
                  rows="2"
                ></v-textarea>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="clienteForm.tipoCliente"
                  :items="tiposCliente"
                  label="Tipo de Cliente"
                  :rules="[v => !!v || 'El tipo de cliente es requerido']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="clienteForm.estado"
                  :items="estadosCliente"
                  label="Estado"
                  :rules="[v => !!v || 'El estado es requerido']"
                  required
                ></v-select>
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
            :disabled="!formularioValido"
            @click="guardarCliente"
          >
            {{ esEdicion ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: 'Clientes',
  data() {
    return {
      busqueda: '',
      cargando: false,
      dialogoCliente: false,
      esEdicion: false,
      formularioValido: false,
      clienteForm: {
        id: null,
        nombre: '',
        identificacion: '',
        email: '',
        telefono: '',
        direccion: '',
        tipoCliente: '',
        estado: 'Activo'
      },
      tiposCliente: [
        'Persona Natural',
        'Persona Jurídica',
        'Empresa',
        'Organización'
      ],
      estadosCliente: [
        'Activo',
        'Inactivo',
        'Suspendido'
      ],
      headers: [
        { title: 'Nombre', key: 'nombre', sortable: true },
        { title: 'Identificación', key: 'identificacion', sortable: true },
        { title: 'Email', key: 'email', sortable: true },
        { title: 'Teléfono', key: 'telefono', sortable: true },
        { title: 'Tipo', key: 'tipoCliente', sortable: true },
        { title: 'Estado', key: 'estado', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      clientes: [
        {
          id: 1,
          nombre: 'Juan Pérez',
          identificacion: '12345678',
          email: 'juan.perez@email.com',
          telefono: '3001234567',
          direccion: 'Calle 123 #45-67',
          tipoCliente: 'Persona Natural',
          estado: 'Activo'
        },
        {
          id: 2,
          nombre: 'Empresa ABC S.A.S.',
          identificacion: '900123456',
          email: 'contacto@empresaabc.com',
          telefono: '6012345678',
          direccion: 'Carrera 45 #78-90',
          tipoCliente: 'Persona Jurídica',
          estado: 'Activo'
        },
        {
          id: 3,
          nombre: 'María González',
          identificacion: '87654321',
          email: 'maria.gonzalez@email.com',
          telefono: '3007654321',
          direccion: 'Avenida 67 #12-34',
          tipoCliente: 'Persona Natural',
          estado: 'Inactivo'
        }
      ]
    }
  },
  computed: {
    clientesFiltrados() {
      if (!this.busqueda) return this.clientes
      
      const busquedaLower = this.busqueda.toLowerCase()
      return this.clientes.filter(cliente =>
        cliente.nombre.toLowerCase().includes(busquedaLower) ||
        cliente.identificacion.includes(busquedaLower) ||
        cliente.email.toLowerCase().includes(busquedaLower)
      )
    }
  },
  methods: {
    abrirDialogoNuevoCliente() {
      this.esEdicion = false
      this.clienteForm = {
        id: null,
        nombre: '',
        identificacion: '',
        email: '',
        telefono: '',
        direccion: '',
        tipoCliente: '',
        estado: 'Activo'
      }
      this.dialogoCliente = true
    },
    verCliente(cliente) {
      // Implementar vista de cliente
      console.log('Ver cliente:', cliente)
    },
    editarCliente(cliente) {
      this.esEdicion = true
      this.clienteForm = { ...cliente }
      this.dialogoCliente = true
    },
    eliminarCliente(cliente) {
      if (confirm(`¿Está seguro de eliminar al cliente ${cliente.nombre}?`)) {
        const index = this.clientes.findIndex(c => c.id === cliente.id)
        if (index > -1) {
          this.clientes.splice(index, 1)
        }
      }
    },
    cerrarDialogoCliente() {
      this.dialogoCliente = false
      this.clienteForm = {
        id: null,
        nombre: '',
        identificacion: '',
        email: '',
        telefono: '',
        direccion: '',
        tipoCliente: '',
        estado: 'Activo'
      }
    },
    guardarCliente() {
      if (this.$refs.formularioCliente.validate()) {
        if (this.esEdicion) {
          // Actualizar cliente existente
          const index = this.clientes.findIndex(c => c.id === this.clienteForm.id)
          if (index > -1) {
            this.clientes[index] = { ...this.clienteForm }
          }
        } else {
          // Crear nuevo cliente
          this.clienteForm.id = Date.now()
          this.clientes.push({ ...this.clienteForm })
        }
        this.cerrarDialogoCliente()
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
</style>
