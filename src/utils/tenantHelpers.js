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
    // Intentar obtener de ambas claves (compatibilidad)
    let orgId = localStorage.getItem('organization_id') || localStorage.getItem('current_organization_id')

    // Si no hay organization_id o es el mock, intentar obtener del usuario actual
    if (!orgId || orgId === 'mock-org-1' || orgId === 'mock-org-2') {
      console.warn('⚠️ Organization ID inválido o mock detectado')

      // Intentar obtener del usuario actual
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
        if (currentUser?.organization_id) {
          orgId = currentUser.organization_id
          localStorage.setItem('organization_id', orgId)
          localStorage.setItem('current_organization_id', orgId)
          console.log('✅ Organization ID obtenido del usuario actual:', orgId)
          return orgId
        }
        
        // Si es super_admin, asignar el ID global para que puedan guardar sus preferencias
        if (currentUser?.role === 'super_admin') {
          orgId = '11111111-1111-1111-1111-111111111111'
          localStorage.setItem('organization_id', orgId)
          localStorage.setItem('current_organization_id', orgId)
          console.log('✅ Organization ID global asignado para super_admin:', orgId)
          return orgId
        }
      } catch (e) {
        console.warn('⚠️ No se pudo obtener organization_id del usuario actual')
      }

      // Si aún no hay organization_id, NO usar fallback inseguro
      // En su lugar, retornar null y dejar que el servicio maneje el error
      console.error('❌ No se pudo obtener organization_id válido')
      return null
    }

    // Guardar en ambas claves para compatibilidad
    localStorage.setItem('organization_id', orgId)
    localStorage.setItem('current_organization_id', orgId)

    console.log('✅ Organization ID válido encontrado:', orgId)
    return orgId
  } catch (error) {
    console.error('❌ Error al obtener organization_id:', error)
    // NO usar fallback inseguro - retornar null
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

    // Guardar en ambas claves para compatibilidad
    localStorage.setItem('organization_id', organizationId)
    localStorage.setItem('current_organization_id', organizationId)
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
    localStorage.removeItem('current_organization_id')
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
 * @param {object} options - Opciones adicionales
 * @param {string} options.returning - Columnas a devolver (ej: 'representation', 'minimal')
 * @returns {Promise<{data: any, error: any, rlsBlocked: boolean}>} Resultado de la inserción
 */
export async function insertWithTenant(table, data, options = {}) {
  try {
    const orgId = getCurrentOrganizationId()

    if (!orgId) {
      throw new Error('No se puede insertar sin organization_id')
    }

    // Agregar organization_id automáticamente si no está presente
    const dataWithTenant = {
      ...data,
      organization_id: data.organization_id || orgId
    }

    console.log(`🔄 Insertando en ${table} con organization_id:`, dataWithTenant.organization_id)

    let query = supabase.from(table).insert(dataWithTenant)

    // Aplicar opciones de retorno si se especifican
    if (options.returning) {
      query = query.select(options.returning === 'representation' ? '*' : options.returning)
    }

    const { data: result, error } = await query

    if (error) {
      // Si es error de RLS, devolver indicador específico
      if (error.code === '42501' || (error.details && String(error.details).includes('row-level security'))) {
        console.warn(`⚠️ Inserción bloqueada por RLS en tabla ${table}:`, error.message)
        return { data: null, error, rlsBlocked: true }
      }

      console.error(`❌ Error en insertWithTenant para tabla ${table}:`, error)
      return { data: null, error, rlsBlocked: false }
    }

    return { data: result, error: null, rlsBlocked: false }

  } catch (error) {
    console.error(`❌ Error inesperado en insertWithTenant para tabla ${table}:`, error)
    return {
      data: null,
      error,
      rlsBlocked: error.code === '42501' || (error.details && String(error.details).includes('row-level security'))
    }
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

/**
 * Obtiene el ID del cliente actual del usuario autenticado (si es rol cliente)
 * 
 * @returns {string|null} El client_id o null si no está disponible
 */
export function getCurrentClientId() {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
    // Normalizar nombres de propiedad posibles
    return currentUser.client_id || currentUser.clientId || null
  } catch (error) {
    console.error('❌ Error al obtener client_id:', error)
    return null
  }
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
  handleTenantError,
  getCurrentClientId
}
