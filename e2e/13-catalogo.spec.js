import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 13 — Catálogo global en Mi mercancía. Solo lectura: abre y cancela,
// nunca guarda en la BD real.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Catálogo global en Mi mercancía', () => {
  test('"Escribirlo yo" con un código de barras inválido no rompe nada y Cancelar cierra', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inventario')
    await page.getByRole('button', { name: 'Escribirlo yo' }).first().click()

    const dialogo = page.locator('.v-overlay--active')
    await expect(dialogo.getByText('Nuevo producto').first()).toBeVisible()

    await dialogo.getByText('Más datos (opcional)').click()
    // 1234567890123 tiene el dígito verificador mal: no debe consultar ni mostrar nada del catálogo
    await dialogo.getByLabel('Código de barras').fill('1234567890123')
    await page.waitForTimeout(700)

    await expect(dialogo.getByTestId('catalogo-marca-producto')).toHaveCount(0)
    await expect(dialogo.getByText('Nuevo producto').first()).toBeVisible()

    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo.getByText('Nuevo producto')).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
