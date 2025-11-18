<template>
  <div class="usuarios-container">
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
        <i class="mdi mdi-plus"></i>
        Nuevo Usuario
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
                <span 
                  class="status-badge"
                  :class="{ active: user.isActive, inactive: !user.isActive }"
                >
                  {{ user.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="last-login">
                {{ formatDate(user.lastLogin) }}
              </td>
              <td class="actions">
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
                  class="btn-action btn-delete animate-micro-bounce"
                  @click="deleteUser(user)"
                  v-if="hasPermission('users.delete')"
                  title="Eliminar usuario"
                >
                  <i class="mdi mdi-delete"></i>
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
          <h2>{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h2>
          <button class="btn-close animate-micro-rotate" @click="closeModal">
            <i class="mdi mdi-close"></i>
          </button>
        </div>
        
        <form @submit.prevent="saveUser" class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre de usuario *</label>
              <input
                v-model="formData.username"
                type="text"
                class="form-input"
                required
                :disabled="isEditing"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input
                v-model="formData.email"
                type="email"
                class="form-input"
                required
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre *</label>
              <input
                v-model="formData.firstName"
                type="text"
                class="form-input"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Apellido *</label>
              <input
                v-model="formData.lastName"
                type="text"
                class="form-input"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select v-model="formData.role" class="form-select" required>
              <option value="">Seleccionar rol</option>
              <option v-for="(role, key) in roles" :key="key" :value="key">
                {{ role.name }} - {{ role.description }}
              </option>
            </select>
          </div>
          
          <div v-if="!isEditing" class="form-group">
            <label class="form-label">Contraseña *</label>
            <input
              v-model="formData.password"
              type="password"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
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
              <span v-if="!loading">{{ isEditing ? 'Actualizar' : 'Crear' }}</span>
              <span v-else class="loading-spinner">Guardando...</span>
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
                  {{ selectedUser.isActive ? 'Activo' : 'Inactivo' }}
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
  </div>
</template>

<script>
import userService from '@/services/userService.js'

export default {
  name: 'Usuarios',
  data() {
    return {
      users: [],
      filteredUsers: [],
      roles: {},
      searchQuery: '',
      roleFilter: '',
      statusFilter: '',
      showModal: false,
      showDetailsModal: false,
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
      }
    }
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      try {
        this.loading = true
        const [usersData, rolesData] = await Promise.all([
          userService.getUsers(),
          userService.getRoles()
        ])
        this.users = usersData
        this.filteredUsers = usersData
        this.roles = rolesData
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
    
    viewUser(user) {
      this.selectedUser = user
      this.showDetailsModal = true
    },
    
    async saveUser() {
      try {
        this.loading = true
        
        if (this.isEditing) {
          await userService.updateUser(this.formData.id, this.formData)
        } else {
          await userService.createUser(this.formData)
        }
        
        await this.loadData()
        this.closeModal()
        alert(this.isEditing ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
      } catch (error) {
        console.error('Error guardando usuario:', error)
        alert('Error al guardar el usuario')
      } finally {
        this.loading = false
      }
    },
    
    async deleteUser(user) {
      if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.username}?`)) {
        try {
          await userService.deleteUser(user.id)
          await this.loadData()
          alert('Usuario eliminado correctamente')
        } catch (error) {
          console.error('Error eliminando usuario:', error)
          alert('Error al eliminar el usuario')
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
    
    hasPermission(permission) {
      // En un sistema real, esto vendría del usuario autenticado
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
      return userService.hasPermission(currentUser.role, permission)
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
  background: #4caf50;
  color: white;
}

.status-badge.inactive {
  background: #f44336;
  color: white;
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

.btn-action:hover {
  transform: scale(1.1);
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
</style>
