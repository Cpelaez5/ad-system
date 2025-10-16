/**
 * Helpers para Multi-Tenancy en el Sistema de Contabilidad
 * 
 * Este archivo contiene funciones auxiliares para manejar el concepto
 * de multi-tenancy, donde cada empresa (organización) tiene sus datos
 * completamente aislados.
 * 
 * Conceptos importantes:
 * - organization_id: Identificador único de cada empresa
 * - RLS (Row Level Security): Seguridad a nivel de base de datos
 * - Tenant awareness: Todas las queries deben filtrar por organización
 */

import { supabase } from '@/lib/supabaseClient'

/**
 * Obtiene el ID de la organización actual del usuario autenticado
 * 
 * @returns {string|null} El organization_id o null si no está disponible
 */
export function getCurrentOrganizationId() {
  try {
    const orgId = localStorage.getItem('organization_id')
    
    if (!orgId) {
      console.warn('⚠️ No se encontró organization_id en localStorage')
      return null
    }
    
    return orgId
  } catch (error) {
    console.error('❌ Error al obtener organization_id:', error)
    return null
  }
}

/**
 * Guarda el organization_id en localStorage para uso global
 * 
 * @param {string} organizationId - El ID de la organización
 */
export function setCurrentOrganizationId(organizationId) {
  try {
    if (!organizationId) {
      console.warn('⚠️ Intentando guardar organization_id vacío')
      return false
    }
    
    localStorage.setItem('organization_id', organizationId)
    console.log('✅ Organization ID guardado:', organizationId)
    return true
  } catch (error) {
    console.error('❌ Error al guardar organization_id:', error)
    return false
  }
}

/**
 * Limpia el organization_id del localStorage (para logout)
 */
export function clearCurrentOrganizationId() {
  try {
    localStorage.removeItem('organization_id')
    console.log('✅ Organization ID limpiado del localStorage')
    return true
  } catch (error) {
    console.error('❌ Error al limpiar organization_id:', error)
    return false
  }
}

/**
 * Helper para hacer queries con filtro automático por organización
 * 
 * Esta función simplifica las queries asegurando que siempre se filtren
 * por la organización actual del usuario.
 * 
 * @param {string} table - Nombre de la tabla
 * @param {string} selectQuery - Query de selección (por defecto '*')
 * @param {object} additionalFilters - Filtros adicionales opcionales
 * @returns {Promise} Query de Supabase con filtro de organización
 */
export async function queryWithTenant(table, selectQuery = '*', additionalFilters = {}) {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      throw new Error('No se puede hacer query sin organization_id')
    }
    
    // Crear la query base con filtro de organización
    let query = supabase
      .from(table)
      .select(selectQuery)
      .eq('organization_id', orgId)
    
    // Aplicar filtros adicionales si se proporcionan
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value)
      }
    })
    
    return query
  } catch (error) {
    console.error(`❌ Error en queryWithTenant para tabla ${table}:`, error)
    throw error
  }
}

/**
 * Helper para insertar datos con organization_id automático
 * 
 * @param {string} table - Nombre de la tabla
 * @param {object} data - Datos a insertar
 * @returns {Promise} Resultado de la inserción
 */
export async function insertWithTenant(table, data) {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      throw new Error('No se puede insertar sin organization_id')
    }
    
    // Agregar organization_id automáticamente
    const dataWithTenant = {
      ...data,
      organization_id: orgId
    }
    
    console.log(`🔄 Insertando en ${table} con organization_id:`, orgId)
    
    return await supabase
      .from(table)
      .insert(dataWithTenant)
  } catch (error) {
    console.error(`❌ Error en insertWithTenant para tabla ${table}:`, error)
    throw error
  }
}

/**
 * Helper para actualizar datos con validación de organización
 * 
 * @param {string} table - Nombre de la tabla
 * @param {string} id - ID del registro a actualizar
 * @param {object} data - Datos a actualizar
 * @returns {Promise} Resultado de la actualización
 */
export async function updateWithTenant(table, id, data) {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      throw new Error('No se puede actualizar sin organization_id')
    }
    
    console.log(`🔄 Actualizando ${table} ID ${id} con organization_id:`, orgId)
    
    return await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .eq('organization_id', orgId) // Asegurar que pertenece a la organización
  } catch (error) {
    console.error(`❌ Error en updateWithTenant para tabla ${table}:`, error)
    throw error
  }
}

/**
 * Helper para eliminar datos con validación de organización
 * 
 * @param {string} table - Nombre de la tabla
 * @param {string} id - ID del registro a eliminar
 * @returns {Promise} Resultado de la eliminación
 */
export async function deleteWithTenant(table, id) {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      throw new Error('No se puede eliminar sin organization_id')
    }
    
    console.log(`🔄 Eliminando ${table} ID ${id} con organization_id:`, orgId)
    
    return await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId) // Asegurar que pertenece a la organización
  } catch (error) {
    console.error(`❌ Error en deleteWithTenant para tabla ${table}:`, error)
    throw error
  }
}

/**
 * Verifica si un registro pertenece a la organización actual
 * 
 * @param {string} table - Nombre de la tabla
 * @param {string} id - ID del registro
 * @returns {Promise<boolean>} True si pertenece a la organización actual
 */
export async function belongsToCurrentTenant(table, id) {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      return false
    }
    
    const { data, error } = await supabase
      .from(table)
      .select('organization_id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single()
    
    if (error) {
      console.warn(`⚠️ Error al verificar tenant para ${table} ID ${id}:`, error)
      return false
    }
    
    return !!data
  } catch (error) {
    console.error(`❌ Error inesperado al verificar tenant para ${table}:`, error)
    return false
  }
}

/**
 * Obtiene el nombre de la organización actual
 * 
 * @returns {Promise<string|null>} Nombre de la organización o null
 */
export async function getCurrentOrganizationName() {
  try {
    const orgId = getCurrentOrganizationId()
    
    if (!orgId) {
      return null
    }
    
    const { data, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    
    if (error) {
      console.error('❌ Error al obtener nombre de organización:', error)
      return null
    }
    
    return data?.name || null
  } catch (error) {
    console.error('❌ Error inesperado al obtener nombre de organización:', error)
    return null
  }
}

/**
 * Helper para manejar errores de multi-tenancy
 * 
 * @param {Error} error - Error original
 * @param {string} operation - Operación que se estaba realizando
 * @returns {Error} Error procesado con información de contexto
 */
export function handleTenantError(error, operation) {
  console.error(`❌ Error en operación multi-tenant (${operation}):`, error)
  
  // Agregar contexto al error
  const tenantError = new Error(`Error en ${operation}: ${error.message}`)
  tenantError.originalError = error
  tenantError.operation = operation
  tenantError.organizationId = getCurrentOrganizationId()
  
  return tenantError
}

// Exportar funciones por defecto para facilitar el uso
export default {
  getCurrentOrganizationId,
  setCurrentOrganizationId,
  clearCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant,
  belongsToCurrentTenant,
  getCurrentOrganizationName,
  handleTenantError
}
