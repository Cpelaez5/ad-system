/**
 * Tests unitarios del módulo de Inventario (inventoryService.js)
 *
 * Cubre:
 * - Filtros RLS y queries para Productos (getProducts)
 * - Lógica de Búsqueda Difusa (Fuzzy Matching) en findProductByNameOrCode
 * - Lógica de Movimientos (registerMovement) incluyendo manejo del signo (+/-) según el tipo de movimiento.
 * - Soft Delete vs Restore en Productos.
 * - Llamadas RPC a Supabase para Dashboard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────
// Mocks globales
// ─────────────────────────────────────────────────────────────
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

vi.mock('@/utils/tenantHelpers', () => ({
  getCurrentOrganizationId: vi.fn(),
  getCurrentClientId: vi.fn(),
  insertWithTenant: vi.fn(),
  updateWithTenant: vi.fn(),
  deleteWithTenant: vi.fn(),
  handleTenantError: vi.fn((err) => { throw err })
}))

import { supabase } from '@/lib/supabaseClient'
import { getCurrentOrganizationId, getCurrentClientId, insertWithTenant, updateWithTenant } from '@/utils/tenantHelpers'
import inventoryService from '@/services/inventoryService'

const ORG_ID = 'org-test-123'
const CLIENT_ID = 'client-test-xyz'

// ─────────────────────────────────────────────────────────────
// Helper: configurar supabase.from() con cadena fluida
// ─────────────────────────────────────────────────────────────
const mockSupabaseChain = (finalResult) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult)
  }
  chain.order = vi.fn().mockReturnValue(chain)
  chain.then = (resolve) => Promise.resolve(finalResult).then(resolve)
  chain.catch = (reject) => Promise.resolve(finalResult).catch(reject)
  return chain
}

const buildProduct = (overrides = {}) => ({
  id: 'prod-1',
  name: 'Laptop Dell 15',
  code: 'LPT-DELL-15',
  stock: 10,
  client_id: CLIENT_ID,
  deleted_at: null,
  ...overrides
})

describe('InventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentOrganizationId.mockReturnValue(ORG_ID)
    getCurrentClientId.mockReturnValue(CLIENT_ID)
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 1: getProducts (Filtros y Paginación)
  // ═════════════════════════════════════════════════════════════
  describe('getProducts', () => {
    it('inyecta eq("client_id") si hay un cliente activo', async () => {
      const chain = mockSupabaseChain({ data: [], error: null })
      supabase.from.mockReturnValue(chain)

      await inventoryService.getProducts()

      expect(chain.eq).toHaveBeenCalledWith('client_id', CLIENT_ID)
    })

    it('por defecto excluye los productos eliminados (.is("deleted_at", null))', async () => {
      const chain = mockSupabaseChain({ data: [], error: null })
      supabase.from.mockReturnValue(chain)

      await inventoryService.getProducts()

      expect(chain.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('aplica el or() para búsquedas de texto', async () => {
      const chain = mockSupabaseChain({ data: [], error: null })
      supabase.from.mockReturnValue(chain)

      await inventoryService.getProducts({ search: 'dell' })

      expect(chain.or).toHaveBeenCalledWith('name.ilike.%dell%,code.ilike.%dell%')
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 2: Búsqueda y Fuzzy Matching (findProductByNameOrCode)
  // ═════════════════════════════════════════════════════════════
  describe('findProductByNameOrCode (Fuzzy Matching)', () => {
    const productsInDB = [
      buildProduct({ name: 'Laptop Asus 15.6"' }),
      buildProduct({ name: 'Mouse Optico', code: 'MOU-01' })
    ]

    beforeEach(() => {
      const chain = mockSupabaseChain({ data: productsInDB, error: null })
      supabase.from.mockReturnValue(chain)
    })

    it('encuentra el producto por nombre exacto', async () => {
      const res = await inventoryService.findProductByNameOrCode('Laptop Asus 15.6"')
      expect(res.name).toBe('Laptop Asus 15.6"')
    })

    it('encuentra el producto por código exacto', async () => {
      const res = await inventoryService.findProductByNameOrCode('MOU-01')
      expect(res.name).toBe('Mouse Optico')
    })

    it('fuzzy match: encuentra el producto con errores tipográficos si la similitud > 85%', async () => {
      // Buscar "Lptop Asus 15.6" (falta la 'a' y las comillas) -> similitud muy alta
      const res = await inventoryService.findProductByNameOrCode('Lptop Asus 15.6')
      expect(res).not.toBeNull()
      expect(res.name).toBe('Laptop Asus 15.6"')
    })

    it('devuelve null si no se parece en absoluto (similitud < 85%)', async () => {
      const res = await inventoryService.findProductByNameOrCode('Monitor Samsung')
      expect(res).toBeNull()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 3: Movimientos de Inventario (registerMovement)
  // ═════════════════════════════════════════════════════════════
  describe('registerMovement', () => {
    it('resta stock (cantidad negativa) si el movimiento es OUT_SALE', async () => {
      // Mock de producto
      const product = buildProduct({ stock: 10 })
      vi.spyOn(inventoryService, 'getProductById').mockResolvedValue(product)
      
      // Mock updateProduct para espiar los parámetros
      vi.spyOn(inventoryService, 'updateProduct').mockResolvedValue({ success: true })

      // Mock insert de movement
      const chain = mockSupabaseChain({ data: { id: 1 }, error: null })
      supabase.from.mockReturnValue(chain)

      const movementData = {
        product_id: product.id,
        movement_type: 'OUT_SALE',
        quantity: 3 // Aunque venga positivo, debe guardarse como -3
      }

      await inventoryService.registerMovement(movementData)

      // Verificar que el movimiento se insertó con cantidad negativa (-3)
      const insertCall = chain.insert.mock.calls[0][0]
      expect(insertCall.quantity).toBe(-3)

      // Verificar que se actualizó el stock del producto a 7
      expect(inventoryService.updateProduct).toHaveBeenCalledWith(product.id, { stock: 7 })
    })

    it('suma stock si el movimiento es IN_PURCHASE', async () => {
      const product = buildProduct({ stock: 10 })
      vi.spyOn(inventoryService, 'getProductById').mockResolvedValue(product)
      vi.spyOn(inventoryService, 'updateProduct').mockResolvedValue({ success: true })

      const chain = mockSupabaseChain({ data: { id: 1 }, error: null })
      supabase.from.mockReturnValue(chain)

      await inventoryService.registerMovement({
        product_id: product.id,
        movement_type: 'IN_PURCHASE',
        quantity: 5,
        cost_price: 15
      })

      // Verificar que la cantidad es positiva (5)
      expect(chain.insert.mock.calls[0][0].quantity).toBe(5)

      // Verificar stock = 15 y que el costo también se actualizó porque es una compra
      expect(inventoryService.updateProduct).toHaveBeenCalledWith(product.id, { stock: 15, cost_price: 15 })
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 4: Soft Delete y Restauración
  // ═════════════════════════════════════════════════════════════
  describe('deleteProduct & restoreProduct', () => {
    it('deleteProduct realiza un Soft Delete cambiando el status a INACTIVE y marcando deleted_at', async () => {
      updateWithTenant.mockResolvedValue({ success: true, data: {} })
      
      await inventoryService.deleteProduct('prod-1')
      
      const updateCall = updateWithTenant.mock.calls[0]
      expect(updateCall[0]).toBe('inventory_products')
      expect(updateCall[1]).toBe('prod-1')
      expect(updateCall[2].status).toBe('INACTIVE')
      expect(updateCall[2].deleted_at).toBeDefined()
    })

    it('restoreProduct cambia el status a ACTIVE y nulea deleted_at', async () => {
      updateWithTenant.mockResolvedValue({ success: true, data: {} })
      
      await inventoryService.restoreProduct('prod-1')
      
      const updateCall = updateWithTenant.mock.calls[0]
      expect(updateCall[2].status).toBe('ACTIVE')
      expect(updateCall[2].deleted_at).toBeNull()
    })
  })

  // ═════════════════════════════════════════════════════════════
  // Suite 5: Llamadas RPC del Dashboard
  // ═════════════════════════════════════════════════════════════
  describe('Llamadas RPC del Servidor (Performance)', () => {
    it('getNextProductSku llama al RPC y devuelve fallback si falla', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 'PROD-010', error: null })
      let sku = await inventoryService.getNextProductSku()
      expect(sku).toBe('PROD-010')

      // Fallback
      supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('DB error') })
      sku = await inventoryService.getNextProductSku()
      expect(sku.startsWith('PROD-')).toBe(true)
      expect(sku).not.toBe('PROD-010')
    })

    it('getTopSellingProducts transforma los datos devueltos por el RPC', async () => {
      supabase.rpc.mockResolvedValue({
        data: [{ product_name: 'Lap', product_unit: 'KGS', total_sold: '150', total_revenue: '200' }],
        error: null
      })

      const tops = await inventoryService.getTopSellingProducts(5)
      expect(tops[0].name).toBe('Lap')
      expect(tops[0].unit).toBe('KGS')
      expect(tops[0].totalSold).toBe(150)
      expect(tops[0].totalRevenue).toBe(200)
    })
  })
})
