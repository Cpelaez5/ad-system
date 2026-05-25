<template>
  <v-app>
    
    
    <!-- Sistema de notificaciones -->
    <NotificationSystem />
    
    <!-- Barra de navegación principal -->
    <AppNavigation 
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
    
    <!-- Footer -->
    <!-- <AppFooter /> -->
  </v-app>
</template>

<script>
import AppNavigation from './components/layout/AppNavigation.vue'
import AppFooter from './components/layout/AppFooter.vue'
import NotificationSystem from './components/common/NotificationSystem.vue'
import PageTransition from './components/common/PageTransition.vue'
import userSettingsService from '@/services/user-settings-service.js'
// (Se elimina ThemeFavicon para usar solo los <link rel="icon"> de index.html)

export default {
  name: 'App',
  components: {
    AppNavigation,
    AppFooter,
    NotificationSystem,
    PageTransition
  },
  data() {
    return {
      isBannerVisible: false
    }
  },
  computed: {
    showNavigation() {
      const publicRoutes = ['LandingPage', 'Login', 'Register', 'Pricing'];
      return !publicRoutes.includes(this.$route.name);
    }
  },
  methods: {
    handleBannerVisibility(isVisible) {
      this.isBannerVisible = isVisible;
    },
    applyThemeMode() {
      const settings = userSettingsService.getSettings();
      this.$vuetify.theme.global.name = settings.forceDarkMode ? 'dark' : 'light';
    },
    onSettingsChanged(event) {
      const settings = event.detail;
      this.$vuetify.theme.global.name = settings.forceDarkMode ? 'dark' : 'light';
    }
  },
  mounted() {
    this.applyThemeMode();
    window.addEventListener('ad-settings-changed', this.onSettingsChanged);
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
