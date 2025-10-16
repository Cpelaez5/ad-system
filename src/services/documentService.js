import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, queryWithTenant, insertWithTenant, updateWithTenant, deleteWithTenant } from '@/utils/tenantHelpers'

const documentService = {
  // Obtener todos los documentos de la organización actual
  async getDocuments() {
    try {
      console.log('🔄 Obteniendo documentos desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: documents, error } = await queryWithTenant('documents', '*')
      
      if (error) {
        console.warn('⚠️ Error al obtener documentos desde Supabase, usando fallback:', error.message)
        return await this.getDocumentsFallback()
      }
      
      console.log('🔍 Datos brutos de documentos:', documents)
      console.log('🔍 Número de documentos brutos:', documents?.length || 0)
      
      // Verificar que documents no sea null o undefined
      if (!documents || !Array.isArray(documents)) {
        console.warn('⚠️ Documentos no es un array válido:', documents)
        return await this.getDocumentsFallback()
      }
      
      // Transformar datos para compatibilidad con el frontend
      const transformedDocuments = documents.map(doc => ({
        id: doc.id,
        nombre: doc.file_name,
        tipo: this.getTipoFromExtension(doc.file_name),
        tamaño: doc.file_size,
        categoria: doc.category || 'Otros',
        fechaSubida: doc.created_at,
        url: doc.file_url,
        carpeta: this.getCarpetaFromCategory(doc.category)
      }))
      
      console.log('🔍 Documentos transformados:', transformedDocuments)
      console.log('✅ Documentos obtenidos desde Supabase:', transformedDocuments.length)
      return transformedDocuments
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener documentos:', error)
      return await this.getDocumentsFallback()
    }
  },

  // Crear nuevo documento
  async createDocument(documentData) {
    try {
      console.log('🔄 Creando documento en Supabase...')
      
      // Preparar datos para Supabase
      const documentRecord = {
        file_name: documentData.fileName,
        file_url: documentData.fileUrl,
        file_type: documentData.fileType,
        file_size: documentData.fileSize,
        category: documentData.category,
        uploaded_by: documentData.uploadedBy || '11111111-1111-1111-1111-111111111111' // Usuario por defecto
      }
      
      console.log('📄 Datos del documento a crear:', documentRecord)
      
      const { data: newDocument, error } = await insertWithTenant('documents', documentRecord)
      
      if (error) {
        console.error('❌ Error al crear documento en Supabase:', error.message)
        return { success: false, message: 'Error al crear documento' }
      }
      
      console.log('✅ Documento creado exitosamente:', newDocument)
      return { success: true, data: newDocument }
      
    } catch (error) {
      console.error('❌ Error inesperado al crear documento:', error)
      return { success: false, message: 'Error inesperado al crear documento' }
    }
  },

  // Actualizar documento
  async updateDocument(id, documentData) {
    try {
      console.log('🔄 Actualizando documento en Supabase...')
      
      // Preparar datos para actualización
      const updateData = {
        file_name: documentData.fileName,
        category: documentData.category
      }
      
      console.log('📄 Datos del documento a actualizar:', updateData)
      
      const { data: updatedDocument, error } = await updateWithTenant('documents', id, updateData)
      
      if (error) {
        console.error('❌ Error al actualizar documento en Supabase:', error.message)
        return { success: false, message: 'Error al actualizar documento' }
      }
      
      console.log('✅ Documento actualizado exitosamente:', updatedDocument)
      return { success: true, data: updatedDocument }
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar documento:', error)
      return { success: false, message: 'Error inesperado al actualizar documento' }
    }
  },

  // Eliminar documento
  async deleteDocument(id) {
    try {
      console.log('🔄 Eliminando documento en Supabase...')
      
      // 1. Primero obtener la información del documento para saber qué archivo eliminar
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        console.error('❌ Error al obtener documento:', fetchError.message)
        return { success: false, message: 'Error al obtener documento' }
      }
      
      console.log('📄 Documento a eliminar:', document)
      
      // 2. Eliminar el archivo del Storage
      if (document.file_url) {
        // Extraer la ruta del archivo de la URL
        const urlParts = document.file_url.split('/')
        const filePath = urlParts.slice(urlParts.indexOf('documents') + 1).join('/')
        
        console.log('🗑️ Eliminando archivo del Storage:', filePath)
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath])
        
        if (storageError) {
          console.warn('⚠️ Error al eliminar archivo del Storage (continuando):', storageError.message)
        } else {
          console.log('✅ Archivo eliminado del Storage exitosamente')
        }
      }
      
      // 3. Eliminar el registro de la base de datos
      const { data: deletedDocument, error: deleteError } = await deleteWithTenant('documents', id)
      
      if (deleteError) {
        console.error('❌ Error al eliminar documento en Supabase:', deleteError.message)
        return { success: false, message: 'Error al eliminar documento' }
      }
      
      console.log('✅ Documento eliminado exitosamente:', deletedDocument)
      return { success: true, data: deletedDocument }
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar documento:', error)
      return { success: false, message: 'Error inesperado al eliminar documento' }
    }
  },

  // Subir archivo a Supabase Storage
  async uploadFile(file, category) {
    try {
      console.log('🔄 Subiendo archivo a Supabase Storage...')
      
      const organizationId = getCurrentOrganizationId()
      const fileName = `${organizationId}/${category}/${Date.now()}-${file.name}`
      
      // Subir archivo a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)
      
      if (uploadError) {
        console.error('❌ Error al subir archivo:', uploadError)
        return { success: false, message: 'Error al subir archivo' }
      }
      
      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)
      
      console.log('✅ Archivo subido exitosamente:', uploadData)
      return { 
        success: true, 
        data: {
          fileName: uploadData.path,
          fileUrl: urlData.publicUrl,
          fileType: file.type,
          fileSize: file.size
        }
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al subir archivo:', error)
      return { success: false, message: 'Error inesperado al subir archivo' }
    }
  },

  // Obtener estadísticas de documentos
  async getDocumentStats() {
    try {
      console.log('🔄 Obteniendo estadísticas de documentos desde Supabase...')
      
      const organizationId = getCurrentOrganizationId()
      
      // Obtener estadísticas básicas
      const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
      
      if (error) {
        console.warn('⚠️ Error al obtener documentos para estadísticas:', error.message)
        return { total: 0, byCategory: {}, totalSize: 0, uploadsToday: 0 }
      }
      
      // Calcular estadísticas
      const total = documents.length
      const byCategory = {}
      let totalSize = 0
      let uploadsToday = 0
      
      const today = new Date().toISOString().split('T')[0]
      
      documents.forEach(doc => {
        // Por categoría
        const category = doc.category || 'Otros'
        byCategory[category] = (byCategory[category] || 0) + 1
        
        // Tamaño total
        totalSize += doc.file_size || 0
        
        // Subidas hoy
        if (doc.created_at && doc.created_at.startsWith(today)) {
          uploadsToday++
        }
      })
      
      const stats = {
        total,
        byCategory,
        totalSize,
        uploadsToday
      }
      
      console.log('✅ Estadísticas de documentos calculadas:', stats)
      return stats
      
    } catch (error) {
      console.error('❌ Error al obtener estadísticas de documentos:', error)
      return { total: 0, byCategory: {}, totalSize: 0, uploadsToday: 0 }
    }
  },

  // Funciones auxiliares
  getTipoFromExtension(fileName) {
    const extension = fileName.split('.').pop().toLowerCase()
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

  getCarpetaFromCategory(category) {
    const carpetas = {
      'Facturas': 1,
      'Comprobantes': 2,
      'Contratos': 3,
      'Reportes': 4,
      'Certificados': 5
    }
    return carpetas[category] || 1
  },

  // Limpiar archivos huérfanos del Storage
  async cleanupOrphanedFiles() {
    try {
      console.log('🧹 Limpiando archivos huérfanos del Storage...')
      
      const organizationId = getCurrentOrganizationId()
      
      // 1. Obtener todos los archivos en Storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('documents')
        .list(organizationId, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })
      
      if (storageError) {
        console.error('❌ Error al listar archivos del Storage:', storageError)
        return { success: false, message: 'Error al listar archivos del Storage' }
      }
      
      // 2. Obtener todos los documentos en la BD
      const { data: dbDocuments, error: dbError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('organization_id', organizationId)
      
      if (dbError) {
        console.error('❌ Error al obtener documentos de la BD:', dbError)
        return { success: false, message: 'Error al obtener documentos de la BD' }
      }
      
      // 3. Encontrar archivos huérfanos
      const dbFilePaths = dbDocuments.map(doc => {
        const urlParts = doc.file_url.split('/')
        return urlParts.slice(urlParts.indexOf('documents') + 1).join('/')
      })
      
      const orphanedFiles = []
      
      // Función recursiva para buscar archivos huérfanos
      const findOrphanedFiles = (files, currentPath = '') => {
        files.forEach(file => {
          const fullPath = currentPath ? `${currentPath}/${file.name}` : file.name
          
          if (file.metadata && file.metadata.mimetype) {
            // Es un archivo
            if (!dbFilePaths.includes(fullPath)) {
              orphanedFiles.push(fullPath)
            }
          } else if (file.name) {
            // Es una carpeta, buscar recursivamente
            findOrphanedFiles(file, fullPath)
          }
        })
      }
      
      findOrphanedFiles(storageFiles)
      
      // 4. Eliminar archivos huérfanos
      if (orphanedFiles.length > 0) {
        console.log(`🗑️ Encontrados ${orphanedFiles.length} archivos huérfanos:`, orphanedFiles)
        
        const { error: deleteError } = await supabase.storage
          .from('documents')
          .remove(orphanedFiles)
        
        if (deleteError) {
          console.error('❌ Error al eliminar archivos huérfanos:', deleteError)
          return { success: false, message: 'Error al eliminar archivos huérfanos' }
        }
        
        console.log('✅ Archivos huérfanos eliminados exitosamente')
        return { success: true, deletedCount: orphanedFiles.length }
      } else {
        console.log('✅ No se encontraron archivos huérfanos')
        return { success: true, deletedCount: 0 }
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al limpiar archivos huérfanos:', error)
      return { success: false, message: 'Error inesperado al limpiar archivos huérfanos' }
    }
  },

  // Fallback para cuando Supabase no está disponible
  async getDocumentsFallback() {
    console.log('🔄 Usando fallback para documentos...')
    return [
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
      }
    ]
  }
}

export default documentService
