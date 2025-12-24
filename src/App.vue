<template>
  <v-app>
    
    <!-- Trial Banner - Fixed at top -->
    <TrialBanner v-if="showNavigation" />
    
    <!-- Sistema de notificaciones -->
    <NotificationSystem />
    
    <!-- Barra de navegación principal -->
    <AppNavigation v-if="showNavigation" />
    
    <!-- Contenido principal -->
    <v-main :style="mainContentStyle">
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
import TrialBanner from './components/layout/TrialBanner.vue'
import AppFooter from './components/layout/AppFooter.vue'
import NotificationSystem from './components/common/NotificationSystem.vue'
import PageTransition from './components/common/PageTransition.vue'
// (Se elimina ThemeFavicon para usar solo los <link rel="icon"> de index.html)

export default {
  name: 'App',
  components: {
    AppNavigation,
    TrialBanner,
    AppFooter,
    NotificationSystem,
    PageTransition
  },
  computed: {
    showNavigation() {
      const publicRoutes = ['LandingPage', 'Login', 'Register', 'Pricing'];
      return !publicRoutes.includes(this.$route.name);
    },
    mainContentStyle() {
      // Add padding-top when banner is visible to prevent content overlap
      // The banner checks this internally, so we just provide extra space
      return {
        'padding-top': '0px' // Banner is fixed, v-main handles its own padding
      };
    }
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
