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
  deleteWithTenant,
  setCurrentClientId
} from '@/utils/tenantHelpers';
import userSettingsService from '@/services/user-settings-service.js';
import sealService from '@/services/seal-service.js';
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js';

// Definición de roles y permisos (simplificados para 4 tipos de usuarios)
const roles = {
  super_admin: {
    name: 'Super Administrador',
    description: 'Administra todas las empresas del sistema',
    permissions: ['*'], // Todos los permisos
    color: '#000000',
    icon: 'mdi-crown'
  },
  admin: {
    name: 'Contador Administrador',
    description: 'Administra usuarios y datos de su empresa',
    permissions: [
      'users.create', 'users.read', 'users.update', 'users.delete',
      'clients.create', 'clients.read', 'clients.update', 'clients.delete',
      'invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete',
      'accounting.create', 'accounting.read', 'accounting.update', 'accounting.delete',
      'audit.read', 'audit.create',
      'archive.create', 'archive.read', 'archive.update', 'archive.delete',
      'reports.generate', 'reports.export'
    ],
    color: '#f44336',
    icon: 'mdi-shield-crown'
  },
  contador: {
    name: 'Contador',
    description: 'Ve y gestiona datos de todos los clientes de su empresa',
    permissions: [
      'clients.read',
      'invoices.create', 'invoices.read', 'invoices.update',
      'accounting.create', 'accounting.read', 'accounting.update',
      'archive.create', 'archive.read',
      'reports.generate', 'reports.export'
    ],
    color: '#2196f3',
    icon: 'mdi-calculator'
  },
  cliente: {
    name: 'Cliente',
    description: 'Ve y gestiona solo sus propios datos',
    permissions: [
      'invoices.create', 'invoices.read', 'invoices.update',
      'archive.create', 'archive.read', 'archive.update'
    ],
    color: '#4caf50',
    icon: 'mdi-account'
  }
};

// Caché en memoria del usuario actual, para evitar relecturas redundantes
// (p.ej. el router guard) dentro de la misma sesión de pestaña.
// Se invalida en login/logout y cuando Supabase reporta un cambio de usuario.
let cachedCurrentUser = null

function setCurrentUserCache(user) {
  cachedCurrentUser = user || null
}

function clearCurrentUserCache() {
  cachedCurrentUser = null
}

try {
  if (supabase?.auth?.onAuthStateChange) {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearCurrentUserCache()
      } else if (cachedCurrentUser && session?.user?.id && session.user.id !== cachedCurrentUser.id) {
        // Cambió el usuario de la sesión (otra cuenta) sin pasar por logout()
        clearCurrentUserCache()
      }
    })
  }
} catch {
  // En entornos de test con un mock parcial de supabase, seguimos sin esta sincronización extra.
}

