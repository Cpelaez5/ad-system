import { createRouter, createWebHistory } from 'vue-router'

// Vistas compartidas (accesibles por todos los usuarios autenticados)
import Dashboard from '@/views/shared/Dashboard.vue'
import Login from '@/views/shared/Login.vue'
const SingUp = () => import('@/views/shared/SingUp.vue')

// Vistas para cliente
const ClienteMiArea = () => import('../views/cliente/ClienteMiArea.vue')
const ClienteDashboard = () => import('../views/cliente/Dashboard.vue')
const ClienteCompras = () => import('../views/cliente/Compras.vue')
const ClienteGastos = () => import('../views/cliente/Gastos.vue')
const ClienteVentas = () => import('../views/cliente/Ventas.vue')
const ClienteArchivo = () => import('../views/cliente/Archivo.vue')

// Vistas para contador y admin
const ContadorArea = () => import('../views/contador/ContadorArea.vue')
const GastosOrganizacion = () => import('../views/contador/GastosOrganizacion.vue')
const ComprasOrganizacion = () => import('../views/contador/ComprasOrganizacion.vue')
const VentasOrganizacion = () => import('../views/contador/VentasOrganizacion.vue')
const Clientes = () => import('../views/contador/Clientes.vue')
const Facturacion = () => import('../views/contador/Facturacion.vue')
const Contabilidad = () => import('../views/contador/Contabilidad.vue')
const Auditoria = () => import('../views/contador/Auditoria.vue')
const Archivo = () => import('../views/contador/Archivo.vue')

// Vistas para admin y super_admin
const Usuarios = () => import('../views/admin/Usuarios.vue')

// Componentes de prueba
import TestForm from '@/components/common/TestForm.vue'

// Definir las rutas del sistema
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/organizacion/gastos',
    name: 'GastosOrganizacion',
    component: GastosOrganizacion,
    meta: { requiresAuth: true, title: 'Gastos de la Organización', roles: ['admin', 'contador'] }
  },
  {
    path: '/organizacion/compras',
    name: 'ComprasOrganizacion',
    component: ComprasOrganizacion,
    meta: { requiresAuth: true, title: 'Compras de la Organización', roles: ['admin', 'contador'] }
  },
  {
    path: '/organizacion/ventas',
    name: 'VentasOrganizacion',
    component: VentasOrganizacion,
    meta: { requiresAuth: true, title: 'Ventas de la Organización', roles: ['admin', 'contador'] }
  },
  {
    path: '/cliente/mi-area',
    name: 'ClienteMiArea',
    component: ClienteMiArea,
    meta: { requiresAuth: true, title: 'Mi Área', roles: ['cliente'] }
  },
  {
    path: '/contador/area',
    name: 'ContadorArea',
    component: ContadorArea,
    meta: { requiresAuth: true, title: 'Área de Contador', roles: ['admin', 'contador'] }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/signup',
    name: 'SingUp',
    component: SingUp,
    meta: { requiresAuth: false }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, title: 'Dashboard', roles: ['super_admin', 'admin', 'contador'] } // Dashboard compartido para admin/contador
  },
  {
    path: '/cliente/dashboard',
    name: 'ClienteDashboard',
    component: ClienteDashboard,
    meta: { requiresAuth: true, title: 'Dashboard', roles: ['cliente'] }
  },
  {
    path: '/cliente/compras',
    name: 'ClienteCompras',
    component: ClienteCompras,
    meta: { requiresAuth: true, title: 'Mis Compras', roles: ['cliente'] }
  },
  {
    path: '/cliente/gastos',
    name: 'ClienteGastos',
    component: ClienteGastos,
    meta: { requiresAuth: true, title: 'Mis Gastos', roles: ['cliente'] }
  },
  {
    path: '/cliente/ventas',
    name: 'ClienteVentas',
    component: ClienteVentas,
    meta: { requiresAuth: true, title: 'Mis Ventas', roles: ['cliente'] }
  },
  {
    path: '/cliente/archivo',
    name: 'ClienteArchivo',
    component: ClienteArchivo,
    meta: { requiresAuth: true, title: 'Mis Documentos', roles: ['cliente'] }
  },
  {
    path: '/clientes',
    name: 'Clientes',
    component: Clientes,
    meta: { requiresAuth: true, title: 'Gestión de Clientes', roles: ['admin', 'contador'] }
  },
  {
    path: '/facturacion',
    name: 'Facturacion',
    component: Facturacion,
    meta: { requiresAuth: true, title: 'Facturación', roles: ['admin', 'contador'] }
  },
  {
    path: '/contabilidad',
    name: 'Contabilidad',
    component: Contabilidad,
    meta: { requiresAuth: true, title: 'Contabilidad', roles: ['admin', 'contador'] }
  },
  {
    path: '/auditoria',
    name: 'Auditoria',
    component: Auditoria,
    meta: { requiresAuth: true, title: 'Auditoría', roles: ['admin', 'contador'] }
  },
  {
    path: '/archivo',
    name: 'Archivo',
    component: Archivo,
    meta: { requiresAuth: true, title: 'Archivo Digital', roles: ['admin', 'contador'] }
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
    meta: { requiresAuth: true, title: 'Gestión de Usuarios', roles: ['super_admin', 'admin'] }
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

        // 3. Verificar roles y redirecciones especiales
        try {
          const { default: userService } = await import('@/services/userService')
          const currentUser = await userService.getCurrentUser()

          if (!currentUser) {
            console.log('❌ No se pudo obtener usuario actual')
            next('/login')
            return
          }

          const userRole = currentUser.role

          // Si el usuario no tiene perfil en la tabla users, redirigir a una página de error o mostrar mensaje
          if (currentUser.needsProfile) {
            console.error('❌ El usuario no tiene perfil en la tabla users. Por favor, contacta al administrador.')
            // Mostrar mensaje de error y redirigir al login
            alert('Tu usuario no está registrado en el sistema. Por favor, contacta al administrador para crear tu perfil.')
            next('/login')
            return
          }

          // Verificar que el rol sea válido
          const validRoles = ['super_admin', 'admin', 'contador', 'cliente']
          if (!validRoles.includes(userRole)) {
            console.error('❌ Rol de usuario no válido:', userRole)
            alert(`Tu usuario tiene un rol no válido (${userRole}). Por favor, contacta al administrador.`)
            next('/login')
            return
          }

          // Redirigir clientes desde /dashboard a /cliente/dashboard
          if (to.path === '/dashboard' && userRole === 'cliente') {
            console.log('🔄 Redirigiendo cliente a su dashboard')
            next('/cliente/dashboard')
            return
          }

          // Redirigir admin/contador desde /cliente/* a /dashboard
          if (to.path.startsWith('/cliente/') && (userRole === 'admin' || userRole === 'contador' || userRole === 'super_admin')) {
            console.log('🔄 Redirigiendo admin/contador a dashboard general')
            next('/dashboard')
            return
          }

          // Verificar roles si la ruta lo requiere
          if (to.meta.roles && !to.meta.roles.includes(userRole)) {
            console.log('❌ Usuario sin permisos para esta ruta:', userRole, 'vs', to.meta.roles)
            // Redirigir según el rol del usuario
            if (userRole === 'cliente') {
              next('/cliente/dashboard')
            } else if (userRole === 'contador' || userRole === 'admin') {
              next('/dashboard')
            } else if (userRole === 'super_admin') {
              next('/dashboard')
            } else {
              next('/login')
            }
            return
          }
        } catch (error) {
          console.error('❌ Error al verificar roles:', error)
          next('/dashboard')
          return
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
