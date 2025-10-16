/**
 * Inicialización de Tenant para el Sistema de Contabilidad
 * 
 * Este archivo se ejecuta al inicio de la aplicación para asegurar
 * que el sistema tenga un organization_id válido configurado.
 */

import { getCurrentOrganizationId } from './tenantHelpers.js'

/**
 * Inicializa el tenant del sistema
 * Se ejecuta al cargar la aplicación para asegurar que hay un UUID válido
 */
export function initializeTenant() {
  console.log('🔄 Inicializando tenant del sistema...')
  
  try {
    const orgId = getCurrentOrganizationId()
    
    if (orgId && orgId !== 'mock-org-1' && orgId !== 'mock-org-2') {
      console.log('✅ Tenant inicializado correctamente:', orgId)
      return orgId
    } else {
      console.error('❌ Error al inicializar tenant')
      return null
    }
  } catch (error) {
    console.error('❌ Error inesperado al inicializar tenant:', error)
    return null
  }
}

/**
 * Fuerza la limpieza y reinicialización del tenant
 * Útil para debugging o cuando hay problemas con el organization_id
 */
export function resetTenant() {
  console.log('🔄 Reseteando tenant del sistema...')
  
  try {
    // Limpiar localStorage
    localStorage.removeItem('organization_id')
    
    // Establecer UUID real
    const defaultOrgId = '11111111-1111-1111-1111-111111111111'
    localStorage.setItem('organization_id', defaultOrgId)
    
    console.log('✅ Tenant reseteado y UUID establecido:', defaultOrgId)
    return defaultOrgId
  } catch (error) {
    console.error('❌ Error al resetear tenant:', error)
    return null
  }
}

// Ejecutar inicialización automáticamente
initializeTenant()
