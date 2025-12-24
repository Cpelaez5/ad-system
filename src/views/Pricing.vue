<template>
  <div class="pricing-page bg-grey-lighten-5 fill-height">
    <v-container class="py-16">
      <!-- Header -->
      <div class="text-center mb-16 animate-fade-in">
        <v-chip color="primary" variant="tonal" class="mb-4 font-weight-bold" size="small">
          PLANES FLEXIBLES
        </v-chip>
        <h1 class="text-h3 font-weight-bold text-grey-darken-4 mb-4">
          Precios simples y transparentes
        </h1>
        <p class="text-h6 text-grey-darken-1 font-weight-regular" style="max-width: 600px; margin: 0 auto;">
          Comienza gratis y escala a medida que tu negocio crece. Sin contratos ocultos ni sorpresas.
        </p>
      </div>

      <!-- Pricing Cards -->
      <v-row justify="center" align="stretch" class="mb-16 pt-4">
        <!-- Básico -->
        <v-col cols="12" md="4" lg="3">
          <v-card class="pricing-card h-100 d-flex flex-column pt-6 pb-4 px-4" elevation="0" border>
            <v-card-item class="text-center">
              <v-card-title class="text-h5 font-weight-bold mb-2">Básico</v-card-title>
              <v-card-subtitle class="mb-6">Para empezar con todo</v-card-subtitle>
              <div class="d-flex justify-center align-baseline mb-2">
                <span class="text-h3 font-weight-bold text-grey-darken-4">$15</span>
                <span class="text-body-1 text-grey-darken-1 ml-1">/ mes</span>
              </div>
              <div class="text-caption text-grey-darken-1">o $150 al año</div>
            </v-card-item>

            <v-card-text class="flex-grow-1 mt-4">
              <v-btn block color="grey-darken-4" class="mb-8 text-none" rounded="lg" elevation="2" @click="selectPlan('basic')">
                Comenzar ahora
              </v-btn>
              
              <div class="text-subtitle-2 font-weight-bold mb-4">Incluye:</div>
              <v-list density="compact" class="feature-list">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Registro facturas con IA</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Chatbot de soporte</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Acceso completo al sistema</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-database" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2 font-weight-bold">5 GB Almacenamiento</span>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Profesional (Highlighted) -->
        <v-col cols="12" md="4" lg="3">
          <v-card class="pricing-card popular h-100 d-flex flex-column pt-6 pb-4 px-4 position-relative overflow-visible" elevation="10" border color="white">
            <div class="popular-tag bg-primary text-caption font-weight-bold px-3 py-1 rounded-pill">
              MÁS POPULAR
            </div>
            
            <v-card-item class="text-center">
              <v-card-title class="text-h5 font-weight-bold mb-2 text-primary">Profesional</v-card-title>
              <v-card-subtitle class="mb-6">Para negocios en crecimiento</v-card-subtitle>
              <div class="d-flex justify-center align-baseline mb-2">
                <span class="text-h3 font-weight-bold text-primary">$30</span>
                <span class="text-body-1 text-grey-darken-1 ml-1">/ mes</span>
              </div>
              <div class="text-caption text-grey-darken-1">o $300 al año</div>
            </v-card-item>

            <v-card-text class="flex-grow-1 mt-4">
              <v-btn block color="primary" class="mb-8 text-none" rounded="lg" size="large" elevation="4" @click="selectPlan('pro')">
                Obtener Profesional
              </v-btn>

              <div class="text-subtitle-2 font-weight-bold mb-4">Todo lo del Básico, más:</div>
              <v-list density="compact" class="feature-list">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-star" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2 font-weight-bold">20 GB Almacenamiento</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-star" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Reportes avanzados</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-star" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Exportación masiva</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-star" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Soporte prioritario</span>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Empresarial -->
        <v-col cols="12" md="4" lg="3">
          <v-card class="pricing-card h-100 d-flex flex-column pt-6 pb-4 px-4" elevation="0" border>
            <v-card-item class="text-center">
              <v-card-title class="text-h5 font-weight-bold mb-2">Empresarial</v-card-title>
              <v-card-subtitle class="mb-6">Para grandes operaciones</v-card-subtitle>
              <div class="d-flex justify-center align-baseline mb-2">
                <span class="text-h3 font-weight-bold text-grey-darken-4">$60</span>
                <span class="text-body-1 text-grey-darken-1 ml-1">/ mes</span>
              </div>
              <div class="text-caption text-grey-darken-1">o $600 al año</div>
            </v-card-item>

            <v-card-text class="flex-grow-1 mt-4">
              <v-btn block variant="outlined" color="primary" class="mb-8 text-none" rounded="lg" @click="selectPlan('enterprise')">
                Contactar Ventas
              </v-btn>

              <div class="text-subtitle-2 font-weight-bold mb-4">Todo lo del Profesional, más:</div>
              <v-list density="compact" class="feature-list">
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2 font-weight-bold">100 GB Almacenamiento</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Multiusuario</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Integración APIs externas</span>
                </v-list-item>
                <v-list-item class="px-0">
                  <template v-slot:prepend>
                    <v-icon color="primary" icon="mdi-check-circle" size="small" class="mr-2"></v-icon>
                  </template>
                  <span class="text-body-2">Marca personalizada</span>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- FAQ Section -->
      <v-row justify="center">
        <v-col cols="12" md="8">
          <h2 class="text-h4 font-weight-bold text-center mb-8 text-grey-darken-3">Preguntas Frecuentes</h2>
          <v-expansion-panels variant="default" class="custom-panels">
            <v-expansion-panel elevation="0" class="mb-2 border rounded-lg">
              <v-expansion-panel-title class="text-subtitle-1 font-weight-bold">
                ¿Puedo cancelar en cualquier momento?
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-1 text-grey-darken-1">
                Sí, absolutamente. No hay contratos a largo plazo ni compromisos. Puedes cancelar tu suscripción en cualquier momento desde tu panel de control.
              </v-expansion-panel-text>
            </v-expansion-panel>
            
            <v-expansion-panel elevation="0" class="mb-2 border rounded-lg">
              <v-expansion-panel-title class="text-subtitle-1 font-weight-bold">
                ¿Qué métodos de pago aceptan?
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-1 text-grey-darken-1">
                Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, Amex). Los pagos son procesados de forma segura a través de Stripe.
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel elevation="0" class="mb-2 border rounded-lg">
              <v-expansion-panel-title class="text-subtitle-1 font-weight-bold">
                ¿Necesito tarjeta de crédito para la prueba?
              </v-expansion-panel-title>
              <v-expansion-panel-text class="text-body-1 text-grey-darken-1">
                No. Puedes registrarte y usar todas las funciones del plan de prueba durante 15 días sin ingresar ningún dato de pago.
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'Pricing',
  methods: {
    selectPlan(planId) {
      console.log(`Plan seleccionado: ${planId}`);
      alert(`Has seleccionado el plan ${planId}. La integración de pagos estará disponible pronto.`);
    }
  }
}
</script>

<style scoped>
.pricing-page {
  font-family: 'Inter', sans-serif;
}

.pricing-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-color: rgba(0, 0, 0, 0.08);
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

.overflow-visible {
  overflow: visible !important;
}

.feature-list .v-list-item {
  min-height: 36px;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
