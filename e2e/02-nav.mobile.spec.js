import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 2 — Navegación móvil (proyecto "mobile" únicamente, ver testIgnore
// en playwright.config.js): barra inferior, sin burbuja de chat, app bar con
// título, hoja "Más" (Tasas del día + Ayuda) y Ayuda abre el chat.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — navegación móvil', () => {
  test('barra inferior, sin burbuja de chat, título en app bar, hoja Más y Ayuda', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inicio')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    // Barra inferior con los 4 ítems.
    const bottomNav = page.locator('.cliente-bottom-nav')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.getByText('Inicio')).toBeVisible()
    await expect(bottomNav.getByText('Registrar')).toBeVisible()
    await expect(bottomNav.getByText('Mis números')).toBeVisible()
    await expect(bottomNav.getByText('Más')).toBeVisible()

    // Sin burbuja de chat flotante (oculta en <600px, ver SupportChat.vue).
    await expect(page.locator('.chat-fab')).toBeHidden()

    // El app bar muestra el título de la vista actual.
    await expect(page.locator('.barra-superior__titulo')).toContainText('Inicio')

    // "Más" abre la hoja con "Tasas del día" y "Ayuda".
    await page.getByRole('button', { name: 'Más opciones' }).click()
    await expect(page.getByText('Tasas del día')).toBeVisible()
    const ayuda = page.getByText('Ayuda', { exact: true })
    await expect(ayuda).toBeVisible()

    // "Ayuda" abre el chat (panel fullscreen en móvil).
    await ayuda.click()
    await expect(page.locator('.chat-panel')).toBeVisible()
    await expect(page.locator('.chat-panel')).toHaveClass(/chat-panel--mobile/)

    // Cerrar el chat sin enviar nada.
    await page.locator('.chat-close-btn').click()
    await expect(page.locator('.chat-panel')).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
