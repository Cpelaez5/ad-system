-- migrations/20260330_add_inventory_return_types.sql
-- Descripción: Agregar tipos IN_RETURN y OUT_RETURN a los movimientos de inventario para soportar anulación de facturas
-- Autor: AI
-- Fecha: 2026-03-30

ALTER TABLE inventory_movements
DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;

ALTER TABLE inventory_movements
ADD CONSTRAINT inventory_movements_movement_type_check
CHECK (movement_type IN ('INITIAL', 'IN_PURCHASE', 'OUT_SALE', 'OUT_SELF_CONSUMPTION', 'ADJUSTMENT', 'IN_RETURN', 'OUT_RETURN'));
