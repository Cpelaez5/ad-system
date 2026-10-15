import { createRouter, createWebHistory } from 'vue-router'
import { logger } from '@/utils/logger'
import { useNotificacionStore } from '@/store/notificacionStore'
import { resolveProfileRedirect } from './profileRedirect'
import { isChunkLoadError, hasPendingChunkReload, markChunkReloadPending, clearChunkReloadFlag } from '@/utils/chunkReloadGuard'

// Vistas compartidas (accesibles por todos los usuarios autenticados)
import Dashboard from '@/views/shared/Dashboard.vue'
import Login from '@/views/shared/Login.vue'
import Pricing from '../views/Pricing.vue'
const Register = () => import('@/views/auth/Register.vue')
const SetPassword = () => import('@/views/auth/SetPassword.vue')

// Vistas para cliente
const ClienteInicio = () => import('../views/cliente/Inicio.vue')
const ClienteMiArea = () => import('../views/cliente/ClienteMiArea.vue')
const ClienteDashboard = () => import('../views/cliente/Dashboard.vue')
const ClienteFacturacion = () => import('../views/cliente/Facturacion.vue')
const Settings = () => import('../views/shared/Settings.vue')
const MunicipalSettings = () => import('../views/shared/MunicipalSettings.vue')

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
const AiSettings = () => import('../views/admin/AiSettings.vue')
// Panel de Operación del super admin
const OperacionPortada = () => import('../views/admin/OperacionPortada.vue')
const InicioSuperAdmin = () => import('../views/admin/InicioSuperAdmin.vue')
const CatalogoGlobal = () => import('../views/admin/CatalogoGlobal.vue')
const UsoIa = () => import('../views/admin/UsoIa.vue')
const Soporte = () => import('../views/admin/Soporte.vue')
const TasasGlobales = () => import('../views/admin/TasasGlobales.vue')

// Componentes de prueba

