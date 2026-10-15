<template>
  <div class="bloqueo-inactividad-raiz">
    <!-- Aviso previo: discreto, no tapa nada importante; cualquier actividad lo cancela. -->
    <v-snackbar
      :model-value="estado === 'aviso'"
      location="top"
      :timeout="-1"
      color="secondary"
      multi-line
      class="bloqueo-aviso"
      data-testid="inactividad-aviso"
    >
      <span class="bloqueo-aviso__texto">
        Por tu seguridad, bloquearemos la pantalla en {{ restanteSeg }} s
      </span>
      <template #actions>
        <v-btn
          variant="flat"
          color="primary"
          class="text-none font-weight-bold"
          data-testid="inactividad-sigo-aqui"
          @click="marcarActividad"
        >
          Sigo aquí
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Pantalla bloqueada: velo opaco con desenfoque; no se cierra con Esc ni con clic afuera. -->
    <v-dialog
      :model-value="estado === 'bloqueado'"
      persistent
      no-click-animation
      max-width="420"
      content-class="bloqueo-contenido"
      class="bloqueo-inactividad"
      scrim="background"
      @after-enter="enfocarCampo"
    >
      <v-card
        class="bloqueo-tarjeta pa-6"
        role="alertdialog"
        aria-labelledby="bloqueo-titulo"
        aria-describedby="bloqueo-descripcion"
        data-testid="inactividad-bloqueo"
      >
        <div class="d-flex flex-column align-center text-center">
          <v-avatar color="primary" size="56" class="mb-3">
            <v-icon icon="mdi-lock-outline" size="30" color="white" />
          </v-avatar>
          <h2 id="bloqueo-titulo" class="text-h6 font-weight-bold">Pantalla bloqueada</h2>
          <p id="bloqueo-descripcion" class="text-body-1 mt-1 mb-4">
            Pasó un rato sin actividad. Escribe tu contraseña para seguir justo donde estabas.
          </p>
          <p class="text-body-1 font-weight-bold mb-0" data-testid="inactividad-nombre">{{ nombre }}</p>
          <p class="text-body-2 text-medium-emphasis mb-4" data-testid="inactividad-correo">{{ correo }}</p>
        </div>

        <form novalidate @submit.prevent="continuar">
          <!-- Campo de usuario oculto: ayuda a los gestores de contraseñas -->
          <input type="email" :value="correo" autocomplete="username" class="d-none" tabindex="-1" aria-hidden="true" readonly />
          <v-text-field
            ref="campo"
            v-model="clave"
            label="Contraseña"
            :type="verClave ? 'text' : 'password'"
            autocomplete="current-password"
            variant="outlined"
            density="comfortable"
            :append-inner-icon="verClave ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error="!!error"
            :error-messages="error ? [error] : []"
            :disabled="verificando || cerrando"
            data-testid="inactividad-clave"
            @click:append-inner="verClave = !verClave"
          />
          <v-btn
            type="submit"
            color="primary"
            size="large"
            block
            class="text-none font-weight-bold mt-1"
            :loading="verificando"
            :disabled="cerrando"
            data-testid="inactividad-continuar"
          >
            Continuar
          </v-btn>
        </form>

        <div class="text-center mt-4">
          <v-btn
            variant="text"
            class="text-none"
            :disabled="verificando || cerrando"
            data-testid="inactividad-cerrar-sesion"
            @click="cerrarSesion"
          >
            No soy yo · Cerrar sesión
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { watch } from 'vue';
import { supabase } from '@/lib/supabaseClient';
import { useInactividad } from '@/composables/useInactividad';

export const MAX_INTENTOS = 5;
const CLAVE_INTENTOS = 'ad_bloqueo_intentos';

function leerIntentos() {
  try { return Number(sessionStorage.getItem(CLAVE_INTENTOS)) || 0; } catch { return 0; }
}
function guardarIntentos(n) {
  try {
    if (n > 0) sessionStorage.setItem(CLAVE_INTENTOS, String(n));
    else sessionStorage.removeItem(CLAVE_INTENTOS);
  } catch { /* modo privado */ }
}

/**
 * BloqueoInactividad — aviso previo y pantalla bloqueada por inactividad
 * (docs/mvp/diseno/sesion-inactividad.md). Se monta UNA vez en AppShell.
 * Al desbloquear no recarga ni navega: solo se quita el velo.
 */
