import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 7 — Mis papeles (rediseño 2026-10-13): avance en barra de segmentos,
// "Tu siguiente paso" con una acción, filtros, filas por categoría con su ciclo,
// periódicas plegadas y el diálogo de subir (abrir y cancelar sin guardar).
test.use({ storageState: CLIENTE_STORAGE })

test.describe('Cliente — Mis papeles del negocio', () => {
  test('avance, siguiente paso, filtros, filas y diálogo de subir', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/fiscal-360')
    await expect(page.getByRole('heading', { name: 'Mis papeles', exact: true })).toBeVisible()

    // Avance: "X de Y papeles al día" + un segmento por papel.
    await expect(page.getByText(/papeles? al día/).first()).toBeVisible()
    await expect(page.locator('.barra-segmentos__segmento').first()).toBeVisible()

    // Siguiente paso (o el mensaje de "todo al día").
    await expect(page.getByText('Tu siguiente paso').or(page.getByText('¡Tu negocio está al día!'))).toBeVisible()

    // Filas con su estado en palabras (nunca solo color).
    await expect(page.locator('.fila-papel').first()).toBeVisible()

    // Filtro "Por resolver" deja solo lo pendiente.
    const porResolver = page.getByText(/Por resolver · \d+/)
    if (await porResolver.isEnabled()) {
      await porResolver.click()
      await expect(page.locator('.fila-papel').first()).toBeVisible()
      await page.getByText(/^Todos · \d+/).click()
    }

    // Las periódicas empiezan plegadas: tocar una la despliega.
    const periodica = page.locator('.tracker-periodos__cabecera').first()
    if (await periodica.count()) {
      await expect(periodica).toHaveAttribute('aria-expanded', 'false')
      await periodica.click()
      await expect(periodica).toHaveAttribute('aria-expanded', 'true')
    }

    // Diálogo de subir: abrir y cancelar sin subir nada.
    await page.getByRole('button', { name: /Subir documento/i }).click()
    const cancelar = page.locator('.v-overlay--active').getByRole('button', { name: 'Cancelar' })
    await expect(cancelar).toBeVisible()
    await cancelar.click()
    await expect(cancelar).toBeHidden()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
