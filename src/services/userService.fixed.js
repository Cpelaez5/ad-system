// Servicio de gestión de usuarios y roles con Supabase Multi-Tenant
// Integra Supabase Auth con sistema de organizaciones
import { supabase } from '@/lib/supabaseClient';
import { 
  getCurrentOrganizationId, 
  setCurrentOrganizationId, 
  clearCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant,
  deleteWithTenant
} from '@/utils/tenantHelpers';

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
  // ... otros roles ...
};

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

  // Otros métodos del servicio...
  async getUsers() {
    // Implementación...
  },

  async getUserById(id) {
    // Implementación...
  },

  async logout() {
    try {
      console.log('🔄 Cerrando sesión...');
      
      // Cerrar sesión en Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('⚠️ Error al cerrar sesión en Supabase:', error.message);
      }
      
      // Limpiar datos locales
      clearCurrentOrganizationId();
      localStorage.removeItem('authToken');
      localStorage.removeItem('usuarioAutenticado');
      localStorage.removeItem('currentUser');
      
      console.log('✅ Sesión cerrada correctamente');
      return { success: true, message: 'Sesión cerrada correctamente' };
      
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      return { success: false, message: 'Error al cerrar sesión' };
    }
  }
};

export default userService;
