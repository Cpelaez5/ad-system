<template>
  <div class="login-container">
    <!-- Left Side: Visual -->
    <div class="login-visual animate-fade-in">
      <div class="visual-content">
        <div class="brand-badge animate-slide-in-down">
          <img :src="'/ADSystem/png/logo.png'" alt="AD System" class="brand-logo-full" />
        </div>
        <h1 class="visual-title animate-slide-in-up animate-delay-200">
          Activa tu cuenta
        </h1>
        <p class="visual-subtitle animate-slide-in-up animate-delay-300">
          Estás a un paso de comenzar a usar AD System.
        </p>
      </div>
      <div class="visual-overlay"></div>
      <!-- Abstract shapes/background -->
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
    </div>

    <!-- Right Side: Form -->
    <div class="login-form-wrapper animate-slide-in-right">
      <div class="form-content">
        <div class="mobile-brand d-md-none mb-8 text-center">
           <img :src="'/ADSystem/png/logo.png'" alt="AD System" style="max-width: 200px; height: auto;" />
        </div>

        <!-- 1. Cargando Verificación -->
        <div v-if="cargandoVerificacion" class="text-center py-10">
          <div class="spinner large-spinner mb-4"></div>
          <p class="text-grey">Verificando invitación de seguridad...</p>
        </div>

        <!-- 2. Enlace Expirado -->
        <div v-else-if="linkExpired" class="error-banner animate-shake">
          <i class="mdi mdi-alert-circle mr-2" style="font-size: 24px;"></i>
          <div>
            <strong>El enlace es inválido o ha expirado</strong>
            <div class="mt-1">Por tu seguridad, los enlaces de invitación expiran. Solicita una nueva invitación al administrador de tu sistema.</div>
            <router-link to="/login" class="text-btn mt-4 d-inline-block">Ir al Inicio de Sesión</router-link>
          </div>
        </div>

        <!-- 3. Formulario Activo (solo cuando la sesión se detectó exitosamente) -->
        <div v-else-if="sessionUser">
          <div class="form-header">
            <h2 class="form-title">¡Hola, {{ userName }}!</h2>
            <p class="form-subtitle">Define tu nueva contraseña para acceder a AD System (Rol: {{ userRoleFormat }})</p>
          </div>

          <form @submit.prevent="savePassword" class="main-form">
            <div class="form-group">
              <label for="password" class="form-label">Nueva Contraseña</label>
              <div class="input-wrapper">
                <i class="mdi mdi-lock-outline input-icon"></i>
                <input
                  id="password"
                  v-model="password"
                  :type="mostrarPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Mínimo 8 caracteres"
                  required
                  minlength="8"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="mostrarPassword = !mostrarPassword"
                >
                  <i :class="mostrarPassword ? 'mdi mdi-eye-off' : 'mdi mdi-eye'"></i>
                </button>
              </div>
            </div>
            <!-- Indicador de fortaleza de contraseña -->
            <div v-if="password" class="strength-meter mt-2">
              <div class="strength-bar">
                <div class="strength-fill" :style="{ width: (passwordStrength.level * 25) + '%', backgroundColor: passwordStrength.color }"></div>
              </div>
              <span class="strength-label" :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
            </div>
            
            <div class="form-group">
              <label for="confirmPassword" class="form-label">Confirmar Contraseña</label>
              <div class="input-wrapper">
                <i class="mdi mdi-lock-check-outline input-icon"></i>
                <input
                  id="confirmPassword"
                  v-model="confirmPassword"
                  :type="mostrarPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Confirma la contraseña"
                  required
                />
              </div>
              <div v-if="passwordError" class="text-error mt-2" style="color: #A81C22; font-size: 13px;">
                <i class="mdi mdi-alert-circle mr-1"></i> {{ passwordError }}
              </div>
              <div v-else-if="confirmPassword && isPasswordValid" class="text-success mt-2" style="color: #10B981; font-size: 13px;">
                <i class="mdi mdi-check-circle mr-1"></i> Las contraseñas coinciden
              </div>
            </div>
            
            <div v-if="errorMessage" class="error-banner animate-shake mt-4">
              <i class="mdi mdi-alert-circle mr-2" style="font-size: 20px;"></i>
              <div>{{ errorMessage }}</div>
            </div>

            <button
              type="submit"
              class="submit-btn mt-6"
              :disabled="cargando || !isPasswordValid"
            >
              <span v-if="!cargando">Activar Cuenta y Acceder</span>
              <div v-else class="spinner"></div>
            </button>
          </form>
        </div>

        <!-- 4. Estado inesperado: sin sesión y sin expiración (fallback defensivo) -->
        <div v-else class="text-center py-10">
          <p class="text-grey">Procesando enlace de invitación...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SetPassword',
  data() {
    return {
      cargandoVerificacion: true,
      cargando: false,
      linkExpired: false,
      sessionUser: null,
      userName: '',
      userRole: '',
      password: '',
      confirmPassword: '',
      mostrarPassword: false,
      errorMessage: '',
      authTimeout: null,
      authSubscription: null
    }
  },
  computed: {
    passwordError() {
      if (this.confirmPassword && this.password !== this.confirmPassword) {
        return 'Las contraseñas no coinciden'
      }
      return ''
    },
    userRoleFormat() {
      if (!this.userRole) return ''
      return this.userRole === 'super_admin' ? 'Super Administrador' : 
             this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1)
    },
    isPasswordValid() {
      return this.password.length >= 8 && this.password === this.confirmPassword
    },
    passwordStrength() {
      const pwd = this.password
      if (!pwd) return { level: 0, label: '', color: '' }
      let score = 0
      if (pwd.length >= 8) score++
      if (/[A-Z]/.test(pwd)) score++
      if (/[0-9]/.test(pwd)) score++
      if (/[^A-Za-z0-9]/.test(pwd)) score++
      const levels = [
        { level: 0, label: '', color: '' },
        { level: 1, label: 'Débil', color: '#ef4444' },
        { level: 2, label: 'Regular', color: '#f59e0b' },
        { level: 3, label: 'Buena', color: '#22c55e' },
        { level: 4, label: 'Fuerte', color: '#16a34a' }
      ]
      return levels[score] || levels[0]
    }
  },
  methods: {
    async savePassword() {
      if (!this.isPasswordValid) return
      this.errorMessage = ''
      if (this.password.length < 8) {
        this.errorMessage = 'La contraseña debe tener al menos 8 caracteres.'
        return
      }
      
      this.cargando = true
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const { error: updateError } = await supabase.auth.updateUser({ password: this.password })
        
        if (updateError) throw updateError
        
        // Activar el perfil en public.users
        const { error: dbError } = await supabase
          .from('users')
          .update({ is_active: true })
          .eq('id', this.sessionUser.id)

        if (dbError) throw dbError
        
        // Redirigir al usuario (sin tocar localStorage aquí, supabase auth persistirá sesión)
        this.$router.push('/dashboard')
      } catch (error) {
        console.error('Error al actualizar contraseña:', error)
        this.errorMessage = 'Ocurrió un error al configurar la contraseña: ' + (error.message || 'Error desconocido')
      } finally {
        this.cargando = false
      }
    }
  },
  async mounted() {
    // 1. Iniciar timeout de 3 segundos para el modo asíncrono
    this.authTimeout = setTimeout(() => {
      if (!this.sessionUser) {
        this.cargandoVerificacion = false
        this.linkExpired = true
      }
    }, 3000)

    // 2. Escuchar cambios de estado
    const { supabase } = await import('@/lib/supabaseClient')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        clearTimeout(this.authTimeout)
        this.sessionUser = session.user
        this.userName = session.user.user_metadata?.first_name || session.user.email?.split('@')[0]
        this.userRole = session.user.user_metadata?.role
        this.linkExpired = false
        this.cargandoVerificacion = false
      }
    })
    
    this.authSubscription = subscription
  },
  beforeUnmount() {
    if (this.authTimeout) clearTimeout(this.authTimeout)
    if (this.authSubscription) this.authSubscription.unsubscribe()
  }
}
</script>

