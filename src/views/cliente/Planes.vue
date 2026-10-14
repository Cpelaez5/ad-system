<template>
  <v-container fluid class="planes-page pa-4 pa-md-6">
    <!-- Tu plan actual: nombre, estado, días que quedan y UN siguiente paso. -->
    <section v-if="currentSubscription && currentSubscription.plan" class="planes-page__actual mb-8" aria-label="Tu plan actual">
      <div class="d-flex flex-wrap align-center ga-2 mb-1">
        <h1 class="text-h5 font-weight-bold mb-0">Tu plan: {{ currentSubscription.plan.name }}</h1>
        <v-chip size="small" variant="tonal" :color="estadoPlan.color" :prepend-icon="estadoPlan.icono" class="font-weight-bold">
          {{ estadoPlan.texto }}
        </v-chip>
      </div>
      <p class="text-body-1 text-medium-emphasis mb-3">{{ fraseVigencia }}</p>
      <v-progress-linear
        v-if="diasRestantes !== null"
        :model-value="porcentajeRestante"
        :color="diasRestantes <= 5 ? 'warning' : 'success'"
        bg-color="grey-lighten-2"
        height="10"
        rounded
        class="mb-4 planes-page__barra"
        :aria-label="fraseVigencia"
      />
      <PanelSiguientePaso
        :listo="pasoPlan.listo"
        :titulo="pasoPlan.titulo"
        :detalle="pasoPlan.detalle"
        :texto-boton="pasoPlan.boton"
        titulo-listo="Tu plan está al día"
        :detalle-listo="pasoPlan.detalle"
        @accion="ejecutarPasoPlan"
      />
    </section>
    <header v-else class="mb-6">
      <h1 class="text-h5 font-weight-bold mb-1">Mi plan</h1>
      <p class="text-body-1 text-medium-emphasis mb-0">Todavía no tienes un plan. Elige el que mejor se ajuste a tu negocio.</p>
    </header>

    <PricingSection
      title="Compara los planes"
      subtitle="Cambia de plan cuando quieras."
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
import PanelSiguientePaso from '@/components/ui/PanelSiguientePaso.vue';
import plansService from '@/services/plansService';
import userService from '@/services/userService';
import { parseFechaLocal, formatFechaLocal } from '@/utils/fechas.js';

export default {
  name: 'Planes',
  components: { PricingSection, PanelSiguientePaso },
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
        // Menor (ola F2b): new Date('YYYY-MM-DD') interpreta medianoche UTC,
        // que en Caracas ya es el día anterior — parseFechaLocal la trata
        // como medianoche LOCAL.
        const fecha = parseFechaLocal(this.currentSubscription.next_billing_date);
        return fecha ? fecha > new Date() : false;
      }
      return false;
    },
    /** Días que quedan hasta el próximo cobro (null si no hay fecha). */
    diasRestantes() {
      const f = parseFechaLocal(this.currentSubscription?.next_billing_date);
      if (!f) return null;
      return Math.max(0, Math.ceil((f - new Date()) / 86400000));
    },
    porcentajeRestante() {
      if (this.diasRestantes === null) return 0;
      const total = this.currentSubscription?.billing_period === 'annual' ? 365 : 30;
      return Math.min(100, Math.round((this.diasRestantes / total) * 100));
    },
    estadoPlan() {
      if (this.pendingPlanId) return { texto: 'Pago en revisión', color: 'warning', icono: 'mdi-clock-outline' };
      if (!this.isActive) return { texto: 'Vencido', color: 'error', icono: 'mdi-alert-circle-outline' };
      return { texto: 'Activo', color: 'success', icono: 'mdi-check-circle' };
    },
    fraseVigencia() {
      if (this.diasRestantes === null) return this.isActive ? 'Tu suscripción está activa.' : 'Tu suscripción venció.';
      if (!this.isActive) return `Tu suscripción venció el ${this.formattedExpirationDate}.`;
      if (this.diasRestantes === 0) return 'Tu suscripción vence hoy.';
      return `Te quedan ${this.diasRestantes} ${this.diasRestantes === 1 ? 'día' : 'días'} (hasta el ${this.formattedExpirationDate}).`;
    },
    /** Un solo siguiente paso según el estado del plan y del pago. */
    pasoPlan() {
      if (this.pendingPlanId) {
        return { listo: false, titulo: 'Tu pago está en revisión', detalle: 'Te avisaremos cuando lo aprobemos. Puedes ver el estado en tus pagos.', boton: 'Ver mis pagos' };
      }
      if (!this.isActive) {
        return { listo: false, titulo: 'Renueva tu plan', detalle: 'Elige un plan abajo para seguir usando el sistema sin cortes.', boton: 'Elegir plan' };
      }
      if (this.diasRestantes !== null && this.diasRestantes <= 5) {
        return { listo: false, titulo: 'Tu plan vence pronto', detalle: 'Revisa tus pagos y reporta el siguiente para no quedarte sin servicio.', boton: 'Ver mis pagos' };
      }
      return { listo: true, titulo: '', detalle: 'No tienes nada pendiente. Te avisaremos antes del próximo cobro.', boton: '' };
    },
    formattedExpirationDate() {
      if (this.currentSubscription?.next_billing_date) {
        return formatFechaLocal(this.currentSubscription.next_billing_date, { year: 'numeric', month: 'long', day: 'numeric' }, 'es-ES');
      }
      return null;
    }
  },
  methods: {
    ejecutarPasoPlan() {
      if (!this.isActive && !this.pendingPlanId) return this.scrollToPlans();
      this.$router.push({ name: 'ClienteFacturacionSuscripcion' });
    },
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
