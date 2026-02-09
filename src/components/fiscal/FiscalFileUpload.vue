<template>
  <v-card
    class="file-upload-zone"
    :class="{ 'drag-over': isDragOver, 'has-file': hasFile, 'is-loading': loading }"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="handleDrop"
    variant="outlined"
  >
    <!-- Loading State (covers everything) -->
    <div v-if="loading" class="loading-container pa-6 text-center">
      <v-progress-circular
        indeterminate
        color="primary"
        size="48"
        width="4"
        class="mb-3"
      />
      <v-progress-linear
        indeterminate
        color="primary"
        class="mb-3"
        rounded
      />
      <div class="text-subtitle-2 text-primary font-weight-bold">
        {{ loadingMessage }}
      </div>
      <div class="text-caption text-grey mt-1">
        Esto puede tomar unos segundos...
      </div>
    </div>

    <!-- Normal Content (hidden during loading) -->
    <v-card-text v-else class="pa-6 text-center">
      <!-- Preview de archivo subido -->
      <div v-if="hasFile" class="preview-container">
        
        <div class="d-flex align-center justify-center mb-4">
            <v-icon 
                :icon="fileTypeIcon" 
                size="48" 
                color="primary" 
                class="mr-3"
            />
            <div class="text-left">
                <div class="text-subtitle-1 font-weight-bold">{{ fileName }}</div>
                <div class="text-caption text-grey">{{ fileSize }}</div>
            </div>
        </div>

        <div class="d-flex justify-center gap-2">
            <v-btn
                prepend-icon="mdi-refresh"
                variant="tonal"
                color="primary"
                size="small"
                @click="triggerFileInput"
            >
                Reemplazar
            </v-btn>
            
            <v-btn
                prepend-icon="mdi-delete-outline"
                variant="tonal"
                color="error"
                size="small"
                @click="removeFile"
            >
                Quitar
            </v-btn>
        </div>

        <!-- Image Preview if applicable -->
        <v-img
          v-if="isImage && previewUrl"
          :src="previewUrl"
          max-height="180"
          contain
          class="mt-4 rounded-lg border"
        />
        
      </div>

      <!-- Zona de upload (cuando no hay archivo) -->
      <div v-else class="upload-area" @click="triggerFileInput">
        <v-icon
          :icon="isDragOver ? 'mdi-file-download' : 'mdi-cloud-upload'"
          size="48"
          :color="isDragOver ? 'primary' : 'grey-lighten-1'"
          class="upload-icon mb-3"
        />
        
        <div class="text-body-1 font-weight-bold mb-1">
          {{ isDragOver ? 'Suelta el archivo aquí' : 'Sube tu documento' }}
        </div>
        
        <div class="text-caption text-grey mb-3">
          Arrastra o haz clic para seleccionar
        </div>
        
        <div class="d-flex justify-center gap-2">
            <v-chip variant="outlined" size="x-small" color="grey">PDF</v-chip>
            <v-chip variant="outlined" size="x-small" color="grey">JPG</v-chip>
            <v-chip variant="outlined" size="x-small" color="grey">PNG</v-chip>
        </div>
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
  </v-card>
</template>

<script>
export default {
  name: 'FiscalFileUpload',
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
      default: 'Analizando documento...'
    },
    existingFileUrl: {
      type: String,
      default: null
    },
    existingFileName: {
      type: String,
      default: null
    }
  },
  emits: ['file-selected', 'file-removed', 'error'],
  data() {
    return {
      isDragOver: false,
      selectedFile: null,
      previewUrl: null,
      fileName: '',
      fileSize: ''
    }
  },
  computed: {
    hasFile() {
        return this.selectedFile !== null || this.existingFileUrl !== null
    },
    isImage() {
        return this.selectedFile && this.selectedFile.type.startsWith('image/')
    },
    fileTypeIcon() {
        if (this.selectedFile) {
            if (this.selectedFile.type === 'application/pdf') return 'mdi-file-pdf-box'
            return 'mdi-file-image'
        }
        // For existing files (editing mode)
        if (this.existingFileUrl) return 'mdi-file-check'
        return 'mdi-file-document-outline'
    }
  },
  watch: {
    existingFileUrl: {
        immediate: true,
        handler(val) {
            if (val && !this.selectedFile) {
                this.fileName = this.existingFileName || 'Documento Guardado'
                this.fileSize = 'Ya subido'
            }
        }
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
      event.target.value = ''
    },
    
    handleDrop(event) {
      this.isDragOver = false
      const file = event.dataTransfer.files[0]
      if (file) {
        this.processFile(file)
      }
    },
    
    processFile(file) {
      const validTypes = this.accept.split(',').map(t => t.trim())
      if (!validTypes.includes(file.type)) {
        this.$emit('error', 'Tipo de archivo no válido')
        return
      }
      
      const maxSize = this.maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        this.$emit('error', `El archivo es demasiado grande. Máximo ${this.maxSizeMB}MB`)
        return
      }
      
      this.selectedFile = file
      this.fileName = file.name
      this.fileSize = this.formatFileSize(file.size)
      
      this.createPreview(file)
      
      this.$emit('file-selected', file)
    },
    
    createPreview(file) {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
          this.previewUrl = e.target.result
        } else {
          this.previewUrl = null
        }
      }
      
      reader.readAsDataURL(file)
    },
    
    removeFile() {
      this.selectedFile = null
      this.previewUrl = null
      this.fileName = ''
      this.fileSize = ''
      this.$emit('file-removed')
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
  border: 2px dashed rgba(0, 0, 0, 0.12);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  min-height: 160px;
}

.file-upload-zone:hover {
    background-color: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.24);
}

.file-upload-zone.drag-over {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.file-upload-zone.has-file {
  border-style: solid;
  border-color: rgb(var(--v-theme-primary));
  cursor: default;
}

.file-upload-zone.is-loading {
  border-color: rgb(var(--v-theme-primary));
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.03) 0%, rgba(var(--v-theme-primary), 0.08) 100%);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 160px;
}
</style>
