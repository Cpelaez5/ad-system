import { test, expect } from '@playwright/test'

// Ayuda pública: no necesita sesión (se anula el storageState del proyecto).
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Ayuda pública', () => {
  test('/ayuda carga sin sesión y busca "tasa"', async ({ page }) => {
    await page.goto('/ayuda')
    await expect(page.getByRole('heading', { name: '¿Con qué te ayudamos?' })).toBeVisible()
    await expect(page.getByTestId('ayuda-tarjeta-mi-negocio')).toBeVisible()

    await page.getByTestId('ayuda-buscador').locator('input').fill('tasa')
    await expect(page.getByTestId('ayuda-tarjeta-mi-negocio')).toBeVisible()
    await expect(page.getByTestId('ayuda-tarjeta-mis-papeles')).toHaveCount(0)
    await expect(page).toHaveURL(/\/ayuda$/)
  })

  test('un artículo se abre desde su tarjeta y trae el índice y "¿Te sirvió?"', async ({ page }) => {
    await page.goto('/ayuda')
    await page.getByTestId('ayuda-tarjeta-mi-negocio').click()
    await expect(page).toHaveURL(/\/ayuda\/mi-negocio$/)
    await expect(page.getByTestId('ayuda-contenido').getByRole('heading', { name: 'Mi negocio', level: 1 })).toBeVisible()
    await expect(page.getByText('¿Te sirvió?')).toBeVisible()
    await page.getByTestId('ayuda-util-si').click()
    await expect(page.getByText('¡Gracias! Nos alegra haberte ayudado.')).toBeVisible()
    await expect(page.getByTestId('ayuda-chat')).toBeVisible()
  })

  test('/ayuda/api muestra la documentación con x-api-key', async ({ page }) => {
    await page.goto('/ayuda/api')
    await expect(page.getByTestId('ayuda-contenido').getByText('x-api-key').first()).toBeVisible()
    await expect(page.getByTestId('ayuda-api-url')).toContainText('/functions/v1/api-productos')
    await expect(page.locator('[data-copiar]').first()).toBeVisible()
  })

  test('una guía que no existe avisa con amabilidad', async ({ page }) => {
    await page.goto('/ayuda/no-existe-esta-guia')
    await expect(page.getByTestId('ayuda-no-existe')).toBeVisible()
  })
})
