<template>
  <div class="signup-container">
    <!-- Left Side: Visual -->
    <div class="signup-visual animate-fade-in">
      <div class="visual-content">
        <div class="brand-badge animate-slide-in-down">
          <img src="@/assets/icon-adaptableV2.svg" alt="Logo" class="brand-logo" />
          <span class="brand-text">System</span>
        </div>
        <h1 class="visual-title animate-slide-in-up animate-delay-200">
          Únete a nosotros
        </h1>
        <p class="visual-subtitle animate-slide-in-up animate-delay-300">
          Comienza a gestionar tu contabilidad de forma profesional hoy mismo.
        </p>
        
        <!-- Testimonial Card (Optional) -->
        <div class="testimonial-card animate-slide-in-up animate-delay-400">
          <p class="testimonial-text">"La mejor plataforma para gestionar mi negocio. Simple y potente."</p>
          <div class="testimonial-user">
            <div class="user-avatar">AD</div>
            <div class="user-info">
              <span class="name">Ana Díaz</span>
              <span class="role">CEO, TechStart</span>
            </div>
          </div>
        </div>
      </div>
      <div class="visual-overlay"></div>
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
    </div>

    <!-- Right Side: Form -->
    <div class="signup-form-wrapper animate-slide-in-right">
      <div class="form-content">
        <!-- Mobile Brand -->
        <div class="mobile-brand d-md-none mb-6 text-center">
           <img src="@/assets/icon-adaptableV2.svg" alt="Logo" style="width: 40px;" />
           <h2 class="mt-2 text-h6 font-weight-bold">System</h2>
        </div>

        <!-- Loading State -->
        <div v-if="verifyingToken" class="text-center py-12">
          <div class="spinner dark"></div>
          <p class="mt-4 text-grey">Verificando invitación...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="tokenError" class="text-center py-12">
          <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
          <h2 class="text-h6 text-error mb-2">Invitación Inválida</h2>
          <p class="mb-6 text-grey">{{ tokenError }}</p>
          <v-btn color="primary" to="/login" variant="flat">Volver al Login</v-btn>
        </div>

        <!-- Registration Component -->
        <component 
          v-else 
          :is="currentComponent" 
          :invitation="invitationData"
        />
        
        <div class="text-center mt-6">
          <span class="text-grey">¿Ya tienes cuenta?</span>
          <router-link to="/login" class="login-link">Inicia Sesión</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RegisterFirm from './register/RegisterFirm.vue'
import RegisterClient from './register/RegisterClient.vue'
import RegisterAccountant from './register/RegisterAccountant.vue'

export default {
  name: 'Register',
  components: {
    RegisterFirm,
    RegisterClient,
    RegisterAccountant
  },
  data() {
    return {
      verifyingToken: true,
      tokenError: null,
      invitationData: null,
      currentComponent: 'RegisterFirm'
    }
  },
  async mounted() {
    const token = this.$route.query.token;
    const type = this.$route.query.type;
    
    if (token) {
      await this.verifyInvitation(token);
    } else if (type === 'public_client') {
      this.verifyingToken = false;
      this.invitationData = {
        organization_id: '11111111-1111-1111-1111-111111111111',
        role: 'cliente',
        organization_name: 'Organización Principal',
        email: '',
      };
      this.currentComponent = 'RegisterClient';
    } else {
      this.verifyingToken = false;
      this.currentComponent = 'RegisterFirm';
    }
  },
  methods: {
    async verifyInvitation(token) {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        
        const { data, error } = await supabase
          .from('invitations')
          .select('*') 
          .eq('token', token)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('La invitación no existe o ha expirado.');
        if (data.status !== 'pending') throw new Error('Esta invitación ya ha sido utilizada.');
        if (new Date(data.expires_at) < new Date()) throw new Error('La invitación ha caducado.');

        let orgName = 'la organización';
        try {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', data.organization_id)
                .maybeSingle();
            if (orgData) orgName = orgData.name;
        } catch (e) { console.warn(e); }

        this.invitationData = { ...data, organization_name: orgName };

        if (data.role === 'cliente') this.currentComponent = 'RegisterClient';
        else if (data.role === 'contador') this.currentComponent = 'RegisterAccountant';
        else this.currentComponent = 'RegisterAccountant'; 

      } catch (e) {
        console.error('Error:', e);
        this.tokenError = e.message || 'Error al verificar la invitación.';
      } finally {
        this.verifyingToken = false;
      }
    }
  }
}
</script>

<style scoped>
.signup-container {
  display: flex;
  min-height: 100vh;
  background: #fff;
  overflow: hidden;
}

/* Left Side: Visual */
.signup-visual {
  flex: 1;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow: hidden;
}

.visual-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop') center/cover;
  opacity: 0.2;
  mix-blend-mode: overlay;
}

.visual-content {
  position: relative;
  z-index: 2;
  color: white;
  max-width: 480px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 12px 24px;
  border-radius: 50px;
  margin-bottom: 40px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-logo { width: 32px; height: 32px; }
.brand-text { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }

.visual-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(to right, #fff, #ccc);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.visual-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 40px;
}

/* Testimonial */
.testimonial-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.testimonial-text {
  font-style: italic;
  margin-bottom: 16px;
  font-size: 15px;
  color: rgba(255,255,255,0.9);
}

.testimonial-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: #A81C22;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.user-info { display: flex; flex-direction: column; }
.user-info .name { font-weight: 700; font-size: 14px; }
.user-info .role { font-size: 12px; color: rgba(255,255,255,0.6); }

/* Shapes */
.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.shape-1 { width: 400px; height: 400px; background: #A81C22; top: -100px; right: -100px; }
.shape-2 { width: 300px; height: 300px; background: #E0B04F; bottom: -50px; left: -50px; }

/* Right Side: Form */
.signup-form-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
  position: relative;
  z-index: 10;
  overflow-y: auto;
}

.form-content {
  width: 100%;
  max-width: 440px;
}

.login-link {
  color: #A81C22;
  font-weight: 700;
  text-decoration: none;
  margin-left: 5px;
}

.login-link:hover { text-decoration: underline; }

/* Spinner */
.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(0,0,0,0.1);
  border-radius: 50%;
  border-top-color: #A81C22;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

.spinner.dark { border-top-color: #333; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 960px) {
  .signup-visual { display: none; }
  .signup-form-wrapper { padding: 20px; }
}

/* Animations */
.animate-fade-in { animation: fadeIn 1s ease-out; }
.animate-slide-in-right { animation: slideInRight 0.8s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.8s ease-out forwards; opacity: 0; }
.animate-slide-in-down { animation: slideInDown 0.8s ease-out; }
.animate-delay-200 { animation-delay: 0.2s; }
.animate-delay-300 { animation-delay: 0.3s; }
.animate-delay-400 { animation-delay: 0.4s; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>