// Definir las rutas del sistema
import LandingPage from '@/views/LandingPage.vue'
import { analyticsService } from '@/services/analyticsService'

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
    path: '/cliente/inicio',
    name: 'ClienteInicio',
    component: ClienteInicio,
    meta: { requiresAuth: true, title: 'Inicio', roles: ['cliente'] }
  },
  {
    path: '/cliente/mi-area',
    name: 'ClienteMiArea',
    component: ClienteMiArea,
    meta: { requiresAuth: true, title: 'Mi negocio', roles: ['cliente'] }
  },
  {
    path: '/contador/area',
    name: 'ContadorArea',
    component: ContadorArea,
    meta: { requiresAuth: true, title: 'Área de Contador', roles: ['admin', 'contador'] }
  },
  {
    path: '/legal',
    name: 'Legal',
    component: () => import('@/views/shared/Legal.vue'),
    meta: { 
      requiresAuth: false,
      title: 'Términos y Políticas | AD SYSTEM',
      description: 'Políticas de privacidad, tratamiento de datos y términos de condiciones de AD SYSTEM.'
    }
  },
  // Ayuda pública (sin sesión). `/ayuda/api` va antes de `/ayuda/:slug`.
  {
    path: '/ayuda',
    name: 'Ayuda',
    component: () => import('@/views/ayuda/AyudaInicio.vue'),
    meta: {
      requiresAuth: false,
      title: 'Ayuda | AD SYSTEM',
      description: 'Guías cortas y paso a paso para usar AD System: registrar ventas y compras, tus papeles, tu mercancía y más.'
    }
  },
  {
    path: '/ayuda/api',
    name: 'AyudaApi',
    component: () => import('@/views/ayuda/AyudaApi.vue'),
    meta: {
      requiresAuth: false,
      title: 'API de productos | Ayuda de AD SYSTEM',
      description: 'Documentación de la API de productos de AD System para programadores.'
    }
  },
  {
    path: '/ayuda/:slug',
    name: 'AyudaArticulo',
    component: () => import('@/views/ayuda/AyudaArticulo.vue'),
    meta: {
      requiresAuth: false,
      title: 'Ayuda | AD SYSTEM',
      description: 'Guía de ayuda de AD System.'
    }
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
    path: '/auth/set-password',
    name: 'SetPassword',
    component: SetPassword,
    meta: { requiresAuth: false, title: 'Definir Contraseña | AD SYSTEM' }
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
    meta: { requiresAuth: true, title: '¿Cómo voy?', roles: ['cliente'] }
  },
  {
    path: '/cliente/facturacion',
    name: 'ClienteFacturacion',
    component: ClienteFacturacion,
    meta: { requiresAuth: true, title: 'Mis movimientos', roles: ['cliente'] }
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
  {
    path: '/cliente/planes',
    name: 'ClientePlanes',
    component: () => import('../views/cliente/Planes.vue'),
    meta: { requiresAuth: true, title: 'Mi plan', roles: ['cliente'] }
  },
  {
    path: '/cliente/facturacion-suscripcion',
    name: 'ClienteFacturacionSuscripcion',
    component: () => import('../views/cliente/FacturacionSuscripcion.vue'),
    meta: { requiresAuth: true, title: 'Pagos de mi plan', roles: ['cliente'] }
  },
  {
    path: '/cliente/checkout',
    name: 'ClienteCheckout',
    component: () => import('../views/cliente/Checkout.vue'),
    meta: { requiresAuth: true, title: 'Completar Pago', roles: ['cliente'] }
  },
  {
    path: '/cliente/fiscal-360',
    name: 'ClienteFiscal360',
    component: () => import('@/views/cliente/Fiscal360.vue'),
    meta: { requiresAuth: true, title: 'Mis papeles', roles: ['cliente'] }
  },
  {
    path: '/cliente/inventario',
    name: 'ClienteInventario',
    component: () => import('@/views/cliente/Inventario.vue'),
    meta: { requiresAuth: true, title: 'Mi mercancía', roles: ['cliente'] }
  },
  {
    path: '/cliente/proveedores',
    name: 'ClienteProveedores',
    component: () => import('@/views/cliente/Proveedores.vue'),
    meta: { requiresAuth: true, title: 'Mis proveedores', roles: ['cliente'] }
  },
  {
    path: '/cliente/clientes',
    name: 'ClienteClientes',
    component: () => import('@/views/cliente/Clientes.vue'),
    meta: { requiresAuth: true, title: 'Mis clientes', roles: ['cliente'] }
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
    path: '/admin/ai-settings',
    name: 'AiSettings',
    component: AiSettings,
    meta: { requiresAuth: true, title: 'Configuración IA', roles: ['super_admin'] }
  },
  { path: '/admin/inicio', name: 'AdminInicio', component: InicioSuperAdmin, meta: { requiresAuth: true, title: 'Dashboard', roles: ['super_admin'] } },
  { path: '/admin/operacion', name: 'AdminOperacion', component: OperacionPortada, meta: { requiresAuth: true, title: 'Operación', roles: ['super_admin'] } },
  { path: '/admin/catalogo', name: 'AdminCatalogo', component: CatalogoGlobal, meta: { requiresAuth: true, title: 'Catálogo global', roles: ['super_admin'] } },
  { path: '/admin/soporte', name: 'AdminSoporte', component: Soporte, meta: { requiresAuth: true, title: 'Soporte', roles: ['super_admin'] } },
  { path: '/admin/uso-ia', name: 'AdminUsoIa', component: UsoIa, meta: { requiresAuth: true, title: 'Uso de IA', roles: ['super_admin'] } },
  { path: '/admin/tasas', name: 'AdminTasas', component: TasasGlobales, meta: { requiresAuth: true, title: 'Tasas globales', roles: ['super_admin'] } },
  {
    path: '/profile',
    name: 'Profile',
    redirect: resolveProfileRedirect,
    meta: { requiresAuth: true, title: 'Mi Perfil' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true, title: 'Configuración' }
  },
  {
    path: '/municipal-settings',
    name: 'MunicipalSettings',
    component: MunicipalSettings,
    meta: { requiresAuth: true, title: 'Retenciones Municipales' }
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
  },
  {
    path: '/trial-expired',
    name: 'TrialExpired',
    component: () => import('../views/shared/TrialExpired.vue'),
    meta: { requiresAuth: true, title: 'Prueba Expirada' }
  },
  ...(import.meta.env.DEV ? [
    {
      path: '/ocr-demo',
      name: 'OCRDemo',
      component: () => import('@/views/shared/OCRDemo.vue'),
      meta: { requiresAuth: true, title: 'Demo OCR', roles: ['super_admin', 'admin', 'contador'] }
    },
    {
      path: '/test-form',
      name: 'TestForm',
      component: () => import('@/components/common/TestForm.vue'),
      meta: { requiresAuth: false, title: 'Formulario de Prueba' }
    }
  ] : [])
]

