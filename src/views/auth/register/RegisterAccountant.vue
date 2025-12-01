<template>
  <div class="signup-card animate-slide-in-up">
    <div class="signup-header">
      <div class="icon-container animate-micro-rotate">
        <img src="@/assets/icon-adaptableV2.svg" alt="Logo" class="logo-icon" style="width:48px;height:48px" />
      </div>
      <h1 class="signup-title">Registro de Contador</h1>
      <p class="signup-subtitle">Únete al equipo de <strong>{{ invitation?.organization_name || 'la firma' }}</strong></p>
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
        <input id="email" v-model="form.email" type="email" class="form-input" readonly disabled />
        <small class="text-muted">Vinculado a la invitación</small>
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

      <button type="submit" class="signup-button" :disabled="cargando || !puedoEnviar">
        <span v-if="!cargando">Registrar Cuenta</span>
        <span v-else class="loading-spinner">Procesando...</span>
      </button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'RegisterAccountant',
  props: {
    invitation: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      cargando: false,
      mostrarPassword: false,
      form: {
        first_name: '',
        last_name: '',
        email: this.invitation.email,
        password: '',
        confirmPassword: ''
      }
    }
  },
  computed: {
    puedoEnviar() {
      return this.form.first_name && this.form.last_name && this.form.password && this.form.confirmPassword && (this.form.password === this.form.confirmPassword)
    }
  },
  methods: {
    async registrar() {
      if (!this.puedoEnviar) return;
      this.cargando = true;
      try {
        const { supabase } = await import('@/lib/supabaseClient')

        const userMeta = {
          first_name: this.form.first_name,
          last_name: this.form.last_name,
          username: this.form.email.split('@')[0],
          role: 'contador',
          organization_id: this.invitation.organization_id
        }

        const { error } = await supabase.auth.signUp({
          email: this.form.email,
          password: this.form.password,
          options: { data: userMeta }
        })

        if (error) throw error

        // Marcar invitación como aceptada
        await supabase
          .from('invitations')
          .update({ status: 'accepted' })
          .eq('id', this.invitation.id);

        alert('Cuenta creada exitosamente.')
        this.$router.push('/login')

      } catch (e) {
        console.error('❌ Error:', e)
        alert(e.message || 'Error al registrar contador')
      } finally {
        this.cargando = false
      }
    }
  }
}
</script>

<style scoped>
/* Reutilizar estilos */
.signup-card { background: rgba(255,255,255,0.98); border-radius: 14px; padding: 36px; box-shadow: 0 18px 36px rgba(0,0,0,0.12); }
.signup-header { text-align:center; margin-bottom:18px }
.signup-title { font-size:24px; color:#A81C22; margin:6px 0 }
.signup-subtitle { color:#666; font-size:14px }
.form-row { display:flex; gap:12px }
.form-group { margin-bottom:14px; flex:1 }
.form-label { display:block; font-weight:600; margin-bottom:6px }
.form-input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid #e0e0e0 }
.form-extra { margin-bottom:12px }
.signup-button { width:100%; padding:12px; background:linear-gradient(135deg,#A81C22,#E0B04F); color:white; border:none; border-radius:8px; font-weight:700; cursor: pointer; }
.signup-button:disabled { opacity: 0.7; cursor: not-allowed; }
.text-muted { color: #888; font-size: 12px; }
.checkbox-container { display:flex; align-items:center; gap:8px }
@media (max-width:480px) { .form-row { flex-direction:column } }
</style>
