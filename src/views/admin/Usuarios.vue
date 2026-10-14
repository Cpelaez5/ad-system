<template>
  <div class="usuarios-container">
    <!-- Toast de Notificaciones -->
    <div v-if="notification.show" class="notification-toast" :class="notification.type">
      <i :class="notification.icon" class="notification-icon"></i>
      <span class="notification-message">{{ notification.message }}</span>
      <button class="notification-close" @click="notification.show = false">
        <i class="mdi mdi-close"></i>
      </button>
    </div>

    <div class="page-header animate-slide-in-down">
      <div class="header-content">
        <div class="header-title">
          <i class="mdi mdi-account-group header-icon animate-micro-rotate"></i>
          <h1>Gestión de Usuarios</h1>
        </div>
        <p class="header-subtitle">Administra usuarios, roles y permisos del sistema</p>
      </div>
      <button 
        class="btn-primary animate-hover-lift"
        @click="openCreateModal"
        v-if="hasPermission('users.create')"
      >
        <i class="mdi mdi-email-plus-outline mr-1"></i>
        Invitar Usuario
      </button>
    </div>

    <!-- Filtros y búsqueda -->
    <div class="filters-section animate-fade-in animate-delay-200">
      <div class="search-container">
        <div class="search-input-container">
          <i class="mdi mdi-magnify search-icon"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar usuarios..."
            class="search-input"
            @input="filterUsers"
          />
        </div>
        <select v-model="roleFilter" @change="filterUsers" class="role-filter">
          <option value="">Todos los roles</option>
          <option v-for="(role, key) in roles" :key="key" :value="key">
            {{ role.name }}
          </option>
        </select>
        <select v-model="statusFilter" @change="filterUsers" class="status-filter">
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>
    </div>

    <!-- Tabla de usuarios -->
    <div class="table-container animate-slide-in-up animate-delay-300">
      <div class="table-wrapper">
        <table class="users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Plan</th>
              <th>Fin Prueba</th>
              <th>Estado</th>
              <th>Último Login</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(user, index) in filteredUsers" 
              :key="user.id"
              class="table-row animate-fade-in"
              :style="{ animationDelay: `${index * 100}ms` }"
            >
              <td class="user-info">
                <div class="user-avatar">
                  <i :class="getRoleIcon(user.role)"></i>
                </div>
                <span class="username">{{ user.username }}</span>
              </td>
              <td>{{ user.firstName }} {{ user.lastName }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span 
                  class="role-badge"
                  :style="{ backgroundColor: getRoleColor(user.role) }"
                >
                  {{ getRoleName(user.role) }}
                </span>
              </td>
              <td>
                <span class="plan-badge">{{ getPlanName(user.plan_id) }}</span>
              </td>
              <td>
                {{ formatDate(user.trial_end) }}
              </td>
              <td>
                <span 
                  class="status-badge"
                  :class="{ active: user.isActive, inactive: !user.isActive }"
                  :title="user.isActive ? 'Usuario activo en el sistema' : 'El usuario aún no ha configurado su contraseña de acceso'"
                >
                  <i :class="user.isActive ? 'mdi mdi-check-circle-outline' : 'mdi mdi-clock-outline'" style="font-size: 13px; margin-right: 4px;"></i>
                  {{ user.isActive ? 'Activo' : 'Invitación Pendiente' }}
                </span>
              </td>
              <td class="last-login">
                {{ formatDate(user.lastLogin) }}
              </td>
              <td class="actions">
                <button 
                  class="btn-action btn-resend animate-micro-bounce"
                  @click="resendInvite(user)"
                  v-if="!user.isActive && hasPermission('users.update')"
                  title="Reenviar correo de invitación"
                >
                  <i class="mdi mdi-email-sync"></i>
                </button>
                <button 
                  class="btn-action btn-view animate-micro-bounce"
                  @click="viewUser(user)"
                  title="Ver detalles"
                >
                  <i class="mdi mdi-eye"></i>
                </button>
                <button 
                  class="btn-action btn-edit animate-micro-bounce"
                  @click="editUser(user)"
                  v-if="hasPermission('users.update')"
                  title="Editar usuario"
                >
                  <i class="mdi mdi-pencil"></i>
                </button>
                <button 
                  class="btn-action btn-trial animate-micro-bounce"
                  @click="editTrial(user)"
                  v-if="hasPermission('users.update')"
                  title="Gestionar Prueba/Plan"
                >
                  <i class="mdi mdi-calendar-clock"></i>
                </button>
                <button 
                  class="btn-action btn-delete animate-micro-bounce"
                  @click="confirmDeleteUser(user)"
                  v-if="isSuperAdmin && user.role !== 'super_admin'"
                  title="Eliminar usuario y empresa en cascada (Exclusivo Super Admin)"
                >
                  <i class="mdi mdi-delete-forever"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal de creación/edición -->
    <div v-if="showModal" class="modal-overlay animate-fade-in" @click="closeModal">
      <div class="modal-content animate-scale-in" @click.stop>
        <div class="modal-header">
          <h2>{{ isEditing ? 'Editar Usuario' : 'Invitar Usuario al Sistema' }}</h2>
          <button class="btn-close animate-micro-rotate" @click="closeModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        
        <form @submit.prevent="saveUser" class="modal-form">
          <!-- Modo Edición: Campos de identificación -->
          <div v-if="isEditing" class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre de usuario</label>
              <input
                v-model="formData.username"
                type="text"
                class="form-input"
                disabled
              />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                v-model="formData.email"
                type="email"
                class="form-input"
                disabled
              />
            </div>
          </div>

          <!-- Modo Invitación: Campo de Email destacado con ayuda -->
          <div v-if="!isEditing" class="form-group">
            <label class="form-label">Correo Electrónico *</label>
            <input
              v-model="formData.email"
              type="email"
              class="form-input"
              placeholder="ejemplo@empresa.com"
              required
            />
            <small class="field-hint">A esta dirección llegará el correo con el enlace seguro para activar la cuenta.</small>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input
                v-model="formData.firstName"
                type="text"
                class="form-input"
                placeholder="Nombre"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Apellido *</label>
              <input
                v-model="formData.lastName"
                type="text"
                class="form-input"
                placeholder="Apellido"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Rol en el Sistema *</label>
            <select v-model="formData.role" class="form-select" required>
              <option value="">Selecciona un rol...</option>
              <option v-for="(role, key) in availableRoles" :key="key" :value="key">
                {{ role.name }} — {{ role.description }}
              </option>
            </select>
          </div>
          
          <div v-if="!isEditing" class="invite-info-box">
            <div class="invite-info-icon">
              <i class="mdi mdi-email-check-outline"></i>
            </div>
            <div class="invite-info-text">
              <strong>Envío automático de invitación</strong>
              <p>El usuario recibirá un correo con el diseño institucional de <strong>AD System</strong> para activar su cuenta y crear su propia contraseña. No requieres asignarle una clave provisional.</p>
            </div>
          </div>
          
          <div v-if="isEditing" class="form-group">
            <label class="checkbox-container">
              <input
                v-model="formData.isActive"
                type="checkbox"
                class="checkbox-input"
              />
              <span class="checkbox-label">Usuario activo</span>
            </label>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <span v-if="!loading">{{ isEditing ? 'Actualizar Usuario' : 'Enviar Invitación' }}</span>
              <span v-else class="loading-spinner">Procesando...</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de detalles -->
    <div v-if="showDetailsModal" class="modal-overlay animate-fade-in" @click="closeDetailsModal">
      <div class="modal-content animate-scale-in" @click.stop>
        <div class="modal-header">
          <h2>Detalles del Usuario</h2>
          <button class="btn-close animate-micro-rotate" @click="closeDetailsModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        
        <div v-if="selectedUser" class="user-details">
          <div class="detail-section">
            <h3>Información Personal</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Usuario:</label>
                <span>{{ selectedUser.username }}</span>
              </div>
              <div class="detail-item">
                <label>Email:</label>
                <span>{{ selectedUser.email }}</span>
              </div>
              <div class="detail-item">
                <label>Nombre:</label>
                <span>{{ selectedUser.firstName }} {{ selectedUser.lastName }}</span>
              </div>
              <div class="detail-item">
                <label>Estado:</label>
                <span 
                  class="status-badge"
                  :class="{ active: selectedUser.isActive, inactive: !selectedUser.isActive }"
                >
                  {{ selectedUser.isActive ? 'Activo' : 'Invitación Pendiente' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Rol y Permisos</h3>
            <div class="role-info">
              <div class="role-header">
                <span 
                  class="role-badge large"
                  :style="{ backgroundColor: getRoleColor(selectedUser.role) }"
                >
                  <i :class="getRoleIcon(selectedUser.role)"></i>
                  {{ getRoleName(selectedUser.role) }}
                </span>
              </div>
              <p class="role-description">{{ getRoleDescription(selectedUser.role) }}</p>
              <div class="permissions-list">
                <h4>Permisos:</h4>
                <div class="permissions-grid">
                  <span 
                    v-for="permission in getRolePermissions(selectedUser.role)"
                    :key="permission"
                    class="permission-tag"
                  >
                    {{ formatPermission(permission) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h3>Actividad</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Fecha de creación:</label>
                <span>{{ formatDate(selectedUser.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <label>Último login:</label>
                <span>{{ formatDate(selectedUser.lastLogin) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    <!-- Modal de Gestión de Prueba -->
    <div v-if="showTrialModal" class="modal-overlay animate-fade-in" @click="closeTrialModal">
      <div class="modal-content animate-scale-in" @click.stop>
        <div class="modal-header">
          <h2>Gestionar Prueba y Plan</h2>
          <button class="btn-close animate-micro-rotate" @click="closeTrialModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        
        <form @submit.prevent="saveTrial" class="modal-form">
          <div class="form-group">
            <label class="form-label">Plan Actual</label>
            <select v-model="trialForm.plan_id" class="form-select" required>
              <option value="free_trial">Prueba Gratuita</option>
              <option v-for="plan in plans" :key="plan.id" :value="plan.id">
                {{ plan.name }} - ${{ plan.price_monthly }}/mes
              </option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Fin de la Prueba / Suscripción</label>
            <input
              v-model="trialForm.trial_end"
              type="datetime-local"
              class="form-input"
            />
            <small class="text-caption text-medium-emphasis">Dejar vacío para indefinido</small>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeTrialModal">
              Cancelar
            </button>
            <button type="submit" class="btn-primary" :disabled="loading">
              <span v-if="!loading">Guardar Cambios</span>
              <span v-else class="loading-spinner">Guardando...</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Confirmación de Eliminación en Cascada (Exclusivo Super Admin) -->
    <div v-if="showDeleteModal" class="modal-overlay animate-fade-in" @click="closeDeleteModal">
      <div class="modal-content delete-modal-content animate-scale-in" @click.stop>
        <div class="modal-header delete-modal-header">
          <div class="delete-header-content">
            <i class="mdi mdi-alert-octagon delete-main-icon"></i>
            <div>
              <h2>Eliminar Cuenta y Registros</h2>
              <span class="delete-role-badge">Exclusivo Super Admin</span>
            </div>
          </div>
          <button class="btn-close animate-micro-rotate" @click="closeDeleteModal" :disabled="deletingUser">
            <i class="mdi mdi-close"></i>
          </button>
        </div>

        <div class="modal-body delete-modal-body" v-if="userToDelete">
          <div class="warning-callout">
            <i class="mdi mdi-alert-outline"></i>
            <div>
              <strong>¡Acción Destructiva Irreversible!</strong>
              <p>Esta operación eliminará por completo la cuenta y liberará los datos para un nuevo registro.</p>
            </div>
          </div>

          <div class="delete-user-card">
            <div class="delete-detail-row">
              <span class="delete-detail-label">Usuario:</span>
              <span class="delete-detail-value font-weight-bold">{{ userToDelete.username }}</span>
            </div>
            <div class="delete-detail-row">
              <span class="delete-detail-label">Nombre:</span>
              <span class="delete-detail-value">{{ userToDelete.firstName }} {{ userToDelete.lastName }}</span>
            </div>
            <div class="delete-detail-row">
              <span class="delete-detail-label">Correo Electrónico:</span>
              <span class="delete-detail-value text-primary font-weight-bold">{{ userToDelete.email }}</span>
            </div>
            <div class="delete-detail-row">
              <span class="delete-detail-label">Rol:</span>
              <span class="delete-detail-value">{{ getRoleName(userToDelete.role) }}</span>
            </div>
            <div class="delete-detail-row" v-if="userToDelete.organization || userToDelete.client">
              <span class="delete-detail-label">Empresa / Negocio:</span>
              <span class="delete-detail-value">{{ userToDelete.organization?.name || userToDelete.client?.company_name || 'N/A' }}</span>
            </div>
          </div>

          <p class="delete-note">
            Se eliminarán en cascada todas sus <strong>facturas</strong>, <strong>retenciones</strong>, <strong>documentos fiscales</strong>, <strong>inventarios</strong> y <strong>credenciales de autenticación</strong>. El correo y RIF quedarán liberados para registrarse nuevamente desde cero como si fuera la primera vez.
          </p>
        </div>

        <div class="modal-actions delete-modal-actions">
          <button type="button" class="btn-secondary" @click="closeDeleteModal" :disabled="deletingUser">
            Cancelar
          </button>
          <button type="button" class="btn-danger" @click="executeDeleteUserCascade" :disabled="deletingUser">
            <span v-if="!deletingUser">
              <i class="mdi mdi-delete-forever"></i> Eliminar Definitivamente
            </span>
            <span v-else class="loading-spinner">Eliminando cuenta...</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import userService from '@/services/userService.js'
import plansService from '@/services/plansService.js'
import { supabase } from '@/lib/supabaseClient'

export default {
  name: 'Usuarios',
  data() {
    return {
      users: [],
      filteredUsers: [],
      roles: {},
      plans: [],
      searchQuery: '',
      roleFilter: '',
      statusFilter: '',
      showModal: false,
      showDetailsModal: false,
      showTrialModal: false,
      showDeleteModal: false,
      userToDelete: null,
      deletingUser: false,
      currentUser: null,
      trialForm: {
        userId: null,
        plan_id: 'free_trial',
        trial_end: ''
      },
      isEditing: false,
      loading: false,
      selectedUser: null,
      formData: {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        password: '',
        isActive: true
      },
      notification: {
        show: false,
        message: '',
        type: 'success',
        icon: 'mdi mdi-check-circle'
      },
      notificationTimeout: null
    }
  },
  computed: {
    isSuperAdmin() {
      return this.currentUser?.role === 'super_admin'
    },
    availableRoles() {
      if (this.isSuperAdmin) {
        return this.roles
      }
      const filtered = { ...this.roles }
      delete filtered.super_admin
      return filtered
    }
  },
  async mounted() {
    try {
      this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      if (!this.currentUser || !this.currentUser.role) {
        const fresh = await userService.getCurrentUser()
        if (fresh) this.currentUser = fresh
      }
    } catch (e) {}
    await this.loadData()
  },
  beforeUnmount() {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout)
    }
  },
  methods: {
    async loadData() {
      try {
        this.loading = true
        const [usersData, rolesData, plansResponse] = await Promise.all([
          userService.getUsers(),
          userService.getRoles(),
          plansService.getPlans()
        ])
        this.users = usersData
        this.filteredUsers = usersData
        this.roles = rolesData
        this.plans = plansResponse.success ? plansResponse.data : []
      } catch (error) {
        console.error('Error cargando datos:', error)
        alert('Error al cargar los datos')
      } finally {
        this.loading = false
      }
    },
    
    filterUsers() {
      let filtered = this.users
      
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        filtered = filtered.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        )
      }
      
      if (this.roleFilter) {
        filtered = filtered.filter(user => user.role === this.roleFilter)
      }
      
      if (this.statusFilter !== '') {
        const isActive = this.statusFilter === 'true'
        filtered = filtered.filter(user => user.isActive === isActive)
      }
      
      this.filteredUsers = filtered
    },
    
    openCreateModal() {
      this.isEditing = false
      this.formData = {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        password: '',
        isActive: true
      }
      this.showModal = true
    },
    
    editUser(user) {
      this.isEditing = true
      this.formData = { ...user, password: '' }
      this.showModal = true
    },
    
    showToast(message, type = 'success') {
      const iconMap = {
        success: 'mdi mdi-check-circle',
        error: 'mdi mdi-alert-circle',
        info: 'mdi mdi-information',
        warning: 'mdi mdi-alert'
      }
      this.notification = {
        show: true,
        message,
        type,
        icon: iconMap[type] || 'mdi mdi-information'
      }
      if (this.notificationTimeout) clearTimeout(this.notificationTimeout)
      this.notificationTimeout = setTimeout(() => {
        this.notification.show = false
      }, 5000)
    },
    
    viewUser(user) {
      this.selectedUser = user
      this.showDetailsModal = true
    },
    
    async saveUser() {
      try {
        this.loading = true
        
        if (this.isEditing) {
          await userService.updateUser(this.formData.id, this.formData)
          await this.loadData()
          this.closeModal()
          this.showToast('Usuario actualizado correctamente', 'success')
        } else {
          const res = await userService.inviteUser(this.formData)
          if (res.success) {
            await this.loadData()
            this.closeModal()
            this.showToast(`Invitación enviada exitosamente a ${this.formData.email}`, 'success')
          } else {
            // No cerrar modal si falló — el admin puede corregir y reintentar
            this.showToast('Error al enviar invitación: ' + (res.message || 'Error desconocido'), 'error')
          }
        }
      } catch (error) {
        console.error('Error guardando usuario:', error)
        this.showToast('Error al guardar el usuario: ' + (error.message || ''), 'error')
      } finally {
        this.loading = false
      }
    },
    
    async resendInvite(user) {
      if (confirm(`¿Deseas reenviar el correo de invitación a ${user.email}?`)) {
        try {
          this.loading = true
          const res = await userService.resendInvitation({
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
          })
          if (res.success) {
             this.showToast(`Invitación reenviada exitosamente a ${user.email}`, 'success')
          } else {
             this.showToast('Error: ' + res.message, 'error')
          }
        } catch (error) {
          console.error('Error:', error)
          this.showToast('Error al reenviar invitación.', 'error')
        } finally {
          this.loading = false
        }
      }
    },
    
    async deleteUser(user) {
      if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.username}?`)) {
        try {
          await userService.deleteUser(user.id)
          await this.loadData()
          this.showToast('Usuario eliminado correctamente', 'success')
        } catch (error) {
          console.error('Error eliminando usuario:', error)
          this.showToast('Error al eliminar el usuario', 'error')
        }
      }
    },
    
    closeModal() {
      this.showModal = false
      this.formData = {
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        password: '',
        isActive: true
      }
    },
    
    closeDetailsModal() {
      this.showDetailsModal = false
      this.selectedUser = null
    },

    openTrialModal() {
      this.showTrialModal = true
    },

    closeTrialModal() {
      this.showTrialModal = false
      this.trialForm = {
        userId: null,
        plan_id: 'free_trial',
        trial_end: ''
      }
    },

    editTrial(user) {
      this.trialForm = {
        userId: user.id,
        plan_id: user.plan_id || 'free_trial',
        trial_end: user.trial_end ? new Date(user.trial_end).toISOString().slice(0, 16) : ''
      }
      this.openTrialModal()
    },

    async saveTrial() {
      try {
        this.loading = true
        console.log('💾 Iniciando actualización de prueba/plan:', this.trialForm)
        
        const updates = {
          plan_id: this.trialForm.plan_id,
          trial_end: this.trialForm.trial_end ? new Date(this.trialForm.trial_end).toISOString() : null
        }
        console.log('📤 Payload a enviar:', updates)

        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', this.trialForm.userId)
          .select()

        if (error) {
          console.error('❌ Error de Supabase:', error)
          throw error
        }

        console.log('✅ Actualización exitosa:', data)

        await this.loadData()
        this.closeTrialModal()
        alert('Plan y prueba actualizados correctamente')
      } catch (error) {
        console.error('Error actualizando prueba:', error)
        alert('Error al actualizar: ' + error.message)
      } finally {
        this.loading = false
      }
    },
    
    // Métodos de utilidad
    getRoleName(role) {
      return this.roles[role]?.name || role
    },
    
    getRoleDescription(role) {
      return this.roles[role]?.description || ''
    },
    
    getRoleColor(role) {
      return this.roles[role]?.color || '#666'
    },
    
    getRoleIcon(role) {
      return this.roles[role]?.icon || 'mdi-account'
    },
    
    getRolePermissions(role) {
      return userService.getRolePermissions(role)
    },
    
    formatPermission(permission) {
      return permission.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    },
    
    formatDate(dateString) {
      if (!dateString) return 'Nunca'
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    
    getPlanName(planId) {
      if (planId === 'free_trial') return 'Prueba Gratuita'
      const plan = this.plans.find(p => p.id === planId)
      if (plan) return plan.name
      
      const legacyPlans = {
        'basic': 'Básico',
        'pro': 'Profesional',
        'enterprise': 'Empresarial'
      }
      return legacyPlans[planId] || planId || 'N/A'
    },

    hasPermission(permission) {
      // En un sistema real, esto vendría del usuario autenticado
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return userService.hasPermission(currentUser.role, permission)
    },

    confirmDeleteUser(user) {
      if (!this.isSuperAdmin) {
        alert('Solo el Super Administrador puede eliminar usuarios en cascada.')
        return
      }
      if (user.role === 'super_admin') {
        alert('No está permitido eliminar a un Super Administrador.')
        return
      }
      this.userToDelete = user
      this.showDeleteModal = true
    },

    closeDeleteModal() {
      if (this.deletingUser) return
      this.showDeleteModal = false
      this.userToDelete = null
    },

    async executeDeleteUserCascade() {
      if (!this.userToDelete) return
      this.deletingUser = true

      try {
        const res = await userService.deleteUserCascade(this.userToDelete.id)
        if (res.success) {
          alert(res.message || 'Usuario y empresa eliminados exitosamente.')
          this.closeDeleteModal()
          await this.loadData()
        } else {
          alert('Error al eliminar: ' + (res.error || 'No se pudo completar la operación.'))
        }
      } catch (err) {
        console.error('Error al eliminar usuario en cascada:', err)
        alert('Error inesperado: ' + (err.message || 'Ocurrió un fallo.'))
      } finally {
        this.deletingUser = false
      }
    }
  }
}
</script>

<style scoped>
.usuarios-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 8px;
}

.header-icon {
  font-size: 32px;
  color: #1976D2;
}

.header-title h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.header-subtitle {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.btn-primary {
  background: linear-gradient(135deg, #1976D2, #42A5F5);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(25, 118, 210, 0.3);
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.search-container {
  display: flex;
  gap: 15px;
  align-items: center;
}

.search-input-container {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 18px;
}

.search-input {
  width: 100%;
  padding: 12px 12px 12px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #1976D2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.role-filter, .status-filter {
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  cursor: pointer;
  min-width: 150px;
}

.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
}

.users-table td {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.table-row:hover {
  background: #f8f9fa;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e3f2fd;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1976D2;
  font-size: 18px;
}

.username {
  font-weight: 600;
  color: #333;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.role-badge.large {
  padding: 8px 16px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.active {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
  display: inline-flex;
  align-items: center;
}

.status-badge.inactive {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
  display: inline-flex;
  align-items: center;
}

.last-login {
  color: #666;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-resend {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.btn-resend:hover {
  background: #fde68a;
  color: #78350f;
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(180, 83, 9, 0.2);
}

.btn-view {
  background: #e3f2fd;
  color: #1976D2;
}

.btn-edit {
  background: #fff3e0;
  color: #ff9800;
}

.btn-delete {
  background: #ffebee;
  color: #f44336;
}

.btn-trial {
  background: #f3e5f5;
  color: #9c27b0;
}

.btn-action:hover {
  transform: scale(1.1);
}

/* Toast de Notificaciones */
.notification-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  animation: slideInDown 0.3s ease-out;
}

.notification-toast.success {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.notification-toast.error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.notification-toast.info {
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.notification-icon {
  font-size: 20px;
}

.notification-message {
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 0;
  display: flex;
  align-items: center;
  font-size: 16px;
}

.notification-close:hover {
  opacity: 1;
}

/* Cuadro Informativo de Invitación */
.invite-info-box {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #f0f7ff;
  border: 1px solid #bfdbfe;
  border-left: 4px solid #2A2A2E;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 16px 0;
  color: #2A2A2E;
}

.invite-info-icon {
  font-size: 22px;
  color: #2A2A2E;
  line-height: 1;
}

.invite-info-text strong {
  display: block;
  font-size: 13px;
  margin-bottom: 2px;
  color: #2A2A2E;
}

.invite-info-text p {
  margin: 0;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.4;
}

.field-hint {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.modal-form {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-input, .form-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: #1976D2;
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-input {
  margin-right: 10px;
  width: 18px;
  height: 18px;
  accent-color: #1976D2;
}

.checkbox-label {
  color: #666;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* User details modal */
.user-details {
  padding: 20px;
}

.detail-section {
  margin-bottom: 30px;
}

.detail-section h3 {
  margin: 0 0 15px 0;
  font-size: 18px;
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.detail-item span {
  color: #333;
  font-size: 16px;
}

.role-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.role-header {
  margin-bottom: 15px;
}

.role-description {
  color: #666;
  margin-bottom: 20px;
  font-style: italic;
}

.permissions-list h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
}

.permissions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  background: #e3f2fd;
  color: #1976D2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  
  .search-container {
    flex-direction: column;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}


.plan-badge {
  background: #e0f2f1;
  color: #00695c;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Delete Modal Styles (Exclusivo Super Admin) */
.delete-modal-content {
  border: 1px solid #ffcdd2;
  max-width: 580px;
}

.delete-modal-header {
  background: #fff5f5;
  border-bottom: 1px solid #ffebee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.delete-header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delete-header-content h2 {
  margin: 0;
  font-size: 20px;
  color: #c62828;
}

.delete-main-icon {
  font-size: 32px;
  color: #d32f2f;
}

.delete-role-badge {
  background: #d32f2f;
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-block;
  margin-top: 4px;
}

.delete-modal-body {
  padding: 20px;
}

.warning-callout {
  display: flex;
  gap: 12px;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  color: #e65100;
  align-items: flex-start;
}

.warning-callout i {
  font-size: 22px;
}

.warning-callout p {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #5d4037;
}

.delete-user-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 14px 16px;
  border: 1px solid #e9ecef;
  margin-bottom: 16px;
}

.delete-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px dashed #dee2e6;
  font-size: 14px;
}

.delete-detail-row:last-child {
  border-bottom: none;
}

.delete-detail-label {
  color: #6c757d;
  font-weight: 600;
}

.delete-detail-value {
  color: #212529;
}

.delete-note {
  font-size: 13px;
  color: #6c757d;
  line-height: 1.5;
  margin: 0;
}

.btn-danger {
  background: #d32f2f;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #b71c1c;
  box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
