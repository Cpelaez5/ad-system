<template>
  <template v-if="visible">
    <!--
      Barra inferior del rol cliente (<600px, $vuetify.display.xs).
      Se registra en el sistema de layout de Vuetify (useLayoutItem), así que
      <v-main> recibe su padding-bottom automáticamente: no hace falta tocar
      App.vue para eso.
    -->
    <v-bottom-navigation
      :model-value="activeTab"
      grow
      color="primary"
      bg-color="surface"
      height="64"
      class="cliente-bottom-nav"
      role="navigation"
      aria-label="Navegación principal"
    >
      <!-- Indicador activo: se desliza entre los 4 ítems (solo decorativo). -->
      <div
        class="cliente-bottom-nav__indicador"
        :class="{ 'cliente-bottom-nav__indicador--visible': activeIndex !== null }"
        :style="activeIndex !== null ? { transform: `translateX(${activeIndex * 100}%)` } : null"
        aria-hidden="true"
      />

      <v-btn value="inicio" aria-label="Inicio" @click="irA('/cliente/inicio')">
        <v-icon>mdi-home-variant</v-icon>
        <span>Inicio</span>
      </v-btn>

      <v-btn value="registrar" aria-label="Registrar" @click="sheetRegistrar = true">
        <v-icon>mdi-plus-circle</v-icon>
        <span>Registrar</span>
      </v-btn>

      <v-btn value="mis-numeros" aria-label="Mis números" @click="irA('/cliente/facturacion')">
        <v-icon>mdi-receipt-text-outline</v-icon>
        <span>Mis números</span>
      </v-btn>

      <v-btn value="mas" aria-label="Más opciones" @click="sheetMas = true">
        <v-icon>mdi-menu</v-icon>
        <span>Más</span>
      </v-btn>
    </v-bottom-navigation>

    <!--
      Hoja "Registrar": dos acciones grandes que abren SimpleInvoiceForm desde
      Inicio vía query. CONTRATO (coordinar con el agente de Inicio.vue):
      navega a `/cliente/inicio?registrar=venta` o `?registrar=compra`;
      Inicio.vue debe leer ese query param al montar y abrir SimpleInvoiceForm
      en modo simple con flow=VENTA o flow=COMPRA respectivamente, limpiando
      el query después de abrir el formulario.
    -->
    <HojaInferior v-model="sheetRegistrar" titulo="¿Qué quieres registrar?">
      <div class="d-flex flex-column ga-3">
        <TarjetaAccion
          icono="mdi-cart-outline"
          titulo="Vendí algo"
          color="success"
          @click="registrar('venta')"
        />
        <TarjetaAccion
          icono="mdi-cash-minus"
          titulo="Gasté o compré algo"
          color="primary"
          @click="registrar('compra')"
        />
      </div>
    </HojaInferior>

    <!-- Hoja "Más": resto del menú + tasas del día + ayuda + cerrar sesión. -->
    <HojaInferior v-model="sheetMas" titulo="Más opciones">
      <HojaMas
        :is-services-company="isServicesCompany"
        :bcv-rate="bcvRate"
        :show-usd-rate="showUsdRate"
        :show-eur-rate="showEurRate"
        :show-cny-rate="showCnyRate"
        :show-try-rate="showTryRate"
        :show-rub-rate="showRubRate"
        @navegar="navegarDesdeMas"
        @ayuda="abrirAyuda"
        @logout="logout"
      />
    </HojaInferior>
  </template>
</template>

<script>
import HojaInferior from '@/components/ui/HojaInferior.vue';
import TarjetaAccion from '@/components/ui/TarjetaAccion.vue';
import HojaMas from './HojaMas.vue';

/**
 * ClienteBottomNav — barra de navegación inferior fija, solo para el rol
 * `cliente` en móvil (<600px). Reemplaza el drawer lateral en ese breakpoint
 * (ver MenuLateral.vue, que no se renderiza para cliente+móvil).
 */
