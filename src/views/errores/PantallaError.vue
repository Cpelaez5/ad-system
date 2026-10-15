<template>
  <section class="pantalla-error" :aria-labelledby="idTitulo">
    <div class="pantalla-error__ilustracion" aria-hidden="true">
      <span class="pantalla-error__numero">{{ numero }}</span>
      <span class="pantalla-error__icono"><v-icon :icon="icono" size="40" /></span>
    </div>
    <h1 :id="idTitulo" class="pantalla-error__titulo">{{ titulo }}</h1>
    <p class="pantalla-error__texto">{{ texto }}</p>
    <div class="pantalla-error__acciones">
      <v-btn color="primary" size="large" class="text-none" block rounded="lg" @click="irAlInicio">
        {{ textoInicio }}
      </v-btn>
      <v-btn variant="text" color="secondary" size="large" class="text-none" block @click="volver">
        Volver atrás
      </v-btn>
    </div>
  </section>
</template>

<script>
import { homeDeRol } from '@/router/accesoRutas'

function leerRol() {
  try {
    if (localStorage.getItem('usuarioAutenticado') !== 'true') return null
    return JSON.parse(localStorage.getItem('currentUser') || '{}')?.role || null
  } catch {
    return null
  }
}

export default {
  name: 'PantallaError',
  props: {
    numero: { type: String, required: true },
    icono: { type: String, default: 'mdi-compass-outline' },
    titulo: { type: String, required: true },
    texto: { type: String, required: true }
  },
  data() {
    return { rol: leerRol() }
  },
  computed: {
    idTitulo() { return `error-${this.numero}` },
    textoInicio() { return this.rol ? 'Ir a mi inicio' : 'Ir al inicio de sesión' },
    destinoInicio() { return this.rol ? homeDeRol(this.rol) : '/login' }
  },
  methods: {
    irAlInicio() { this.$router.push(this.destinoInicio) },
    volver() {
      if (window.history.state && window.history.state.back) this.$router.back()
      else this.irAlInicio()
    }
  }
}
</script>

<style scoped>
.pantalla-error {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  max-width: 440px;
  margin: 0 auto;
}
.pantalla-error__ilustracion {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.pantalla-error__numero {
  font-size: clamp(6rem, 32vw, 9rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: rgb(var(--v-theme-primary));
  opacity: 0.14;
}
.pantalla-error__icono {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-primary));
  box-shadow: 0 6px 24px rgba(var(--v-theme-primary), 0.18);
}
.pantalla-error__titulo {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-background));
  margin-bottom: 8px;
}
.pantalla-error__texto {
  font-size: 1.05rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-background), 0.72);
  margin-bottom: 28px;
}
.pantalla-error__acciones {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
