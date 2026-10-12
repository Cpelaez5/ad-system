-- migrations/20260209_add_doc_type_to_fiscal_docs.sql
-- Descripción: Agregar columna doc_type para clasificar tipos de documentos específicos
-- Autor: AI Assistant
-- Fecha: 2026-02-09

ALTER TABLE fiscal_docs
ADD COLUMN doc_type TEXT;

COMMENT ON COLUMN fiscal_docs.doc_type IS 'Identificador del tipo específico de documento (ej: RIF, IVA_MENSUAL, etc)';
