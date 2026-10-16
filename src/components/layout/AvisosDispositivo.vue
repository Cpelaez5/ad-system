<template>
  <v-card class="settings-card" rounded="xl" elevation="0" data-testid="avisos-dispositivo">
    <div class="settings-card-header">
      <v-icon color="white" class="mr-2">mdi-bell-outline</v-icon>
      <span>Avisos en este dispositivo</span>
    </div>
    <v-card-text class="pa-6">
      <div class="d-flex align-center justify-space-between ga-3">
        <div>
          <div class="text-body-1 font-weight-medium">Recibir avisos</div>
          <div class="text-body-2 text-medium-emphasis">{{ textoEstado }}</div>
        </div>
        <v-switch
          :model-value="activo"
          :disabled="!puedeCambiar || cargando"
          :loading="cargando"
          color="primary" hide-details inset
          aria-label="Recibir avisos en este dispositivo"
          data-testid="switch-avisos"
          @update:model-value="cambiar"
        />
      </div>
      <v-alert v-if="estado.situacion === 'bloqueado'" type="info" variant="tonal" class="mt-4" density="comfortable">
        Bloqueaste los avisos para esta página. Para activarlos, toca el candado junto a la dirección del navegador,
        entra en "Permisos" o "Configuración del sitio", y cambia "Notificaciones" a "Permitir". Luego vuelve aquí.
      </v-alert>
      <v-alert v-else-if="estado.situacion === 'ios_sin_instalar'" type="info" variant="tonal" class="mt-4" density="comfortable">
        En iPhone, primero agrega AD System a tu pantalla de inicio: toca el botón Compartir, luego "Agregar a pantalla de inicio", y abre la app desde ese ícono.
      </v-alert>
      <v-alert v-else-if="estado.situacion === 'no_soportado'" type="info" variant="tonal" class="mt-4" density="comfortable">
        Este navegador no permite avisos. Prueba con Chrome, Edge o Firefox actualizado.
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script>
import { estadoPush, activarPush, desactivarPush } from '@/services/pushService.js'

export default {
  name: 'AvisosDispositivo',
  data() { return { estado: { situacion: 'inactivo' }, cargando: false } },
  computed: {
    activo() { return this.estado.situacion === 'activo' },
    puedeCambiar() { return ['activo', 'inactivo'].includes(this.estado.situacion) },
    textoEstado() {
      return {
        activo: 'Activados: te avisamos aunque tengas la app cerrada.',
        inactivo: 'Desactivados en este dispositivo.',
        bloqueado: 'Bloqueados en el navegador.',
        ios_sin_instalar: 'Disponibles al agregar la app a tu pantalla de inicio.',
        no_soportado: 'No disponibles en este navegador.',
      }[this.estado.situacion]
    },
  },
  async mounted() { this.estado = await estadoPush() },
  methods: {
    async cambiar(valor) {
      this.cargando = true
      if (valor) await activarPush(); else await desactivarPush()
      this.estado = await estadoPush()
      this.cargando = false
    },
  },
}
</script>
