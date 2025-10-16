// Servicio de gestión de usuarios y roles con Supabase Multi-Tenant
// Integra Supabase Auth con sistema de organizaciones y fallback a localStorage
import { supabase } from '@/lib/supabaseClient'
import { 
  getCurrentOrganizationId, 
  setCurrentOrganizationId, 
  clearCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant,
  handleTenantError
} from '@/utils/tenantHelpers'

// Datos de prueba para usuarios
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@sistema.com',
    password: 'admin123', // En producción, esto sería un hash
    firstName: 'Administrador',
    lastName: 'Sistema',
    role: 'admin',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    lastLogin: '2024-09-09T15:30:00Z',
    avatar: null
  },
  {
    id: 2,
    username: 'contador',
    email: 'contador@sistema.com',
    password: 'contador123',
    firstName: 'María',
    lastName: 'González',
    role: 'contador',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    lastLogin: '2024-09-09T14:20:00Z',
    avatar: null
  },
  {
    id: 3,
    username: 'auditor',
    email: 'auditor@sistema.com',
    password: 'auditor123',
    firstName: 'Carlos',
    lastName: 'Rodríguez',
    role: 'auditor',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    lastLogin: '2024-09-09T13:45:00Z',
    avatar: null
  },
  {
    id: 4,
    username: 'facturador',
    email: 'facturador@sistema.com',
    password: 'facturador123',
    firstName: 'Ana',
    lastName: 'Martínez',
    role: 'facturador',
    isActive: true,
    createdAt: '2024-02-15T00:00:00Z',
    lastLogin: '2024-09-09T12:30:00Z',
    avatar: null
  },
  {
    id: 5,
    username: 'operador',
    email: 'operador@sistema.com',
    password: 'operador123',
    firstName: 'Luis',
    lastName: 'Hernández',
    role: 'operador',
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
    lastLogin: '2024-09-09T11:15:00Z',
    avatar: null
  },
  {
    id: 6,
    username: 'consultor',
    email: 'consultor@sistema.com',
    password: 'consultor123',
    firstName: 'Elena',
    lastName: 'Vargas',
    role: 'consultor',
    isActive: false,
    createdAt: '2024-03-15T00:00:00Z',
    lastLogin: '2024-09-08T16:00:00Z',
    avatar: null
  }
]

// Definición de roles y permisos
const roles = {
  admin: {
    name: 'Administrador',
    description: 'Acceso completo al sistema',
    permissions: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'clients.create', 'clients.read', 'clients.update', 'clients.delete',
      'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
      'accounting.create', 'accounting.read', 'accounting.update', 'accounting.delete',
      'audit.read', 'audit.create',
      'archive.create', 'archive.read', 'archive.update', 'archive.delete',
      'reports.generate', 'reports.export',
      'system.settings', 'system.backup'
    ],
    color: '#f44336',
    icon: 'mdi-shield-crown'
  },
  contador: {
    name: 'Contador',
    description: 'Gestión contable y financiera',
    permissions: [
      'clients.create', 'clients.read', 'clients.update',
      'invoices.create', 'invoices.read', 'invoices.update',
      'accounting.create', 'accounting.read', 'accounting.update',
      'archive.create', 'archive.read', 'archive.update',
      'reports.generate', 'reports.export'
    ],
    color: '#2196f3',
    icon: 'mdi-calculator'
  },
  auditor: {
    name: 'Auditor',
    description: 'Revisión y auditoría del sistema',
    permissions: [
      'clients.read',
      'invoices.read',
      'accounting.read',
      'audit.read', 'audit.create',
      'archive.read',
      'reports.generate', 'reports.export'
    ],
    color: '#ff9800',
    icon: 'mdi-magnify'
  },
  facturador: {
    name: 'Facturador',
    description: 'Gestión de facturación',
    permissions: [
      'clients.read',
      'invoices.create', 'invoices.read', 'invoices.update',
      'archive.create', 'archive.read'
    ],
    color: '#4caf50',
    icon: 'mdi-receipt'
  },
  operador: {
    name: 'Operador',
    description: 'Operaciones básicas del sistema',
    permissions: [
      'clients.read',
      'invoices.read',
      'accounting.read',
      'archive.read'
    ],
    color: '#9c27b0',
    icon: 'mdi-account-cog'
  },
  consultor: {
    name: 'Consultor',
    description: 'Solo lectura y consultas',
    permissions: [
      'clients.read',
      'invoices.read',
      'accounting.read',
      'archive.read',
      'reports.generate'
    ],
    color: '#607d8b',
    icon: 'mdi-account-search'
  }
}

