<template>
  <div class="landing-container">
    <nav class="navbar animate-fade-in-down">
      <div class="logo-container">
        <img src="@/assets/icon-adaptableV2.svg" alt="Logo" class="logo-icon" />
        <span class="brand-name">Sistema Contable</span>
      </div>
      <div class="nav-buttons">
        <a href="#pricing" class="nav-btn text-grey-darken-2" @click.prevent="scrollToPricing">Precios</a>
        <router-link to="/login" class="nav-btn login-btn">Iniciar Sesión</router-link>
        <router-link :to="{ path: '/signup', query: { type: 'public_client' }}" class="nav-btn register-btn">Registrarse</router-link>
      </div>
    </nav>

    <main class="hero-section">
      <div class="hero-content animate-slide-in-up">
        <h1 class="hero-title">
          Gestión Contable <br>
          <span class="highlight">Inteligente y Simple</span>
        </h1>
        <p class="hero-subtitle">
          Optimiza tus finanzas, automatiza tu facturación y mantén el control total de tu negocio con nuestra plataforma integral.
        </p>
        <div class="cta-group">
          <router-link :to="{ path: '/signup', query: { type: 'public_client' }}" class="cta-button primary-cta">
            Comenzar Ahora
            <i class="mdi mdi-arrow-right ml-2"></i>
          </router-link>
          <router-link to="/login" class="cta-button secondary-cta">
            Ya tengo cuenta
          </router-link>
        </div>
      </div>
      
      <div class="hero-visual animate-fade-in animate-delay-500">
        <div class="visual-card card-1">
          <div class="card-header">
            <div class="dot red"></div>
            <div class="dot yellow"></div>
            <div class="dot green"></div>
          </div>
          <div class="card-body">
            <div class="chart-placeholder">
              <div class="bar bar-1"></div>
              <div class="bar bar-2"></div>
              <div class="bar bar-3"></div>
              <div class="bar bar-4"></div>
            </div>
          </div>
        </div>
        <div class="visual-card card-2 floating">
          <i class="mdi mdi-check-circle-outline success-icon"></i>
          <div class="text-content">
            <span class="title">Factura Enviada</span>
            <span class="subtitle">Hace 2 min</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Pricing Section -->
    <PricingSection @select-plan="handlePlanSelection" />
    
    <div class="background-shapes">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
    </div>
  </div>
</template>

<script>
import PricingSection from '@/components/sections/PricingSection.vue'

export default {
  name: 'LandingPage',
  components: {
    PricingSection
  },
  methods: {
    scrollToPricing() {
      const element = document.getElementById('pricing');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    handlePlanSelection(planId) {
      // Redirect to signup with plan pre-selected
      this.$router.push({ 
        path: '/signup', 
        query: { 
          type: 'public_client',
          plan: planId 
        } 
      });
    }
  }
}
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
  background-color: #f8f9fa;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  color: #333;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  position: relative;
  z-index: 10;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.nav-buttons {
  display: flex;
  gap: 16px;
}

.nav-btn {
  text-decoration: none;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.login-btn {
  color: #666;
}

.login-btn:hover {
  color: #A81C22;
  background: rgba(168, 28, 34, 0.05);
}

.register-btn {
  background-color: #A81C22;
  color: white;
  box-shadow: 0 4px 12px rgba(168, 28, 34, 0.2);
}

.register-btn:hover {
  background-color: #8B1A1F;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(168, 28, 34, 0.3);
}

/* Hero Section */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60px 80px;
  min-height: calc(100vh - 80px);
  position: relative;
  z-index: 5;
}

.hero-content {
  max-width: 600px;
}

.hero-title {
  font-size: 56px;
  line-height: 1.1;
  font-weight: 800;
  margin-bottom: 24px;
  color: #1a1a1a;
}

.highlight {
  background: linear-gradient(135deg, #A81C22, #E0B04F);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 20px;
  line-height: 1.6;
  color: #666;
  margin-bottom: 40px;
  max-width: 500px;
}

.cta-group {
  display: flex;
  gap: 20px;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 32px;
  border-radius: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
}

.primary-cta {
  background: linear-gradient(135deg, #A81C22, #E0B04F);
  color: white;
  box-shadow: 0 10px 25px rgba(168, 28, 34, 0.3);
}

.primary-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 35px rgba(168, 28, 34, 0.4);
}

.secondary-cta {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
}

.secondary-cta:hover {
  border-color: #A81C22;
  color: #A81C22;
  background: #fff;
}

/* Hero Visual */
.hero-visual {
  position: relative;
  width: 500px;
  height: 400px;
}

.visual-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  position: absolute;
}

.card-1 {
  width: 380px;
  height: 280px;
  top: 40px;
  left: 0;
  z-index: 1;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 30px;
}

.dot { width: 12px; height: 12px; border-radius: 50%; }
.red { background: #ff5f56; }
.yellow { background: #ffbd2e; }
.green { background: #27c93f; }

.chart-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 180px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.bar {
  width: 40px;
  background: #f0f0f0;
  border-radius: 8px 8px 0 0;
  transition: height 1s ease;
}

.bar-1 { height: 40%; background: #ffebee; }
.bar-2 { height: 70%; background: #ffcdd2; }
.bar-3 { height: 50%; background: #ef9a9a; }
.bar-4 { height: 85%; background: linear-gradient(to top, #A81C22, #E0B04F); }

.card-2 {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  bottom: 60px;
  right: -20px;
  z-index: 2;
  animation: float 6s ease-in-out infinite;
}

.success-icon {
  font-size: 32px;
  color: #4caf50;
}

.text-content {
  display: flex;
  flex-direction: column;
}

.title { font-weight: 700; font-size: 14px; color: #333; }
.subtitle { font-size: 12px; color: #999; }

/* Background Shapes */
.background-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.shape-1 {
  width: 600px;
  height: 600px;
  background: #fce4ec;
  top: -200px;
  right: -100px;
}

.shape-2 {
  width: 500px;
  height: 500px;
  background: #fff8e1;
  bottom: -100px;
  left: -100px;
}

/* Animations */
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}

.animate-fade-in-down { animation: fadeInDown 0.8s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.8s ease-out; }
.animate-fade-in { animation: fadeIn 1s ease-out forwards; opacity: 0; }
.animate-delay-500 { animation-delay: 0.5s; }

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  to { opacity: 1; }
}

/* Responsive */
@media (max-width: 960px) {
  .hero-section {
    flex-direction: column;
    padding: 40px 20px;
    text-align: center;
  }
  
  .hero-content {
    margin-bottom: 60px;
  }
  
  .hero-title { font-size: 42px; }
  
  .hero-subtitle { margin: 0 auto 40px; }
  
  .cta-group { justify-content: center; }
  
  .hero-visual { width: 100%; max-width: 400px; height: 300px; }
  
  .card-1 { width: 100%; left: 0; }
  .card-2 { right: 0; bottom: 20px; }
}
</style>
