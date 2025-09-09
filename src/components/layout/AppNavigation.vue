<template>
  <v-app-bar
    color="primary"
    dark
    prominent
    elevation="2"
    class="animate-slide-in-down"
  >
    <!-- Logo y título -->
    <v-app-bar-nav-icon 
      @click="drawer = !drawer"
      class="animate-micro-bounce"
    ></v-app-bar-nav-icon>
    
    <v-toolbar-title class="text-h5 font-weight-bold animate-fade-in animate-delay-200">
      <v-icon left class="animate-micro-rotate">mdi-calculator-variant</v-icon>
      Sistema Contable
    </v-toolbar-title>

    <v-spacer></v-spacer>

    <!-- Menú de usuario -->
    <v-menu offset-y>
      <template v-slot:activator="{ props }">
        <v-btn
          icon
          v-bind="props"
          color="white"
          class="animate-hover-pulse animate-delay-300"
        >
          <v-icon>mdi-account-circle</v-icon>
        </v-btn>
      </template>
      <v-list class="animate-scale-in">
        <v-list-item class="animate-slide-in-left animate-delay-100">
          <v-list-item-title>Perfil</v-list-item-title>
        </v-list-item>
        <v-list-item class="animate-slide-in-left animate-delay-200">
          <v-list-item-title>Configuración</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="logout" class="animate-slide-in-left animate-delay-300">
          <v-list-item-title>Cerrar Sesión</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>

  <!-- Navegación lateral -->
  <v-navigation-drawer
    v-model="drawer"
    temporary
    color="grey-lighten-5"
    class="animate-slide-in-left"
  >
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
  methods: {
    logout() {
      // Limpiar datos de sesión
      localStorage.removeItem('usuarioAutenticado')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('authToken')
      
      console.log('Cerrando sesión...')
      this.$router.push('/login')
    },
    
    hasPermission(permission) {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}')
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
.v-navigation-drawer {
  border-right: 1px solid #e0e0e0;
}

.v-list-item {
  margin: 4px 8px;
  border-radius: 8px;
}

.v-list-item:hover {
  background-color: rgba(25, 118, 210, 0.08);
}
</style>
