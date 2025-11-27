# FileUploadZone Component

Componente de carga de archivos con drag & drop para facturas y documentos.

## Uso Básico

```vue
<template>
  <FileUploadZone
    :loading="isProcessing"
    loading-message="Extrayendo datos de la factura..."
    @file-selected="handleFileSelected"
    @extract-data="handleExtractData"
    @file-removed="handleFileRemoved"
  />
</template>

<script>
import FileUploadZone from '@/components/common/FileUploadZone.vue'
import ocrService from '@/services/ocrService.js'

export default {
  components: { FileUploadZone },
  data() {
    return {
      isProcessing: false,
      selectedFile: null
    }
  },
  methods: {
    handleFileSelected(file) {
      console.log('Archivo seleccionado:', file.name)
      this.selectedFile = file
    },
    
    async handleExtractData(file) {
      try {
        this.isProcessing = true
        const data = await ocrService.extractInvoiceData(file)
        console.log('Datos extraídos:', data)
        // Auto-fill form with extracted data
        this.fillFormWithData(data)
      } catch (error) {
        console.error('Error:', error)
        // Show error message
      } finally {
        this.isProcessing = false
      }
    },
    
    handleFileRemoved() {
      this.selectedFile = null
    }
  }
}
</script>
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `accept` | String | `'application/pdf,image/jpeg,image/jpg,image/png'` | Tipos de archivo aceptados |
| `maxSizeMB` | Number | `10` | Tamaño máximo en MB |
| `loading` | Boolean | `false` | Estado de carga |
| `loadingMessage` | String | `'Procesando archivo...'` | Mensaje durante carga |

## Eventos

| Evento | Parámetros | Descripción |
|--------|------------|-------------|
| `file-selected` | `file: File` | Emitido cuando se selecciona un archivo |
| `extract-data` | `file: File` | Emitido al hacer clic en "Extraer Datos" |
| `file-removed` | - | Emitido cuando se remueve el archivo |
| `error` | `message: String` | Emitido cuando hay un error de validación |

## Características

- ✅ Drag & drop de archivos
- ✅ Click para seleccionar
- ✅ Preview de imágenes
- ✅ Validación de tipo y tamaño
- ✅ Loading state con mensaje personalizable
- ✅ Botón de extracción de datos
- ✅ Animaciones suaves
- ✅ Diseño responsive

## Tipos de Archivo Soportados

- **PDF** - `application/pdf`
- **JPEG** - `image/jpeg`, `image/jpg`
- **PNG** - `image/png`

## Validaciones

### Tipo de Archivo
El componente valida que el archivo sea del tipo especificado en la prop `accept`.

### Tamaño de Archivo
El tamaño máximo se configura con la prop `maxSizeMB` (default: 10MB).

## Estados

### Sin Archivo
- Muestra zona de drop con iconos
- Texto instructivo
- Chips con tipos aceptados

### Con Archivo
- Preview de la imagen/PDF
- Nombre y tamaño del archivo
- Botón para remover
- Botón "Extraer Datos con IA"

### Cargando
- Progress circular
- Mensaje personalizable
- Oculta otros controles

## Ejemplo Completo con OCR

```vue
<template>
  <v-container>
    <h2 class="mb-4">Cargar Factura</h2>
    
    <FileUploadZone
      :loading="isExtracting"
      loading-message="Extrayendo datos con IA..."
      @file-selected="onFileSelected"
      @extract-data="extractInvoiceData"
      @file-removed="onFileRemoved"
      @error="showError"
    />

    <!-- Datos extraídos -->
    <v-card v-if="extractedData" class="mt-4">
      <v-card-title>Datos Extraídos</v-card-title>
      <v-card-text>
        <v-chip color="success" class="mb-2">
          Confianza: {{ Math.round(extractedData.confidence * 100) }}%
        </v-chip>
        <pre>{{ JSON.stringify(extractedData, null, 2) }}</pre>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import FileUploadZone from '@/components/common/FileUploadZone.vue'
import ocrService from '@/services/ocrService.js'

export default {
  components: { FileUploadZone },
  data() {
    return {
      isExtracting: false,
      extractedData: null
    }
  },
  methods: {
    onFileSelected(file) {
      console.log('📄 Archivo seleccionado:', file.name)
    },
    
    async extractInvoiceData(file) {
      try {
        this.isExtracting = true
        this.extractedData = await ocrService.extractInvoiceData(file)
        console.log('✅ Extracción exitosa:', this.extractedData)
      } catch (error) {
        console.error('❌ Error:', error)
        this.showError(error.message)
      } finally {
        this.isExtracting = false
      }
    },
    
    onFileRemoved() {
      this.extractedData = null
    },
    
    showError(message) {
      // Mostrar snackbar o alert
      alert(message)
    }
  }
}
</script>
```

## Estilos Personalizables

El componente usa variables de Vuetify para los colores, por lo que se adapta automáticamente al tema de la aplicación.

## Notas

- El preview de PDFs muestra un icono genérico (puedes personalizarlo)
- Las imágenes se muestran con preview real
- El componente no procesa el archivo, solo lo valida y emite eventos
- La lógica de extracción debe implementarse en el componente padre
