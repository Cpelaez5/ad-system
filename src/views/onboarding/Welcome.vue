<template>
  <div class="welcome-container">
    <div class="welcome-header d-flex justify-end pa-4">
      <button @click="finishWelcome" aria-label="Saltar introducción" class="btn-saltar">
        Saltar
      </button>
    </div>
    
    <div class="welcome-content px-4 pb-8">
      <v-window 
        v-model="step" 
        :transition="transitionName" 
        :reverse-transition="reverseTransitionName"
      >
        <!-- Paso 1 -->
        <v-window-item :value="1">
          <div class="text-center px-2">
            <LogoAdSystem :alto="80" variante="completo" class="mb-6" />
            <h1 class="text-h4 font-weight-bold mb-4">Bienvenido a AD System</h1>
            <p class="text-body-1 text-medium-emphasis mx-auto" style="max-width: 400px; font-size: 16px;">
              Aquí llevas las cuentas de tu negocio y te mantienes al día con el SENIAT, sin complicarte.
            </p>
          </div>
        </v-window-item>

        <!-- Paso 2 -->
        <v-window-item :value="2">
          <div class="text-center px-2">
            <v-icon size="120" color="primary" class="mb-4">mdi-camera</v-icon>
            <h2 class="text-h4 font-weight-bold mb-4">Registra con una foto</h2>
            <p class="text-body-1 text-medium-emphasis mx-auto" style="max-width: 400px; font-size: 16px;">
              Cuando compres o vendas algo, tómale una foto a la factura. Nosotros leemos los datos por ti.
            </p>
          </div>
        </v-window-item>

        <!-- Paso 3 -->
        <v-window-item :value="3">
          <div class="text-center px-2">
            <v-icon size="120" color="primary" class="mb-4">mdi-chart-box-outline</v-icon>
            <h2 class="text-h4 font-weight-bold mb-4">Mira cómo vas</h2>
            <p class="text-body-1 text-medium-emphasis mx-auto" style="max-width: 400px; font-size: 16px;">
              En Inicio ves cuánto vendiste, cuánto gastaste y lo que tienes pendiente.
            </p>
          </div>
        </v-window-item>
      </v-window>

      <!-- Indicadores -->
      <div class="d-flex justify-center align-center mt-8 mb-8" aria-hidden="true">
        <v-icon 
          v-for="n in 3" 
          :key="n"
          size="small"
          :color="n === step ? 'primary' : 'grey-lighten-2'"
          class="mx-1 transition-colors"
        >
          mdi-circle
        </v-icon>
      </div>

      <!-- Controles -->
      <div class="d-flex flex-column gap-4 align-center mt-4 w-100">
        <BotonAccion 
          v-if="step < 3"
          texto="Siguiente"
          tamano="principal"
          ancho="completo"
          @click="step++"
        />
        <BotonAccion 
          v-else
          texto="Empezar"
          tamano="principal"
          ancho="completo"
          @click="finishWelcome"
        />
        
        <BotonAccion 
          v-if="step > 1"
          texto="Atrás"
          variante="terciaria"
          ancho="completo"
          @click="step--"
        />
      </div>
    </div>
  </div>
</template>

<script>
import BotonAccion from '@/components/ui/BotonAccion.vue';
import LogoAdSystem from '@/components/ui/LogoAdSystem.vue';
import userService from '@/services/userService';

export default {
  name: 'Welcome',
  components: {
    BotonAccion,
    LogoAdSystem,
  },
  data() {
    return {
      step: 1,
      reducedMotion: false,
    }
  },
  computed: {
    transitionName() {
      return this.reducedMotion ? 'none' : 'v-window-x-transition';
    },
    reverseTransitionName() {
      return this.reducedMotion ? 'none' : 'v-window-x-reverse-transition';
    }
  },
  mounted() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = mediaQuery.matches;
      // Escuchar cambios de preferencia (compatibilidad según navegador)
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', this.handleMotionChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(this.handleMotionChange); // Safari antiguo
      }
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', this.handleMotionChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(this.handleMotionChange);
      }
    }
  },
  methods: {
    handleMotionChange(e) {
      this.reducedMotion = e.matches;
    },
    async finishWelcome() {
      localStorage.setItem('welcome_seen', 'true');
      
      const currentUser = await userService.getCurrentUser();
      
      if (currentUser && currentUser.role === 'cliente') {
        const client = currentUser.client || {};
        const hasActivity = Boolean(client.activity_type && String(client.activity_type).trim());
        const hasLicencia = Boolean(client.licencia_actividad_economica && String(client.licencia_actividad_economica).trim());
        const hasMunicipio = Boolean(client.municipio || client.municipio_id);
        const hasEstado = Boolean(client.estado || hasMunicipio);

        const isFiscalIncomplete = !hasActivity || !hasLicencia || !hasMunicipio || !hasEstado;

        if (isFiscalIncomplete) {
          this.$router.push({ path: '/cliente/mi-area', query: { required: 'fiscal' } });
        } else {
          this.$router.push('/cliente/inicio');
        }
      } else {
        // Fallback for non-client or unexpected missing data, as per original logic
        this.$router.push('/dashboard');
      }
    }
  }
}
</script>

<style scoped>
.welcome-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background, #efefef);
}

.welcome-header {
  height: 60px;
}

.welcome-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
}

.gap-4 {
  gap: 16px;
}

.btn-saltar {
  background: transparent;
  border: none;
  color: rgba(0,0,0,0.6);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  text-decoration: underline;
  transition: color 0.2s ease;
}

.btn-saltar:focus-visible {
  outline: 3px solid #2A2A2E;
  outline-offset: 2px;
}

.btn-saltar:hover {
  color: rgba(0,0,0,0.87);
}

.transition-colors {
  transition: color 0.3s ease;
}

/* Fallback general de reduced motion por si Vuetify inyecta transiciones inline */
@media (prefers-reduced-motion: reduce) {
  .transition-colors {
    transition: none !important;
  }
}
</style>