const userService = {
  // Autenticación con Supabase Auth y Multi-Tenancy
  async login(credentials) {
    try {
      // Cualquier login (incluso de otra cuenta en la misma pestaña) invalida la caché previa.
      clearCurrentUserCache()
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
          // Query corregida: obtener datos básicos primero y luego el cliente si existe
          const { data, error: profileError } = await supabase
            .from('users')
            .select(`
              *,
              organizations(*)
            `)
            .eq('id', authData.user.id)
            .maybeSingle();

          // Si hay un client_id, obtener los datos del cliente por separado
          if (!profileError && data?.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('*')
              .eq('id', data.client_id)
              .maybeSingle();

            if (clientData) {
              data.clients = clientData;
            }
          }

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

      // 3. Si no se encontró perfil, intentar crearlo (manejo seguro con RLS)
      if (!profile) {
        try {
          console.log('🔄 Intentando crear perfil automáticamente (manejo RLS-safe)...');
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

          // Intentar insertar el perfil usando insertWithTenant si existe, o supabase directamente
          let insertResult;
          try {
            if (typeof insertWithTenant === 'function') {
              insertResult = await insertWithTenant('users', newProfile, { returning: 'representation' });
            } else {
              const result = await supabase
                .from('users')
                .insert(newProfile)
                .select('*, organizations(*)')
                .maybeSingle();
              insertResult = {
                data: result.data,
                error: result.error,
                rlsBlocked: result.error?.code === '42501' ||
                  (result.error?.details && String(result.error.details).includes('row-level security'))
              };
            }
          } catch (err) {
            // Si el helper lanza, convertir a objeto normal
            insertResult = {
              error: err,
              data: null,
              rlsBlocked: err.code === '42501' ||
                (err.details && String(err.details).includes('row-level security'))
            };
          }

          // Normalizar resultado
          const insertedData = insertResult?.data || null;
          const insertError = insertResult?.error || null;
          const rlsBlocked = insertResult?.rlsBlocked || false;

          if (insertError) {
            console.warn('⚠️ No se pudo crear perfil automáticamente:', insertError);

            // Si la causa es RLS, esperar al trigger y reintentar lectura
            if (rlsBlocked) {
              console.log('ℹ️ Inserción bloqueada por RLS. Esperando al trigger para crear el perfil...');
              await new Promise(res => setTimeout(res, 700)); // Esperar 700ms

              try {
                const { data: retriedProfile, error: retryError } = await supabase
                  .from('users')
                  .select('*, organizations(*)')
                  .eq('id', authData.user.id)
                  .maybeSingle();

                if (!retryError && retriedProfile) {
                  profile = retriedProfile;
                  console.log('✅ Perfil encontrado tras esperar (trigger completó la inserción).');
                } else {
                  console.warn('⚠️ Tras esperar, perfil aún no existe o hay error:', retryError || 'no data');
                }
              } catch (readError) {
                console.warn('⚠️ Error reintentando lectura después de RLS:', readError);
              }
            }
          } else if (insertedData) {
            // Si la inserción tuvo éxito y devolvió el perfil
            profile = insertedData;
            console.log('✅ Perfil creado automáticamente y asignado en frontend.');
          }
        } catch (error) {
          console.error('❌ Error al crear perfil automáticamente (bloqueado por RLS o inesperado):', error);
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
        organization: profile?.organizations || null,
        client: profile?.clients || null
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
          organization_id: userData.organization_id || null,
          client_id: userData.client_id || null,
          client: userData.client || null,
          plan_id: userData.plan_id || null,
          trial_end: userData.trial_end || null
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

  // Obtener usuario actual desde localStorage o Supabase
  async getCurrentUser(forceRefresh = false) {
    try {
      // 0. Caché en memoria: evita incluso volver a leer/parsear localStorage
      //    cuando varias partes de la app (p.ej. el router guard) lo piden
      //    dentro de la misma navegación.
      if (!forceRefresh && cachedCurrentUser) {
        return cachedCurrentUser;
      }

      // Primero intentar desde localStorage si no se fuerza la actualización
      if (!forceRefresh) {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user && user.id) {
              // Validar si es un cliente y le faltan los datos de cliente (cache antigua)
              if (user.client_id && !user.client) {
                console.log('⚠️ Cache de usuario desactualizada (falta datos de cliente), recargando...');
                // Continuar a carga desde Supabase
              } else {
                if (user.client && !user.client.estado && (user.client.municipio_id || user.client.municipio)) {
                  user.client.estado = venezuelaLocationsService.getStateByMunicipality(user.client.municipio_id || user.client.municipio) || '';
                }
                console.log('✅ Usuario actual obtenido desde localStorage');
                setCurrentUserCache(user);
                return user;
              }
            }
          } catch (e) {
            console.warn('⚠️ Error al parsear usuario desde localStorage:', e);
          }
        }
      }

        // Si no hay en localStorage, obtener desde Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          console.warn('⚠️ No hay usuario autenticado');
          return null;
        }

        // Obtener perfil completo desde la tabla users
        const { data: profile, error } = await supabase
          .from('users')
          .select(`
          *,
          organizations(*)
        `)
          .eq('id', authUser.id)
          .maybeSingle();

        // Si hay un client_id, obtener los datos del cliente por separado
        if (!error && profile?.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('*')
            .eq('id', profile.client_id)
            .maybeSingle();

          if (clientData) {
            if (!clientData.estado && (clientData.municipio_id || clientData.municipio)) {
              clientData.estado = venezuelaLocationsService.getStateByMunicipality(clientData.municipio_id || clientData.municipio) || '';
            }
            profile.clients = clientData;
          }
        }

        if (error) {
          console.warn('⚠️ Error al obtener perfil del usuario:', error);
          return null;
        }

        if (!profile) {
          console.warn('⚠️ El usuario no existe en la tabla users. Por favor, contacta al administrador para crear tu perfil.');
          // Retornar un objeto básico para evitar errores, pero sin rol válido
          return {
            id: authUser.id,
            email: authUser.email,
            role: 'authenticated', // Rol temporal hasta que se cree el perfil
            needsProfile: true // Flag para indicar que necesita crear perfil
          };
        }

        // Transformar a formato estándar
        const user = {
          id: profile.id,
          username: profile.username || (profile.email ? profile.email.split('@')[0] : profile.id),
          email: profile.email,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
          role: profile.role || 'user',
          isActive: profile.is_active !== false,
          avatar: profile.avatar_url || null,
          lastLogin: profile.last_login || null,
          organization: profile.organizations || null,
          organization_id: profile.organization_id || null,
          client_id: profile.client_id || null,
          client: profile.clients || null,
          plan_id: profile.plan_id || null,
          trial_end: profile.trial_end || null
        };

        // Guardar en localStorage para próximas consultas
        localStorage.setItem('currentUser', JSON.stringify(user));
        if (user.organization_id) {
          setCurrentOrganizationId(user.organization_id);
        }
        setCurrentUserCache(user);

        console.log('✅ Usuario actual obtenido desde Supabase');
        return user;

      } catch (error) {
        console.error('❌ Error al obtener usuario actual:', error);
        return null;
      }
    },

  // Obtener todos los usuarios de la organización actual
  async getUsers() {
      try {
        console.log('🔄 Obteniendo usuarios desde Supabase...');

        const currentUser = await this.getCurrentUser();
        if (!currentUser) {
          return [];
        }

        // Super admin ve todos los usuarios
        if (currentUser.role === 'super_admin') {
          const { data: users, error } = await supabase
            .from('users')
            .select('*, organizations(*)')
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('⚠️ Error al obtener usuarios:', error.message);
            return [];
          }

          return users.map(user => this.transformUser(user));
        }

        // Admin y contador ven usuarios de su organización
        if (currentUser.role === 'admin' || currentUser.role === 'contador') {
          const orgId = getCurrentOrganizationId();
          if (!orgId) {
            console.warn('⚠️ No hay organization_id disponible');
            return [];
          }

          const { data: users, error } = await supabase
            .from('users')
            .select('*, organizations(*)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

          if (error) {
            console.warn('⚠️ Error al obtener usuarios desde Supabase:', error.message);
            return [];
          }

          return (users || []).map(user => this.transformUser(user));
        }

        // Cliente solo ve su propio perfil
        if (currentUser.role === 'cliente') {
          return [currentUser];
        }

        return [];

      } catch (error) {
        console.error('❌ Error inesperado al obtener usuarios:', error);
        return [];
      }
    },

    // Transformar usuario de formato BD a formato frontend
    transformUser(userData) {
      return {
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
        organization: userData.organizations,
        organization_id: userData.organization_id,
        client_id: userData.client_id,
        plan_id: userData.plan_id,
        trial_end: userData.trial_end,
        invitedAt: userData.invited_at
      };
    },

  // Obtener usuario por ID
  async getUserById(id) {
      try {
        console.log('🔄 Obteniendo usuario por ID desde Supabase...');

        const { data: user, error } = await supabase
          .from('users')
          .select('*, organizations(*)')
          .eq('id', id)
          .maybeSingle();

        if (error || !user) {
          console.error('❌ Usuario no encontrado en Supabase');
          return null;
        }

        console.log('✅ Usuario obtenido desde Supabase:', user.username);
        return this.transformUser(user);

      } catch (error) {
        console.error('❌ Error inesperado al obtener usuario:', error);
        return null;
      }
    },

    // Obtener roles disponibles
    getRoles() {
      return roles;
    },

    // Verificar permisos
    hasPermission(userRole, permission) {
      const role = roles[userRole];
      if (!role) return false;
      if (role.permissions.includes('*')) return true;
      return role.permissions.includes(permission);
    },

    // Obtener permisos de un rol
    getRolePermissions(role) {
      return roles[role]?.permissions || [];
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
        clearCurrentUserCache();
        userSettingsService.clearLocalCache();
        sealService.clearLocalCache();

        console.log('✅ Sesión cerrada correctamente');
        return { success: true, message: 'Sesión cerrada correctamente' };

      } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        return { success: false, message: 'Error al cerrar sesión' };
      }
    },

  async updateUserProfile(userId, profileData) {
      try {
        const userUpdates = {
          updated_at: new Date().toISOString(),
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          username: profileData.username
        };

        // Filter undefined
        Object.keys(userUpdates).forEach(key => userUpdates[key] === undefined && delete userUpdates[key]);

        const { error: errorUser } = await supabase.from('users').update(userUpdates).eq('id', userId);
        if (errorUser) throw errorUser;

        if (profileData.client?.id) {
          const clientUpdates = {
            company_name: profileData.client.companyName,
            rif: profileData.client.rif,
            phone: profileData.client.phone,
            address: profileData.client.address,
            activity_type: profileData.client.activity_type,
            licencia_actividad_economica: profileData.client.licencia_actividad_economica,
            // I6 (ola patrón Mi negocio): "estado" se perdía porque nunca se
            // mapeaba aquí — ClienteMiArea.vue sí lo enviaba, pero este método
            // lo descartaba en silencio y solo guardaba el municipio.
            estado: profileData.client.estado,
            municipio_id: profileData.client.municipio_id || profileData.client.municipio,
            // Billing data
            billing_name: profileData.client.billing_name,
            billing_tax_id: profileData.client.billing_tax_id,
            billing_address: profileData.client.billing_address,
            // Perfil fiscal guiado (ola patrón Mi negocio). `es_contribuyente_especial`
            // es la columna que de verdad lee la lógica de retención en
            // SimpleInvoiceForm.vue; `is_special_taxpayer` es un duplicado
            // legado que antes era la única columna que este método
            // actualizaba (y que nadie más lee hoy) — se mantiene en
            // sincronía por compatibilidad, sin romper nada existente.
            es_contribuyente_especial: profileData.client.es_contribuyente_especial,
            is_special_taxpayer: profileData.client.is_special_taxpayer ?? profileData.client.es_contribuyente_especial,
            es_agente_retencion_municipal: profileData.client.es_agente_retencion_municipal,
            retains_islr: profileData.client.retains_islr,
            taxpayer_type: profileData.client.taxpayer_type
          };

          Object.keys(clientUpdates).forEach(key => clientUpdates[key] === undefined && delete clientUpdates[key]);

          if (Object.keys(clientUpdates).length > 0) {
            const { error: errorClient } = await supabase.from('clients').update(clientUpdates).eq('id', profileData.client.id);
            if (errorClient) {
              console.error('Error al actualizar datos de cliente en Supabase:', errorClient);
              const friendlyMessage = errorClient.code === 'PGRST116' || errorClient.message?.includes('schema cache')
                ? 'No se pudieron actualizar algunos datos de la empresa. Por favor intenta de nuevo.'
                : (errorClient.message || 'Error al actualizar datos de la empresa');
              throw { code: errorClient.code || 'CLIENT_UPDATE_ERROR', message: friendlyMessage };
            }
          }
        }

        // Recargar perfil completo y fresco de Supabase para actualizar cache local y notificar reactividad
        const freshUser = await this.getCurrentUser(true);
        if (freshUser) {
          localStorage.setItem('currentUser', JSON.stringify(freshUser));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ad-user-updated', { detail: freshUser }));
          }
        }

        return { success: true, user: freshUser };
      } catch (e) {
        console.error('Error al actualizar perfil de usuario:', e);
        const friendlyMessage = e?.message || (typeof e === 'string' ? e : 'Ocurrió un error al actualizar el perfil. Por favor intenta de nuevo.');
        return { success: false, error: { code: e?.code || 'UPDATE_ERROR', message: friendlyMessage } };
      }
    },

  async changePassword(email, currentPassword, newPassword) {
      try {
        // 1. Re-autenticar al usuario para verificar la contraseña actual
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: currentPassword
        });

        if (signInError) {
          console.warn('⚠️ Error de re-autenticación al cambiar contraseña:', signInError);
          return {
            success: false,
            message: 'La contraseña actual es incorrecta.'
          };
        }

        // 2. Si la contraseña actual es correcta, actualizar a la nueva
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

        if (updateError) {
          console.error('❌ Error al actualizar contraseña:', updateError);
          return {
            success: false,
            message: 'Error al actualizar la contraseña. Asegúrate de que cumpla con los requisitos de seguridad.'
          };
        }

        return { success: true };

      } catch (error) {
        console.error('❌ Error inesperado al cambiar contraseña:', error);
        return {
          success: false,
          message: 'Ocurrió un error inesperado.'
        };
      }
    },

    /**
     * Elimina en cascada a un usuario y todos sus datos asociados (facturas, empresas, credenciales).
     * EXCLUSIVO PARA SUPER ADMIN.
     * @param {string} userId - UUID del usuario a eliminar
     * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
     */
    async deleteUserCascade(userId) {
      try {
        if (!userId) throw new Error('ID de usuario no proporcionado.');

        const { data, error } = await supabase.rpc('delete_user_cascade', {
          target_user_id: userId
        });

        if (error) {
          console.error('❌ Error ejecutando delete_user_cascade:', error);
          return {
            success: false,
            error: error.message || 'No se pudo eliminar el usuario'
          };
        }

        if (data && data.success === false) {
          return {
            success: false,
            error: data.error || 'Error al eliminar usuario'
          };
        }

        return {
          success: true,
          message: data?.message || 'Usuario y todos sus registros asociados eliminados exitosamente'
        };
      } catch (e) {
        console.error('❌ Error inesperado en deleteUserCascade:', e);
        return {
          success: false,
          error: e.message || 'Error inesperado al procesar la eliminación'
        };
      }
    },

    /**
     * Invita a un usuario o reenvía la invitación invocando la Edge Function admin-invite-user.
     * @param {Object} payload - { email, role, firstName, lastName }
     * @returns {Promise<{ success: boolean, data?: object, message?: string }>}
     */
    async inviteUser({ email, role, firstName, lastName }) {
      try {
        const redirectUrl = window.location.origin + '/auth/set-password';
        const { data, error } = await supabase.functions.invoke('admin-invite-user', {
          body: {
            email,
            role,
            first_name: firstName,
            last_name: lastName,
            redirect_url: redirectUrl
          }
        });

        // Error de red o invocación
        if (error) {
          console.error('❌ Error de invocación Edge Function:', error);
          return { success: false, message: error.message || 'Error al conectar con el servidor' };
        }

        // La Edge Function devuelve error dentro de data cuando status != 200
        if (data?.error || data?.code) {
          console.error('❌ Error de lógica de negocio:', data);
          return { success: false, message: data.message || data.error || 'Error al procesar la invitación' };
        }

        return { success: true, data };
      } catch (error) {
        console.error('❌ Error inesperado al invitar usuario:', error);
        return { success: false, message: error.message || 'Error inesperado al invitar usuario' };
      }
    },

    /**
     * Reenvía la invitación a un usuario pendiente. Idempotente.
     * @param {Object} payload - { email, role, firstName, lastName }
     */
    async resendInvitation(payload) {
      return this.inviteUser(payload);
    }
  };


  export default userService;

