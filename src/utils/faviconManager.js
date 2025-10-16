/**
 * Favicon Manager - Cambia el favicon según el tema del sistema
 * Soporta cambios dinámicos entre tema claro y oscuro
 */

class FaviconManager {
  constructor() {
    this.lightIcon = '/src/assets/icon-light.svg'
    this.darkIcon = '/src/assets/icon-dark.svg'
    this.defaultIcon = '/src/assets/icon-adaptableV2.svg'
    
    this.init()
  }

  /**
   * Inicializa el favicon manager
   */
  init() {
    // Establecer favicon inicial basado en la preferencia del sistema
    this.updateFavicon()
    
    // Escuchar cambios en la preferencia de color
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        this.updateFavicon()
      })
    }
  }

  /**
   * Actualiza el favicon según el tema actual
   */
  updateFavicon() {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    const favicon = isDarkMode ? this.darkIcon : this.lightIcon
    
    this.setFavicon(favicon)
    
    console.log(`🎨 Favicon actualizado para tema ${isDarkMode ? 'oscuro' : 'claro'}:`, favicon)
  }

  /**
   * Establece el favicon del documento
   * @param {string} iconPath - Ruta del icono
   */
  setFavicon(iconPath) {
    // Buscar el favicon existente
    let favicon = document.querySelector('link[rel="icon"]')
    
    if (!favicon) {
      // Crear nuevo favicon si no existe
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      favicon.type = 'image/svg+xml'
      document.head.appendChild(favicon)
    }
    
    // Actualizar la ruta del favicon
    favicon.href = iconPath
    
    // Forzar actualización en algunos navegadores
    favicon.href = iconPath + '?v=' + Date.now()
  }

  /**
   * Cambia manualmente el favicon (para uso programático)
   * @param {string} theme - 'light', 'dark', o 'auto'
   */
  setTheme(theme) {
    let iconPath
    
    switch (theme) {
      case 'light':
        iconPath = this.lightIcon
        break
      case 'dark':
        iconPath = this.darkIcon
        break
      case 'auto':
      default:
        this.updateFavicon()
        return
    }
    
    this.setFavicon(iconPath)
    console.log(`🎨 Favicon cambiado manualmente a tema ${theme}:`, iconPath)
  }

  /**
   * Obtiene el tema actual del sistema
   * @returns {string} 'light' o 'dark'
   */
  getCurrentTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  }
}

// Crear instancia global
const faviconManager = new FaviconManager()

// Exportar para uso en otros módulos
export default faviconManager

// También disponible globalmente para debugging
if (typeof window !== 'undefined') {
  window.faviconManager = faviconManager
}
