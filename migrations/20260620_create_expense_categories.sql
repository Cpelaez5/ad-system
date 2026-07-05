-- migrations/20260620_create_expense_categories.sql
-- Descripción: Agrega la tabla expense_categories para el autoguardado de categorías en gastos.
-- Autor: Antigravity
-- Fecha: 2026-06-20

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, name)
);

-- Habilitar Row Level Security
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

-- Política de Selección: Los usuarios pueden ver categorías de su organización
CREATE POLICY "expense_categories_select" ON expense_categories
FOR SELECT USING (
  organization_id = get_current_organization_id()
);

-- Política de Inserción: Los usuarios pueden insertar categorías en su organización
CREATE POLICY "expense_categories_insert" ON expense_categories
FOR INSERT WITH CHECK (
  organization_id = get_current_organization_id()
);

-- Política de Actualización: Los usuarios pueden actualizar categorías en su organización
CREATE POLICY "expense_categories_update" ON expense_categories
FOR UPDATE USING (
  organization_id = get_current_organization_id()
) WITH CHECK (
  organization_id = get_current_organization_id()
);

-- Política de Borrado: Los usuarios pueden borrar categorías en su organización
CREATE POLICY "expense_categories_delete" ON expense_categories
FOR DELETE USING (
  organization_id = get_current_organization_id()
);

-- Índice para mejorar las búsquedas por cliente y nombre
CREATE INDEX IF NOT EXISTS idx_expense_categories_client_name 
ON expense_categories(client_id, name);

-- Añadir referencia en la tabla invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS expense_category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL;
