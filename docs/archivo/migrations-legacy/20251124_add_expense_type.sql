-- =====================================================
-- Migración: Agregar campo expense_type a invoices
-- Fecha: 2025-11-24
-- Propósito: Diferenciar entre COMPRA (mercancía) y GASTO (servicios)
-- =====================================================

-- 1. Agregar columna expense_type
ALTER TABLE invoices 
ADD COLUMN expense_type TEXT 
CHECK (expense_type IN ('COMPRA', 'GASTO'));

-- 2. Actualizar facturas existentes
-- Las facturas de COMPRA se marcan como COMPRA por defecto
UPDATE invoices 
SET expense_type = 'COMPRA' 
WHERE flow = 'COMPRA' AND expense_type IS NULL;

-- Las facturas de VENTA no necesitan expense_type (NULL está permitido)

-- 3. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_invoices_expense_type 
ON invoices(expense_type) 
WHERE expense_type IS NOT NULL;

-- 4. Crear índice compuesto para filtrado por flow y expense_type
CREATE INDEX IF NOT EXISTS idx_invoices_flow_expense_type 
ON invoices(flow, expense_type) 
WHERE expense_type IS NOT NULL;

-- =====================================================
-- Verificación
-- =====================================================

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'expense_type';

-- Verificar distribución de datos
SELECT 
  flow,
  expense_type,
  COUNT(*) as total
FROM invoices
GROUP BY flow, expense_type
ORDER BY flow, expense_type;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invoices' 
AND indexname LIKE '%expense_type%';
