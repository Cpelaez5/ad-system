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

  // Tarea A (ola Fase 2b): el diálogo principal (envuelve SimpleInvoiceForm,
  // ver Facturacion.vue) debe quedar usable en el teléfono sin que el botón
  // "Cancelar" quede fuera de la pantalla (mismo hallazgo que motivó
  // DialogoAdaptable.vue en "Mis papeles", 2026-10-13). Fuerza un viewport
  // angosto para probarlo con determinismo sin importar el proyecto
  // (desktop/mobile) que ejecute el archivo.
  test('móvil: el diálogo principal es usable sin hacer scroll (Cancelar visible); cerrar sin guardar', async ({ page, consoleErrors }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/cliente/facturacion')
    await page.getByRole('button', { name: 'Nuevo Registro' }).click()

    const cancelar = page.getByRole('button', { name: 'Cancelar' })
    await expect(cancelar).toBeVisible()

    // "Sin hacer scroll": el botón ya está dentro del viewport apenas abre,
    // no hace falta bajar la página para alcanzarlo.
    const box = await cancelar.boundingBox()
    expect(box).not.toBeNull()
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(844)

    await cancelar.click()
    await expect(cancelar).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
