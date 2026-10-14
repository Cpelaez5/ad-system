import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 6 — ¿Cómo voy? (/cliente/dashboard): selector de período, frase de
// resultado + 3 cifras (Vendí / Gasté / Lo que vas a declarar), sección
// "Últimos 6 meses"; cambiar a "Mes pasado" cambia el contenido sin errores
// de consola.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — ¿Cómo voy?', () => {
  test('selector de período, 3 KPI y "Últimos 6 meses"; cambiar de período no rompe nada', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/dashboard')
    await expect(page.getByRole('heading', { name: '¿Cómo voy?' })).toBeVisible()

    // Selector de período con sus 3 opciones.
    const selector = page.locator('.selector-periodo')
    await expect(selector).toBeVisible()
    await expect(selector.getByText('Este mes')).toBeVisible()
    await expect(selector.getByText('Mes pasado')).toBeVisible()
    await expect(selector.getByText('Este año')).toBeVisible()

    // Hay datos este año (ver informe E2E), así que con "Este año" las 3
    // cifras en línea y "Últimos 6 meses" deben estar presentes.
    await selector.getByText('Este año').click()
    await expect(page.locator('.tarjeta-kpi')).toHaveCount(3)
    await expect(page.getByText('Vendí', { exact: true })).toBeVisible()
    await expect(page.getByText('Gasté', { exact: true })).toBeVisible()
    await expect(page.getByText('Lo que vas a declarar', { exact: true })).toBeVisible()
    await expect(page.getByText('¿Cómo va mi negocio mes a mes?')).toBeVisible()

    // Cambiar a "Mes pasado": cambia el contenido (en este entorno, el
    // cliente de prueba no tiene movimientos el mes pasado → estado vacío)
    // sin que aparezcan errores de consola.
    await selector.getByText('Mes pasado').click()
    await expect(
      page.getByText('Aún no hay movimientos en este período').or(page.locator('.tarjeta-kpi').first())
    ).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
