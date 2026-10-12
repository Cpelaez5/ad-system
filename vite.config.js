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
      globals: true
    },
    esbuild: command === 'build' ? {
      pure: ['console.log', 'console.debug', 'console.info'],
      drop: ['debugger']
    } : {}
  }
})
