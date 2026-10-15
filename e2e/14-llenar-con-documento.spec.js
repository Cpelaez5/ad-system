import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 14 — "Llenar con un documento". Solo lectura: abre y cancela, nunca
// guarda ni sube nada a la BD real.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Llenar con un documento', () => {
  test('aparece en Nuevo cliente y Cancelar cierra sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/clientes')
    await page.getByTestId('nuevo-cliente').click()
    const dialogo = page.locator('.v-overlay--active')
    await expect(dialogo.getByTestId('llenar-con-documento')).toBeVisible()
    await expect(dialogo.getByText('Llenar con un documento')).toBeVisible()
    await page.getByTestId('cancelar-cliente').click()
    await expect(page.getByTestId('cancelar-cliente')).toBeHidden()
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('aparece en Nuevo proveedor y se cierra sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/proveedores')
    await page.getByRole('button', { name: /nuevo proveedor|agregar proveedor|nuevo/i }).first().click()
    const dialogo = page.locator('.v-overlay--active')
    await expect(dialogo.getByTestId('llenar-con-documento')).toBeVisible()
    await dialogo.getByRole('button', { name: 'Cancelar' }).first().click()
    await expect(dialogo.getByTestId('llenar-con-documento')).toBeHidden()
    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
