import { defineConfig, devices } from '@playwright/test'

// Suite E2E — ver docs/mvp/auditorias/e2e-2026-10-13.md y
// docs/mvp/manuales/07-agente-qa.md §"Suite E2E" para contexto completo.
//
// Corre contra el servidor local de Vite (http://localhost:5173, el mismo
// que usa `npm run dev`). `reuseExistingServer: true` porque casi siempre ya
// está corriendo durante el desarrollo; si no lo está, Playwright lo levanta.
//
// IMPORTANTE: el entorno local usa la base de datos REAL (pre-lanzamiento).
// Ningún test debe crear, modificar ni borrar datos: solo navegar, abrir
// diálogos y cancelarlos. La sesión de cada rol se loguea una sola vez en
// `global-setup.js` y se reutiliza vía `storageState` (ver e2e/helpers/auth.js).
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // El servidor local responde ERR_CONNECTION_REFUSED / ERR_NETWORK_ACCESS_DENIED
  // de forma intermitente en este entorno de pruebas (red restringida del
  // sandbox), no por un problema de la app — ver docs/mvp/auditorias/e2e-2026-10-13.md.
  // 2 reintentos absorben esa flakiness sin ocultar fallos reales (un fallo
  // reproducible en los 3 intentos sí se reporta).
  retries: 2,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e/global-setup.js',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Si algún flujo llegara a descargar un archivo real (p.ej. un PDF de
    // retención), que caiga en test-results/ y no en la raíz del repo.
    launchOptions: { downloadsPath: 'test-results/downloads' },
  },

  // La suite corre contra el BUILD de producción (vite preview) en 127.0.0.1:5174:
  // - prueba exactamente lo que se publica en Netlify;
  // - en modo dev Vite sirve cientos de módulos sueltos y en este Windows algunas
  //   conexiones locales se bloqueaban (net::ERR_NETWORK_ACCESS_DENIED) — no era la app.
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: true,
    timeout: 240_000,
  },

  projects: [
    {
      name: 'desktop',
      testIgnore: '**/*.mobile.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 800 },
      },
    },
    {
      name: 'mobile',
      testIgnore: '**/*.desktop.spec.js',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
})
