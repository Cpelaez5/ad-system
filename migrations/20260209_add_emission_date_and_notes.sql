-- migrations/20260209_add_emission_date_and_notes.sql
-- Descripción: Agregar campos fecha de emisión y notas
-- Autor: AI Assistant
-- Fecha: 2026-02-09

ALTER TABLE fiscal_docs
ADD COLUMN emission_date DATE,
ADD COLUMN notes TEXT;

COMMENT ON COLUMN fiscal_docs.emission_date IS 'Fecha de emisión del documento';
COMMENT ON COLUMN fiscal_docs.notes IS 'Notas u observaciones extraídas por OCR o manuales';
