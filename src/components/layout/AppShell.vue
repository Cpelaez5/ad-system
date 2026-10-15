<template>
  <TrialBanner
    @visibility-change="handleBannerVisibility"
    :sidebar-expanded="sidebarExpanded"
    style="z-index: 900 !important;"
  />

  <!-- El menú va ANTES que la barra superior: Vuetify reparte el layout en orden de
       registro, así el menú ocupa todo el alto en escritorio y la barra queda a su derecha. -->
  <MenuLateral
    v-model="drawerOpen"
    :role="currentUser?.role"
    :is-services-company="isServicesCompany"
    :modo="modoMenu"
    @cambiar-modo="cambiarModoMenu"
    @logout="logout"
  />

  <BarraSuperior
    :titulo-pagina="tituloPagina"
    :mostrar-menu="mostrarBotonMenu"
    :bcv-rate="bcvRate"
    :bcv-loading="bcvLoading"
    :bcv-error="bcvError"
    :tasa-info="tasaInfo"
    :show-usd-rate="showUsdRate"
    :show-eur-rate="showEurRate"
    :show-cny-rate="showCnyRate"
    :show-try-rate="showTryRate"
    :show-rub-rate="showRubRate"
    :current-user="currentUser"
    :user-plan="userPlan"
    :is-client-profile-incomplete="isClientProfileIncomplete"
    @toggle-drawer="drawerOpen = !drawerOpen"
    @refresh-bcv="refreshBCVRate"
  />

  <!-- Barra inferior del cliente en móvil (<600px); no renderiza nada en
       otros roles o tamaños, ver ClienteBottomNav.vue -->
  <!-- Aviso no bloqueante: la tasa automática no respondió (solo clientes) -->
  <v-snackbar v-model="avisoTasaFallo" location="top" :timeout="10000" color="warning" data-testid="aviso-tasa-fallo">
    No pudimos actualizar la tasa del BCV
    <template #actions>
      <v-btn variant="text" class="text-none" @click="escribirTasa">Escribirla yo</v-btn>
    </template>
  </v-snackbar>

  <ClienteBottomNav
    :bcv-rate="bcvRate"
    :tasa-info="tasaInfo"
    :show-usd-rate="showUsdRate"
    :show-eur-rate="showEurRate"
    :show-cny-rate="showCnyRate"
    :show-try-rate="showTryRate"
    :show-rub-rate="showRubRate"
  />

  <!-- Bloqueo por inactividad: una sola vez para todos los roles (solo con sesión). -->
  <BloqueoInactividad
    v-if="currentUser?.email"
    :nombre="nombreCompleto"
    :correo="currentUser.email"
    @cerrar-sesion="logout"
  />
</template>

<script>
import bcvService from '@/services/bcvService.js';
import { tasasVigentes, EVENTO_TASA_CAMBIO } from '@/services/tasaService.js';
import { supabase } from '@/lib/supabaseClient';
import userSettingsService from '@/services/user-settings-service.js';
import venezuelaLocationsService from '@/services/venezuelaLocationsService.js';
import BarraSuperior from './BarraSuperior.vue';
import MenuLateral from './MenuLateral.vue';
import ClienteBottomNav from './ClienteBottomNav.vue';
import TrialBanner from './TrialBanner.vue';
import BloqueoInactividad from './BloqueoInactividad.vue';

const MENU_MODO_KEY = 'ad_system_menu_modo';
// Clave anterior (rail sí/no): se respeta al migrar para no cambiarle el menú a nadie.
const RAIL_STORAGE_KEY_ANTERIOR = 'ad_system_sidebar_rail_collapsed';

