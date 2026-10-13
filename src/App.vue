<template>
  <v-app>
    
    
    <!-- Sistema de notificaciones -->
    <NotificationSystem ref="notificationSystem" />
    
    <!-- Armazón de la app: app bar + menú lateral + barra inferior del cliente -->
    <AppShell
      v-if="showNavigation"
      @banner-visibility-change="handleBannerVisibility"
    />
    
    <!-- Contenido principal -->
    <v-main>
      <router-view v-slot="{ Component }">
        <PageTransition name="fade" mode="out-in">
          <component :is="Component" />
        </PageTransition>
      </router-view>
    </v-main>
    
    <!-- Chat de soporte IA (visible solo para clientes) -->
    <SupportChat v-if="showNavigation" />
    
    <!-- Banner de Cookies -->
    <CookieConsent />
    
    <!-- Footer -->
    <AppFooter v-if="showFooter" />

    <!-- Snackbar global: avisos no bloqueantes (p.ej. del router guard, errores globales) -->
    <AppSnackbar
      v-model="notificacionStore.visible"
      :type="notificacionStore.tipo"
      :message="notificacionStore.mensaje"
    />
  </v-app>
</template>

<script>
import AppShell from './components/layout/AppShell.vue'
import AppFooter from './components/layout/AppFooter.vue'
import NotificationSystem from './components/common/NotificationSystem.vue'
import PageTransition from './components/common/PageTransition.vue'
import SupportChat from './components/common/SupportChat.vue'
import CookieConsent from './components/common/CookieConsent.vue'
import AppSnackbar from './components/common/AppSnackbar.vue'
import userSettingsService from '@/services/user-settings-service.js'
import { useNotificacionStore } from '@/store/notificacionStore'
// (Se elimina ThemeFavicon para usar solo los <link rel="icon"> de index.html)

export default {
  name: 'App',
  components: {
    AppShell,
    AppFooter,
    NotificationSystem,
    PageTransition,
    SupportChat,
    CookieConsent,
    AppSnackbar
  },
  data() {
    return {
      isBannerVisible: false,
      notificacionStore: useNotificacionStore()
    }
  },
  computed: {
    showNavigation() {
      const publicRoutes = ['LandingPage', 'Login', 'Register', 'Pricing', 'ClienteCheckout', 'Legal'];
      return !publicRoutes.includes(this.$route.name);
    },
    showFooter() {
      const publicRoutes = ['LandingPage', 'Login', 'Register', 'Pricing', 'ClienteCheckout', 'Legal'];
      return publicRoutes.includes(this.$route.name);
    }
  },
  methods: {
    handleBannerVisibility(isVisible) {
      this.isBannerVisible = isVisible;
    },
    applyThemeMode() {
      const settings = userSettingsService.getSettings();
      this.$vuetify.theme.change(settings.forceDarkMode ? 'dark' : 'light');
    },
    onSettingsChanged(event) {
      const settings = event.detail;
      this.$vuetify.theme.change(settings.forceDarkMode ? 'dark' : 'light');
    },
    showSnackbar(message, color = 'info') {
      const notify = this.$refs.notificationSystem;
      if (notify) {
        if (color === 'success') notify.success('Éxito', message);
        else if (color === 'error') notify.error('Error', message);
        else if (color === 'warning') notify.warning('Atención', message);
        else notify.info('Información', message);
      }
    }
  },
  async mounted() {
    // 1. Aplicar tema inmediato desde cache local (sin latencia)
    this.applyThemeMode();
    window.addEventListener('ad-settings-changed', this.onSettingsChanged);

    // 2. Sincronizar con Supabase en background (actualiza theme si difiere)
    try {
      await userSettingsService.loadFromSupabase();
      this.applyThemeMode();
    } catch (e) {
      // Silencioso: cache local ya aplica el tema
    }
  },
  beforeUnmount() {
    window.removeEventListener('ad-settings-changed', this.onSettingsChanged);
  }
}
</script>

<style>
/* Estilos globales - Los estilos principales están en global.css */

/* Estilos para el scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
