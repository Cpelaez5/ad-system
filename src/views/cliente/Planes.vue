<template>
  <div class="pricing-page bg-grey-lighten-5 fill-height">
    <v-container class="py-16">
      <!-- Header -->
      <div class="text-center mb-16 animate-fade-in">
        <v-chip color="primary" variant="tonal" class="mb-4 font-weight-bold" size="small">
          PLANES FLEXIBLES
        </v-chip>
        <h1 class="text-h3 font-weight-bold text-grey-darken-4 mb-4">
          Elige el plan ideal para tu negocio
        </h1>
        <p class="text-h6 text-grey-darken-1 font-weight-regular" style="max-width: 600px; margin: 0 auto;">
          Escala tus operaciones contables con nuestros planes adaptados a tus necesidades.
        </p>

        <!-- Period Selector -->
        <div class="d-flex justify-center align-center mt-8">
          <span :class="{'text-primary font-weight-bold': billingPeriod === 'monthly', 'text-grey': billingPeriod !== 'monthly'}" class="mr-4 text-subtitle-1">Mensual</span>
          <v-switch
            v-model="billingPeriod"
            true-value="annual"
            false-value="monthly"
            color="primary"
            hide-details
            inset
          ></v-switch>
          <span :class="{'text-primary font-weight-bold': billingPeriod === 'annual', 'text-grey': billingPeriod !== 'annual'}" class="ml-4 text-subtitle-1">
            Anual 
            <v-chip color="success" size="x-small" class="ml-2 font-weight-bold">AHORRA 17%</v-chip>
          </span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4 text-grey">Cargando planes...</p>
      </div>

      <!-- Pricing Cards -->
      <v-row v-else justify="center" align="stretch" class="mb-16 pt-4">
        <v-col 
          v-for="plan in plans" 
          :key="plan.id" 
          cols="12" 
          md="4" 
          lg="3"
        >
          <v-card 
            class="pricing-card h-100 d-flex flex-column pt-6 pb-4 px-4"
            :class="{'popular': plan.name === 'Profesional'}"
            :elevation="plan.name === 'Profesional' ? 10 : 0"
            :border="plan.name !== 'Profesional'"
            :color="plan.name === 'Profesional' ? 'white' : undefined"
          >
            <!-- Popular Tag -->
            <div 
              v-if="plan.name === 'Profesional'" 
              class="popular-tag bg-primary text-caption font-weight-bold px-3 py-1 rounded-pill"
            >
              MÁS POPULAR
            </div>

            <v-card-item class="text-center">
              <v-card-title 
                class="text-h5 font-weight-bold mb-2"
                :class="{'text-primary': plan.name === 'Profesional'}"
              >
                {{ plan.name }}
              </v-card-title>
              <v-card-subtitle class="mb-6">{{ plan.description }}</v-card-subtitle>
              
              <div class="d-flex justify-center align-baseline mb-2">
                <span 
                  class="text-h3 font-weight-bold"
                  :class="plan.name === 'Profesional' ? 'text-primary' : 'text-grey-darken-4'"
                >
                  ${{ getPrice(plan) }}
                </span>
                <span class="text-body-1 text-grey-darken-1 ml-1">/ mes</span>
              </div>
              <div class="text-caption text-grey-darken-1">
                {{ billingPeriod === 'annual' ? 'Facturado anualmente' : 'Facturado mensualmente' }}
              </div>
            </v-card-item>

            <v-card-text class="flex-grow-1 mt-4">
              <v-btn 
                block 
                :color="getButtonColor(plan)" 
                :variant="getButtonVariant(plan)"
                class="mb-8 text-none" 
                rounded="lg" 
                :elevation="plan.name === 'Profesional' ? 4 : 2"
                @click="selectPlan(plan)"
                :disabled="isCurrentPlan(plan)"
                :loading="processingPlan === plan.id"
              >
                {{ getButtonText(plan) }}
              </v-btn>
              
              <div class="text-subtitle-2 font-weight-bold mb-4">Incluye:</div>
              <v-list density="compact" class="feature-list bg-transparent">
                <v-list-item 
                  v-for="(feature, i) in safeFeatures(plan.features)" 
                  :key="i" 
                  class="px-0"
                >
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">{{ feature }}</span>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

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
  </div>
</template>

<script>
import plansService from '@/services/plansService';
import userService from '@/services/userService';

export default {
  name: 'Planes',
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
          this.currentUser ? plansService.getCurrentSubscription(this.currentUser.client_id) : Promise.resolve({ success: false })
        ]);

        if (plansResult.success) {
          this.plans = plansResult.data;
        }

        if (subResult.success && subResult.data) {
          this.currentSubscription = subResult.data;
          this.billingPeriod = this.currentSubscription.billing_period || 'monthly';
        }

      } catch (error) {
        console.error('Error loading plans data:', error);
        this.showSnackbar('Error cargando la información de planes', 'error');
      } finally {
        this.loading = false;
      }
    },

    safeFeatures(features) {
      if (Array.isArray(features)) return features;
      if (typeof features === 'string') {
        try {
          return JSON.parse(features);
        } catch { 
          return []; 
        }
      }
      return [];
    },

    getPrice(plan) {
      return this.billingPeriod === 'annual' ? plan.price_annual : plan.price_monthly;
    },

    isCurrentPlan(plan) {
      if (!this.currentSubscription) return false;
      return this.currentSubscription.plan_id === plan.id;
    },

    getButtonText(plan) {
      if (this.isCurrentPlan(plan)) return 'Tu Plan Actual';
      if (plan.name === 'Empresarial') return 'Contactar Ventas';
      return this.currentSubscription ? 'Cambiar a este Plan' : 'Elegir Plan';
    },

    getButtonColor(plan) {
      if (this.isCurrentPlan(plan)) return 'success';
      if (plan.name === 'Empresarial') return 'primary';
      return plan.name === 'Profesional' ? 'primary' : 'grey-darken-4';
    },

    getButtonVariant(plan) {
      if (plan.name === 'Empresarial' && !this.isCurrentPlan(plan)) return 'outlined';
      return 'flat';
    },

    async selectPlan(plan) {
      if (this.isCurrentPlan(plan)) return;
      if (plan.name === 'Empresarial') {
        window.open('mailto:ventas@sistema.com?subject=Interés en Plan Empresarial', '_blank');
        return;
      }

      if (!confirm(`¿Estás seguro de que deseas cambiar al plan ${plan.name}?`)) return;

      this.processingPlan = plan.id;
      try {
        const result = await plansService.updateSubscription(
          this.currentUser.client_id,
          plan.id,
          this.billingPeriod
        );

        if (result.success) {
          this.showSnackbar(`Te has suscrito exitosamente al plan ${plan.name}`, 'success');
          await this.loadData();
          // Notificar cambio
          window.dispatchEvent(new CustomEvent('userUpdated'));
        } else {
          throw result.error;
        }
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
/* Reusing styles from Pricing.vue */
.pricing-page {
  font-family: 'Inter', sans-serif;
}

.pricing-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-color: rgba(0, 0, 0, 0.08);
  position: relative;
}

.pricing-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.pricing-card.popular {
  border: 2px solid rgb(var(--v-theme-primary));
  transform: scale(1.02);
}

.pricing-card.popular:hover {
  transform: scale(1.02) translateY(-8px);
  box-shadow: 0 20px 40px rgba(var(--v-theme-primary), 0.15) !important;
}

.popular-tag {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  box-shadow: 0 4px 10px rgba(var(--v-theme-primary), 0.3);
}

.feature-list .v-list-item {
  min-height: 36px;
}
</style>
[ignoring loop detection]
