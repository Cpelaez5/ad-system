<template>
  <div class="ayuda-marco">
    <header class="ayuda-marco__barra">
      <div class="ayuda-marco__barra-interior">
        <router-link to="/" class="ayuda-marco__logo" aria-label="AD System, ir al inicio">
          <LogoAdSystem variante="completo" tono="color" :alto="34" />
        </router-link>
        <nav class="ayuda-marco__nav" aria-label="Ayuda">
          <router-link to="/ayuda" class="ayuda-marco__enlace">Centro de ayuda</router-link>
          <v-btn :to="destinoApp.ruta" color="primary" variant="flat" class="text-none" data-testid="ayuda-ir-app">
            {{ destinoApp.texto }}
          </v-btn>
        </nav>
      </div>
    </header>

    <main class="ayuda-marco__contenido">
      <slot />
    </main>

    <footer class="ayuda-marco__pie">
      <span>© {{ anio }} AD System</span>
      <router-link to="/legal?tab=terminos">Términos y condiciones</router-link>
      <router-link to="/legal?tab=privacidad">Política de privacidad</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import LogoAdSystem from '@/components/ui/LogoAdSystem.vue'

const anio = new Date().getFullYear()

// Sin consultar a la red: solo se mira la sesión guardada para decidir a dónde lleva el botón.
const destinoApp = computed(() => {
  try {
    const usuario = JSON.parse(localStorage.getItem('currentUser') || '{}')
    if (usuario?.role === 'cliente') return { ruta: '/cliente/inicio', texto: 'Volver a mi cuenta' }
    if (usuario?.role) return { ruta: '/dashboard', texto: 'Volver a mi cuenta' }
  } catch {
    /* sin sesión guardada */
  }
  return { ruta: '/login', texto: 'Entrar' }
})
</script>

<style scoped>
.ayuda-marco {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-background));
}
.ayuda-marco__barra {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.ayuda-marco__barra-interior {
  max-width: 1120px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.ayuda-marco__logo { display: inline-flex; }
.ayuda-marco__nav { display: flex; align-items: center; gap: 16px; }
.ayuda-marco__enlace {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
  text-decoration: none;
  padding: 12px 4px;
}
.ayuda-marco__enlace:hover { text-decoration: underline; }
.ayuda-marco__contenido { flex: 1; width: 100%; max-width: 1120px; margin: 0 auto; padding: 24px 16px 48px; }
.ayuda-marco__pie {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 20px;
  padding: 20px 16px;
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.ayuda-marco__pie a { color: inherit; }
@media (max-width: 480px) {
  .ayuda-marco__enlace { display: none; }
}
</style>
