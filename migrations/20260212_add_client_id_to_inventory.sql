-- migrations/20260212_add_client_id_to_inventory.sql
-- Descripción: Agregar client_id a tablas de inventario y actualizar RLS para seguridad por cliente
-- Autor: IA
-- Fecha: 2026-02-12

-- 1. Agregar columna client_id a inventory_products
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_inventory_products_client ON inventory_products(client_id);

-- 2. Agregar columna client_id a inventory_movements
ALTER TABLE inventory_movements 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_client ON inventory_movements(client_id);

-- 3. Actualizar Policies RLS para inventory_products

DROP POLICY IF EXISTS "inventory_products_select" ON inventory_products;
CREATE POLICY "inventory_products_select" ON inventory_products
FOR SELECT USING (
  organization_id = get_current_organization_id()
  AND (
    -- Admin/Contador ven todo (o filtran por query)
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    -- Cliente ve solo lo suyo
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
    OR
    -- Si el registro no tiene client_id (inventario propio de la org?), admin lo ve, cliente no?
    -- Asumiremos que si es NULL es visible para admin, invisible para cliente.
    (client_id IS NULL AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin'))
  )
);

DROP POLICY IF EXISTS "inventory_products_insert" ON inventory_products;
CREATE POLICY "inventory_products_insert" ON inventory_products
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "inventory_products_update" ON inventory_products;
CREATE POLICY "inventory_products_update" ON inventory_products
FOR UPDATE USING (
  organization_id = get_current_organization_id()
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "inventory_products_delete" ON inventory_products;
CREATE POLICY "inventory_products_delete" ON inventory_products
FOR DELETE USING (
  organization_id = get_current_organization_id()
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  )
);

-- 4. Actualizar Policies RLS para inventory_movements

DROP POLICY IF EXISTS "inventory_movements_select" ON inventory_movements;
CREATE POLICY "inventory_movements_select" ON inventory_movements
FOR SELECT USING (
  organization_id = get_current_organization_id()
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "inventory_movements_insert" ON inventory_movements;
CREATE POLICY "inventory_movements_insert" ON inventory_movements
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'contador', 'super_admin')
    OR
    (
      (SELECT role FROM users WHERE id = auth.uid()) = 'cliente' 
      AND 
      client_id = (SELECT client_id FROM users WHERE id = auth.uid())
    )
  )
);
