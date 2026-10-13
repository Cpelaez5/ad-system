<template>
  <div class="hoja-mas">
    <v-list>
      <v-list-item
        prepend-icon="mdi-file-certificate-outline"
        title="Mis papeles"
        @click="$emit('navegar', '/cliente/fiscal-360')"
      />
      <v-list-item
        v-if="!isServicesCompany"
        prepend-icon="mdi-package-variant-closed"
        title="Mi mercancía"
        @click="$emit('navegar', '/cliente/inventario')"
      />
      <v-list-item
        prepend-icon="mdi-truck-delivery-outline"
        title="Mis proveedores"
        @click="$emit('navegar', '/cliente/proveedores')"
      />
      <v-list-item
        prepend-icon="mdi-domain"
        title="Mi negocio"
        @click="$emit('navegar', '/cliente/mi-area')"
      />
      <v-list-item
        prepend-icon="mdi-crown-outline"
        title="Mi plan"
        @click="$emit('navegar', '/cliente/planes')"
      />
      <v-list-item
        prepend-icon="mdi-chart-line"
        title="¿Cómo voy?"
        @click="$emit('navegar', '/cliente/dashboard')"
      />

      <v-divider class="my-2" />

      <!-- Tasas del día: solo valores (formatTasa), sin etiquetas largas
           (feedback #2 del shell: en móvil las tasas tapaban el título). -->
      <v-list-subheader>Tasas del día</v-list-subheader>
      <v-list-item v-if="showUsdRate" title="Dólar">
        <template #prepend>
          <v-icon size="20">mdi-currency-usd</v-icon>
        </template>
        <template #append>
          <span class="hoja-mas__tasa-valor">{{ formatTasa(bcvRate?.dollar) }}</span>
        </template>
      </v-list-item>
      <v-list-item v-if="showEurRate && bcvRate?.euro" title="Euro">
        <template #prepend>
          <v-icon size="20">mdi-currency-eur</v-icon>
        </template>
        <template #append>
          <span class="hoja-mas__tasa-valor">{{ formatTasa(bcvRate?.euro) }}</span>
        </template>
      </v-list-item>
      <v-list-item v-if="showCnyRate && bcvRate?.yuan" title="Yuan">
        <template #prepend>
          <v-icon size="20">mdi-currency-cny</v-icon>
        </template>
        <template #append>
          <span class="hoja-mas__tasa-valor">{{ formatTasa(bcvRate?.yuan) }}</span>
        </template>
      </v-list-item>
      <v-list-item v-if="showTryRate && bcvRate?.lira" title="Lira">
        <template #prepend>
          <v-icon size="20">mdi-currency-try</v-icon>
        </template>
        <template #append>
          <span class="hoja-mas__tasa-valor">{{ formatTasa(bcvRate?.lira) }}</span>
        </template>
      </v-list-item>
      <v-list-item v-if="showRubRate && bcvRate?.rublo" title="Rublo">
        <template #prepend>
          <v-icon size="20">mdi-currency-rub</v-icon>
        </template>
        <template #append>
          <span class="hoja-mas__tasa-valor">{{ formatTasa(bcvRate?.rublo) }}</span>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <!-- Ayuda: abre el chat de soporte (en móvil la burbuja flotante se
           oculta porque tapaba el botón "Más", ver SupportChat.vue). -->
      <v-list-item
        prepend-icon="mdi-help-circle-outline"
        title="Ayuda"
        @click="$emit('ayuda')"
      />

      <v-divider class="my-2" />
      <v-list-item
        prepend-icon="mdi-logout"
        title="Cerrar sesión"
        @click="$emit('logout')"
      />
    </v-list>
  </div>
</template>

<script>
import { formatTasa } from '@/utils/formatMoney.js'

/**
 * HojaMas — contenido de la hoja "Más" de la barra inferior del cliente en
 * móvil (ver ClienteBottomNav.vue). Extraído a su propio componente para
 * que sea testeable sin montar toda la barra inferior.
 *
 * No navega ni cierra sesión por sí mismo: emite la intención
 * (`navegar`, `ayuda`, `logout`) y el padre decide (cerrar la hoja, usar el
 * router, etc.), igual que hacía ClienteBottomNav antes de la extracción.
 */
export default {
  name: 'HojaMas',

  props: {
    isServicesCompany: { type: Boolean, default: false },
    bcvRate: { type: Object, default: null },
    showUsdRate: { type: Boolean, default: true },
    showEurRate: { type: Boolean, default: true },
    showCnyRate: { type: Boolean, default: false },
    showTryRate: { type: Boolean, default: false },
    showRubRate: { type: Boolean, default: false },
  },

  emits: ['navegar', 'ayuda', 'logout'],

  methods: {
    formatTasa,
  },
}
</script>

<style scoped>
.hoja-mas__tasa-valor {
  font-family: 'Roboto Mono', monospace;
  font-weight: 700;
  font-size: 0.9rem;
}
</style>
