<template>
  <!-- Pie de las páginas públicas (landing, login, registro, precios, legal).
       Una sola barra compacta: en escritorio todo en una línea para que el login
       quepa en la primera pantalla; en el teléfono, apilado y breve. -->
  <footer class="pie" role="contentinfo">
    <ul class="pie__beneficios" aria-label="Por qué AD System">
      <li><v-icon icon="mdi-shield-check" size="16" />Sistema seguro</li>
      <li><v-icon icon="mdi-cloud-check" size="16" />Respaldo en la nube</li>
      <li><v-icon icon="mdi-headset" size="16" />Soporte 24/7</li>
    </ul>

    <nav class="pie__enlaces" aria-label="Enlaces legales y ayuda">
      <router-link to="/ayuda" data-testid="pie-ayuda">Ayuda</router-link>
      <router-link to="/legal?tab=terminos">Términos</router-link>
      <router-link to="/legal?tab=privacidad">Privacidad</router-link>
      <router-link to="/legal?tab=datos">Tratamiento de datos</router-link>
    </nav>

    <p class="pie__copy">© {{ currentYear }} AD System</p>
  </footer>
</template>

<script>
export default {
  name: 'AppFooter',
  computed: {
    currentYear() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
.pie {
  margin-top: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 24px;
  padding: 12px 24px;
  background: rgb(var(--v-theme-surface));
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.8125rem;
}

.pie__beneficios,
.pie__enlaces {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 20px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pie__beneficios li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.pie__enlaces a {
  color: inherit;
  text-decoration: none;
}

.pie__enlaces a:hover,
.pie__enlaces a:focus-visible {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
}

.pie__copy {
  margin: 0;
}

/* Teléfono: centrado y apilado, sin ocupar media pantalla */
@media (max-width: 959px) {
  .pie {
    flex-direction: column;
    justify-content: center;
    text-align: center;
    padding: 12px 16px 16px;
  }
  .pie__beneficios,
  .pie__enlaces {
    justify-content: center;
  }
}
</style>
