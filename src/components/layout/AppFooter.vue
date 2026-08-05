<template>
  <v-footer
    color="grey-lighten-4"
    class="text-center"
    padless
  >
    <v-card
      flat
      tile
      width="100%"
      class="grey-lighten-4 text-center"
    >
      <v-card-text class="py-2">
        <v-row justify="center" no-gutters>
          <v-col cols="12" md="4" class="mb-2 mb-md-0">
            <div class="text-body-2 d-flex align-center justify-center">
              <v-icon size="small" class="mr-1">mdi-shield-check</v-icon>
              Sistema Seguro y Confiable
            </div>
          </v-col>
          <v-col cols="12" md="4" class="mb-2 mb-md-0">
            <div class="text-body-2 d-flex align-center justify-center">
              <v-icon size="small" class="mr-1">mdi-cloud-check</v-icon>
              Respaldo en la Nube
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-body-2 d-flex align-center justify-center">
              <v-icon size="small" class="mr-1">mdi-headset</v-icon>
              Soporte 24/7
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-text class="py-2 pb-4">
        <div class="text-body-2 mb-2">
          © {{ currentYear }} AD SYSTEM. 
          Todos los derechos reservados.
        </div>
        
        <div class="legal-links d-flex flex-wrap justify-center gap-3">
          <router-link to="/legal?tab=terminos" class="text-caption text-medium-emphasis text-decoration-none hover-primary">
            Términos y Condiciones
          </router-link>
          <span class="text-caption text-medium-emphasis mx-1 hidden-sm-and-down">•</span>
          <router-link to="/legal?tab=privacidad" class="text-caption text-medium-emphasis text-decoration-none hover-primary">
            Política de Privacidad
          </router-link>
          <span class="text-caption text-medium-emphasis mx-1 hidden-sm-and-down">•</span>
          <router-link to="/legal?tab=datos" class="text-caption text-medium-emphasis text-decoration-none hover-primary">
            Tratamiento de Datos
          </router-link>
        </div>
      </v-card-text>
    </v-card>
  </v-footer>
</template>

<script>
export default {
  name: 'AppFooter',
  computed: {
    currentYear() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
.v-footer {
  margin-top: auto;
}

.v-card-text {
  padding: 8px 16px;
}

.gap-3 {
  gap: 12px;
}

.hover-primary:hover {
  color: var(--v-theme-primary) !important;
  text-decoration: underline !important;
}
</style>
