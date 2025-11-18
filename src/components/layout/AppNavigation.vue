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
</template>

<script>
import bcvService from '@/services/bcvService.js';
import Sidebar from './Sidebar.vue';

export default {
	name: 'AppNavigation',
	components: { Sidebar },
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
		// Desconectar observers si existen
		if (this.sidebarObserver && typeof this.sidebarObserver.disconnect === 'function') {
			try { this.sidebarObserver.disconnect(); } catch (e) { /* ignore */ }
		}
		if (this.sidebarResizeObserver && typeof this.sidebarResizeObserver.disconnect === 'function') {
			try { this.sidebarResizeObserver.disconnect(); } catch (e) { /* ignore */ }
		}
	},
	methods: {
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
