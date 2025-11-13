// Servicio de gestión de usuarios y roles con Supabase Multi-Tenant
// Integra Supabase Auth con sistema de organizaciones
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

// Los datos de usuarios vienen únicamente de Supabase (sin fallbacks)

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
  },
  super_admin: {
    name: 'Super Administrador',
    description: 'Gestión total del sistema y todas las organizaciones',
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
    color: '#000000',
    icon: 'mdi-crown'
  }
}

const userService = {
  // Autenticación con Supabase Auth y Multi-Tenancy
  async login(credentials) {
    try {
      console.log('🔑 Iniciando proceso de login...', {
        email: credentials.email || credentials.usuario,
        hasPassword: !!credentials.password
      });
      
      // Validar credenciales
      if (!credentials) {
        return { success: false, message: 'Credenciales no proporcionadas' };
      }
      
      const email = credentials.email || credentials.usuario || '';
      const password = credentials.password || '';
      
      if (!email || !password) {
        return { success: false, message: 'Email/usuario y contraseña son requeridos' };
      }
      
      // Normalizar email
      const normalizedEmail = email.includes('@') ? email : `${email}@sistema.local`;
      
      // 1. Autenticar con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password
      });
      
      if (authError) {
        console.error('❌ Error de autenticación:', {
          code: authError.status,
          message: authError.message
        });
        return { 
          success: false, 
          message: authError.message || 'Error al iniciar sesión',
          error: authError 
        };
      }
      
      if (!authData?.user) {
        throw new Error('No se pudo obtener información del usuario después de la autenticación');
      }
      
      console.log('✅ Autenticación exitosa, ID de usuario:', authData.user.id);

      // 2. Obtener perfil con reintentos
      let profile = null;
      let attempts = 0;
      const maxAttempts = 3;
      const delay = 500; // ms entre reintentos

      while (attempts < maxAttempts && !profile) {
        attempts++;
        console.log(`🔄 Intento ${attempts} de obtener perfil...`);
        
        try {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*, organizations(*)')
            .eq('id', authData.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn(`⚠️ Error al obtener perfil (intento ${attempts}):`, profileError);
          } else if (data) {
            console.log('✅ Perfil obtenido correctamente');
            profile = data;
            break;
          } else {
            console.log(`ℹ️ Perfil no encontrado (intento ${attempts})`);
          }
        } catch (error) {
          console.warn(`⚠️ Excepción al obtener perfil (intento ${attempts}):`, error.message);
        }

        if (attempts < maxAttempts) {
          console.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // 3. Si no se encontró perfil, intentar crearlo
      if (!profile) {
        try {
          console.log('🔄 Intentando crear perfil automáticamente...');
          const metadata = authData.user.user_metadata || authData.user?.raw_user_meta_data || {};
          
          // Construir objeto de perfil
          const newProfile = {
            id: authData.user.id,
            email: authData.user.email,
            username: metadata.username || authData.user.email?.split('@')[0] || authData.user.id,
            first_name: metadata.first_name || metadata.firstName || '',
            last_name: metadata.last_name || metadata.lastName || '',
            role: metadata.role || 'user',
            is_active: true
          };

          // Intentar insertar el perfil
          const { data: insertedProfile, error: insertError } = await supabase
            .from('users')
            .insert(newProfile)
            .select('*, organizations(*)')
            .maybeSingle();

          if (insertError) {
            console.warn('⚠️ No se pudo crear perfil automáticamente:', insertError);
          } else {
            console.log('✅ Perfil creado automáticamente');
            profile = insertedProfile;
          }
        } catch (error) {
          console.error('❌ Error al crear perfil automáticamente:', error);
        }
      }

      // 4. Verificar que el usuario esté activo
      if (profile && profile.is_active === false) {
        console.warn('⚠️ Usuario inactivo');
        return { 
          success: false, 
          message: 'Usuario inactivo. Por favor, contacta al administrador.',
          error: { code: 'USER_INACTIVE' }
        };
      }
      
      // 5. Guardar organization_id para uso global (si está disponible)
      if (profile?.organization_id) {
        setCurrentOrganizationId(profile.organization_id);
      }
      
      // 6. Actualizar último login (si existe profile en public.users)
      if (profile?.id) {
        try {
          await supabase
            .from('users')
            .update({ 
              last_login: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);
        } catch (updateError) {
          console.warn('⚠️ No se pudo actualizar la fecha de último acceso:', updateError);
        }
      }
      
      // 7. Combinar datos de autenticación con perfil
      const userData = {
        ...authData.user,
        ...profile,
        organization: profile?.organizations || null
      };

      // 8. Preparar respuesta
      const response = {
        success: true,
        user: {
          id: userData.id,
          username: userData.username || (userData.email ? userData.email.split('@')[0] : userData.id),
          email: userData.email,
          firstName: userData.first_name || userData.user_metadata?.first_name || '',
          lastName: userData.last_name || userData.user_metadata?.last_name || '',
          role: userData.role || userData.user_metadata?.role || 'user',
          isActive: userData.is_active !== false, // Por defecto true si no está definido
          avatar: userData.avatar_url || null,
          lastLogin: userData.last_login || null,
          organization: userData.organization,
          organization_id: userData.organization_id || null
        },
        session: authData.session,
        token: authData.session?.access_token || null,
        expiresAt: authData.session?.expires_at ? new Date(authData.session.expires_at * 1000) : null
      };
      
      console.log('✅ Autenticación exitosa');
      return response;

    } catch (error) {
      console.error('❌ Error en el servicio de autenticación:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      return {
        success: false,
        user: null,
        session: null,
        error: {
          message: error.message || 'Error al iniciar sesión',
          code: error.code,
          details: error.details
        }
      };
    }
  },

  // Obtener todos los usuarios de la organización actual
  async getUsers() {
    try {
      console.log('🔄 Obteniendo usuarios desde Supabase...')
      
      // Intentar obtener desde Supabase
      const { data: users, error } = await queryWithTenant('users', '*, organizations(*)')
      
      if (error) {
        console.warn('⚠️ Error al obtener usuarios desde Supabase:', error.message)
        return []
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
        console.error('❌ Usuario no encontrado en Supabase')
        return null
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
      return null
    }
  },

  // Crear nuevo usuario
  async createUser(userData) {
    try {
      console.log('🔄 Creando usuario en Supabase...')
      
      // 1. Crear usuario en Supabase Auth
      // IMPORTANTE: la creación de usuarios de terceros desde el cliente
      // con signUp puede cambiar la sesión actual. En producción, se debe
      // usar un endpoint seguro (service_role) para invitar usuarios.
      return { success: false, message: 'Creación de usuarios debe hacerse por el Super Admin en Supabase Dashboard o vía backend con service_role.' }
      
      // Código previo desactivado hasta implementar backend seguro
      
    } catch (error) {
      console.error('❌ Error inesperado al crear usuario:', error)
      return { success: false, message: 'Error al crear usuario' }
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
        console.error('❌ Error al actualizar usuario en Supabase:', error.message)
        return { success: false, message: 'Error al actualizar usuario' }
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
      return { success: false, message: 'Error al actualizar usuario' }
    }
  },

  // Eliminar usuario (soft delete)
  async deleteUser(id) {
    try {
      console.log('🔄 Eliminando usuario en Supabase (soft delete)...')
      
      // Soft delete: marcar como inactivo
      const { data: deletedUser, error } = await updateWithTenant('users', id, { is_active: false })
      
      if (error) {
        console.error('❌ Error al eliminar usuario en Supabase:', error.message)
        return { success: false, message: 'Error al eliminar usuario' }
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
      return { success: false, message: 'Error al eliminar usuario' }
    }
  },

  // Obtener roles disponibles
  async getRoles() {
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
        console.error('❌ Error al cambiar contraseña en Supabase:', error.message)
        return { success: false, message: 'Error al cambiar contraseña' }
      }
      
      console.log('✅ Contraseña actualizada en Supabase')
      return { success: true, message: 'Contraseña actualizada correctamente' }
      
    } catch (error) {
      console.error('❌ Error inesperado al cambiar contraseña:', error)
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
        console.error('❌ Error al resetear contraseña en Supabase:', error.message)
        return { success: false, message: 'Error al resetear contraseña' }
      }
      
      console.log('✅ Contraseña reseteada en Supabase')
      return { success: true, message: 'Contraseña reseteada correctamente' }
      
    } catch (error) {
      console.error('❌ Error inesperado al resetear contraseña:', error)
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
