<template>
  <div v-if="showTrialBanner" class="trial-banner-wrapper">
    <div class="trial-banner" :class="getTrialBannerClass()">
      <v-container fluid class="py-2">
        <div class="d-flex align-center justify-center">
          <v-icon size="20" class="mr-2">mdi-clock-alert-outline</v-icon>
          <span class="text-body-2 font-weight-bold">
            {{ getTrialMessage() }}
          </span>
          <v-btn 
            size="small" 
            variant="outlined" 
            class="ml-4 trial-cta-btn"
            to="/pricing"
          >
            <v-icon size="16" class="mr-1">mdi-rocket-launch</v-icon>
            Ver Planes
          </v-btn>
        </div>
      </v-container>
    </div>
  </div>
</template>

<script>
import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'TrialBanner',
  data() {
    return {
      showTrialBanner: false,
      trialDaysLeft: 0
    };
  },
  async mounted() {
    await this.checkTrialStatus();
  },
  methods: {
    async checkTrialStatus() {
      try {
        const { ONBOARDING_V1 } = await import('@/config/featureFlags');
        if (!ONBOARDING_V1) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('users')
          .select('trial_end, plan_id')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        // Show banner only for free trial users
        if (profile.plan_id === 'free_trial' && profile.trial_end) {
          const end = new Date(profile.trial_end);
          const now = new Date();
          const diffTime = end - now;
          this.trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          this.showTrialBanner = this.trialDaysLeft >= 0;
        }
      } catch (error) {
        console.error('Error checking trial status:', error);
      }
    },

    getTrialMessage() {
      if (this.trialDaysLeft === 0) {
        return '¡Tu prueba gratuita termina hoy! Actualiza tu plan para continuar.';
      } else if (this.trialDaysLeft === 1) {
        return '¡Tu prueba gratuita termina mañana! Actualiza tu plan ahora.';
      } else if (this.trialDaysLeft <= 3) {
        return `¡Solo ${this.trialDaysLeft} días restantes en tu prueba gratuita!`;
      } else {
        return `Tienes ${this.trialDaysLeft} días restantes en tu prueba gratuita.`;
      }
    },

    getTrialBannerClass() {
      if (this.trialDaysLeft <= 1) {
        return 'trial-urgent';
      } else if (this.trialDaysLeft <= 3) {
        return 'trial-warning';
      } else {
        return 'trial-info';
      }
    }
  }
};
</script>

<style scoped>
.trial-banner-wrapper {
  position: relative;
  width: 100%;
  z-index: 999;
}

.trial-banner {
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.trial-info {
  background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
  color: white;
}

.trial-warning {
  background: linear-gradient(135deg, #ffb74d 0%, #ffa726 100%);
  color: white;
}

.trial-urgent {
  background: linear-gradient(135deg, #ef5350 0%, #e53935 100%);
  color: white;
  animation: pulse-urgent 2s ease-in-out infinite;
}

@keyframes pulse-urgent {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.9; }
}

.trial-cta-btn {
  border-color: white !important;
  color: white !important;
  font-weight: 600;
  transition: all 0.2s ease;
}

.trial-cta-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
