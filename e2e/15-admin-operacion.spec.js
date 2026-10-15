import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 15 — Panel de Operación del super admin: un CLIENTE que entra a
// cualquiera de sus pantallas es redirigido a su inicio (guard de roles del
// router). No hay sesión de super admin en e2e/.auth, así que las pantallas
// en sí se cubren con tests de componentes (src/views/admin/__tests__/PanelOperacion.test.js).
test.use({ storageState: CLIENTE_STORAGE })

const TIMEOUT_REDIRECCION = 25_000

test.describe('Operación — el cliente no puede ver el panel del super admin', () => {
  for (const ruta of ['/admin/catalogo', '/admin/uso-ia', '/admin/tasas', '/admin/operacion', '/admin/inicio']) {
    test(`${ruta} redirige al cliente a /cliente/inicio`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page).toHaveURL(/\/cliente\/inicio/, { timeout: TIMEOUT_REDIRECCION })
      await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible()
      await expect(page.getByText('Catálogo global')).toHaveCount(0)
    })
  }
})
