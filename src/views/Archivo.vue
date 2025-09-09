<template>
  <v-container fluid class="pa-4">
    <!-- Título de la página -->
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h4 font-weight-bold text-primary">
          <v-icon left size="large">mdi-folder-multiple</v-icon>
          Archivo Digital
        </h1>
        <p class="text-subtitle-1 text-grey-darken-1 mt-2">
          Gestiona y organiza tus documentos digitales
        </p>
      </v-col>
    </v-row>

    <!-- Tarjetas de resumen -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card color="primary" variant="tonal" class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-file-document-multiple</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ resumen.totalDocumentos }}</div>
              <div class="text-body-2">Documentos Archivados</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="success" variant="tonal" class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-folder-open</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ resumen.carpetas }}</div>
              <div class="text-body-2">Carpetas Creadas</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="info" variant="tonal" class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-harddisk</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ formatearTamaño(resumen.espacioUsado) }}</div>
              <div class="text-body-2">Espacio Usado</div>
            </div>
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card color="warning" variant="tonal" class="pa-4">
          <div class="d-flex align-center">
            <v-icon size="40" class="mr-3">mdi-upload</v-icon>
            <div>
              <div class="text-h4 font-weight-bold">{{ resumen.subidasHoy }}</div>
              <div class="text-body-2">Subidas Hoy</div>
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
          label="Buscar documentos..."
          variant="outlined"
          clearable
          hide-details
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6" class="text-right">
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-upload"
          @click="abrirDialogoSubida"
        >
          Subir Documentos
        </v-btn>
      </v-col>
    </v-row>

    <!-- Filtros -->
    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-select
          v-model="filtroCategoria"
          :items="categorias"
          label="Categoría"
          clearable
          variant="outlined"
          hide-details
        ></v-select>
      </v-col>
      <v-col cols="12" md="3">
        <v-select
          v-model="filtroTipo"
          :items="tiposDocumento"
          label="Tipo de Documento"
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

    <!-- Vista de carpetas y documentos -->
    <v-row>
      <v-col cols="12" md="3">
        <!-- Navegación de carpetas -->
        <v-card>
          <v-card-title>
            <v-icon left>mdi-folder-tree</v-icon>
            Carpetas
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="carpeta in carpetas"
                :key="carpeta.id"
                :prepend-icon="carpeta.icono"
                :title="carpeta.nombre"
                :subtitle="`${carpeta.documentos} documentos`"
                @click="seleccionarCarpeta(carpeta)"
                :class="{ 'v-list-item--active': carpetaSeleccionada?.id === carpeta.id }"
              ></v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <!-- Lista de documentos -->
        <v-card>
          <v-card-title>
            <v-icon left>mdi-file-document</v-icon>
            {{ carpetaSeleccionada ? carpetaSeleccionada.nombre : 'Todos los Documentos' }}
            ({{ documentosFiltrados.length }})
          </v-card-title>
          
          <v-data-table
            :headers="headers"
            :items="documentosFiltrados"
            :loading="cargando"
            class="elevation-1"
          >
            <!-- Columna de nombre -->
            <template v-slot:item.nombre="{ item }">
              <div class="d-flex align-center">
                <v-icon :color="getColorIcono(item.tipo)" class="mr-2">
                  {{ getIconoTipo(item.tipo) }}
                </v-icon>
                <span>{{ item.nombre }}</span>
              </div>
            </template>

            <!-- Columna de tamaño -->
            <template v-slot:item.tamaño="{ item }">
              {{ formatearTamaño(item.tamaño) }}
            </template>

            <!-- Columna de fecha -->
            <template v-slot:item.fechaSubida="{ item }">
              {{ formatearFecha(item.fechaSubida) }}
            </template>

            <!-- Columna de categoría -->
            <template v-slot:item.categoria="{ item }">
              <v-chip
                :color="getColorCategoria(item.categoria)"
                variant="tonal"
                size="small"
              >
                {{ item.categoria }}
              </v-chip>
            </template>

            <!-- Columna de acciones -->
            <template v-slot:item.acciones="{ item }">
              <v-btn
                icon="mdi-eye"
                size="small"
                color="info"
                variant="text"
                @click="verDocumento(item)"
              ></v-btn>
              <v-btn
                icon="mdi-download"
                size="small"
                color="success"
                variant="text"
                @click="descargarDocumento(item)"
              ></v-btn>
              <v-btn
                icon="mdi-pencil"
                size="small"
                color="warning"
                variant="text"
                @click="editarDocumento(item)"
              ></v-btn>
              <v-btn
                icon="mdi-delete"
                size="small"
                color="error"
                variant="text"
                @click="eliminarDocumento(item)"
              ></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo para subir documentos -->
    <v-dialog v-model="dialogoSubida" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="text-h5">Subir Documentos</span>
        </v-card-title>
        
        <v-card-text>
          <v-form ref="formularioSubida" v-model="formularioValido">
            <v-row>
              <v-col cols="12">
                <v-file-input
                  v-model="archivosSeleccionados"
                  label="Seleccionar archivos"
                  multiple
                  :rules="[v => v && v.length > 0 || 'Debe seleccionar al menos un archivo']"
                  required
                ></v-file-input>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="documentoForm.categoria"
                  :items="categorias"
                  label="Categoría"
                  :rules="[v => !!v || 'La categoría es requerida']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="documentoForm.carpeta"
                  :items="carpetas"
                  item-title="nombre"
                  item-value="id"
                  label="Carpeta"
                  :rules="[v => !!v || 'La carpeta es requerida']"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="documentoForm.descripcion"
                  label="Descripción (opcional)"
                  rows="3"
                ></v-textarea>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="cerrarDialogoSubida"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!formularioValido"
            :loading="subiendo"
            @click="subirDocumentos"
          >
            Subir Documentos
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  name: 'Archivo',
  data() {
    return {
      busqueda: '',
      cargando: false,
      subiendo: false,
      dialogoSubida: false,
      formularioValido: false,
      carpetaSeleccionada: null,
      filtroCategoria: null,
      filtroTipo: null,
      filtroFechaInicio: '',
      filtroFechaFin: '',
      archivosSeleccionados: [],
      documentoForm: {
        categoria: '',
        carpeta: null,
        descripcion: ''
      },
      resumen: {
        totalDocumentos: 2341,
        carpetas: 15,
        espacioUsado: 2147483648, // 2GB en bytes
        subidasHoy: 12
      },
      categorias: [
        'Facturas',
        'Comprobantes',
        'Contratos',
        'Reportes',
        'Certificados',
        'Otros'
      ],
      tiposDocumento: [
        'PDF',
        'Excel',
        'Word',
        'Imagen',
        'Otro'
      ],
      headers: [
        { title: 'Nombre', key: 'nombre', sortable: true },
        { title: 'Tipo', key: 'tipo', sortable: true },
        { title: 'Tamaño', key: 'tamaño', sortable: true },
        { title: 'Categoría', key: 'categoria', sortable: true },
        { title: 'Fecha Subida', key: 'fechaSubida', sortable: true },
        { title: 'Acciones', key: 'acciones', sortable: false }
      ],
      carpetas: [
        {
          id: 1,
          nombre: 'Facturas 2024',
          icono: 'mdi-receipt',
          documentos: 156
        },
        {
          id: 2,
          nombre: 'Comprobantes',
          icono: 'mdi-file-document-check',
          documentos: 89
        },
        {
          id: 3,
          nombre: 'Contratos',
          icono: 'mdi-file-document-edit',
          documentos: 23
        },
        {
          id: 4,
          nombre: 'Reportes',
          icono: 'mdi-chart-line',
          documentos: 45
        },
        {
          id: 5,
          nombre: 'Certificados',
          icono: 'mdi-certificate',
          documentos: 12
        }
      ],
      documentos: [
        {
          id: 1,
          nombre: 'Factura_001_2024.pdf',
          tipo: 'PDF',
          tamaño: 245760,
          categoria: 'Facturas',
          fechaSubida: '2024-01-20',
          carpeta: 1
        },
        {
          id: 2,
          nombre: 'Comprobante_Pago_001.xlsx',
          tipo: 'Excel',
          tamaño: 51200,
          categoria: 'Comprobantes',
          fechaSubida: '2024-01-19',
          carpeta: 2
        },
        {
          id: 3,
          nombre: 'Contrato_Servicios_2024.docx',
          tipo: 'Word',
          tamaño: 128000,
          categoria: 'Contratos',
          fechaSubida: '2024-01-18',
          carpeta: 3
        },
        {
          id: 4,
          nombre: 'Reporte_Mensual_Enero.pdf',
          tipo: 'PDF',
          tamaño: 1024000,
          categoria: 'Reportes',
          fechaSubida: '2024-01-17',
          carpeta: 4
        },
        {
          id: 5,
          nombre: 'Certificado_DIAN.pdf',
          tipo: 'PDF',
          tamaño: 76800,
          categoria: 'Certificados',
          fechaSubida: '2024-01-16',
          carpeta: 5
        }
      ]
    }
  },
  computed: {
    documentosFiltrados() {
      let documentos = this.documentos

      // Filtro por carpeta seleccionada
      if (this.carpetaSeleccionada) {
        documentos = documentos.filter(doc => doc.carpeta === this.carpetaSeleccionada.id)
      }

      // Filtro por búsqueda
      if (this.busqueda) {
        const busquedaLower = this.busqueda.toLowerCase()
        documentos = documentos.filter(doc =>
          doc.nombre.toLowerCase().includes(busquedaLower)
        )
      }

      // Filtro por categoría
      if (this.filtroCategoria) {
        documentos = documentos.filter(doc => doc.categoria === this.filtroCategoria)
      }

      // Filtro por tipo
      if (this.filtroTipo) {
        documentos = documentos.filter(doc => doc.tipo === this.filtroTipo)
      }

      return documentos
    }
  },
  methods: {
    seleccionarCarpeta(carpeta) {
      this.carpetaSeleccionada = carpeta
    },
    abrirDialogoSubida() {
      this.documentoForm = {
        categoria: '',
        carpeta: null,
        descripcion: ''
      }
      this.archivosSeleccionados = []
      this.dialogoSubida = true
    },
    cerrarDialogoSubida() {
      this.dialogoSubida = false
    },
    async subirDocumentos() {
      if (this.$refs.formularioSubida.validate()) {
        this.subiendo = true
        
        try {
          // Simular subida de archivos
          for (const archivo of this.archivosSeleccionados) {
            const nuevoDocumento = {
              id: Date.now() + Math.random(),
              nombre: archivo.name,
              tipo: this.obtenerTipoArchivo(archivo.name),
              tamaño: archivo.size,
              categoria: this.documentoForm.categoria,
              fechaSubida: new Date().toISOString().split('T')[0],
              carpeta: this.documentoForm.carpeta
            }
            
            this.documentos.push(nuevoDocumento)
          }
          
          this.cerrarDialogoSubida()
          this.$emit('mostrar-mensaje', 'Documentos subidos exitosamente')
        } catch (error) {
          console.error('Error al subir documentos:', error)
        } finally {
          this.subiendo = false
        }
      }
    },
    verDocumento(documento) {
      console.log('Ver documento:', documento)
    },
    descargarDocumento(documento) {
      console.log('Descargar documento:', documento)
    },
    editarDocumento(documento) {
      console.log('Editar documento:', documento)
    },
    eliminarDocumento(documento) {
      if (confirm(`¿Está seguro de eliminar el documento ${documento.nombre}?`)) {
        const index = this.documentos.findIndex(d => d.id === documento.id)
        if (index > -1) {
          this.documentos.splice(index, 1)
        }
      }
    },
    obtenerTipoArchivo(nombre) {
      const extension = nombre.split('.').pop().toLowerCase()
      const tipos = {
        'pdf': 'PDF',
        'xlsx': 'Excel',
        'xls': 'Excel',
        'docx': 'Word',
        'doc': 'Word',
        'jpg': 'Imagen',
        'jpeg': 'Imagen',
        'png': 'Imagen',
        'gif': 'Imagen'
      }
      return tipos[extension] || 'Otro'
    },
    getIconoTipo(tipo) {
      const iconos = {
        'PDF': 'mdi-file-pdf-box',
        'Excel': 'mdi-file-excel-box',
        'Word': 'mdi-file-word-box',
        'Imagen': 'mdi-file-image-box',
        'Otro': 'mdi-file-document'
      }
      return iconos[tipo] || 'mdi-file-document'
    },
    getColorIcono(tipo) {
      const colores = {
        'PDF': 'red',
        'Excel': 'green',
        'Word': 'blue',
        'Imagen': 'orange',
        'Otro': 'grey'
      }
      return colores[tipo] || 'grey'
    },
    getColorCategoria(categoria) {
      const colores = {
        'Facturas': 'primary',
        'Comprobantes': 'success',
        'Contratos': 'warning',
        'Reportes': 'info',
        'Certificados': 'purple',
        'Otros': 'grey'
      }
      return colores[categoria] || 'grey'
    },
    formatearTamaño(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    formatearFecha(fecha) {
      return new Date(fecha).toLocaleDateString('es-ES')
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

.v-list-item--active {
  background-color: rgba(25, 118, 210, 0.08);
}
</style>
