import { createRouter, createWebHistory } from 'vue-router'

// Vistas compartidas (accesibles por todos los usuarios autenticados)
import Dashboard from '@/views/shared/Dashboard.vue'
import Login from '@/views/shared/Login.vue'
import Pricing from '../views/Pricing.vue'
const Register = () => import('@/views/auth/Register.vue')
const OCRDemo = () => import('@/views/shared/OCRDemo.vue')

// Vistas para cliente
const ClienteMiArea = () => import('../views/cliente/ClienteMiArea.vue')
const ClienteDashboard = () => import('../views/cliente/Dashboard.vue')
const ClienteCompras = () => import('../views/cliente/Compras.vue')
const ClienteGastos = () => import('../views/cliente/Gastos.vue')
const ClienteVentas = () => import('../views/cliente/Ventas.vue')
const ClienteArchivo = () => import('../views/cliente/Archivo.vue')
const ClienteFacturacion = () => import('../views/cliente/Facturacion.vue')

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
const FacturacionSistema = () => import('../views/admin/FacturacionSistema.vue')

// Componentes de prueba
import TestForm from '@/components/common/TestForm.vue'

// Definir las rutas del sistema
import LandingPage from '@/views/LandingPage.vue'

// Definir las rutas del sistema
const routes = [
  {
    path: '/',
    name: 'LandingPage',
    component: LandingPage,
    meta: { 
      requiresAuth: false,
      title: 'Gestión Contable Inteligente y Simple | AD SYSTEM',
      description: 'Lleva la contabilidad de tu empresa al siguiente nivel. Automatiza tu facturación, controla compras, gastos y tu expediente fiscal 360.'
    }
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
    path: '/registration-success',
    name: 'RegistrationSuccess',
    component: () => import('@/views/auth/RegistrationSuccess.vue')
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/views/onboarding/Welcome.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { 
      requiresAuth: false,
      title: 'Iniciar Sesión | AD SYSTEM',
      description: 'Accede de forma segura a tu cuenta en AD SYSTEM. Gestiona tus facturas, declaraciones fiscales e inventarios en línea.'
    }
  },
  {
    path: '/signup',
    name: 'Register',
    component: Register,
    meta: { 
      requiresAuth: false,
      title: 'Registrarse y Comenzar Prueba Gratuita | AD SYSTEM',
      description: 'Crea tu cuenta empresarial en AD SYSTEM hoy mismo. Pruébalo gratis sin compromiso y automatiza tus obligaciones fiscales.'
    }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true, title: 'Dashboard', roles: ['super_admin', 'admin', 'contador'] } // Dashboard compartido para admin/contador
  },
  {
    path: '/ocr-demo',
    name: 'OCRDemo',
    component: OCRDemo,
    meta: { requiresAuth: true, title: 'Demo OCR', roles: ['super_admin', 'admin', 'contador'] }
  },
  {
    path: '/cliente/dashboard',
    name: 'ClienteDashboard',
    component: ClienteDashboard,
    meta: { requiresAuth: true, title: 'Dashboard', roles: ['cliente'] }
  },
  {
    path: '/cliente/facturacion',
    name: 'ClienteFacturacion',
    component: ClienteFacturacion,
    meta: { requiresAuth: true, title: 'Facturación', roles: ['cliente'] }
  },
  {
    path: '/cliente/compras',
    name: 'ClienteCompras',
    redirect: to => { return { path: '/cliente/facturacion', query: { tab: 'compras' } } }
  },
  {
    path: '/cliente/gastos',
    name: 'ClienteGastos',
    redirect: to => { return { path: '/cliente/facturacion', query: { tab: 'gastos' } } }
  },
  {
    path: '/cliente/ventas',
    name: 'ClienteVentas',
    redirect: to => { return { path: '/cliente/facturacion', query: { tab: 'ventas' } } }
  },
  /* {
    path: '/cliente/archivo',
    name: 'ClienteArchivo',
    component: ClienteArchivo,
    meta: { requiresAuth: true, title: 'Mis Documentos', roles: ['cliente'] }
  }, */
  {
    path: '/cliente/planes',
    name: 'ClientePlanes',
    component: () => import('../views/cliente/Planes.vue'),
    meta: { requiresAuth: true, title: 'Planes y Suscripción', roles: ['cliente'] }
  },
  {
    path: '/cliente/facturacion-suscripcion',
    name: 'ClienteFacturacionSuscripcion',
    component: () => import('../views/cliente/FacturacionSuscripcion.vue'),
    meta: { requiresAuth: true, title: 'Facturación de Suscripción', roles: ['cliente'] }
  },
  {
    path: '/cliente/fiscal-360',
    name: 'ClienteFiscal360',
    component: () => import('@/views/cliente/Fiscal360.vue'),
    meta: { requiresAuth: true, title: 'Expediente Fiscal 360', roles: ['cliente'] }
  },
  {
    path: '/cliente/inventario',
    name: 'ClienteInventario',
    component: () => import('@/views/cliente/Inventario.vue'),
    meta: { requiresAuth: true, title: 'Inventario de Mercancía', roles: ['cliente'] }
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
    path: '/admin/facturacion-sistema',
    name: 'FacturacionSistema',
    component: FacturacionSistema,
    meta: { requiresAuth: true, title: 'Facturación del Sistema', roles: ['super_admin'] }
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
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: Pricing,
    meta: { 
      requiresAuth: false, 
      title: 'Planes y Precios Competitivos | AD SYSTEM',
      description: 'Conoce nuestros planes de suscripción mensuales y anuales adaptados a tu negocio. Transparencia sin cargos ocultos.'
    }
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

          // Redirigir a Welcome si es cliente, está en prueba y no ha visto la bienvenida
          if (userRole === 'cliente' && currentUser.plan_id === 'free_trial' && !localStorage.getItem('welcome_seen') && to.path !== '/welcome') {
            console.log('🔄 Redirigiendo a Welcome (Onboarding)');
            next('/welcome');
            return;
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

// Hook global para actualizar dinámicamente las cabeceras HTML para SEO y experiencia de usuario
router.afterEach((to) => {
  // 1. Título dinámico
  const baseTitle = 'AD SYSTEM'
  if (to.meta && to.meta.title) {
    document.title = to.meta.title
  } else {
    document.title = baseTitle
  }

  // 2. Descripción meta dinámica
  const metaDescription = document.querySelector('meta[name="description"]')
  if (metaDescription) {
    if (to.meta && to.meta.description) {
      metaDescription.setAttribute('content', to.meta.description)
    } else {
      // Fallback a la descripción por defecto del index.html
      metaDescription.setAttribute(
        'content', 
        'AD Business System - Sistema de gestión contable, facturación inteligente, control de compras, gastos y expediente fiscal 360 para empresas y contadores.'
      )
    }
  }
})

export default router