export default {
  name: 'BloqueoInactividad',

  props: {
    nombre: { type: String, default: '' },
    correo: { type: String, default: '' },
    // Solo para pruebas / ajustes futuros del super admin
    umbralMs: { type: Number, default: undefined },
  },

  emits: ['cerrar-sesion'],

  setup(props) {
    const { estado, restanteSeg, marcarActividad, desbloquear, limpiar } = useInactividad({
      umbralMs: props.umbralMs,
      identidad: props.correo,
    });
    return { estado, restanteSeg, marcarActividad, desbloquear, limpiar };
  },

  data() {
    return {
      clave: '',
      verClave: false,
      error: '',
      verificando: false,
      cerrando: false,
      intentos: leerIntentos(),
    };
  },

  created() {
    watch(
      () => this.estado,
      (nuevo) => {
        if (nuevo === 'bloqueado') {
          this.error = '';
          this.clave = '';
          this.verClave = false;
        }
      },
    );
  },

  methods: {
    enfocarCampo() {
      this.$nextTick(() => {
        const campo = this.$refs.campo;
        if (campo?.focus) campo.focus();
      });
    },

    async continuar() {
      if (this.verificando || this.cerrando) return;
      if (!this.clave) {
        this.error = 'Escribe tu contraseña.';
        this.enfocarCampo();
        return;
      }
      if (!this.correo) {
        this.error = 'No pudimos saber quién eres. Cierra la sesión y vuelve a entrar.';
        return;
      }
      this.verificando = true;
      this.error = '';
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: this.correo,
          password: this.clave,
        });
        if (error) {
          await this.manejarError(error);
          return;
        }
        const correoSesion = data?.user?.email;
        if (correoSesion && correoSesion.toLowerCase() !== this.correo.toLowerCase()) {
          // La sesión no es de quien está en pantalla: no se desbloquea nada.
          this.error = 'Esa contraseña no corresponde a esta cuenta.';
          return;
        }
        this.intentos = 0;
        guardarIntentos(0);
        this.clave = '';
        this.desbloquear();
      } catch (e) {
        this.error = 'No pudimos comprobarla. Revisa tu internet e inténtalo de nuevo.';
      } finally {
        this.verificando = false;
      }
    },

    async manejarError(error) {
      const mensaje = String(error?.message || '').toLowerCase();
      const credenciales = error?.status === 400 || mensaje.includes('invalid login credentials') || mensaje.includes('invalid');
      if (error?.status === 429 || mensaje.includes('rate limit')) {
        this.error = 'Hiciste muchos intentos seguidos. Espera un momento y vuelve a probar.';
        return;
      }
      if (!credenciales) {
        this.error = 'No pudimos comprobarla. Revisa tu internet e inténtalo de nuevo.';
        return;
      }
      this.intentos += 1;
      guardarIntentos(this.intentos);
      this.clave = '';
      if (this.intentos >= MAX_INTENTOS) {
        this.error = 'Cerramos tu sesión por seguridad. Vuelve a entrar con tu contraseña.';
        await this.cerrarSesion();
        return;
      }
      const quedan = MAX_INTENTOS - this.intentos;
      this.error = `Esa contraseña no es la correcta. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`;
      this.enfocarCampo();
    },

    async cerrarSesion() {
      if (this.cerrando) return;
      this.cerrando = true;
      guardarIntentos(0);
      this.limpiar();
      this.$emit('cerrar-sesion');
    },
  },
};
</script>

<style>
/* Sin scoped: el velo y el diálogo se teletransportan fuera del componente. */
.bloqueo-inactividad .v-overlay__scrim {
  opacity: 1 !important;
  background: rgb(var(--v-theme-background)) !important;
}
@supports (backdrop-filter: blur(1px)) {
  .bloqueo-inactividad .v-overlay__scrim {
    opacity: 0.97 !important;
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
}
.bloqueo-inactividad {
  z-index: 3000 !important;
}
.bloqueo-contenido {
  margin: 16px;
}
.bloqueo-tarjeta {
  border-radius: 16px !important;
}
.bloqueo-aviso__texto {
  font-size: 1rem;
}
</style>
