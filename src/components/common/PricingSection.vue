<template>
  <div class="pricing-section w-100">
    <v-container>
      <!-- Header compacto (Opcional, se puede ocultar con props) -->
      <div v-if="showHeader" class="d-flex flex-column flex-md-row align-center justify-space-between mb-8">
        <div class="mb-4 mb-md-0 text-md-left text-center">
          <h2 class="text-h4 font-weight-bold text-secondary mb-2">
            {{ title }}
          </h2>
          <p class="text-body-1 text-medium-emphasis mb-0">
            {{ subtitle }}
          </p>
        </div>

        <!-- Selector de periodo -->
        <div class="d-inline-flex align-center period-toggle rounded-pill pa-1 mt-4 mt-md-0" style="background: #efefef; border: 1px solid #e0e0e0;">
          <button
            class="period-btn rounded-pill px-6 py-2 text-body-2 font-weight-medium transition-all"
            :class="{ 'period-btn--active': billingPeriod === 'monthly' }"
            @click="billingPeriod = 'monthly'"
          >
            Mensual
          </button>
          <button
            class="period-btn rounded-pill px-6 py-2 text-body-2 font-weight-medium transition-all"
            :class="{ 'period-btn--active': billingPeriod === 'annual' }"
            @click="billingPeriod = 'annual'"
          >
            Anual
            <v-chip color="#E0B04F" size="x-small" class="ml-1 font-weight-bold" variant="flat" text-color="white">-17%</v-chip>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="secondary" size="48"></v-progress-circular>
      </div>

      <!-- Plan Cards Grid -->
      <v-row v-else justify="center" align="stretch">
        <v-col
          v-for="plan in plans"
          :key="plan.id"
          cols="12"
          sm="8"
          md="4"
        >
          <PlanCard
            :plan="plan"
            :billing-period="billingPeriod"
            :is-current="currentPlanId === plan.id"
            :loading="processingPlanId === plan.id"
            @select="$emit('select-plan', plan, billingPeriod)"
          />
        </v-col>
      </v-row>

      <!-- FAQ Section -->
      <div v-if="showFaqs" class="faq-section mt-16 pt-16 border-top">
        <h2 class="text-h4 font-weight-bold text-center mb-12">Preguntas Frecuentes</h2>
        <v-row justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-expansion-panels variant="accordion">
              <v-expansion-panel
                v-for="(faq, i) in faqs"
                :key="i"
                :title="faq.q"
                :text="faq.a"
                class="mb-2 rounded-lg"
                elevation="1"
              ></v-expansion-panel>
            </v-expansion-panels>
          </v-col>
        </v-row>
      </div>
    </v-container>
  </div>
</template>

<script>
import PlanCard from '@/components/common/PlanCard.vue';
import plansService from '@/services/plansService';

export default {
  name: 'PricingSection',
  components: { PlanCard },
  props: {
    showHeader: { type: Boolean, default: true },
    title: { type: String, default: 'Planes y Precios' },
    subtitle: { type: String, default: 'Escala tus operaciones con el plan ideal para tu negocio.' },
    currentPlanId: { type: String, default: null },
    processingPlanId: { type: String, default: null },
    initialBillingPeriod: { type: String, default: 'monthly' },
    showFaqs: { type: Boolean, default: true }
  },
  emits: ['select-plan'],
  data() {
    return {
      plans: [],
      loading: true,
      billingPeriod: this.initialBillingPeriod,
      faqs: [
        {
          q: '¿Tienen periodo de prueba?',
          a: 'Sí, todos nuestros planes incluyen 15 días de prueba gratuita. No requerimos tarjeta de crédito para empezar.'
        },
        {
          q: '¿Puedo cambiar de plan después?',
          a: 'Por supuesto. Puedes subir o bajar de plan en cualquier momento. Los cambios se prorratearán en tu próxima factura.'
        },
        {
          q: '¿Qué formas de pago aceptan?',
          a: 'Aceptamos transferencias bancarias nacionales, Zelle, Binance Pay y efectivo en nuestras oficinas.'
        },
        {
          q: '¿Necesito instalar algo?',
          a: 'No. AD System es 100% web (en la nube). Puedes acceder desde cualquier dispositivo con conexión a internet.'
        },
        {
          q: '¿Qué pasa con mis datos si cancelo?',
          a: 'Tus datos te pertenecen. Puedes exportar toda tu información a Excel o PDF antes de cancelar. Mantenemos una copia de seguridad por 30 días.'
        }
      ]
    };
  },
  async mounted() {
    await this.fetchPlans();
  },
  methods: {
    async fetchPlans() {
      this.loading = true;
      try {
        const response = await plansService.getPlans();
        if (response.success) {
          this.plans = response.data;
        } else {
          console.error('Error fetching plans in PricingSection:', response.error);
        }
      } catch (error) {
        console.error('Exception fetching plans:', error);
      } finally {
        this.loading = false;
      }
    }
  }
}
</script>

<style scoped>
.period-toggle {
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.period-btn {
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  outline: none;
}

.period-btn--active {
  background: #ffffff;
  color: #1F355C;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.transition-all {
  transition: all 0.3s ease;
}

.border-top {
  border-top: 1px solid rgba(0,0,0,0.05);
}
</style>