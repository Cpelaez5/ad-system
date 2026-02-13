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
    // Ops: search, limit, offset, clientId (opcional para admin)
    async getProducts({ search = '', limit = 50, offset = 0, clientId = null } = {}) {
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
            // Validar código único? La base de datos no tiene unique constraint explicito en code+org pero debería
            // Por ahora confiamos en la inserción

            // Asignar client_id si no viene
            const payload = {
                ...productData,
                client_id: productData.client_id || getCurrentClientId()
            }

            return await insertWithTenant(this.productsTable, payload)
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
            // Verificar si tiene movimientos?
            // Si tiene movimientos, quizás mejor inactivar (`status = 'INACTIVE'`)
            // Por ahora Soft Delete via update status o delete físico si no hay FK conflicts
            // Intentaremos delete fisico, si falla (FK), sugerir inactivar
            return await deleteWithTenant(this.productsTable, id)
        } catch (error) {
            // Si falla por FK, retornar error amigable
            console.error('Error deleteProduct', error)
            throw error
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

    // Obtener Kardex de un producto
    async getProductMovements(productId) {
        try {
            const { data, error } = await supabase
                .from(this.movementsTable)
                .select('*')
                .eq('product_id', productId)
                .eq('organization_id', getCurrentOrganizationId())
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        } catch (error) {
            return handleTenantError(error, 'getProductMovements')
        }
    }

    // Obtener todos los movimientos (para reporte global)
    async getAllMovements({ limit = 100, clientId = null } = {}) {
        try {
            let query = supabase
                .from(this.movementsTable)
                .select('*, products:inventory_products(name, code, unit)')
                .eq('organization_id', getCurrentOrganizationId())
                .order('created_at', { ascending: false })

            if (clientId) {
                query = query.eq('client_id', clientId)
            }

            if (limit) {
                query = query.limit(limit)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        } catch (error) {
            return handleTenantError(error, 'getAllMovements')
        }
    }

    // Dashboard Info
    async getDashboardStats() {
        try {
            const orgId = getCurrentOrganizationId()
            const clientId = getCurrentClientId()

            // Total productos
            let queryCount = supabase
                .from(this.productsTable)
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'ACTIVE')

            // Valor inventario
            let queryStock = supabase
                .from(this.productsTable)
                .select('stock, cost_price, sale_price')
                .eq('organization_id', orgId)
                .gt('stock', 0)
                .eq('status', 'ACTIVE')

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
