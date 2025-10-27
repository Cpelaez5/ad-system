<template>
   <v-app-bar
     color="white"
     elevation="0"
     class="app-bar"
     style="border-bottom: 1px solid #E0E0E0; z-index: 1000;"
   >
     <!-- Logo y título -->
     <v-toolbar-title 
       :class="['text-h5', 'font-weight-bold', 'animate-fade-in', 'animate-delay-200', { 'title-adjusted': sidebarExpanded }]" 
       style="color: #000000; font-weight: 800 !important;"
     >
       {{ getCurrentPageTitle() }}
     </v-toolbar-title>

    <v-spacer></v-spacer>

    <!-- Tasa del BCV -->
    <div class="bcv-rate-display mr-4">
      <v-chip
        :color="getBCVChipColor()"
        variant="tonal"
        size="small"
        class="animate-fade-in animate-delay-300"
      >
        <v-icon size="16" class="mr-1">mdi-currency-usd</v-icon>
        <span class="font-weight-medium">{{ getBCVRate() }}</span>
        <v-icon 
          size="12" 
          class="ml-1 cursor-pointer" 
          @click="refreshBCVRate"
          :class="{ 'animate-spin': bcvLoading }"
        >
          mdi-refresh
        </v-icon>
      </v-chip>
    </div>

    <!-- Menú de usuario -->
    <v-btn 
      id="user-menu-btn"
      color="primary"
      variant="text"
      @click="handleUserButtonClick"
    >
      <v-icon>mdi-account-circle</v-icon>
      <span class="ml-2 d-none d-md-inline">{{ currentUser?.firstName || 'Usuario' }}</span>
    </v-btn>
    
    <v-menu activator="#user-menu-btn">
      <v-list>
        <v-list-item>
          <v-list-item-title>{{ currentUser?.firstName || 'Usuario' }} {{ currentUser?.lastName || '' }}</v-list-item-title>
          <v-list-item-subtitle>{{ getRoleName(currentUser?.role) }}</v-list-item-subtitle>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="goToProfile">
          <v-list-item-title>Mi Perfil</v-list-item-title>
        </v-list-item>
        <v-list-item @click="goToSettings">
          <v-list-item-title>Configuración</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="logout">
          <v-list-item-title>Cerrar Sesión</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>

   <!-- Navegación lateral -->
   <v-navigation-drawer
     expand-on-hover
     permanent
     rail
     color="#010101"
     class="animate-slide-in-left"
     dark
     style="height: 100vh; min-height: 100vh;"
   >
    <!-- Header del sidebar con logo -->
    <div class="sidebar-header" style="padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); background-color: #010101;">
      <img 
        src="@/assets/icon-adaptableV2.svg" 
        alt="Logo" 
        class="logo-icon animate-micro-rotate"
        style="width: 60px; height: 60px; margin-bottom: 0px; filter: brightness(0) invert(1);"
      />
      <h3 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">Business System</h3>
    </div>

    <v-divider></v-divider>

    <!-- Navigation Items -->
    <v-list density="compact" nav>
      <v-list-item 
        :to="{ name: 'Dashboard' }"
        prepend-icon="mdi-view-dashboard" 
        title="Dashboard" 
        value="dashboard"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Clientes' }"
        prepend-icon="mdi-account-group" 
        title="Clientes" 
        value="clientes"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Facturacion' }"
        prepend-icon="mdi-receipt" 
        title="Facturación" 
        value="facturacion"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Contabilidad' }"
        prepend-icon="mdi-book-open-variant" 
        title="Contabilidad" 
        value="contabilidad"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Auditoria' }"
        prepend-icon="mdi-shield-search" 
        title="Auditoría" 
        value="auditoria"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Archivo' }"
        prepend-icon="mdi-folder-multiple" 
        title="Archivo Digital" 
        value="archivo"
      ></v-list-item>
      
      <v-list-item 
        :to="{ name: 'Usuarios' }"
        prepend-icon="mdi-account-group" 
        title="Usuarios" 
        value="usuarios"
        v-if="hasPermission('users.read')"
      ></v-list-item>
    </v-list>

    <!-- Logout Button -->
    <template v-slot:append>
      <v-list density="compact" nav>
        <v-list-item 
          @click="logout"
          prepend-icon="mdi-logout" 
          title="Cerrar Sesión" 
          value="logout"
        ></v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script>
import bcvService from '../../services/bcvService.js';

