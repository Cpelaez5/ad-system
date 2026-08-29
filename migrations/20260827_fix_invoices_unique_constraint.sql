-- migrations/20260827_fix_invoices_unique_constraint.sql
-- Descripción: Eliminar constraint global de facturas duplicadas y crear índices únicos compuestos
-- Autor: IA
-- Fecha: 2026-08-27

-- 1. Eliminar el índice único / constraint restrictivo global
ALTER TABLE IF EXISTS public.invoices DROP CONSTRAINT IF EXISTS invoices_organization_id_invoice_number_key CASCADE;
DROP INDEX IF EXISTS public.invoices_organization_id_invoice_number_key CASCADE;

-- 2. Crear índice único para facturas de COMPRA (proveedores)
-- Nota: En JSONB, issuer->>'id' extrae el ID como texto.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_compra 
ON public.invoices USING btree (organization_id, (issuer->>'id'), invoice_number) 
WHERE flow = 'COMPRA';

-- 3. Crear índice único para facturas de VENTA (clientes)
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_venta 
ON public.invoices USING btree (organization_id, client_id, invoice_number) 
WHERE flow = 'VENTA';
