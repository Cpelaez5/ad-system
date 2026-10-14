import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 3 — Navegación escritorio (proyecto "desktop" únicamente, ver
// testIgnore en playwright.config.js): menú lateral a todo el alto con textos
// visibles; el pin lo recoge (solo íconos) y se expande al pasar el mouse; la
// preferencia persiste tras recargar (localStorage `ad_system_menu_modo`).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — navegación escritorio', () => {
  test('menú a todo el alto, recoger con el pin, expandir con hover y persistencia', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inicio')
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    const drawer = page.locator('.menu-lateral')
    await expect(drawer).toBeVisible()

    // A todo el alto: empieza arriba de la ventana, no debajo de la barra superior.
    const caja = await drawer.boundingBox()
    expect(caja.y).toBe(0)

    await expect(drawer.getByText('Inicio', { exact: true })).toBeVisible()
    await expect(drawer.getByText('Mis movimientos')).toBeVisible()
    await expect(drawer).not.toHaveClass(/v-navigation-drawer--rail/)

    // Recoger con el pin de la cabecera del menú.
    await page.getByRole('button', { name: 'Recoger el menú y expandir al pasar el mouse' }).click()
    await expect(drawer).toHaveClass(/v-navigation-drawer--rail/)

    // Recogido: los íconos siguen dentro del menú (antes se salían 20px a la izquierda).
    await page.mouse.move(1000, 400)
    const icono = drawer.locator('.v-list-item .v-icon').first()
    const cajaIcono = await icono.boundingBox()
    expect(cajaIcono.x).toBeGreaterThanOrEqual(0)

    // Al pasar el mouse se expande por encima del contenido.
    await drawer.hover()
    await expect(drawer).toHaveClass(/v-navigation-drawer--is-hovering/)
    await expect(drawer.getByText('Mis movimientos')).toBeVisible()

    // La preferencia persiste tras recargar.
    await page.reload()
    await expect(page.locator('.menu-lateral')).toHaveClass(/v-navigation-drawer--rail/)

    // Volver a dejarlo fijo (deja el estado como estaba para otras pruebas).
    await page.locator('.menu-lateral').hover()
    await page.getByRole('button', { name: 'Dejar el menú siempre abierto' }).click()
    await expect(page.locator('.menu-lateral')).not.toHaveClass(/v-navigation-drawer--rail/)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
