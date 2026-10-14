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

    <!-- Tasas: chips compactos sin etiqueta larga, solo ≥600px (en móvil viven
         en la hoja "Más" → sección "Tasas del día", ver HojaMas.vue) -->
    <div class="d-none d-sm-flex align-center ga-2 mr-2">
      <ChipTasa
        v-if="showUsdRate"
        currency="USD"
        :rate-value="bcvRate?.dollar"
        :loading="bcvLoading"
        :error="bcvError"
        @click="$emit('refresh-bcv')"
      />
      <ChipTasa
        v-if="showEurRate && !bcvLoading && bcvRate?.euro"
        currency="EUR"
        :rate-value="bcvRate?.euro"
        :error="bcvError"
        class="d-none d-md-inline-flex"
        @click="$emit('refresh-bcv')"
      />
      <ChipTasa
        v-if="showCnyRate && !bcvLoading && bcvRate?.yuan"
        currency="CNY"
        :rate-value="bcvRate?.yuan"
        :error="bcvError"
        class="d-none d-lg-inline-flex"
        @click="$emit('refresh-bcv')"
      />
      <ChipTasa
        v-if="showTryRate && !bcvLoading && bcvRate?.lira"
        currency="TRY"
        :rate-value="bcvRate?.lira"
        :error="bcvError"
        class="d-none d-lg-inline-flex"
        @click="$emit('refresh-bcv')"
      />
      <ChipTasa
        v-if="showRubRate && !bcvLoading && bcvRate?.rublo"
        currency="RUB"
        :rate-value="bcvRate?.rublo"
        :error="bcvError"
        class="d-none d-lg-inline-flex"
        @click="$emit('refresh-bcv')"
      />
    </div>

    <MenuUsuario
      :current-user="currentUser"
      :user-plan="userPlan"
      :is-client-profile-incomplete="isClientProfileIncomplete"
    />
  </v-app-bar>
</template>

<script>
import ChipTasa from '@/components/ui/ChipTasa.vue'
import MenuUsuario from './MenuUsuario.vue'

/**
 * BarraSuperior — app bar del shell. En móvil (<600px) muestra solo el
 * título de la vista actual + el menú de usuario (sin tasas, que se mudan a
 * la hoja "Más"); en tablet/móvil no-cliente agrega el botón de menú para
 * el drawer temporal. En escritorio el modo del menú (fijo/recogido) se
 * cambia con el pin del propio MenuLateral.
 */
export default {
  name: 'BarraSuperior',

  components: { ChipTasa, MenuUsuario },

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
  },

  emits: ['toggle-drawer', 'refresh-bcv'],
}
</script>

<style scoped>
.barra-superior {
  z-index: 1000 !important;
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
