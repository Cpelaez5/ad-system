<template>
  <div class="menu-usuario">
    <v-btn id="user-menu-btn" color="primary" variant="text" style="flex-shrink: 0;">
      <v-badge v-if="isClientProfileIncomplete" dot color="error">
        <v-icon>mdi-account-circle</v-icon>
      </v-badge>
      <v-icon v-else>mdi-account-circle</v-icon>
      <span class="ml-2 d-none d-md-inline">{{ currentUser?.firstName || 'Usuario' }}</span>
      <v-icon size="18" class="ml-1">mdi-chevron-down</v-icon>
    </v-btn>

    <v-menu activator="#user-menu-btn">
      <v-list>
        <v-list-item>
          <v-list-item-title>{{ currentUser?.firstName || 'Usuario' }} {{ currentUser?.lastName || '' }}</v-list-item-title>
          <v-list-item-subtitle>{{ getRoleName(currentUser?.role) }}</v-list-item-subtitle>
          <v-list-item-subtitle v-if="userPlan" class="mt-1">
            <v-chip size="x-small" :color="getPlanColor(userPlan)" variant="tonal">
              {{ getPlanName(userPlan) }}
            </v-chip>
          </v-list-item-subtitle>
        </v-list-item>
        <v-divider />
        <v-list-item @click="goToPlans">
          <v-list-item-title>Mi Suscripción</v-list-item-title>
        </v-list-item>
        <v-list-item @click="goToBilling">
          <v-list-item-title>Facturación</v-list-item-title>
        </v-list-item>
        <v-list-item @click="goToProfile">
          <v-list-item-title>
            Mi Perfil
            <v-icon v-if="isClientProfileIncomplete" color="error" size="small" class="ml-1" title="Faltan datos por completar">mdi-alert-circle</v-icon>
          </v-list-item-title>
        </v-list-item>
        <v-list-item @click="goToSettings">
          <v-list-item-title>Configuración</v-list-item-title>
        </v-list-item>
        <v-list-item to="/ayuda" data-testid="menu-usuario-ayuda">
          <v-list-item-title>Ayuda</v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-item @click="logout">
          <v-list-item-title>Cerrar Sesión</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<script>
/**
 * MenuUsuario — botón de avatar + menú desplegable (Mi Suscripción,
 * Facturación, Mi Perfil, Configuración, Cerrar Sesión), igual para todos
 * los roles. Extraído de AppNavigation.vue sin cambios de comportamiento.
 * El v-menu de Vuetify ya anima su entrada con escala desde el activador
 * (comportamiento nativo, no se reinventa).
 */
export default {
  name: 'MenuUsuario',

  props: {
    currentUser: {
      type: Object,
      default: () => ({}),
    },
    userPlan: {
      type: String,
      default: null,
    },
    isClientProfileIncomplete: {
      type: Boolean,
      default: false,
    },
  },

  methods: {
    getRoleName(role) {
      const roleNames = {
        super_admin: 'Super Administrador',
        admin: 'Administrador',
        contador: 'Contador',
        cliente: 'Cliente',
      }
      return roleNames[role] || 'Usuario'
    },

    getPlanName(planId) {
      const plans = {
        free_trial: 'Prueba Gratuita',
        basic: 'Plan Básico',
        pro: 'Plan Profesional',
        enterprise: 'Plan Empresarial',
      }
      return plans[planId] || planId || 'Sin Plan'
    },

    getPlanColor(planId) {
      const colors = {
        free_trial: 'warning',
        basic: 'info',
        pro: 'success',
        enterprise: 'purple',
      }
      return colors[planId] || 'grey'
    },

    goToProfile() {
      this.$router.push('/cliente/mi-area')
    },

    goToPlans() {
      this.$router.push('/cliente/planes')
    },

    goToBilling() {
      this.$router.push('/cliente/facturacion-suscripcion')
    },

    goToSettings() {
      this.$router.push('/settings')
    },

    async logout() {
      try {
        const { default: userService } = await import('@/services/userService')
        await userService.logout()
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
      }
      this.$router.push('/login')
    },
  },
}
</script>
