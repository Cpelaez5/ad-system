import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 1 — Login cliente → /cliente/inicio: frase del mes (formato moneda),
// 3 tarjetas de acción, sin errores de consola no documentados.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Inicio', () => {
  test('entra a /cliente/inicio con frase del mes, 3 tarjetas y sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inicio')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    // Frase del mes: siempre visible. Si hay movimientos este mes, lleva
    // formato de moneda ("$"); si no hay ninguno, la app muestra un mensaje
    // de estado vacío (ver Inicio.vue → fraseDelMes). En la BD real de este
    // entorno el cliente de prueba no tiene movimientos del mes en curso,
    // así que aceptamos ambos estados y solo exigimos "$" cuando sí hay cifras.
    const frase = page.locator('.inicio-frase-mes')
    await expect(frase).toBeVisible()
    const textoFrase = (await frase.textContent()) || ''
    if (!textoFrase.includes('todavía no registras nada')) {
      expect(textoFrase).toContain('$')
    }

    // 3 tarjetas de acción grandes (TarjetaAccion siempre expone role="button").
    await expect(page.getByRole('button', { name: 'Vendí algo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gasté o compré algo' })).toBeVisible()
    await expect(page.getByRole('button', { name: '¿Cómo voy?' })).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
