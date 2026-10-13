import { test, expect } from './helpers/base.js'
import { SUPERADMIN_STORAGE } from './helpers/auth.js'

// Flujo 9 — Super admin: /dashboard, /usuarios y /admin/facturacion-sistema
// cargan sin errores de consola.
test.use({ storageState: SUPERADMIN_STORAGE })

// Nota: se verifica contenido visible (no document.title) — el título de la
// pestaña lo fija router.afterEach de forma asíncrona y puede tardar más que
// el contenido en reflejarse, lo que volvía la aserción más frágil sin
// aportar ninguna señal adicional sobre si la pantalla cargó bien.
test.describe('Super admin — pantallas principales', () => {
  test('/dashboard carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByText('Clientes Activos').first()).toBeVisible()
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('/usuarios carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/usuarios/)
    await expect(page.getByRole('heading', { name: 'Gestión de Usuarios' })).toBeVisible()
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('/admin/facturacion-sistema carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/admin/facturacion-sistema')
    await expect(page).toHaveURL(/\/admin\/facturacion-sistema/)
    await expect(page.getByRole('heading', { name: /Facturación del Sistema/ })).toBeVisible()
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
