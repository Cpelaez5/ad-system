<template>
  <v-snackbar
    v-model="showBanner"
    timeout="-1"
    color="white"
    elevation="24"
    location="bottom center"
    rounded="xl"
    class="cookie-banner"
    :max-width="$vuetify.display.mobile ? '100%' : '600px'"
  >
    <div class="d-flex flex-column gap-3 w-100 pa-2">
      <div class="d-flex align-center gap-3">
        <v-avatar color="primary" variant="tonal" size="48">
          <v-icon icon="mdi-cookie" size="28"></v-icon>
        </v-avatar>
        <div>
          <h3 class="text-subtitle-1 font-weight-bold text-primary mb-1">Valoramos tu privacidad</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Usamos cookies y herramientas de análisis (como Google Analytics y Meta Pixel) para mejorar tu experiencia y entender cómo interactúas con nuestra plataforma. 
            <router-link to="/legal?tab=privacidad" class="text-primary text-decoration-none font-weight-medium">Saber más</router-link>.
          </p>
        </div>
      </div>
      
      <div class="d-flex flex-column flex-sm-row justify-end gap-2 mt-2">
        <v-btn
          variant="text"
          color="grey-darken-1"
          rounded="pill"
          @click="rejectCookies"
          :block="$vuetify.display.mobile"
        >
          Rechazar
        </v-btn>
        <v-btn
          variant="elevated"
          color="primary"
          rounded="pill"
          @click="acceptCookies"
          :block="$vuetify.display.mobile"
          class="px-6"
        >
          Aceptar Todo
        </v-btn>
      </div>
    </div>
  </v-snackbar>
</template>

<script>
export default {
  name: 'CookieConsent',
  data() {
    return {
      showBanner: false
    }
  },
  mounted() {
    // Revisar si ya hay una preferencia guardada
    const cookiePreference = localStorage.getItem('ad_cookie_consent');
    if (!cookiePreference) {
      // Mostrar con un pequeño retraso para que no sea agresivo
      setTimeout(() => {
        this.showBanner = true;
      }, 1500);
    } else if (cookiePreference === 'accepted') {
      this.initTracking();
    }
  },
  methods: {
    acceptCookies() {
      localStorage.setItem('ad_cookie_consent', 'accepted');
      this.showBanner = false;
      this.initTracking();
    },
    rejectCookies() {
      localStorage.setItem('ad_cookie_consent', 'rejected');
      this.showBanner = false;
      // No iniciar tracking
    },
    initTracking() {
      // Aquí se inicializarían los scripts reales de Analytics o Pixel
      // Ejemplo simulado:
      console.log('Tracking analytics initialized.');
      // window.gtag('config', 'G-XXXXXXX');
      // window.fbq('track', 'PageView');
    }
  }
}
</script>

<style scoped>
.cookie-banner {
  margin-bottom: 16px;
}
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>
