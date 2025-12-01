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
        <!-- Banner de errores de recovery (visible en dev cuando getSessionFromUrl falla) -->
        <div v-if="recoveryError" class="error-banner" style="background:#fff3f3;border:1px solid #f5c2c2;padding:12px;border-radius:8px;margin-bottom:12px;">
          <strong>Problema procesando enlace de recuperación:</strong>
          <div style="margin-top:6px">{{ recoveryError }}</div>
          <div style="margin-top:8px">
            <button class="forgot-password" @click="resendRecovery">Reenviar enlace de recuperación</button>
            <button class="forgot-password" style="margin-left:10px" @click="() => { window.open('https://app.supabase.com/project/' + '' , '_blank') }">Ver ajustes de Auth</button>
          </div>
        </div>
        
        <form v-if="!recoveryMode" @submit.prevent="iniciarSesion" class="login-form">
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
        
        <div v-if="!recoveryMode" class="login-footer animate-fade-in animate-delay-800">
          <button
            type="button"
            class="forgot-password animate-micro-bounce"
            @click="recuperarPassword"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <div style="margin-top:8px">
            <router-link to="/signup" class="forgot-password">¿No tienes cuenta? Regístrate</router-link>
          </div>
        </div>

        <!-- Recovery Mode: set new password -->
        <form v-else @submit.prevent="actualizarPassword" class="login-form">
          <div class="form-group animate-slide-in-up animate-delay-400">
            <label for="newpass" class="form-label">Nueva contraseña</label>
            <div class="input-container">
              <i class="mdi mdi-lock-reset input-icon"></i>
              <input
                id="newpass"
                v-model="newPassword"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Ingresa nueva contraseña"
                required
              />
            </div>
          </div>
          <div class="form-group animate-slide-in-up animate-delay-500">
            <label for="confirmpass" class="form-label">Confirmar contraseña</label>
            <div class="input-container">
              <i class="mdi mdi-lock-check input-icon"></i>
              <input
                id="confirmpass"
                v-model="confirmPassword"
                :type="mostrarPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Confirma la contraseña"
                required
              />
            </div>
          </div>
          <button type="submit" class="login-button" :disabled="cargando || !newPassword || newPassword!==confirmPassword">
            <span v-if="!cargando">Actualizar contraseña</span>
            <span v-else class="loading-spinner">Cargando...</span>
          </button>
          <div class="login-footer" style="text-align:center">
            <button type="button" class="forgot-password" @click="cancelarRecovery">Cancelar</button>
          </div>
        </form>
      </div>
      
      <!-- Información del sistema -->
      <!-- <div class="info-card animate-scale-in animate-delay-900">
        <div class="info-content">
          <div class="info-text animate-fade-in animate-delay-1000">
            <i class="mdi mdi-shield-check animate-pulse"></i>
            Sistema seguro y confiable
          </div>
          <div class="info-subtext animate-fade-in animate-delay-1100">
            Todos tus datos están protegidos y respaldados en la nube
          </div>
        </div>
      </div> -->
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
    debugInput() {
      console.log('Input actualizado:', this.credenciales)
    },
    
    async iniciarSesion() {
      // Validar que los campos no estén vacíos
      if (!this.credenciales.usuario || !this.credenciales.password) {
        this.error = 'Por favor, completa todos los campos requeridos'
        return
      }
      
      this.cargando = true
      this.error = ''
      
      try {
        console.log('🔑 Intentando iniciar sesión con:', this.credenciales)
        
        // Llamar al servicio de autenticación
        const { default: userService } = await import('@/services/userService')
        const result = await userService.login({
          usuario: this.credenciales.usuario,
          password: this.credenciales.password
        });
        
        console.log('🔑 Resultado del login:', result)
        
        if (result.success) {
          // Guardar datos de sesión
          localStorage.setItem('usuarioAutenticado', 'true')
          localStorage.setItem('currentUser', JSON.stringify(result.user))
          if (result.token) localStorage.setItem('authToken', result.token)
          
          // Guardar organization_id para multi-tenancy
          if (result.user.organization) {
            localStorage.setItem('current_organization_id', result.user.organization.id)
            console.log('🏢 Organization ID guardado:', result.user.organization.id)
          }
          
          // Disparar evento para actualizar Sidebar inmediatamente
          window.dispatchEvent(new CustomEvent('userUpdated', { detail: result.user }))
          
          // Redirigir al dashboard después de un inicio de sesión exitoso
          this.$router.push('/dashboard')
        } else {
          console.error('❌ Error en login:', result.message)
          alert(result.message || 'Usuario o contraseña incorrectos')
        }
      } catch (error) {
        console.error('❌ Error inesperado al iniciar sesión:', error)
        alert('Error al iniciar sesión. Inténtalo de nuevo.')
      } finally {
        this.cargando = false
      }
    },
    async recuperarPassword() {
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const email = this.credenciales.usuario?.includes('@') ? this.credenciales.usuario : `${this.credenciales.usuario}@sistema.local`
        if (!email) return alert('Ingresa tu usuario o email primero')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // Usar fragmento para evitar el flujo PKCE en pruebas locales
          redirectTo: window.location.origin + '/login#type=recovery'
        })
        if (error) {
          console.error('❌ Error al enviar email de recuperación:', error.message)
          alert('No se pudo enviar el correo de recuperación')
        } else {
          alert('Te enviamos un enlace para restablecer la contraseña')
        }
      } catch (e) {
        console.error('❌ Error inesperado en recuperación:', e)
        alert('Error al iniciar recuperación')
      }
    },

      async resendRecovery() {
        // UI helper para reenviar enlace de recuperación (si usuario puso su email)
        try {
          const { supabase } = await import('@/lib/supabaseClient')
          const email = this.credenciales.usuario?.includes('@') ? this.credenciales.usuario : `${this.credenciales.usuario}@sistema.local`
          if (!email) return alert('Ingresa tu email para reenviar el enlace de recuperación')
          this.cargando = true
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/login#type=recovery' })
          if (error) {
            console.error('❌ Error reenviando recuperación:', error)
            alert('No fue posible reenviar el enlace. Revisa la consola para más detalles.')
          } else {
            alert('Enlace de recuperación reenviado. Revisa tu correo.')
          }
        } catch (err) {
          console.error('❌ Error inesperado al reenviar recuperación:', err)
          alert('Error inesperado al reenviar enlace')
        } finally {
          this.cargando = false
        }
      },
    async actualizarPassword() {
      if (!this.newPassword || this.newPassword !== this.confirmPassword) return
      this.cargando = true
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const { error } = await supabase.auth.updateUser({ password: this.newPassword })
        if (error) {
          console.error('❌ Error al actualizar contraseña:', error.message)
          alert('No se pudo actualizar la contraseña')
        } else {
          alert('Contraseña actualizada. Inicia sesión nuevamente.')
          this.recoveryMode = false
          this.newPassword = ''
          this.confirmPassword = ''
        }
      } catch (e) {
        console.error('❌ Error inesperado al actualizar contraseña:', e)
        alert('Error al actualizar contraseña')
      } finally {
        this.cargando = false
      }
    },
    cancelarRecovery() {
      this.recoveryMode = false
      this.newPassword = ''
      this.confirmPassword = ''
      // limpiar hash
      if (window.location.hash) history.replaceState(null, '', window.location.pathname)
    }
  },
  async mounted() {
    // Verificar si ya hay una sesión activa
    const usuarioAutenticado = localStorage.getItem('usuarioAutenticado')
    if (usuarioAutenticado === 'true') {
      // Verificar también la sesión de Supabase si está disponible
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          console.log('✅ Sesión de Supabase activa encontrada')
          this.$router.push('/dashboard')
        } else {
          console.log('⚠️ No hay sesión de Supabase, pero hay datos locales')
          // Limpiar datos locales si no hay sesión de Supabase
          localStorage.removeItem('usuarioAutenticado')
          localStorage.removeItem('currentUser')
          localStorage.removeItem('authToken')
          localStorage.removeItem('current_organization_id')
        }
      } catch (error) {
        console.log('⚠️ Error al verificar sesión de Supabase, usando datos locales')
        this.$router.push('/dashboard')
      }
    }

    // Detectar flujo de recuperación (type=recovery en hash)
    try {
      const { supabase } = await import('@/lib/supabaseClient')

      // Log completo de la URL al montar para diagnóstico
      console.log('🔎 Login mounted: window.location.href=', window.location.href)
      console.log('🔎 Login mounted: window.location.search=', window.location.search)
      console.log('🔎 Login mounted: window.location.hash=', window.location.hash)

      // Mostrar la URL original guardada por main.js (si existe) para comparar
      try {
        const raw = sessionStorage.getItem('__supabase_initial_url')
        if (raw) {
          const parsed = JSON.parse(raw)
          console.log('🔁 Initial URL stored by main.js:', parsed)
          // limpiar para no repetir
          sessionStorage.removeItem('__supabase_initial_url')
        } else {
          console.log('🔁 No initial URL stored in sessionStorage')
        }
      } catch (err) {
        console.warn('⚠️ Error leyendo __supabase_initial_url:', err)
      }

      // 1) Si la URL contiene un hash con access_token (flow clásico), procesarlo
      const hash = window.location.hash || ''
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const hashType = hashParams.get('type')
      const hashAccessToken = hashParams.get('access_token')
      if (hashAccessToken) {
        console.log('🔁 Procesando access_token desde hash en Login')
        await supabase.auth.setSession({ access_token: hashAccessToken, refresh_token: hashParams.get('refresh_token') || '' })
        if (hashType === 'recovery') this.recoveryMode = true
        return
      }

      // 2) Si la URL contiene query params (por ejemplo token=pkce_...&type=recovery), usar getSessionFromUrl
      const search = window.location.search || ''
      const searchParams = new URLSearchParams(search.replace(/^\?/, ''))
      // Algunos callbacks usan `token`, `access_token` o `code` (PKCE/OAuth). Soportar todos.
      const queryToken = searchParams.get('token') || searchParams.get('access_token') || searchParams.get('code')
      const queryType = searchParams.get('type')
      if (queryToken || queryType === 'recovery') {
        console.log('🔁 Detectado token en query o type=recovery; llamando a supabase.auth.getSessionFromUrl()')
        try {
          // Algunos builds o versiones pueden exponer getSessionFromUrl, otras no.
          if (typeof supabase.auth.getSessionFromUrl === 'function') {
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true })
            if (error) {
              console.warn('⚠️ getSessionFromUrl error:', error)
            } else if (data?.session) {
              console.log('✅ getSessionFromUrl devolvió sesión:', data.session)
              if (queryType === 'recovery' || data?.provider === 'email' || window.location.hash.includes('type=recovery')) {
                this.recoveryMode = true
              }
            }
          } else if (queryToken && typeof supabase.auth.exchangeCodeForSession === 'function') {
            // Fallback para intercambiar manualmente el `code` PKCE por sesión
            try {
              console.log('🔁 Usando exchangeCodeForSession para intercambiar code=...', queryToken)
              const { data, error } = await supabase.auth.exchangeCodeForSession(queryToken)
              if (error) {
                console.warn('⚠️ exchangeCodeForSession error:', error)
              } else if (data?.session) {
                console.log('✅ exchangeCodeForSession devolvió sesión:', data.session)
                if (queryType === 'recovery' || window.location.hash.includes('type=recovery')) {
                  this.recoveryMode = true
                }
              }
            } catch (e) {
              console.warn('⚠️ Excepción en exchangeCodeForSession:', e)
            }
          } else {
            // Último recurso: detecta si la sesión ya fue guardada por el cliente (detectSessionInUrl)
            const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
            if (sessionErr) {
              console.warn('⚠️ Error obteniendo sesión tras callback:', sessionErr)
            } else if (sessionData?.session) {
              console.log('✅ sesión encontrada tras callback:', sessionData.session)
              if (queryType === 'recovery' || window.location.hash.includes('type=recovery')) this.recoveryMode = true
            } else {
              console.warn('⚠️ No se pudo intercambiar el código ni encontrar sesión automáticamente')
            }
          }
        } catch (err) {
          console.warn('⚠️ Excepción procesando callback de sesión:', err)
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo procesar el enlace de recuperación:', e)
    }
  }
}
</script>

<style scoped>
.login-container {
  background-color: var(--color-background);
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
  background: linear-gradient(135deg, #9c9c9c, #e4e4e4);
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
