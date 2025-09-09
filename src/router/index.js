import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import Clientes from '../views/Clientes.vue'
import Facturacion from '../views/Facturacion.vue'
import Contabilidad from '../views/Contabilidad.vue'
import Auditoria from '../views/Auditoria.vue'
import Archivo from '../views/Archivo.vue'
import Login from '../views/Login.vue'
import TestForm from '../components/common/TestForm.vue'
import Usuarios from '../views/Usuarios.vue'

// Definir las rutas del sistema
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, title: 'Dashboard' }
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: Clientes,
    meta: { requiresAuth: true, title: 'Gestión de Clientes' }
  },
  {
    path: '/facturacion',
    name: 'Facturacion',
    component: Facturacion,
    meta: { requiresAuth: true, title: 'Facturación' }
  },
  {
    path: '/contabilidad',
    name: 'Contabilidad',
    component: Contabilidad,
    meta: { requiresAuth: true, title: 'Contabilidad' }
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: Auditoria,
    meta: { requiresAuth: true, title: 'Auditoría' }
  },
  {
    path: '/archivo',
    name: 'Archivo',
    component: Archivo,
    meta: { requiresAuth: true, title: 'Archivo Digital' }
  },
  {
    path: '/test-form',
    name: 'TestForm',
    component: TestForm,
    meta: { requiresAuth: false, title: 'Formulario de Prueba' }
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: Usuarios,
    meta: { requiresAuth: true, title: 'Gestión de Usuarios', roles: ['admin'] }
  }
]

// Crear el router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navegación para autenticación
router.beforeEach((to, from, next) => {
  // Verificar si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    // Aquí se verificaría si el usuario está autenticado
    // Por ahora, permitimos el acceso a todas las rutas
    const isAuthenticated = true // Cambiar por lógica real de autenticación
    
    if (isAuthenticated) {
      next()
    } else {
      next('/login')
    }
  } else {
    next()
  }
})

export default router