/**
 * AppShell — armazón de la app (sustituye a AppNavigation.vue + Sidebar.vue).
 * Orquesta componentes chicos de layout, todos nativos de Vuetify:
 *  - BarraSuperior: app bar (título de la vista, tasas compactas ≥600px, menú de usuario).
 *  - MenuLateral: drawer de navegación (temporary <1280px, permanent+rail ≥1280px).
 *  - ClienteBottomNav: barra inferior fija, solo cliente <600px (con su hoja "Más").
 *  - TrialBanner: se mantiene igual, solo cambia cómo se calcula `sidebarExpanded`.
 *
 * Breakpoints (unificados para todos los roles):
 *  - <600px (xs) + rol `cliente`: sin drawer ni botón de menú — manda la barra inferior.
 *  - <1280px (resto): drawer temporary, abierto con el botón de menú del app bar.
 *  - ≥1280px: drawer permanent a todo el alto, con modo 'fijo' (abierto) o 'auto'
 *    (recogido, se expande al pasar el mouse), elegido con el pin del propio menú y
 *    persistido en localStorage (clave `ad_system_menu_modo`).
 */
export default {
  name: 'AppShell',

  components: { BarraSuperior, MenuLateral, ClienteBottomNav, TrialBanner, BloqueoInactividad },

  emits: ['banner-visibility-change'],

  data() {
    return {
      currentUser: this.getCurrentUserFromStorage(),
      drawerOpen: false,
      modoMenu: this.getModoMenuGuardado(),
      bcvRate: null,
      bcvLoading: false,
      bcvError: false,
      // { modo, desactualizada, fallo, fecha } de la tasa vigente (automática o definida por el cliente)
      tasaInfo: null,
      avisoTasaFallo: false,
      avisoTasaMostrado: false,
      userPlan: null,
      showUsdRate: true,
      showEurRate: true,
      showCnyRate: false,
      showTryRate: false,
      showRubRate: false,
    };
  },

  computed: {
    isCliente() {
      return this.currentUser?.role === 'cliente';
    },
    nombreCompleto() {
      const u = this.currentUser || {};
      return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || '';
    },
    isServicesCompany() {
      return this.currentUser?.client?.activity_type === 'services';
    },
    isLgUp() {
      return this.$vuetify.display.lgAndUp;
    },
    isXs() {
      return this.$vuetify.display.xs;
    },
    // El botón de menú (hamburguesa) del app bar solo hace falta cuando el
    // drawer es temporary: <1280px, excepto cliente+xs (usa la barra inferior).
    mostrarBotonMenu() {
      if (this.isCliente && this.isXs) return false;
      return !this.isLgUp;
    },
    sidebarExpanded() {
      return this.isLgUp && this.modoMenu === 'fijo';
    },
    tituloPagina() {
      return this.$route?.meta?.title || 'Sistema Contable';
    },
    isClientProfileIncomplete() {
      if (this.currentUser?.role !== 'cliente') return false;
      const client = this.currentUser?.client;
      if (!client) return false;
      const estado = client.estado || venezuelaLocationsService.getStateByMunicipality(client.municipio || client.municipio_id);
      const municipio = client.municipio || client.municipio_id;
      return !client.activity_type ||
             !client.licencia_actividad_economica ||
             !estado ||
             !municipio;
    },
  },

  watch: {
    '$route'() {
      // En drawers temporary (tablet / móvil no-cliente), cerrar al navegar.
      if (!this.isLgUp) {
        this.drawerOpen = false;
      }
    },
  },

  async mounted() {
    this.currentUser = this.getCurrentUserFromStorage();
    await this.loadBCVRate();
    await this.loadUserPlan();
    this.bcvInterval = setInterval(() => {
      this.loadBCVRate();
    }, 10 * 60 * 1000);

    this.loadRatePreferences();

    window.addEventListener('ad-settings-changed', this.onSettingsChanged);
    window.addEventListener(EVENTO_TASA_CAMBIO, this.onTasaCambio);

    this.onUserUpdated = (event) => {
      this.currentUser = event?.detail || this.getCurrentUserFromStorage();
    };
    window.addEventListener('ad-user-updated', this.onUserUpdated);
    window.addEventListener('storage', this.onUserUpdated);
  },

  beforeUnmount() {
    if (this.bcvInterval) {
      clearInterval(this.bcvInterval);
    }
    window.removeEventListener('ad-settings-changed', this.onSettingsChanged);
    window.removeEventListener(EVENTO_TASA_CAMBIO, this.onTasaCambio);
    if (this.onUserUpdated) {
      window.removeEventListener('ad-user-updated', this.onUserUpdated);
      window.removeEventListener('storage', this.onUserUpdated);
    }
  },

  methods: {
    getCurrentUserFromStorage() {
      try {
        return JSON.parse(localStorage.getItem('currentUser') || '{}');
      } catch (error) {
        console.error('Error obteniendo usuario de localStorage:', error);
        return {};
      }
    },

    getModoMenuGuardado() {
      try {
        const modo = localStorage.getItem(MENU_MODO_KEY);
        if (modo === 'fijo' || modo === 'auto') return modo;
        return localStorage.getItem(RAIL_STORAGE_KEY_ANTERIOR) === '1' ? 'auto' : 'fijo';
      } catch (error) {
        return 'fijo';
      }
    },

    cambiarModoMenu(modo) {
      this.modoMenu = modo === 'auto' ? 'auto' : 'fijo';
      try {
        localStorage.setItem(MENU_MODO_KEY, this.modoMenu);
      } catch (error) {
        // localStorage puede no estar disponible (modo privado, cuota llena...):
        // la preferencia simplemente no persiste entre sesiones.
      }
    },

    loadRatePreferences() {
      const settings = userSettingsService.getSettings();
      this.showUsdRate = settings.showUsdRate;
      this.showEurRate = settings.showEurRate;
      this.showCnyRate = settings.showCnyRate;
      this.showTryRate = settings.showTryRate;
      this.showRubRate = settings.showRubRate;
    },

    onSettingsChanged(event) {
      const settings = event.detail;
      this.showUsdRate = settings.showUsdRate;
      this.showEurRate = settings.showEurRate;
      this.showCnyRate = settings.showCnyRate;
      this.showTryRate = settings.showTryRate;
      this.showRubRate = settings.showRubRate;
    },

    handleBannerVisibility(isVisible) {
      this.$emit('banner-visibility-change', isVisible);
    },

    async loadUserPlan() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('users')
          .select('plan_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          this.userPlan = profile.plan_id;
        }
      } catch (error) {
        console.error('Error loading user plan:', error);
      }
    },

    async loadBCVRate() {
      try {
        this.bcvLoading = true;
        this.bcvError = false;
        // Tasa VIGENTE del negocio: automática (BCV) o la que definió el cliente.
        const vigentes = await tasasVigentes();
        const t = vigentes.tasas || {};
        if (t.USD) {
          this.bcvRate = {
            dollar: t.USD,
            euro: t.EUR || null,
            yuan: t.CNY || null,
            lira: t.TRY || null,
            rublo: t.RUB || null,
            date: vigentes.fecha,
            source: vigentes.fuente,
          };
        } else {
          this.bcvError = true;
          this.bcvRate = null;
        }
        this.tasaInfo = {
          modo: vigentes.modo,
          desactualizada: vigentes.desactualizada,
          fallo: vigentes.fallo,
          fecha: vigentes.fecha,
        };
        if (vigentes.fallo && vigentes.modo === 'automatica' && this.isCliente && !this.avisoTasaMostrado) {
          this.avisoTasaMostrado = true;
          this.avisoTasaFallo = true;
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

    escribirTasa() {
      this.avisoTasaFallo = false;
      this.$router?.push('/cliente/mi-area#tasa');
    },

    onTasaCambio() {
      this.loadBCVRate();
    },

    async logout() {
      try {
        const { default: userService } = await import('@/services/userService');
        await userService.logout();
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
      this.$router.push('/login');
    },
  },
};
</script>
