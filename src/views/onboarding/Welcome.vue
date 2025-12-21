<template>
  <div class="welcome-container">
    <div class="welcome-content animate-fade-in">
      <div class="header-section text-center mb-8">
        <h1 class="text-h3 font-weight-bold mb-2">¡Bienvenido, {{ firstName }}!</h1>
        <p class="text-h6 text-medium-emphasis">
          Tienes <span class="text-primary font-weight-bold">{{ daysLeft }} días</span> de prueba gratuita.
        </p>
      </div>

      <div class="features-grid mb-8">
        <div class="feature-card">
          <v-icon color="primary" size="32" class="mb-2">mdi-file-document-outline</v-icon>
          <h3 class="font-weight-bold mb-1">Facturas con IA</h3>
          <p class="text-body-2 text-medium-emphasis">Sube una foto o PDF y deja que la IA complete los datos.</p>
        </div>
        <div class="feature-card">
          <v-icon color="primary" size="32" class="mb-2">mdi-robot</v-icon>
          <h3 class="font-weight-bold mb-1">Chatbot Inteligente</h3>
          <p class="text-body-2 text-medium-emphasis">Resuelve tus dudas sobre el sistema al instante.</p>
        </div>
        <div class="feature-card">
          <v-icon color="primary" size="32" class="mb-2">mdi-cloud-upload</v-icon>
          <h3 class="font-weight-bold mb-1">5 GB de Espacio</h3>
          <p class="text-body-2 text-medium-emphasis">Almacenamiento inicial para tus documentos.</p>
        </div>
      </div>

      <div class="actions-section">
        <v-btn
          color="primary"
          size="x-large"
          block
          class="mb-4"
          @click="startTrial"
        >
          Comenzar mi prueba
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
        
        <v-btn
          variant="outlined"
          block
          to="/pricing"
        >
          Ver planes disponibles
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '@/lib/supabaseClient'

export default {
  name: 'Welcome',
  data() {
    return {
      firstName: '',
      daysLeft: 15
    }
  },
  async mounted() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      this.firstName = user.user_metadata.first_name || 'Usuario';
      
      // Calculate days left
      const { data: profile } = await supabase
        .from('users')
        .select('trial_end')
        .eq('id', user.id)
        .single();
        
      if (profile?.trial_end) {
        const end = new Date(profile.trial_end);
        const now = new Date();
        const diffTime = Math.abs(end - now);
        this.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }
    }
  },
  methods: {
    startTrial() {
      localStorage.setItem('welcome_seen', 'true');
      this.$router.push('/dashboard');
    }
  }
}
</script>

<style scoped>
.welcome-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.welcome-content {
  background: white;
  padding: 48px;
  border-radius: 32px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  max-width: 800px;
  width: 100%;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.feature-card {
  padding: 24px;
  background: #f8f9fa;
  border-radius: 16px;
  text-align: center;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
