import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Importar estilos de Vuetify después de nuestras fuentes
import 'vuetify/styles'

// Importar sobrescrituras de Vuetify para Montserrat
import './styles/vuetify-overrides.css'

// Date Picker
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

// Las fuentes se importan en el archivo CSS global

// Crear instancia de Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#A81C22',        /* Rojo principal */
          secondary: '#1F355C',      /* Azul oscuro */
          accent: '#E0B04F',         /* Amarillo dorado */
          error: '#A81C22',          /* Rojo para errores */
          info: '#1F355C',           /* Azul oscuro para información */
          success: '#4CAF50',        /* Verde para éxito */
          warning: '#E0B04F',        /* Amarillo dorado para advertencias */
          surface: '#FFFFFF',        /* Blanco */
          background: '#efefef',     /* Gris claro para fondo de aplicación */
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
      style: 'border-radius: 20px; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: 20px; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      style: 'border-radius: 20px; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VBtn: {
      style: 'text-transform: none; font-weight: 500; border-radius: 10px; box-shadow: none; padding: 8px 16px; font-family: "Montserrat", sans-serif;',
    },
    VCard: {
      style: 'border-radius: 20px; box-shadow: none; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VMenu: {
      zIndex: 2000,
      style: 'border-radius: 20px; box-shadow: none; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VList: {
      style: 'border-radius: 20px; padding: 20px; font-family: "Montserrat", sans-serif;',
    },
    VListItem: {
      style: 'border-radius: 20px; padding: 20px; font-family: "Montserrat", sans-serif;',
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

// Montar la aplicación
app.mount('#app')
