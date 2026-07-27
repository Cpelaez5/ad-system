<template>
  <div class="pricing-page bg-grey-lighten-5 fill-height">
    <v-container class="py-16">
      <PricingSection
        title="Precios simples y transparentes"
        subtitle="Comienza gratis y escala a medida que tu negocio crece. Sin contratos ocultos ni sorpresas."
        @select-plan="handleSelectPlan"
      />

      <!-- CTA Bottom -->
      <v-row justify="center" class="mt-16 pt-8 pb-16">
        <v-col cols="12" md="8" class="text-center">
          <v-card class="bg-primary text-white pa-10 rounded-xl" elevation="10">
            <h2 class="text-h3 font-weight-bold mb-4">¿Listo para transformar tu contabilidad?</h2>
            <p class="text-h6 opacity-90 mb-8 font-weight-regular">
              Únete a cientos de empresas que ya confían en AD System.
            </p>
            <v-btn
              color="white"
              class="text-primary font-weight-bold text-none px-8"
              size="x-large"
              rounded="pill"
              elevation="4"
              to="/signup"
            >
              Crear cuenta gratis
              <v-icon right class="ml-2">mdi-arrow-right</v-icon>
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import PricingSection from '@/components/common/PricingSection.vue';

export default {
  name: 'Pricing',
  components: { PricingSection },
  methods: {
    handleSelectPlan(plan, billingPeriod) {
      // Disparar evento a Google Tag Manager / Analytics
      if (window.dataLayer) {
        window.dataLayer.push({
          event: 'begin_checkout',
          ecommerce: {
            items: [{
              item_name: plan.name || 'Plan',
              item_id: plan.id || 'N/A'
            }]
          }
        });
      }

      this.$router.push({
        path: '/signup',
        query: {
          type: 'public_client',
          plan: plan.id,
          period: billingPeriod || 'monthly',
          planName: plan.name,
          planPrice: billingPeriod === 'annual' ? plan.price_annual : plan.price_monthly
        }
      });
    }
  }
}
</script>

<style scoped>
.pricing-page {
  background-image: radial-gradient(circle at 100% 0%, rgba(168, 28, 34, 0.05) 0%, transparent 50%),
                    radial-gradient(circle at 0% 100%, rgba(31, 53, 92, 0.05) 0%, transparent 50%);
}

.border-top {
  border-top: 1px solid rgba(0,0,0,0.05);
}
</style>