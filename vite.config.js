import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { configDefaults } from 'vitest/config'

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
      // e2e/ son specs de Playwright (@playwright/test), no de vitest —
      // ver playwright.config.js y docs/mvp/auditorias/e2e-2026-10-13.md.
      // .claude/worktrees/**: otros agentes trabajan ahí en paralelo (ver
      // manual 00-REGLAS-COMUNES.md §5.0); son worktrees de git anidados en
      // esta carpeta y vitest los recorrería como si fueran código propio.
      exclude: [...configDefaults.exclude, '**/e2e/**', '**/.claude/worktrees/**']
    },
    esbuild: command === 'build' ? {
      pure: ['console.log', 'console.debug', 'console.info'],
      drop: ['debugger']
    } : {}
  }
})
