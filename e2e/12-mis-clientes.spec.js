import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 12 — "Mis clientes". Solo lectura: abre y cancela, nunca guarda en la
// BD real. Corre en escritorio y móvil (ver playwright.config.js).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Mis clientes', () => {
  test('carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/clientes')
    await expect(page).toHaveURL(/\/cliente\/clientes/)
    await expect(page.getByRole('heading', { name: 'Mis clientes' }).first()).toBeVisible()
    await expect(page.getByTestId('nuevo-cliente')).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('"Nuevo cliente" abre el formulario y Cancelar lo cierra sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/clientes')
    await page.getByTestId('nuevo-cliente').click()

    const dialogo = page.locator('.v-overlay--active')
    await expect(dialogo.getByText('Nuevo cliente').first()).toBeVisible()
    await dialogo.getByLabel('Nombre y apellido').fill('Cliente de prueba (no se guarda)')

    await page.getByTestId('cancelar-cliente').click()
    await expect(page.getByTestId('cancelar-cliente')).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
