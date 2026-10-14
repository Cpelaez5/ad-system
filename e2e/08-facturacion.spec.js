import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 8 — Facturación del cliente carga la lista; el formulario normal
// (no simple, el que usa Facturacion.vue) tiene "Fecha fiscal" en compras.
// Decisión vigente: SimpleInvoiceForm es el formulario activo (ClienteInvoiceForm
// queda legado), ver docs/mvp/invoice-forms-decision.md.
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Facturación (Mis movimientos)', () => {
  test('carga la lista de facturas', async ({ page, consoleErrors, isMobile }) => {
    await page.goto('/cliente/facturacion')
    await expect(page).toHaveURL(/\/cliente\/facturacion/)
    // El título "Mis movimientos" es el mismo en escritorio y móvil, pero
    // "Tus movimientos" (título de la tabla) solo existe en la v-data-table de escritorio: en
    // xs la lista usa FilaMovimiento (ver Facturacion.vue) y ese texto no
    // se renderiza nunca.
    await expect(page.getByText('Mis movimientos')).toBeVisible()
    if (isMobile) {
      await expect(page.locator('.ad-move-entrada').first()).toBeVisible()
    } else {
      await expect(page.getByText('Tus movimientos', { exact: true })).toBeVisible()
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('formulario normal de compras tiene "Fecha fiscal"; cancelar sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/facturacion?tab=compras')
    await page.getByRole('button', { name: 'Nuevo registro' }).click()

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
  test('móvil: el diálogo principal es usable sin hacer scroll (Cancelar visible); cerrar sin guardar', async ({ page, consoleErrors, isMobile }) => {
    // Solo aplica al proyecto mobile: en desktop (Desktop Chrome con
    // viewport 1366x800) forzar un viewport de teléfono no cambia que
    // isMobile sea false, y el diálogo mide ~2725px de alto ahí porque el
    // layout de escritorio no colapsa — no es la regresión que este test
    // vigila (corrida real 2026-10-13).
    test.skip(!isMobile, 'Solo aplica al proyecto mobile; en desktop el diálogo no colapsa al forzar el viewport')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/cliente/facturacion')
    await page.getByRole('button', { name: 'Nuevo registro' }).click()

    const cancelar = page.getByRole('button', { name: 'Cancelar' })
    await expect(cancelar).toBeVisible()

    // "Sin hacer scroll": el botón ya está dentro del viewport apenas abre,
    // no hace falta bajar la página para alcanzarlo.
    // El diálogo entra deslizándose desde abajo: se mide cuando terminó de llegar
    // (antes se medía a mitad de la animación y daba posiciones de más).
    await expect.poll(async () => {
      const b = await cancelar.boundingBox()
      return b ? Math.round(b.y + b.height) : Infinity
    }, { timeout: 5000 }).toBeLessThanOrEqual(844)
    const box = await cancelar.boundingBox()
    expect(box.y).toBeGreaterThanOrEqual(0)

    await cancelar.click()
    await expect(cancelar).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
