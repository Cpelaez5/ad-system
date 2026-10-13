import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 3 — Navegación escritorio (proyecto "desktop" únicamente, ver
// testIgnore en playwright.config.js): menú lateral con textos visibles,
// botón de plegar deja el menú en modo rail, y la preferencia persiste tras
// recargar (localStorage `ad_system_sidebar_rail_collapsed`, ver AppShell.vue).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — navegación escritorio', () => {
  test('menú lateral visible, plegar a modo rail y persistencia tras recargar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inicio')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    const drawer = page.locator('.menu-lateral')
    await expect(drawer).toBeVisible()

    // Textos del menú visibles (no en modo rail todavía).
    await expect(drawer.getByText('Inicio', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Mis movimientos')).toBeVisible()
    await expect(drawer.getByText('¿Cómo voy?')).toBeVisible()
    await expect(drawer).not.toHaveClass(/v-navigation-drawer--rail/)

    // Plegar: botón de rail en el app bar.
    const railBtn = page.getByRole('button', { name: 'Contraer menú' })
    await expect(railBtn).toBeVisible()
    await railBtn.click()
    await expect(drawer).toHaveClass(/v-navigation-drawer--rail/)

    // La preferencia persiste tras recargar la página.
    await page.reload()
    await expect(page.locator('.menu-lateral')).toHaveClass(/v-navigation-drawer--rail/)
    await expect(page.getByRole('button', { name: 'Expandir menú' })).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