<style scoped>
/* Utilizar los mismos estilos que Login.vue para consistencia */
.login-container {
  display: flex;
  min-height: 100vh;
  background: #fff;
  overflow: hidden;
}

.login-visual {
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
  background: url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop') center/cover;
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

.brand-logo-full {
  height: 36px;
  width: auto;
  filter: brightness(0) invert(1);
}

.visual-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
  background: linear-gradient(to right, #fff, #ccc);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.visual-subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: #A81C22;
  top: -100px;
  right: -100px;
}

.shape-2 {
  width: 300px;
  height: 300px;
  background: #E0B04F;
  bottom: -50px;
  left: -50px;
}

.login-form-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
  max-width: 600px;
  position: relative;
  z-index: 10;
}

.form-content {
  width: 100%;
  max-width: 400px;
}

.form-header {
  margin-bottom: 40px;
}

.form-title {
  font-size: 32px;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.form-subtitle {
  color: #666;
  font-size: 16px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  font-size: 20px;
}

.form-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.form-input:focus {
  outline: none;
  border-color: #A81C22;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(168, 28, 34, 0.1);
}

.password-toggle {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background: #A81C22;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 20px rgba(168, 28, 34, 0.2);
}

.submit-btn:hover:not(:disabled) {
  background: #8B1A1F;
  transform: translateY(-2px);
  box-shadow: 0 15px 30px rgba(168, 28, 34, 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #FEF2F2;
  border: 1px solid #FCA5A5;
  border-radius: 12px;
  color: #991B1B;
  margin-bottom: 24px;
}

.text-btn {
  background: none;
  border: none;
  color: #A81C22;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.strength-meter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-label {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

.large-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(168, 28, 34, 0.2);
  border-top-color: #A81C22;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 960px) {
  .login-visual {
    display: none;
  }
  .login-form-wrapper {
    max-width: 100%;
  }
}

.animate-fade-in { animation: fadeIn 1s ease-out; }
.animate-slide-in-right { animation: slideInRight 0.8s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.8s ease-out forwards; opacity: 0; }
.animate-slide-in-down { animation: slideInDown 0.8s ease-out; }
.animate-delay-200 { animation-delay: 0.2s; }
.animate-delay-300 { animation-delay: 0.3s; }
.animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
</style>
