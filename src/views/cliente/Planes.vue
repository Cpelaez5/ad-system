<template>
  <v-container fluid class="planes-page pa-4 pa-md-6">
    <!-- Header compacto -->
    <div class="d-flex flex-column flex-md-row align-center justify-space-between mb-6">
      <div class="mb-4 mb-md-0">
        <h1 class="text-h4 font-weight-bold" style="color: #1F355C;">
          Planes y Precios
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Escala tus operaciones con el plan ideal para tu negocio.
        </p>
      </div>

      <!-- Selector de periodo compacto -->
      <div class="d-inline-flex align-center period-toggle rounded-pill pa-1" style="background: #efefef;">
        <button
          class="period-btn rounded-pill px-5 py-2 text-body-2 font-weight-medium"
          :class="{ 'period-btn--active': billingPeriod === 'monthly' }"
          @click="billingPeriod = 'monthly'"
        >
          Mensual
        </button>
        <button
          class="period-btn rounded-pill px-5 py-2 text-body-2 font-weight-medium"
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
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
    </div>

    <!-- Plan Cards Grid: 3 columnas anchas -->
    <v-row v-else justify="center" align="stretch">
      <v-col
        v-for="plan in plans"
        :key="plan.id"
        cols="12"
        sm="6"
        md="4"
      >
        <PlanCard
          :plan="plan"
          :billing-period="billingPeriod"
          :is-current="isCurrentPlan(plan)"
          :loading="processingPlan === plan.id"
          @select="handleSelectPlan"
        />
      </v-col>
    </v-row>

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
import PlanCard from '@/components/common/PlanCard.vue';
import plansService from '@/services/plansService';
import userService from '@/services/userService';

export default {
  name: 'Planes',
  components: { PlanCard },
  data() {
    return {
      loading: true,
      processingPlan: null,
      plans: [],
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
      this.loading = true;
      try {
        this.currentUser = await userService.getCurrentUser();
        const [plansResult, subResult] = await Promise.all([
          plansService.getPlans(),
          this.currentUser?.client_id
            ? plansService.getCurrentSubscription(this.currentUser.client_id)
            : Promise.resolve({ success: false })
        ]);
        if (plansResult.success) this.plans = plansResult.data;
        if (subResult.success && subResult.data) {
          this.currentSubscription = subResult.data;
          this.billingPeriod = this.currentSubscription.billing_period || 'monthly';
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        this.showSnackbar('Error cargando planes', 'error');
      } finally {
        this.loading = false;
      }
    },
    isCurrentPlan(plan) {
      return this.currentSubscription?.plan_id === plan.id;
    },
    async handleSelectPlan(plan) {
      if (this.isCurrentPlan(plan)) return;
      if (plan.name === 'Empresarial') {
        window.open('mailto:ventas@sistema.com?subject=Interés en Plan Empresarial', '_blank');
        return;
      }
      if (!confirm(`¿Deseas cambiar al plan ${plan.name}?`)) return;
      this.processingPlan = plan.id;
      try {
        const result = await plansService.updateSubscription(
          this.currentUser.client_id, plan.id, this.billingPeriod
        );
        if (result.success) {
          this.showSnackbar(`Suscrito al plan ${plan.name}`, 'success');
          await this.loadData();
          window.dispatchEvent(new CustomEvent('userUpdated'));
        } else { throw result.error; }
      } catch (error) {
        console.error('Error updating plan:', error);
        this.showSnackbar('Error al actualizar el plan', 'error');
      } finally {
        this.processingPlan = null;
      }
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

/* Selector de periodo */
.period-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #888;
  transition: all 0.25s ease;
}

.period-btn--active {
  background: #ffffff;
  color: #1F355C;
  font-weight: 700 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
