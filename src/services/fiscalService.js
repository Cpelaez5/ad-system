import { supabase } from '@/lib/supabaseClient'
import imageCompression from 'browser-image-compression'
import documentService from './documentService'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'
import userService from '@/services/userService'

const fiscalService = {
    // Opciones de compresión por defecto
    compressionOptions: {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
    },

    // Obtener documentos fiscales (uniendo con tabla documents)
    async getFiscalDocs(options = { trashed: false }) {
        try {
            const organizationId = getCurrentOrganizationId()
            if (!organizationId) throw new Error('No organization ID found')

            const currentUser = await userService.getCurrentUser()
            if (!currentUser) throw new Error('No user found')

            let query = supabase
                .from('fiscal_docs')
                .select(`
          *,
          documents:document_id (
            id,
            file_name,
            file_url,
            file_type,
            file_size
          )
        `)
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })

            // FIltrado por rol: Clientes SOLO ven sus propios documentos
            if (currentUser.role === 'cliente') {
                if (!currentUser.client_id) {
                    console.warn('⚠️ Cliente sin client_id, no se mostrarán documentos')
                    return []
                }
                query = query.eq('client_id', currentUser.client_id)
            }

            // Filtrar por estado de papelera
            if (options.trashed) {
                query = query.not('deleted_at', 'is', null)
            } else {
                query = query.is('deleted_at', null)
            }

            const { data, error } = await query

            if (error) throw error

            console.log(`📊 getFiscalDocs: ${data?.length || 0} documentos cargados`, {
                trashed: options.trashed,
                org: organizationId,
                role: currentUser.role,
                client_id: currentUser.client_id
            })

            return data
        } catch (error) {
            console.error('❌ Error getting fiscal docs:', error)
            return []
        }
    },

    // Comprimir imagen antes de subir
    async compressImage(file) {
        if (file.type.startsWith('image/')) {
            try {
                console.log(`📉 Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
                const compressedFile = await imageCompression(file, this.compressionOptions)
                console.log(`✅ Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`)
                return compressedFile
            } catch (error) {
                console.warn('⚠️ Image compression failed, using original:', error)
                return file
            }
        }
        return file
    },

    // Guardar documento fiscal (Nuevo o Edición)
    async saveFiscalDoc(docData, file = null) {
        try {
            const organizationId = getCurrentOrganizationId()
            let documentId = docData.document_id

            // Obtener usuario actual para asignar client_id si es cliente
            const currentUser = await userService.getCurrentUser()

            // Determinar client_id
            let clientId = docData.client_id
            if (currentUser?.role === 'cliente') {
                clientId = currentUser.client_id

                // GUARDRAIL: Si el cliente no tiene client_id, advertir
                if (!clientId) {
                    console.error('🚨 CRÍTICO: Usuario cliente sin client_id asignado. El documento será invisible por RLS.')
                    console.error('   Usuario:', currentUser.email, '| ID:', currentUser.id)
                    // Intentar usar el id del usuario como fallback
                }
            }

            console.log('📋 Guardando documento fiscal:', {
                name: docData.name,
                category: docData.category,
                doc_type: docData.doc_type,
                client_id: clientId,
                organization_id: organizationId,
                role: currentUser?.role
            })

            // 1. Si hay archivo, subirlo primero
            if (file) {
                // Comprimir si es imagen
                const fileToUpload = await this.compressImage(file)

                // Subir a Storage usando documentService
                const uploadRes = await documentService.uploadFile(fileToUpload, 'FISCAL')
                if (!uploadRes.success) throw new Error(uploadRes.message)

                // B) Registrar en tabla documents
                const docEntry = {
                    fileName: fileToUpload.name,
                    fileUrl: uploadRes.data.fileUrl,
                    fileType: fileToUpload.type,
                    fileSize: fileToUpload.size,
                    category: 'FISCAL',
                    uploadedBy: currentUser?.id
                }

                const createDocRes = await documentService.createDocument(docEntry)
                if (!createDocRes.success) throw new Error(createDocRes.message)

                documentId = createDocRes.data.id
            }

            // 2. Guardar metadatos en fiscal_docs
            const payload = {
                organization_id: organizationId,
                client_id: clientId,
                name: docData.name,
                category: docData.category,
                doc_type: docData.doc_type || null,
                status: docData.status,
                emission_date: docData.emission_date || null,
                expiration_date: docData.expiration_date || null,
                notes: docData.notes || null,
                document_id: documentId
            }

            let result
            if (docData.id) {
                // Actualizar
                result = await supabase
                    .from('fiscal_docs')
                    .update(payload)
                    .eq('id', docData.id)
                    .select()
                    .single()
            } else {
                // Insertar
                result = await supabase
                    .from('fiscal_docs')
                    .insert(payload)
                    .select()
                    .single()
            }

            if (result.error) throw result.error
            return { success: true, data: result.data }

        } catch (error) {
            console.error('❌ Error saving fiscal doc:', error)
            return { success: false, message: error.message }
        }
    },

    async getStats() {
        const docs = await this.getFiscalDocs({ trashed: false })

        // Contar eliminados
        // Reusamos getFiscalDocs con trashed: true para respetar filtros de seguridad
        const trashDocs = await this.getFiscalDocs({ trashed: true })

        const now = new Date()
        const stats = {
            total: docs.length,
            vigente: 0,
            tramite: 0,
            vencido: 0,
            porVencer: 0,
            trash: trashDocs.length
        }

        docs.forEach(doc => {
            // Contar por estado
            const status = doc.status.toLowerCase() // vigente, tramite, vencido
            if (stats[status] !== undefined) stats[status]++

            // Calcular por vencer (próximos 30 días)
            if (doc.expiration_date) {
                const expDate = new Date(doc.expiration_date)
                const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24))
                if (diffDays > 0 && diffDays <= 30 && doc.status === 'VIGENTE') {
                    stats.porVencer++
                }

                // Auto-actualizar a VENCIDO si ya pasó la fecha
                // (Esto es solo visual, idealmente un cron job lo haría en backend)
                if (diffDays < 0 && doc.status === 'VIGENTE') {
                    stats.vigente--
                    stats.vencido++
                    doc.status = 'VENCIDO' // Actualizar localmente para la UI
                }
            }
        })

        return stats
    },

    // Soft Delete (Papelera)
    async deleteFiscalDoc(id) {
        try {
            const { error } = await supabase
                .from('fiscal_docs')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('❌ Error moving fiscal doc to trash:', error)
            return { success: false, message: error.message }
        }
    },

    // Restaurar de Papelera
    async restoreFiscalDoc(id) {
        try {
            const { error } = await supabase
                .from('fiscal_docs')
                .update({ deleted_at: null })
                .eq('id', id)

            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('❌ Error restoring fiscal doc:', error)
            return { success: false, message: error.message }
        }
    },

    // Hard Delete (Eliminar Definitivamente)
    async hardDeleteFiscalDoc(id) {
        try {
            // 1. Obtener documento asociado
            const { data: doc, error: fetchError } = await supabase
                .from('fiscal_docs')
                .select('document_id')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // 2. Eliminar registro fiscal
            const { error: deleteError } = await supabase
                .from('fiscal_docs')
                .delete()
                .eq('id', id)

            if (deleteError) throw deleteError

            // 3. Eliminar archivo físico y registro de documento (si existe)
            if (doc.document_id) {
                await documentService.deleteDocument(doc.document_id)
            }

            return { success: true }
        } catch (error) {
            console.error('❌ Error permanently deleting fiscal doc:', error)
            return { success: false, message: error.message }
        }
    }
}

export default fiscalService
