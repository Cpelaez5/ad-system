<template>
  <!-- Componente invisible para manejar el favicon según el tema -->
</template>

<script>
import faviconManager from '@/utils/faviconManager.js'

export default {
  name: 'ThemeFavicon',
  data() {
    return {
      currentTheme: 'light',
      mediaQuery: null,
      handleThemeChange: null
    }
  },
  mounted() {
    this.initializeTheme()
    this.setupThemeListener()
  },
  beforeUnmount() {
    this.cleanupThemeListener()
  },
  methods: {
    /**
     * Inicializa el tema del favicon
     */
    initializeTheme() {
      this.currentTheme = faviconManager.getCurrentTheme()
      console.log('🎨 Tema inicial del favicon:', this.currentTheme)
    },

    /**
     * Configura el listener para cambios de tema
     */
    setupThemeListener() {
      if (window.matchMedia) {
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        
        this.handleThemeChange = (e) => {
          this.currentTheme = e.matches ? 'dark' : 'light'
          console.log('🎨 Tema del favicon cambiado a:', this.currentTheme)
          
          // Emitir evento para otros componentes si es necesario
          this.$emit('theme-changed', this.currentTheme)
        }

        this.mediaQuery.addEventListener('change', this.handleThemeChange)
      }
    },

    /**
     * Limpia el listener de tema
     */
    cleanupThemeListener() {
      if (this.mediaQuery && this.handleThemeChange) {
        this.mediaQuery.removeEventListener('change', this.handleThemeChange)
      }
    },

    /**
     * Cambia manualmente el tema del favicon
     * @param {string} theme - 'light', 'dark', o 'auto'
     */
    setFaviconTheme(theme) {
      faviconManager.setTheme(theme)
      this.currentTheme = theme === 'auto' ? faviconManager.getCurrentTheme() : theme
    }
  }
}
</script>

<style scoped>
/* Componente invisible - no necesita estilos */
</style>
