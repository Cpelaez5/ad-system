import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 4 — "Gasté o compré algo" en modo simple: paso 1 (3 opciones),
// "No tengo factura" → paso 2 (4 campos), "Ver detalles contables" plegado,
// cancelar sin guardar nada.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — registro simple (Gasté o compré algo)', () => {
  test('paso 1 con 3 opciones, paso 2 con 4 campos, detalles plegados, cancelar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inicio')
    await page.getByRole('button', { name: 'Gasté o compré algo' }).click()

    // Paso 1: 3 opciones.
    await expect(page.getByRole('button', { name: 'Tomarle foto' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Subir archivo' })).toBeVisible()
    const sinFactura = page.getByRole('button', { name: 'No tengo factura' })
    await expect(sinFactura).toBeVisible()

    await sinFactura.click()

    // Paso 2: 4 campos (flow COMPRA: ¿A quién le pagaste? ¿Cuánto? ¿Cuándo? ¿En qué?).
    const paso2 = page.locator('[data-testid="simple-paso2"]')
    await expect(paso2).toBeVisible()
    await expect(paso2.getByText('¿A quién le pagaste?')).toBeVisible()
    await expect(paso2.getByText('¿Cuánto?')).toBeVisible()
    await expect(paso2.getByText('¿Cuándo?')).toBeVisible()
    await expect(paso2.getByText('¿En qué?')).toBeVisible()

    // "Ver detalles contables" existe y está plegado (el contenido interno,
    // p.ej. "¿Qué tipo de registro es?", no está visible hasta expandirlo).
    const detalles = page.getByText('Ver detalles contables')
    await expect(detalles).toBeVisible()
    await expect(page.getByText('¿Qué tipo de registro es?')).toBeHidden()

    // Cancelar sin guardar: botón "Cerrar" del header (no se crea ningún registro).
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(paso2).toBeHidden()
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
