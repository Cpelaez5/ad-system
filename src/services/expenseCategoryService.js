import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, insertWithTenant, updateWithTenant } from '@/utils/tenantHelpers'

class ExpenseCategoryService {
  /**
   * Obtener todas las categorías de gastos para el cliente actual
   * @param {Object} options Opciones (clientId, limit)
   */
  async getCategories(options = {}) {
    try {
      const { limit = 100, clientId } = options
      const orgId = getCurrentOrganizationId()

      let query = supabase
        .from('expense_categories')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)

      if (clientId) {
        query = query.eq('client_id', clientId)
      } else {
        query = query.is('client_id', null)
      }

      const { data, error } = await query.order('name').limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error in getCategories:', error)
      throw error
    }
  }

  /**
   * Crear una nueva categoría
   * @param {Object} category Datos de la categoría (name)
   * @param {Object} options Opciones (clientId)
   */
  async createCategory(category, options = {}) {
    try {
      if (!category.name) throw new Error('El nombre de la categoría es requerido')

      const { clientId } = options
      
      const categoryData = {
        name: category.name,
        description: category.description || null,
        is_active: true,
        client_id: clientId || null
      }

      const { data, error } = await insertWithTenant('expense_categories', categoryData, { returning: 'representation' })

      if (error) {
        // Manejar el caso donde ya existe (violación de uniqueness)
        if (error.code === '23505') {
          return this.getCategoryByName(category.name, options)
        }
        throw error
      }
      
      // Supabase devuelve un array cuando usamos select()
      return Array.isArray(data) ? data[0] : data
    } catch (error) {
      console.error('Error in createCategory:', error)
      throw error
    }
  }

  /**
   * Buscar categoría por nombre (helper para unicidad)
   */
  async getCategoryByName(name, options = {}) {
    try {
      const { clientId } = options
      const orgId = getCurrentOrganizationId()

      let query = supabase
        .from('expense_categories')
        .select('*')
        .eq('organization_id', orgId)

      if (clientId) {
        query = query.eq('client_id', clientId)
      } else {
        query = query.is('client_id', null)
      }
      
      const { data, error } = await query.ilike('name', name).limit(1).maybeSingle()
       
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error in getCategoryByName:', error)
      throw error
    }
  }

  /**
   * Actualizar una categoría
   */
  async updateCategory(id, updates) {
    try {
      const { data, error } = await updateWithTenant('expense_categories', id, {
        ...updates,
        updated_at: new Date().toISOString()
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error in updateCategory:', error)
      throw error
    }
  }

  /**
   * Eliminar lógicamente una categoría
   */
  async deleteCategory(id) {
    return this.updateCategory(id, { is_active: false })
  }
}

export default new ExpenseCategoryService()
