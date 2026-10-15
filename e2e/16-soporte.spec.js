import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Soporte con tickets en el mismo chat (docs/mvp/diseno/soporte-y-tickets.md).
// Solo abre el chat y CANCELA: no se crea ninguna consulta ni mensaje (BD real).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — soporte con el equipo', () => {
  test('abre el chat, ve "Escribirle al equipo" y cancela sin enviar', async ({ page }) => {
    await page.goto('/cliente/inicio')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    // Escritorio: botón flotante; teléfono: evento de la hoja "Más" → "Ayuda".
    const fab = page.locator('.chat-fab')
    if (await fab.isVisible()) await fab.click()
    else await page.evaluate(() => window.dispatchEvent(new CustomEvent('ad-open-support-chat')))

    const panel = page.locator('.chat-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('tab', { name: /Asistente/ })).toBeVisible()
    await expect(panel.getByRole('tab', { name: /Mis consultas/ })).toBeVisible()

    const escribir = panel.getByRole('button', { name: 'Escribirle al equipo' })
    await expect(escribir).toBeVisible()
    await escribir.click()

    await expect(panel.getByText('¿Sobre qué es?')).toBeVisible()
    await expect(panel.getByRole('button', { name: 'Pagos y mi plan' })).toBeVisible()
    // Sin tema ni mensaje, no se puede enviar.
    await expect(panel.getByRole('button', { name: 'Enviar al equipo' })).toBeDisabled()

    await panel.getByRole('button', { name: 'Cancelar' }).click()
    await expect(panel.getByText('¿Sobre qué es?')).toHaveCount(0)
    await expect(panel.getByRole('button', { name: 'Escribirle al equipo' })).toBeVisible()

    await page.locator('.chat-close-btn').click()
    await expect(panel).toBeHidden()
  })
})
