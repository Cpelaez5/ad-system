<template>
  <v-system-bar
    v-if="showTrialBanner"
    :color="getTrialBannerColor()"
    class="trial-banner"
    height="40"
    app
    style="z-index: 1200;"
  >
    <div 
      class="d-flex align-center justify-center w-100 h-100"
      :style="{ 
        'padding-left': sidebarExpanded ? '270px' : '70px',
        'transition': 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }"
    >
      <v-icon size="20" class="mr-2" color="white">mdi-clock-alert-outline</v-icon>
      <span class="text-body-2 font-weight-bold text-white text-truncate">
        {{ getTrialMessage() }}
      </span>
      <v-btn 
        size="small" 
        variant="outlined" 
        class="ml-4 trial-cta-btn text-none"
        href="/#pricing"
        style="min-width: 120px;"
      >
        <v-icon size="16" class="mr-1">mdi-rocket-launch</v-icon>
        Ver Planes
      </v-btn>
    </div>
  </v-system-bar>
</template>

<script>
import { supabase } from '@/lib/supabaseClient';

export default {
  name: 'TrialBanner',
  props: {
    sidebarExpanded: {
      type: Boolean,
      default: false
    }
  },
  emits: ['visibility-change'],
  data() {
    return {
      showTrialBanner: false,
      trialDaysLeft: 0
    };
  },
  watch: {
    showTrialBanner(val) {
      this.$emit('visibility-change', val);
    }
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
        return '¡Tu prueba termina hoy!';
      } else if (this.trialDaysLeft === 1) {
        return '¡Tu prueba termina mañana!';
      } else if (this.trialDaysLeft <= 3) {
        return `¡Solo ${this.trialDaysLeft} días restantes!`;
      } else {
        return `Tienes ${this.trialDaysLeft} días restantes en tu prueba gratuita.`;
      }
    },

    getTrialBannerColor() {
      if (this.trialDaysLeft <= 1) {
        return '#ef5350'; // red
      } else if (this.trialDaysLeft <= 3) {
        return '#ffa726'; // orange
      } else {
        return '#29b6f6'; // light blue
      }
    }
  }
};
</script>

<style scoped>
.trial-cta-btn {
  border-color: white !important;
  color: white !important;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.trial-cta-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
</style>
