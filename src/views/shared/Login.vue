<template>
  <div class="login-container">
    <!-- Left Side: Visual -->
    <div class="login-visual animate-fade-in">
      <div class="visual-content">
        <div class="brand-badge animate-slide-in-down">
          <img src="@/assets/icon-adaptableV2.svg" alt="Logo" class="brand-logo" />
          <span class="brand-text">System</span>
        </div>
        <h1 class="visual-title animate-slide-in-up animate-delay-200">
          Bienvenido de nuevo
        </h1>
        <p class="visual-subtitle animate-slide-in-up animate-delay-300">
          Gestiona tu negocio de manera inteligente y eficiente.
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
           <img src="@/assets/icon-adaptableV2.svg" alt="Logo" style="width: 48px;" />
           <h2 class="mt-2 text-h5 font-weight-bold">System</h2>
        </div>

        <div class="form-header">
          <h2 class="form-title">Iniciar Sesión</h2>
          <p class="form-subtitle">Ingresa tus credenciales para acceder</p>
        </div>

        <!-- Banner de errores de recovery -->
        <div v-if="recoveryError" class="error-banner animate-shake">
          <i class="mdi mdi-alert-circle mr-2"></i>
          <div>
            <strong>Error de recuperación:</strong>
            <div>{{ recoveryError }}</div>
            <button class="text-btn mt-2" @click="resendRecovery">Reenviar enlace</button>
          </div>
        </div>
        
        <form v-if="!recoveryMode" @submit.prevent="iniciarSesion" class="main-form">
          <div class="form-group">
            <label for="usuario" class="form-label">Usuario o Email</label>
            <div class="input-wrapper">
              <i class="mdi mdi-account-outline input-icon"></i>
              <input
                id="usuario"
                v-model="credenciales.usuario"
                type="text"
                class="form-input"
                placeholder="ejemplo@correo.com"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <div class="input-wrapper">
              <i class="mdi mdi-lock-outline input-icon"></i>
              <input
                id="password"
                v-model="credenciales.password"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                class="password-toggle"
                @click="mostrarPassword = !mostrarPassword"
              >
                <i :class="mostrarPassword ? 'mdi mdi-eye-off' : 'mdi mdi-eye'"></i>
              </button>
            </div>
            <div class="text-right mt-2">
              <button type="button" class="forgot-link" @click="recuperarPassword">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="custom-checkbox">
              <input v-model="recordarSesion" type="checkbox" />
              <span class="checkmark"></span>
              <span class="label-text">Recordar sesión</span>
            </label>
          </div>
          
          <button
            type="submit"
            class="submit-btn"
            :disabled="cargando || !credenciales.usuario || !credenciales.password"
          >
            <span v-if="!cargando">Ingresar</span>
            <div v-else class="spinner"></div>
          </button>

          <div class="divider">
            <span>o</span>
          </div>

          <div class="text-center mt-6">
            <span class="text-grey">¿No tienes cuenta?</span>
            <router-link to="/signup?type=public_client" class="register-link">Regístrate aquí</router-link>
          </div>
        </form>
        
        <!-- Recovery Mode Form -->
        <form v-else @submit.prevent="actualizarPassword" class="main-form">
          <div class="form-header mb-6">
            <h3 class="text-h6">Restablecer Contraseña</h3>
          </div>
          
          <div class="form-group">
            <label class="form-label">Nueva contraseña</label>
            <div class="input-wrapper">
              <i class="mdi mdi-lock-reset input-icon"></i>
              <input
                v-model="newPassword"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Nueva contraseña"
                required
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Confirmar contraseña</label>
            <div class="input-wrapper">
              <i class="mdi mdi-lock-check input-icon"></i>
              <input
                v-model="confirmPassword"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Confirma contraseña"
                required
              />
            </div>
          </div>

          <div class="action-buttons">
            <button type="submit" class="submit-btn" :disabled="cargando">
              <span v-if="!cargando">Actualizar</span>
              <div v-else class="spinner"></div>
            </button>
            <button type="button" class="cancel-btn" @click="cancelarRecovery">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      cargando: false,
      recordarSesion: false,
      mostrarPassword: false,
      credenciales: {
        usuario: '',
        password: ''
      },
      recoveryMode: false,
      recoveryError: '',
      newPassword: '',
      confirmPassword: '',
      error: ''
    }
  },
  methods: {
    async iniciarSesion() {
      if (!this.credenciales.usuario || !this.credenciales.password) return
      
      this.cargando = true
      this.error = ''
      
      try {
        const { default: userService } = await import('@/services/userService')
        const result = await userService.login({
          usuario: this.credenciales.usuario,
          password: this.credenciales.password
        });
        
        if (result.success) {
          localStorage.setItem('usuarioAutenticado', 'true')
          localStorage.setItem('currentUser', JSON.stringify(result.user))
          if (result.token) localStorage.setItem('authToken', result.token)
          
          if (result.user.organization) {
            localStorage.setItem('current_organization_id', result.user.organization.id)
          }
          
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }))
          this.$router.push('/dashboard')
        } else {
          alert(result.message || 'Usuario o contraseña incorrectos')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Error al iniciar sesión.')
      } finally {
        this.cargando = false
      }
    },
    async recuperarPassword() {
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const email = this.credenciales.usuario?.includes('@') ? this.credenciales.usuario : `${this.credenciales.usuario}@sistema.local`
        if (!email) return alert('Ingresa tu email primero')
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login#type=recovery'
        })
        
        if (error) throw error
        alert('Te enviamos un enlace para restablecer la contraseña')
      } catch (e) {
        alert('Error al iniciar recuperación: ' + e.message)
      }
    },
    async actualizarPassword() {
      if (!this.newPassword || this.newPassword !== this.confirmPassword) return
      this.cargando = true
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const { error } = await supabase.auth.updateUser({ password: this.newPassword })
        if (error) throw error
        
        alert('Contraseña actualizada. Inicia sesión nuevamente.')
        this.recoveryMode = false
        this.newPassword = ''
        this.confirmPassword = ''
      } catch (e) {
        alert('Error al actualizar contraseña: ' + e.message)
      } finally {
        this.cargando = false
      }
    },
    cancelarRecovery() {
      this.recoveryMode = false
      this.newPassword = ''
      this.confirmPassword = ''
      if (window.location.hash) history.replaceState(null, '', window.location.pathname)
    },
    // ... (Mantener lógica de mounted para recovery flow) ...
  },
  async mounted() {
    // Lógica existente de mounted para verificar sesión y recovery
    // ... (Copiar lógica original simplificada) ...
    const usuarioAutenticado = localStorage.getItem('usuarioAutenticado')
    if (usuarioAutenticado === 'true') {
       this.$router.push('/dashboard')
    }
    
    // Detectar recovery
    if (window.location.hash.includes('type=recovery')) {
        this.recoveryMode = true;
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  min-height: 100vh;
  background: #fff;
  overflow: hidden;
}

/* Left Side: Visual */
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

.brand-logo {
  width: 32px;
  height: 32px;
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

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
}

/* Shapes */
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

/* Right Side: Form */
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

.forgot-link {
  background: none;
  border: none;
  color: #A81C22;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Checkbox */
.custom-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  margin-right: 10px;
  position: relative;
  transition: all 0.2s ease;
}

.custom-checkbox input:checked ~ .checkmark {
  background: #A81C22;
  border-color: #A81C22;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.label-text {
  color: #666;
  font-size: 14px;
}

/* Submit Button */
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

/* Divider */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 30px 0;
  color: #999;
  font-size: 14px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e0e0e0;
}

.divider span {
  padding: 0 10px;
}

.register-link {
  color: #A81C22;
  font-weight: 700;
  text-decoration: none;
  margin-left: 5px;
}

.register-link:hover {
  text-decoration: underline;
}

/* Spinner */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 960px) {
  .login-visual {
    display: none;
  }
  
  .login-form-wrapper {
    max-width: 100%;
  }
}

/* Animations */
.animate-fade-in { animation: fadeIn 1s ease-out; }
.animate-slide-in-right { animation: slideInRight 0.8s ease-out; }
.animate-slide-in-up { animation: slideInUp 0.8s ease-out forwards; opacity: 0; }
.animate-slide-in-down { animation: slideInDown 0.8s ease-out; }
.animate-delay-200 { animation-delay: 0.2s; }
.animate-delay-300 { animation-delay: 0.3s; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>
