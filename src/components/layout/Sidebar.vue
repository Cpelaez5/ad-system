<template>
  <v-navigation-drawer
    expand-on-hover
    permanent
    rail
    color="#010101"
    class="animate-slide-in-left"
    dark
    style="height: 100vh; min-height: 100vh"
  >
    <!-- Header del sidebar con logo -->
    <div
      class="sidebar-header"
      style="
        padding: 20px;
        text-align: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background-color: #010101;
      "
    >
      <img
        src="@/assets/icon-adaptableV2.svg"
        alt="Logo"
        class="logo-icon animate-micro-rotate"
        style="
          width: 60px;
          height: 60px;
          margin-bottom: 0px;
          filter: brightness(0) invert(1);
        "
      />
      <h3
        :class="[
          'sidebar-title',
          { 'sidebar-title--hidden': !sidebarExpanded },
        ]"
      >
        Business System
      </h3>
    </div>

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
          :to="{ name: 'ClienteMiArea' }"
          prepend-icon="mdi-account"
          title="Mi Área"
          value="cliente-mi-area"
        ></v-list-item>

        <v-list-group value="cliente-facturacion">
          <template #activator="{ props }">
            <v-list-item
              v-bind="props"
              prepend-icon="mdi-receipt"
              title="Facturación"
              value="cliente-facturacion"
            />
          </template>
          <v-list-item
            :to="{ name: 'ClienteGastos' }"
            prepend-icon="mdi-cash-minus"
            title="Mis Gastos"
            value="cliente-gastos"
          ></v-list-item>
          <v-list-item
            :to="{ name: 'ClienteCompras' }"
            prepend-icon="mdi-cart"
            title="Mis Compras"
            value="cliente-compras"
          ></v-list-item>
        </v-list-group>

        <v-list-item
          :to="{ name: 'ClienteArchivo' }"
          prepend-icon="mdi-folder-multiple"
          title="Mis Documentos"
          value="cliente-archivo"
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

      <v-list-group value="facturacion">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-receipt"
            title="Facturación"
            value="facturacion"
          />
        </template>
        <v-list-item
            :to="{ name: 'Gastos' }"
            prepend-icon="mdi-cash-minus"
            title="Gastos"
            value="gastos"
        ></v-list-item>
        <v-list-item
          :to="{ name: 'Compras' }"
          prepend-icon="mdi-cart"
          title="Compras"
          value="compras"
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
      sidebarExpanded: false,
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
    }
  },
  mounted() {
    // Cargar usuario inicial
    this.loadUser();
    
    // Escuchar cambios en localStorage (cuando se guarda el usuario después del login)
    window.addEventListener('storage', this.handleStorageChange);
    
    // También escuchar eventos personalizados si el login se hace en la misma ventana
    window.addEventListener('userUpdated', this.loadUser);
    
    // Mantener estado visual: detectamos ancho inicial y hover (vuetify agrega clases)
    this.$nextTick(() => {
      const sidebar = document.querySelector(".v-navigation-drawer");
      if (!sidebar) return;
      const THRESHOLD = 88;
      this.sidebarExpanded =
        sidebar.offsetWidth > THRESHOLD ||
        sidebar.classList.contains("v-navigation-drawer--is-hovering");
    });
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
   NAVIGATION DRAWER STYLES (moved desde AppNavigation.vue)
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
  min-height: 44px;
}

.v-navigation-drawer .v-list-item .v-list-item-title {
  color: white !important;
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.25;
}

.v-navigation-drawer .v-list-item .v-icon {
  color: white !important;
  font-size: 1.25rem !important;
}

.v-navigation-drawer .v-list-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.v-navigation-drawer .v-list-item.v-list-item--active {
  background-color: rgba(255, 255, 255, 0.15);
  border-left: 3px solid #e0b04f;
}

.v-navigation-drawer .v-list-item.v-list-item--active .v-list-item-title {
  color: white !important;
  font-weight: 600;
}

.v-navigation-drawer .v-list-item.v-list-item--active .v-icon {
  color: #e0b04f !important;
}

.v-navigation-drawer .v-list-item__prepend .v-icon {
  color: white !important;
}

.v-navigation-drawer .v-list-item__content {
  color: white !important;
}

.v-navigation-drawer .v-list-item__title {
  color: white !important;
}

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

/* Scrollbar */
.v-navigation-drawer {
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

/* Logout button styles */
.v-navigation-drawer .v-list-item[value="logout"] {
  padding: 12px 16px;
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

/* Responsive adjustments */
@media (max-width: 768px) {
  .v-navigation-drawer .v-list-item {
    padding: 14px 16px;
    min-height: 48px;
  }
  .v-navigation-drawer .v-list-item .v-list-item-title {
    font-size: 0.9rem;
  }
  .v-navigation-drawer .v-list-item .v-icon {
    font-size: 1.375rem !important;
  }
  .v-navigation-drawer .v-list-item[value="logout"] {
    padding: 14px 16px;
    min-height: 48px;
  }
}

@media (max-width: 480px) {
  .v-navigation-drawer .v-list-item {
    padding: 16px 20px;
    min-height: 52px;
  }
  .v-navigation-drawer .v-list-item .v-list-item-title {
    font-size: 0.95rem;
  }
  .v-navigation-drawer .v-list-item[value="logout"] {
    padding: 16px 20px;
    min-height: 52px;
  }
}

/* Animations / accessibility kept local */
.v-list-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) {
  .v-list-item {
    transition: none;
  }
  .v-list-item:hover {
    transform: none;
  }
}

/* Sidebar title animation */
.sidebar-title {
  color: white;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  display: inline-block;
  transition: opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: opacity, transform;
}
.sidebar-title--hidden {
  opacity: 0;
  transform: translateX(-6px) scale(0.98);
  pointer-events: none;
}
</style>
