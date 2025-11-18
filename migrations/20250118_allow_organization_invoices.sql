-- ================================================
-- Migration: Allow organization-level invoices (client_id IS NULL)
-- Date: 2025-01-18
-- Description: Esta migración permite que las facturas puedan tener client_id = NULL
--              para representar gastos, compras y ventas de la organización misma.
-- ================================================

-- Verificar que la columna client_id ya permite NULL
-- Si no lo permite, esta migración la modifica
DO $$ 
BEGIN
  -- Verificar si client_id permite NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'client_id' 
      AND is_nullable = 'NO'
  ) THEN
    -- Si NO permite NULL, modificar la columna
    ALTER TABLE invoices 
      ALTER COLUMN client_id DROP NOT NULL;
    
    -- Actualizar el comentario de la columna
    COMMENT ON COLUMN invoices.client_id IS 
      'ID del cliente asociado a la factura. NULL para facturas de la organización (gastos, compras, ventas propias)';
    
    RAISE NOTICE 'Columna client_id modificada para permitir NULL';
  ELSE
    RAISE NOTICE 'Columna client_id ya permite NULL - no se requiere modificación';
  END IF;
END $$;

-- Verificar que las políticas RLS permiten acceso a facturas con client_id IS NULL
-- Las políticas actuales ya deberían permitir esto para admin/contador, pero verificamos

-- Comentario en la tabla para documentar el uso
COMMENT ON TABLE invoices IS 
  'Facturas de la organización. client_id puede ser NULL para facturas de la organización misma (gastos, compras, ventas propias)';

-- Verificación final
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'invoices' 
      AND column_name = 'client_id' 
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✅ Migración completada: client_id permite NULL para facturas de organización';
  ELSE
    RAISE WARNING '⚠️ Advertencia: client_id aún no permite NULL';
  END IF;
END $$;

