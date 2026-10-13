import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 10 — Seguridad básica: el cliente que navega a /usuarios o
// /admin/ai-settings es redirigido (no ve la página), ver router guard en
// src/router/index.js ("Verificar roles si la ruta lo requiere").
test.use({ storageState: CLIENTE_STORAGE })

// El guard de router hace una llamada de red real (supabase.auth.getSession()
// + lectura del perfil) antes de decidir la redirección, así que le damos más
// margen que el timeout por defecto (10s) antes de darlo por fallido.
const TIMEOUT_REDIRECCION = 25_000

test.describe('Seguridad — cliente no puede ver pantallas de admin', () => {
  test('/usuarios redirige al cliente a /cliente/inicio', async ({ page }) => {
    await page.goto('/usuarios')
    await expect(page).toHaveURL(/\/cliente\/inicio/, { timeout: TIMEOUT_REDIRECCION })
    await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible()
  })

  test('/admin/ai-settings redirige al cliente a /cliente/inicio', async ({ page }) => {
    await page.goto('/admin/ai-settings')
    await expect(page).toHaveURL(/\/cliente\/inicio/, { timeout: TIMEOUT_REDIRECCION })
    await expect(page.getByRole('heading', { name: /Hola,/ })).toBeVisible()
  })
})
