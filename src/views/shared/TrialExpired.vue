<template>
  <v-container fluid class="trial-expired-container fill-height d-flex align-center justify-center bg-grey-lighten-4">
    <v-card class="pa-8 text-center animate-slide-in-up" max-width="500" elevation="4" rounded="xl">
      <div class="mb-6 animate-micro-rotate">
        <img src="/ADSystem/logo.png" alt="AD System" style="max-width: 180px; height: auto; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.1));" />
      </div>

      <v-icon color="#A81C22" size="80" class="mb-4">mdi-clock-alert</v-icon>
      
      <h1 class="text-h4 font-weight-bold mb-3 text-secondary">
        Tu periodo de prueba ha expirado
      </h1>
      
      <p class="text-body-1 text-medium-emphasis mb-6">
        Esperamos que hayas disfrutado de AD System. Para seguir gestionando tu negocio, facturando y manteniendo tu expediente al día, elige uno de nuestros planes.
      </p>

      <v-btn
        color="primary"
        size="x-large"
        block
        rounded="lg"
        elevation="2"
        class="mb-4 font-weight-bold"
        @click="goToPricing"
      >
        <v-icon left class="mr-2">mdi-rocket-launch</v-icon>
        Ver Planes y Precios
      </v-btn>

      <v-btn
        variant="text"
        color="grey-darken-1"
        @click="logout"
      >
        Cerrar Sesión
      </v-btn>
    </v-card>
  </v-container>
</template>

<script>
import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'TrialExpired',
  methods: {
    goToPricing() {
      // Usamos el modo de pricing público
      this.$router.push('/pricing');
    },
    async logout() {
      try {
        await supabase.auth.signOut();
        localStorage.clear();
        this.$router.push('/login');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  }
}
</script>

<style scoped>
.trial-expired-container {
  min-height: 100vh;
}
</style>