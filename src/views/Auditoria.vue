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
            <div class="text-body-2 text-white mb-4">Eventos Registrados</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="resumen.totalEventos"
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
            <div class="text-body-2 text-white mb-4">Usuarios Activos</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="resumen.usuariosActivos"
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
            <div class="text-body-2 mb-4" style="color: #010101;">Alertas de Seguridad</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="resumen.alertas"
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
          style="background-color: #f0d29b;"
        >
          <div class="d-flex flex-column justify-center h-100">
            <div class="text-body-2 mb-4" style="color: #010101;">Respaldos Exitosos</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">
              <AnimatedNumber
                :value="resumen.respaldos"
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

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="filtroTipo"
          :items="tiposEvento"
          label="Tipo de Evento"
          clearable
          variant="outlined"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filtroUsuario"
          :items="usuarios"
          label="Usuario"
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
    </v-row>

    <!-- Pestañas -->
    <v-tabs v-model="tabActiva" class="mb-4">
      <v-tab value="logs">
        <v-icon left>mdi-file-document-outline</v-icon>
        Logs de Actividad
      </v-tab>
      <v-tab value="usuarios">
        <v-icon left>mdi-account-group</v-icon>
        Gestión de Usuarios
      </v-tab>
      <v-tab value="seguridad">
        <v-icon left>mdi-shield-account</v-icon>
        Seguridad
      </v-tab>
      <v-tab value="respaldos">
        <v-icon left>mdi-backup-restore</v-icon>
        Respaldos
      </v-tab>
    <v-tabs-window v-model="tabActiva">
      <!-- Pestaña de Logs -->
      <v-tabs-window-item value="logs">
        <v-card>
          <v-card-title>
            <v-icon left>mdi-history</v-icon>
            Logs de Actividad ({{ logsFiltrados.length }})
          </v-card-title>
          
          <v-data-table
            :headers="headersLogs"
            :items="logsFiltrados"
            :loading="cargando"
            class="elevation-1"
          >
            <template v-slot:item.fecha="{ item }">
              {{ formatearFechaHora(item.fecha) }}
            </template>

            <template v-slot:item.tipo="{ item }">
              <v-chip
                :color="getColorTipoEvento(item.tipo)"
                variant="tonal"
                size="small"
              >
                {{ item.tipo }}
              </v-chip>
            </template>

            <template v-slot:item.detalles="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                color="info"
                variant="text"
                @click="verDetallesLog(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-tabs-window-item>

      <!-- Pestaña de Usuarios -->
      <v-tabs-window-item value="usuarios">
        <v-row class="mb-4">
          <v-col cols="12" class="text-right">
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="abrirDialogoNuevoUsuario"
            >
              Nuevo Usuario
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-title>
            <v-icon left>mdi-account-multiple</v-icon>
            Usuarios del Sistema
          </v-card-title>
          
          <v-data-table
            :headers="headersUsuarios"
            :items="usuarios"
            :loading="cargando"
            class="elevation-1"
          >
            <template v-slot:item.estado="{ item }">
              <v-chip
                :color="item.estado === 'Activo' ? 'success' : 'error'"
                variant="tonal"
                size="small"
              >
                {{ item.estado }}
              </v-chip>
            </template>

            <template v-slot:item.ultimoAcceso="{ item }">
              {{ formatearFechaHora(item.ultimoAcceso) }}
            </template>

            <template v-slot:item.acciones="{ item }">
              <v-btn
                icon="mdi-pencil"
                size="small"
                color="warning"
                variant="text"
                @click="editarUsuario(item)"
              ></v-btn>
              <v-btn
                icon="mdi-key"
                size="small"
                color="info"
                variant="text"
                @click="cambiarPassword(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-tabs-window-item>

      <!-- Pestaña de Seguridad -->
      <v-tabs-window-item value="seguridad">
        <v-row>
          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-shield-alert</v-icon>
                Alertas de Seguridad
              </v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item
                    v-for="alerta in alertasSeguridad"
                    :key="alerta.id"
                    :prepend-icon="alerta.icono"
                  >
                    <v-list-item-title>{{ alerta.titulo }}</v-list-item-title>
                    <v-list-item-subtitle>{{ alerta.descripcion }}</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-chip
                        :color="alerta.criticidad === 'Alta' ? 'error' : 'warning'"
                        size="small"
                      >
                        {{ alerta.criticidad }}
                      </v-chip>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card class="pa-4">
              <v-card-title>
                <v-icon left>mdi-lock-reset</v-icon>
                Configuración de Seguridad
              </v-card-title>
              <v-card-text>
                <v-list>
                  <v-list-item>
                    <v-list-item-title>Contraseñas</v-list-item-title>
                    <v-list-item-subtitle>Política de contraseñas seguras</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-switch
                        v-model="configSeguridad.passwordsSeguras"
                        color="primary"
                      ></v-switch>
                    </template>
                  </v-list-item>
                  
                  <v-list-item>
                    <v-list-item-title>Autenticación de dos factores</v-list-item-title>
                    <v-list-item-subtitle>2FA para usuarios administrativos</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-switch
                        v-model="configSeguridad.dosFactores"
                        color="primary"
                      ></v-switch>
                    </template>
                  </v-list-item>
                  
                  <v-list-item>
                    <v-list-item-title>Logs de sesión</v-list-item-title>
                    <v-list-item-subtitle>Registrar todas las sesiones</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-switch
                        v-model="configSeguridad.logsSesion"
                        color="primary"
                      ></v-switch>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-tabs-window-item>

      <!-- Pestaña de Respaldos -->
      <v-tabs-window-item value="respaldos">
        <v-row class="mb-4">
          <v-col cols="12" class="text-right">
            <v-btn
              color="primary"
              prepend-icon="mdi-backup-restore"
              @click="crearRespaldo"
            >
              Crear Respaldo
            </v-btn>
          </v-col>
        </v-row>

        <v-card>
          <v-card-title>
            <v-icon left>mdi-database</v-icon>
            Historial de Respaldos
          </v-card-title>
          
          <v-data-table
            :headers="headersRespaldos"
            :items="respaldos"
            :loading="cargando"
            class="elevation-1"
          >
            <template v-slot:item.fecha="{ item }">
              {{ formatearFechaHora(item.fecha) }}
            </template>

            <template v-slot:item.tamaño="{ item }">
              {{ formatearTamaño(item.tamaño) }}
            </template>

            <template v-slot:item.estado="{ item }">
              <v-chip
                :color="item.estado === 'Exitoso' ? 'success' : 'error'"
                variant="tonal"
                size="small"
              >
                {{ item.estado }}
              </v-chip>
            </template>

            <template v-slot:item.acciones="{ item }">
              <v-btn
                icon="mdi-download"
                size="small"
                color="success"
                variant="text"
                @click="descargarRespaldo(item)"
                :disabled="item.estado !== 'Exitoso'"
              ></v-btn>
              <v-btn
                icon="mdi-restore"
                size="small"
                color="warning"
                variant="text"
                @click="restaurarRespaldo(item)"
                :disabled="item.estado !== 'Exitoso'"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-tabs-window-item>
    </v-tabs-window>
    </v-tabs>
  </v-container>
