<template>
  <div class="hoja-mas">
    <v-list>
      <v-list-item
        v-for="item in itemsMenu"
        :key="item.key"
        :prepend-icon="item.icono"
        :title="item.titulo"
        @click="$emit('navegar', item.to)"
      />

      <v-divider class="my-2" />

      <!-- Tasas del día: solo valores (formatTasa), sin etiquetas largas
           (feedback #2 del shell: en móvil las tasas tapaban el título). -->
      <v-list-subheader>
        {{ tasaInfo?.modo === 'manual' ? 'Tus tasas (manual)' : 'Tasas del día' }}
      </v-list-subheader>
      <v-list-item
        v-if="avisoTasa"
        prepend-icon="mdi-alert-outline"
        :title="avisoTasa"
        class="hoja-mas__aviso-tasa"
        data-testid="hoja-aviso-tasa"
      />
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

      <v-list-item
        prepend-icon="mdi-swap-horizontal"
        title="Cambiar mi tasa"
        data-testid="hoja-cambiar-tasa"
        @click="$emit('navegar', '/cliente/mi-area#tasa')"
      />

      <v-divider class="my-2" />

      <!-- Ayuda: abre el chat de soporte (en móvil la burbuja flotante se
           oculta porque tapaba el botón "Más", ver SupportChat.vue). -->
      <v-list-item
        prepend-icon="mdi-help-circle-outline"
        title="Ayuda"
        :subtitle="noLeidosSoporte ? 'El equipo te respondió' : undefined"
        data-testid="hoja-ayuda"
        @click="$emit('ayuda')"
      >
        <template v-if="noLeidosSoporte" #append>
          <v-badge :content="noLeidosSoporte" color="error" inline />
        </template>
      </v-list-item>
      <v-list-item
        prepend-icon="mdi-book-open-page-variant-outline"
        title="Guías de ayuda"
        data-testid="hoja-guias-ayuda"
        @click="$emit('navegar', '/ayuda')"
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
import { formatFechaCorta } from '@/utils/fechas.js'
import { getMenuClienteMas } from './menuPorRol.js'

/**
 * HojaMas — contenido de la hoja "Más" de la barra inferior del cliente en
 * móvil (ver ClienteBottomNav.vue). Extraído a su propio componente para
 * que sea testeable sin montar toda la barra inferior.
 *
 * Corrección (revisión del shell, hallazgo #8 Importante): antes repetía a
 * mano los 6 ítems del menú del cliente; si cambiaba una ruta, este menú y
 * el del drawer (`MenuLateral.vue`) podían divergir sin que ningún test lo
 * notara. Ahora usa `getMenuClienteMas` (la misma fuente de verdad de
 * `menuPorRol.js`), igual que el docstring de ese archivo siempre dijo que
 * pasaba.
 *
 * No navega ni cierra sesión por sí mismo: emite la intención
 * (`navegar`, `ayuda`, `logout`) y el padre decide (cerrar la hoja, usar el
 * router, etc.), igual que hacía ClienteBottomNav antes de la extracción.
 */
export default {
  name: 'HojaMas',

  props: {
    /** Respuestas del equipo de soporte sin leer. */
    noLeidosSoporte: { type: Number, default: 0 },
    isServicesCompany: { type: Boolean, default: false },
    bcvRate: { type: Object, default: null },
    /** { modo, desactualizada, fallo, fecha } de la tasa vigente (ver AppShell). */
    tasaInfo: { type: Object, default: null },
    showUsdRate: { type: Boolean, default: true },
    showEurRate: { type: Boolean, default: true },
    showCnyRate: { type: Boolean, default: false },
    showTryRate: { type: Boolean, default: false },
    showRubRate: { type: Boolean, default: false },
  },

  emits: ['navegar', 'ayuda', 'logout'],

  computed: {
    itemsMenu() {
      return getMenuClienteMas({ isServicesCompany: this.isServicesCompany })
    },
    avisoTasa() {
      const t = this.tasaInfo
      if (!t) return ''
      if (t.fallo) return 'No pudimos actualizar la tasa del BCV'
      if (t.desactualizada) {
        return t.fecha ? `Tu tasa es del ${formatFechaCorta(t.fecha)}. Actualízala si cambió` : 'Tu tasa está desactualizada'
      }
      return ''
    },
  },

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
