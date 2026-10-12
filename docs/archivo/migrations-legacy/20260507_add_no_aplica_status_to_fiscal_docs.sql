-- migrations/20260507_add_no_aplica_status_to_fiscal_docs.sql
-- Descripción: Agregar estado NO_APLICA a la tabla fiscal_docs
--              Los documentos marcados como NO_APLICA no afectan el cálculo de progreso.
-- Autor: AI Assistant
-- Fecha: 2026-05-07

-- 1. Actualizar el CHECK constraint para incluir NO_APLICA
ALTER TABLE fiscal_docs 
  DROP CONSTRAINT IF EXISTS fiscal_docs_status_check;

ALTER TABLE fiscal_docs 
  ADD CONSTRAINT fiscal_docs_status_check 
  CHECK (status IN ('VIGENTE', 'TRAMITE', 'VENCIDO', 'NO_APLICA'));

COMMENT ON COLUMN fiscal_docs.status IS 
  'Estado del documento: VIGENTE | TRAMITE | VENCIDO | NO_APLICA. 
   Los documentos con NO_APLICA requieren un campo notes explicativo y se excluyen del cálculo de progreso.';
