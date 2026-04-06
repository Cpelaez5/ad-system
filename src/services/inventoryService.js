import { supabase } from '@/lib/supabaseClient'
import {
    getCurrentOrganizationId,
    getCurrentClientId,
    insertWithTenant,
    updateWithTenant,
    deleteWithTenant,
    handleTenantError
} from '@/utils/tenantHelpers'

class InventoryService {
    constructor() {
        this.productsTable = 'inventory_products'
        this.movementsTable = 'inventory_movements'
    }

    // --- PRODUCTOS ---

    // Obtener lista de productos con filtros
    // Ops: search, limit, offset, clientId (opcional para admin), includeDeleted
    async getProducts({ search = '', limit = 50, offset = 0, clientId = null, includeDeleted = false } = {}) {
        try {
            let query = supabase
                .from(this.productsTable)
                .select('*')
                .eq('organization_id', getCurrentOrganizationId())
                .order('name', { ascending: true })

            // Filtrar por cliente si aplica
            const currentClientId = getCurrentClientId()
            const targetClientId = clientId || currentClientId
            if (targetClientId) {
                query = query.eq('client_id', targetClientId)
            }

            // Filtrar productos eliminados (soft delete)
            if (!includeDeleted) {
                query = query.is('deleted_at', null)
            }

            if (search) {
                query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
            }

            if (limit) query = query.limit(limit)
            if (offset) query = query.range(offset, offset + limit - 1)

            const { data, error } = await query
            if (error) throw error
            return data
        } catch (error) {
            return handleTenantError(error, 'getProducts')
        }
    }

    async getProductById(id) {
        try {
            const { data, error } = await supabase
                .from(this.productsTable)
                .select('*')
                .eq('id', id)
                .eq('organization_id', getCurrentOrganizationId())
                .single()

            if (error) throw error
            return data
        } catch (error) {
            return handleTenantError(error, 'getProductById')
        }
    }

    async createProduct(productData) {
        try {
            // Asignar client_id si no viene (necesario para cumplir RLS de cliente)
            const payload = {
                ...productData,
                client_id: productData.client_id || getCurrentClientId()
            }

            // Siempre pedimos returning:'*' para obtener el ID del registro recién creado
            return await insertWithTenant(this.productsTable, payload, { returning: '*' })
        } catch (error) {
            return handleTenantError(error, 'createProduct')
        }
    }

    async updateProduct(id, productData) {
        try {
            return await updateWithTenant(this.productsTable, id, productData)
        } catch (error) {
            return handleTenantError(error, 'updateProduct')
        }
    }

    async deleteProduct(id) {
        try {
            // Soft delete: marcar deleted_at y status como INACTIVE
            // Esto preserva el historial de movimientos (ledger) y evita errores de FK
            const result = await updateWithTenant(this.productsTable, id, {
                status: 'INACTIVE',
                deleted_at: new Date().toISOString()
            })

            if (result.error) {
                throw result.error
            }

            return { success: true, softDeleted: true }
        } catch (error) {
            console.error('Error deleteProduct', error)
            throw error
        }
    }

    // Restaurar un producto eliminado (soft delete)
    async restoreProduct(id) {
        try {
            const result = await updateWithTenant(this.productsTable, id, {
                status: 'ACTIVE',
                deleted_at: null
            })

            if (result.error) {
                throw result.error
            }

            return { success: true, restored: true }
        } catch (error) {
            console.error('Error restoreProduct', error)
            throw error
        }
    }

    // Obtener productos eliminados (para administración)
    async getDeletedProducts({ clientId = null } = {}) {
        try {
            let query = supabase
                .from(this.productsTable)
                .select('*')
                .eq('organization_id', getCurrentOrganizationId())
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false })

