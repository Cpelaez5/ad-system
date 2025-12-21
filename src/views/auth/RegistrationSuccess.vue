<template>
  <div class="success-container">
    <div class="success-card animate-fade-in">
      <div class="icon-circle">
        <v-icon size="48" color="success">mdi-email-check</v-icon>
      </div>
      
      <h1 class="text-h4 font-weight-bold mb-4">¡Tu cuenta ha sido creada!</h1>
      
      <p class="text-body-1 text-medium-emphasis mb-6">
        Hemos enviado un correo de confirmación a:
        <br>
        <strong>{{ maskedEmail }}</strong>
      </p>
      
      <div class="actions">
        <v-btn
          color="primary"
          size="large"
          block
          class="mb-4"
          :loading="loading"
          :disabled="cooldown > 0"
          @click="resendEmail"
        >
          {{ cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar correo' }}
        </v-btn>
        
        <v-btn
          variant="text"
          block
          to="/login"
        >
          Volver al inicio de sesión
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RegistrationSuccess',
  data() {
    return {
      email: '',
      loading: false,
      cooldown: 0
    }
  },
  computed: {
    maskedEmail() {
      if (!this.email) return 'tu correo';
      const [name, domain] = this.email.split('@');
      const maskedName = name.substring(0, 1) + '****' + name.substring(name.length - 1);
      return `${maskedName}@${domain}`;
    }
  },
  mounted() {
    this.email = this.$route.query.email || '';
  },
  methods: {
    async resendEmail() {
      if (this.cooldown > 0) return;
      
      this.loading = true;
      // Simulate API call or implement actual resend logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.loading = false;
      this.startCooldown();
      alert('Correo reenviado. Revisa tu bandeja de entrada y spam.');
    },
    startCooldown() {
      this.cooldown = 60;
      const interval = setInterval(() => {
        this.cooldown--;
        if (this.cooldown <= 0) clearInterval(interval);
      }, 1000);
    }
  }
}
</script>

<style scoped>
.success-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  padding: 20px;
}

.success-card {
  background: white;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.05);
  text-align: center;
  max-width: 480px;
  width: 100%;
}

.icon-circle {
  width: 80px;
  height: 80px;
  background-color: #e8f5e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
