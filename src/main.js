import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { logger } from './utils/logger'
import { useNotificacionStore } from './store/notificacionStore'

// --- Detectar tokens de auth/recovery en la URL muy temprano ---
try {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const search = window.location.search || ''
    const hash = window.location.hash || ''
    const hasHashAccessToken = !!hash && /access_token=/.test(hash)
    const searchParams = new URLSearchParams(search.replace(/^\?/, ''))
    // Considerar también el parámetro `code` que algunos callbacks OAuth/PKCE usan
    const hasQueryToken = !!(searchParams.get('token') || searchParams.get('access_token') || searchParams.get('code') || searchParams.get('type') === 'recovery')
    if ((hasHashAccessToken || hasQueryToken) && pathname !== '/login' && pathname !== '/signup') {
      console.log('🔁 Detectado token de auth/recovery en la URL — redirigiendo a /login y preservando query+hash')
      console.log('   original href=', window.location.href)
      console.log('   original search=', search)
      console.log('   original hash=', hash)
      try {
        // Guardar la URL original para que Login.vue pueda comparar y depurar
        sessionStorage.setItem('__supabase_initial_url', JSON.stringify({ href: window.location.href, search, hash, ts: Date.now() }))
      } catch (err) {
        console.warn('⚠️ No se pudo guardar initial_url en sessionStorage:', err)
      }
      const dest = window.location.origin + '/login' + search + hash
      console.log('   redirecting to:', dest)
      window.location.replace(dest)
    }
  }
} catch (e) {
  console.warn('⚠️ Error en la detección temprana de token URL:', e)
}

// Inicializar tenant al cargar la aplicación
import './utils/initTenant.js'

// (El gestor de favicon dinámico se desactiva para respetar los <link media> de index.html)

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Importar estilos de Vuetify después de nuestras fuentes
import 'vuetify/styles'

// Importar sobrescrituras de Vuetify para Montserrat
import './styles/vuetify-overrides.css'

// Importar animaciones globales
import './styles/animations.css'

// Date Picker
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

// Fuentes locales
import '@fontsource/montserrat/300.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'

import '@fontsource/open-sans/300.css'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/500.css'
import '@fontsource/open-sans/600.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/open-sans/800.css'

// Crear instancia de Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          /* --- Identidad AD System (producto), tomada de los píxeles reales
             de public/ADSystem/png/logo.png, icono.png, icono2.png y de los
             favicons oficiales en public/logo/. Ver docs/mvp/diseno/sistema-diseno.md
             §"Identidad visual AD System" para la verificación de contraste. --- */
          primary: '#8E1818',        /* Granate AD System (marca, del logo) */
          secondary: '#1F355C',      /* Azul — color de apoyo (firma AD Business Group), se conserva por contraste AA ya verificado */
          accent: '#E0B04F',         /* Dorado — color de apoyo, SOLO fondo/ícono/borde, nunca texto sobre blanco */
          metal: '#9CA3AF',          /* Gris "metal" del favicon oficial — fondos secundarios/bordes, siempre con texto oscuro encima */
          granateOscuro: '#320B0B',  /* Variante oscura oficial del logo — estado activo/presionado, fondos oscuros */
          error: '#D32F2F',          /* Rojo de error — tono distinto del granate de marca a propósito (ver doc) */
          info: '#1F355C',           /* Azul de apoyo para información */
          success: '#2E7D32',        /* Verde oscurecido: el verde Material estándar (#4CAF50) no pasa AA con texto blanco */
          warning: '#E0B04F',        /* Dorado — advertencias: SIEMPRE con texto/ícono oscuro, nunca blanco */
          surface: '#FFFFFF',        /* Blanco */
          background: '#efefef',     /* Gris claro para fondo de aplicación */
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#C18080',        /* Granate AD System aclarado para fondos oscuros */
          secondary: '#90caf9',      /* Azul claro para textos oscuros */
          accent: '#E0B04F',         /* Dorado se mantiene bien */
          metal: '#9CA3AF',
          granateOscuro: '#C18080',
          error: '#EF5350',          /* Rojo error adaptado (distinto del granate) */
          info: '#90caf9',           /* Azul claro info */
          success: '#81C784',        /* Verde éxito adaptado */
          warning: '#FFD54F',        /* Amarillo adaptado */
          surface: '#1E1E1E',        /* Superficie oscura típica */
          background: '#121212',     /* Fondo oscuro nativo */
        },
      },
    },
  },
  defaults: {
    global: {
      ripple: false,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: 20px; font-family: "Montserrat", sans-serif;',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: 20px; font-family: "Montserrat", sans-serif;',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: 20px; font-family: "Montserrat", sans-serif;',
    },
    VBtn: {
      style: 'text-transform: none; font-weight: 500; border-radius: 10px; box-shadow: none; font-family: "Montserrat", sans-serif;',
    },
    VCard: {
      style: 'border-radius: 20px; box-shadow: none; font-family: "Montserrat", sans-serif;',
    },
    VMenu: {
      zIndex: 2000,
      style: 'border-radius: 20px; box-shadow: none; font-family: "Montserrat", sans-serif;',
    },
    VList: {
      style: 'border-radius: 20px; font-family: "Montserrat", sans-serif;',
    },
    VListItem: {
      style: 'border-radius: 20px; font-family: "Montserrat", sans-serif;',
    },
  },
  display: {
    mobileBreakpoint: 'sm',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
})

// Crear la aplicación
const app = createApp(App)

// Registrar componentes globales
app.component('VueDatePicker', VueDatePicker)

// Usar plugins
app.use(createPinia())
app.use(router)
app.use(vuetify)

// Manejador global de errores no capturados por un try/catch local.
// Registra el error real (logger.error siempre imprime, también en producción)
// y avisa al usuario sin bloquear la pantalla. No se "traga" el error en
// desarrollo: logger.error ya lo manda a la consola con el stack completo.
app.config.errorHandler = (err, instance, info) => {
  logger.error('Error global no capturado por la app', err, info)
  try {
    useNotificacionStore().mostrar('Algo salió mal. Intenta de nuevo.', 'error')
  } catch (notifyError) {
    logger.error('No se pudo mostrar el aviso del error global', notifyError)
  }
}

// Montar la aplicación
app.mount('#app')
