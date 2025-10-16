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
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Dashboard, // Temporalmente usar Dashboard
    meta: { requiresAuth: true, title: 'Mi Perfil' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Dashboard, // Temporalmente usar Dashboard
    meta: { requiresAuth: true, title: 'Configuración' }
  }
]

// Crear el router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navegación para autenticación con Supabase Multi-Tenant
router.beforeEach(async (to, from, next) => {
  console.log('🔄 Router guard ejecutándose para:', to.path)
  
  // Verificar si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    try {
      // 1. Verificar sesión de Supabase
      const { supabase } = await import('@/lib/supabaseClient')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        console.log('✅ Sesión de Supabase activa encontrada')
        
        // 2. Verificar que organization_id esté disponible
        const organizationId = localStorage.getItem('current_organization_id')
        if (!organizationId) {
          console.log('⚠️ No hay organization_id, recargando datos del usuario...')
          
          // Recargar datos del usuario para obtener organization_id
          const { userService } = await import('@/services/userService')
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
          
          if (currentUser.id) {
            try {
              const userData = await userService.getUserById(currentUser.id)
              if (userData.success && userData.data.organization) {
                localStorage.setItem('current_organization_id', userData.data.organization.id)
                console.log('✅ Organization ID recargado:', userData.data.organization.id)
              }
            } catch (error) {
              console.warn('⚠️ Error al recargar datos del usuario:', error.message)
            }
          }
        }
        
        // 3. Verificar roles si la ruta lo requiere
        if (to.meta.roles) {
          const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
          const userRole = currentUser.role
          
          if (!to.meta.roles.includes(userRole)) {
            console.log('❌ Usuario sin permisos para esta ruta:', userRole, 'vs', to.meta.roles)
            next('/dashboard') // Redirigir al dashboard si no tiene permisos
            return
          }
        }
        
        next()
      } else {
        // No hay sesión de Supabase, verificar datos locales como fallback
        const usuarioAutenticado = localStorage.getItem('usuarioAutenticado')
        if (usuarioAutenticado === 'true') {
          console.log('⚠️ No hay sesión de Supabase, pero hay datos locales (fallback)')
          next()
        } else {
          console.log('❌ No hay sesión activa, redirigiendo a login')
          next('/login')
        }
      }
    } catch (error) {
      console.error('❌ Error en router guard:', error)
      
      // Fallback: verificar datos locales
      const usuarioAutenticado = localStorage.getItem('usuarioAutenticado')
      if (usuarioAutenticado === 'true') {
        console.log('⚠️ Error en Supabase, usando fallback local')
        next()
      } else {
        next('/login')
      }
    }
  } else {
    // Ruta pública, permitir acceso
    next()
  }
})

export default router
