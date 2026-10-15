import { test, expect } from '@playwright/test'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Bloqueo por inactividad. El atajo ?inactividad=N solo existe con `import.meta.env.DEV`
// (servidor de desarrollo), no en el build que usa la suite normal: por eso se salta
// salvo que se apunte a un `vite dev` con E2E_DEV_SERVER=1 (y E2E_BASE_URL=<ese servidor>).
// NO se prueba la contraseña real: solo que aparece el bloqueo y la salida.
test.skip(!process.env.E2E_DEV_SERVER, 'Requiere un servidor de desarrollo (E2E_DEV_SERVER=1)')
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Sesión — bloqueo por inactividad', () => {
  test('con ?inactividad=5 aparece el aviso y luego el bloqueo con "Cerrar sesión"', async ({ page }) => {
    await page.goto('/cliente/inicio?inactividad=5')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    await expect(page.getByTestId('inactividad-aviso')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('inactividad-bloqueo')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('inactividad-cerrar-sesion')).toBeVisible()
    await expect(page.getByTestId('inactividad-clave')).toBeVisible()

    // Esc no cierra el bloqueo
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('inactividad-bloqueo')).toBeVisible()
    // No se navegó a ningún lado
    await expect(page).toHaveURL(/\/cliente\/inicio/)
  })
})
