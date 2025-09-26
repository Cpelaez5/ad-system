// Servicio de gestión de usuarios y roles
// Ahora se conecta a la API backend cuando VITE_API_BASE_URL está definido
import api from './api'

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
  // Autenticación
  async login(credentials) {
    // Si hay API, usamos backend; si no, fallback a mock local
    if (import.meta.env.VITE_API_BASE_URL) {
      const { data } = await api.post('/auth/login', {
        username: credentials.username,
        password: credentials.password
      })
      // Persistir token
      localStorage.setItem('authToken', data.token)
      return { success: true, user: data.user, token: data.token }
    }
    await delay(400)
    const user = mockUsers.find(u =>
      u.username === credentials.username &&
      u.password === credentials.password &&
      u.isActive
    )
    if (user) {
      user.lastLogin = new Date().toISOString()
      const { password, ...userWithoutPassword } = user
      const token = `mock-token-${user.id}-${Date.now()}`
      localStorage.setItem('authToken', token)
      return { success: true, user: userWithoutPassword, token }
    }
    return { success: false, message: 'Credenciales inválidas' }
  },

  // Obtener todos los usuarios
  async getUsers() {
    await delay(800)
    return mockUsers.map(({ password, ...user }) => user)
  },

  // Obtener usuario por ID
  async getUserById(id) {
    await delay(500)
    const user = mockUsers.find(u => u.id === parseInt(id))
    if (user) {
      const { password, ...userWithoutPassword } = user
      return userWithoutPassword
    }
    return null
  },

  // Crear nuevo usuario
  async createUser(userData) {
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
    return userWithoutPassword
  },

  // Actualizar usuario
  async updateUser(id, userData) {
    await delay(800)
    
    const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData }
      const { password, ...userWithoutPassword } = mockUsers[userIndex]
      return userWithoutPassword
    }
    return null
  },

  // Eliminar usuario (soft delete)
  async deleteUser(id) {
    await delay(600)
    
    const userIndex = mockUsers.findIndex(u => u.id === parseInt(id))
    if (userIndex !== -1) {
      mockUsers[userIndex].isActive = false
      const { password, ...userWithoutPassword } = mockUsers[userIndex]
      return userWithoutPassword
    }
    return null
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
    await delay(1000)
    
    const user = mockUsers.find(u => u.id === userId)
    if (user && user.password === currentPassword) {
      user.password = newPassword
      return { success: true, message: 'Contraseña actualizada correctamente' }
    }
    
    return { success: false, message: 'Contraseña actual incorrecta' }
  },

  // Resetear contraseña (solo admin)
  async resetPassword(userId, newPassword) {
    await delay(800)
    
    const user = mockUsers.find(u => u.id === userId)
    if (user) {
      user.password = newPassword
      return { success: true, message: 'Contraseña reseteada correctamente' }
    }
    
    return { success: false, message: 'Usuario no encontrado' }
  }
}

export default userService
