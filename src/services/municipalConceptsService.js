import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

class MunicipalConceptsService {
  async getConcepts() {
    try {
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No hay organization_id disponible')
      }

      const { data, error } = await supabase
        .from('conceptos_municipales')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'ACTIVO')
        .order('codigo', { ascending: true })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching municipal concepts:', error)
      return { success: false, error: error.message }
    }
  }

  async createConcept(conceptData) {
    try {
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No hay organization_id disponible')
      }

      const payload = {
        organization_id: organizationId,
        codigo: conceptData.codigo,
        descripcion: conceptData.descripcion,
        porcentaje: parseFloat(conceptData.porcentaje),
        status: 'ACTIVO'
      }

      const { data, error } = await supabase
        .from('conceptos_municipales')
        .insert([payload])
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error creating municipal concept:', error)
      return { success: false, error: error.message }
    }
  }

  async updateConcept(id, conceptData) {
    try {
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No hay organization_id disponible')
      }

      const payload = {
        codigo: conceptData.codigo,
        descripcion: conceptData.descripcion,
        porcentaje: parseFloat(conceptData.porcentaje),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('conceptos_municipales')
        .update(payload)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error updating municipal concept:', error)
      return { success: false, error: error.message }
    }
  }

  async deleteConcept(id) {
    try {
      const organizationId = getCurrentOrganizationId()
      if (!organizationId) {
        throw new Error('No hay organization_id disponible')
      }

      // Soft delete
      const { data, error } = await supabase
        .from('conceptos_municipales')
        .update({ status: 'INACTIVO', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error deleting municipal concept:', error)
      return { success: false, error: error.message }
    }
  }
}

export const municipalConceptsService = new MunicipalConceptsService()
export default municipalConceptsService
