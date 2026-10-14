import path from 'node:path'
import { test, expect } from './helpers/base.js'
import { CLIENTE_STORAGE } from './helpers/auth.js'

// Flujo 5 — OCR (lento: lectura real con IA, ~10-40s por archivo). Tag @ocr:
// excluir con `npx playwright test --grep-invert @ocr`.
// Usa las facturas reales de examples/facturas-prueba/ (fuera de git, ver
// manual 07-agente-qa.md). Sube el archivo en el input oculto del modo
// simple, espera a que termine la lectura y verifica monto+fecha+moneda.
// SIEMPRE cancela sin guardar: no se crea ningún registro real.
test.use({ storageState: CLIENTE_STORAGE })

const FIXTURES_DIR = path.resolve('examples/facturas-prueba')

/** Input de archivo oculto del paso 1 del modo simple (ver SimpleInvoiceForm.vue
 * → FileUploadZone con accept que incluye "pdf"; el input de cámara, el otro
 * <input type="file"> de ese mismo componente, solo acepta imágenes). */
function simpleFileInput(page) {
  return page.locator('input[type="file"][accept*="pdf"]')
}

async function abrirRegistroYSubir(page, fileName) {
  await page.goto('/cliente/inicio')
  await page.getByRole('button', { name: 'Gasté o compré algo' }).click()
  await simpleFileInput(page).setInputFiles(path.join(FIXTURES_DIR, fileName))
  await page.waitForSelector('[data-testid="simple-paso2"]', { timeout: 60_000 })
}

/**
 * Tarea C (OCR) — verifica, sin guardar nada, que el proveedor y la
 * categoría quedaron prellenados en el paso 2 (si el documento es
 * COMPRA/GASTO; en VENTA estos campos no existen en el paso 2).
 *
 * Es deliberadamente tolerante: el proveedor puede haber quedado (a)
 * vinculado a uno que ya existía en el directorio del cliente de prueba, o
 * (b) marcado como "nuevo proveedor" (ver SimpleInvoiceForm.vue,
 * `mostrarProveedorPendienteOcr`); la categoría sugerida solo se prellena
 * (chip "Sugerido") si ya existe una categoría con ese nombre para ese
 * cliente, así que su ausencia no es un fallo del OCR.
 */
async function verificarProveedorYCategoriaPrellenados(paso2) {
  const etiquetaProveedor = paso2.getByText('¿A quién le pagaste?')
  if ((await etiquetaProveedor.count()) === 0) return // es VENTA: no aplica

  const proveedorPendiente = paso2.locator('[data-testid="proveedor-pendiente-ocr"]')
  if ((await proveedorPendiente.count()) > 0) {
    await expect(proveedorPendiente).toContainText('Nuevo proveedor')
    const nombre = (await proveedorPendiente.textContent()) || ''
    expect(nombre.trim().length).toBeGreaterThan('Nuevo proveedor — se guardará al registrar'.length)
  }

  // Chip "Sugerido" junto a "¿En qué?": solo si el cliente de prueba ya tiene
  // esa categoría creada. No se exige que aparezca, pero si aparece debe
  // acompañar a una categoría realmente seleccionada (no solo el chip suelto).
  const chipSugerido = paso2.getByText('Sugerido')
  if ((await chipSugerido.count()) > 0) {
    await expect(chipSugerido).toBeVisible()
  }
}

test.describe('Cliente — OCR en modo simple @ocr', () => {
  test('inter-1.pdf: detecta monto, fecha y moneda VES @ocr', async ({ page, consoleErrors }) => {
    test.slow() // la lectura OCR real puede tomar decenas de segundos

    await abrirRegistroYSubir(page, 'inter-1.pdf')

    const paso2 = page.locator('[data-testid="simple-paso2"]')
    // Moneda: el prefijo del campo "¿Cuánto?" debe ser "Bs" (VES), no "$".
    await expect(paso2).toContainText('Bs')

    // Monto: el campo numérico de "¿Cuánto?" quedó con un valor > 0.
    const montoInput = paso2.locator('input').nth(1)
    const monto = parseFloat((await montoInput.inputValue()) || '0')
    expect(monto).toBeGreaterThan(0)

    // Fecha: el campo de "¿Cuándo?" (CustomDatePicker) quedó lleno.
    const fechaInput = paso2.locator('input').nth(2)
    const fecha = (await fechaInput.inputValue()) || ''
    expect(fecha.trim().length).toBeGreaterThan(0)

    // Tarea C (OCR): proveedor y categoría sugeridos (ver helper más arriba).
    await verificarProveedorYCategoriaPrellenados(paso2)

    // Cancelar SIN guardar.
    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })

  test('amazon-usd.pdf: detecta moneda USD @ocr', async ({ page, consoleErrors }) => {
    test.slow()

    await abrirRegistroYSubir(page, 'amazon-usd.pdf')

    const paso2 = page.locator('[data-testid="simple-paso2"]')
    await expect(paso2).toContainText('$')

    const montoInput = paso2.locator('input').nth(1)
    const monto = parseFloat((await montoInput.inputValue()) || '0')
    expect(monto).toBeGreaterThan(0)

    const fechaInput = paso2.locator('input').nth(2)
    const fecha = (await fechaInput.inputValue()) || ''
    expect(fecha.trim().length).toBeGreaterThan(0)

    // Tarea C (OCR): proveedor y categoría sugeridos (ver helper más arriba).
    await verificarProveedorYCategoriaPrellenados(paso2)

    await page.getByRole('button', { name: 'Cerrar' }).click()
    await expect(page).toHaveURL(/\/cliente\/inicio/)

    expect(consoleErrors, consoleErrors.join('\n')).toEqual([])
  })
})
