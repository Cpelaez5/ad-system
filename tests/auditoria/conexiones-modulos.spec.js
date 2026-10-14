/**
 * Auditoría 2026-10-14: huecos de conexión entre módulos.
 * Estos tests FALLAN A PROPÓSITO: cada uno demuestra un hueco real (ver
 * docs/mvp/auditoria/conexiones-modulos-2026-10-14.md). Cuando se arregle el
 * hueco, el test pasa y pasa a ser regresión.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const chain = (result) => {
    const c = {}
    for (const m of ['select', 'update', 'eq', 'is', 'order', 'limit']) c[m] = vi.fn(() => c)
    c.single = vi.fn(() => Promise.resolve(result))
    return c
  }
  return { chain, result: { current: { data: null, error: null } } }
})

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(() => mocks.chain(mocks.result.current)), auth: { getUser: vi.fn() } }
}))
vi.mock('@/utils/tenantHelpers', () => ({ getCurrentOrganizationId: () => 'org-1', getCurrentClientId: () => 'cli-1', queryWithTenant: vi.fn(), insertWithTenant: vi.fn(), updateWithTenant: vi.fn(), deleteWithTenant: vi.fn(), handleTenantError: vi.fn() }))
vi.mock('@/services/inventoryService.js', () => ({
  default: { registerMovement: vi.fn().mockResolvedValue({ success: true }), getProducts: vi.fn(), createProduct: vi.fn(), getNextProductSku: vi.fn() }
}))
vi.mock('@/services/retentionRpcService.js', () => ({ default: { registrarCompra: vi.fn().mockResolvedValue({ invoice_id: 'inv-1' }) } }))
vi.mock('@/services/email-notification-service.js', () => ({ default: { notifyInvoiceCreated: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/services/proveedorService.js', () => ({ default: {} }))

import inventoryService from '@/services/inventoryService.js'
import invoiceService from '@/services/invoiceService.js'
import { guardarRegistro } from '@/services/registroService.js'

beforeEach(() => vi.clearAllMocks())

describe('AUDITORIA 1: compra de mercancía -> inventario', () => {
  it('una compra de mercancía EMITIDA (ruta RPC) suma stock IN_PURCHASE', async () => {
    const spy = vi.spyOn(invoiceService, 'processInventoryMovements')
    const res = await guardarRegistro({
      flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', issueDate: '2026-10-01',
      issuer: { id: 'prov-1' }, client: { id: 'cli-1' }, financial: { totalSales: 10 },
      items: [{ description: 'Cable', quantity: 3, unitPrice: 2, isInventory: true, product_id: 'p1' }]
    })
    expect(res.success).toBe(true)
    // HUECO: registrar_compra_con_retenciones solo inserta la factura; nadie mueve stock.
    expect(spy.mock.calls.length + inventoryService.registerMovement.mock.calls.length).toBeGreaterThan(0)
  })
})

describe('AUDITORIA 1b: papelera/restaurar', () => {
  it('enviar a papelera una compra BORRADOR (que nunca sumó stock) NO debe restar stock', async () => {
    mocks.result.current = { data: { id: 'inv-9', flow: 'COMPRA', expense_type: 'COMPRA', status: 'BORRADOR', invoice_number: 'F-1',
      items: [{ product_id: 'p1', quantity: 5, unitPrice: 1 }] }, error: null }
    await invoiceService.deleteInvoice('inv-9')
    // HUECO: deleteInvoice revierte sin mirar el estado -> OUT_RETURN fantasma.
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('restaurar de la papelera una venta vuelve a descontar el stock', async () => {
    mocks.result.current = { data: { id: 'inv-8', flow: 'VENTA', status: 'EMITIDA', invoice_number: 'V-1',
      items: [{ product_id: 'p1', quantity: 2, unitPrice: 1 }] }, error: null }
    await invoiceService.restoreInvoice('inv-8')
    // HUECO: restoreInvoice solo limpia deleted_at; el stock devuelto al borrar no se vuelve a sacar.
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ movement_type: 'OUT_SALE' }))
  })
})
