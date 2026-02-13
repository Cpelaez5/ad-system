<template>
  <v-card
    class="plan-card d-flex flex-column h-100 position-relative fill-height transition-swing"
    :class="{ 'plan-card--active': isCurrent, 'plan-card--featured': isFeatured }"
    :elevation="isFeatured ? 10 : 2"
    rounded="xl"
    :color="isFeatured ? 'secondary' : undefined"
    :theme="isFeatured ? 'dark' : 'light'"
    border
  >
    <div v-if="isFeatured" class="featured-badge">
      <v-chip color="accent" label size="small" class="font-weight-bold px-3 py-1 text-uppercase text-caption">
        Más Popular
      </v-chip>
    </div>

    <v-card-item class="pt-8 px-6 pb-2 text-center">
      <v-card-title class="text-h5 font-weight-bold mb-2">
        {{ plan.name }}
      </v-card-title>
      <v-card-subtitle class="mb-6 opacity-80 text-body-2 text-wrap line-clamp-2">
        {{ plan.description }}
      </v-card-subtitle>

      <div class="d-flex justify-center align-baseline mb-2">
        <span class="text-h3 font-weight-black">
          ${{ currentPrice }}
        </span>
        <span class="text-body-1 opacity-70 ml-1">/ mes</span>
      </div>
      <div class="text-caption opacity-60 mb-4">
        {{ billingPeriod === 'annual' ? 'Facturado anualmente' : 'Facturado mensualmente' }}
      </div>
    </v-card-item>

    <v-divider :color="isFeatured ? 'white' : undefined" class="opacity-20 mx-6"></v-divider>

    <v-card-text class="flex-grow-1 px-6 py-6">
      <v-list density="compact" class="bg-transparent feature-list pa-0">
        <v-list-item v-for="(feature, i) in features" :key="i" class="px-0 mb-2" min-height="32">
          <template v-slot:prepend>
            <v-icon 
              :color="isFeatured ? 'accent' : 'primary'" 
              icon="mdi-check-circle" 
              size="small" 
              class="mr-3"
            ></v-icon>
          </template>
          <span class="text-body-2 font-weight-medium">{{ feature }}</span>
        </v-list-item>
      </v-list>
    </v-card-text>

    <!-- Action Button -->
    <div class="px-6 pb-8 pt-2">
      <v-btn
        block
        size="large"
        rounded="lg"
        :color="buttonColor"
        :variant="buttonVariant"
        :loading="loading"
        :disabled="isCurrent"
        @click="$emit('select', plan)"
        class="font-weight-bold text-none hover-scale"
        elevation="4"
      >
        {{ buttonText }}
      </v-btn>
    </div>
  </v-card>
</template>

<script>
export default {
  name: 'PlanCard',
  props: {
    plan: {
      type: Object,
      required: true
    },
    billingPeriod: {
      type: String,
      default: 'monthly'
    },
    isCurrent: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['select'],
  computed: {
    isFeatured() {
      return this.plan.name === 'Profesional';
    },
    isEnterprise() {
      return this.plan.name === 'Empresarial';
    },
    currentPrice() {
      return this.billingPeriod === 'annual' ? this.plan.price_annual : this.plan.price_monthly;
    },
    features() {
      if (Array.isArray(this.plan.features)) return this.plan.features;
      if (typeof this.plan.features === 'string') {
        try {
          return JSON.parse(this.plan.features);
        } catch { 
          return []; 
        }
      }
      return [];
    },
    buttonText() {
      if (this.isCurrent) return 'Tu Plan Actual';
      if (this.isEnterprise) return 'Contactar Ventas';
      return 'Elegir Plan';
    },
    buttonColor() {
      if (this.isCurrent) return 'success';
      if (this.isEnterprise && !this.isCurrent) return 'primary';
      return this.isFeatured ? 'accent' : 'primary';
    },
    buttonVariant() {
      if (this.isEnterprise && !this.isCurrent) return 'outlined';
      return 'flat';
    }
  }
}
</script>

<style scoped>
.plan-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.plan-card:hover:not(.plan-card--active) {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12) !important;
}

.plan-card--featured {
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.featured-badge {
  position: absolute;
  top: 12px;
  right: 12px;
}

.hover-scale {
  transition: transform 0.2s ease;
}

.hover-scale:hover:not(:disabled) {
  transform: scale(1.02);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
[ignoring loop detection]
