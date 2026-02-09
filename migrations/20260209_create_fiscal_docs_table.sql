-- migrations/20260209_create_fiscal_docs_table.sql
-- Descripción: Tabla para el módulo Expediente Fiscal 360
-- Autor: AI Assistant
-- Fecha: 2026-02-09

CREATE TABLE IF NOT EXISTS fiscal_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  
  -- Metadatos del permiso
  name TEXT NOT NULL,           
  category TEXT NOT NULL,       -- 'LEGAL', 'MUNICIPAL', 'SENIAT', 'NOMINA'
  status TEXT NOT NULL CHECK (status IN ('VIGENTE', 'TRAMITE', 'VENCIDO')),
  expiration_date DATE,         
  
  -- Relación con archivo físico (opcional, puede estar "En Trámite" sin archivo aún)
  document_id UUID REFERENCES documents(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE fiscal_docs ENABLE ROW LEVEL SECURITY;

-- Política de lectura: Ver docs de la misma organización
CREATE POLICY "fiscal_docs_select_policy" ON fiscal_docs
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Política de inserción: Insertar docs para la misma organización
CREATE POLICY "fiscal_docs_insert_policy" ON fiscal_docs
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Política de actualización: Actualizar docs de la misma organización
CREATE POLICY "fiscal_docs_update_policy" ON fiscal_docs
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Política de eliminación: Eliminar docs de la misma organización
CREATE POLICY "fiscal_docs_delete_policy" ON fiscal_docs
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Comentarios
COMMENT ON TABLE fiscal_docs IS 'Documentos para el expediente fiscal 360 del cliente';
COMMENT ON COLUMN fiscal_docs.status IS 'Estado del documento: VIGENTE, TRAMITE, VENCIDO';
