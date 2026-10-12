-- migrations/20260209_add_deleted_at_to_fiscal_docs.sql
-- Descripción: Agregar columna deleted_at para funcionalidad de papelera (Soft Delete)
-- Autor: AI Assistant
-- Fecha: 2026-02-09

ALTER TABLE fiscal_docs
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN fiscal_docs.deleted_at IS 'Fecha de eliminación lógica (Papelera). Si es NULL, el documento está activo.';
