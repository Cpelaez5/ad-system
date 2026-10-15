import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 15 — Retenciones municipales. Solo lectura: abre y cancela, nunca guarda
// en la BD real. Corre en escritorio y móvil (ver playwright.config.js).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Retenciones municipales', () => {
  test('carga la lista con sus filtros y sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/municipal-settings')
    await expect(page.getByRole('heading', { name: 'Retenciones municipales' }).first()).toBeVisible()
    await expect(page.getByTestId('municipal-filtro-municipio')).toBeVisible()
    await expect(page.getByTestId('municipal-filtro-origen')).toBeVisible()
    // El cliente solo consulta: ve el aviso y no ve "Nuevo código".
    await expect(page.getByTestId('municipal-aviso-cliente')).toContainText('Tu contador administra estos códigos')
    await expect(page.getByTestId('municipal-nuevo')).toHaveCount(0)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
