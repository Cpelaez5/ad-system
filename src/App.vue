<template>
  <v-app>
    <!-- Sistema de notificaciones -->
    <NotificationSystem />
    
    <!-- Barra de navegación principal -->
    <AppNavigation />
    
    <!-- Contenido principal -->
    <v-main>
      <PageTransition name="fade" mode="out-in">
        <router-view />
      </PageTransition>
    </v-main>
    
    <!-- Footer -->
    <AppFooter />
  </v-app>
</template>

<script>
import AppNavigation from './components/layout/AppNavigation.vue'
import AppFooter from './components/layout/AppFooter.vue'
import NotificationSystem from './components/common/NotificationSystem.vue'
import PageTransition from './components/common/PageTransition.vue'

export default {
  name: 'App',
  components: {
    AppNavigation,
    AppFooter,
    NotificationSystem,
    PageTransition
  }
}
</script>

<style>
/* Estilos globales */
html, body {
  margin: 0;
  padding: 0;
  font-family: 'Roboto', sans-serif;
}

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
