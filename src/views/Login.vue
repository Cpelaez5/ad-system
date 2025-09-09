<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="login-card animate-slide-in-up">
        <div class="login-header">
          <div class="icon-container animate-micro-rotate">
            <img 
              src="@/assets/icon-adaptableV2.svg" 
              alt="Logo" 
              class="logo-icon"
              style="width: 48px; height: 48px;"
            />
          </div>
          <h1 class="login-title animate-fade-in animate-delay-200">Sistema Contable</h1>
          <p class="login-subtitle animate-fade-in animate-delay-300">
            Inicia sesión para acceder al sistema
          </p>
        </div>
        
        <form @submit.prevent="iniciarSesion" class="login-form">
          <div class="form-group animate-slide-in-up animate-delay-400">
            <label for="usuario" class="form-label">Usuario</label>
            <div class="input-container">
              <i class="mdi mdi-account input-icon"></i>
              <input
                id="usuario"
                v-model="credenciales.usuario"
                type="text"
                class="form-input"
                placeholder="Ingresa tu usuario"
                required
                @input="debugInput"
              />
            </div>
          </div>
          
          <div class="form-group animate-slide-in-up animate-delay-500">
            <label for="password" class="form-label">Contraseña</label>
            <div class="input-container">
              <i class="mdi mdi-lock input-icon"></i>
              <input
                id="password"
                v-model="credenciales.password"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Ingresa tu contraseña"
                required
                @input="debugInput"
              />
              <button
                type="button"
                class="password-toggle"
                @click="mostrarPassword = !mostrarPassword"
                :title="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              >
                <i :class="mostrarPassword ? 'mdi mdi-eye-off' : 'mdi mdi-eye'"></i>
              </button>
            </div>
          </div>
          
          <div class="form-group animate-fade-in animate-delay-600">
            <label class="checkbox-container">
              <input
                v-model="recordarSesion"
                type="checkbox"
                class="checkbox-input"
              />
              <span class="checkbox-label">Recordar sesión</span>
            </label>
          </div>
          
          <button
            type="submit"
            class="login-button animate-hover-lift animate-delay-700"
            :disabled="cargando || !credenciales.usuario || !credenciales.password"
          >
            <span v-if="!cargando">Iniciar Sesión</span>
            <span v-else class="loading-spinner">Cargando...</span>
          </button>
        </form>
        
        <div class="login-footer animate-fade-in animate-delay-800">
          <button
            type="button"
            class="forgot-password animate-micro-bounce"
            @click="recuperarPassword"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>
      
      <!-- Información del sistema -->
      <div class="info-card animate-scale-in animate-delay-900">
        <div class="info-content">
          <div class="info-text animate-fade-in animate-delay-1000">
            <i class="mdi mdi-shield-check animate-pulse"></i>
            Sistema seguro y confiable
          </div>
          <div class="info-subtext animate-fade-in animate-delay-1100">
            Todos tus datos están protegidos y respaldados en la nube
          </div>
        </div>
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
      }
    }
  },
  methods: {
    debugInput() {
      console.log('Input detectado:', this.credenciales)
    },
    async iniciarSesion() {
      console.log('Intentando iniciar sesión...')
      console.log('Credenciales:', this.credenciales)
      
      // Validar que los campos no estén vacíos
      if (!this.credenciales.usuario || !this.credenciales.password) {
        alert('Por favor, completa todos los campos requeridos')
        return
      }
      
      this.cargando = true
      
      try {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Datos de usuarios válidos
        const usuariosValidos = [
          { username: 'admin', password: 'admin123', role: 'admin' },
          { username: 'contador', password: 'contador123', role: 'contador' },
          { username: 'auditor', password: 'auditor123', role: 'auditor' },
          { username: 'facturador', password: 'facturador123', role: 'facturador' },
          { username: 'operador', password: 'operador123', role: 'operador' },
          { username: 'consultor', password: 'consultor123', role: 'consultor' }
        ]
        
        // Buscar usuario válido
        const usuarioValido = usuariosValidos.find(u => 
          u.username === this.credenciales.usuario && 
          u.password === this.credenciales.password
        )
        
        if (usuarioValido) {
          // Crear objeto de usuario
          const user = {
            id: 1,
            username: usuarioValido.username,
            email: `${usuarioValido.username}@sistema.com`,
            firstName: usuarioValido.username.charAt(0).toUpperCase() + usuarioValido.username.slice(1),
            lastName: 'Usuario',
            role: usuarioValido.role,
            isActive: true,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          }
          
          // Guardar información de sesión
          localStorage.setItem('usuarioAutenticado', 'true')
          localStorage.setItem('currentUser', JSON.stringify(user))
          localStorage.setItem('authToken', `token-${user.id}-${Date.now()}`)
          
          console.log('Usuario autenticado:', user)
          
          // Redirigir al dashboard
          this.$router.push('/dashboard')
        } else {
          // Mostrar error
          alert('Usuario o contraseña incorrectos')
        }
      } catch (error) {
        console.error('Error al iniciar sesión:', error)
        alert('Error al iniciar sesión. Inténtalo de nuevo.')
      } finally {
        this.cargando = false
      }
    },
    recuperarPassword() {
      // Implementar recuperación de contraseña
      alert('Funcionalidad de recuperación de contraseña en desarrollo')
    }
  },
  mounted() {
    // Verificar si ya hay una sesión activa
    const usuarioAutenticado = localStorage.getItem('usuarioAutenticado')
    if (usuarioAutenticado === 'true') {
      this.$router.push('/dashboard')
    }
  }
}
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-wrapper {
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon-container {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #A81C22, #E0B04F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  font-size: 32px;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #A81C22;
  margin: 0 0 10px 0;
}

.login-subtitle {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.login-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.input-container {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 18px;
  z-index: 2;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
  z-index: 2;
}

.password-toggle:hover {
  color: #A81C22;
  background: rgba(168, 28, 34, 0.1);
}

.form-input {
  width: 100%;
  padding: 12px 45px 12px 45px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #A81C22;
  box-shadow: 0 0 0 3px rgba(168, 28, 34, 0.1);
  transform: scale(1.02);
}

.form-input::placeholder {
  color: #999;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-input {
  margin-right: 10px;
  width: 18px;
  height: 18px;
  accent-color: #A81C22;
}

.checkbox-label {
  color: #666;
  font-size: 14px;
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #A81C22, #E0B04F);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(168, 28, 34, 0.3);
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner::after {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-left: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.login-footer {
  text-align: center;
}

.forgot-password {
  background: none;
  border: none;
  color: #A81C22;
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  transition: all 0.3s ease;
}

.forgot-password:hover {
  color: #8B1A1F;
  transform: scale(1.05);
}

.info-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  text-align: center;
  backdrop-filter: blur(5px);
}

.info-content {
  color: #666;
}

.info-text {
  font-size: 14px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.info-subtext {
  font-size: 12px;
  color: #999;
}

/* Responsive */
@media (max-width: 480px) {
  .login-container {
    padding: 10px;
  }
  
  .login-card {
    padding: 30px 20px;
  }
  
  .login-title {
    font-size: 24px;
  }
  
  .icon-container {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
}
</style>