export default {
  name: 'AppNavigation',
  data() {
    return {
      bcvRate: null,
      bcvLoading: false,
      bcvError: false,
      sidebarExpanded: false
    }
  },
  computed: {
    currentUser() {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}')
      } catch (error) {
        console.error('Error obteniendo usuario:', error)
        return {}
      }
    }
  },
  async mounted() {
    await this.loadBCVRate();
    // Actualizar cada 10 minutos para reducir spam en consola
    this.bcvInterval = setInterval(() => {
      this.loadBCVRate();
    }, 10 * 60 * 1000);
    
    // Detectar cambios en el sidebar
    this.setupSidebarObserver();
  },
  beforeUnmount() {
    if (this.bcvInterval) {
      clearInterval(this.bcvInterval);
    }
  },
  methods: {
    getCurrentPageTitle() {
      const routeName = this.$route.name
      const pageTitles = {
        'Dashboard': 'Dashboard',
        'Clientes': 'Clientes',
        'Facturacion': 'Facturación',
        'Contabilidad': 'Contabilidad',
        'Auditoria': 'Auditoría',
        'Archivo': 'Archivo Digital',
        'Usuarios': 'Usuarios',
        'Profile': 'Mi Perfil',
        'Settings': 'Configuración',
        'Login': 'Iniciar Sesión'
      }
      return pageTitles[routeName] || 'Sistema Contable'
    },
    
    setupSidebarObserver() {
      // Usar MutationObserver para detectar cambios en el sidebar
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const sidebar = mutation.target;
            const isExpanded = sidebar.classList.contains('v-navigation-drawer--is-hovering');
            this.sidebarExpanded = isExpanded;
          }
        });
      });
      
      // Observar el sidebar cuando esté disponible
      this.$nextTick(() => {
        const sidebar = document.querySelector('.v-navigation-drawer');
        if (sidebar) {
          observer.observe(sidebar, {
            attributes: true,
            attributeFilter: ['class']
          });
        }
      });
    },
    
    handleUserButtonClick() {
      console.log('🔵 Botón de usuario clickeado')
      console.log('🔵 Usuario actual:', this.currentUser)
    },
    
    logout() {
      console.log('🔴 Cerrando sesión...')
      // Limpiar datos de sesión
      localStorage.removeItem('usuarioAutenticado')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('authToken')
      
      this.$router.push('/login')
    },
    
    goToProfile() {
      console.log('🟢 Navegando al perfil...')
      this.$router.push('/profile')
    },
    
    goToSettings() {
      console.log('🟡 Navegando a configuración...')
      this.$router.push('/settings')
    },
    
    getRoleName(role) {
      const roleNames = {
        admin: 'Administrador',
        contador: 'Contador',
        auditor: 'Auditor',
        facturador: 'Facturador',
        operador: 'Operador',
        consultor: 'Consultor'
      }
      return roleNames[role] || 'Usuario'
    },
    
    hasPermission(permission) {
      try {
        const currentUser = this.currentUser
        if (!currentUser.role) return false
        
        // Permisos básicos por rol (fallback)
        const rolePermissions = {
          admin: ['users.read', 'users.create', 'users.update', 'users.delete'],
          contador: ['clients.read', 'invoices.read', 'accounting.read'],
          auditor: ['audit.read', 'reports.read'],
          facturador: ['invoices.read', 'clients.read'],
          operador: ['clients.read'],
          consultor: ['reports.read']
        }
        
        return rolePermissions[currentUser.role]?.includes(permission) || false
      } catch (error) {
        console.error('Error verificando permisos:', error)
        return false
      }
    },
    
    async loadBCVRate() {
      try {
        this.bcvLoading = true;
        this.bcvError = false;
        
        const response = await bcvService.getCurrentRate();
        
        if (response.success) {
          this.bcvRate = response.data;
        } else {
          this.bcvError = true;
          this.bcvRate = null;
        }
      } catch (error) {
        console.error('Error al cargar tasa del BCV:', error);
        this.bcvError = true;
        this.bcvRate = null;
      } finally {
        this.bcvLoading = false;
      }
    },
    
    async refreshBCVRate() {
      bcvService.clearCache();
      await this.loadBCVRate();
    },
    
    getBCVRate() {
      if (this.bcvError) return 'Error';
      if (!this.bcvRate) return 'Cargando...';
      return `${this.bcvRate.dollar} VES`;
    },
    
    getBCVChipColor() {
      if (this.bcvError) return 'error';
      if (this.bcvLoading) return 'warning';
      if (this.bcvRate?.source === 'BCV') return 'success'; // Verde para tasa real del BCV
      if (this.bcvRate?.source === 'DEFAULT') return 'info'; // Azul para tasa por defecto
      return 'warning';
    }
  }
}
</script>