            const currentClientId = getCurrentClientId()
            const targetClientId = clientId || currentClientId
            if (targetClientId) {
                query = query.eq('client_id', targetClientId)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        } catch (error) {
            return handleTenantError(error, 'getDeletedProducts')
        }
    }

    // Calcular stock disponible desde ledger (inventory_movements)
    // Este método calcula el stock real basado en los movimientos, no en el campo stock del producto
    async getProductStockFromLedger(productId) {
        try {
            const { data, error } = await supabase
                .from(this.movementsTable)
                .select('quantity')
                .eq('product_id', productId)
                .eq('organization_id', getCurrentOrganizationId())

            if (error) throw error

            // Sumar todas las cantidades (ya tienen signo: positivo entradas, negativo salidas)
            const totalStock = (data || []).reduce((sum, movement) => {
                return sum + (parseFloat(movement.quantity) || 0)
            }, 0)

            return totalStock
        } catch (error) {
            console.error('Error getProductStockFromLedger', error)
            return null
        }
    }

    // Calcular stock para múltiples productos desde ledger
    // Retorna un objeto { productId: stock }
    async getBulkStockFromLedger(productIds = []) {
        try {
            if (!productIds || productIds.length === 0) return {}

            const { data, error } = await supabase
                .from(this.movementsTable)
                .select('product_id, quantity')
                .in('product_id', productIds)
                .eq('organization_id', getCurrentOrganizationId())

            if (error) throw error

            // Agrupar por producto y sumar
            const stockMap = {}
            ;(data || []).forEach(movement => {
                const pid = movement.product_id
                if (!stockMap[pid]) stockMap[pid] = 0
                stockMap[pid] += parseFloat(movement.quantity) || 0
            })

            return stockMap
        } catch (error) {
            console.error('Error getBulkStockFromLedger', error)
            return {}
        }
    }

    // --- MOVIMIENTOS ---

    // Registrar un movimiento de inventario
    // data: { product_id, movement_type, quantity, cost_price, reference_id, description }
    async registerMovement(data) {
        try {
            const organizationId = getCurrentOrganizationId()
            if (!organizationId) throw new Error('No organization_id')

            const {
                product_id,
                movement_type,
                quantity,
                cost_price,
                reference_id,
                description
            } = data

            // Obtener el producto para saber su client_id
            const product = await this.getProductById(product_id)
            if (!product) throw new Error('Producto no encontrado')

            const clientId = product.client_id

            // 1. Insertar Movimiento
            let signedQuantity = Math.abs(quantity)
            if (['OUT_SALE', 'OUT_SELF_CONSUMPTION', 'OUT_RETURN'].includes(movement_type)) {
                signedQuantity = -signedQuantity
            }
            if (movement_type === 'ADJUSTMENT' && data.is_negative) {
                signedQuantity = -Math.abs(quantity)
            }

            const movementPayload = {
                organization_id: organizationId,
                client_id: clientId,
                product_id,
                movement_type,
                quantity: signedQuantity,
                cost_price,
                reference_id,
                description
            }

            const { error: moveError } = await supabase
                .from(this.movementsTable)
                .insert(movementPayload)

            if (moveError) throw moveError

            // 2. Actualizar Stock en Producto
            const newStock = (parseFloat(product.stock) || 0) + signedQuantity
            let updatePayload = { stock: newStock }

            if (['INITIAL', 'IN_PURCHASE'].includes(movement_type) && cost_price > 0) {
                updatePayload.cost_price = cost_price
            }

            await this.updateProduct(product_id, updatePayload)

            return { success: true, newStock }
        } catch (error) {
            return handleTenantError(error, 'registerMovement')
        }
    }

    // Obtener Kardex de un producto (con número de factura de referencia)
    async getProductMovements(productId) {
        try {
            const { data, error } = await supabase
                .from(this.movementsTable)
                .select(`
                  *,
                  products:inventory_products(name, code, unit),
                  invoice:invoices!inventory_movements_reference_id_fkey(invoice_number)
                `)
                .eq('product_id', productId)
                .eq('organization_id', getCurrentOrganizationId())
                .order('created_at', { ascending: false })

            if (error) {
                // Si falla el join (FK no existe aún), intentar sin join
                console.warn('Join con invoices falló, cargando sin referencia de factura:', error.message)
                const { data: fallback, error: fallbackErr } = await supabase
                    .from(this.movementsTable)
                    .select('*')
                    .eq('product_id', productId)
                    .eq('organization_id', getCurrentOrganizationId())
                    .order('created_at', { ascending: false })
                if (fallbackErr) throw fallbackErr
                return fallback
            }

            // Mapear invoice_number al nivel raíz del movimiento
            return (data || []).map(m => ({
                ...m,
                invoice_number: m.invoice?.invoice_number || null
            }))
        } catch (error) {
            return handleTenantError(error, 'getProductMovements')
        }
    }

    // Obtener todos los movimientos (para reporte global) con número de factura
    async getAllMovements({ limit = 100, clientId = null } = {}) {
        try {
            let query = supabase
                .from(this.movementsTable)
                .select(`
                  *,
                  products:inventory_products(name, code, unit),
                  invoice:invoices!inventory_movements_reference_id_fkey(invoice_number)
                `)
                .eq('organization_id', getCurrentOrganizationId())
                .order('created_at', { ascending: false })

            if (clientId) {
                query = query.eq('client_id', clientId)
            }

            if (limit) {
                query = query.limit(limit)
            }

            const { data, error } = await query

            if (error) {
                // Si el join falla (la FK a invoices puede no existir), cargar sin él
                console.warn('Join con invoices falló en getAllMovements, cargando sin referencia:', error.message)
                let fallbackQuery = supabase
                    .from(this.movementsTable)
                    .select('*, products:inventory_products(name, code, unit)')
                    .eq('organization_id', getCurrentOrganizationId())
                    .order('created_at', { ascending: false })
                if (clientId) fallbackQuery = fallbackQuery.eq('client_id', clientId)
                if (limit) fallbackQuery = fallbackQuery.limit(limit)
                const { data: fallback, error: fallbackErr } = await fallbackQuery
                if (fallbackErr) throw fallbackErr
                return fallback
            }

            // Mapear invoice_number al nivel raíz del movimiento
            return (data || []).map(m => ({
                ...m,
                invoice_number: m.invoice?.invoice_number || null
            }))
        } catch (error) {
            return handleTenantError(error, 'getAllMovements')
        }
    }

    // Dashboard Info
    async getDashboardStats() {
        try {
            const orgId = getCurrentOrganizationId()
            const clientId = getCurrentClientId()

            // Total productos activos (no eliminados)
            let queryCount = supabase
                .from(this.productsTable)
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .is('deleted_at', null)

            // Valor inventario
            let queryStock = supabase
                .from(this.productsTable)
                .select('stock, cost_price, sale_price')
                .eq('organization_id', orgId)
                .gt('stock', 0)
                .is('deleted_at', null)

            if (clientId) {
                queryCount = queryCount.eq('client_id', clientId)
                queryStock = queryStock.eq('client_id', clientId)
            }

            const { count: totalProducts } = await queryCount
            const { data: stockProducts } = await queryStock

            let totalValueCost = 0
            let totalValueSale = 0

            if (stockProducts) {
                stockProducts.forEach(p => {
                    totalValueCost += (p.stock * p.cost_price)
                    totalValueSale += (p.stock * p.sale_price)
                })
            }

            return {
                totalProducts: totalProducts || 0,
                totalValueCost,
                totalValueSale
            }
        } catch (error) {
            console.error('Error getDashboardStats', error)
            return { totalProducts: 0, totalValueCost: 0, totalValueSale: 0 }
        }
    }
}

export default new InventoryService()
