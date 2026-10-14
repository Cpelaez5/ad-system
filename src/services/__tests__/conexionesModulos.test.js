/**
 * Arreglos de conexiones entre módulos (auditoría 2026-10-14).
 *  1. Compra de mercancía por RPC -> inventario (+ proveedor_id, aviso si falla)
 *  2. Reversiones (papelera/restaurar/borrado definitivo/BORRADOR->EMITIDA/idempotencia)
 *  3. Autocreación de productos (escape PostgREST, client_id, sale_price 0)
 *  4. Proveedores (sin escritura al leer, vínculo por proveedor_id, ficha con todo)
 * Mocks de Supabase por tabla; no toca la BD real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => {
  const state = { tables: {}, builders: [] }
  const builder = (table) => {
    const b = { table, ops: [] }
    for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'is', 'in', 'not', 'or', 'order', 'limit', 'range']) {
      b[m] = vi.fn((...a) => { b.ops.push([m, ...a]); return b })
    }
    const res = () => {
      const r = state.tables[table]
      const v = typeof r === 'function' ? r(b) : r
      return Promise.resolve(v === undefined ? { data: null, error: null } : v)
    }
    b.single = vi.fn(() => res())
    b.then = (ok, ko) => res().then(ok, ko)
    state.builders.push(b)
    return b
  }
  return { state, builder }
})

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn((t) => h.builder(t)), auth: { getUser: vi.fn() }, rpc: vi.fn() }
}))
vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: () => 'org-1',
  getCurrentClientId: () => null,
  queryWithTenant: vi.fn(), insertWithTenant: vi.fn(), updateWithTenant: vi.fn(),
  deleteWithTenant: vi.fn(), handleTenantError: vi.fn((e) => e)
}))
vi.mock('@/services/inventoryService.js', () => ({
  default: {
    registerMovement: vi.fn().mockResolvedValue({ success: true }),
    getProducts: vi.fn().mockResolvedValue([]),
    createProduct: vi.fn(),
    getNextProductSku: vi.fn().mockResolvedValue('PROD-001')
  },
  patronBusquedaPostgrest: vi.fn()
}))
vi.mock('@/services/retentionRpcService.js', () => ({ default: { registrarCompra: vi.fn() } }))
vi.mock('@/services/email-notification-service.js', () => ({ default: { notifyInvoiceCreated: vi.fn().mockResolvedValue({}) } }))
vi.mock('@/services/proveedorService.js', () => ({ default: { buscarPorRifNormalizado: vi.fn(), createProveedor: vi.fn(), deleteProveedor: vi.fn() } }))

import inventoryService from '@/services/inventoryService.js'
import retentionRpcService from '@/services/retentionRpcService.js'
import invoiceService from '@/services/invoiceService.js'
import { guardarRegistro } from '@/services/registroService.js'

const compra = (extra = {}) => ({
  flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', issueDate: '2026-10-01',
  issuer: { id: 'prov-1' }, client: { id: 'cli-1' }, financial: { totalSales: 10 },
  items: [{ description: 'Cable', quantity: 3, unitPrice: 2, isInventory: true, product_id: 'p1' }],
  ...extra
})
const builderDe = (tabla, op) => h.state.builders.filter(b => b.table === tabla && b.ops.some(o => o[0] === op))

beforeEach(() => {
  vi.clearAllMocks()
  h.state.tables = {}
  h.state.builders.length = 0
  retentionRpcService.registrarCompra.mockResolvedValue({ invoice_id: 'inv-1' })
  inventoryService.registerMovement.mockResolvedValue({ success: true })
  inventoryService.getProducts.mockResolvedValue([])
})

describe('1. compra de mercancía por RPC -> inventario', () => {
  it('suma IN_PURCHASE leyendo la factura guardada y llena proveedor_id', async () => {
    h.state.tables.invoices = { data: { id: 'inv-1', status: 'EMITIDA', flow: 'COMPRA', expense_type: 'COMPRA', invoice_number: 'F-9', client_id: 'cli-1', items: [{ description: 'Cable', quantity: 3, unitPrice: 2, isInventory: true, product_id: 'p1' }] }, error: null }
    const res = await guardarRegistro(compra())
    expect(res.success).toBe(true)
    expect(res.warning).toBeUndefined()
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'p1', movement_type: 'IN_PURCHASE', quantity: 3, reference_id: 'inv-1' }))
    const upd = builderDe('invoices', 'update').find(b => b.ops.some(o => o[0] === 'update' && o[1].proveedor_id))
    expect(upd.ops.find(o => o[0] === 'update')[1]).toEqual({ proveedor_id: 'prov-1' })
  })

  it('guarda en invoices.items los product_id de productos autocreados', async () => {
    h.state.tables.invoices = { data: { id: 'inv-1', status: 'EMITIDA', flow: 'COMPRA', expense_type: 'COMPRA', invoice_number: 'F-9', client_id: 'cli-1', items: [{ description: 'Tornillo', quantity: 5, unitPrice: 1, isInventory: true }] }, error: null }
    inventoryService.createProduct.mockResolvedValue({ data: [{ id: 'p-nuevo' }] })
    const res = await guardarRegistro(compra({ items: [{ description: 'Tornillo', quantity: 5, unitPrice: 1, isInventory: true }] }))
    expect(res.success).toBe(true)
    const upd = builderDe('invoices', 'update').find(b => b.ops.some(o => o[0] === 'update' && o[1].items))
    expect(upd.ops.find(o => o[0] === 'update')[1].items[0].product_id).toBe('p-nuevo')
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'p-nuevo', movement_type: 'IN_PURCHASE' }))
  })

  it('no mueve inventario si la compra es BORRADOR ni si es un GASTO', async () => {
    await guardarRegistro(compra({ status: 'BORRADOR' }))
    await guardarRegistro(compra({ expense_type: 'GASTO' }))
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('si el inventario falla la compra queda guardada y el resultado avisa', async () => {
    h.state.tables.invoices = { data: { id: 'inv-1', status: 'EMITIDA', flow: 'COMPRA', expense_type: 'COMPRA', invoice_number: 'F-9', items: [{ description: 'Cable', quantity: 3, unitPrice: 2, product_id: 'p1' }] }, error: null }
    inventoryService.registerMovement.mockResolvedValue(new Error('sin conexión'))
    const res = await guardarRegistro(compra())
    expect(res.success).toBe(true)
    expect(res.data.id).toBe('inv-1')
    expect(res.warning).toMatch(/La compra se guardó, pero no pudimos sumar al inventario: sin conexión/)
    expect(res.message).toBe(res.warning)
  })
})

describe('2. reversiones', () => {
  const fila = (status, extra = {}) => ({ data: { id: 'inv-9', flow: 'COMPRA', expense_type: 'COMPRA', status, invoice_number: 'F-1', items: [{ product_id: 'p1', quantity: 5, unitPrice: 1 }], ...extra }, error: null })

  it.each(['BORRADOR', 'ANULADA'])('papelera de una factura %s no revierte inventario', async (st) => {
    h.state.tables.invoices = fila(st)
    await invoiceService.deleteInvoice('inv-9')
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('papelera de una compra EMITIDA con movimiento previo revierte (OUT_RETURN)', async () => {
    h.state.tables.invoices = fila('EMITIDA')
    h.state.tables.inventory_movements = { data: [{ product_id: 'p1', movement_type: 'IN_PURCHASE', quantity: 5 }], error: null }
    await invoiceService.deleteInvoice('inv-9')
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ movement_type: 'OUT_RETURN', quantity: 5 }))
  })

  it('restaurar una compra con efecto vuelve a aplicar IN_PURCHASE; BORRADOR no', async () => {
    h.state.tables.invoices = fila('PAGADA')
    h.state.tables.inventory_movements = { data: [{ product_id: 'p1', movement_type: 'IN_PURCHASE', quantity: 5 }, { product_id: 'p1', movement_type: 'OUT_RETURN', quantity: -5 }], error: null }
    await invoiceService.restoreInvoice('inv-9')
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ movement_type: 'IN_PURCHASE' }))
    inventoryService.registerMovement.mockClear()
    h.state.tables.invoices = fila('BORRADOR')
    await invoiceService.restoreInvoice('inv-9')
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('idempotencia: no vuelve a aplicar si ya hay efecto neto, ni revierte lo que nunca se aplicó', async () => {
    h.state.tables.inventory_movements = { data: [{ product_id: 'p1', movement_type: 'IN_PURCHASE', quantity: 5 }], error: null }
    const r1 = await invoiceService.processInventoryMovements({ id: 'inv-9', flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', items: [{ product_id: 'p1', quantity: 5 }] }, false)
    expect(r1.skipped).toBe('ya_aplicada')
    h.state.tables.inventory_movements = { data: [], error: null }
    const r2 = await invoiceService.processInventoryMovements({ id: 'inv-9', flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', items: [{ product_id: 'p1', quantity: 5 }] }, true)
    expect(r2.skipped).toBe('sin_efecto_previo')
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('borrado definitivo: lee id y status, y se niega si la compra tiene retenciones', async () => {
    h.state.tables.invoices = fila('ANULADA', { attachments: [], deleted_at: '2026-10-01' })
    h.state.tables.retenciones = { data: null, count: 2, error: null }
    const res = await invoiceService.hardDeleteInvoice('inv-9')
    expect(res.success).toBe(false)
    expect(res.message).toMatch(/comprobantes de retención; queda en la papelera como anulada/)
    expect(builderDe('invoices', 'delete')).toHaveLength(0)
    const sel = builderDe('invoices', 'select')[0].ops.find(o => o[0] === 'select')[1]
    expect(sel).toMatch(/\bid\b/)
    expect(sel).toMatch(/\bstatus\b/)
  })

  it('borrado definitivo sin retenciones borra y no revierte una ANULADA', async () => {
    h.state.tables.invoices = fila('ANULADA', { attachments: [], deleted_at: null })
    h.state.tables.retenciones = { data: null, count: 0, error: null }
    const res = await invoiceService.hardDeleteInvoice('inv-9')
    expect(res.success).toBe(true)
    expect(inventoryService.registerMovement).not.toHaveBeenCalled()
  })

  it('BORRADOR -> EMITIDA al editar aplica movimientos y guarda product_id autocreados', async () => {
    const items = [{ description: 'Tuerca', quantity: 2, unitPrice: 3, isInventory: true }]
    let n = 0
    h.state.tables.invoices = (b) => {
      const esUpdateItems = b.ops.some(o => o[0] === 'update' && o[1].items && Object.keys(o[1]).length === 1)
      if (esUpdateItems) return { data: null, error: null }
      n++
      if (n === 1) return { data: { id: 'inv-5', status: 'BORRADOR', flow: 'COMPRA', expense_type: 'COMPRA', items, invoice_number: 'F-5' }, error: null }
      return { data: { id: 'inv-5', status: 'EMITIDA', flow: 'COMPRA', expense_type: 'COMPRA', items, invoice_number: 'F-5', client_id: 'cli-1' }, error: null }
    }
    inventoryService.createProduct.mockResolvedValue({ data: [{ id: 'p-t' }] })
    vi.spyOn(invoiceService, 'getCurrentUserProfile').mockResolvedValue({ role: 'admin' })
    const res = await invoiceService.updateInvoice('inv-5', { flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', invoiceNumber: 'F-5', issuer: { id: 'prov-1' }, items })
    expect(res.success).toBe(true)
    expect(inventoryService.registerMovement).toHaveBeenCalledWith(expect.objectContaining({ product_id: 'p-t', movement_type: 'IN_PURCHASE' }))
    expect(res.data.items[0].product_id).toBe('p-t')
    const upd = builderDe('invoices', 'update')[0].ops.find(o => o[0] === 'update')[1]
    expect(upd.proveedor_id).toBe('prov-1')
  })
})

describe('3. autocreación de productos', () => {
  const factura = { id: 'inv-2', client_id: 'cli-7', flow: 'COMPRA', expense_type: 'COMPRA', status: 'EMITIDA', invoice_number: 'F-2', items: [{ description: 'Cable (3,5 mm) 100%', quantity: 1, unitPrice: 8, isInventory: true }] }

  it('busca acotado al client_id de la factura y crea con client_id, tipo y sale_price 0', async () => {
    inventoryService.createProduct.mockResolvedValue({ data: [{ id: 'p-c' }] })
    const res = await invoiceService.processInventoryMovements(factura, false)
    expect(inventoryService.getProducts).toHaveBeenCalledWith(expect.objectContaining({ search: 'Cable (3,5 mm) 100%', clientId: 'cli-7' }))
    expect(inventoryService.createProduct).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'cli-7', tipo: 'producto', sale_price: 0, cost_price: 8, stock: 0 }))
    expect(res.createdProducts[0]).toEqual(expect.objectContaining({ productId: 'p-c', reused: false }))
  })

  it('reutiliza el producto existente de nombre exacto', async () => {
    inventoryService.getProducts.mockResolvedValue([{ id: 'p-e', name: 'cable (3,5 mm) 100%' }])
    const res = await invoiceService.processInventoryMovements(factura, false)
    expect(inventoryService.createProduct).not.toHaveBeenCalled()
    expect(res.createdProducts[0].reused).toBe(true)
  })

  it('si no puede crear el producto, el resultado es success:false con el motivo', async () => {
    inventoryService.createProduct.mockResolvedValue(new Error('RLS'))
    const res = await invoiceService.processInventoryMovements(factura, false)
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/no se pudo crear el producto/)
  })
})

describe('3b. patronBusquedaPostgrest (real)', () => {
  it('entrecomilla y escapa comas, paréntesis, %, _ y comillas', async () => {
    const real = await vi.importActual('@/services/inventoryService.js')
    expect(real.patronBusquedaPostgrest('a,b(c)')).toBe('"%a,b(c)%"')
    expect(real.patronBusquedaPostgrest('100%')).toBe('"%100\\\\%%"')
    expect(real.patronBusquedaPostgrest('x_y')).toBe('"%x\\\\_y%"')
    expect(real.patronBusquedaPostgrest('15.6"')).toBe('"%15.6\\"%"')
  })
})

describe('4. proveedores', () => {
  let proveedorService, facturaEsDeProveedor

  beforeEach(async () => {
    const real = await vi.importActual('@/services/proveedorService.js')
    proveedorService = real.default
    facturaEsDeProveedor = real.facturaEsDeProveedor
    vi.spyOn(proveedorService, '_getEffectiveContext').mockResolvedValue({ orgId: 'org-1', clientId: null })
    vi.spyOn(proveedorService, 'getISLRConcepts').mockResolvedValue([])
    vi.spyOn(proveedorService, 'getMunicipios').mockResolvedValue([])
  })

  it('facturaEsDeProveedor: por proveedor_id; RIF solo si es null; nunca por nombre', () => {
    const p = { id: 'p1', rif: 'J-12345678-9', nombre: 'Ana' }
    expect(facturaEsDeProveedor({ proveedor_id: 'p1', issuer: { rif: 'otro' } }, p)).toBe(true)
    expect(facturaEsDeProveedor({ proveedor_id: 'p2', issuer: { rif: 'J123456789' } }, p)).toBe(false)
    expect(facturaEsDeProveedor({ proveedor_id: null, issuer: { rif: 'J123456789' } }, p)).toBe(true)
    expect(facturaEsDeProveedor({ proveedor_id: null, issuer: { companyName: 'Ana' } }, p)).toBe(false)
    expect(facturaEsDeProveedor({ issuer: { companyName: 'Analytics C.A.' } }, p)).toBe(false)
  })

  it('_syncFromInvoices no crea proveedores (ni RIF PROV-) y totaliza por proveedor_id', async () => {
    h.state.tables.invoices = {
      data: [
        { id: 'a', proveedor_id: 'p1', status: 'EMITIDA', issuer: { companyName: 'Ana' }, financial: { totalSales: 100 }, issue_date: '2026-10-01' },
        { id: 'b', proveedor_id: null, status: 'PAGADA', issuer: { companyName: 'Ana', rif: 'J-1' }, financial: { totalSales: 50 }, issue_date: '2026-10-02' },
        { id: 'c', proveedor_id: 'p2', status: 'EMITIDA', issuer: { companyName: 'Analytics C.A.' }, financial: { totalSales: 999 }, issue_date: '2026-10-03' },
        { id: 'd', proveedor_id: 'p1', status: 'ANULADA', issuer: {}, financial: { totalSales: 7 }, issue_date: '2026-10-04' },
        { id: 'e', proveedor_id: null, status: 'EMITIDA', issuer: { companyName: 'Desconocido SA' }, financial: { totalSales: 1 }, issue_date: '2026-10-05' }
      ], error: null
    }
    h.state.tables.retenciones = { data: [], error: null }
    const existentes = [{ id: 'p1', rif: 'J-1', nombre: 'Ana' }, { id: 'p2', rif: 'J-2', nombre: 'Analytics C.A.' }]
    const out = await proveedorService._syncFromInvoices('org-1', null, existentes)
    expect(builderDe('proveedores', 'insert')).toHaveLength(0)
    expect(out).toHaveLength(2)
    const p1 = out.find(p => p.id === 'p1')
    expect(p1.total_compras).toBe(150)
    expect(p1.total_facturas).toBe(2)
    expect(out.find(p => p.id === 'p2').total_compras).toBe(999)
  })

  it('la ficha suma TODAS las compras, no solo las últimas 10', async () => {
    const muchas = Array.from({ length: 13 }, (_, i) => ({ id: `f${i}`, proveedor_id: 'p1', status: 'EMITIDA', issue_date: `2026-09-${String(i + 1).padStart(2, '0')}`, issuer: {}, financial: { totalSales: 10 } }))
    h.state.tables.proveedores = { data: { id: 'p1', rif: 'J-1', nombre: 'Ana' }, error: null }
    h.state.tables.invoices = { data: [...muchas, { id: 'x', proveedor_id: 'p9', status: 'EMITIDA', issuer: {}, financial: { totalSales: 500 } }], error: null }
    h.state.tables.retenciones = { data: Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, monto_retenido: 2 })), error: null }
    const ficha = await proveedorService.getProveedorById('p1')
    expect(ficha.metricas.totalCompras).toBe(130)
    expect(ficha.metricas.totalFacturas).toBe(13)
    expect(ficha.metricas.totalRetenido).toBe(24)
    expect(ficha.facturasRecientes).toHaveLength(10)
  })
})