<style scoped>
/* ========================================
   APP BAR STYLES
   ======================================== */
.app-bar {
  z-index: 1000 !important;
  background-color: white !important;
  border-bottom: 1px solid #E0E0E0 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

/* Cuando el sidebar se expande, ajustar solo el título */
.app-bar .v-toolbar-title.title-adjusted {
  margin-left: 270px !important; /* Espacio para el sidebar expandido (256px + 14px de margen) */
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Header responsive */
.app-bar .v-toolbar-title {
  font-size: 1.5rem !important;
  font-weight: 800 !important;
  margin-left: 70px !important; /* Espacio para el sidebar cerrado (56px + 14px de margen) */
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-bar .bcv-rate-display {
  margin-right: 16px;
}

.app-bar .bcv-rate-display .v-chip {
  font-size: 0.875rem;
}

/* Responsive para tablets */
@media (max-width: 768px) {
  .app-bar .v-toolbar-title {
    font-size: 1.25rem !important;
    margin-left: 70px !important; /* Espacio para el sidebar cerrado */
  }
  
  .app-bar .bcv-rate-display {
    margin-right: 12px;
  }
  
  .app-bar .bcv-rate-display .v-chip {
    font-size: 0.8rem;
  }
  
  .app-bar .bcv-rate-display .v-chip .v-icon {
    font-size: 14px !important;
  }
  
  /* Ajuste del título cuando sidebar se expande en tablets */
  .app-bar .v-toolbar-title.title-adjusted {
    margin-left: 270px !important; /* Espacio para el sidebar expandido */
  }
}

/* Responsive para móviles */
@media (max-width: 480px) {
  .app-bar .v-toolbar-title {
    font-size: 1.125rem !important;
    margin-left: 70px !important; /* Espacio para el sidebar cerrado */
  }
  
  .app-bar .bcv-rate-display {
    margin-right: 8px;
  }
  
  .app-bar .bcv-rate-display .v-chip {
    font-size: 0.75rem;
    padding: 4px 8px;
  }
  
  .app-bar .bcv-rate-display .v-chip .v-icon {
    font-size: 12px !important;
  }
  
  .app-bar .v-btn {
    min-width: 40px !important;
    padding: 0 8px !important;
  }
  
  .app-bar .v-btn .v-icon {
    font-size: 20px !important;
  }
  
  /* Ajuste del título cuando sidebar se expande en móviles */
  .app-bar .v-toolbar-title.title-adjusted {
    margin-left: 270px !important; /* Espacio para el sidebar expandido */
  }
}

/* ========================================
   BCV RATE DISPLAY STYLES
   ======================================== */
.bcv-rate-display {
  display: flex;
  align-items: center;
}

.bcv-rate-display .v-chip {
  transition: all 0.3s ease;
}

.bcv-rate-display .v-chip:hover {
  transform: scale(1.05);
}

.cursor-pointer {
  cursor: pointer;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ========================================
   USER MENU BUTTON STYLES
   ======================================== */
.v-btn {
  pointer-events: auto !important;
  cursor: pointer !important;
  z-index: 1001 !important;
}

.v-menu {
  z-index: 2000 !important;
}

/* ========================================
   NAVIGATION DRAWER STYLES
   ======================================== */
.v-navigation-drawer {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  background-color: #010101 !important;
  height: 100vh !important;
  min-height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
}

.v-navigation-drawer .v-list {
  background-color: #010101 !important;
  padding: 0 !important;
}

.v-navigation-drawer .v-list-item {
  margin: 0px 0px;
  border-radius: 0px;
  padding: 12px 16px;
  transition: all 0.3s ease;
  color: white !important;
  width: 100%;
  min-height: 44px; /* Mínimo para accesibilidad táctil */
}

.v-navigation-drawer .v-list-item .v-list-item-title {
  color: white !important;
  font-weight: 500;
  font-size: 0.875rem; /* 14px - Tamaño más compacto pero legible */
  line-height: 1.25;
}


.v-navigation-drawer .v-list-item .v-icon {
  color: white !important;
  font-size: 1.25rem !important; /* 20px - Iconos más pequeños pero visibles */
}

.v-navigation-drawer .v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.v-navigation-drawer .v-list-item.v-list-item--active {
  background-color: rgba(255, 255, 255, 0.15);
  border-left: 3px solid #E0B04F;
}

.v-navigation-drawer .v-list-item.v-list-item--active .v-list-item-title {
  color: white !important;
  font-weight: 600;
}

.v-navigation-drawer .v-list-item.v-list-item--active .v-icon {
  color: #E0B04F !important;
}

/* Estilos adicionales para asegurar colores blancos en todo el sidebar */
.v-navigation-drawer .v-list-item__prepend .v-icon {
  color: white !important;
}

.v-navigation-drawer .v-list-item__content {
  color: white !important;
}

.v-navigation-drawer .v-list-item__title {
  color: white !important;
}


/* Asegurar que el sidebar tenga fondo negro */
.v-navigation-drawer--permanent {
  background-color: #010101 !important;
  height: 100vh !important;
  min-height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
}

.v-navigation-drawer--permanent .v-list {
  background-color: #010101 !important;
  padding: 0 !important;
}

/* ========================================
   SCROLLBAR STYLES
   ======================================== */
.v-navigation-drawer {
  /* Webkit browsers (Chrome, Safari, Edge) */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
}

.v-navigation-drawer::-webkit-scrollbar {
  width: 6px;
}

.v-navigation-drawer::-webkit-scrollbar-track {
  background: transparent;
}

.v-navigation-drawer::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  transition: background-color 0.3s ease;
}

.v-navigation-drawer::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.5);
}

.v-navigation-drawer::-webkit-scrollbar-thumb:active {
  background-color: rgba(255, 255, 255, 0.7);
}

/* Eliminar padding interno de los elementos de lista */
.v-navigation-drawer .v-list-item__content {
  padding: 0 !important;
}

.v-navigation-drawer .v-list-item__prepend {
  margin-inline-end: 12px !important;
}

/* ========================================
   LOGOUT BUTTON STYLES
   ======================================== */
.v-navigation-drawer .v-list-item[value="logout"] {
  margin: 0px 0px;
  border-radius: 0px;
  padding: 12px 16px;
  transition: all 0.3s ease;
  color: white !important;
  width: 100%;
  min-height: 44px;
}

.v-navigation-drawer .v-list-item[value="logout"]:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.v-navigation-drawer .v-list-item[value="logout"] .v-list-item-title {
  color: white !important;
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25;
}

.v-navigation-drawer .v-list-item[value="logout"] .v-icon {
  color: white !important;
  font-size: 1.25rem !important;
}

/* ========================================
   RESPONSIVE STYLES
   ======================================== */
@media (max-width: 768px) {
  .user-menu {
    min-width: 180px;
  }
  
  .user-name {
    font-size: 0.8rem;
  }
  
  .user-role {
    font-size: 0.7rem;
  }
  
  /* Ajustes para móviles */
  .v-navigation-drawer .v-list-item {
    padding: 14px 16px; /* Ligeramente más padding en móviles para mejor táctil */
    min-height: 48px; /* Mayor área táctil en móviles */
  }
  
  .v-navigation-drawer .v-list-item .v-list-item-title {
    font-size: 0.9rem; /* Fuente ligeramente más grande en móviles */
  }
  
  .v-navigation-drawer .v-list-item .v-icon {
    font-size: 1.375rem !important; /* Iconos ligeramente más grandes en móviles */
  }
  
  /* Logout button en móviles */
  .v-navigation-drawer .v-list-item[value="logout"] {
    padding: 14px 16px;
    min-height: 48px;
  }
  
  .v-navigation-drawer .v-list-item[value="logout"] .v-list-item-title {
    font-size: 0.9rem;
  }
  
  .v-navigation-drawer .v-list-item[value="logout"] .v-icon {
    font-size: 1.375rem !important;
  }
}

@media (max-width: 480px) {
  .v-navigation-drawer .v-list-item {
    padding: 16px 20px; /* Aún más padding en pantallas muy pequeñas */
    min-height: 52px;
  }
  
  .v-navigation-drawer .v-list-item .v-list-item-title {
    font-size: 0.95rem;
  }
  
  /* Logout button en pantallas muy pequeñas */
  .v-navigation-drawer .v-list-item[value="logout"] {
    padding: 16px 20px;
    min-height: 52px;
  }
  
  .v-navigation-drawer .v-list-item[value="logout"] .v-list-item-title {
    font-size: 0.95rem;
  }
}

/* ========================================
   ANIMATIONS
   ======================================== */
.v-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu .v-list-item {
  transition: background-color 0.2s ease;
}

/* ========================================
   ACCESSIBILITY
   ======================================== */
@media (prefers-reduced-motion: reduce) {
  .v-list-item,
  .user-menu .v-list-item {
    transition: none;
  }
  
  .v-list-item:hover {
    transform: none;
  }
}
</style>
