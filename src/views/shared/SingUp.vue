<template>
  <div class="signup-container">
    <div class="signup-wrapper">
      <div class="signup-card animate-slide-in-up">
        <div class="signup-header">
          <div class="icon-container">
            <img src="/ADSystem/png/logo.png" alt="AD System" style="max-width:180px;height:auto" />
          </div>
          <h1 class="signup-title">Crear cuenta</h1>
          <p class="signup-subtitle">Regístrate para acceder al sistema</p>
        </div>

        <form @submit.prevent="registrar" class="signup-form">
          <div class="form-row">
            <div class="form-group">
              <label for="firstName" class="form-label">Nombre</label>
              <input id="firstName" v-model="form.first_name" type="text" class="form-input" placeholder="Nombre" required />
            </div>
            <div class="form-group">
              <label for="lastName" class="form-label">Apellido</label>
              <input id="lastName" v-model="form.last_name" type="text" class="form-input" placeholder="Apellido" required />
            </div>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Correo electrónico</label>
            <input id="email" v-model="form.email" type="email" class="form-input" placeholder="correo@ejemplo.com" required />
          </div>

          <div class="form-group">
            <label for="org" class="form-label">Empresa (opcional)</label>
            <input id="org" v-model="form.organization_name" type="text" class="form-input" placeholder="Nombre de la empresa" />
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Contraseña</label>
            <input id="password" v-model="form.password" :type="mostrarPassword ? 'text' : 'password'" class="form-input" placeholder="Contraseña" required />
          </div>

          <div class="form-group">
            <label for="confirm" class="form-label">Confirmar contraseña</label>
            <input id="confirm" v-model="form.confirmPassword" :type="mostrarPassword ? 'text' : 'password'" class="form-input" placeholder="Confirmar contraseña" required />
          </div>

          <div class="form-extra">
            <label class="checkbox-container">
              <input type="checkbox" v-model="mostrarPassword" class="checkbox-input" />
              <span class="checkbox-label">Mostrar contraseña</span>
            </label>
          </div>

          <button type="submit" class="signup-button mb-3" :disabled="cargando || !puedoEnviar">
            <span v-if="!cargando">Crear cuenta</span>
            <span v-else class="loading-spinner">Procesando...</span>
          </button>

          <div v-if="esPlanCorporate" class="corporate-contact-card">
            <div class="corporate-header">
              <i class="mdi mdi-whatsapp corporate-icon"></i>
              <div class="corporate-text">
                <strong>¿Asistencia Corporativa?</strong>
                <p>Habla directamente con ventas</p>
              </div>
            </div>
            <button type="button" class="whatsapp-outline-btn" @click="contactarVentasWhatsapp">
              Contactar Ventas
            </button>
          </div>

          <div class="signup-footer">
            <p>¿Ya tienes cuenta? <router-link to="/login">Inicia sesión</router-link></p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SingUp',
  data() {
    return {
      cargando: false,
      mostrarPassword: false,
      form: {
        first_name: '',
        last_name: '',
        email: '',
        organization_name: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  computed: {
    puedoEnviar() {
      return this.form.first_name && this.form.last_name && this.form.email && this.form.password && this.form.confirmPassword && (this.form.password === this.form.confirmPassword)
    },
    esPlanCorporate() {
      return this.$route.query.planName === 'AD Corporate Nexus';
    }
  },
  methods: {
    contactarVentasWhatsapp() {
      const q = this.$route.query;
      const periodStr = q.period === 'annual' ? 'Anual' : 'Mensual';
      const name = q.planName || 'AD Corporate Nexus';
      const price = q.planPrice || '189.00';
      const msg = `Hola, me gustaría comprar el plan ${periodStr} ${name} de $${price}.`;
      const phone = '584140945444';
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    },
    async registrar() {
      if (!this.puedoEnviar) return alert('Completa todos los campos y confirma la contraseña')
      this.cargando = true
      try {
        const { supabase } = await import('@/lib/supabaseClient')

        // Preparar metadata pública de auth (raw_user_meta_data)
        const userMeta = {
          first_name: this.form.first_name,
          last_name: this.form.last_name,
          organization_name: this.form.organization_name || null,
          provider: 'email'
        }

        // Llamada a Supabase signUp
        const { data, error } = await supabase.auth.signUp({
          email: this.form.email,
          password: this.form.password
        }, {
          data: userMeta,
          redirectTo: window.location.origin + '/login'
        })

        if (error) {
          console.error('❌ Error en signUp:', error)
          alert(error.message || 'No fue posible crear la cuenta')
          return
        }

        // Disparar evento de conversión a Google Tag Manager / Analytics
        if (window.dataLayer) {
          const planSeleccionado = this.$route.query.plan || 'Registro General';
          
          window.dataLayer.push({
            event: 'purchase',
            ecommerce: {
              transaction_id: data.user?.id || Date.now().toString(),
              value: 0, // Aquí se podría mapear el precio real
              currency: 'USD',
              items: [{
                item_name: planSeleccionado,
                item_id: planSeleccionado
              }]
            }
          });
          
          window.dataLayer.push({
            event: 'sign_up',
            method: 'email'
          });
        }

        // Éxito: informar al usuario que revise su correo para confirmar (si aplica)
        alert('Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesión.')
        // Opcional: redirigir a login para que el usuario ingrese
        this.$router.push('/login')

      } catch (e) {
        console.error('❌ Error inesperado en registro:', e)
        alert('Error al crear cuenta. Inténtalo de nuevo.')
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
.signup-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.signup-wrapper { width: 100%; max-width: 520px; }
.signup-card {
  background: rgba(255,255,255,0.98);
  border-radius: 14px;
  padding: 36px;
  box-shadow: 0 18px 36px rgba(0,0,0,0.12);
}
.signup-header { text-align:center; margin-bottom:18px }
.signup-title { font-size:24px; color:#A81C22; margin:6px 0 }
.signup-subtitle { color:#666; font-size:14px }
.form-row { display:flex; gap:12px }
.form-group { margin-bottom:14px; flex:1 }
.form-label { display:block; font-weight:600; margin-bottom:6px }
.form-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #e0e0e0 }
.form-extra { margin-bottom:12px }
.signup-button { width:100%; padding:12px; background:linear-gradient(135deg,#A81C22,#E0B04F); color:white; border:none; border-radius:8px; font-weight:700 }
.signup-footer { margin-top:12px; text-align:center; color:#666 }
.checkbox-container { display:flex; align-items:center; gap:8px }
.loading-spinner { display:inline-block }
.mb-3 { margin-bottom: 12px; }

.corporate-contact-card {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.corporate-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.corporate-icon {
  font-size: 24px;
  color: #25D366;
  background: #dcfce7;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.corporate-text strong {
  display: block;
  font-size: 14px;
  color: #166534;
}
.corporate-text p {
  margin: 0;
  font-size: 12px;
  color: #15803d;
}
.whatsapp-outline-btn {
  width: 100%;
  padding: 10px;
  background: white;
  color: #25D366;
  border: 2px solid #25D366;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}
.whatsapp-outline-btn:hover {
  background: #25D366;
  color: white;
}

@media (max-width:480px) { .form-row { flex-direction:column } }
</style>
