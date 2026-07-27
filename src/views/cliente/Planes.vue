<template>
  <v-container fluid class="planes-page pa-4 pa-md-6">
    <!-- Banner de suscripción actual -->
    <v-alert
      v-if="currentSubscription && currentSubscription.plan"
      color="secondary"
      variant="tonal"
      class="mb-6 rounded-xl"
      border="start"
      border-color="primary"
    >
      <div class="d-flex align-center justify-space-between flex-wrap">
        <div>
          <h3 class="text-h6 font-weight-bold mb-1">
            Plan Actual: {{ currentSubscription.plan.name }}
            <v-chip size="small" :color="isActive ? 'success' : 'error'" class="ml-2 font-weight-bold">
              {{ isActive ? 'Activo' : 'Expirado' }}
            </v-chip>
          </h3>
          <p class="mb-0 text-body-2 opacity-80">
            <template v-if="formattedExpirationDate">
              Tu suscripción es válida hasta el <strong>{{ formattedExpirationDate }}</strong>.
            </template>
            <template v-else>
              Tu suscripción se encuentra activa.
            </template>
          </p>
        </div>
        <div class="mt-3 mt-md-0" v-if="!isActive">
          <v-btn color="primary" variant="flat" rounded="pill" @click="scrollToPlans">
            Renovar Ahora
          </v-btn>
        </div>
      </div>
    </v-alert>

    <PricingSection
      title="Planes de Suscripción"
      subtitle="Escala tus operaciones con el plan ideal para tu negocio."
      :current-plan-id="currentSubscription?.plan_id"
      :processing-plan-id="processingPlan"
      :pending-plan-id="pendingPlanId"
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
      pendingPlanId: null,
      currentSubscription: null,
      currentUser: null,
      billingPeriod: 'monthly',
      snackbar: { show: false, text: '', color: 'success' }
    };
  },
  async mounted() {
    await this.loadData();
  },
  computed: {
    isActive() {
      if (!this.currentSubscription) return false;
      if (this.currentSubscription.status === 'active' || this.currentSubscription.status === 'trial') return true;
      if (this.currentSubscription.next_billing_date) {
        return new Date(this.currentSubscription.next_billing_date) > new Date();
      }
      return false;
    },
    formattedExpirationDate() {
      if (this.currentSubscription?.next_billing_date) {
        const date = new Date(this.currentSubscription.next_billing_date);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return null;
    }
  },
  methods: {
    scrollToPlans() {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    },
    async loadData() {
      try {
        this.currentUser = await userService.getCurrentUser();
        if (this.currentUser?.client_id) {
          const subResult = await plansService.getCurrentSubscription(this.currentUser.client_id);
          if (subResult.success && subResult.data) {
            this.currentSubscription = subResult.data;
            this.billingPeriod = this.currentSubscription.billing_period || 'monthly';
          }
          
          // Cargar facturas pendientes de suscripción
          const { supabase } = await import('@/lib/supabaseClient');
          const { data: pendingInvoices } = await supabase
            .from('system_invoices')
            .select('notes')
            .eq('client_id', this.currentUser.client_id)
            .eq('status', 'pending')
            .ilike('notes', 'Suscripción a plan%')
            .order('created_at', { ascending: false })
            .limit(1);

          if (pendingInvoices && pendingInvoices.length > 0) {
            const notes = pendingInvoices[0].notes;
            // Extraer el nombre del plan usando regex o includes
            // La nota es: Suscripción a plan AD Visionary (monthly) - PENDIENTE DE APROBACIÓN
            const plansRes = await plansService.getPlans();
            if (plansRes.success) {
              const pendingPlan = plansRes.data.find(p => notes.includes(p.name));
              if (pendingPlan) {
                this.pendingPlanId = pendingPlan.id;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading subscription:', error);
      }
    },
    isCurrentPlan(plan) {
      return this.currentSubscription?.plan_id === plan.id;
    },
    isPendingPlan(plan) {
      return this.pendingPlanId === plan.id && !this.isCurrentPlan(plan);
    },
    async handleSelectPlan(plan, selectedBillingPeriod) {
      if (this.isCurrentPlan(plan) || this.isPendingPlan(plan)) return;

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
