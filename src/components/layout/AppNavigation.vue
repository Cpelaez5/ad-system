<template>
  <v-app-bar
    color="white"
    elevation="2"
    class="app-bar"
    style="border-bottom: 1px solid #E0E0E0; z-index: 1000;"
  >
    <!-- Logo y título -->
    <v-app-bar-nav-icon 
      @click="drawer = !drawer"
      class="animate-micro-bounce"
      color="primary"
    ></v-app-bar-nav-icon>
    
    <v-toolbar-title class="text-h5 font-weight-bold animate-fade-in animate-delay-200" style="color: #000000;">
      <img 
        src="@/assets/icon-adaptableV2.svg" 
        alt="Logo" 
        class="logo-icon animate-micro-rotate"
        style="width: 32px; height: 32px; margin-right: 12px;"
      />
      Business Group
    </v-toolbar-title>

    <v-spacer></v-spacer>

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
    v-model="drawer"
    temporary
    color="#1F355C"
    class="animate-slide-in-left"
    dark
  >
    <!-- Header del sidebar con logo -->
    <div class="sidebar-header" style="padding: 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <img 
        src="@/assets/icon-adaptableV2.svg" 
        alt="Logo" 
        class="logo-icon animate-micro-rotate"
        style="width: 40px; height: 40px; margin-bottom: 10px;"
      />
      <h3 style="color: white; margin: 0; font-size: 18px; font-weight: 600;">Sistema Contable</h3>
    </div>
    
    <v-list>
      <!-- Dashboard -->
      <v-list-item
        :to="{ name: 'Dashboard' }"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        subtitle="Resumen general"
        class="animate-slide-in-left animate-delay-100 animate-hover-lift"
      ></v-list-item>

      <!-- Clientes -->
      <v-list-item
        :to="{ name: 'Clientes' }"
        prepend-icon="mdi-account-group"
        title="Clientes"
        subtitle="Gestión de contribuyentes"
        class="animate-slide-in-left animate-delay-200 animate-hover-lift"
      ></v-list-item>

      <!-- Facturación -->
      <v-list-item
        :to="{ name: 'Facturacion' }"
        prepend-icon="mdi-receipt"
        title="Facturación"
        subtitle="Emisión de facturas"
        class="animate-slide-in-left animate-delay-300 animate-hover-lift"
      ></v-list-item>

      <!-- Contabilidad -->
      <v-list-item
        :to="{ name: 'Contabilidad' }"
        prepend-icon="mdi-book-open-variant"
        title="Contabilidad"
        subtitle="Asientos y reportes"
        class="animate-slide-in-left animate-delay-400 animate-hover-lift"
      ></v-list-item>

      <!-- Auditoría -->
      <v-list-item
        :to="{ name: 'Auditoria' }"
        prepend-icon="mdi-shield-search"
        title="Auditoría"
        subtitle="Trazabilidad y logs"
        class="animate-slide-in-left animate-delay-500 animate-hover-lift"
      ></v-list-item>

      <!-- Archivo Digital -->
      <v-list-item
        :to="{ name: 'Archivo' }"
        prepend-icon="mdi-folder-multiple"
        title="Archivo Digital"
        subtitle="Documentos y soportes"
        class="animate-slide-in-left animate-delay-500 animate-hover-lift"
      ></v-list-item>

      <!-- Usuarios (solo para administradores) -->
      <v-list-item
        :to="{ name: 'Usuarios' }"
        prepend-icon="mdi-account-group"
        title="Usuarios"
        subtitle="Gestión de usuarios y roles"
        class="animate-slide-in-left animate-delay-600 animate-hover-lift"
        v-if="hasPermission('users.read')"
      ></v-list-item>
    </v-list>

    <!-- Información del sistema -->
    <template v-slot:append>
      <div class="pa-4">
        <v-card
          color="primary"
          variant="tonal"
          class="pa-3 animate-scale-in animate-delay-500 animate-hover-glow"
        >
          <div class="text-caption text-center animate-fade-in animate-delay-600">
            <v-icon size="small" class="mr-1 animate-pulse">mdi-cloud</v-icon>
            Sistema Online
          </div>
          <div class="text-caption text-center mt-1 animate-fade-in animate-delay-700">
            v1.0.0
          </div>
        </v-card>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script>
export default {
  name: 'AppNavigation',
  data() {
    return {
      drawer: false
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
  methods: {
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
  border-right: 1px solid #e0e0e0;
}

.v-list-item {
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.v-list-item.v-list-item--active {
  background-color: rgba(255, 255, 255, 0.15);
  border-left: 3px solid #E0B04F;
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