</template>

<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
export default {
  name: 'Auditoria',
  components: { AnimatedNumber },
  data() {
    return {
      tabActiva: 'logs',
      cargando: false,
      filtroTipo: null,
      filtroUsuario: null,
      filtroFechaInicio: '',
      filtroFechaFin: '',
      resumen: {
        totalEventos: 1247,
        usuariosActivos: 8,
        alertas: 3,
        respaldos: 15
      },
      tiposEvento: [
        'Login',
        'Logout',
        'Crear',
        'Editar',
        'Eliminar',
        'Descargar',
        'Error',
        'Seguridad'
      ],
      headersLogs: [
        { title: 'Fecha', key: 'fecha', sortable: true },
        { title: 'Usuario', key: 'usuario', sortable: true },
        { title: 'Tipo', key: 'tipo', sortable: true },
        { title: 'Descripción', key: 'descripcion', sortable: true },
        { title: 'IP', key: 'ip', sortable: true },
        { title: 'Detalles', key: 'detalles', sortable: false }
      ],
      headersUsuarios: [
        { title: 'Usuario', key: 'usuario', sortable: true },
        { title: 'Nombre', key: 'nombre', sortable: true },
        { title: 'Rol', key: 'rol', sortable: true },
        { title: 'Estado', key: 'estado', sortable: true },
        { title: 'Último Acceso', key: 'ultimoAcceso', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      headersRespaldos: [
        { title: 'Fecha', key: 'fecha', sortable: true },
        { title: 'Tipo', key: 'tipo', sortable: true },
        { title: 'Tamaño', key: 'tamaño', sortable: true },
        { title: 'Estado', key: 'estado', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      configSeguridad: {
        passwordsSeguras: true,
        dosFactores: false,
        logsSesion: true
      },
      logs: [
        {
          id: 1,
          fecha: '2024-01-20T10:30:00',
          usuario: 'admin',
          tipo: 'Login',
          descripcion: 'Inicio de sesión exitoso',
          ip: '192.168.1.100'
        },
        {
          id: 2,
          fecha: '2024-01-20T10:25:00',
          usuario: 'contador1',
          tipo: 'Crear',
          descripcion: 'Nueva factura creada',
          ip: '192.168.1.101'
        },
        {
          id: 3,
          fecha: '2024-01-20T10:20:00',
          usuario: 'admin',
          tipo: 'Error',
          descripcion: 'Error al procesar archivo',
          ip: '192.168.1.100'
        }
      ],
      usuarios: [
        {
          id: 1,
          usuario: 'admin',
          nombre: 'Administrador',
          rol: 'Administrador',
          estado: 'Activo',
          ultimoAcceso: '2024-01-20T10:30:00'
        },
        {
          id: 2,
          usuario: 'contador1',
          nombre: 'Juan Pérez',
          rol: 'Contador',
          estado: 'Activo',
          ultimoAcceso: '2024-01-20T09:45:00'
        },
        {
          id: 3,
          usuario: 'auditor1',
          nombre: 'María González',
          rol: 'Auditor',
          estado: 'Inactivo',
          ultimoAcceso: '2024-01-19T16:20:00'
        }
      ],
      respaldos: [
        {
          id: 1,
          fecha: '2024-01-20T02:00:00',
          tipo: 'Completo',
          tamaño: 1024000000,
          estado: 'Exitoso'
        },
        {
          id: 2,
          fecha: '2024-01-19T02:00:00',
          tipo: 'Incremental',
          tamaño: 512000000,
          estado: 'Exitoso'
        },
        {
          id: 3,
          fecha: '2024-01-18T02:00:00',
          tipo: 'Completo',
          tamaño: 0,
          estado: 'Error'
        }
      ],
      alertasSeguridad: [
        {
          id: 1,
          titulo: 'Múltiples intentos de login fallidos',
          descripcion: 'Usuario admin - 5 intentos fallidos',
          criticidad: 'Alta',
          icono: 'mdi-alert-circle'
        },
        {
          id: 2,
          titulo: 'Acceso desde IP no reconocida',
          descripcion: 'IP 203.0.113.1 - Usuario contador1',
          criticidad: 'Media',
          icono: 'mdi-shield-alert'
        }
      ]
    }
  },
  computed: {
    logsFiltrados() {
      let logs = this.logs

      if (this.filtroTipo) {
        logs = logs.filter(log => log.tipo === this.filtroTipo)
      }

      if (this.filtroUsuario) {
        logs = logs.filter(log => log.usuario === this.filtroUsuario)
      }

      return logs
    }
  },
  methods: {
    abrirDialogoNuevoUsuario() {
      console.log('Nuevo usuario')
    },
    editarUsuario(usuario) {
      console.log('Editar usuario:', usuario)
    },
    cambiarPassword(usuario) {
      console.log('Cambiar password:', usuario)
    },
    verDetallesLog(log) {
      console.log('Ver detalles:', log)
    },
    crearRespaldo() {
      console.log('Creando respaldo...')
    },
    descargarRespaldo(respaldo) {
      console.log('Descargar respaldo:', respaldo)
    },
    restaurarRespaldo(respaldo) {
      console.log('Restaurar respaldo:', respaldo)
    },
    formatearFechaHora(fecha) {
      return new Date(fecha).toLocaleString('es-ES')
    },
    formatearTamaño(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    getColorTipoEvento(tipo) {
      const colores = {
        'Login': 'success',
        'Logout': 'info',
        'Crear': 'primary',
        'Editar': 'warning',
        'Eliminar': 'error',
        'Descargar': 'secondary',
        'Error': 'error',
        'Seguridad': 'purple'
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
