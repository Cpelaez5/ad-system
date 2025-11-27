<template>
  <v-card
    class="file-upload-zone"
    :class="{ 'drag-over': isDragOver, 'has-file': previewUrl }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="handleDrop"
  >
    <v-card-text class="pa-6">
      <!-- Preview de archivo -->
      <div v-if="previewUrl" class="preview-container">
        <v-img
          :src="previewUrl"
          max-height="300"
          contain
          class="preview-image"
        />
        <div class="preview-overlay">
          <v-chip color="primary" class="mb-2">
            <v-icon start>mdi-file-document</v-icon>
            {{ fileName }}
          </v-chip>
          <div class="text-caption text-grey">
            {{ fileSize }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          size="small"
          color="error"
          class="remove-btn"
          @click="removeFile"
        />
      </div>

      <!-- Zona de upload -->
      <div v-else class="upload-area" @click="triggerFileInput">
        <v-icon
          :icon="isDragOver ? 'mdi-file-download' : 'mdi-cloud-upload'"
          size="64"
          :color="isDragOver ? 'primary' : 'grey'"
          class="upload-icon"
        />
        
        <h3 class="text-h6 mt-4 mb-2">
          {{ isDragOver ? 'Suelta el archivo aquí' : 'Arrastra tu factura aquí' }}
        </h3>
        
        <p class="text-body-2 text-grey mb-4">
          o haz clic para seleccionar
        </p>
        
        <v-chip variant="outlined" size="small">
          <v-icon start size="18">mdi-file-pdf-box</v-icon>
          PDF
        </v-chip>
        <v-chip variant="outlined" size="small" class="ml-2">
          <v-icon start size="18">mdi-file-image</v-icon>
          JPG, PNG
        </v-chip>
        
        <p class="text-caption text-grey mt-4">
          Tamaño máximo: {{ maxSizeMB }}MB
        </p>
      </div>

      <!-- Input file oculto -->
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        style="display: none"
        @change="handleFileSelect"
      />
    </v-card-text>

    <!-- Botón de extracción -->
    <v-card-actions v-if="previewUrl && !loading">
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        size="large"
        @click="extractData"
        :disabled="!selectedFile"
      >
        <v-icon start>mdi-robot</v-icon>
        Extraer Datos con IA
      </v-btn>
      <v-spacer />
    </v-card-actions>

    <!-- Loading state -->
    <v-card-text v-if="loading" class="text-center py-8">
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
        width="6"
        class="mb-4"
      />
      <h3 class="text-h6 mb-2">{{ loadingMessage }}</h3>
      <p class="text-body-2 text-grey">
        Esto puede tomar unos segundos...
      </p>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  name: 'FileUploadZone',
  props: {
    accept: {
      type: String,
      default: 'application/pdf,image/jpeg,image/jpg,image/png'
    },
    maxSizeMB: {
      type: Number,
      default: 10
    },
    loading: {
      type: Boolean,
      default: false
    },
    loadingMessage: {
      type: String,
      default: 'Procesando archivo...'
    }
  },
  emits: ['file-selected', 'extract-data', 'file-removed'],
  data() {
    return {
      isDragOver: false,
      selectedFile: null,
      previewUrl: null,
      fileName: '',
      fileSize: ''
    }
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click()
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        this.processFile(file)
      }
    },
    
    handleDrop(event) {
      this.isDragOver = false
      const file = event.dataTransfer.files[0]
      if (file) {
        this.processFile(file)
      }
    },
    
    processFile(file) {
      // Validar tipo
      const validTypes = this.accept.split(',').map(t => t.trim())
      if (!validTypes.includes(file.type)) {
        this.$emit('error', 'Tipo de archivo no válido')
        return
      }
      
      // Validar tamaño
      const maxSize = this.maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        this.$emit('error', `El archivo es demasiado grande. Máximo ${this.maxSizeMB}MB`)
        return
      }
      
      // Guardar archivo
      this.selectedFile = file
      this.fileName = file.name
      this.fileSize = this.formatFileSize(file.size)
      
      // Crear preview
      this.createPreview(file)
      
      // Emitir evento
      this.$emit('file-selected', file)
    },
    
    createPreview(file) {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        if (file.type === 'application/pdf') {
          // Para PDFs, mostrar icono
          this.previewUrl = '/pdf-preview.png' // Puedes usar un icono genérico
        } else {
          // Para imágenes, mostrar preview
          this.previewUrl = e.target.result
        }
      }
      
      reader.readAsDataURL(file)
    },
    
    removeFile() {
      this.selectedFile = null
      this.previewUrl = null
      this.fileName = ''
      this.fileSize = ''
      this.$refs.fileInput.value = ''
      this.$emit('file-removed')
    },
    
    extractData() {
      if (this.selectedFile) {
        this.$emit('extract-data', this.selectedFile)
      }
    },
    
    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }
  }
}
</script>

<style scoped>
.file-upload-zone {
  border: 2px dashed #ccc;
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-upload-zone.drag-over {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
  transform: scale(1.02);
}

.file-upload-zone.has-file {
  border-style: solid;
  border-color: rgb(var(--v-theme-primary));
  cursor: default;
}

.upload-area {
  text-align: center;
  padding: 40px 20px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.upload-icon {
  transition: transform 0.3s ease;
}

.file-upload-zone.drag-over .upload-icon {
  transform: scale(1.2);
}

.preview-container {
  position: relative;
  text-align: center;
}

.preview-image {
  border-radius: 8px;
  margin: 0 auto;
}

.preview-overlay {
  margin-top: 16px;
  text-align: center;
}

.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
