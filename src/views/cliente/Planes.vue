<template>
  <v-container fluid class="planes-page pa-4 pa-md-6">
    <PricingSection
      title="Mi Suscripción"
      subtitle="Escala tus operaciones con el plan ideal para tu negocio."
      :current-plan-id="currentSubscription?.plan_id"
      :processing-plan-id="processingPlan"
      :initial-billing-period="billingPeriod"
      @select-plan="handleSelectPlan"
    />

    <!-- Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top right"
      timeout="3000"
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import PricingSection from '@/components/common/PricingSection.vue';
import plansService from '@/services/plansService';
import userService from '@/services/userService';

export default {
  name: 'Planes',
  components: { PricingSection },
  data() {
    return {
      processingPlan: null,
      currentSubscription: null,
      currentUser: null,
      billingPeriod: 'monthly',
      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        this.currentUser = await userService.getCurrentUser();
        if (this.currentUser?.client_id) {
          const subResult = await plansService.getCurrentSubscription(this.currentUser.client_id);
          if (subResult.success && subResult.data) {
            this.currentSubscription = subResult.data;
            this.billingPeriod = this.currentSubscription.billing_period || 'monthly';
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      }
    },
    isCurrentPlan(plan) {
      return this.currentSubscription?.plan_id === plan.id;
    },
    async handleSelectPlan(plan, selectedBillingPeriod) {
      if (this.isCurrentPlan(plan)) return;
      if (plan.name === 'AD Corporate Nexus') {
        window.open('mailto:ventas@sistema.com?subject=Interés en Plan Corporate Nexus', '_blank');
        return;
      }
      
      // Redirigir al Checkout en lugar de procesar directamente
      this.$router.push({
        path: '/cliente/checkout',
        query: {
          plan_id: plan.id,
          period: selectedBillingPeriod
        }
      });
    },
    showSnackbar(text, color) {
      this.snackbar = { show: true, text, color };
    }
  }
}
</script>

<style scoped>
.planes-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
