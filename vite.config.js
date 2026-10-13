import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 5173,
      open: true
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/global.css";`
        }
      }
    },
    optimizeDeps: {
      include: ['vuetify']
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      // Permite montar Vuetify REAL (createVuetify) en tests que lo
      // necesiten (ej. tests/components/MenuLateral.spec.js) sin que
      // vitest externalice 'vuetify' y falle al no poder resolver los
      // .css que importan sus componentes.
      server: {
        deps: {
          inline: ['vuetify']
        }
      }
    },
    esbuild: command === 'build' ? {
      pure: ['console.log', 'console.debug', 'console.info'],
      drop: ['debugger']
    } : {}
  }
})
