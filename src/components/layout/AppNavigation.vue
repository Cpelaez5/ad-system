<template>
  <div class="navigation-wrapper">
    <!-- Trial Banner - Sticky at top -->
    <div v-if="showTrialBanner" class="trial-banner-container">
      <div class="trial-banner" :class="getTrialBannerClass()">
        <v-container fluid class="py-2">
          <div class="d-flex align-center justify-center">
            <v-icon size="20" class="mr-2">mdi-clock-alert-outline</v-icon>
            <span class="text-body-2 font-weight-bold">
              {{ getTrialMessage() }}
            </span>
            <v-btn 
              size="small" 
              variant="outlined" 
              class="ml-4 trial-cta-btn"
              to="/pricing"
            >
              <v-icon size="16" class="mr-1">mdi-rocket-launch</v-icon>
              Ver Planes
            </v-btn>
          </div>
        </v-container>
      </div>
    </div>

    <!-- App Bar -->
    <v-app-bar
      color="white"
      elevation="0"
      class="app-bar"
      style="border-bottom: 1px solid #E0E0E0;"
    >
      <!-- Logo y título -->
      <v-toolbar-title
        :class="['text-h5', 'font-weight-bold', 'animate-fade-in', 'animate-delay-200', { 'title-adjusted': sidebarExpanded }]"
        style="color: #000000; font-weight: 800 !important;"
      >
        {{ getCurrentPageTitle() }}
      </v-toolbar-title>

      <v-spacer />

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
      <v-btn id="user-menu-btn" color="primary" variant="text" @click="handleUserButtonClick">
        <v-icon>mdi-account-circle</v-icon>
        <span class="ml-2 d-none d-md-inline">{{ currentUser?.firstName || 'Usuario' }}</span>
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
          <v-list-item @click="goToProfile">
            <v-list-item-title>Mi Perfil</v-list-item-title>
          </v-list-item>
          <v-list-item @click="goToSettings">
            <v-list-item-title>Configuración</v-list-item-title>
          </v-list-item>
          <v-divider />
          <v-list-item @click="logout">
            <v-list-item-title>Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <!-- Navegación lateral (extraída a componente Sidebar.vue) -->
    <Sidebar />
  </div>
</template>

<script>
import bcvService from '@/services/bcvService.js';
import Sidebar from './Sidebar.vue';
import { supabase } from '@/lib/supabaseClient';

