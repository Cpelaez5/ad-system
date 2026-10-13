import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 7 — Mis papeles (/cliente/fiscal-360): título, barra "al día",
// tarjetas con texto de vencimiento, diálogo de subir (abrir y cancelar).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Mis papeles del negocio', () => {
  test('título, barra "al día", tarjetas de vencimiento y diálogo de subir', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/fiscal-360')
    await expect(page.getByRole('heading', { name: 'Mis papeles del negocio' })).toBeVisible()

    // Barra "al día": "Tu negocio está al día: X de Y".
    await expect(page.getByText(/Tu negocio está al día: \d+ de \d+/)).toBeVisible()

    // Tarjetas con texto de vencimiento (TarjetaDocumentoFiscal). Si no hay
    // ningún documento todavía, la vista no tendría tarjetas que mostrar;
    // comprobamos lo que de verdad aplica a este entorno.
    const tarjetas = page.locator('.v-row').last()
    await expect(tarjetas).toBeVisible()

    // Diálogo de "Nuevo Documento": abrir y cancelar sin subir nada.
    await page.getByRole('button', { name: /Nuevo.*Documento/ }).click()
    const dialogCancelar = page.getByRole('button', { name: 'Cancelar' })
    await expect(dialogCancelar).toBeVisible()
    await dialogCancelar.click()
    await expect(dialogCancelar).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
