<template>
  <div class="signup-card animate-slide-in-up">
    <div class="signup-header">
      <div class="icon-container animate-micro-rotate">
        <img src="@/assets/icon-adaptableV2.svg" alt="Logo" class="logo-icon" style="width:48px;height:48px" />
      </div>
      <h1 class="signup-title">Registro de Cliente</h1>
      <p class="signup-subtitle">Completa tu perfil para unirte a <strong>{{ invitation?.organization_name || 'la organización' }}</strong></p>
    </div>

    <form @submit.prevent="registrar" class="signup-form">
      <!-- Datos Personales -->
      <h3 class="section-title">Datos de Usuario</h3>
      <div class="form-row">
        <div class="form-group">
          <label for="firstName" class="form-label">Nombre</label>
          <input id="firstName" v-model="form.first_name" type="text" class="form-input" placeholder="Tu nombre" required />
        </div>
        <div class="form-group">
          <label for="lastName" class="form-label">Apellido</label>
          <input id="lastName" v-model="form.last_name" type="text" class="form-input" placeholder="Tu apellido" required />
        </div>
      </div>

      <div class="form-group">
        <label for="email" class="form-label">Correo electrónico</label>
        <input id="email" v-model="form.email" type="email" class="form-input" readonly disabled />
        <small class="text-muted">El correo está vinculado a la invitación</small>
      </div>

      <div class="form-group">
        <label for="password" class="form-label">Contraseña</label>
        <input id="password" v-model="form.password" :type="mostrarPassword ? 'text' : 'password'" class="form-input" placeholder="Contraseña" required />
      </div>

      <div class="form-group">
        <label for="confirm" class="form-label">Confirmar contraseña</label>
        <input id="confirm" v-model="form.confirmPassword" :type="mostrarPassword ? 'text' : 'password'" class="form-input" placeholder="Confirmar contraseña" required />
      </div>

      <!-- Datos de la Empresa Cliente -->
      <h3 class="section-title mt-4">Datos de tu Empresa/Negocio</h3>
      <p class="text-caption mb-3">Estos datos son necesarios para la facturación.</p>
      
      <div class="form-group">
        <label for="companyName" class="form-label">Razón Social / Nombre</label>
        <input id="companyName" v-model="form.company_name" type="text" class="form-input" placeholder="Ej: Inversiones XYZ C.A." required />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="rif" class="form-label">RIF</label>
          <input id="rif" v-model="form.rif" type="text" class="form-input" placeholder="J-12345678-9" required />
        </div>
        <div class="form-group">
          <label for="phone" class="form-label">Teléfono</label>
          <input id="phone" v-model="form.phone" type="tel" class="form-input" placeholder="0414-1234567" />
        </div>
      </div>

      <div class="form-group">
        <label for="address" class="form-label">Dirección Fiscal</label>
        <textarea id="address" v-model="form.address" class="form-input" rows="2" placeholder="Dirección completa" required></textarea>
      </div>

      <div class="form-extra">
        <label class="checkbox-container">
          <input type="checkbox" v-model="mostrarPassword" class="checkbox-input" />
          <span class="checkbox-label">Mostrar contraseña</span>
        </label>
      </div>

      <button type="submit" class="signup-button" :disabled="cargando || !puedoEnviar">
        <span v-if="!cargando">Completar Registro</span>
        <span v-else class="loading-spinner">Procesando...</span>
      </button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'RegisterClient',
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
        confirmPassword: '',
        // Datos empresa
        company_name: '',
        rif: '',
        phone: '',
        address: ''
      }
    }
  },
  computed: {
    puedoEnviar() {
      return this.form.first_name && this.form.last_name && this.form.password && 
             this.form.company_name && this.form.rif && this.form.address &&
             (this.form.password === this.form.confirmPassword)
    }
  },
  async mounted() {
    // Si la invitación ya tiene un client_id, intentamos cargar datos existentes de la empresa
    if (this.invitation.client_id) {
      this.cargarDatosEmpresa();
    }
  },
  methods: {
    async cargarDatosEmpresa() {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        // Nota: Esto requiere que la tabla clients sea legible públicamente o por token, 
        // lo cual puede requerir ajuste de RLS o una Edge Function. 
        // Por ahora asumimos que si tiene invitación, puede leer.
        // Si falla, el usuario simplemente llenará los datos.
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', this.invitation.client_id)
          .maybeSingle();
          
        if (data) {
          this.form.company_name = data.company_name || '';
          this.form.rif = data.rif || '';
          this.form.phone = data.phone || '';
          this.form.address = data.address || '';
        }
      } catch (e) {
        // Silenciosamente ignorar error de permisos (anon no puede ver clients)
        console.log('Info: No se cargaron datos previos de empresa (probablemente por permisos o no existen). El usuario los llenará.');
      }
    },
    
    async registrar() {
      if (!this.puedoEnviar) return;
      this.cargando = true;
      
      try {
        const { supabase } = await import('@/lib/supabaseClient');

        // 1. Registro en Auth
        const userMeta = {
          first_name: this.form.first_name,
          last_name: this.form.last_name,
          username: this.form.email.split('@')[0],
          role: 'cliente',
          organization_id: this.invitation.organization_id,
          client_id: this.invitation.client_id
        };

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: this.form.email,
          password: this.form.password,
          options: {
            data: userMeta
          }
        });

        if (authError) throw authError;

        // 2. Actualizar datos de la empresa (clients)
        if (authData.user && this.invitation.client_id) {
            // Esperar un momento para que el trigger procese
            await new Promise(r => setTimeout(r, 1000));
            
            const { error: clientError } = await supabase
              .from('clients')
              .update({
                company_name: this.form.company_name,
                rif: this.form.rif,
                address: this.form.address,
                phone: this.form.phone
              })
              .eq('id', this.invitation.client_id);
              
            if (clientError) {
              console.error('Error al actualizar datos de empresa:', clientError);
            }
            
            // 3. Marcar invitación como aceptada
            await supabase
              .from('invitations')
              .update({ status: 'accepted' })
              .eq('id', this.invitation.id);
        }

        alert('Registro completado exitosamente.');
        this.$router.push('/login');

      } catch (e) {
        console.error('Error:', e);
        alert(e.message || 'Error al registrar cliente');
      } finally {
        this.cargando = false;
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
.section-title { font-size: 16px; color: #333; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
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
