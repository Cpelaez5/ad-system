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
}

export default documentService
