import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 8 — Facturación del cliente carga la lista; el formulario normal
// (no simple, el que usa Facturacion.vue) tiene "Fecha fiscal" en compras.
// Decisión vigente: SimpleInvoiceForm es el formulario activo (ClienteInvoiceForm
// queda legado), ver docs/mvp/invoice-forms-decision.md.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Facturación (Mis movimientos)', () => {
  test('carga la lista de facturas', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/facturacion')
    await expect(page).toHaveURL(/\/cliente\/facturacion/)
    await expect(page.getByText('Lista de Facturas')).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('formulario normal de compras tiene "Fecha fiscal"; cancelar sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/facturacion?tab=compras')
    await page.getByRole('button', { name: 'Nuevo Registro' }).click()

    await expect(page.getByText(/Fecha fiscal/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText(/Fecha fiscal/).first()).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
