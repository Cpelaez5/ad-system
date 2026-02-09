import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, queryWithTenant, insertWithTenant, updateWithTenant, deleteWithTenant } from '@/utils/tenantHelpers'

const documentService = {
  // Obtener todos los documentos de la organización actual
  async getDocuments() {
    try {
      console.log('🔄 Obteniendo documentos desde Supabase...')

      // Obtener organization_id del usuario actual
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        console.warn('⚠️ No hay organization_id disponible')
        return []
      }

      // Obtener usuario actual para filtrar por rol
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        console.warn('⚠️ No hay usuario autenticado')
        return []
      }

      // Obtener perfil del usuario para saber su rol y client_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('role, client_id')
        .eq('id', authUser.id)
        .single()

      let query = supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)

      // Si es cliente, solo ver sus documentos (subidos por él)
      if (userProfile?.role === 'cliente') {
        query = query.eq('uploaded_by', authUser.id)
      }
      // Si es admin o contador, ver todos los documentos de la organización
      // (las políticas RLS ya filtran automáticamente)

      const { data: documents, error } = await query

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
      return []
    }
  },

  // Subir archivo al Storage
  async uploadFile(file, category) {
    try {
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) throw new Error('No organization ID found')

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${organizationId}/${category}/${fileName}`

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      return {
        success: true,
        data: {
          fileUrl: publicUrl,
          filePath: filePath,
          fileType: file.type,
          fileSize: file.size
        }
      }
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      return { success: false, message: error.message }
    }
  },

  // Crear registro en base de datos
  async createDocument(docData) {
    try {
      const organizationId = getCurrentOrganizationId()

      const payload = {
        organization_id: organizationId,
        uploaded_by: docData.uploadedBy,
        file_name: docData.fileName,
        file_url: docData.fileUrl,
        file_type: docData.fileType,
        file_size: docData.fileSize,
        category: docData.category
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          organization_id: organizationId,
          uploaded_by: docData.uploadedBy,
          file_name: docData.fileName, // Nota: Schema usa file_name
          file_url: docData.fileUrl,   // Nota: Schema usa file_url (no file_path)
          file_type: docData.fileType,
          file_size: docData.fileSize,
          category: docData.category
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('❌ Error creating document record:', error)
      return { success: false, message: error.message }
    }
  },

  // Eliminar documento
  async deleteDocument(id) {
    try {
      // 1. Obtener datos para borrar del storage
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Intentar borrar del storage extrayendo el path de la URL
      if (doc.file_url) {
        try {
          // URL format: .../documents/ORG_ID/CATEGORY/FILENAME
          const urlParts = doc.file_url.split('/documents/')
          if (urlParts.length > 1) {
            const storagePath = urlParts[1]
            await supabase.storage.from('documents').remove([storagePath])
          }
        } catch (e) {
          console.warn('⚠️ Could not delete file from storage', e)
        }
      }

      // 2. Borrar de BD
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      return { success: true }
    } catch (error) {
      console.error('❌ Error deleting document:', error)
      return { success: false, message: error.message }
    }
  },

  // Obtener estadísticas
  async getDocumentStats() {
    try {
      const docs = await this.getDocuments()
      const totalSize = docs.reduce((acc, doc) => acc + (doc.tamaño || 0), 0)

      // Uploads today
      const today = new Date().toISOString().split('T')[0]
      const uploadsToday = docs.filter(doc => doc.fechaSubida.startsWith(today)).length

      return {
        total: docs.length,
        totalSize: totalSize,
        uploadsToday: uploadsToday
      }
    } catch (error) {
      return { total: 0, totalSize: 0, uploadsToday: 0 }
    }
  },

  // Helpers
  getTipoFromExtension(filename) {
    if (!filename) return 'Otro'
    const ext = filename.split('.').pop().toLowerCase()
    if (['pdf'].includes(ext)) return 'PDF'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'Imagen'
    if (['xls', 'xlsx'].includes(ext)) return 'Excel'
    if (['doc', 'docx'].includes(ext)) return 'Word'
    return 'Otro'
  },

  getCarpetaFromCategory(category) {
    const map = {
      'Facturas': 1,
      'Comprobantes': 2,
      'Contratos': 3,
      'Reportes': 4,
      'Certificados': 5
    }
    return map[category] || 5
  },

  // Fallback si falla Supabase (Mock)
  async getDocumentsFallback() {
    return []
  }

}

export default documentService
