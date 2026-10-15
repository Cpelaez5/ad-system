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
  const viewport = page.viewportSize()
  // El diálogo entra con una transición (dialog-bottom-transition): medir en
  // el primer fotograma da una posición intermedia fuera de pantalla. Se
  // espera a que el botón se asiente dentro del viewport.
  await expect
    .poll(async () => {
      const caja = await cancelar.boundingBox()
      return caja ? caja.y >= 0 && caja.y + caja.height <= viewport.height : false
    }, { timeout: 5000 })
    .toBe(true)
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
    // Rediseño "patrón cliente" (ola F2b): el encabezado editorial usa el
    // mismo nombre del menú, "Mi mercancía", no "Inventario".
    await expect(page.getByText('Mi mercancía').first()).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('Mi área carga sin errores de consola', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/mi-area')
    await expect(page).toHaveURL(/\/cliente\/mi-area/)
    // Ola "patrón cliente" (2026-10-13): el título de la pantalla pasó a
    // "Mi negocio", igual que en el menú (ver docs/mvp/diseno/patron-cliente.md).
    await expect(page.getByRole('heading', { name: 'Mi negocio' }).first()).toBeVisible()

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('Mi negocio muestra "Tasa de cambio": se puede cambiar de opción y cancelar o volver sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/mi-area#tasa')
    // En el teléfono, el aviso de cookies y la barra inferior tapan lo que queda al borde.
    // El aviso de cookies aparece con retraso: se espera un poco y se cierra si sale.
    await page.getByRole('button', { name: 'Rechazar' }).click({ timeout: 6000 }).catch(() => {})
    const tocar = async (loc) => {
      await loc.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await loc.click({ timeout: 5000 }).catch(() => loc.dispatchEvent('click'))
    }
    const seccion = page.getByTestId('tasa-cambio')
    await expect(seccion).toBeVisible()
    await expect(seccion.getByRole('heading', { name: 'Tasa de cambio' })).toBeVisible()
    await expect(seccion.getByText('Automática (BCV)')).toBeVisible()
    await expect(seccion.getByText('La defino yo')).toBeVisible()
    await expect(seccion.getByTestId('tasa-aviso')).toContainText('servicio externo basado en el BCV')

    // Cambiar a "La defino yo": aparecen los campos de USD y EUR; Cancelar vuelve sin guardar nada.
    const manual = seccion.getByTestId('tasa-opcion-manual')
    const automatica = seccion.getByTestId('tasa-opcion-automatica')
    const modoInicial = await automatica.getAttribute('aria-checked')
    await tocar(modoInicial === 'true' ? manual : automatica)
    if (modoInicial === 'true') {
      await expect(seccion.getByTestId('tasa-campo-USD')).toBeVisible()
      await expect(seccion.getByTestId('tasa-campo-EUR')).toBeVisible()
    }
    await expect(seccion.getByTestId('tasa-cancelar')).toBeVisible()
    await tocar(seccion.getByTestId('tasa-cancelar'))
    await expect(automatica).toHaveAttribute('aria-checked', modoInicial)

    // Cambiar y volver a la opción inicial sin guardar: no quedan cambios pendientes.
    await tocar(modoInicial === 'true' ? manual : automatica)
    await tocar(modoInicial === 'true' ? automatica : manual)
    await expect(seccion.getByTestId('tasa-guardar')).toHaveCount(0)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('un diálogo de Proveedores abre con "Cancelar" visible sin scroll y se cierra sin guardar', async ({ page, consoleErrors }) => {
    await page.goto('/cliente/proveedores')
    await expect(page).toHaveURL(/\/cliente\/proveedores/)

    // Diálogo "Nuevo proveedor": siempre disponible, sin depender de que ya
    // existan proveedores cargados en este entorno. Rediseño "patrón
    // cliente" (ola F2b): el botón principal del encabezado ya no lleva
    // mayúscula en cada palabra.
    await page.getByRole('button', { name: 'Nuevo proveedor' }).click()
    const cancelarNuevo = await expectCancelarSinScroll(page)
    await cancelarNuevo.click()
    await expect(cancelarNuevo).toBeHidden()

    // Si el entorno ya tiene al menos un proveedor cargado, también
    // comprobamos el diálogo de eliminar (DialogoAdaptable, Tarea B):
    // abre con "Cancelar" visible sin scroll y cancelar no borra nada.
    // Rediseño: ya no hay tarjeta móvil / fila de tabla separadas — una
    // sola fila unificada (`.fila-proveedor`) para ambos tamaños.
    const primeraFila = page.locator('.fila-proveedor').first()
    if (await primeraFila.isVisible().catch(() => false)) {
      await primeraFila.getByRole('button', { name: 'Más opciones' }).click()
      await page.locator('.v-overlay--active').getByText('Eliminar').click()

      const cancelarEliminar = await expectCancelarSinScroll(page)
      await cancelarEliminar.click()
      await expect(cancelarEliminar).toBeHidden()

      // Sigue habiendo la misma cantidad de filas: cancelar no eliminó nada.
      await expect(primeraFila).toBeVisible()
    }

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
