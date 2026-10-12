-- migrations/20260212_create_inventory_schema.sql
-- Descripción: Creación de tablas para módulo de inventario (productos y movimientos)
-- Autor: IA
-- Fecha: 2026-02-12

-- 1. Tabla de Productos de Inventario
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  code TEXT, -- Código SKU, Barras o Interno
  name TEXT NOT NULL,
  description TEXT,
  cost_price DECIMAL(12,2) DEFAULT 0, -- Costo Unitario
  sale_price DECIMAL(12,2) DEFAULT 0, -- Precio de Venta Base
  stock DECIMAL(12,2) DEFAULT 0,      -- Existencia Actual
  min_stock DECIMAL(12,2) DEFAULT 0,  -- Stock Mínimo para alertas
  unit TEXT DEFAULT 'UND',            -- Unidad: UND, KG, LTS, ETC
  tax_type TEXT DEFAULT 'IVA_G',      -- Tipo de impuesto por defecto
  currency TEXT DEFAULT 'VES',        -- Moneda base del producto
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para busqueda rapida
CREATE INDEX idx_inventory_products_org ON inventory_products(organization_id);
CREATE INDEX idx_inventory_products_code ON inventory_products(code);
CREATE INDEX idx_inventory_products_name ON inventory_products(name);

-- 2. Tabla de Movimientos de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  product_id UUID NOT NULL REFERENCES inventory_products(id),
  
  -- Tipos de movimiento:
  -- INITIAL: Carga inicial
  -- IN_PURCHASE: Entrada por Compra
  -- OUT_SALE: Salida por Venta
  -- OUT_SELF_CONSUMPTION: Autoconsumo (Salida)
  -- ADJUSTMENT: Ajuste manual (Entrada o Salida +/-)
  movement_type TEXT NOT NULL CHECK (movement_type IN ('INITIAL', 'IN_PURCHASE', 'OUT_SALE', 'OUT_SELF_CONSUMPTION', 'ADJUSTMENT')),
  
  quantity DECIMAL(12,2) NOT NULL, -- Positivo para entrada, Negativo para salida? O manejado por logica?
                                   -- Convención: Guardar siempre positivo y usar el tipo para sumar/restar es mas seguro para reportes, 
                                   -- PERO para sumas directas SQL es mejor signo.
                                   -- DECISIÓN: Guardar con SIGNO. (+ Entradas, - Salidas)
  
  cost_price DECIMAL(12,2), -- Costo al momento del movimiento (para valorar inventario)
  
  reference_id UUID, -- ID de la factura (invoices.id) o documento relacionado
  
  description TEXT, -- Notas opcionales
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_inventory_movements_org ON inventory_movements(organization_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_date ON inventory_movements(created_at);

-- 3. Políticas RLS (Row Level Security)

-- Habilitar RLS
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Policies para inventory_products
CREATE POLICY "inventory_products_select" ON inventory_products
FOR SELECT USING (
  organization_id = get_current_organization_id()
);

CREATE POLICY "inventory_products_insert" ON inventory_products
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
);

CREATE POLICY "inventory_products_update" ON inventory_products
FOR UPDATE USING (
  organization_id = get_current_organization_id()
);

CREATE POLICY "inventory_products_delete" ON inventory_products
FOR DELETE USING (
  organization_id = get_current_organization_id()
);

-- Policies para inventory_movements
CREATE POLICY "inventory_movements_select" ON inventory_movements
FOR SELECT USING (
  organization_id = get_current_organization_id()
);

CREATE POLICY "inventory_movements_insert" ON inventory_movements
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
);

-- No permitir update/delete de movimientos para integridad de auditoría (Kardex inmutable idealmente)
-- Pero por si acaso, restringir a admin
CREATE POLICY "inventory_movements_delete_admin" ON inventory_movements
FOR DELETE USING (
  organization_id = get_current_organization_id() 
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