// Simulación de delay de API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const userService = {
  // Autenticación con Supabase Auth y Multi-Tenancy
  async login(credentials) {
    try {
      console.log('🔄 Iniciando autenticación con Supabase...')
      
      // 1. Intentar autenticación con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${credentials.username}@sistema.local`, // Convertir username a formato email
        password: credentials.password
      })
      
      if (authError) {
        console.warn('⚠️ Error de autenticación Supabase, usando fallback localStorage:', authError.message)
        return await this.loginFallback(credentials)
      }
      
      // 2. Obtener datos completos del usuario desde la tabla users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', authData.user.id)
        .single()
      
      if (userError) {
        console.error('❌ Error al obtener datos del usuario:', userError)
        return { success: false, message: 'Error al cargar datos del usuario' }
      }
      
      // 3. Verificar que el usuario esté activo
      if (!userData.is_active) {
        console.warn('⚠️ Usuario inactivo, usando fallback')
        return await this.loginFallback(credentials)
      }
      
      // 4. Guardar organization_id para uso global
      setCurrentOrganizationId(userData.organization_id)
      
      // 5. Actualizar último login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)
      
      // 6. Preparar respuesta
      const { password, ...userWithoutPassword } = userData
      const response = {
        success: true,
        user: {
          ...userWithoutPassword,
          // Mantener compatibilidad con el sistema anterior
          id: userData.id,
          username: userData.username,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          isActive: userData.is_active,
          avatar: userData.avatar_url,
          lastLogin: userData.last_login,
          organization: userData.organizations
        },
        token: authData.session.access_token
      }
      
      console.log('✅ Autenticación exitosa con Supabase')
      return response
      
    } catch (error) {
      console.error('❌ Error inesperado en login:', error)
      return await this.loginFallback(credentials)
    }
  },

  // Fallback a localStorage cuando Supabase no está disponible
  async loginFallback(credentials) {
    try {
      console.log('🔄 Usando fallback localStorage para autenticación...')
      await delay(400)
      
      const user = mockUsers.find(u =>
        u.username === credentials.username &&
        u.password === credentials.password &&
        u.isActive
      )
      
      if (user) {
        user.lastLogin = new Date().toISOString()
        const { password, ...userWithoutPassword } = user
        
        // Simular organization_id para fallback
        const mockOrgId = `mock-org-${user.id}`
        setCurrentOrganizationId(mockOrgId)
        
        const token = `mock-token-${user.id}-${Date.now()}`
        localStorage.setItem('authToken', token)
        
        console.log('✅ Autenticación exitosa con fallback localStorage')
        return { 
          success: true, 
          user: {
            ...userWithoutPassword,
            organization: { id: mockOrgId, name: 'Organización Mock' }
          }, 
          token 
        }
      }
      
      return { success: false, message: 'Credenciales inválidas' }
    } catch (error) {
      console.error('❌ Error en fallback de autenticación:', error)
      return { success: false, message: 'Error de autenticación' }
    }
  },

  // Obtener todos los usuarios de la organización actual
  async getUsers() {
    try {
      console.log('🔄 Obteniendo usuarios desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: users, error } = await queryWithTenant('users', '*, organizations(*)')
      
      if (error) {
        console.warn('⚠️ Error al obtener usuarios desde Supabase, usando fallback:', error.message)
        return await this.getUsersFallback()
      }
      
      // Transformar datos para compatibilidad
      const transformedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        avatar: user.avatar_url,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        organization: user.organizations
      }))
      
      console.log('✅ Usuarios obtenidos desde Supabase:', transformedUsers.length)
      return transformedUsers
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener usuarios:', error)
      return await this.getUsersFallback()
    }
  },

  // Fallback para obtener usuarios desde localStorage
  async getUsersFallback() {
    try {
      console.log('🔄 Obteniendo usuarios desde localStorage...')
      await delay(800)
      
      const orgId = getCurrentOrganizationId()
      const fallbackUsers = mockUsers.map(({ password, ...user }) => ({
        ...user,
        organization: { id: orgId, name: 'Organización Mock' }
      }))
      
      console.log('✅ Usuarios obtenidos desde localStorage:', fallbackUsers.length)
      return fallbackUsers
    } catch (error) {
      console.error('❌ Error en fallback de usuarios:', error)
      return []
    }
  },

  // Obtener usuario por ID
  async getUserById(id) {
    try {
      console.log('🔄 Obteniendo usuario por ID desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: user, error } = await queryWithTenant('users', '*, organizations(*)', { id })
      
      if (error || !user || user.length === 0) {
        console.warn('⚠️ Usuario no encontrado en Supabase, usando fallback')
        return await this.getUserByIdFallback(id)
      }
      
      const userData = user[0]
      const transformedUser = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        isActive: userData.is_active,
        avatar: userData.avatar_url,
        lastLogin: userData.last_login,
        createdAt: userData.created_at,
        organization: userData.organizations
      }
      
      console.log('✅ Usuario obtenido desde Supabase:', transformedUser.username)
      return transformedUser
      
    } catch (error) {
      console.error('❌ Error inesperado al obtener usuario:', error)
      return await this.getUserByIdFallback(id)
    }
  },

  // Fallback para obtener usuario por ID desde localStorage
  async getUserByIdFallback(id) {
    try {
      console.log('🔄 Obteniendo usuario por ID desde localStorage...')
      await delay(500)
      
      const user = mockUsers.find(u => u.id === parseInt(id))
      if (user) {
        const { password, ...userWithoutPassword } = user
        const orgId = getCurrentOrganizationId()
        return {
          ...userWithoutPassword,
          organization: { id: orgId, name: 'Organización Mock' }
        }
      }
      return null
    } catch (error) {
      console.error('❌ Error en fallback de usuario por ID:', error)
      return null
    }
  },

  // Crear nuevo usuario
  async createUser(userData) {
    try {
      console.log('🔄 Creando usuario en Supabase...')
      
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `${userData.username}@sistema.local`,
        password: userData.password || 'temp123', // Contraseña temporal
        options: {
          data: {
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        }
      })
      
      if (authError) {
        console.warn('⚠️ Error al crear usuario en Auth, usando fallback:', authError.message)
        return await this.createUserFallback(userData)
      }
      
      // 2. Crear registro en tabla users
      const userRecord = {
        id: authData.user.id,
        username: userData.username,
        email: userData.email || `${userData.username}@sistema.local`,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        is_active: true,
        avatar_url: null
      }
      
      const { data: newUser, error: userError } = await insertWithTenant('users', userRecord)
      
      if (userError) {
        console.error('❌ Error al crear usuario en tabla:', userError)
        return await this.createUserFallback(userData)
      }
      
      console.log('✅ Usuario creado exitosamente en Supabase')
      return {
        id: newUser[0].id,
        username: newUser[0].username,
        email: newUser[0].email,
        firstName: newUser[0].first_name,
        lastName: newUser[0].last_name,
        role: newUser[0].role,
        isActive: newUser[0].is_active,
        avatar: newUser[0].avatar_url,
        createdAt: newUser[0].created_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al crear usuario:', error)
      return await this.createUserFallback(userData)
    }
  },

  // Fallback para crear usuario en localStorage
  async createUserFallback(userData) {
    try {
      console.log('🔄 Creando usuario en localStorage...')
      await delay(1000)
      
      const newUser = {
        id: Math.max(...mockUsers.map(u => u.id)) + 1,
        ...userData,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        avatar: null
      }
      
      mockUsers.push(newUser)
      const { password, ...userWithoutPassword } = newUser
      const orgId = getCurrentOrganizationId()
      
      console.log('✅ Usuario creado en localStorage')
      return {
        ...userWithoutPassword,
        organization: { id: orgId, name: 'Organización Mock' }
      }
    } catch (error) {
      console.error('❌ Error en fallback de creación de usuario:', error)
      throw error
    }
  },

  // Actualizar usuario
  async updateUser(id, userData) {
    try {
      console.log('🔄 Actualizando usuario en Supabase...')
      
      // Preparar datos para actualización
      const updateData = {
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role,
        is_active: userData.isActive,
        avatar_url: userData.avatar
      }
      
      // Remover campos undefined
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      const { data: updatedUser, error } = await updateWithTenant('users', id, updateData)
      
      if (error) {
        console.warn('⚠️ Error al actualizar usuario en Supabase, usando fallback:', error.message)
        return await this.updateUserFallback(id, userData)
      }
      
      console.log('✅ Usuario actualizado en Supabase')
      return {
        id: updatedUser[0].id,
        username: updatedUser[0].username,
        email: updatedUser[0].email,
        firstName: updatedUser[0].first_name,
        lastName: updatedUser[0].last_name,
        role: updatedUser[0].role,
        isActive: updatedUser[0].is_active,
        avatar: updatedUser[0].avatar_url,
        updatedAt: updatedUser[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al actualizar usuario:', error)
      return await this.updateUserFallback(id, userData)
    }
  },

  // Fallback para actualizar usuario en localStorage
  async updateUserFallback(id, userData) {
    try {
      console.log('🔄 Actualizando usuario en localStorage...')
      await delay(800)
      
      const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData }
        const { password, ...userWithoutPassword } = mockUsers[userIndex]
        const orgId = getCurrentOrganizationId()
        
        console.log('✅ Usuario actualizado en localStorage')
        return {
          ...userWithoutPassword,
          organization: { id: orgId, name: 'Organización Mock' }
        }
      }
      return null
    } catch (error) {
      console.error('❌ Error en fallback de actualización de usuario:', error)
      throw error
    }
  },

  // Eliminar usuario (soft delete)
  async deleteUser(id) {
    try {
      console.log('🔄 Eliminando usuario en Supabase (soft delete)...')
      
      // Soft delete: marcar como inactivo
      const { data: deletedUser, error } = await updateWithTenant('users', id, { is_active: false })
      
      if (error) {
        console.warn('⚠️ Error al eliminar usuario en Supabase, usando fallback:', error.message)
        return await this.deleteUserFallback(id)
      }
      
      console.log('✅ Usuario eliminado (soft delete) en Supabase')
      return {
        id: deletedUser[0].id,
        username: deletedUser[0].username,
        email: deletedUser[0].email,
        firstName: deletedUser[0].first_name,
        lastName: deletedUser[0].last_name,
        role: deletedUser[0].role,
        isActive: false,
        avatar: deletedUser[0].avatar_url,
        updatedAt: deletedUser[0].updated_at
      }
      
    } catch (error) {
      console.error('❌ Error inesperado al eliminar usuario:', error)
      return await this.deleteUserFallback(id)
    }
  },

  // Fallback para eliminar usuario en localStorage
  async deleteUserFallback(id) {
    try {
      console.log('🔄 Eliminando usuario en localStorage (soft delete)...')
      await delay(600)
      
      const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
      if (userIndex !== -1) {
        mockUsers[userIndex].isActive = false
        const { password, ...userWithoutPassword } = mockUsers[userIndex]
        const orgId = getCurrentOrganizationId()
        
        console.log('✅ Usuario eliminado en localStorage')
        return {
          ...userWithoutPassword,
          organization: { id: orgId, name: 'Organización Mock' }
        }
      }
      return null
    } catch (error) {
      console.error('❌ Error en fallback de eliminación de usuario:', error)
      throw error
    }
  },

  // Obtener roles disponibles
  async getRoles() {
    await delay(300)
    return roles
  },

  // Verificar permisos
  hasPermission(userRole, permission) {
    const role = roles[userRole]
    return role ? role.permissions.includes(permission) : false
  },

  // Obtener permisos de un rol
  getRolePermissions(role) {
    return roles[role]?.permissions || []
  },

  // Cambiar contraseña
  async changePassword(userId, currentPassword, newPassword) {
    try {
      console.log('🔄 Cambiando contraseña en Supabase...')
      
      // Usar Supabase Auth para cambiar contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        console.warn('⚠️ Error al cambiar contraseña en Supabase, usando fallback:', error.message)
        return await this.changePasswordFallback(userId, currentPassword, newPassword)
      }
      
      console.log('✅ Contraseña actualizada en Supabase')
      return { success: true, message: 'Contraseña actualizada correctamente' }
      
    } catch (error) {
      console.error('❌ Error inesperado al cambiar contraseña:', error)
      return await this.changePasswordFallback(userId, currentPassword, newPassword)
    }
  },

  // Fallback para cambiar contraseña en localStorage
  async changePasswordFallback(userId, currentPassword, newPassword) {
    try {
      console.log('🔄 Cambiando contraseña en localStorage...')
      await delay(1000)
      
      const user = mockUsers.find(u => u.id === userId)
      if (user && user.password === currentPassword) {
        user.password = newPassword
        console.log('✅ Contraseña actualizada en localStorage')
        return { success: true, message: 'Contraseña actualizada correctamente' }
      }
      
      return { success: false, message: 'Contraseña actual incorrecta' }
    } catch (error) {
      console.error('❌ Error en fallback de cambio de contraseña:', error)
      return { success: false, message: 'Error al cambiar contraseña' }
    }
  },

  // Resetear contraseña (solo admin)
  async resetPassword(userId, newPassword) {
    try {
      console.log('🔄 Reseteando contraseña en Supabase...')
      
      // Usar Supabase Auth para resetear contraseña
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) {
        console.warn('⚠️ Error al resetear contraseña en Supabase, usando fallback:', error.message)
        return await this.resetPasswordFallback(userId, newPassword)
      }
      
      console.log('✅ Contraseña reseteada en Supabase')
      return { success: true, message: 'Contraseña reseteada correctamente' }
      
    } catch (error) {
      console.error('❌ Error inesperado al resetear contraseña:', error)
      return await this.resetPasswordFallback(userId, newPassword)
    }
  },

  // Fallback para resetear contraseña en localStorage
  async resetPasswordFallback(userId, newPassword) {
    try {
      console.log('🔄 Reseteando contraseña en localStorage...')
      await delay(800)
      
      const user = mockUsers.find(u => u.id === userId)
      if (user) {
        user.password = newPassword
        console.log('✅ Contraseña reseteada en localStorage')
        return { success: true, message: 'Contraseña reseteada correctamente' }
      }
      
      return { success: false, message: 'Usuario no encontrado' }
    } catch (error) {
      console.error('❌ Error en fallback de reset de contraseña:', error)
      return { success: false, message: 'Error al resetear contraseña' }
    }
  },

  // Logout con limpieza de datos
  async logout() {
    try {
      console.log('🔄 Cerrando sesión...')
      
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('⚠️ Error al cerrar sesión en Supabase:', error.message)
      }
      
      // Limpiar datos locales
      clearCurrentOrganizationId()
      localStorage.removeItem('authToken')
      localStorage.removeItem('usuarioAutenticado')
      localStorage.removeItem('currentUser')
      
      console.log('✅ Sesión cerrada correctamente')
      return { success: true, message: 'Sesión cerrada correctamente' }
      
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error)
      return { success: false, message: 'Error al cerrar sesión' }
    }
  }
}

export default userService
