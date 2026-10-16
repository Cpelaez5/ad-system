<template>
  <HojaInferior v-model="visible" max-width="440" @update:model-value="alCerrar">
    <div class="text-center py-2" data-testid="solicitud-push">
      <v-avatar color="primary" size="64" class="mb-3">
        <v-icon icon="mdi-bell-ring-outline" size="34" color="white" />
      </v-avatar>
      <h2 class="text-h6 font-weight-bold mb-2">¿Te avisamos cuando pase algo importante?</h2>
      <p class="text-body-1">
        Por ejemplo, cuando el equipo responda tu consulta o se acerque un vencimiento. Aunque tengas la app cerrada.
      </p>
    </div>
    <template #acciones>
      <div class="d-flex flex-column flex-sm-row-reverse ga-2 w-100 pa-2">
        <v-btn color="primary" variant="flat" size="large" class="text-none flex-grow-1" style="min-height:44px" :loading="trabajando" data-testid="push-si" @click="aceptar">
          Sí, avísame
        </v-btn>
        <v-btn variant="text" size="large" class="text-none" style="min-height:44px" :disabled="trabajando" data-testid="push-no" @click="rechazar">
          Ahora no
        </v-btn>
      </div>
    </template>
  </HojaInferior>
</template>

<script>
import HojaInferior from '@/components/ui/HojaInferior.vue'
import { activarPush, debePreguntarAhora, recordarDescarte, sincronizarSilencioso, escucharResuscripcion } from '@/services/pushService.js'

export default {
  name: 'SolicitudPush',
  components: { HojaInferior },
  data() { return { visible: false, trabajando: false, temporizador: null } },
  mounted() {
    escucharResuscripcion()
    sincronizarSilencioso()
    // Espera unos segundos para no tapar la pantalla recién cargada.
    this.temporizador = setTimeout(() => { if (debePreguntarAhora()) this.visible = true }, 4000)
  },
  beforeUnmount() { clearTimeout(this.temporizador) },
  methods: {
    async aceptar() {
      this.trabajando = true
      const r = await activarPush()
      this.trabajando = false
      if (r.permiso === 'default') recordarDescarte()
      this.visible = false
    },
    rechazar() { recordarDescarte(); this.visible = false },
    alCerrar(abierto) { if (!abierto && !this.trabajando) recordarDescarte() },
  },
}
</script>