export default {
  name: 'ClienteBottomNav',

  components: { HojaInferior, TarjetaAccion, HojaMas },

  props: {
    /** Tasa BCV actual (ver bcvService.getCurrentRate()), cargada por AppShell. */
    bcvRate: { type: Object, default: null },
    showUsdRate: { type: Boolean, default: true },
    showEurRate: { type: Boolean, default: true },
    showCnyRate: { type: Boolean, default: false },
    showTryRate: { type: Boolean, default: false },
    showRubRate: { type: Boolean, default: false },
  },

  data() {
    return {
      currentUserData: null,
      sheetRegistrar: false,
      sheetMas: false,
    };
  },

  computed: {
    currentUser() {
      if (this.currentUserData) return this.currentUserData;
      try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        this.currentUserData = user;
        return user;
      } catch (error) {
        return {};
      }
    },
    isCliente() {
      return this.currentUser?.role === 'cliente';
    },
    isServicesCompany() {
      return this.currentUser?.client?.activity_type === 'services';
    },
    visible() {
      return this.isCliente && this.$vuetify.display.xs;
    },
    activeTab() {
      const path = this.$route?.path || '';
      if (path.startsWith('/cliente/inicio')) return 'inicio';
      if (path.startsWith('/cliente/facturacion')) return 'mis-numeros';
      return null;
    },
    activeIndex() {
      const indices = { inicio: 0, registrar: 1, 'mis-numeros': 2, mas: 3 };
      return this.activeTab !== null ? indices[this.activeTab] ?? null : null;
    },
  },

  mounted() {
    this.loadUser();
    window.addEventListener('storage', this.loadUser);
    window.addEventListener('userUpdated', this.loadUser);
    window.addEventListener('ad-user-updated', this.loadUser);
  },

  beforeUnmount() {
    window.removeEventListener('storage', this.loadUser);
    window.removeEventListener('userUpdated', this.loadUser);
    window.removeEventListener('ad-user-updated', this.loadUser);
  },

  methods: {
    loadUser() {
      try {
        this.currentUserData = JSON.parse(localStorage.getItem('currentUser') || '{}');
      } catch (error) {
        this.currentUserData = {};
      }
    },
    /** Admite un path string ('/cliente/inicio') o un destino de router ({name}), ver HojaMas.vue. */
    async irA(destino) {
      if (typeof destino === 'string' && this.$route?.path === destino) return;
      try {
        await this.$router.push(destino);
      } catch (error) {
        // Navegación duplicada u otro error de router: no es crítico.
      }
    },
    registrar(tipo) {
      this.sheetRegistrar = false;
      this.$router.push({ path: '/cliente/inicio', query: { registrar: tipo } });
    },
    navegarDesdeMas(destino) {
      this.sheetMas = false;
      return this.irA(destino);
    },
    abrirAyuda() {
      this.sheetMas = false;
      // SupportChat.vue escucha este evento para abrirse como panel fullscreen
      // en móvil (su burbuja flotante está oculta ahí, ver SupportChat.vue).
      window.dispatchEvent(new CustomEvent('ad-open-support-chat'));
    },
    async logout() {
      this.sheetMas = false;
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

<style scoped>
.cliente-bottom-nav {
  /* Respeta el área segura inferior (gesto/home-indicator de iOS/Android). */
  padding-bottom: env(safe-area-inset-bottom, 0px);
  height: calc(64px + env(safe-area-inset-bottom, 0px)) !important;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
}

.cliente-bottom-nav :deep(.v-btn) {
  min-width: 0;
  font-size: 0.6875rem;
}

.cliente-bottom-nav :deep(.v-btn__content) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Indicador activo: barra fina que se desliza entre los 4 ítems iguales
   (grow). Puramente decorativo (aria-hidden), no afecta el layout.
   Hallazgo #9 (revisión del shell): sin rebote en el ícono activo — el
   sistema de diseño prohíbe animar accesos repetidos (barra inferior,
   tabs); el indicador se mueve en --ad-move-rapido porque es la posición
   de la selección, no una animación de contenido (ver sistema-diseno.md
   §3.5). */
.cliente-bottom-nav__indicador {
  position: absolute;
  top: 0;
  left: 0;
  width: 25%;
  height: 3px;
  background: var(--color-primary, #8E1818);
  opacity: 0;
  transition: transform var(--ad-move-rapido) var(--ad-move-curva-entrada), opacity var(--ad-move-rapido) var(--ad-move-curva-entrada);
  pointer-events: none;
}

.cliente-bottom-nav__indicador--visible {
  opacity: 1;
}
</style>
