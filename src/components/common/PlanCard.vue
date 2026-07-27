<template>
  <v-card
    class="plan-card d-flex flex-column h-100"
    :class="cardClasses"
    :style="cardStyle"
    rounded="xl"
    :elevation="isFeatured ? 8 : 1"
  >
    <!-- Badge superior -->
    <div v-if="isFeatured" class="featured-ribbon">
      <span>⭐ Recomendado</span>
    </div>

    <div v-if="isCurrent" class="current-ribbon">
      <v-icon size="14" class="mr-1">mdi-check-circle</v-icon>
      <span>Tu plan actual</span>
    </div>

    <div v-if="isPending" class="pending-ribbon">
      <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
      <span>Pago en revisión</span>
    </div>

    <!-- Encabezado del plan -->
    <div class="plan-header text-center" :style="headerStyle">
      <h3 class="text-h5 font-weight-bold mb-1">{{ plan.name }}</h3>
      <p class="text-body-2 opacity-80 mb-0">{{ plan.description }}</p>
    </div>

    <!-- Precio -->
    <div class="plan-pricing text-center py-5">
      <div class="d-flex justify-center align-baseline mb-2">
        <span class="text-h3 font-weight-black" :style="{ color: priceColor }">
          $<AnimatedNumber :value="currentPrice" locale="en-US" :minimum-fraction-digits="2" :maximum-fraction-digits="2" />
        </span>
        <span class="text-body-2 text-medium-emphasis ml-1">/ mes</span>
      </div>
      <span class="text-caption" :class="isFeatured || isEnterprise ? 'text-white-50' : 'text-medium-emphasis'">
        {{ billingPeriod === 'annual' ? 'Facturado anualmente' : 'Facturado mes a mes' }}
      </span>
    </div>

    <v-divider class="mx-6"></v-divider>

    <!-- Lista de características -->
    <div class="plan-features flex-grow-1 px-6 py-5">
      <div
        v-for="(feature, i) in features"
        :key="i"
        class="d-flex align-center mb-3"
      >
        <v-icon color="#E0B04F" size="18" class="mr-3 flex-shrink-0">mdi-check-circle</v-icon>
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
        :style="isCurrent ? 'pointer-events: none; opacity: 1;' : ''"
        @click="$emit('select', plan)"
        :class="['font-weight-bold text-none plan-btn', { 'text-white': isCurrent }]"
        :elevation="isCurrent ? 0 : 3"
      >
        <v-icon v-if="isCurrent" start size="18">mdi-check-circle</v-icon>
        {{ buttonText }}
      </v-btn>
    </div>
  </v-card>
</template>

<script>
import AnimatedNumber from '@/components/common/AnimatedNumber.vue';

export default {
  components: { AnimatedNumber },
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
    isEnterprise() {
      return this.plan.name === 'AD Corporate Nexus';
    },
    currentPrice() {
      return this.billingPeriod === 'annual' ? this.plan.price_annual : this.plan.price_monthly;
    },
    features() {
      if (Array.isArray(this.plan.features)) return this.plan.features;
      if (typeof this.plan.features === 'string') {
        try { return JSON.parse(this.plan.features); } catch { return []; }
      }
      return [];
    },
    // Estilos dinámicos basados en tipo de plan
    cardClasses() {
      return {
        'plan-card--featured': this.isFeatured,
        'plan-card--active': this.isCurrent || this.isPending,
        'plan-card--enterprise': this.isEnterprise
      };
    },
    cardStyle() {
      if (this.isFeatured) {
        return {
          border: '2px solid #1F355C',
          background: '#1F355C',
          color: '#ffffff'
        };
      }
      if (this.isEnterprise) {
        return {
          border: '2px solid #02254d',
          background: '#02254d',
          color: '#ffffff'
        };
      }
      return { 
        border: '1px solid #e0e0e0',
        background: '#efefef',
        color: '#02254d'
      };
    },
    headerStyle() {
      return { background: 'transparent', color: 'inherit' };
    },
    priceColor() {
      if (this.isFeatured) return '#ffffff';
      if (this.isEnterprise) return '#ffffff';
      return '#02254d';
    },
    btnColor() {
      if (this.isCurrent) return '#4CAF50';
      if (this.isPending) return '#FF9800'; // Orange for pending
      if (this.isFeatured) return '#E0B04F'; // Gold button for Featured
      if (this.isEnterprise) return '#ffffff'; // White button for Enterprise
      return '#1F355C'; // Dark Blue button for Basic
    },
    btnVariant() {
      if (this.isCurrent) return 'flat';
      if (this.isPending) return 'tonal';
      if (this.isEnterprise) return 'outlined';
      return 'flat';
    },
    buttonText() {
      if (this.isCurrent) return 'Plan Actual';
      if (this.isPending) return 'En Revisión (Pendiente)';
      return 'Elegir Este Plan';
    }
  }
}
</script>

<style scoped>
.plan-card {
  overflow: hidden;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.plan-card:hover:not(.plan-card--active) {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12) !important;
}

.plan-card--featured {
  transform: scale(1.03);
}

.plan-card--featured:hover {
  transform: scale(1.03) translateY(-6px);
}

/* Header con color de marca */
.plan-header {
  padding: 28px 24px 20px;
  border-radius: 16px 16px 0 0;
}

/* Ribbons */
.featured-ribbon {
  position: absolute;
  top: 14px;
  right: -1px;
  z-index: 2;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 14px 4px 12px;
  border-radius: 20px 0 0 20px;
  background: #E0B04F;
  color: #1F355C;
}

.current-ribbon {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #4CAF50;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.pending-ribbon {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #FF9800;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Botón */
.plan-btn {
  letter-spacing: 0.5px;
  transition: transform 0.2s ease;
}

.plan-btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.text-white-50 {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
