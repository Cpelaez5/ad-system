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
            <div class="text-body-2 text-white mb-4">Documentos Archivados</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ resumen.totalDocumentos }}</div>
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
            <div class="text-body-2 text-white mb-4">Carpetas Creadas</div>
            <div class="text-h4 text-white" style="font-size: 2.6rem !important;">{{ resumen.carpetas }}</div>
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
            <div class="text-body-2 mb-4" style="color: #010101;">Espacio Usado</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">{{ formatearTamaño(resumen.espacioUsado) }}</div>
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
            <div class="text-body-2 mb-4" style="color: #010101;">Subidas Hoy</div>
            <div class="text-h4" style="color: #010101; font-size: 2.6rem !important;">{{ resumen.subidasHoy }}</div>
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
        totalDocumentos: 0,
        carpetas: 5,
        espacioUsado: 0,
        subidasHoy: 0
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
      documentos: []
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
  async mounted() {
    await this.cargarDocumentos()
    await this.cargarEstadisticas()
  },
  methods: {
    async cargarDocumentos() {
      try {
        this.cargando = true
        console.log('🔄 Cargando documentos...')
        
        const documentService = (await import('@/services/documentService')).default
        const documentosData = await documentService.getDocuments()
        
        this.documentos = documentosData || []
        console.log('✅ Documentos cargados:', this.documentos.length)
        
      } catch (error) {
        console.error('❌ Error al cargar documentos:', error)
      } finally {
        this.cargando = false
      }
    },

    async cargarEstadisticas() {
      try {
        console.log('📊 Cargando estadísticas de documentos...')
        
        const documentService = (await import('@/services/documentService')).default
        const stats = await documentService.getDocumentStats()
        
        this.resumen = {
          totalDocumentos: stats.total || 0,
          carpetas: 5, // Fijo por ahora
          espacioUsado: stats.totalSize || 0,
          subidasHoy: stats.uploadsToday || 0
        }
        
        console.log('📊 Estadísticas cargadas:', this.resumen)
        
      } catch (error) {
        console.error('❌ Error al cargar estadísticas:', error)
      }
    },

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
          const documentService = (await import('@/services/documentService')).default
          
          // Subir cada archivo secuencialmente para evitar conflictos
          for (let i = 0; i < this.archivosSeleccionados.length; i++) {
            const archivo = this.archivosSeleccionados[i]
            console.log(`🔄 Subiendo archivo ${i + 1}/${this.archivosSeleccionados.length}:`, archivo.name)
            
            try {
              // 1. Subir archivo a Supabase Storage
              const uploadResult = await documentService.uploadFile(archivo, this.documentoForm.categoria)
              
              if (!uploadResult.success) {
                console.error(`❌ Error al subir archivo ${archivo.name}:`, uploadResult.message)
                continue
              }
              
              console.log(`✅ Archivo ${archivo.name} subido al Storage exitosamente`)
              
              // 2. Crear registro en la base de datos
              const documentData = {
                fileName: archivo.name,
                fileUrl: uploadResult.data.fileUrl,
                fileType: uploadResult.data.fileType,
                fileSize: uploadResult.data.fileSize,
                category: this.documentoForm.categoria,
                uploadedBy: '11111111-1111-1111-1111-111111111111' // Usuario por defecto
              }
              
              const createResult = await documentService.createDocument(documentData)
              
              if (createResult.success) {
                console.log(`✅ Documento ${archivo.name} creado en BD exitosamente:`, createResult.data)
              } else {
                console.error(`❌ Error al crear documento ${archivo.name}:`, createResult.message)
                
                // Si falla la creación en BD, eliminar el archivo del Storage
                console.log(`🧹 Limpiando archivo huérfano del Storage: ${archivo.name}`)
                try {
                  const { supabase } = await import('@/lib/supabaseClient')
                  const urlParts = uploadResult.data.fileUrl.split('/')
                  const documentsIndex = urlParts.indexOf('documents')
                  if (documentsIndex !== -1) {
                    const filePath = urlParts.slice(documentsIndex + 1).join('/')
                    await supabase.storage
                      .from('documents')
                      .remove([filePath])
                    console.log(`✅ Archivo huérfano ${archivo.name} eliminado del Storage`)
                  }
                } catch (cleanupError) {
                  console.warn(`⚠️ Error al limpiar archivo huérfano ${archivo.name}:`, cleanupError)
                }
              }
              
            } catch (fileError) {
              console.error(`❌ Error inesperado al procesar archivo ${archivo.name}:`, fileError)
            }
          }
          
          // Recargar documentos y estadísticas
          await this.cargarDocumentos()
          await this.cargarEstadisticas()
          
          this.cerrarDialogoSubida()
          console.log('✅ Proceso de subida completado')
          
        } catch (error) {
          console.error('❌ Error al subir documentos:', error)
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
    async eliminarDocumento(documento) {
      if (confirm(`¿Está seguro de eliminar el documento ${documento.nombre}?`)) {
        try {
          console.log('🔄 Eliminando documento:', documento.nombre)
          
          const documentService = (await import('@/services/documentService')).default
          const result = await documentService.deleteDocument(documento.id)
          
          if (result.success) {
            console.log('✅ Documento eliminado exitosamente')
            // Recargar documentos y estadísticas
            await this.cargarDocumentos()
            await this.cargarEstadisticas()
          } else {
            console.error('❌ Error al eliminar documento:', result.message)
          }
          
        } catch (error) {
          console.error('❌ Error inesperado al eliminar documento:', error)
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
