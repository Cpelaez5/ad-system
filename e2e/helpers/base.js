import { test as base, expect } from '@playwright/test'

// ═══════════════════════════════════════════════════════════════════════
// Lista blanca documentada de errores de consola esperados.
// Cada entrada debe explicar POR QUÉ es inofensivo. Si un test falla por un
// error nuevo que no está aquí, investígalo antes de añadirlo a la lista:
// puede ser un bug real (ver manual 07-agente-qa.md).
// ═══════════════════════════════════════════════════════════════════════
export const ALLOWED_CONSOLE_PATTERNS = [
  // Entorno del equipo de desarrollo (Windows): algo del sistema (antivirus/firewall)
  // corta de forma intermitente conexiones locales del Chromium de Playwright hacia
  // 127.0.0.1. No es la app (diagnosticado 2026-10-13: falla al pedir main.js/pinia.js
  // al propio servidor). Las aserciones funcionales de cada test sí detectan si algo
  // no cargó. En CI (Linux) este patrón no debería aparecer.
  /net::ERR_NETWORK_ACCESS_DENIED/i,
  // Vite/Vue en desarrollo: algunos plugins (p.ej. html2pdf.js, pdfjs-dist)
  // emiten warnings de "sourcemap" o "eval" en dev que no existen en el
  // build de producción.
  /Source ?map/i,

  // Extensiones de Chrome inyectadas en el navegador de pruebas (no son
  // parte de la app).
  /chrome-extension:\/\//i,

  // HMR de Vite: en este entorno de pruebas (sandbox con red restringida)
  // el WebSocket de recarga en caliente no puede conectar. No afecta ningún
  // flujo probado (no es recarga en caliente lo que se prueba aquí).
  /WebSocket connection to 'ws:\/\/(localhost|127\.0\.0\.1):517[34]/i,

  // src/utils/initTenant.js corre en CADA carga de la app (import estático
  // en main.js, incluso antes de iniciar sesión) e intenta leer
  // organization_id de localStorage antes de que exista `currentUser`.
  // Por diseño falla en ese primer instante y vuelve a resolverse bien tras
  // el login (ver tenantHelpers.getCurrentOrganizationId). Es ruido
  // preexistente y transversal a toda la app, no un bug del flujo bajo
  // prueba — reportado en docs/mvp/auditorias/e2e-2026-10-13.md como mejora
  // pendiente (quitar el auto-run al importar, o silenciarlo antes del login).
  /No se pudo obtener organization_id válido/,
  /Error al inicializar tenant/,

  // Trackers de terceros inyectados en TODAS las páginas desde index.html
  // (Google Tag Manager, Facebook Pixel) y una imagen decorativa de fondo
  // en Login.vue (unsplash.com). En este entorno de pruebas (red
  // restringida, sin salida a internet) esas llamadas fallan con
  // "Failed to load resource" / net::ERR_NETWORK_ACCESS_DENIED. No tienen
  // relación con ningún flujo de la app bajo prueba. Nota aparte: el
  // Facebook Pixel en index.html usa el ID placeholder "YOUR_PIXEL_ID" sin
  // reemplazar (ver informe de la suite E2E).
  /googletagmanager\.com/,
  /facebook\.com\/tr/,
  /images\.unsplash\.com/,
]

/**
 * `test` extendido con dos fixtures transversales a toda la suite:
 *  - `consoleErrors`: array que acumula errores de consola/página NO
 *    incluidos en la lista blanca de arriba. Los specs hacen
 *    `expect(consoleErrors).toEqual([])` al final del flujo que verifican.
 *  - Descarta automáticamente cualquier alert()/confirm()/prompt() nativo
 *    para que nunca bloqueen el navegador (regla del manual 07-agente-qa.md).
 */
export const test = base.extend({
  consoleErrors: async ({ page }, use) => {
    const errors = []

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      if (ALLOWED_CONSOLE_PATTERNS.some((rx) => rx.test(text))) return
      errors.push(text)
    })

    page.on('pageerror', (err) => {
      errors.push(String(err && err.message ? err.message : err))
    })

    page.on('dialog', (dialog) => {
      dialog.dismiss().catch(() => {})
    })

    await use(errors)
  },

  // Este sandbox de pruebas tiene una red restringida: de vez en cuando una
  // carga de página se queda en blanco porque algún módulo de Vite no
  // terminó de descargar (ERR_CONNECTION_REFUSED / ERR_NETWORK_ACCESS_DENIED
  // intermitentes, ver docs/mvp/auditorias/e2e-2026-10-13.md). No es un bug
  // de la app: en una máquina normal esto no pasa. `page.goto` se envuelve
  // para recargar hasta 2 veces si Vue nunca llegó a montar nada en `#app`.
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page)
    page.goto = async (url, options) => {
      let response
      let lastError
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await originalGoto(url, options)
          lastError = null
        } catch (err) {
          lastError = err
        }
        if (!lastError) {
          const montado = await page
            .locator('#app')
            .evaluate((el) => el.children.length > 0)
            .catch(() => false)
          if (montado) return response
        }
        if (attempt < 3) await page.waitForTimeout(1000)
      }
      if (lastError) throw lastError
      return response
    }
    await use(page)
  },
})

export { expect }
