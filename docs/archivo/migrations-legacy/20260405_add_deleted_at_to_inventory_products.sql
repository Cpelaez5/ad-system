-- migrations/20260405_add_deleted_at_to_inventory_products.sql
-- Descripción: Agregar columna deleted_at para soft delete de productos de inventario
-- Autor: IA Assistant
-- Fecha: 2026-04-05

-- Agregar columna deleted_at a inventory_products
ALTER TABLE inventory_products
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN inventory_products.deleted_at IS 'Fecha de eliminación lógica (Soft Delete). Si es NULL, el producto está activo.';

-- Crear índice para consultas de productos activos
CREATE INDEX IF NOT EXISTS idx_inventory_products_deleted_at ON inventory_products(deleted_at);

-- Actualizar productos con status INACTIVE a deleted_at (si existen)
-- Esto migra productos que ya estaban marcados como inactivos
UPDATE inventory_products
SET deleted_at = NOW()
WHERE status = 'INACTIVE' AND deleted_at IS NULL;