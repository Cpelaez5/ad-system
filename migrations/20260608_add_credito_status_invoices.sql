-- migrations/20260608_add_credito_status_invoices.sql
-- Descripción: Agregar el estado CRÉDITO para permitir guardar facturas con método Cashea
-- Autor: IA
-- Fecha: 2026-06-08

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('BORRADOR', 'EMITIDA', 'ENVIADA', 'PAGADA', 'VENCIDA', 'ANULADA', 'CRÉDITO'));
