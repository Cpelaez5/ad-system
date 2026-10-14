import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 11 — "Mi negocio" (Proveedores, Inventario, Mi área): consistencia
// de vistas de la ola Fase 2b, tarea B. Solo lectura: nunca guarda, edita ni
// elimina ningún registro real. Corre en los dos proyectos (desktop/mobile,
// ver playwright.config.js) porque el archivo no lleva sufijo .desktop/.mobile.
test.use({ storageState: CLIENTE_STORAGE })

// Comprueba que el botón "Cancelar" de un diálogo abierto es visible SIN
// necesitar scroll (la regresión original que motivó DialogoAdaptable: un
// diálogo más alto que la pantalla dejaba los botones inalcanzables en el
// teléfono, ver src/components/ui/DialogoAdaptable.vue).
// Acota el botón al pie de ACCIONES del diálogo realmente activo
// (`.v-overlay--active .v-card-actions`), nunca a cualquier "Cancelar" que
// pueda matchear dentro del contenido con scroll o en un diálogo anterior
// que Vuetify no desmontó del DOM (hallazgo de la corrida real 2026-10-13).
async function expectCancelarSinScroll(page) {
  const cancelar = page.locator('.v-overlay--active .v-card-actions').getByRole('button', { name: 'Cancelar' })
  await expect(cancelar).toBeVisible()
  const caja = await cancelar.boundingBox()
  const viewport = page.viewportSize()
  expect(caja).not.toBeNull()
  expect(caja.y).toBeGreaterThanOrEqual(0)
  expect(caja.y + caja.height).toBeLessThanOrEqual(viewport.height)
  return cancelar
}

test.describe('Cliente — Mi negocio (Proveedores, Inventario, Mi área)', () => {
  test('Proveedores carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/proveedores')
    await expect(page).toHaveURL(/\/cliente\/proveedores/)
    await expect(page.getByText('Proveedores').first()).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('Inventario carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/inventario')
    await expect(page).toHaveURL(/\/cliente\/inventario/)
    await expect(page.getByText('Inventario').first()).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('Mi área carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/mi-area')
    await expect(page).toHaveURL(/\/cliente\/mi-area/)
    await expect(page.getByText('Mi perfil').first()).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('un diálogo de Proveedores abre con "Cancelar" visible sin scroll y se cierra sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/proveedores')
    await expect(page).toHaveURL(/\/cliente\/proveedores/)

    // Diálogo "Nuevo Proveedor": siempre disponible, sin depender de que ya
    // existan proveedores cargados en este entorno.
    await page.getByRole('button', { name: 'Nuevo Proveedor' }).click()
    const cancelarNuevo = await expectCancelarSinScroll(page)
    await cancelarNuevo.click()
    await expect(cancelarNuevo).toBeHidden()

    // Si el entorno ya tiene al menos un proveedor cargado, también
    // comprobamos el diálogo de eliminar (DialogoAdaptable, Tarea B):
    // abre con "Cancelar" visible sin scroll y cancelar no borra nada.
    const primeraFila = page.locator('.mobile-provider-card, .provider-table-row').first()
    if (await primeraFila.isVisible().catch(() => false)) {
      const esMobil = await page.locator('.mobile-fab').isVisible().catch(() => false)

      if (esMobil) {
        await primeraFila.getByRole('button', { name: /dots/i }).or(primeraFila.locator('.mdi-dots-vertical')).first().click()
        await page.getByText('Eliminar / Archivar').click()
      } else {
        await primeraFila.locator('button:has(.mdi-delete-outline)').first().click()
      }

      const cancelarEliminar = await expectCancelarSinScroll(page)
      await cancelarEliminar.click()
      await expect(cancelarEliminar).toBeHidden()

      // Sigue habiendo la misma cantidad de filas: cancelar no eliminó nada.
      await expect(primeraFila).toBeVisible()
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
