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
          <v-col cols="12" md="4">
            <div class="text-body-2">
              <v-icon size="small" class="mr-1">mdi-shield-check</v-icon>
              Sistema Seguro y Confiable
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-body-2">
              <v-icon size="small" class="mr-1">mdi-cloud-check</v-icon>
              Respaldo en la Nube
            </div>
          </v-col>
          <v-col cols="12" md="4">
            <div class="text-body-2">
              <v-icon size="small" class="mr-1">mdi-headset</v-icon>
              Soporte 24/7
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-text class="py-2">
        <div class="text-body-2">
          © {{ currentYear }} Sistema de Contabilidad, Auditoría, Archivo y Facturación. 
          Todos los derechos reservados.
        </div>
        <div class="text-caption mt-1">
          Desarrollado para facilitar la gestión contable y tributaria
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
</style>