// Crear el router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard de navegación para autenticación con Supabase Multi-Tenant
router.beforeEach(async (to, from, next) => {
  // Ruta pública, permitir acceso directo
  if (!to.meta.requiresAuth) {
    next()
    return
  }

  try {
    // 1. Verificar sesión de Supabase
    const { supabase } = await import('@/lib/supabaseClient')
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      // Limpiar localStorage obsoleto si no hay sesión
      localStorage.removeItem('usuarioAutenticado')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('authToken')
      localStorage.removeItem('current_organization_id')
      next('/login')
      return
    }

    // 2. Una sola obtención del usuario por navegación (cacheada en memoria por userService)
    try {
      const { default: userService } = await import('@/services/userService')
      const currentUser = await userService.getCurrentUser()

      if (!currentUser) {
        next('/login')
        return
      }

      // El organization_id ya viene en currentUser: lo sincronizamos a localStorage
      // sin hacer una segunda consulta de red (antes se llamaba a getUserById aparte).
      if (currentUser.organization_id && !localStorage.getItem('current_organization_id')) {
        localStorage.setItem('current_organization_id', currentUser.organization_id)
      }

      const userRole = currentUser.role

      // Si el usuario no tiene perfil en la tabla users
      if (currentUser.needsProfile) {
        logger.error('Router guard: usuario autenticado sin perfil en la tabla users', currentUser.id)
        useNotificacionStore().mostrar(
          'Tu cuenta no está registrada en el sistema. Contacta al administrador para activarla.',
          'error'
        )
        next('/login')
        return
      }

      // Verificar que el rol sea válido
      const validRoles = ['super_admin', 'admin', 'contador', 'cliente']
      if (!validRoles.includes(userRole)) {
        logger.error('Router guard: rol de usuario no válido', userRole)
        useNotificacionStore().mostrar(
          'Tu cuenta tiene un rol no reconocido. Contacta al administrador.',
          'error'
        )
        next('/login')
        return
      }

      // Redirigir a Welcome si es cliente, está en prueba y no ha visto la bienvenida
      if (userRole === 'cliente' && currentUser.plan_id === 'free_trial' && !localStorage.getItem('welcome_seen') && to.path !== '/welcome') {
        next('/welcome')
        return
      }

      // Verificar si el periodo de prueba ha expirado
      if (userRole === 'cliente' && currentUser.plan_id === 'free_trial' && currentUser.trial_end) {
        const trialEnd = new Date(currentUser.trial_end)
        const now = new Date()
        // Si el trial expiró y no está yendo a renovar, bloquear
        const allowedRoutes = ['/trial-expired', '/pricing', '/welcome', '/cliente/planes', '/cliente/checkout']
        if (now > trialEnd && !allowedRoutes.includes(to.path)) {
          next('/trial-expired')
          return
        }
      }

      // Verificar si el cliente tiene perfil fiscal incompleto y está intentando acceder a módulos operativos
      if (userRole === 'cliente') {
        const client = currentUser.client || {}
        const hasActivity = Boolean(client.activity_type && String(client.activity_type).trim())
        const hasLicencia = Boolean(client.licencia_actividad_economica && String(client.licencia_actividad_economica).trim())
        const hasMunicipio = Boolean(client.municipio || client.municipio_id)
        const hasEstado = Boolean(client.estado || hasMunicipio)

        const isFiscalIncomplete = !hasActivity || !hasLicencia || !hasMunicipio || !hasEstado

        // Rutas operativas del rol cliente que requieren perfil fiscal obligatorio
        const operationalRoutes = [
          '/cliente/facturacion',
          '/cliente/compras',
          '/cliente/gastos',
          '/cliente/proveedores',
          '/cliente/inventario'
        ]

        if (isFiscalIncomplete && operationalRoutes.some(route => to.path.startsWith(route)) && to.path !== '/cliente/mi-area') {
          next({ path: '/cliente/mi-area', query: { required: 'fiscal' } })
          return
        }
      }

      // Redirigir clientes desde /dashboard a /cliente/inicio
      if (to.path === '/dashboard' && userRole === 'cliente') {
        next('/cliente/inicio')
        return
      }

      // Redirigir admin/contador desde /cliente/* a /dashboard
      if (to.path.startsWith('/cliente/') && (userRole === 'admin' || userRole === 'contador' || userRole === 'super_admin')) {
        next(userRole === 'super_admin' ? '/admin/inicio' : '/dashboard')
        return
      }

      // Verificar roles si la ruta lo requiere
      if (to.meta.roles && !to.meta.roles.includes(userRole)) {
        useNotificacionStore().mostrar(
          'Tu cuenta no tiene permiso para ver esa pantalla. Te llevamos a tu inicio.',
          'warning'
        )
        // Redirigir según el rol del usuario
        if (userRole === 'cliente') {
          next('/cliente/inicio')
        } else if (userRole === 'super_admin') {
          next('/admin/inicio')
        } else if (userRole === 'contador' || userRole === 'admin') {
          next('/dashboard')
        } else {
          next('/login')
        }
        return
      }

      next()
    } catch (error) {
      logger.error('Router guard: error al verificar roles', error)
      next(to.path !== '/login' ? '/login' : undefined)
    }
  } catch (error) {
    logger.error('Router guard: error inesperado', error)
    localStorage.removeItem('usuarioAutenticado')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('authToken')
    localStorage.removeItem('current_organization_id')
    next('/login')
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
        'AD System - Sistema de gestión contable, facturación inteligente, control de compras, gastos y expediente fiscal 360 para empresas y contadores.'
      )
    }
  }

  // 3. Tracking de Analítica (Google Analytics, Meta Pixel, etc.)
  analyticsService.trackPageView(to.path)

  // Navegación resuelta con éxito: ya no hace falta la marca de recarga por chunk.
  clearChunkReloadFlag()
})

// Recuperación de errores de carga de chunk (típico justo después de un deploy en
// Netlify: la pestaña abierta referencia archivos .js con hash viejo). Recargamos
// la página UNA sola vez hacia la ruta destino; sessionStorage evita el bucle.
router.onError((error, to) => {
  if (isChunkLoadError(error) && !hasPendingChunkReload()) {
    markChunkReloadPending()
    const target = to?.fullPath || (window.location.pathname + window.location.search)
    window.location.assign(target)
    return
  }

  logger.error('Router: error de navegación', error)
})

export default router
