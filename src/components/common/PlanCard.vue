<template>
  <v-card
    class="plan-card d-flex flex-column h-100"
    :class="{ 'plan-card--destacado': isFeatured }"
    variant="outlined"
    rounded="xl"
    :elevation="isFeatured ? 3 : 0"
  >
    <!-- Estado de la tarjeta: una sola etiqueta a la vez, en tono semántico
         (nunca dorado/azul decorativo — ver reglas del patrón cliente). -->
    <div v-if="estado" class="plan-card__estado">
      <v-chip size="small" :color="estado.color" variant="tonal" :prepend-icon="estado.icono" class="font-weight-bold">
        {{ estado.texto }}
      </v-chip>
    </div>

    <!-- Encabezado del plan -->
    <div class="plan-card__encabezado text-center">
      <h3 class="text-h5 font-weight-bold mb-1">{{ plan.name }}</h3>
      <p class="text-body-2 text-medium-emphasis mb-0">{{ plan.description }}</p>
    </div>

    <!-- Precio -->
    <div class="plan-card__precio text-center py-5">
      <div class="d-flex justify-center align-baseline mb-2">
        <span class="text-h3 font-weight-black" :class="isFeatured ? 'text-primary' : 'text-high-emphasis'">
          {{ precioTexto }}
        </span>
        <span class="text-body-2 text-medium-emphasis ml-1">/ {{ billingPeriod === 'annual' ? 'año' : 'mes' }}</span>
      </div>
      <span class="text-caption text-medium-emphasis">
        {{ billingPeriod === 'annual' ? 'Facturado anualmente' : 'Facturado mes a mes' }}
      </span>
    </div>

    <v-divider class="mx-6"></v-divider>

    <!-- Lista de características -->
    <div class="plan-card__caracteristicas flex-grow-1 px-6 py-5">
      <div
        v-for="(feature, i) in features"
        :key="i"
        class="d-flex align-center mb-3"
      >
        <v-icon icon="mdi-check-circle" color="primary" size="18" class="mr-3 flex-shrink-0" />
        <span class="text-body-2">{{ feature }}</span>
      </div>
    </div>

    <!-- Botón de acción -->
    <div class="px-6 pb-6 pt-2">
      <v-btn
        block
        size="large"
        rounded="lg"
        :color="btnColor"
        :variant="btnVariant"
        :loading="loading"
        :disabled="isCurrent || isPending"
        @click="$emit('select', plan)"
        class="font-weight-bold text-none plan-card__boton"
      >
        <v-icon v-if="isCurrent" start size="18">mdi-check-circle</v-icon>
        {{ buttonText }}
      </v-btn>
    </div>
  </v-card>
</template>

<script>
import { formatMoney } from '@/utils/formatMoney';

export default {
  name: 'PlanCard',
  props: {
    plan: { type: Object, required: true },
    billingPeriod: { type: String, default: 'monthly' },
    isCurrent: { type: Boolean, default: false },
    isPending: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  emits: ['select'],
  computed: {
    isFeatured() {
      return this.plan.name === 'AD Visionary';
    },
    currentPrice() {
      return this.billingPeriod === 'annual' ? this.plan.price_annual : this.plan.price_monthly;
    },
    // Precio fijo con formato venezolano (antes AnimatedNumber recibía texto y podía quedar en $0)
    precioTexto() {
      return formatMoney(Number(this.currentPrice), 'USD');
    },
    features() {
      if (Array.isArray(this.plan.features)) return this.plan.features;
      if (typeof this.plan.features === 'string') {
        try { return JSON.parse(this.plan.features); } catch { return []; }
      }
      return [];
    },
    // Una sola etiqueta de estado (nunca dos a la vez): actual > pendiente > recomendado.
    estado() {
      if (this.isCurrent) return { texto: 'Tu plan actual', color: 'success', icono: 'mdi-check-circle' };
      if (this.isPending) return { texto: 'Pago en revisión', color: 'warning', icono: 'mdi-clock-outline' };
      if (this.isFeatured) return { texto: 'Recomendado', color: 'primary', icono: 'mdi-star-outline' };
      return null;
    },
    btnColor() {
      if (this.isCurrent) return 'success';
      if (this.isPending) return 'warning';
      return 'primary';
    },
    btnVariant() {
      if (this.isCurrent || this.isPending) return 'tonal';
      return 'flat';
    },
    buttonText() {
      if (this.isCurrent) return 'Tu plan actual';
      if (this.isPending) return 'Pago en revisión';
      return 'Elegir este plan';
    }
  }
}
</script>

<style scoped>
.plan-card {
  position: relative;
  transition: transform var(--ad-move-rapido, 180ms) ease-out, box-shadow var(--ad-move-rapido, 180ms) ease-out;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1) !important;
}

/* Destacado = borde granate (reemplaza el azul/dorado de antes). */
.plan-card--destacado {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}

.plan-card__estado {
  padding: 16px 16px 0;
}

.plan-card__encabezado {
  padding: 20px 24px 0;
}

@media (prefers-reduced-motion: reduce) {
  .plan-card,
  .plan-card:hover {
    transition: none;
    transform: none;
  }
}
</style>
