-- =====================================================
-- MIGRACIÓN: Agregar columna flow a tabla invoices
-- =====================================================
-- Fecha: 2025-11-24
-- Propósito: Separar facturas de VENTA y COMPRA
-- =====================================================

-- 1. Agregar columna flow con constraint
ALTER TABLE invoices 
ADD COLUMN flow TEXT CHECK (flow IN ('VENTA', 'COMPRA'));

-- 2. Comentario en la columna
COMMENT ON COLUMN invoices.flow IS 'Tipo de flujo: VENTA (factura emitida) o COMPRA (factura recibida)';

-- 3. Actualizar facturas existentes (si las hay)
-- Facturas con client_id son VENTAS (emitidas a clientes)
UPDATE invoices 
SET flow = 'VENTA' 
WHERE client_id IS NOT NULL AND flow IS NULL;

-- Facturas sin client_id son COMPRAS (recibidas de proveedores)
UPDATE invoices 
SET flow = 'COMPRA' 
WHERE client_id IS NULL AND flow IS NULL;

-- 4. Hacer la columna NOT NULL después de actualizar datos existentes
ALTER TABLE invoices 
ALTER COLUMN flow SET NOT NULL;

-- 5. Agregar valor por defecto para nuevas facturas
ALTER TABLE invoices 
ALTER COLUMN flow SET DEFAULT 'VENTA';

-- 6. Crear índice para mejorar performance en queries filtradas por flow
CREATE INDEX IF NOT EXISTS idx_invoices_flow 
ON invoices(organization_id, flow);

-- 7. Crear índice compuesto para queries comunes
CREATE INDEX IF NOT EXISTS idx_invoices_org_flow_status 
ON invoices(organization_id, flow, status);

-- 8. Actualizar índice único para incluir flow (opcional, solo si es necesario)
-- DROP INDEX IF EXISTS invoices_organization_id_invoice_number_key;
-- CREATE UNIQUE INDEX invoices_organization_id_invoice_number_flow_key 
-- ON invoices(organization_id, invoice_number, flow);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'flow';

-- Verificar que los índices se crearon
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invoices' AND indexname LIKE '%flow%';

-- Verificar distribución de facturas por flow
SELECT flow, COUNT(*) as total
FROM invoices
GROUP BY flow;

-- =====================================================
-- ROLLBACK (si es necesario)
-- =====================================================

-- Para revertir la migración:
-- DROP INDEX IF EXISTS idx_invoices_flow;
-- DROP INDEX IF EXISTS idx_invoices_org_flow_status;
-- ALTER TABLE invoices DROP COLUMN flow;

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Columna flow agregada a tabla invoices';
    RAISE NOTICE '🔍 Índices creados para mejor performance';
    RAISE NOTICE '📝 Facturas existentes actualizadas';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Próximos pasos:';
    RAISE NOTICE '1. Actualizar invoiceService.js para usar flow';
    RAISE NOTICE '2. Actualizar vistas de Ventas/Compras para filtrar por flow';
    RAISE NOTICE '3. Probar creación de facturas con flow';
END $$;
