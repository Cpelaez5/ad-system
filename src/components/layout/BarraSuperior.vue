<template>
  <v-app-bar color="surface" elevation="0" class="barra-superior border-b">
    <!-- Tablet/móvil (no cliente en xs, que usa la barra inferior): abre el drawer temporal -->
    <v-app-bar-nav-icon v-if="mostrarMenu" aria-label="Abrir menú" @click="$emit('toggle-drawer')" />


    <v-toolbar-title class="barra-superior__titulo">
      <transition name="titulo-fade" mode="out-in">
        <span :key="tituloPagina">{{ tituloPagina }}</span>
      </transition>
    </v-toolbar-title>

    <v-spacer />

    <!-- Tasas: el cliente las toca para el acceso rápido (TasaRapida); los demás roles
         refrescan. Chips solo ≥600px (en móvil viven en la hoja "Más"); el recordatorio
         de tasa manual se ve en todos los tamaños. -->
    <v-menu v-model="menuTasa" :disabled="!esCliente" :close-on-content-click="false" location="bottom end" offset="8">
      <template #activator="{ props: menuProps }">
    <div v-bind="esCliente ? menuProps : {}" class="d-flex align-center ga-2 mr-2">
      <v-chip
        v-if="recordarTasa"
        color="warning"
        variant="flat"
        size="small"
        prepend-icon="mdi-bell-ring-outline"
        class="barra-superior__recordatorio"
        data-testid="recordatorio-tasa"
        @click="monedaTasa = null"
      >
        Actualiza tu tasa
      </v-chip>
    <div class="d-none d-sm-flex align-center ga-2">
      <ChipTasa
        v-if="showUsdRate"
        currency="USD"
        :rate-value="bcvRate?.dollar"
        :loading="bcvLoading"
        :error="bcvError"
        :manual="chipManual"
        :aviso="chipAviso"
        :nota="chipNota"
        @click="alTocarTasa('USD')"
      />
      <ChipTasa
        v-if="showEurRate && !bcvLoading && bcvRate?.euro"
        currency="EUR"
        :rate-value="bcvRate?.euro"
        :error="bcvError"
        :manual="chipManual"
        :aviso="chipAviso"
        :nota="chipNota"
        class="d-none d-md-inline-flex"
        @click="alTocarTasa('EUR')"
      />
      <ChipTasa
        v-if="showCnyRate && !bcvLoading && bcvRate?.yuan"
        currency="CNY"
        :rate-value="bcvRate?.yuan"
        :error="bcvError"
        :manual="chipManual"
        :aviso="chipAviso"
        :nota="chipNota"
        class="d-none d-lg-inline-flex"
        @click="alTocarTasa('CNY')"
      />
      <ChipTasa
        v-if="showTryRate && !bcvLoading && bcvRate?.lira"
        currency="TRY"
        :rate-value="bcvRate?.lira"
        :error="bcvError"
        :manual="chipManual"
        :aviso="chipAviso"
        :nota="chipNota"
        class="d-none d-lg-inline-flex"
        @click="alTocarTasa('TRY')"
      />
      <ChipTasa
        v-if="showRubRate && !bcvLoading && bcvRate?.rublo"
        currency="RUB"
        :rate-value="bcvRate?.rublo"
        :error="bcvError"
        :manual="chipManual"
        :aviso="chipAviso"
        :nota="chipNota"
        class="d-none d-lg-inline-flex"
        @click="alTocarTasa('RUB')"
      />
    </div>
    </div>
      </template>
      <TasaRapida v-if="menuTasa" :moneda="monedaTasa" @cerrar="menuTasa = false" />
    </v-menu>

    <MenuUsuario
      :current-user="currentUser"
      :user-plan="userPlan"
      :is-client-profile-incomplete="isClientProfileIncomplete"
    />
  </v-app-bar>
</template>

<script>
import ChipTasa from '@/components/ui/ChipTasa.vue'
import TasaRapida from '@/components/cliente/TasaRapida.vue'
import { necesitaRecordatorio } from '@/services/tasaService.js'
import MenuUsuario from './MenuUsuario.vue'
import { formatFechaCorta } from '@/utils/fechas.js'

/**
 * BarraSuperior — app bar del shell. En móvil (<600px) muestra solo el
 * título de la vista actual + el menú de usuario (sin tasas, que se mudan a
 * la hoja "Más"); en tablet/móvil no-cliente agrega el botón de menú para
 * el drawer temporal. En escritorio el modo del menú (fijo/recogido) se
 * cambia con el pin del propio MenuLateral.
 */
export default {
  name: 'BarraSuperior',

  components: { ChipTasa, MenuUsuario, TasaRapida },

  data() {
    return { menuTasa: false, monedaTasa: null }
  },

  props: {
    tituloPagina: { type: String, default: 'Sistema Contable' },
    mostrarMenu: { type: Boolean, default: false },
    bcvRate: { type: Object, default: null },
    bcvLoading: { type: Boolean, default: false },
    bcvError: { type: Boolean, default: false },
    showUsdRate: { type: Boolean, default: true },
    showEurRate: { type: Boolean, default: true },
    showCnyRate: { type: Boolean, default: false },
    showTryRate: { type: Boolean, default: false },
    showRubRate: { type: Boolean, default: false },
    currentUser: { type: Object, default: () => ({}) },
    userPlan: { type: String, default: null },
    isClientProfileIncomplete: { type: Boolean, default: false },
    /** { modo, desactualizada, fallo, fecha } de la tasa vigente (ver tasaService.tasasVigentes). */
    tasaInfo: { type: Object, default: null },
  },

  emits: ['toggle-drawer', 'refresh-bcv'],

  computed: {
    esCliente() {
      return this.currentUser?.role === 'cliente'
    },
    /** De lunes a viernes, en modo manual, si la tasa no es de hoy. */
    recordarTasa() {
      return this.esCliente && necesitaRecordatorio(this.tasaInfo)
    },
    chipManual() {
      return this.tasaInfo?.modo === 'manual'
    },
    chipAviso() {
      return !!(this.tasaInfo && (this.tasaInfo.desactualizada || this.tasaInfo.fallo))
    },
    chipNota() {
      const t = this.tasaInfo
      if (!t) return ''
      if (t.fallo) return 'No pudimos actualizar la tasa del BCV: es la última que conocemos'
      if (t.desactualizada && t.fecha) return `Es del ${formatFechaCorta(t.fecha)}. Actualízala si cambió`
      if (t.desactualizada) return 'Está desactualizada'
      return ''
    },
  },

  methods: {
    /** El cliente abre el acceso rápido (lo maneja el v-menu); el resto de roles refresca la tasa. */
    alTocarTasa(moneda = null) {
      if (this.esCliente) {
        this.monedaTasa = moneda
        return
      }
      this.$emit('refresh-bcv')
    },
  },
}
</script>

<style scoped>
.barra-superior {
  z-index: 1000 !important;
}

.barra-superior__recordatorio {
  cursor: pointer;
  font-weight: 600;
}

.barra-superior__titulo {
  font-size: 1.5rem;
  font-weight: 800;
}

@media (max-width: 599px) {
  .barra-superior__titulo {
    font-size: 1.1rem;
  }
}

/* Crossfade del título al cambiar de ruta: solo opacidad (GPU-cheap), corto. */
.titulo-fade-enter-active,
.titulo-fade-leave-active {
  transition: opacity var(--ad-move-rapido) var(--ad-move-curva-entrada);
}

.titulo-fade-enter-from,
.titulo-fade-leave-to {
  opacity: 0;
}
</style>
