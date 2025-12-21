<template>
  <div class="register-client-wizard">
    <div class="wizard-header mb-6">
      <h2 class="text-h5 font-weight-bold mb-1">Crear Cuenta</h2>
      <p class="text-subtitle-2 text-grey">Paso {{ step }} de 2: {{ stepTitle }}</p>
      
      <!-- Progress Bar -->
      <div class="progress-bar mt-3">
        <div class="progress-fill" :style="{ width: step === 1 ? '50%' : '100%' }"></div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="wizard-form">
      
      <!-- STEP 1: Account Info -->
      <div v-if="step === 1" class="step-content animate-fade-in">
        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">Nombre</label>
            <input v-model="form.first_name" type="text" class="form-input" placeholder="Tu nombre" required />
          </div>
          <div class="form-group half">
            <label class="form-label">Apellido</label>
            <input v-model="form.last_name" type="text" class="form-input" placeholder="Tu apellido" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Correo electrónico</label>
          <input 
            v-model="form.email" 
            type="email" 
            class="form-input" 
            :readonly="!!invitation.email" 
            :disabled="!!invitation.email" 
            placeholder="tu@email.com" 
            required 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <input v-model="form.password" type="password" class="form-input" placeholder="••••••••" required />
        </div>

        <div class="form-group">
          <label class="form-label">Confirmar contraseña</label>
          <input v-model="form.confirmPassword" type="password" class="form-input" placeholder="••••••••" required />
        </div>
      </div>

      <!-- STEP 2: Business Info -->
      <div v-if="step === 2" class="step-content animate-fade-in">
        <div class="form-group">
          <label class="form-label">Nombre de la Empresa / Negocio</label>
          <input v-model="form.company_name" type="text" class="form-input" placeholder="Ej: Inversiones XYZ" required />
        </div>

        <div class="form-row">
          <div class="form-group half">
            <label class="form-label">RIF / Identificación</label>
            <input v-model="form.rif" type="text" class="form-input" placeholder="J-12345678-9" required />
          </div>
          <div class="form-group half">
            <label class="form-label">Teléfono</label>
            <input v-model="form.phone" type="tel" class="form-input" placeholder="0414-1234567" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dirección Fiscal</label>
          <textarea v-model="form.address" class="form-input" rows="3" placeholder="Dirección completa" required></textarea>
        </div>
      </div>

      <!-- Actions -->
      <div class="wizard-actions mt-6">
        <button v-if="step === 2" type="button" class="back-btn" @click="step = 1">
          Atrás
        </button>
        
        <button v-if="step === 1" type="button" class="next-btn" @click="validateStep1">
          Siguiente
        </button>
        
        <button v-if="step === 2" type="submit" class="submit-btn" :disabled="cargando">
          <span v-if="!cargando">Completar Registro</span>
          <div v-else class="spinner"></div>
        </button>
      </div>
    </form>
  </div>
</template>

<script>
export default {
  name: 'RegisterClient',
  props: {
    invitation: { type: Object, required: true }
  },
  data() {
    return {
      step: 1,
      cargando: false,
      form: {
        first_name: '',
        last_name: '',
        email: this.invitation.email || '',
        password: '',
        confirmPassword: '',
        company_name: '',
        rif: '',
        phone: '',
        address: ''
      }
    }
  },
  computed: {
    stepTitle() {
      return this.step === 1 ? 'Datos Personales' : 'Datos del Negocio';
    }
  },
  async mounted() {
    if (this.invitation.client_id) {
      this.cargarDatosEmpresa();
    }
  },
  methods: {
    validateStep1() {
      if (!this.form.first_name || !this.form.last_name || !this.form.email || !this.form.password) {
        alert('Por favor completa todos los campos');
        return;
      }
      if (this.form.password !== this.form.confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
      }
      this.step = 2;
    },
    async cargarDatosEmpresa() {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data } = await supabase.from('clients').select('*').eq('id', this.invitation.client_id).maybeSingle();
        if (data) {
          this.form.company_name = data.company_name || '';
          this.form.rif = data.rif || '';
          this.form.phone = data.phone || '';
          this.form.address = data.address || '';
        }
      } catch (e) { console.log('Info: No se cargaron datos previos.'); }
    },
    async handleSubmit() {
      if (!this.form.company_name || !this.form.rif || !this.form.address) {
        alert('Por favor completa los datos del negocio');
        return;
      }
      
      this.cargando = true;
      try {
        const { supabase } = await import('@/lib/supabaseClient');

        // Use Edge Function for secure registration
        const { data, error } = await supabase.functions.invoke('register-client', {
          body: {
            email: this.form.email,
            password: this.form.password,
            first_name: this.form.first_name,
            last_name: this.form.last_name,
            company_name: this.form.company_name,
            rif: this.form.rif,
            phone: this.form.phone,
            address: this.form.address,
            organization_id: this.invitation.organization_id
          }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        alert('Registro completado exitosamente. Por favor inicia sesión.');
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
.wizard-header { text-align: left; }
.progress-bar { height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; background: #A81C22; transition: width 0.3s ease; }

.form-row { display: flex; gap: 16px; }
.half { flex: 1; }

.form-group { margin-bottom: 20px; }
.form-label { display: block; font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px; }
.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.3s ease;
  background: #f9f9f9;
}
.form-input:focus {
  outline: none;
  border-color: #A81C22;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(168, 28, 34, 0.1);
}

.wizard-actions { display: flex; gap: 12px; }

.next-btn, .submit-btn {
  flex: 1;
  padding: 14px;
  background: #A81C22;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}
.next-btn:hover, .submit-btn:hover:not(:disabled) { background: #8B1A1F; transform: translateY(-2px); }

.back-btn {
  padding: 14px 24px;
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.back-btn:hover { background: #f5f5f5; color: #333; }

.spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

.animate-fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 480px) {
  .form-row { flex-direction: column; gap: 0; }
}
</style>
