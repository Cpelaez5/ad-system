<template>
  <v-navigation-drawer
    expand-on-hover
    permanent
    rail
    color="#010101"
    class="animate-slide-in-left"
    theme="dark"
  >
    <!-- Header del sidebar con logo (Fijo, no scrolleable) -->
    <template v-slot:prepend>
      <div class="sidebar-header">
        <div class="logo-container">
          <img
            src="@/assets/icon-adaptableV2.svg"
            alt="Logo"
            class="logo-icon animate-micro-rotate"
          />
        </div>
      </div>
    </template>

    <v-divider></v-divider>

    <!-- Navigation Items - Mostrados según el rol del usuario -->
    <v-list density="compact" nav>
      <!-- Dashboard: Todos los usuarios -->
      <v-list-item
        v-if="isContador || isAdmin || isSuperAdmin"
        :to="{ name: 'Dashboard' }"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="dashboard"
      ></v-list-item>
      <v-list-item
        v-if="isCliente"
        :to="{ name: 'ClienteDashboard' }"
        prepend-icon="mdi-view-dashboard"
        title="Dashboard"
        value="cliente-dashboard"
      ></v-list-item>

      <!-- Cliente: Mi Área, Compras, Gastos, Archivo -->
      <template v-if="isCliente">


      
        <v-list-item
          v-if="isCliente"
          :to="{ name: 'ClienteVentas' }"
          prepend-icon="mdi-receipt"
          title="Facturación"
          value="cliente-facturacion"
        ></v-list-item>
       

        <v-list-item
          :to="{ name: 'ClienteArchivo' }"
          prepend-icon="mdi-folder-multiple"
          title="Mis Documentos"
          value="cliente-archivo"
        ></v-list-item>

        <v-list-item
          :to="{ name: 'ClienteFiscal360' }"
          prepend-icon="mdi-file-certificate"
          title="Expediente Fiscal"
          value="cliente-fiscal-360"
        ></v-list-item>

        <v-list-item
          v-if="!isServicesCompany"
          :to="{ name: 'ClienteInventario' }"
          prepend-icon="mdi-package-variant-closed"
          title="Inventario"
          value="cliente-inventario"
        ></v-list-item>

        <v-list-item
          :to="{ name: 'ClienteFacturacionSuscripcion' }"
          prepend-icon="mdi-credit-card-outline"
          title="Mi Facturación"
          value="cliente-facturacion-suscripcion"
        ></v-list-item>
      </template>


      <!-- Contador y Admin: Área de Contador, Clientes, Facturación -->
      <template v-if="isContador || isAdmin">
        <v-list-item
          :to="{ name: 'ContadorArea' }"
          prepend-icon="mdi-calculator"
          title="Área de Contador"
          value="contador-area"
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

      <v-list-group value="organizacion">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-office-building"
            title="Organización"
            value="organizacion"
          />
        </template>
        <v-list-item
            :to="{ name: 'GastosOrganizacion' }"
            prepend-icon="mdi-cash-minus"
            title="Gastos"
            value="gastos-organizacion"
        ></v-list-item>
        <v-list-item
            :to="{ name: 'ComprasOrganizacion' }"
            prepend-icon="mdi-cart"
            title="Compras"
            value="compras-organizacion"
        ></v-list-item>
        <v-list-item
            :to="{ name: 'VentasOrganizacion' }"
            prepend-icon="mdi-cash-plus"
            title="Ventas"
            value="ventas-organizacion"
        ></v-list-item>
      </v-list-group>

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
      </template>

      <!-- Admin y Super Admin: Gestión de Usuarios -->
      <v-list-item
        v-if="isAdmin || isSuperAdmin"
        :to="{ name: 'Usuarios' }"
        prepend-icon="mdi-account-group"
        title="Usuarios"
        value="usuarios"
      ></v-list-item>

      <!-- Super Admin: Facturación del Sistema -->
      <v-list-item
        v-if="isSuperAdmin"
        :to="{ name: 'FacturacionSistema' }"
        prepend-icon="mdi-receipt-text-outline"
        title="Facturación"
        value="facturacion-sistema"
      ></v-list-item>

      <!-- Super Admin: Gestión de Empresas (futuro) -->
      <v-list-item
        v-if="isSuperAdmin"
        :to="{ name: 'Dashboard' }"
        prepend-icon="mdi-office-building"
        title="Empresas"
        value="empresas"
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
export default {
  name: "Sidebar",
  data() {
    return {
      currentUserData: null, // Almacenar usuario en data para reactividad
    };
  },
  computed: {
    currentUser() {
      // Usar data reactivo en lugar de leer directamente de localStorage
      if (this.currentUserData) {
        return this.currentUserData;
      }
      try {
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        this.currentUserData = user;
        return user;
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
        return {};
      }
    },
    userRole() {
      return this.currentUser?.role || '';
    },
    isCliente() {
      return this.userRole === 'cliente';
    },
    isContador() {
      return this.userRole === 'contador';
    },
    isAdmin() {
      return this.userRole === 'admin';
    },
    isSuperAdmin() {
      return this.userRole === 'super_admin';
    },
    isServicesCompany() {
      return this.currentUser?.client?.activity_type === 'services';
    }
  },
  mounted() {
    // Cargar usuario inicial
    this.loadUser();
    
    // Escuchar cambios en localStorage (cuando se guarda el usuario después del login)
    window.addEventListener('storage', this.handleStorageChange);
    
    // También escuchar eventos personalizados si el login se hace en la misma ventana
    window.addEventListener('userUpdated', this.loadUser);
  },
  beforeUnmount() {
    // Limpiar listeners
    window.removeEventListener('storage', this.handleStorageChange);
    window.removeEventListener('userUpdated', this.loadUser);
  },
  methods: {
    loadUser() {
      try {
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
        this.currentUserData = user;
        console.log('👤 Usuario cargado en Sidebar:', user.role);
        // Forzar actualización del componente
        this.$forceUpdate();
      } catch (error) {
        console.error("Error cargando usuario:", error);
        this.currentUserData = {};
      }
    },
    handleStorageChange(e) {
      // Detectar cambios en localStorage (funciona entre pestañas)
      if (e.key === 'currentUser') {
        this.loadUser();
      }
    },
    hasPermission(permission) {
      try {
        const currentUser = this.currentUser;
        if (!currentUser.role) return false;
        const rolePermissions = {
          admin: ["users.read", "users.create", "users.update", "users.delete"],
          contador: ["clients.read", "invoices.read", "accounting.read"],
          auditor: ["audit.read", "reports.read"],
          facturador: ["invoices.read", "clients.read"],
          operador: ["clients.read"],
          consultor: ["reports.read"],
        };
        return rolePermissions[currentUser.role]?.includes(permission) || false;
      } catch (error) {
        console.error("Error verificando permisos:", error);
        return false;
      }
    },
    async logout() {
      console.log("🔴 Cerrando sesión...");
      try {
        const { default: userService } = await import('@/services/userService');
        await userService.logout();
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
      localStorage.removeItem("usuarioAutenticado");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
      localStorage.removeItem("current_organization_id");
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
/* ========================================
   NAVIGATION DRAWER STYLES
   ======================================== */
.v-navigation-drawer {
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  height: 100vh !important;
  min-height: 100vh !important;
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
  z-index: 1000;
}

/* Custom logo styling */
.sidebar-header {
  padding: 20px 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px; /* Larger in expanded mode */
  height: 60px;
  transition: all 0.3s ease;
}

.logo-icon {
  width: 48px; /* Larger in expanded mode */
  height: 48px;
  filter: brightness(0) invert(1); /* White logo */
  object-fit: contain;
  transition: all 0.3s ease;
}

/* Custom user selectors for specific padding control */
#app > div > div > nav > div.v-navigation-drawer__content > div.v-list.v-list--nav.v-theme--dark.bg-transparent.v-list--density-compact.v-list--one-line > a.v-list-item.v-list-item--active.v-list-item--link.v-list-item--nav.v-theme--dark.v-list-item--density-compact.v-list-item--one-line.rounded-0.v-list-item--variant-text{
  padding: 20px 14px !important;
}

#app > div > div > nav > div.v-navigation-drawer__content > div.v-list.v-list--nav.v-theme--dark.bg-transparent.v-list--density-compact.v-list--one-line{
  padding: 20px 0px !important;
}

.v-list{
  padding: 20px 0px !important;
}

/* RAIL MODE SPECIFIC STYLES */
/* Resize logo in rail mode to fit standard 56px width */
:deep(.v-navigation-drawer--rail) .logo-container {
  width: 32px;
  height: 32px;
}

:deep(.v-navigation-drawer--rail) .logo-icon {
  width: 24px;
  height: 24px;
}

:deep(.v-navigation-drawer--rail) .sidebar-header {
  padding: 10px 0; /* Reduce padding in rail mode */
}

/* Ensure header item is centered in rail mode */
.sidebar-header-item {
  padding-inline-start: 8px !important;
  padding-inline-end: 8px !important;
}

:deep(.v-navigation-drawer--rail) .sidebar-header-item {
  justify-content: center;
  padding: 0 !important;
}

/* Standard rail mode adjustments for list items */
:deep(.v-navigation-drawer--rail) .v-list-item {
  padding: 0px !important; /* Override global padding */
  justify-content: center !important;
  min-height: 56px !important; /* Ensure sufficient height */
}

:deep(.v-navigation-drawer--rail) .v-list-item__prepend {
  margin-inline-end: 0 !important;
  width: 100%;
  justify-content: center;
  padding: 0 !important; /* Ensure no internal padding */
}

:deep(.v-navigation-drawer--rail) .v-list-item__content {
  display: none !important;
}

/* General list item styling */
.v-list-item {
  /* Default padding for expanded mode */
  padding: 10px 16px !important; 
}

/* Hover effects for list items */
.v-list{
  padding: 20px 0px !important;
}
.v-list-item--nav .v-list-item-title {
  font-size: 0.9rem;
  font-weight: 500;
}

/* Active state styling */
.v-list-item--active {
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.1);
  color: white !important;
}

.v-list-item--active .v-icon {
  color: #e0b04f !important;
}

/* Scrollbar customization */
.v-navigation-drawer ::-webkit-scrollbar {
  width: 4px;
}


.v-navigation-drawer ::-webkit-scrollbar-track {
  background: transparent;
}

.v-navigation-drawer ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.v-navigation-drawer ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
