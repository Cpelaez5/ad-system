<template>
  <div class="signup-container">
    <div class="signup-wrapper">
      
      <!-- Estado de carga inicial (verificando token) -->
      <div v-if="verifyingToken" class="text-center">
        <div class="loading-spinner"></div>
        <p class="mt-4 text-grey">Verificando invitación...</p>
      </div>

      <!-- Error de invitación -->
      <div v-else-if="tokenError" class="signup-card text-center">
        <v-icon size="64" color="error" class="mb-4">mdi-alert-circle</v-icon>
        <h2 class="text-h5 text-error mb-2">Invitación Inválida</h2>
        <p class="mb-4">{{ tokenError }}</p>
        <v-btn color="primary" to="/login">Volver al Login</v-btn>
      </div>

      <!-- Vistas de Registro -->
      <component 
        v-else 
        :is="currentComponent" 
        :invitation="invitationData"
      />

    </div>
  </div>
</template>

<script>
import RegisterFirm from './register/RegisterFirm.vue'
import RegisterClient from './register/RegisterClient.vue'
import RegisterAccountant from './register/RegisterAccountant.vue'

export default {
  name: 'Register',
  components: {
    RegisterFirm,
    RegisterClient,
    RegisterAccountant
  },
  data() {
    return {
      verifyingToken: true,
      tokenError: null,
      invitationData: null,
      currentComponent: 'RegisterFirm' // Por defecto: Registro de Firma (sin invitación)
    }
  },
  async mounted() {
    const token = this.$route.query.token;
    
    if (token) {
      await this.verifyInvitation(token);
    } else {
      this.verifyingToken = false;
      this.currentComponent = 'RegisterFirm';
    }
  },
  methods: {
    async verifyInvitation(token) {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        
        // Consultar la invitación por token
        // Usamos maybeSingle para evitar error 406 si no existe
        // Quitamos el join con organizations por si RLS bloquea el acceso anónimo a esa tabla
        const { data, error } = await supabase
          .from('invitations')
          .select('*') 
          .eq('token', token)
          .maybeSingle();

        console.log('🔍 Verificando token:', token);
        console.log('🔍 Respuesta Supabase:', { data, error });

        if (error) throw error;
        
        if (!data) {
          throw new Error('La invitación no existe o ha expirado.');
        }

        if (data.status !== 'pending') {
          throw new Error('Esta invitación ya ha sido utilizada o expiró.');
        }

        if (new Date(data.expires_at) < new Date()) {
          throw new Error('La invitación ha caducado.');
        }

        // Intentar obtener el nombre de la organización por separado (opcional)
        let orgName = 'la organización';
        try {
            // Esto podría fallar si RLS de organizations no permite lectura anónima
            // pero no bloqueará el flujo principal
            const { data: orgData } = await supabase
                .from('organizations')
                .select('name')
                .eq('id', data.organization_id)
                .maybeSingle();
            if (orgData) orgName = orgData.name;
        } catch (e) {
            console.warn('No se pudo obtener nombre de organización', e);
        }

        // Preparar datos para el componente hijo
        this.invitationData = {
          ...data,
          organization_name: orgName
        };

        // Determinar qué componente mostrar según el rol
        if (data.role === 'cliente') {
          this.currentComponent = 'RegisterClient';
        } else if (data.role === 'contador') {
          this.currentComponent = 'RegisterAccountant';
        } else {
          this.currentComponent = 'RegisterAccountant'; 
        }

      } catch (e) {
        console.error('Error verificando invitación:', e);
        this.tokenError = e.message || 'Error al verificar la invitación.';
      } finally {
        this.verifyingToken = false;
      }
    }
  }
}
</script>

<style scoped>
.signup-container {
  background-color: var(--color-background);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.signup-wrapper { width: 100%; max-width: 520px; }
.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid var(--color-primary);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