export default {
	name: 'AppNavigation',
	components: { Sidebar },
	data() {
		return {
			bcvRate: null,
			bcvLoading: false,
			bcvError: false,
			sidebarExpanded: false,
			showTrialBanner: false,
			trialDaysLeft: 0,
			userPlan: null
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
		await this.checkTrialStatus();
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
		// Desconectar observers si existen
		if (this.sidebarObserver && typeof this.sidebarObserver.disconnect === 'function') {
			try { this.sidebarObserver.disconnect(); } catch (e) { /* ignore */ }
		}
		if (this.sidebarResizeObserver && typeof this.sidebarResizeObserver.disconnect === 'function') {
			try { this.sidebarResizeObserver.disconnect(); } catch (e) { /* ignore */ }
		}
	},
	methods: {
    async checkTrialStatus() {
      try {
        const { ONBOARDING_V1 } = await import('@/config/featureFlags');
        if (!ONBOARDING_V1) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('users')
          .select('trial_end, plan_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        // Store user plan for display
        this.userPlan = profile.plan_id;

        // Show banner only for free trial users
        if (profile.plan_id === 'free_trial' && profile.trial_end) {
          const end = new Date(profile.trial_end);
          const now = new Date();
          const diffTime = end - now;
          this.trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          this.showTrialBanner = this.trialDaysLeft >= 0;
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    },

    getPlanName(planId) {
      const plans = {
        'free_trial': 'Prueba Gratuita',
        'basic': 'Plan Básico',
        'pro': 'Plan Profesional',
        'enterprise': 'Plan Empresarial'
      };
      return plans[planId] || planId || 'Sin Plan';
    },

    getPlanColor(planId) {
      const colors = {
        'free_trial': 'warning',
        'basic': 'info',
        'pro': 'success',
        'enterprise': 'purple'
      };
      return colors[planId] || 'grey';
    },

    getTrialMessage() {
      if (this.trialDaysLeft === 0) {
        return '¡Tu prueba gratuita termina hoy! Actualiza tu plan para continuar.';
      } else if (this.trialDaysLeft === 1) {
        return '¡Tu prueba gratuita termina mañana! Actualiza tu plan ahora.';
      } else if (this.trialDaysLeft <= 3) {
        return `¡Solo ${this.trialDaysLeft} días restantes en tu prueba gratuita!`;
      } else {
        return `Tienes ${this.trialDaysLeft} días restantes en tu prueba gratuita.`;
      }
    },

    getTrialBannerClass() {
      if (this.trialDaysLeft <= 1) {
        return 'trial-urgent';
      } else if (this.trialDaysLeft <= 3) {
        return 'trial-warning';
      } else {
        return 'trial-info';
      }
    },
		getCurrentPageTitle() {
			const routeName = this.$route.name
			const pageTitles = {
				'Dashboard': 'Dashboard',
				'ClienteDashboard': 'Dashboard',
				'Clientes': 'Clientes',
				'Facturacion': 'Facturación',
				'Gastos': 'Gastos',
				'Compras': 'Compras',
				'ClienteMiArea': 'Mi Área',
				'ClienteCompras': 'Mis Compras',
				'ClienteGastos': 'Mis Gastos',
				'ClienteArchivo': 'Mis Documentos',
				'ContadorArea': 'Área de Contador',
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
			const THRESHOLD = 88; // px

			this.$nextTick(() => {
				const sidebar = document.querySelector('.v-navigation-drawer');
				if (!sidebar) return;

				this.sidebarExpanded = sidebar.offsetWidth > THRESHOLD || sidebar.classList.contains('v-navigation-drawer--is-hovering');

				if (window.ResizeObserver) {
					this.sidebarResizeObserver = new ResizeObserver((entries) => {
						for (const entry of entries) {
							const width = entry.contentRect?.width || entry.target.offsetWidth;
							this.sidebarExpanded = width > THRESHOLD || sidebar.classList.contains('v-navigation-drawer--is-hovering');
						}
					});
					try { this.sidebarResizeObserver.observe(sidebar); } catch (e) { /* ignore */ }
				}

				this.sidebarObserver = new MutationObserver((mutations) => {
					mutations.forEach((mutation) => {
						if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
							const isHovering = sidebar.classList.contains('v-navigation-drawer--is-hovering');
							const isWide = sidebar.offsetWidth > THRESHOLD;
							this.sidebarExpanded = isHovering || isWide;
						}
					});
				});
				try { this.sidebarObserver.observe(sidebar, { attributes: true, attributeFilter: ['class'] }); } catch (e) { /* ignore */ }
			});
		},
    
		handleUserButtonClick() {
			console.log('🔵 Botón de usuario clickeado')
			console.log('🔵 Usuario actual:', this.currentUser)
		},
    
		logout() {
			console.log('🔴 Cerrando sesión...')
			localStorage.removeItem('usuarioAutenticado')
			localStorage.removeItem('currentUser')
			localStorage.removeItem('authToken')
			this.$router.push('/login')
		},
    
		goToProfile() {
			this.$router.push('/profile')
		},
    
		goToSettings() {
			this.$router.push('/settings')
		},
    
		getRoleName(role) {
			const roleNames = {
				super_admin: 'Super Administrador',
				admin: 'Administrador',
				contador: 'Contador',
				cliente: 'Cliente'
			}
			return roleNames[role] || 'Usuario'
		},
    
		hasPermission(permission) {
			try {
				const currentUser = this.currentUser
				if (!currentUser.role) return false
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
			if (this.bcvRate?.source === 'BCV') return 'success';
			if (this.bcvRate?.source === 'DEFAULT') return 'info';
			return 'warning';
		}
	}
}
</script>

<style scoped>
/* ========================================
	 NAVIGATION WRAPPER
	 ======================================== */
.navigation-wrapper {
	position: relative;
	width: 100%;
}

/* ========================================
	 TRIAL BANNER STYLES
	 ======================================== */
.trial-banner-container {
	position: sticky;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1050;
	width: 100%;
}

.trial-banner {
	width: 100%;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	transition: all 0.3s ease;
}

.trial-info {
	background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
	color: white;
}

.trial-warning {
	background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
	color: white;
}

.trial-urgent {
	background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
	color: white;
	animation: pulse-urgent 2s ease-in-out infinite;
}

@keyframes pulse-urgent {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.9; }
}

.trial-cta-btn {
	border-color: white !important;
	color: white !important;
	font-weight: 600;
	transition: all 0.2s ease;
}

.trial-cta-btn:hover {
	background-color: rgba(255, 255, 255, 0.2) !important;
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* ========================================
	 APP BAR STYLES
	 ======================================== */
.app-bar {
	z-index: 1000 !important;
	background-color: white !important;
	border-bottom: 1px solid #E0E0E0 !important;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.app-bar .v-toolbar-title.title-adjusted {
	margin-left: 270px !important;
	transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-bar .v-toolbar-title {
	font-size: 1.5rem !important;
	font-weight: 800 !important;
	margin-left: 70px !important;
	transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.app-bar .bcv-rate-display { margin-right: 16px; }
.app-bar .bcv-rate-display .v-chip { font-size: 0.875rem; }

@media (max-width: 768px) {
	.app-bar .v-toolbar-title { font-size: 1.25rem !important; margin-left: 70px !important; }
	.app-bar .bcv-rate-display { margin-right: 12px; }
	.app-bar .bcv-rate-display .v-chip { font-size: 0.8rem; }
}

@media (max-width: 480px) {
	.app-bar .v-toolbar-title { font-size: 1.125rem !important; margin-left: 70px !important; }
	.app-bar .bcv-rate-display { margin-right: 8px; }
	.app-bar .bcv-rate-display .v-chip { font-size: 0.75rem; padding: 4px 8px; }
	.app-bar .v-btn { min-width: 40px !important; padding: 0 8px !important; }
}

.bcv-rate-display { display: flex; align-items: center; }
.bcv-rate-display .v-chip { transition: all 0.3s ease; }
.bcv-rate-display .v-chip:hover { transform: scale(1.05); }

.cursor-pointer { cursor: pointer; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.v-btn { pointer-events: auto !important; cursor: pointer !important; z-index: 1001 !important; }
.v-menu { z-index: 2000 !important; }

</style>
*** End Patch
